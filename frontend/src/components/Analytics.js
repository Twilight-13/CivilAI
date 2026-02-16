import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaChartLine, FaChartBar, FaChartPie, FaCalculator } from 'react-icons/fa';
import '../styles/Analytics.css';

export default function Analytics({ gameState }) {
  const [budgetHistory, setBudgetHistory] = useState([]);
  const [failuresByLayer, setFailuresByLayer] = useState({});
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    if (gameState) {
      calculateMetrics();
    }
  }, [gameState]);

  const calculateMetrics = () => {
    if (!gameState) return;

    // Budget trend (last 20 time steps)
    const budgetData = [];
    for (let i = Math.max(0, gameState.time_step - 20); i <= gameState.time_step; i++) {
      budgetData.push({
        day: i,
        budget: gameState.budget + (gameState.time_step - i) * 10000 // Simplified
      });
    }
    setBudgetHistory(budgetData);

    // Failures by layer
    const layerFailures = {
      water: 0,
      power: 0,
      road: 0,
      drainage: 0
    };

    if (gameState.recent_failures) {
      gameState.recent_failures.forEach(failure => {
        failure.nodes.forEach(nodeId => {
          const node = gameState.nodes[nodeId];
          if (node) {
            layerFailures[node.layer] = (layerFailures[node.layer] || 0) + 1;
          }
        });
      });
    }
    setFailuresByLayer(layerFailures);

    // Calculate business metrics
    const totalNodes = Object.keys(gameState.nodes).length;
    const healthyNodes = gameState.stats?.healthy_nodes || 0;
    const totalFailures = gameState.stats?.total_failures || 0;
    const actionsTaken = gameState.stats?.total_actions || 0;

    const preventionRate = actionsTaken > 0 ?
      ((actionsTaken - totalFailures) / actionsTaken * 100) : 0;

    const avgCostPerAction = actionsTaken > 0 ?
      (1000000 - gameState.budget) / actionsTaken : 0;

    const roi = totalFailures > 0 ?
      ((totalFailures * 50000 - avgCostPerAction * actionsTaken) /
        (avgCostPerAction * actionsTaken) * 100) : 0;

    setMetrics({
      uptime: (healthyNodes / totalNodes * 100).toFixed(1),
      preventionRate: Math.max(0, preventionRate).toFixed(1),
      avgResponseTime: (actionsTaken / Math.max(gameState.time_step, 1)).toFixed(2),
      roi: roi.toFixed(1),
      costEfficiency: (avgCostPerAction / 1000).toFixed(1),
      systemHealth: gameState.stats?.avg_health || 0
    });
  };

  const getMaxBudget = () => {
    return Math.max(...budgetHistory.map(d => d.budget), 1000000);
  };

  if (!gameState) {
    return <div className="analytics loading">Loading analytics...</div>;
  }

  return (
    <div className="analytics">
      <div className="analytics-header">
        <h2><FaChartLine /> Analytics Dashboard</h2>
        <p>Data-driven insights for infrastructure management</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <motion.div
          className="kpi-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="kpi-icon" style={{ color: '#2ecc71' }}>
            <FaChartLine />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{metrics.uptime}%</div>
            <div className="kpi-label">System Uptime</div>
          </div>
        </motion.div>

        <motion.div
          className="kpi-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="kpi-icon" style={{ color: '#3498db' }}>
            <FaChartBar />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{metrics.preventionRate}%</div>
            <div className="kpi-label">Prevention Rate</div>
          </div>
        </motion.div>

        <motion.div
          className="kpi-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="kpi-icon" style={{ color: '#f39c12' }}>
            <FaCalculator />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{metrics.roi}%</div>
            <div className="kpi-label">ROI</div>
          </div>
        </motion.div>

        <motion.div
          className="kpi-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="kpi-icon" style={{ color: '#9b59b6' }}>
            <FaChartPie />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">${metrics.costEfficiency}K</div>
            <div className="kpi-label">Avg Cost/Action</div>
          </div>
        </motion.div>
      </div>

      {/* Budget Trend Chart */}
      <div className="chart-container">
        <h3>Budget Trend</h3>
        <div className="line-chart">
          <div className="chart-y-axis">
            <span>${(getMaxBudget() / 1000).toFixed(0)}K</span>
            <span>${(getMaxBudget() / 2000).toFixed(0)}K</span>
            <span>$0</span>
          </div>
          <div className="chart-area">
            <svg width="100%" height="200" viewBox="0 0 600 200">
              {/* Grid lines */}
              <line x1="0" y1="0" x2="600" y2="0" stroke="#ecf0f1" strokeWidth="1" />
              <line x1="0" y1="100" x2="600" y2="100" stroke="#ecf0f1" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="0" y1="200" x2="600" y2="200" stroke="#ecf0f1" strokeWidth="1" />

              {/* Budget line */}
              <polyline
                fill="none"
                stroke="#3498db"
                strokeWidth="3"
                points={budgetHistory.map((d, i) => {
                  const x = (i / Math.max(budgetHistory.length - 1, 1)) * 600;
                  const y = 200 - (d.budget / getMaxBudget()) * 200;
                  return `${x},${y}`;
                }).join(' ')}
              />

              {/* Area fill */}
              <polygon
                fill="rgba(52, 152, 219, 0.1)"
                points={
                  budgetHistory.map((d, i) => {
                    const x = (i / Math.max(budgetHistory.length - 1, 1)) * 600;
                    const y = 200 - (d.budget / getMaxBudget()) * 200;
                    return `${x},${y}`;
                  }).join(' ') + ` 600,200 0,200`
                }
              />
            </svg>
          </div>
          <div className="chart-x-axis">
            <span>Day {Math.max(0, gameState.time_step - 20)}</span>
            <span>Day {gameState.time_step}</span>
          </div>
        </div>
      </div>

      {/* Failures by Layer Bar Chart */}
      <div className="chart-container">
        <h3>Failures by Infrastructure Layer</h3>
        <div className="bar-chart">
          {Object.entries(failuresByLayer).map(([layer, count]) => {
            const maxCount = Math.max(...Object.values(failuresByLayer), 1);
            const percentage = (count / maxCount) * 100;
            const colors = {
              water: '#3498db',
              power: '#f1c40f',
              road: '#95a5a6',
              drainage: '#1abc9c'
            };

            return (
              <div key={layer} className="bar-item">
                <div className="bar-label">{layer.toUpperCase()}</div>
                <div className="bar-container">
                  <motion.div
                    className="bar-fill"
                    style={{ backgroundColor: colors[layer] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5 }}
                  />
                  <span className="bar-value">{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Health Gauge */}
      <div className="chart-container">
        <h3>🏥 System Health Overview</h3>
        <div className="health-gauge">
          <svg width="200" height="120" viewBox="0 0 200 120">
            {/* Background arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#ecf0f1"
              strokeWidth="20"
              strokeLinecap="round"
            />
            {/* Health arc */}
            <motion.path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={metrics.systemHealth >= 60 ? '#2ecc71' : metrics.systemHealth >= 30 ? '#f39c12' : '#e74c3c'}
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray={`${(metrics.systemHealth / 100) * 251} 251`}
              initial={{ strokeDasharray: '0 251' }}
              animate={{ strokeDasharray: `${(metrics.systemHealth / 100) * 251} 251` }}
              transition={{ duration: 1 }}
            />
            <text x="100" y="80" textAnchor="middle" fontSize="32" fill="#2c3e50" fontWeight="bold">
              {metrics.systemHealth}%
            </text>
            <text x="100" y="100" textAnchor="middle" fontSize="12" fill="#7f8c8d">
              System Health
            </text>
          </svg>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="performance-summary">
        <h3>Performance Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <div className="summary-label">Total Infrastructure Nodes</div>
            <div className="summary-value">{Object.keys(gameState.nodes).length}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Days Operated</div>
            <div className="summary-value">{gameState.time_step}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Total Actions Taken</div>
            <div className="summary-value">{gameState.stats?.total_actions || 0}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Total Failures</div>
            <div className="summary-value">{gameState.stats?.total_failures || 0}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Money Spent</div>
            <div className="summary-value">${((1000000 - gameState.budget) / 1000).toFixed(0)}K</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Current Score</div>
            <div className="summary-value">{gameState.score}</div>
          </div>
        </div>
      </div>

      {/* Cost-Benefit Analysis */}
      <div className="cost-benefit">
        <h3>Cost-Benefit Analysis</h3>
        <div className="benefit-grid">
          <div className="benefit-card positive">
            <h4>Money Saved (Preventive)</h4>
            <div className="benefit-value">
              ${((gameState.stats?.total_actions || 0) * 15).toFixed(0)}K
            </div>
            <p>By preventing failures through maintenance</p>
          </div>
          <div className="benefit-card negative">
            <h4>Losses (Reactive)</h4>
            <div className="benefit-value">
              ${((gameState.stats?.total_failures || 0) * 50).toFixed(0)}K
            </div>
            <p>From infrastructure failures and cascades</p>
          </div>
          <div className="benefit-card neutral">
            <h4>Net Impact</h4>
            <div className="benefit-value">
              ${(((gameState.stats?.total_actions || 0) * 15) - ((gameState.stats?.total_failures || 0) * 50)).toFixed(0)}K
            </div>
            <p>Overall financial performance</p>
          </div>
        </div>
      </div>
    </div>
  );
}
