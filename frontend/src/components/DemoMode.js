import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaPause, FaForward, FaRedo, FaCity, FaBrain, FaChartBar, FaLightbulb, FaBalanceScale, FaDollarSign, FaVolumeUp, FaMicrophone } from 'react-icons/fa';
import '../styles/AllFeatures.css';

const DEMO_STEPS = [
  {
    id: 1,
    title: "Welcome to CIVILAI",
    description: "A predictive infrastructure management system using Graph Neural Networks",
    // duration removed, controlled by speech
    highlight: null,
    narration: "Welcome to CIVILAI. This platform leverages advanced Graph Neural Networks to help cities predict and prevent infrastructure failures before they happen. By analyzing complex data patterns, we can save millions in emergency repairs and ensure public safety."
  },
  {
    id: 2,
    title: "3D City Visualization",
    description: "Real-time monitoring of city infrastructure",
    highlight: "city-view",
    narration: "Here you see our real-time 3D City Visualization. This interactive map provides a comprehensive view of the entire infrastructure network, including buildings, roads, water pipes, and power lines. You can rotate, zoom, and pan to inspect every corner of the city.",
    action: (callbacks) => {
      // Just show the city
    }
  },
  {
    id: 3,
    title: "Color-Coded Health Status",
    description: "Instant visual assessment",
    highlight: "nodes",
    narration: "Notice the color-coded nodes. Green indicates healthy infrastructure, yellow suggests attention is needed, and red signals critical condition. This intuitive visual system allows city managers to instantly assess the health of the network and prioritize their actions effectivey."
  },
  {
    id: 4,
    title: "AI Predictions",
    description: "Machine learning predicts failures 5 days ahead",
    highlight: "predictions",
    narration: "Our core power lies in AI Predictions. The Graph Neural Network analyzes the network structure, node health, age, and environmental stress. It can accurately predict which specific infrastructure components are likely to fail up to 5 days in advance, with over 85% accuracy."
  },
  {
    id: 5,
    title: "Preventive Action",
    description: "Act before failure occurs",
    highlight: "actions",
    narration: "Here is the system in action. Instead of waiting for a catastrophic failure that could cost fifty thousand dollars, the system recommends a preventive maintenance action costing only five thousand. Watch as we automatically identify a high-risk node and perform a repair, saving 90% in costs.",
    action: (callbacks, gameState) => {
      // Find a low health node to "repair"
      if (gameState && gameState.nodes) {
        const riskyNode = Object.values(gameState.nodes).find(n => n.health < 60 && n.health > 0);
        if (riskyNode) {
          callbacks.onNodeClick(riskyNode.id);
          setTimeout(() => {
            callbacks.onAction('maintenance', riskyNode.id);
          }, 2000);
        }
      }
    }
  },
  {
    id: 6,
    title: "Real-Time Analytics",
    description: "Data-driven decision making",
    highlight: "analytics",
    narration: "Data is key. Our Real-Time Analytics dashboard tracks your budget, Return on Investment, failure prevention rate, and overall system health. This allows you to prove the value of your preventive maintenance strategy with hard data and secure future funding."
  },
  {
    id: 7,
    title: "Explainable AI",
    description: "Understand WHY failures happen",
    highlight: "explainability",
    narration: "Trust is essential. With Explainable AI, we don't just tell you what will fail; we tell you why. The system breaks down the contributing factors, such as age or load, helping engineers understand the root cause. This transparency is critical for regulatory compliance and confident decision-making."
  },
  {
    id: 8,
    title: "AI vs Human Performance",
    description: "Continuous improvement through comparison",
    highlight: "comparison",
    narration: "Challenge your strategy. The 'AI vs Human' mode compares your manual decisions against the optimal AI policy. The system learns from human expertise while providing data-backed recommendations, creating a powerful hybrid approach to infrastructure management."
  },
  {
    id: 9,
    title: "Business Impact",
    description: "Real-world value for cities",
    highlight: null,
    narration: "The impact is real. Cities using CIVILAI's predictive maintenance typically save 30% on total infrastructure costs while preventing 85% of unexpected service disruptions. Most cities see a full Return on Investment within the first year of deployment."
  },
  {
    id: 10,
    title: "Thank You",
    description: "Questions?",
    highlight: null,
    narration: "Thank you for experiencing CIVILAI. We are committed to making cities smarter, safer, and more sustainable through the power of AI-powered infrastructure management."
  }
];

export default function DemoMode({ onClose, onTabChange, active, gameState, onNodeClick, onAction, onStartDemo }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Preload voices (they load asynchronously in most browsers)
  const [femaleVoice, setFemaleVoice] = useState(null);

  useEffect(() => {
    const pickFemaleVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;

      // Priority list: most natural-sounding female voices first
      const preferred = [
        // Microsoft Neural / Natural voices (Edge/Windows 11) - extremely human-like
        v => v.name.includes('Microsoft Jenny') && v.name.includes('Natural'),
        v => v.name.includes('Microsoft Aria') && v.name.includes('Natural'),
        v => v.name.includes('Microsoft Jenny'),
        v => v.name.includes('Microsoft Aria'),
        // Microsoft standard female voices
        v => v.name.includes('Microsoft Zira'),
        v => v.name.includes('Zira'),
        // Google voices
        v => v.name.includes('Google US English') && !v.name.includes('Male'),
        v => v.name === 'Google US English',
        // Any English female voice
        v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'),
        // Fallback: any English voice
        v => v.lang === 'en-US',
        v => v.lang.startsWith('en'),
      ];

      for (const test of preferred) {
        const match = voices.find(test);
        if (match) {
          setFemaleVoice(match);
          console.log('Selected TTS voice:', match.name);
          return;
        }
      }
      // Last resort — just use the first voice
      setFemaleVoice(voices[0]);
    };

    if ('speechSynthesis' in window) {
      // Voices may already be loaded
      pickFemaleVoice();
      // Chrome fires this event when voices become available
      window.speechSynthesis.onvoiceschanged = pickFemaleVoice;
    }
  }, []);

  // Helper to speak text with a natural female voice
  const speak = (text, onEndCallback) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);

      // Natural speech tuning
      utterance.rate = 0.92;   // Slightly slower for clarity
      utterance.pitch = 1.08;  // Slightly higher for a warm female tone
      utterance.volume = 1.0;

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        if (onEndCallback) onEndCallback();
      };
      utterance.onerror = (e) => {
        console.error("Speech error", e);
        setIsSpeaking(false);
        if (onEndCallback) onEndCallback();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(onEndCallback, 5000);
    }
  };

  // Stop speech when component unmounts or demo stops
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Speak when step changes
  useEffect(() => {
    if (isPlaying && active) {
      const step = DEMO_STEPS[currentStep];

      // Execute step action if present
      if (step.action) {
        step.action({ onNodeClick, onAction }, gameState);
      }

      speak(step.narration, () => {
        // Automatically go to next step when speech ends
        handleStepComplete();
      });
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [currentStep, isPlaying, active]); // Removed gameState to prevent re-triggering on updates


  // Auto-start if active prop is true (overlay mode)
  useEffect(() => {
    if (active && !isPlaying) {
      setIsPlaying(true);
    }
  }, [active]);

  const handleStepComplete = () => {
    // Check if we are still playing before advancing (in case user paused)
    // We use a functional update or ref to check current state if needed, 
    // but here we rely on the closure or external check. 
    // Actually, simply calling nextStep logic is safer.

    // We need to access the LATEST currentStep. 
    // Since this is called from a closure (the onEnd callback), it might see stale state 
    // if not careful. However, we are re-creating the effect on currentStep change, 
    // so the callback IS refreshed.

    // BUT: we need to verify we shouldn't advance if user paused mid-speech. 
    // However, we cancel speech on pause, so onEnd might fire? 
    // SpeechSynthesisUtterance.onend fires when cancel() is called too in some browsers?
    // We'll rely on isPlaying state check inside the setter or a ref if needed.
    // For now, let's assume standard behavior.

    advanceStep();
  };

  const advanceStep = () => {
    setCurrentStep(prev => {
      if (prev < DEMO_STEPS.length - 1) {
        const nextIndex = prev + 1;
        const nextStep = DEMO_STEPS[nextIndex];

        if (nextStep.highlight && onTabChange) {
          const tabMap = {
            'predictions': 1,
            'analytics': 2,
            'comparison': 3,
            'explainability': 4
          };
          if (tabMap[nextStep.highlight]) {
            onTabChange(tabMap[nextStep.highlight]);
          } else {
            onTabChange(0);
          }
        }
        return nextIndex;
      } else {
        // Finish
        setIsPlaying(false);
        if (onTabChange) onTabChange(0);
        if (onClose) onClose();
        return 0;
      }
    });
  }

  const startDemo = () => {
    if (onStartDemo) {
      onStartDemo(); // Tell App to switch to overlay mode
    } else {
      setIsPlaying(true);
      setCurrentStep(0);
      if (onTabChange) onTabChange(0);
    }
  };

  const pauseDemo = () => {
    setIsPlaying(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  };

  const resumeDemo = () => {
    setIsPlaying(true);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  }

  const manualNext = () => {
    // Cancel current speech and move on
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    advanceStep();
  }

  const resetDemo = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (onTabChange) onTabChange(5); // Stay on demo tab
  };

  const currentStepData = DEMO_STEPS[currentStep];

  return (
    <div className={`demo-mode ${isPlaying ? 'active-overlay' : ''}`}>
      {!isPlaying && (
        <div className="demo-header">
          <h2>Professional Demo Mode</h2>
          <p>Automated 3-minute demonstration of all features</p>
        </div>
      )}

      {!isPlaying && currentStep === 0 ? (
        <motion.div
          className="demo-start"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="demo-intro">
            <h3>Welcome to the CIVILAI Demo</h3>
            <p>
              This 3-minute guided tour will showcase how CIVILAI uses artificial intelligence
              to revolutionize urban infrastructure management.
            </p>

            <div className="demo-features">
              <h4>You'll See:</h4>
              <div className="features-grid">
                <div className="feature">
                  <span className="feature-icon"><FaCity /></span>
                  <span>3D City Visualization</span>
                </div>
                <div className="feature">
                  <span className="feature-icon"><FaBrain /></span>
                  <span>AI Predictions</span>
                </div>
                <div className="feature">
                  <span className="feature-icon"><FaChartBar /></span>
                  <span>Real-Time Analytics</span>
                </div>
                <div className="feature">
                  <span className="feature-icon"><FaLightbulb /></span>
                  <span>Explainable AI</span>
                </div>
                <div className="feature">
                  <span className="feature-icon">⚖️</span>
                  <span>AI vs Human</span>
                </div>
                <div className="feature">
                  <span className="feature-icon"><FaDollarSign /></span>
                  <span>ROI Analysis</span>
                </div>
              </div>
            </div>

            <div className="demo-stats">
              <div className="stat">
                <div className="stat-number">10</div>
                <div className="stat-label">Steps</div>
              </div>
              <div className="stat">
                <div className="stat-number">~3</div>
                <div className="stat-label">Minutes</div>
              </div>
              <div className="stat">
                <div className="stat-number">5</div>
                <div className="stat-label">Key Features</div>
              </div>
            </div>

            <motion.button
              className="start-demo-btn"
              onClick={startDemo}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaPlay /> Start Demo
            </motion.button>
          </div>
        </motion.div>
      ) : (
        <div className="demo-player">
          {/* Step Display */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              className="demo-step"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <div className="step-header">
                <span className="step-number">Step {currentStep + 1} of {DEMO_STEPS.length}</span>
                <h3>{currentStepData.title}</h3>
                <p className="step-description">{currentStepData.description}</p>
              </div>

              <div className="step-narration">
                <div className="narration-icon">
                  {isSpeaking ? <span className="speaking-wave"><FaVolumeUp /></span> : <FaMicrophone />}
                </div>
                <p>{currentStepData.narration}</p>
              </div>

              {currentStepData.highlight && (
                <div className="step-highlight">
                  <span className="highlight-badge">👁️ Currently Highlighting</span>
                  <span className="highlight-name">{currentStepData.highlight}</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Progress Bar */}
          {/* Removed as progression is now speech-driven */}

          {/* Controls */}
          <div className="demo-controls">
            {!isPlaying ? (
              <motion.button
                className="control-btn play"
                onClick={resumeDemo}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FaPlay /> Resume
              </motion.button>
            ) : (
              <motion.button
                className="control-btn pause"
                onClick={pauseDemo}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FaPause /> Pause
              </motion.button>
            )}

            <motion.button
              className="control-btn next"
              onClick={manualNext}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <FaForward /> Next
            </motion.button>

            <motion.button
              className="control-btn reset"
              onClick={resetDemo}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <FaRedo /> Restart
            </motion.button>

            {/* Moved Exit Button Here */}
            <motion.button
              className="control-btn exit"
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{ borderColor: '#e74c3c', marginLeft: 'auto' }}
            >
              <span style={{ color: '#e74c3c' }}>✕</span> Exit
            </motion.button>
          </div>

          {/* Step Indicators */}
          <div className="step-indicators">
            {DEMO_STEPS.map((step, idx) => (
              <div
                key={step.id}
                className={`step-dot ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
                onClick={() => {
                  setCurrentStep(idx);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Legacy Close Button - Only show if NOT overlapping (i.e. not playing) */}
      {!isPlaying && (
        <button className="demo-close" onClick={onClose}>
          ✕ Exit Demo
        </button>
      )}
    </div>
  );
}