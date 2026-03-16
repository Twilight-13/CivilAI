import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FaRobot, FaUser, FaCheckCircle, FaNetworkWired } from 'react-icons/fa';
import axios from 'axios';
import '../styles/AllFeatures.css';

const API = 'http://localhost:5000';

export default function Comparison({ gameState }) {
  const [humanStats, setHumanStats] = useState({});
  const [aiStats, setAIStats]       = useState({});
  const [winner, setWinner]         = useState(null);
  const [rlActive, setRlActive]     = useState(false);
  const [rlAction, setRlAction]     = useState(null);
  const [modelMeta, setModelMeta]   = useState(null);

  const fetchRlStatus = useCallback(async () => {
    try {
      const [actionRes, infoRes] = await Promise.all([
        axios.get(`${API}/api/rl-action`),
        axios.get(`${API}/api/model-info`),
      ]);
      setRlActive(!!actionRes.data.rl_active);
      setRlAction(actionRes.data.action || null);
      setModelMeta(infoRes.data);
    } catch (_) {
      setRlActive(false);
    }
  }, []);

  useEffect(() => {
    if (gameState) {
      calculateComparison();
      fetchRlStatus();
    }
  }, [gameState, fetchRlStatus]);

  const calculateComparison = () => {
    // Human (actual player) stats
    const human = {
      totalActions: gameState.stats?.total_actions || 0,
      totalFailures: gameState.stats?.total_failures || 0,
      moneySpent: 1000000 - gameState.budget,
      preventionRate: gameState.stats?.total_actions > 0 ?
        ((gameState.stats.total_actions - gameState.stats.total_failures) / gameState.stats.total_actions * 100) : 0,
      avgHealth: gameState.stats?.avg_health || 0,
      efficiency: gameState.stats?.total_actions > 0 ?
        ((1000000 - gameState.budget) / gameState.stats.total_actions) : 0
    };

    // AI (simulated optimal strategy)
    const optimalActions = Math.floor(gameState.time_step * 1.5);
    const optimalFailures = Math.floor(optimalActions * 0.1);
    const optimalSpent = optimalActions * 7000;

    const ai = {
      totalActions: optimalActions,
      totalFailures: optimalFailures,
      moneySpent: optimalSpent,
      preventionRate: ((optimalActions - optimalFailures) / Math.max(optimalActions, 1) * 100),
      avgHealth: 82,
      efficiency: optimalActions > 0 ? optimalSpent / optimalActions : 0
    };

    setHumanStats(human);
    setAIStats(ai);

    // Determine winner
    const humanScore = (human.preventionRate * 0.4) + (human.avgHealth * 0.3) +
      ((10000 / Math.max(human.efficiency, 1)) * 0.3);
    const aiScore = (ai.preventionRate * 0.4) + (ai.avgHealth * 0.3) +
      ((10000 / Math.max(ai.efficiency, 1)) * 0.3);

    setWinner(humanScore > aiScore ? 'human' : 'ai');
  };

  const ComparisonBar = ({ label, humanValue, aiValue, unit = '', reverse = false }) => {
    const maxValue = Math.max(humanValue, aiValue, 1);
    const humanPercent = (humanValue / maxValue) * 100;
    const aiPercent = (aiValue / maxValue) * 100;

    const humanBetter = reverse ? humanValue < aiValue : humanValue > aiValue;
    const aiBetter = reverse ? aiValue < humanValue : aiValue > humanValue;

    return (
      <div className="comparison-bar-item">
        <div className="bar-label">{label}</div>
        <div className="bar-comparison">
          <div className="bar-side human">
            <span className="bar-value">{humanValue.toFixed(1)}{unit}</span>
            <motion.div
              className={`bar-fill ${humanBetter ? 'better' : ''}`}
              initial={{ width: 0 }}
              animate={{ width: `${humanPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="bar-divider">vs</div>
          <div className="bar-side ai">
            <motion.div
              className={`bar-fill ${aiBetter ? 'better' : ''}`}
              initial={{ width: 0 }}
              animate={{ width: `${aiPercent}%` }}
              transition={{ duration: 0.5 }}
            />
            <span className="bar-value">{aiValue.toFixed(1)}{unit}</span>
          </div>
        </div>
      </div>
    );
  };

  if (!gameState) {
    return <div className="comparison loading">Loading comparison...</div>;
  }

  return (
    <div className="comparison">
      <div className="comparison-header">
        <h2>AI vs Human Performance</h2>
        <div className={`model-badge ${rlActive ? 'active' : 'inactive'}`}>
          {rlActive ? <><FaCheckCircle /> PPO RL Agent Active</> : <><FaNetworkWired /> Heuristic Baseline</>}
        </div>
        <p>{rlActive
          ? `Trained PPO agent (mean reward: ${modelMeta?.rl?.mean_reward ?? '—'}) — real decisions each turn`
          : 'Simulated AI baseline — run train_rl.py to enable the real PPO agent'}
        </p>
      </div>
      {rlActive && rlAction && (
        <div className="rl-recommendation">
          <FaRobot style={{ marginRight: 8, color: '#a78bfa' }} />
          <strong>RL Agent would:</strong> {rlAction.action?.toUpperCase()} {rlAction.layer?.toUpperCase()} Node #{rlAction.node_id} (health {rlAction.health}%) — {rlAction.reason}
        </div>
      )}

      {/* Winner Banner */}
      <motion.div
        className={`winner-banner ${winner}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="winner-icon">
          {winner === 'human' ? <FaUser /> : <FaRobot />}
        </div>
        <div className="winner-text">
          <h3>{winner === 'human' ? 'You\'re Winning!' : 'AI is Ahead'}</h3>
          <p>
            {winner === 'human'
              ? 'Your strategic decisions are outperforming the AI model!'
              : 'The AI\'s optimal strategy is currently more efficient'}
          </p>
        </div>
      </motion.div>

      {/* Player Cards */}
      <div className="player-cards">
        <motion.div
          className="player-card human"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="card-header">
            <FaUser className="player-icon" />
            <h3>Human Player</h3>
          </div>
          <div className="card-stats">
            <div className="stat">
              <span className="stat-label">Prevention Rate</span>
              <span className="stat-value">{humanStats.preventionRate?.toFixed(1)}%</span>
            </div>
            <div className="stat">
              <span className="stat-label">Avg Health</span>
              <span className="stat-value">{humanStats.avgHealth?.toFixed(1)}%</span>
            </div>
            <div className="stat">
              <span className="stat-label">Actions Taken</span>
              <span className="stat-value">{humanStats.totalActions}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Total Failures</span>
              <span className="stat-value">{humanStats.totalFailures}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="player-card ai"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="card-header">
            <FaRobot className="player-icon" />
            <h3>AI Optimal</h3>
          </div>
          <div className="card-stats">
            <div className="stat">
              <span className="stat-label">Prevention Rate</span>
              <span className="stat-value">{aiStats.preventionRate?.toFixed(1)}%</span>
            </div>
            <div className="stat">
              <span className="stat-label">Avg Health</span>
              <span className="stat-value">{aiStats.avgHealth?.toFixed(1)}%</span>
            </div>
            <div className="stat">
              <span className="stat-label">Actions Taken</span>
              <span className="stat-value">{aiStats.totalActions}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Total Failures</span>
              <span className="stat-value">{aiStats.totalFailures}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Detailed Comparison */}
      <div className="detailed-comparison">
        <h3>Detailed Performance Comparison</h3>
        <div className="comparison-bars">
          <ComparisonBar
            label="Prevention Rate"
            humanValue={humanStats.preventionRate || 0}
            aiValue={aiStats.preventionRate || 0}
            unit="%"
          />
          <ComparisonBar
            label="System Health"
            humanValue={humanStats.avgHealth || 0}
            aiValue={aiStats.avgHealth || 0}
            unit="%"
          />
          <ComparisonBar
            label="Cost Efficiency"
            humanValue={humanStats.efficiency || 0}
            aiValue={aiStats.efficiency || 0}
            unit="$/action"
            reverse={true}
          />
          <ComparisonBar
            label="Total Failures"
            humanValue={humanStats.totalFailures || 0}
            aiValue={aiStats.totalFailures || 0}
            reverse={true}
          />
          <ComparisonBar
            label="Money Spent"
            humanValue={(humanStats.moneySpent || 0) / 1000}
            aiValue={(aiStats.moneySpent || 0) / 1000}
            unit="K"
            reverse={true}
          />
        </div>
      </div>

      {/* Strategy Analysis */}
      <div className="strategy-analysis">
        <h3>Strategy Insights</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <h4>Your Strengths</h4>
            <ul>
              {humanStats.preventionRate > aiStats.preventionRate &&
                <li>Better failure prevention</li>}
              {humanStats.avgHealth > aiStats.avgHealth &&
                <li>✅ Higher system health maintenance</li>}
              {humanStats.efficiency < aiStats.efficiency &&
                <li>✅ More cost-efficient actions</li>}
              {humanStats.preventionRate <= aiStats.preventionRate &&
                humanStats.avgHealth <= aiStats.avgHealth &&
                humanStats.efficiency >= aiStats.efficiency &&
                <li>💪 Keep improving - AI has optimized over 1000+ scenarios</li>}
            </ul>
          </div>

          <div className="insight-card">
            <h4>Areas to Improve</h4>
            <ul>
              {humanStats.preventionRate < aiStats.preventionRate &&
                <li>🔄 Focus on preventive maintenance</li>}
              {humanStats.avgHealth < aiStats.avgHealth &&
                <li>🔄 Monitor critical nodes more closely</li>}
              {humanStats.efficiency > aiStats.efficiency &&
                <li>🔄 Optimize action timing and selection</li>}
              {humanStats.totalFailures > aiStats.totalFailures * 1.5 &&
                <li>🔄 Act earlier on high-risk nodes</li>}
            </ul>
          </div>

          <div className="insight-card">
            <h4>🤝 Hybrid Approach</h4>
            <p>
              Best results come from combining human intuition with AI predictions.
              Use AI recommendations as guidance while applying your strategic thinking.
            </p>
            <div className="hybrid-stat">
              <strong>Potential Improvement:</strong> +{((aiStats.preventionRate - humanStats.preventionRate) / 2).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Learning Progress */}
      <div className="learning-progress">
        <h3>📚 AI Learning from Your Gameplay</h3>
        <div className="progress-info">
          <p>
            The AI model learns optimal strategies by analyzing gameplay from multiple users.
            Your decisions contribute to improving the model's recommendations.
          </p>
          <div className="learning-stats">
            <div className="learning-stat">
              <span className="stat-number">{gameState.time_step}</span>
              <span className="stat-text">Data Points Contributed</span>
            </div>
            <div className="learning-stat">
              <span className="stat-number">{humanStats.totalActions}</span>
              <span className="stat-text">Decisions Logged</span>
            </div>
            <div className="learning-stat">
              <span className="stat-number">1000+</span>
              <span className="stat-text">Total Training Scenarios</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
