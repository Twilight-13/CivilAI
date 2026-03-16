# CIVILAI - AI-Powered Urban Infrastructure Management

> **Full-stack city simulation with a real trained Graph Attention Network (GNN) for failure prediction and a Proximal Policy Optimization (PPO) Reinforcement Learning agent for optimal maintenance decisions.**

## Features

- **3D City Simulation** — Interactive Three.js city with 100+ buildings and 4 infrastructure layers (Water, Power, Roads, Drainage)
- **Trained GNN Predictions** — Graph Attention Network predicts which nodes will fail within 5 days; attention weights power the Explainability tab
- **PPO RL Agent** — Reinforcement Learning agent trained to play the game optimally; compared against human player in real-time
- **Explainable AI** — Per-node factor importance derived from real GAT attention coefficients (not hardcoded)
- **Real-time Analytics** — Budget trends, KPIs (Uptime, ROI, Prevention Rate), cost-benefit breakdown
- **Demo Mode** — 10-step automated tour with Text-to-Speech narration for presentations

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React, Three.js (React Three Fiber), Framer Motion, Socket.IO Client |
| **Backend** | Python, Flask, Flask-SocketIO, eventlet |
| **ML / GNN** | PyTorch, PyTorch Geometric, Graph Attention Network (GAT) |
| **RL Agent** | Stable-Baselines3 (PPO), Gymnasium |
| **Data** | Custom headless game simulator → PyG InMemoryDataset |

## Full ML Pipeline

```
data_generator.py     → Headless game simulation → training_data.pt
dataset.py            → PyG InMemoryDataset with 80/10/10 splits
models/gnn_model.py   → GAT architecture (2 layers, 4 attention heads)
train_gnn.py          → BCELoss + Adam + LR scheduling → gnn_model.pt
train_rl.py           → PPO (4 parallel envs, 500K steps) → rl_agent.zip
run_training.py       → One-click runner for all stages
app.py                → Loads saved models at startup → serves real inference
```

## Installation

### Prerequisites
- Python 3.10+
- Node.js 16+
- CUDA-compatible GPU (optional, but recommended — tested on RTX 4050)

### 1. Backend Setup

```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
pip install torch-geometric
pip install -r requirements.txt
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

## Training the ML Models

> **One-click pipeline** — runs data generation, GNN training, and RL training in sequence.

```bash
cd backend

# Full pipeline (~40–60 minutes on RTX 4050)
python run_training.py

# Quick smoke test (~3 minutes)
python run_training.py --quick

# Skip stages if already done
python run_training.py --skip-data    # use existing training_data.pt
python run_training.py --skip-rl      # GNN only
```

### Training individually

```bash
# Stage 1: Generate data (10K simulated games)
python data_generator.py

# Stage 2: Train GNN
python train_gnn.py --epochs 20

# Stage 3: Train RL agent
python train_rl.py --steps 500000

# Evaluate saved models
python train_gnn.py --test-only
python train_rl.py --eval-only
```

Trained model files are saved to `backend/models/saved/`.

## Running the Application

```bash
# Terminal 1 — Backend
cd backend
python app.py
# → GNN model loaded: AUC=0.91  F1=0.87
# → RL agent loaded

# Terminal 2 — Frontend
cd frontend
npm start
# → Opens http://localhost:3000
```

The HUD shows a **GNN + RL Active** badge when both models are loaded, or **Heuristic Mode** if training hasn't been run yet. The app always works — models are optional.

## Project Structure

```
civilai-v2/
├── backend/
│   ├── app.py                   # Flask server — loads GNN + RL at startup
│   ├── game_engine.py           # City simulation engine (CityGame)
│   ├── data_generator.py        # Headless game simulator for training data
│   ├── dataset.py               # PyG InMemoryDataset
│   ├── train_gnn.py             # GNN training script
│   ├── train_rl.py              # RL training script + Gymnasium env
│   ├── run_training.py          # One-click pipeline runner
│   ├── requirements.txt
│   ├── models/
│   │   ├── gnn_model.py         # GAT architecture + feature extraction
│   │   └── saved/               # gnn_model.pt + rl_agent.zip (after training)
│   └── data/
│       ├── training_data.pt     # Generated training snapshots
│       ├── gnn_training_log.json
│       └── rl_training_log.json
│
└── frontend/
    └── src/
        ├── App.js
        ├── components/
        │   ├── CityView.js      # 3D scene
        │   ├── AIPredictions.js # Real GNN predictions
        │   ├── Comparison.js    # Real RL agent vs human
        │   ├── Explainability.js
        │   ├── Analytics.js
        │   ├── GameHUD.js       # AI status badge
        │   ├── DemoMode.js
        │   └── Tutorial.js
        ├── services/
        │   └── gameService.js
        └── styles/
```

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/init` | POST | Start a new game (`difficulty`: easy/normal/hard) |
| `/api/state` | GET | Current full game state |
| `/api/advance` | POST | Advance one time step |
| `/api/predictions` | GET | **Real GNN** node failure probabilities |
| `/api/recommendations` | GET | **Real RL** agent maintenance recommendations |
| `/api/rl-action` | GET | RL agent's single recommended action |
| `/api/model-info` | GET | Model status, AUC, F1, training metadata |
| `/health` | GET | Server and model health check |

## Roadmap

- [ ] Real-world SCADA/GIS data integration
- [ ] Temporal GNN (TGN) for time-series prediction
- [ ] Multi-agent system (multiple cities)
- [ ] Mobile companion app

## License

MIT License
