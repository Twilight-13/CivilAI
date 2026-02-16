import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaDollarSign, FaClock, FaTrophy, FaPlay, FaPause, FaForward, FaExclamationTriangle, FaWrench } from 'react-icons/fa';
import '../styles/GameHUD-NEW.css';

export default function GameHUD({ gameState, autoPlay, onToggleAutoPlay, onAdvanceTime }) {
  const [prevBudget, setPrevBudget] = useState(0);
  const [budgetChange, setBudgetChange] = useState(0);

  useEffect(() => {
    if (gameState && gameState.budget !== prevBudget) {
      setBudgetChange(gameState.budget - prevBudget);
      setPrevBudget(gameState.budget);

      // Clear change indicator after 2 seconds
      setTimeout(() => setBudgetChange(0), 2000);
    }
  }, [gameState?.budget]);

  if (!gameState) return null;

  const { time_step, budget, score, stats } = gameState;

  // Calculate health percentage
  const healthPercentage = stats.avg_health || 0;
  const healthColor = healthPercentage >= 60 ? '#2ecc71' :
    healthPercentage >= 30 ? '#f39c12' : '#e74c3c';

  return (
    <div className="game-hud">
      {/* Left Section - Game Info */}
      <div className="hud-section left">
        <motion.div
          className={`hud-stat budget ${budget < 0 ? 'negative' : budget < 100000 ? 'low' : ''}`}
          animate={{
            scale: budgetChange !== 0 ? [1, 1.1, 1] : 1
          }}
        >
          <div className="stat-icon">
            <FaDollarSign />
          </div>
          <div className="stat-content">
            <span className="stat-label">Budget</span>
            <span className="stat-value" style={{ color: budget < 0 ? '#e74c3c' : budget < 100000 ? '#f39c12' : '#2ecc71' }}>
              ${Math.abs(budget).toLocaleString()}{budget < 0 ? ' (DEBT)' : ''}
            </span>
            {budgetChange !== 0 && (
              <motion.span
                className={`stat-change ${budgetChange > 0 ? 'positive' : 'negative'}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {budgetChange > 0 ? '+' : ''}${budgetChange.toLocaleString()}
              </motion.span>
            )}
          </div>
        </motion.div>

        <div className="hud-stat time">
          <div className="stat-icon">
            <FaClock />
          </div>
          <div className="stat-content">
            <span className="stat-label">Day</span>
            <span className="stat-value">{time_step}</span>
          </div>
        </div>

        <div className="hud-stat score">
          <div className="stat-icon">
            <FaTrophy />
          </div>
          <div className="stat-content">
            <span className="stat-label">Score</span>
            <span className="stat-value">{score}</span>
          </div>
        </div>


      </div>

      {/* Center Section - City Health */}
      <div className="hud-section center">
        <div className="city-health">
          <h3>City Health</h3>
          <div className="health-bar-container">
            <motion.div
              className="health-bar"
              style={{
                width: `${healthPercentage}%`,
                backgroundColor: healthColor
              }}
              animate={{ width: `${healthPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
            <span className="health-text">{healthPercentage.toFixed(1)}%</span>
          </div>

          <div className="health-breakdown">
            <div className="breakdown-item healthy">
              <span className="dot"></span>
              <span>Healthy: {stats.healthy_nodes || 0}</span>
            </div>
            <div className="breakdown-item warning">
              <span className="dot"></span>
              <span>Warning: {stats.warning_nodes || 0}</span>
            </div>
            <div className="breakdown-item critical">
              <span className="dot"></span>
              <span>Critical: {stats.critical_nodes || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Controls & Stats */}
      <div className="hud-section right">
        <div className="hud-stat" style={{ borderColor: stats.total_failures > 0 ? 'rgba(239,68,68,0.3)' : undefined }}>
          <div className="stat-icon" style={{ color: '#ef4444' }}>
            <FaExclamationTriangle />
          </div>
          <div className="stat-content">
            <span className="stat-label">Failures</span>
            <span className="stat-value">{stats.total_failures || 0}</span>
          </div>
        </div>

        <div className="hud-stat">
          <div className="stat-icon" style={{ color: '#6366f1' }}>
            <FaWrench />
          </div>
          <div className="stat-content">
            <span className="stat-label">Actions</span>
            <span className="stat-value">{stats.total_actions || 0}</span>
          </div>
        </div>

        <div className="time-controls">
          <motion.button
            className={`control-btn ${autoPlay ? 'active' : ''}`}
            onClick={onToggleAutoPlay}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={autoPlay ? "Pause Auto-Play" : "Start Auto-Play"}
          >
            {autoPlay ? <FaPause /> : <FaPlay />}
            <span>{autoPlay ? 'Pause' : 'Auto-Play'}</span>
          </motion.button>

          <motion.button
            className="control-btn advance"
            onClick={onAdvanceTime}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={autoPlay}
            title="Advance One Day"
          >
            <FaForward />
            <span>Next Day</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
