import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBars, FaTimes } from 'react-icons/fa';
import CityView from './components/CityView';
import GameHUD from './components/GameHUD';
import Tutorial from './components/Tutorial';
import NodePanel from './components/NodePanel';
import LayerControls from './components/LayerControls';
import AIPredictions from './components/AIPredictions';
import Analytics from './components/Analytics';
import Comparison from './components/Comparison';
import Explainability from './components/Explainability';
import DemoMode from './components/DemoMode';
import { gameService } from './services/gameService';
import './styles/App.css';
import './styles/GameHUD-NEW.css';
import './styles/TabMenu.css';

const TABS = [
  { id: 0, name: 'City View', icon: '🏙️' },
  { id: 1, name: 'AI Predictions', icon: '🧠' },
  { id: 2, name: 'Analytics', icon: '📊' },
  { id: 3, name: 'AI vs Human', icon: '⚖️' },
  { id: 4, name: 'Explainability', icon: '💡' },
  { id: 5, name: 'Demo Mode', icon: '🎮' }
];

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [gameState, setGameState] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeLayers, setActiveLayers] = useState({
    water: true,
    power: true,
    road: true,
    drainage: true,
    buildings: true
  });
  const [autoPlay, setAutoPlay] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    gameService.onStateUpdate((newState) => {
      setGameState(newState);
    });

    gameService.onTimeAdvanced((result) => {
      if (result.failed_nodes && result.failed_nodes.length > 0) {
        showFailureNotification(result);
      }
      
      if (result.game_over) {
        alert('💀 GAME OVER!\\n\\nBudget: $0\\nFinal Score: ' + gameState?.score + '\\nDays: ' + result.time_step);
        if (window.confirm('Play again?')) {
          window.location.reload();
        }
      }
    });

    return () => {
      gameService.disconnect();
    };
  }, [gameState?.score]);

  const startGame = async (difficulty) => {
    setLoading(true);
    try {
      const result = await gameService.initGame(difficulty);
      setGameState(result.state);
      setGameStarted(true);
      setShowTutorial(false);
    } catch (error) {
      console.error('Failed to start game:', error);
    }
    setLoading(false);
  };

  const handleNodeClick = async (nodeId) => {
    setSelectedNode(nodeId);
  };

  const handleAction = async (action, nodeId) => {
    try {
      const result = await gameService.performAction(action, nodeId);
      if (result.success) {
        showNotification('success', result.message);
      } else {
        showNotification('error', result.message);
      }
    } catch (error) {
      showNotification('error', 'Action failed');
    }
  };

  const toggleLayer = (layer) => {
    setActiveLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  };

  const toggleAutoPlay = async () => {
    try {
      await gameService.toggleAutoAdvance();
      setAutoPlay(!autoPlay);
    } catch (error) {
      console.error('Failed to toggle auto-play:', error);
    }
  };

  const advanceTime = async () => {
    try {
      await gameService.advanceTime();
      
      if (gameState && gameState.budget < 50000 && gameState.budget > 0) {
        showNotification('warning', '⚠️ Low Budget!');
      }
    } catch (error) {
      console.error('Failed to advance time:', error);
    }
  };

  const showNotification = (type, message) => {
    console.log(`${type}: ${message}`);
  };

  const showFailureNotification = (result) => {
    showNotification('error', 
      `⚠️ ${result.failed_nodes.length} failures! Cost: $${result.failure_cost.toLocaleString()}`
    );
  };

  const changeTab = (tabId) => {
    setActiveTab(tabId);
    setMenuOpen(false);
  };

  if (!gameStarted) {
    return (
      <div className="app-container">
        <AnimatePresence>
          {showTutorial && (
            <Tutorial 
              onStart={startGame}
              onSkip={() => setShowTutorial(false)}
            />
          )}
        </AnimatePresence>
        
        {!showTutorial && (
          <motion.div 
            className="difficulty-selector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h1 className="game-title">🏙️ CIVILAI</h1>
            <p className="game-subtitle">Urban Infrastructure Management with AI</p>
            
            <div className="difficulty-options">
              <motion.button
                className="difficulty-btn easy"
                onClick={() => startGame('easy')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={loading}
              >
                <h3>Easy</h3>
                <p>$2,000,000</p>
              </motion.button>

              <motion.button
                className="difficulty-btn normal"
                onClick={() => startGame('normal')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={loading}
              >
                <h3>Normal</h3>
                <p>$1,000,000</p>
              </motion.button>

              <motion.button
                className="difficulty-btn hard"
                onClick={() => startGame('hard')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={loading}
              >
                <h3>Hard</h3>
                <p>$500,000</p>
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="app-container game-active">
      {/* Compact HUD */}
      <GameHUD 
        gameState={gameState}
        autoPlay={autoPlay}
        onToggleAutoPlay={toggleAutoPlay}
        onAdvanceTime={advanceTime}
      />

      {/* Hamburger Menu for Tabs */}
      <div className="tab-menu-container">
        <motion.div 
          className="tab-menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </motion.div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="tab-menu-dropdown"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {TABS.map(tab => (
                <div
                  key={tab.id}
                  className={`tab-menu-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => changeTab(tab.id)}
                >
                  <span className="tab-menu-icon">{tab.icon}</span>
                  <span className="tab-menu-name">{tab.name}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tab Content */}
      <div className="tab-content-area">
        <AnimatePresence mode="wait">
          {activeTab === 0 && (
            <motion.div
              key="city"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="tab-panel-full"
            >
              <LayerControls 
                activeLayers={activeLayers}
                onToggleLayer={toggleLayer}
                gameState={gameState}
              />

              <CityView 
                gameState={gameState}
                activeLayers={activeLayers}
                selectedNode={selectedNode}
                onNodeClick={handleNodeClick}
              />

              <AnimatePresence>
                {selectedNode && (
                  <NodePanel 
                    nodeId={selectedNode}
                    gameState={gameState}
                    onAction={handleAction}
                    onClose={() => setSelectedNode(null)}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 1 && (
            <motion.div key="predictions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="tab-panel-full">
              <AIPredictions gameState={gameState} />
            </motion.div>
          )}

          {activeTab === 2 && (
            <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="tab-panel-full">
              <Analytics gameState={gameState} />
            </motion.div>
          )}

          {activeTab === 3 && (
            <motion.div key="comparison" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="tab-panel-full">
              <Comparison gameState={gameState} />
            </motion.div>
          )}

          {activeTab === 4 && (
            <motion.div key="explainability" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="tab-panel-full">
              <Explainability gameState={gameState} />
            </motion.div>
          )}

          {activeTab === 5 && (
            <motion.div key="demo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="tab-panel-full">
              <DemoMode 
                onClose={() => changeTab(0)}
                onTabChange={changeTab}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
