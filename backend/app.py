"""
CIVILAI 2.0 - Flask Backend (ML-Enhanced)

Loads the trained GNN and RL agent at startup. All AI endpoints now
serve real model inference instead of heuristic scoring. Falls back
gracefully if models haven't been trained yet.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from game_engine import CityGame
import json
import time
from threading import Thread

# ML imports (conditional — app still works without trained models)
import torch
GNN_AVAILABLE = False
RL_AVAILABLE  = False

try:
    from models.gnn_model import load_gnn_model, game_state_to_pyg, InfraGNN
    from train_rl import load_rl_agent, get_rl_recommendation
    _gnn_model, _gnn_meta = None, None
    _rl_model,  _rl_meta  = None, None
    MODEL_DIR = os.path.join(os.path.dirname(__file__), "models", "saved")
except ImportError as e:
    print(f"[Warning] ML imports failed: {e}\n  Running in heuristic-only mode.")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

# Global game instance
game = None
game_thread = None
game_running = False

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


def _load_models():
    """Load GNN and RL models at startup, with graceful fallback."""
    global _gnn_model, _gnn_meta, _rl_model, _rl_meta, GNN_AVAILABLE, RL_AVAILABLE
    try:
        _gnn_model, _gnn_meta = load_gnn_model(MODEL_DIR, device=DEVICE)
        if _gnn_model is not None:
            GNN_AVAILABLE = True

        _rl_model, _rl_meta = load_rl_agent(device=DEVICE)
        if _rl_model is not None:
            RL_AVAILABLE = True
    except Exception as e:
        print(f"[Warning] Could not load ML models: {e}")


# ============== GAME INITIALIZATION ==============

@app.route('/api/init', methods=['POST'])
def initialize_game():
    global game
    data = request.json
    difficulty = data.get('difficulty', 'normal')
    game = CityGame(difficulty=difficulty)
    return jsonify({'success': True, 'state': game.get_full_state(), 'message': 'Game initialized'})


# ============== GAME STATE ==============

@app.route('/api/state', methods=['GET'])
def get_state():
    if not game:
        return jsonify({'error': 'Game not initialized'}), 400
    return jsonify(game.get_full_state())


# ============== PLAYER ACTIONS ==============

@app.route('/api/action', methods=['POST'])
def perform_action():
    if not game:
        return jsonify({'error': 'Game not initialized'}), 400
    data = request.json
    result = game.execute_action(data.get('action'), data.get('nodeId'))
    socketio.emit('state_update', game.get_full_state())
    return jsonify(result)


@app.route('/api/inspect/<int:node_id>', methods=['GET'])
def inspect_node(node_id):
    if not game:
        return jsonify({'error': 'Game not initialized'}), 400
    return jsonify(game.inspect_node(node_id))


# ============== TIME CONTROL ==============

@app.route('/api/advance', methods=['POST'])
def advance_time():
    if not game:
        return jsonify({'error': 'Game not initialized'}), 400
    result = game.step()
    socketio.emit('state_update', game.get_full_state())
    socketio.emit('time_advanced', result)
    return jsonify(result)


@app.route('/api/toggle-auto', methods=['POST'])
def toggle_auto_advance():
    global game_running, game_thread
    if not game:
        return jsonify({'error': 'Game not initialized'}), 400
    game_running = not game_running
    if game_running:
        game_thread = Thread(target=auto_advance_loop)
        game_thread.daemon = True
        game_thread.start()
    return jsonify({'auto_running': game_running})


def auto_advance_loop():
    global game_running
    while game_running:
        if game:
            result = game.step()
            socketio.emit('state_update', game.get_full_state())
            socketio.emit('time_advanced', result)
        time.sleep(2)


# ============== AI PREDICTIONS (REAL GNN) ==============

@app.route('/api/predictions', methods=['GET'])
def get_predictions():
    if not game:
        return jsonify({'error': 'Game not initialized'}), 400

    if GNN_AVAILABLE and _gnn_model is not None:
        try:
            return jsonify(_gnn_predict())
        except Exception as e:
            print(f"[GNN] Inference error: {e} — falling back to heuristic")

    return jsonify(_heuristic_predict())


def _gnn_predict():
    """Real GNN inference on current game graph."""
    _gnn_model.eval()
    with torch.no_grad():
        x, edge_index, nodes = game_state_to_pyg(game, device=DEVICE)
        probs, attn_dict = _gnn_model(x, edge_index, return_attention=True)
        probs = probs.cpu().numpy()

    results = []
    for i, node in enumerate(nodes):
        prob = float(probs[i])
        if prob > 0.30:   # surface nodes with >30% failure probability
            results.append({
                "node_id":        node.id,
                "layer":          node.layer,
                "health":         round(node.health, 1),
                "failure_prob":   round(prob, 4),
                "risk_score":     round(prob * 100, 1),
                "confidence":     round(min(0.70 + prob * 0.25, 0.99), 3),
                "days_to_fail":   max(1, int((1 - prob) * 5)),
                "feature_importance": attn_dict,
                "model":          "gnn",
            })

    results.sort(key=lambda x: x["failure_prob"], reverse=True)
    return {
        "predictions":  results[:10],
        "model_active": True,
        "model_info": {
            "type":      "Graph Attention Network",
            "test_auc":  _gnn_meta.test_auc if _gnn_meta else None,
            "test_f1":   _gnn_meta.test_f1  if _gnn_meta else None,
            "trained_on": _gnn_meta.training_samples if _gnn_meta else None,
        }
    }


def _heuristic_predict():
    """Fallback heuristic when GNN is not available."""
    predictions = game.get_ai_predictions()
    for p in predictions["predictions"]:
        p["failure_prob"]   = round(p["risk_score"] / 100, 3)
        p["confidence"]     = 0.70
        p["days_to_fail"]   = max(1, int((100 - p["risk_score"]) / 20))
        p["model"]          = "heuristic"
        p["feature_importance"] = {
            "health": 0.40, "age": 0.25, "degree": 0.15,
            "is_critical": 0.10, "days_since_maintained": 0.10,
        }
    return {
        "predictions":  predictions["predictions"],
        "model_active": False,
        "model_info":   {"type": "Heuristic (train GNN to enable real predictions)"}
    }


# ============== RL AGENT RECOMMENDATION ==============

@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    if not game:
        return jsonify({'error': 'Game not initialized'}), 400

    if RL_AVAILABLE and _rl_model is not None:
        try:
            rl_recs = get_rl_recommendation(_rl_model, game)
            if rl_recs:
                return jsonify({"recommendations": rl_recs, "source": "rl_agent"})
        except Exception as e:
            print(f"[RL] Inference error: {e}")

    return jsonify({**game.get_recommendations(), "source": "heuristic"})


@app.route('/api/rl-action', methods=['GET'])
def get_rl_action():
    """Get the RL agent's recommended action for the current state."""
    if not game:
        return jsonify({'error': 'Game not initialized'}), 400

    if RL_AVAILABLE and _rl_model is not None:
        try:
            recs = get_rl_recommendation(_rl_model, game)
            return jsonify({"rl_active": True, "action": recs[0] if recs else None})
        except Exception as e:
            return jsonify({"rl_active": False, "error": str(e)})

    return jsonify({
        "rl_active": False,
        "message":   "RL agent not trained yet. Run train_rl.py to enable."
    })


# ============== MODEL INFO ==============

@app.route('/api/model-info', methods=['GET'])
def get_model_info():
    """Return status and metadata of loaded ML models for the frontend."""
    return jsonify({
        "gnn": {
            "loaded":         GNN_AVAILABLE,
            "test_auc":       _gnn_meta.test_auc       if _gnn_meta else None,
            "test_f1":        _gnn_meta.test_f1        if _gnn_meta else None,
            "training_date":  _gnn_meta.training_date  if _gnn_meta else None,
            "training_samples": _gnn_meta.training_samples if _gnn_meta else None,
        },
        "rl": {
            "loaded":         RL_AVAILABLE,
            "mean_reward":    _rl_meta.get("mean_reward_eval") if _rl_meta else None,
        },
        "device": DEVICE,
    })


# ============== LAYER / STATS ==============

@app.route('/api/layers/<layer_name>', methods=['GET'])
def get_layer_nodes(layer_name):
    if not game:
        return jsonify({'error': 'Game not initialized'}), 400
    return jsonify({'layer': layer_name, 'nodes': game.get_layer_nodes(layer_name)})


@app.route('/api/stats', methods=['GET'])
def get_statistics():
    if not game:
        return jsonify({'error': 'Game not initialized'}), 400
    return jsonify(game.get_statistics())


# ============== WEBSOCKET ==============

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    if game:
        emit('state_update', game.get_full_state())


@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')


@socketio.on('request_state')
def handle_state_request():
    if game:
        emit('state_update', game.get_full_state())


# ============== HEALTH CHECK ==============

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status':      'healthy',
        'version':     '2.0',
        'gnn_loaded':  GNN_AVAILABLE,
        'rl_loaded':   RL_AVAILABLE,
        'device':      DEVICE,
    })


# ============== RUN ==============

if __name__ == '__main__':
    print("=" * 60)
    print("  CivilAI 2.0 Backend Server — ML Edition")
    print("=" * 60)
    print(f"  Device : {DEVICE}")
    _load_models()
    print(f"  GNN    : {'ACTIVE' if GNN_AVAILABLE else 'not found — run train_gnn.py'}")
    print(f"  RL     : {'ACTIVE' if RL_AVAILABLE  else 'not found — run train_rl.py'}")
    print("=" * 60)
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
