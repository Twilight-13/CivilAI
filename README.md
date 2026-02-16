# CIVILAI - AI-Powered Urban Infrastructure Management

![CivilAI Banner](https://via.placeholder.com/1200x400?text=CIVILAI+Project+Banner)

> **Note**: Placeholder for project banner/screenshot.

**CivilAI** is a futuristic, full-stack urban infrastructure management system that leverages **Graph Neural Networks (GNNs)** to simulate city dynamics and predict infrastructure failures. Designed as a decision support system, it enables city managers to move from reactive repairs to predictive maintenance, saving costs and preventing service disruptions.

## 🚀 Key Features

### 🏙️ 3D City Simulation
- **Interactive Visualization**: Explore a procedurally generated city with 100+ buildings and interconnected infrastructure layers (Water, Power, Roads, Drainage) using a high-performance **Three.js** renderer.
- **Real-time Status**: Color-coded nodes indicate health status (Green: Good, Yellow: Warning, Red: Critical).

### 🧠 AI & Machine Learning
- **Failure Prediction**: Uses a **Graph Neural Network (GNN)** to forecast infrastructure failures up to 5 days in advance with high accuracy.
- **Risk Heatmaps**: Visualizes risk distribution across different infrastructure layers to prioritize maintenance.
- **Explainable AI (XAI)**: Provides transparency into AI decisions, breaking down contributing factors (Age, Health, Stress, Connectivity) for every prediction.

### 📊 Analytics & Insights
- **Comprehensive Dashboard**: Real-time tracking of KPIs including Uptime, ROI, Prevention Rate, and Cost Efficiency.
- **Budget Management**: Monitor financial health with detailed budget trend analysis and cost-benefit breakdowns.
- **Comparative Analysis**: Benchmarks human decision-making against an optimal AI strategy to highlight areas for improvement.

### 🎮 Gamified Training
- **Interactive Gameplay**: role-play as a City Systems Manager, balancing budget and public safety.
- **Scenarios**: Test your skills in Easy, Normal, and Hard difficulty modes.
- **Tutorial & Demo**: Includes an interactive tutorial and an automated, narrated tour of the system capabilities.

## 🛠️ Tech Stack

| Component | Technologies |
|-----------|--------------|
| **Frontend** | React, Three.js (React Three Fiber), Framer Motion, Socket.IO Client |
| **Backend** | Python, Flask, Flask-SocketIO, GNN (PyTorch Geometric concepts) |
| **Data/ML** | NetworkX, NumPy, Custom GNN Model |
| **Architecture** | Client-Server (REST + WebSocket), Event-Driven |

## 🏗️ System Architecture

### Core Engine (`backend/game_engine.py`)
The simulation engine models the city as a complex graph where nodes (infrastructure points) and edges (connections) interact. It handles:
- **Procedural Generation**: Creates unique city layouts and networks every game.
- **Degradation Logic**: Simulates realistic wear and tear based on usage and time.
- **Cascade Effects**: Models how a failure in one node can propagate to connected neighbors.

### AI Module
- **Risk Scoring**: Calculates failure probability based on node centrality, age, and health.
- **Recommendation Engine**: Suggests optimal maintenance actions (Repair, Upgrade, Emergency Fix).

## 📦 Installation

### Prerequisites
- Node.js (v16+)
- Python (v3.8+)

### 1. Backend Setup
```bash
cd backend
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python app.py
```
The backend will run on `http://localhost:5000`.

### 2. Frontend Setup
```bash
cd frontend
# Install dependencies
npm install

# Start the application
npm start
```
The application will open at `http://localhost:3000`.

## 🎮 How to Play

1. **Launch**: Open the application in your browser.
2. **Tutorial**: Follow the onboarding guide to understand the controls.
3. **Monitor**: Use the **City View** and **Analytics** tabs to keep an eye on infrastructure health.
4. **Predict**: Check the **AI Predictions** tab to see upcoming risks.
5. **Act**: Click on nodes to perform repairs or upgrades before they fail.
6. **Win**: Survive for as long as possible while maintaining a positive budget and high system uptime.

## 🔮 Future Roadmap

- [ ] **Real-World Data**: Integration with GIS and SCADA systems for digital twin capabilities.
- [ ] **Advanced GNNs**: Deployment of more complex temporal graph networks for better long-term forecasting.
- [ ] **Multi-Agent System**: Support for multiple city managers collaborating in real-time.
- [ ] **Mobile App**: Companion app for field alerts and monitoring.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

## 📞 Contact

For questions or collaboration, please reach out to the repository owner.
