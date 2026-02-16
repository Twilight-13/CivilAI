import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowRight, FaArrowLeft, FaTimes } from 'react-icons/fa';
import '../styles/Tutorial.css';

const TUTORIAL_STEPS = [
  {
    title: "Welcome to CIVILAI!",
    content: (
      <div>
        <h2>🏙️ Manage Your City's Infrastructure</h2>
        <p>
          You are the <strong>City Systems Manager</strong>. Your mission is to keep the city's 
          infrastructure running smoothly while managing a limited budget.
        </p>
        <div className="highlight-box">
          <h4>Your Goal:</h4>
          <ul>
            <li>✅ Prevent infrastructure failures</li>
            <li>✅ Keep the city healthy</li>
            <li>✅ Maximize your score</li>
            <li>✅ Don't run out of money!</li>
          </ul>
        </div>
      </div>
    ),
    image: "🏙️"
  },
  {
    title: "Understanding the City",
    content: (
      <div>
        <h2>🏗️ What You're Managing</h2>
        <p>Your city has 4 infrastructure layers:</p>
        <div className="layers-showcase">
          <div className="layer-card water">
            <span className="layer-emoji">💧</span>
            <h4>Water System</h4>
            <p>Pipes and distribution network</p>
          </div>
          <div className="layer-card power">
            <span className="layer-emoji">⚡</span>
            <h4>Power Grid</h4>
            <p>Electrical transformers and lines</p>
          </div>
          <div className="layer-card road">
            <span className="layer-emoji">🚗</span>
            <h4>Transportation</h4>
            <p>Roads, bridges, intersections</p>
          </div>
          <div className="layer-card drainage">
            <span className="layer-emoji">🌊</span>
            <h4>Drainage</h4>
            <p>Sewage and stormwater systems</p>
          </div>
        </div>
        <p className="tip">
          💡 <strong>Tip:</strong> Click the layer controls on the right to show/hide 
          specific infrastructure types!
        </p>
      </div>
    ),
    image: "🏗️"
  },
  {
    title: "How Infrastructure Works",
    content: (
      <div>
        <h2>⚙️ The Health System</h2>
        <p>Every infrastructure node has a <strong>health percentage</strong>:</p>
        
        <div className="health-examples">
          <div className="health-example healthy">
            <div className="health-dot"></div>
            <div className="health-text">
              <strong>60-100%</strong> = Healthy (Green)
              <p>Everything working fine</p>
            </div>
          </div>
          <div className="health-example warning">
            <div className="health-dot"></div>
            <div className="health-text">
              <strong>30-60%</strong> = Warning (Yellow)
              <p>Needs attention soon</p>
            </div>
          </div>
          <div className="health-example critical">
            <div className="health-dot"></div>
            <div className="health-text">
              <strong>0-30%</strong> = Critical (Red)
              <p>Will fail very soon!</p>
            </div>
          </div>
        </div>

        <div className="warning-box" style={{ marginTop: '25px' }}>
          <h4>⚠️ What Happens When Nodes Fail?</h4>
          <ul>
            <li>💸 You lose <strong>$50,000</strong> per failure</li>
            <li>⚡ Connected nodes get stressed</li>
            <li>🔗 <strong>Cascading failures</strong> can happen!</li>
            <li>📉 Your score decreases</li>
          </ul>
        </div>
      </div>
    ),
    image: "⚙️"
  },
  {
    title: "Taking Actions",
    content: (
      <div>
        <h2>🛠️ How to Maintain Infrastructure</h2>
        <p>Click on any node (colored sphere) in the 3D view to inspect it.</p>
        
        <div className="actions-showcase">
          <div className="action-item">
            <span className="action-icon">🔍</span>
            <div className="action-text">
              <h4>Inspect (FREE)</h4>
              <p>View detailed information about any node</p>
            </div>
          </div>
          
          <div className="action-item">
            <span className="action-icon">🔧</span>
            <div className="action-text">
              <h4>Repair ($5,000)</h4>
              <p>Restore 30% health</p>
              <span className="action-use">Good for: Regular maintenance</span>
            </div>
          </div>
          
          <div className="action-item">
            <span className="action-icon">🏗️</span>
            <div className="action-text">
              <h4>Major Upgrade ($20,000)</h4>
              <p>Full restoration + reduce age</p>
              <span className="action-use">Good for: Critical infrastructure</span>
            </div>
          </div>
          
          <div className="action-item">
            <span className="action-icon">🚨</span>
            <div className="action-text">
              <h4>Emergency Fix ($10,000)</h4>
              <p>Restore 50% health quickly</p>
              <span className="action-use">Good for: Preventing failures</span>
            </div>
          </div>
        </div>

        <p className="tip">
          💡 <strong>Strategy Tip:</strong> It's cheaper to maintain regularly than 
          to wait for failures!
        </p>
      </div>
    ),
    image: "🛠️"
  },
  {
    title: "Time and Budget",
    content: (
      <div>
        <h2>⏰ How Time Works</h2>
        
        <div className="time-explanation">
          <div className="time-step">
            <h4>Each Day:</h4>
            <ul>
              <li>🔻 All nodes degrade slightly</li>
              <li>💰 You earn <strong>budget</strong> (varies by difficulty)</li>
              <li>⚠️ Failures may occur</li>
              <li>📊 Statistics update</li>
            </ul>
          </div>

          <div className="time-controls-info">
            <h4>Time Controls (Top Right):</h4>
            <div className="control-item">
              <span className="control-icon">▶️</span>
              <p><strong>Auto-Play:</strong> Time advances automatically every 2 seconds</p>
            </div>
            <div className="control-item">
              <span className="control-icon">⏩</span>
              <p><strong>Advance:</strong> Manually move to the next day</p>
            </div>
          </div>
        </div>

        <div className="budget-tips">
          <h4>💰 Budget Management:</h4>
          <ul>
            <li>You start with different budgets based on difficulty</li>
            <li>Earn income each day</li>
            <li>Don't run out! Game over if budget hits $0</li>
            <li>Balance preventive maintenance vs emergency fixes</li>
          </ul>
        </div>
      </div>
    ),
    image: "⏰"
  },
  {
    title: "3D Navigation",
    content: (
      <div>
        <h2>🖱️ Controlling the Camera</h2>
        
        <div className="controls-guide">
          <div className="control-row">
            <div className="control-visual">🖱️ Left Click + Drag</div>
            <div className="control-description">Rotate the camera around the city</div>
          </div>
          
          <div className="control-row">
            <div className="control-visual">🖱️ Right Click + Drag</div>
            <div className="control-description">Pan/move the view</div>
          </div>
          
          <div className="control-row">
            <div className="control-visual">🖱️ Scroll Wheel</div>
            <div className="control-description">Zoom in and out</div>
          </div>
          
          <div className="control-row">
            <div className="control-visual">🖱️ Click on Sphere</div>
            <div className="control-description">Select and inspect a node</div>
          </div>
        </div>

        <div className="visual-hints">
          <h4>🎨 Visual Cues:</h4>
          <ul>
            <li>🟢 <strong>Green spheres</strong> = Healthy infrastructure</li>
            <li>🟡 <strong>Yellow spheres</strong> = Warning status</li>
            <li>🔴 <strong>Red spheres</strong> = Critical, needs immediate action</li>
            <li>🔺 <strong>Red cone above</strong> = Critical infrastructure node</li>
            <li>✨ <strong>Pulsing</strong> = Node health below 30%</li>
            <li>📏 <strong>Lines</strong> = Connections between nodes</li>
          </ul>
        </div>
      </div>
    ),
    image: "🖱️"
  },
  {
    title: "Strategy Tips",
    content: (
      <div>
        <h2>🎯 Pro Tips for Success</h2>
        
        <div className="tips-grid">
          <div className="tip-card">
            <h4>1️⃣ Inspect First</h4>
            <p>Always inspect nodes before spending money. Inspection is free!</p>
          </div>
          
          <div className="tip-card">
            <h4>2️⃣ Prioritize Critical Nodes</h4>
            <p>Nodes with a red cone are critical. Their failure affects more buildings.</p>
          </div>
          
          <div className="tip-card">
            <h4>3️⃣ Watch for Cascades</h4>
            <p>Nodes with many connections can cause chain reactions. Monitor them closely.</p>
          </div>
          
          <div className="tip-card">
            <h4>4️⃣ Prevent, Don't React</h4>
            <p>A $5,000 repair is cheaper than a $50,000 failure + cascade costs!</p>
          </div>
          
          <div className="tip-card">
            <h4>5️⃣ Use Layers Wisely</h4>
            <p>Toggle layers to focus on one infrastructure type at a time.</p>
          </div>
          
          <div className="tip-card">
            <h4>6️⃣ Track Your Budget</h4>
            <p>Keep an eye on the budget. Plan your actions based on income.</p>
          </div>
        </div>

        <div className="final-message">
          <h3>🚀 You're Ready!</h3>
          <p>
            Remember: There's no perfect strategy. Learn from failures, 
            adapt your approach, and most importantly — have fun managing your city!
          </p>
        </div>
      </div>
    ),
    image: "🎯"
  }
];

export default function Tutorial({ onStart, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const startGame = (difficulty) => {
    onStart(difficulty);
  };

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  return (
    <motion.div 
      className="tutorial-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="tutorial-modal"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
      >
        <button className="tutorial-skip" onClick={onSkip}>
          <FaTimes /> Skip Tutorial
        </button>

        <div className="tutorial-header">
          <span className="tutorial-emoji">{step.image}</span>
          <h1>{step.title}</h1>
          <div className="step-indicator">
            Step {currentStep + 1} of {TUTORIAL_STEPS.length}
          </div>
        </div>

        <div className="tutorial-content">
          {step.content}
        </div>

        <div className="tutorial-footer">
          <div className="progress-dots">
            {TUTORIAL_STEPS.map((_, idx) => (
              <div 
                key={idx}
                className={`progress-dot ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
                onClick={() => setCurrentStep(idx)}
              />
            ))}
          </div>

          <div className="tutorial-navigation">
            <button 
              className="nav-btn prev"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <FaArrowLeft /> Previous
            </button>

            {!isLastStep && (
              <button 
                className="nav-btn next"
                onClick={nextStep}
              >
                Next <FaArrowRight />
              </button>
            )}

            {isLastStep && (
              <div className="start-buttons">
                <button 
                  className="start-btn easy"
                  onClick={() => startGame('easy')}
                >
                  Start Easy Mode
                </button>
                <button 
                  className="start-btn normal"
                  onClick={() => startGame('normal')}
                >
                  Start Normal Mode
                </button>
                <button 
                  className="start-btn hard"
                  onClick={() => startGame('hard')}
                >
                  Start Hard Mode
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
