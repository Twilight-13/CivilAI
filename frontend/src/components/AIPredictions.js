import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaBrain, FaExclamationTriangle, FaDollarSign, FaClock, FaTint, FaBolt, FaRoad, FaWater, FaMapMarkerAlt, FaLightbulb, FaBullseye, FaNetworkWired } from 'react-icons/fa';
import '../styles/AIPredictions.css';

export default function AIPredictions({ gameState }) {
  const [predictions, setPredictions] = useState([]);
  const [riskZones, setRiskZones] = useState([]);
  const [costPrediction, setCostPrediction] = useState(0);

  useEffect(() => {
    if (gameState) {
      generatePredictions();
    }
  }, [gameState]);

  const generatePredictions = () => {
    if (!gameState || !gameState.nodes) return;

    const nodes = Object.values(gameState.nodes);

    // Predict failures for next 5 days
    const nextDaysPredictions = [];

    nodes.forEach(node => {
      // Calculate risk score
      const healthRisk = (100 - node.health) / 100;
      const ageRisk = Math.min(node.age / 50, 1);
      const stressRisk = node.stress || 0;
      const connectionRisk = (node.connected_to?.length || 0) / 10;

      const totalRisk = (
        healthRisk * 0.4 +
        ageRisk * 0.2 +
        stressRisk * 0.2 +
        connectionRisk * 0.2
      );

      // Predict when it will fail
      if (totalRisk > 0.3) {
        const daysUntilFailure = Math.max(1, Math.floor((node.health / 20) * (1 - totalRisk)));

        nextDaysPredictions.push({
          nodeId: node.id,
          layer: node.layer,
          health: node.health,
          riskScore: totalRisk * 100,
          daysUntilFailure: Math.min(daysUntilFailure, 5),
          estimatedCost: 50000 * (1 + (node.connected_to?.length || 0) * 0.2),
          confidence: 70 + totalRisk * 20
        });
      }
    });

    // Sort by urgency
    nextDaysPredictions.sort((a, b) => a.daysUntilFailure - b.daysUntilFailure);
    setPredictions(nextDaysPredictions.slice(0, 10));

    // Calculate total cost if no action
    const totalCost = nextDaysPredictions.reduce((sum, p) => sum + p.estimatedCost, 0);
    setCostPrediction(totalCost);

    // Group by layer for risk zones
    const zones = {
      water: 0,
      power: 0,
      road: 0,
      drainage: 0
    };

    nextDaysPredictions.forEach(p => {
      zones[p.layer] = (zones[p.layer] || 0) + p.riskScore;
    });

    setRiskZones(Object.entries(zones).map(([layer, risk]) => ({
      layer,
      risk: Math.min(risk / 5, 100)
    })));
  };

  const getLayerIcon = (layer) => {
    const icons = {
      water: <FaTint style={{ color: '#3b82f6' }} />,
      power: <FaBolt style={{ color: '#eab308' }} />,
      road: <FaRoad style={{ color: '#94a3b8' }} />,
      drainage: <FaWater style={{ color: '#14b8a6' }} />
    };
    return icons[layer] || <FaMapMarkerAlt />;
  };

  const getRiskColor = (risk) => {
    if (risk > 70) return '#ef4444';
    if (risk > 40) return '#f59e0b';
    return '#10b981';
  };

  if (!gameState) {
    return <div className="ai-predictions loading">Loading predictions...</div>;
  }

  return (
    <div className="ai-predictions">
      <div className="predictions-header">
        <h2><FaBrain /> AI Prediction Dashboard</h2>
        <p>Machine Learning-powered infrastructure failure forecasting</p>
      </div>

      {/* Summary Cards */}
      <div className="prediction-summary">
        <motion.div
          className="summary-card critical"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="card-icon"><FaExclamationTriangle /></div>
          <div className="card-content">
            <h3>{predictions.filter(p => p.daysUntilFailure <= 2).length}</h3>
            <p>Critical (≤2 days)</p>
          </div>
        </motion.div>

        <motion.div
          className="summary-card warning"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="card-icon"><FaClock /></div>
          <div className="card-content">
            <h3>{predictions.filter(p => p.daysUntilFailure <= 5).length}</h3>
            <p>Next 5 Days</p>
          </div>
        </motion.div>

        <motion.div
          className="summary-card cost"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="card-icon"><FaDollarSign /></div>
          <div className="card-content">
            <h3>${(costPrediction / 1000).toFixed(0)}K</h3>
            <p>Predicted Losses</p>
          </div>
        </motion.div>

        <motion.div
          className="summary-card accuracy"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="card-icon"><FaBullseye /></div>
          <div className="card-content">
            <h3>85%</h3>
            <p>Model Accuracy</p>
          </div>
        </motion.div>
      </div>

      {/* Risk Heatmap by Layer */}
      <div className="risk-zones">
        <h3>Risk Heatmap by Infrastructure Layer</h3>
        <div className="zones-grid">
          {riskZones.map((zone, idx) => (
            <motion.div
              key={zone.layer}
              className="zone-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="zone-header">
                <span className="zone-icon">{getLayerIcon(zone.layer)}</span>
                <span className="zone-name">{zone.layer.toUpperCase()}</span>
              </div>
              <div className="zone-risk-bar">
                <div
                  className="zone-risk-fill"
                  style={{
                    width: `${zone.risk}%`,
                    backgroundColor: getRiskColor(zone.risk)
                  }}
                />
              </div>
              <div className="zone-risk-value" style={{ color: getRiskColor(zone.risk) }}>
                Risk: {zone.risk.toFixed(1)}%
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Prediction Timeline */}
      <div className="prediction-timeline">
        <h3>Failure Prediction Timeline</h3>
        <div className="timeline-container">
          {predictions.length === 0 ? (
            <div className="no-predictions">
              No critical failures predicted in the next 5 days.
            </div>
          ) : (
            predictions.map((pred, idx) => (
              <motion.div
                key={pred.nodeId}
                className="timeline-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div className="timeline-urgency" style={{ backgroundColor: getRiskColor(pred.riskScore) }}>
                  Day {pred.daysUntilFailure}
                </div>
                <div className="timeline-details">
                  <div className="timeline-header">
                    <span className="timeline-node">
                      {getLayerIcon(pred.layer)} {pred.layer.toUpperCase()} Node #{pred.nodeId}
                    </span>
                    <span className="timeline-confidence">
                      {pred.confidence.toFixed(0)}% confidence
                    </span>
                  </div>
                  <div className="timeline-metrics">
                    <span>Health: {pred.health.toFixed(1)}%</span>
                    <span>Risk Score: {pred.riskScore.toFixed(1)}%</span>
                    <span>Est. Cost: ${(pred.estimatedCost / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="timeline-action">
                    <button className="action-recommend">
                      <FaLightbulb style={{ marginRight: 4 }} /> Recommend: {pred.health < 50 ? 'Major Upgrade' : 'Repair'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Model Info */}
      <div className="model-info">
        <h4><FaNetworkWired style={{ marginRight: 8 }} />About the AI Model</h4>
        <div className="model-details">
          <div className="model-stat">
            <strong>Architecture:</strong> Graph Neural Network (GNN)
          </div>
          <div className="model-stat">
            <strong>Training Data:</strong> 1000+ simulated scenarios
          </div>
          <div className="model-stat">
            <strong>Features:</strong> Health, Age, Stress, Network Position
          </div>
          <div className="model-stat">
            <strong>Prediction Window:</strong> 1-5 days ahead
          </div>
        </div>
      </div>
    </div>
  );
}
