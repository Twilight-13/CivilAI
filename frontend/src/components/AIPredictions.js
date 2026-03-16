import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FaBrain, FaExclamationTriangle, FaDollarSign, FaClock, FaTint, FaBolt, FaRoad, FaWater, FaMapMarkerAlt, FaLightbulb, FaBullseye, FaNetworkWired, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import axios from 'axios';
import '../styles/AIPredictions.css';

const API = 'http://localhost:5000';

export default function AIPredictions({ gameState }) {
  const [predictions, setPredictions] = useState([]);
  const [riskZones, setRiskZones]     = useState([]);
  const [costPrediction, setCostPrediction] = useState(0);
  const [modelInfo, setModelInfo]     = useState(null);
  const [modelActive, setModelActive] = useState(false);
  const [loading, setLoading]         = useState(false);

  // Fetch real GNN predictions from backend
  const fetchPredictions = useCallback(async () => {
    if (!gameState) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/predictions`);
      const data = res.data;

      const preds = (data.predictions || []).map(p => ({
        nodeId:          p.node_id,
        layer:           p.layer,
        health:          p.health,
        riskScore:       p.risk_score,
        failureProb:     p.failure_prob,
        daysUntilFailure: p.days_to_fail,
        estimatedCost:   50000 * (1 + (gameState.nodes?.[p.node_id]?.connected_to?.length || 0) * 0.2),
        confidence:      p.confidence * 100,
        featureImportance: p.feature_importance || {},
        model:           p.model,
      }));

      preds.sort((a, b) => a.daysUntilFailure - b.daysUntilFailure);
      setPredictions(preds.slice(0, 10));
      setCostPrediction(preds.reduce((s, p) => s + p.estimatedCost, 0));
      setModelActive(!!data.model_active);
      setModelInfo(data.model_info);

      // Layer risk heatmap
      const zones = { water: 0, power: 0, road: 0, drainage: 0 };
      preds.forEach(p => { zones[p.layer] = (zones[p.layer] || 0) + p.riskScore; });
      setRiskZones(Object.entries(zones).map(([layer, risk]) => ({ layer, risk: Math.min(risk / 5, 100) })));
    } catch (err) {
      console.warn('Predictions API error, using local heuristic fallback:', err);
      localFallback();
    } finally {
      setLoading(false);
    }
  }, [gameState]);

  // Local heuristic fallback (same as original code) used when backend is unreachable
  const localFallback = () => {
    if (!gameState?.nodes) return;
    const nodes = Object.values(gameState.nodes);
    const preds = nodes
      .map(node => {
        const totalRisk = ((100 - node.health) / 100) * 0.4 +
          Math.min(node.age / 50, 1) * 0.2 +
          ((node.connected_to?.length || 0) / 10) * 0.2;
        if (totalRisk <= 0.3) return null;
        return {
          nodeId: node.id, layer: node.layer, health: node.health,
          riskScore: totalRisk * 100, failureProb: totalRisk,
          daysUntilFailure: Math.max(1, Math.min(5, Math.floor(node.health / 20))),
          estimatedCost: 50000, confidence: 70 + totalRisk * 20,
          featureImportance: {}, model: 'heuristic',
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.daysUntilFailure - b.daysUntilFailure)
      .slice(0, 10);

    setPredictions(preds);
    setCostPrediction(preds.reduce((s, p) => s + p.estimatedCost, 0));
    setModelActive(false);
    setModelInfo({ type: 'Heuristic (start backend to enable GNN)' });
    const zones = { water: 0, power: 0, road: 0, drainage: 0 };
    preds.forEach(p => { zones[p.layer] = (zones[p.layer] || 0) + p.riskScore; });
    setRiskZones(Object.entries(zones).map(([layer, risk]) => ({ layer, risk: Math.min(risk / 5, 100) })));
  };

  useEffect(() => { fetchPredictions(); }, [fetchPredictions]);

  const getLayerIcon = layer => ({
    water: <FaTint style={{ color: '#3b82f6' }} />,
    power: <FaBolt style={{ color: '#eab308' }} />,
    road:  <FaRoad style={{ color: '#94a3b8' }} />,
    drainage: <FaWater style={{ color: '#14b8a6' }} />,
  }[layer] || <FaMapMarkerAlt />);

  const getRiskColor = r => r > 70 ? '#ef4444' : r > 40 ? '#f59e0b' : '#10b981';

  if (!gameState) return <div className="ai-predictions loading">Loading predictions...</div>;

  return (
    <div className="ai-predictions">
      <div className="predictions-header">
        <h2><FaBrain /> AI Prediction Dashboard</h2>
        {/* Model status badge */}
        <div className={`model-badge ${modelActive ? 'active' : 'inactive'}`}>
          {loading
            ? <><FaSpinner className="spin" /> Fetching...</>
            : modelActive
              ? <><FaCheckCircle /> GNN Active — AUC {modelInfo?.test_auc ?? '—'}</>
              : <><FaNetworkWired /> Heuristic Mode</>
          }
        </div>
        <p>
          {modelActive
            ? `Graph Attention Network predictions — trained on ${(modelInfo?.trained_on || 0).toLocaleString()} scenarios`
            : 'Rule-based fallback — run train_gnn.py to enable real ML predictions'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="prediction-summary">
        {[
          { cls: 'critical', icon: <FaExclamationTriangle />, value: predictions.filter(p => p.daysUntilFailure <= 2).length, label: 'Critical (≤2 days)' },
          { cls: 'warning',  icon: <FaClock />,               value: predictions.filter(p => p.daysUntilFailure <= 5).length, label: 'Next 5 Days' },
          { cls: 'cost',     icon: <FaDollarSign />,           value: `$${(costPrediction / 1000).toFixed(0)}K`, label: 'Predicted Losses' },
          { cls: 'accuracy', icon: <FaBullseye />,
            value: modelActive
              ? `${((modelInfo?.test_auc || 0) * 100).toFixed(0)}%`
              : '—',
            label: modelActive ? 'Model AUC' : 'Model Inactive' },
        ].map((card, i) => (
          <motion.div key={card.label} className={`summary-card ${card.cls}`}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <div className="card-icon">{card.icon}</div>
            <div className="card-content"><h3>{card.value}</h3><p>{card.label}</p></div>
          </motion.div>
        ))}
      </div>

      {/* Risk Heatmap */}
      <div className="risk-zones">
        <h3>Risk Heatmap by Infrastructure Layer</h3>
        <div className="zones-grid">
          {riskZones.map((zone, idx) => (
            <motion.div key={zone.layer} className="zone-card"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.1 }}>
              <div className="zone-header">
                <span className="zone-icon">{getLayerIcon(zone.layer)}</span>
                <span className="zone-name">{zone.layer.toUpperCase()}</span>
              </div>
              <div className="zone-risk-bar">
                <div className="zone-risk-fill" style={{ width: `${zone.risk}%`, backgroundColor: getRiskColor(zone.risk) }} />
              </div>
              <div className="zone-risk-value" style={{ color: getRiskColor(zone.risk) }}>Risk: {zone.risk.toFixed(1)}%</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Prediction Timeline */}
      <div className="prediction-timeline">
        <h3>Failure Prediction Timeline</h3>
        <div className="timeline-container">
          {predictions.length === 0 ? (
            <div className="no-predictions">No critical failures predicted in the next 5 days.</div>
          ) : predictions.map((pred, idx) => (
            <motion.div key={pred.nodeId} className="timeline-item"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
              <div className="timeline-urgency" style={{ backgroundColor: getRiskColor(pred.riskScore) }}>
                Day {pred.daysUntilFailure}
              </div>
              <div className="timeline-details">
                <div className="timeline-header">
                  <span className="timeline-node">{getLayerIcon(pred.layer)} {pred.layer.toUpperCase()} Node #{pred.nodeId}</span>
                  <span className="timeline-confidence">{pred.confidence.toFixed(0)}% confidence</span>
                </div>
                <div className="timeline-metrics">
                  <span>Health: {pred.health.toFixed(1)}%</span>
                  <span>Risk: {pred.riskScore.toFixed(1)}%</span>
                  {modelActive && <span style={{ color: '#a78bfa' }}>
                    Fail Prob: {(pred.failureProb * 100).toFixed(1)}%
                  </span>}
                  <span>Est. Cost: ${(pred.estimatedCost / 1000).toFixed(0)}K</span>
                </div>
                <div className="timeline-action">
                  <button className="action-recommend">
                    <FaLightbulb style={{ marginRight: 4 }} />
                    Recommend: {pred.health < 50 ? 'Major Upgrade' : 'Repair'}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Model Info */}
      <div className="model-info">
        <h4><FaNetworkWired style={{ marginRight: 8 }} />About the AI Model</h4>
        <div className="model-details">
          <div className="model-stat"><strong>Architecture:</strong> {modelInfo?.type || 'Graph Attention Network (GAT)'}</div>
          <div className="model-stat"><strong>Training Data:</strong> {modelInfo?.trained_on ? (modelInfo.trained_on).toLocaleString() + ' graph snapshots' : '10,000+ simulated game scenarios'}</div>
          <div className="model-stat"><strong>Features:</strong> Health, Age, Degree, Criticality, Layer, Days-since-maintained</div>
          <div className="model-stat"><strong>Prediction Window:</strong> 1–5 days ahead</div>
          {modelActive && modelInfo?.test_auc && (
            <div className="model-stat"><strong>Validation AUC:</strong> {(modelInfo.test_auc * 100).toFixed(1)}% &nbsp; <strong>F1:</strong> {(modelInfo.test_f1 * 100).toFixed(1)}%</div>
          )}
        </div>
      </div>
    </div>
  );
}
