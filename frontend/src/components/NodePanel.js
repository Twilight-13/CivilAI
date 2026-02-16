import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FaTimes,
  FaWrench,
  FaTools,
  FaBolt as FaEmergency,
  FaInfoCircle,
  FaDollarSign
} from 'react-icons/fa';
import { gameService } from '../services/gameService';
import '../styles/NodePanel.css';

const ACTIONS = [
  {
    key: 'repair',
    label: 'Repair',
    icon: FaWrench,
    cost: 5000,
    effect: '+30% health',
    color: '#3498db',
    description: 'Minor repair to restore functionality'
  },
  {
    key: 'upgrade',
    label: 'Major Upgrade',
    icon: FaTools,
    cost: 20000,
    effect: 'Full restoration',
    color: '#2ecc71',
    description: 'Complete overhaul and modernization'
  },
  {
    key: 'emergency',
    label: 'Emergency Fix',
    icon: FaEmergency,
    cost: 10000,
    effect: '+50% health',
    color: '#e74c3c',
    description: 'Quick patch for critical situations'
  }
];

export default function NodePanel({ nodeId, gameState, onAction, onClose }) {
  const [nodeData, setNodeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [performing, setPerforming] = useState(false);

  useEffect(() => {
    loadNodeData();
  }, [nodeId]);

  const loadNodeData = async () => {
    setLoading(true);
    try {
      const result = await gameService.inspectNode(nodeId);
      if (result.success) {
        setNodeData(result.node);
      }
    } catch (error) {
      console.error('Failed to load node data:', error);
    }
    setLoading(false);
  };

  const handleAction = async (actionKey) => {
    setPerforming(true);
    await onAction(actionKey, nodeId);
    await loadNodeData(); // Reload to show updated health
    setPerforming(false);
  };

  if (loading || !nodeData) {
    return (
      <motion.div
        className="node-panel"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="panel-loading">Loading node data...</div>
      </motion.div>
    );
  }

  const healthColor = nodeData.health >= 60 ? '#2ecc71' :
    nodeData.health >= 30 ? '#f39c12' : '#e74c3c';

  const layerColor = {
    water: '#3498db',
    power: '#f1c40f',
    road: '#95a5a6',
    drainage: '#1abc9c'
  }[nodeData.layer] || '#ffffff';

  const canAfford = (cost) => gameState.budget >= cost;

  return (
    <motion.div
      className="node-panel"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 25 }}
    >
      <div className="panel-header">
        <div className="panel-title">
          <FaInfoCircle style={{ color: layerColor }} />
          <h3>
            {nodeData.layer.charAt(0).toUpperCase() + nodeData.layer.slice(1)} Node #{nodeData.id}
          </h3>
        </div>
        <button className="close-btn" onClick={onClose}>
          <FaTimes />
        </button>
      </div>

      <div className="panel-content">
        {/* Node Status */}
        <div className="node-status">
          <div className="status-main">
            <div className="health-indicator">
              <div className="health-circle" style={{ borderColor: healthColor }}>
                <span className="health-value" style={{ color: healthColor }}>
                  {nodeData.health.toFixed(1)}%
                </span>
                <span className="health-label">Health</span>
              </div>
            </div>

            <div className="status-details">
              <div className="detail-row">
                <span className="detail-label">Age:</span>
                <span className="detail-value">{nodeData.age} years</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span
                  className="detail-value status-badge"
                  style={{
                    backgroundColor: healthColor,
                    color: '#fff'
                  }}
                >
                  {nodeData.health >= 60 ? 'Healthy' :
                    nodeData.health >= 30 ? 'Warning' : 'Critical'}
                </span>
              </div>
              {nodeData.is_critical && (
                <div className="detail-row critical-flag">
                  <span className="detail-label">Warning</span>
                  <span className="detail-value">Critical Infrastructure</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Connections:</span>
                <span className="detail-value">{nodeData.connected_to.length}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Serving Buildings:</span>
                <span className="detail-value">{nodeData.serving_buildings}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Last Maintained:</span>
                <span className="detail-value">
                  {nodeData.last_maintained > 0
                    ? `Day ${nodeData.last_maintained}`
                    : 'Never'}
                </span>
              </div>
            </div>
          </div>

          {/* Health Progress Bar */}
          <div className="health-bar-container">
            <div className="health-bar-bg">
              <motion.div
                className="health-bar-fill"
                style={{ backgroundColor: healthColor }}
                initial={{ width: 0 }}
                animate={{ width: `${nodeData.health}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>

        {/* Available Actions */}
        <div className="node-actions">
          <h4>Available Actions</h4>
          <div className="actions-grid">
            {ACTIONS.map(action => {
              const Icon = action.icon;
              const affordable = canAfford(action.cost);
              const disabled = performing || !affordable;

              return (
                <motion.button
                  key={action.key}
                  className={`action-card ${disabled ? 'disabled' : ''}`}
                  onClick={() => handleAction(action.key)}
                  disabled={disabled}
                  whileHover={!disabled ? { scale: 1.05, y: -5 } : {}}
                  whileTap={!disabled ? { scale: 0.95 } : {}}
                >
                  <div className="action-icon" style={{ color: action.color }}>
                    <Icon />
                  </div>
                  <div className="action-details">
                    <h5>{action.label}</h5>
                    <p>{action.description}</p>
                    <div className="action-meta">
                      <span className="action-cost">
                        <FaDollarSign />
                        {action.cost.toLocaleString()}
                      </span>
                      <span className="action-effect">{action.effect}</span>
                    </div>
                  </div>
                  {!affordable && (
                    <div className="insufficient-funds">
                      Not enough budget
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Warning Messages */}
        {nodeData.health < 30 && (
          <motion.div
            className="warning-box critical"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <strong>Critical Warning:</strong> This node is at risk of failure.
            Immediate action recommended!
          </motion.div>
        )}

        {nodeData.health < 60 && nodeData.health >= 30 && (
          <motion.div
            className="warning-box warning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <strong>⚡ Attention:</strong> This node requires maintenance soon.
          </motion.div>
        )}

        {nodeData.connected_to.length > 5 && nodeData.health < 50 && (
          <motion.div
            className="warning-box info"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <strong>🔗 Cascade Risk:</strong> This node has many connections.
            Failure could affect {nodeData.connected_to.length} other nodes.
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
