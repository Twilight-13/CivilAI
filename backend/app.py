"""
CIVILAI 2.0 - Flask Backend
Real-time game server with WebSocket support
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

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

# Global game instance
game = None
game_thread = None
game_running = False

# ============== GAME INITIALIZATION ==============

@app.route('/api/init', methods=['POST'])
def initialize_game():
    """Initialize a new game session"""
    global game
    
    data = request.json
    difficulty = data.get('difficulty', 'normal')
    
    game = CityGame(difficulty=difficulty)
    
    return jsonify({
        'success': True,
        'state': game.get_full_state(),
        'message': 'Game initialized successfully'
    })


# ============== GAME STATE ==============

@app.route('/api/state', methods=['GET'])
def get_state():
    """Get current game state"""
    if not game:
        return jsonify({'error': 'Game not initialized'}), 400
    
    return jsonify(game.get_full_state())


# ============== PLAYER ACTIONS ==============

@app.route('/api/action', methods=['POST'])
def perform_action():
    """Execute player action"""
    if not game:
        return jsonify({'error': 'Game not initialized'}), 400
    
    data = request.json
    action_type = data.get('action')
    node_id = data.get('nodeId')
    
    result = game.execute_action(action_type, node_id)
    
    # Broadcast state update to all clients
    socketio.emit('state_update', game.get_full_state())
    
    return jsonify(result)


@app.route('/api/inspect/<int:node_id>', methods=['GET'])
def inspect_node(node_id):
    """Inspect a specific node"""
    if not game:
        return jsonify({'error': 'Game not initialized'}), 400
    
    result = game.inspect_node(node_id)
    return jsonify(result)


# ============== TIME CONTROL ==============

@app.route('/api/advance', methods=['POST'])
def advance_time():
    """Advance game by one time step"""
    if not game:
        return jsonify({'error': 'Game not initialized'}), 400
    
    result = game.step()
    
    # Broadcast update
    socketio.emit('state_update', game.get_full_state())
    socketio.emit('time_advanced', result)
    
    return jsonify(result)


@app.route('/api/toggle-auto', methods=['POST'])
def toggle_auto_advance():
    """Toggle automatic time advancement"""
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
    """Background thread for automatic time advancement"""
    global game_running
    
    while game_running:
        if game:
            result = game.step()
            socketio.emit('state_update', game.get_full_state())
            socketio.emit('time_advanced', result)
        time.sleep(2)  # Advance every 2 seconds


# ============== AI PREDICTIONS ==============

@app.route('/api/predictions', methods=['GET'])
def get_predictions():
    """Get AI failure predictions"""
    if not game:
        return jsonify({'error': 'Game not initialized'}), 400
    
    predictions = game.get_ai_predictions()
    return jsonify(predictions)


@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    """Get AI action recommendations"""
    if not game:
        return jsonify({'error': 'Game not initialized'}), 400
    
    recommendations = game.get_recommendations()
    return jsonify(recommendations)


# ============== LAYER CONTROL ==============

@app.route('/api/layers/<layer_name>', methods=['GET'])
def get_layer_nodes(layer_name):
    """Get all nodes for a specific layer"""
    if not game:
        return jsonify({'error': 'Game not initialized'}), 400
    
    nodes = game.get_layer_nodes(layer_name)
    return jsonify({'layer': layer_name, 'nodes': nodes})


# ============== STATISTICS ==============

@app.route('/api/stats', methods=['GET'])
def get_statistics():
    """Get game statistics"""
    if not game:
        return jsonify({'error': 'Game not initialized'}), 400
    
    stats = game.get_statistics()
    return jsonify(stats)


# ============== WEBSOCKET EVENTS ==============

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print('Client connected')
    if game:
        emit('state_update', game.get_full_state())


@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print('Client disconnected')


@socketio.on('request_state')
def handle_state_request():
    """Client requests current state"""
    if game:
        emit('state_update', game.get_full_state())


# ============== HEALTH CHECK ==============

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'version': '2.0'})


# ============== RUN SERVER ==============

if __name__ == '__main__':
    print("=" * 60)
    print("🏙️  CIVILAI 2.0 Backend Server")
    print("=" * 60)
    print("Starting on http://localhost:5000")
    print("WebSocket support enabled")
    print("=" * 60)
    
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
