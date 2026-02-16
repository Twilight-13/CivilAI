import React from 'react';
import { motion } from 'framer-motion';
import { 
  FaTint, 
  FaBolt, 
  FaRoad, 
  FaWater, 
  FaBuilding,
  FaEye,
  FaEyeSlash 
} from 'react-icons/fa';
import '../styles/LayerControls.css';

const LAYERS = [
  { 
    key: 'water', 
    label: 'Water', 
    icon: FaTint, 
    color: '#3498db',
    description: 'Water pipes and distribution'
  },
  { 
    key: 'power', 
    label: 'Power', 
    icon: FaBolt, 
    color: '#f1c40f',
    description: 'Electrical grid and transformers'
  },
  { 
    key: 'road', 
    label: 'Roads', 
    icon: FaRoad, 
    color: '#95a5a6',
    description: 'Transportation network'
  },
  { 
    key: 'drainage', 
    label: 'Drainage', 
    icon: FaWater, 
    color: '#1abc9c',
    description: 'Sewage and drainage systems'
  },
  { 
    key: 'buildings', 
    label: 'Buildings', 
    icon: FaBuilding, 
    color: '#ecf0f1',
    description: 'City structures'
  }
];

export default function LayerControls({ activeLayers, onToggleLayer, gameState }) {
  const [expanded, setExpanded] = React.useState(true);

  const getLayerStats = (layerKey) => {
    if (!gameState || !gameState.nodes || layerKey === 'buildings') {
      return null;
    }

    const layerNodes = Object.values(gameState.nodes).filter(
      node => node.layer === layerKey
    );

    if (layerNodes.length === 0) return null;

    const avgHealth = layerNodes.reduce((sum, node) => sum + node.health, 0) / layerNodes.length;
    const critical = layerNodes.filter(n => n.health < 30).length;
    const warning = layerNodes.filter(n => n.health >= 30 && n.health < 60).length;

    return { avgHealth, critical, warning, total: layerNodes.length };
  };

  return (
    <motion.div 
      className="layer-controls"
      initial={{ x: 300 }}
      animate={{ x: expanded ? 0 : 250 }}
      transition={{ type: 'spring', damping: 20 }}
    >
      <button 
        className="toggle-panel-btn"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? '►' : '◄'}
      </button>

      <div className="layer-controls-content">
        <h3 className="panel-title">
          <FaEye /> Infrastructure Layers
        </h3>

        <div className="layers-list">
          {LAYERS.map(layer => {
            const Icon = layer.icon;
            const isActive = activeLayers[layer.key];
            const stats = getLayerStats(layer.key);

            return (
              <motion.div
                key={layer.key}
                className={`layer-item ${isActive ? 'active' : 'inactive'}`}
                whileHover={{ scale: 1.02 }}
              >
                <div 
                  className="layer-header"
                  onClick={() => onToggleLayer(layer.key)}
                >
                  <div className="layer-icon" style={{ color: layer.color }}>
                    <Icon />
                  </div>
                  <div className="layer-info">
                    <span className="layer-name">{layer.label}</span>
                    <span className="layer-description">{layer.description}</span>
                  </div>
                  <div className="layer-toggle">
                    {isActive ? <FaEye /> : <FaEyeSlash />}
                  </div>
                </div>

                {stats && isActive && (
                  <motion.div 
                    className="layer-stats"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <div className="stat-row">
                      <span>Avg Health:</span>
                      <span className="stat-value">
                        {stats.avgHealth.toFixed(1)}%
                      </span>
                    </div>
                    <div className="stat-row">
                      <span>Total Nodes:</span>
                      <span className="stat-value">{stats.total}</span>
                    </div>
                    {stats.critical > 0 && (
                      <div className="stat-row critical">
                        <span>⚠️ Critical:</span>
                        <span className="stat-value">{stats.critical}</span>
                      </div>
                    )}
                    {stats.warning > 0 && (
                      <div className="stat-row warning">
                        <span>⚡ Warning:</span>
                        <span className="stat-value">{stats.warning}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="layer-actions">
          <button 
            className="action-btn"
            onClick={() => {
              const allOn = { water: true, power: true, road: true, drainage: true, buildings: true };
              Object.keys(allOn).forEach(k => onToggleLayer(k));
            }}
          >
            Show All
          </button>
          <button 
            className="action-btn"
            onClick={() => {
              const allOff = { water: false, power: false, road: false, drainage: false, buildings: false };
              Object.keys(allOff).forEach(k => onToggleLayer(k));
            }}
          >
            Hide All
          </button>
        </div>
      </div>
    </motion.div>
  );
}
