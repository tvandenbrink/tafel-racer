import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Sky, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import Car from "./Car.jsx";
import ObstacleCar from "./ObstacleCar.jsx";

// --- Constants ---
const CAR_SPEED = 0.05;
const OBSTACLE_INTERVAL = 3000;
const INVINCIBILITY_TIME = 2000;
const COUNTDOWN_START = 3;
const BLOCK_START_Z = -100; // Changed from -60 to -100 (spawn at top of screen)
const LANES_MIN = 2;
const LANES_MAX = 10;
const ROAD_COLOR = "#777";
const REPEAT_AFTER_QUESTIONS = 5; // Repeat incorrect answers after this many questions
const CAR_LENGTH = 2.4; // Length of a car for spacing calculations
const GATE_PROTECTION_DISTANCE = CAR_LENGTH * 3; // 3 car lengths protection

// --- Styles ---
const HUD_STYLE = {
  position: "absolute",
  top: 20,
  left: 20,
  background: "rgba(0,0,0,0.78)",
  color: "#fff",
  fontSize: 22,
  borderRadius: 7,
  padding: "10px 18px",
  zIndex: 10,
  fontWeight: 600,
};

const SOM_STYLE = {
  position: "absolute",
  top: 50, // Moved up from 80 to position above road start
  left: "50%",
  transform: "translateX(-50%)",
  background: "#fff",
  color: "#000",
  fontSize: "clamp(24px, 5vw, 48px)", // Responsive font size
  border: "4px solid #ff4141",
  borderRadius: 12,
  padding: "12px 30px", // Slightly reduced padding for mobile
  fontWeight: 700,
  zIndex: 10,
  boxShadow: "0 2px 16px #0002",
  maxWidth: "90vw", // Prevent overflow on small screens
  textAlign: "center",
};

const ANSWER_LABEL_STYLE = {
  background: "#fff",
  color: "#000",
  fontWeight: 700,
  fontSize: 216, // Reduced from 240 (10% smaller)
  borderRadius: 8,
  padding: "6px 18px",
  border: "2px solid #222",
  boxShadow: "0 2px 8px #0002",
  pointerEvents: "none",
};

// --- Local Storage Functions ---
const getHighScore = (player = 'Floris') => {
  return parseInt(localStorage.getItem(`tafelRaceHighScore_${player}`) || '0');
};

const setHighScore = (score, player = 'Floris') => {
  localStorage.setItem(`tafelRaceHighScore_${player}`, score.toString());
};

const getIncorrectAnswers = (player = 'Floris') => {
  const stored = localStorage.getItem(`tafelRaceIncorrectAnswers_${player}`);
  return stored ? JSON.parse(stored) : [];
};

const addIncorrectAnswer = (question, correctAnswer, givenAnswer, player = 'Floris') => {
  const incorrectAnswers = getIncorrectAnswers(player);
  const newEntry = {
    question,
    correctAnswer,
    givenAnswer,
    timestamp: Date.now(),
    id: Math.random().toString(36).slice(2)
  };
  
  incorrectAnswers.unshift(newEntry); // Add to beginning
  
  // Keep only last 10
  if (incorrectAnswers.length > 10) {
    incorrectAnswers.splice(10);
  }
  
  localStorage.setItem(`tafelRaceIncorrectAnswers_${player}`, JSON.stringify(incorrectAnswers));
};

const getPendingRepeats = (player = 'Floris') => {
  const stored = localStorage.getItem(`tafelRacePendingRepeats_${player}`);
  return stored ? JSON.parse(stored) : [];
};

const addPendingRepeat = (question, correctAnswer, player = 'Floris') => {
  const pendingRepeats = getPendingRepeats(player);
  const newRepeat = {
    question,
    correctAnswer,
    addedAt: Date.now(),
    id: Math.random().toString(36).slice(2)
  };
  
  pendingRepeats.push(newRepeat);
  localStorage.setItem(`tafelRacePendingRepeats_${player}`, JSON.stringify(pendingRepeats));
};

const removePendingRepeat = (id, player = 'Floris') => {
  const pendingRepeats = getPendingRepeats(player);
  const filtered = pendingRepeats.filter(repeat => repeat.id !== id);
  localStorage.setItem(`tafelRacePendingRepeats_${player}`, JSON.stringify(filtered));
};

// Add new statistics functions
const getStatistics = (player = 'Floris') => {
  const stored = localStorage.getItem(`tafelRaceStatistics_${player}`);
  return stored ? JSON.parse(stored) : {};
};

const updateStatistics = (question, isCorrect, player = 'Floris') => {
  const stats = getStatistics(player);
  
  if (!stats[question]) {
    stats[question] = { attempts: 0, mistakes: 0 };
  }
  
  stats[question].attempts++;
  if (!isCorrect) {
    stats[question].mistakes++;
  }
  
  localStorage.setItem(`tafelRaceStatistics_${player}`, JSON.stringify(stats));
};

const resetStatistics = (player = 'Floris') => {
  localStorage.removeItem(`tafelRaceStatistics_${player}`);
  localStorage.removeItem(`tafelRaceIncorrectAnswers_${player}`);
  localStorage.removeItem(`tafelRacePendingRepeats_${player}`);
};

// --- Utility: Generate question ---
function generateQuestion(lanes, questionsAnswered = 0, pendingRepeats = []) {
  // Check if we should repeat an incorrect answer
  if (pendingRepeats.length > 0 && questionsAnswered > 0 && questionsAnswered % REPEAT_AFTER_QUESTIONS === 0) {
    const repeatQuestion = pendingRepeats[0];
    const correct = repeatQuestion.correctAnswer;
    let options = [correct];
    
    // Generate other options based on the table from the question
    const questionParts = repeatQuestion.question.split(' × ');
    if (questionParts.length === 2) {
      const table = parseInt(questionParts[0]);
      while (options.length < lanes) {
        let opt = table * (Math.floor(Math.random() * 10) + 1);
        if (!options.includes(opt)) options.push(opt);
      }
    } else {
      // Fallback if question format is unexpected
      while (options.length < lanes) {
        let opt = Math.floor(Math.random() * 100) + 1;
        if (!options.includes(opt)) options.push(opt);
      }
    }
    
    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    
    return [repeatQuestion.question, correct, options, repeatQuestion.id];
  }
  
  // Generate new question
  const table = Math.floor(Math.random() * 10) + 1;
  const multiplier = Math.floor(Math.random() * 10) + 1;
  const correct = table * multiplier;
  let options = [correct];
  
  while (options.length < lanes) {
    let opt = table * (Math.floor(Math.random() * 10) + 1);
    if (!options.includes(opt)) options.push(opt);
  }
  
  // Shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  
  return [`${table} × ${multiplier}`, correct, options, null];
}

// --- Main Game Component ---
function TafelRaceGame() {
  // --- State ---
  const [phase, setPhase] = useState("init");
  const [currentPlayer, setCurrentPlayer] = useState('Floris');
  
  // Detect mobile device (portrait orientation) and set default lanes accordingly
  const [lanes, setLanes] = useState(() => {
    const isMobile = window.innerWidth < window.innerHeight;
    return isMobile ? 4 : 6;
  });
  
  const [carSpeed, setCarSpeed] = useState(150); // Changed from 50 to 150
  const [gateInterval, setGateInterval] = useState(0); // Changed from 4 to 0
  const [score, setScore] = useState(0);
  const [highScore, setHighScoreState] = useState(getHighScore('Floris'));
  const [lives, setLives] = useState(3);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentCorrect, setCurrentCorrect] = useState(null);
  const [currentRepeatId, setCurrentRepeatId] = useState(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [carLane, setCarLane] = useState(0);
  const [answerBlocks, setAnswerBlocks] = useState([]);
  const [obstacles, setObstacles] = useState([]);
  const [invincible, setInvincible] = useState(false);
  const [invStart, setInvStart] = useState(0);
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [showGameOver, setShowGameOver] = useState(false);
  const [lastGateTime, setLastGateTime] = useState(0);
  const [bufferActive, setBufferActive] = useState(false);
  const [speedBoost, setSpeedBoost] = useState(false);
  const [incorrectAnswers, setIncorrectAnswers] = useState(getIncorrectAnswers('Floris'));
  const [pendingRepeats, setPendingRepeats] = useState(getPendingRepeats('Floris'));
  const [redFlash, setRedFlash] = useState(false);
  const [greenFlash, setGreenFlash] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [correctAnswerDisplay, setCorrectAnswerDisplay] = useState({ question: '', answer: '' });

  // Calculate dynamic values
  const actualCarSpeed = (carSpeed / 1000) * (speedBoost ? 4 : 1); // Changed from 2 to 4
  const blockStartZ = BLOCK_START_Z;
  const gateIntervalMs = gateInterval * 1000;
  const bufferTime = 2000;

  // --- Handlers ---
  const startGame = useCallback(() => {
    setScore(0);
    setLives(3);
    setCarLane(0);
    setObstacles([]);
    setAnswerBlocks([]);
    setShowGameOver(false);
    setCountdown(COUNTDOWN_START);
    setQuestionsAnswered(0);
    setPhase("countdown");
    // Refresh pending repeats from storage for current player
    setPendingRepeats(getPendingRepeats(currentPlayer));
  }, [currentPlayer]);

  const backToSettings = useCallback(() => {
    setPhase("init");
    setShowGameOver(false);
  }, []);

  // Update score and check for high score
  const updateScore = useCallback((newScore) => {
    setScore(newScore);
    const currentHighScore = getHighScore(currentPlayer);
    if (newScore > currentHighScore) {
      setHighScoreState(newScore);
      setHighScore(newScore, currentPlayer);
    }
  }, [currentPlayer]);

  // Handle player change
  const handlePlayerChange = useCallback((newPlayer) => {
    setCurrentPlayer(newPlayer);
    setHighScoreState(getHighScore(newPlayer));
    setIncorrectAnswers(getIncorrectAnswers(newPlayer));
    setPendingRepeats(getPendingRepeats(newPlayer));
  }, []);

  const goToStatistics = useCallback(() => {
    setPhase("statistics");
  }, []);

  // --- Countdown effect ---
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown === 0) {
      setPhase("play");
      // Spawn first question
      const [q, c, opts, repeatId] = generateQuestion(lanes, questionsAnswered, getPendingRepeats(currentPlayer));
      setCurrentQuestion(q);
      setCurrentCorrect(c);
      setCurrentRepeatId(repeatId);
      setAnswerBlocks(
        opts.map((opt, i) => ({
          lane: i,
          z: BLOCK_START_Z,
          value: opt,
          id: Math.random().toString(36).slice(2),
          questionId: Date.now().toString(),
        }))
      );
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, lanes, questionsAnswered, currentPlayer]);

  // --- Keyboard controls ---
  useEffect(() => {
    if (phase !== "play") return;
    
    const onKeyDown = (e) => {
      if (e.key === "ArrowLeft") setCarLane((l) => Math.max(l - 1, 0));
      if (e.key === "ArrowRight") setCarLane((l) => Math.min(l + 1, lanes - 1));
      if (e.key === "ArrowUp") setSpeedBoost(true);
    };
    
    const onKeyUp = (e) => {
      if (e.key === "ArrowUp") setSpeedBoost(false);
    };
    
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [phase, lanes]);

  // --- Lane positions ---
  const laneX = (lane) => (lane - (lanes - 1) / 2) * 2.5; // Increased spacing from 2 to 2.5

  // Add lane button handler
  const handleLaneClick = useCallback((targetLane) => {
    if (phase === "play") {
      setCarLane(targetLane);
    }
  }, [phase]);

  // --- Render ---
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#7ecbff" }}>
      {/* Red flash overlay for life loss */}
      {redFlash && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(255, 0, 0, 0.6)",
          zIndex: 50,
          pointerEvents: "none",
        }} />
      )}

      {/* Green flash overlay for correct answer */}
      {greenFlash && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0, 255, 0, 0.4)",
          zIndex: 50,
          pointerEvents: "none",
        }} />
      )}

      {/* Correct answer display for wrong answers */}
      {showCorrectAnswer && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0, 0, 0, 0.8)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 60,
          pointerEvents: "none",
        }}>
          <div style={{ fontSize: 60, fontWeight: 700, marginBottom: 20 }}>
            {correctAnswerDisplay.question}
          </div>
          <div style={{ fontSize: 80, fontWeight: 900, color: "#4CAF50" }}>
            = {correctAnswerDisplay.answer}
          </div>
        </div>
      )}
      
      {/* HUD */}
      <div style={{
        ...HUD_STYLE,
        fontSize: "clamp(14px, 3vw, 22px)", // Responsive font size
        padding: "8px 16px", // Slightly reduced padding for mobile
      }}>
        Speler: {currentPlayer} &nbsp;|&nbsp; Score: {score} &nbsp;|&nbsp; Lives: {lives}
        <br />
        High Score: {highScore}
      </div>
      
      {/* Show current question at top of screen above the road */}
      {phase === "play" && currentQuestion && answerBlocks.length > 0 && (
        <div style={SOM_STYLE}>
          {currentQuestion}
        </div>
      )}

      {/* Lane Control Buttons for Tablet/Touch Support */}
      {phase === "play" && answerBlocks.length > 0 && (
        <>
          {/* Show current question above the buttons */}
          <div style={{
            position: "absolute",
            bottom: "clamp(100px, 16vh, 140px)", // Position above the buttons
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0, 0, 0, 0.8)",
            color: "#fff",
            fontSize: "clamp(18px, 4vw, 32px)", // Responsive font size
            fontWeight: "700",
            padding: "8px 16px",
            borderRadius: 8,
            zIndex: 15,
            textAlign: "center",
            border: "2px solid #ff4141",
          }}>
            {currentQuestion}
          </div>
          
          {/* Lane buttons with answer values */}
          <div style={{
            position: "absolute",
            bottom: "clamp(20px, 4vh, 40px)", // Responsive bottom spacing
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "clamp(4px, 1vw, 8px)", // Responsive gap
            zIndex: 15,
            padding: "8px",
            background: "rgba(0, 0, 0, 0.3)",
            borderRadius: 12,
            backdropFilter: "blur(5px)",
            maxWidth: "95vw", // Prevent overflow
            overflowX: "auto", // Allow horizontal scrolling if needed
          }}>
            {answerBlocks.map((block, index) => (
              <button
                key={block.id}
                onClick={() => handleLaneClick(block.lane)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleLaneClick(block.lane);
                }}
                style={{
                  width: "clamp(50px, 10vw, 70px)", // Slightly wider for answer values
                  height: "clamp(50px, 10vw, 70px)", // Slightly taller for answer values
                  borderRadius: "10px",
                  border: carLane === block.lane ? "3px solid #ff4141" : "2px solid #fff",
                  background: carLane === block.lane ? "#ff4141" : "rgba(255, 255, 255, 0.9)",
                  color: carLane === block.lane ? "#fff" : "#000",
                  fontSize: "clamp(14px, 3vw, 20px)", // Responsive font for answer values
                  fontWeight: "900",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  userSelect: "none",
                  touchAction: "manipulation",
                  boxShadow: carLane === block.lane 
                    ? "0 3px 10px rgba(255, 65, 65, 0.4)" 
                    : "0 2px 6px rgba(0, 0, 0, 0.2)",
                  transform: carLane === block.lane ? "scale(1.05)" : "scale(1)",
                  flexShrink: 0, // Prevent shrinking in flexbox
                }}
              >
                {block.value}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Speed Boost Button for Touch Devices */}
      {phase === "play" && (
        <div style={{
          position: "absolute",
          bottom: "clamp(80px, 12vh, 120px)", // Responsive positioning
          right: "clamp(15px, 3vw, 25px)",
          zIndex: 15,
        }}>
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              setSpeedBoost(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              setSpeedBoost(false);
            }}
            onMouseDown={() => setSpeedBoost(true)}
            onMouseUp={() => setSpeedBoost(false)}
            onMouseLeave={() => setSpeedBoost(false)}
            style={{
              width: "clamp(60px, 12vw, 80px)", // Responsive size
              height: "clamp(60px, 12vw, 80px)",
              borderRadius: "50%",
              border: "3px solid #fff",
              background: speedBoost 
                ? "linear-gradient(135deg, #ff6b6b, #ee5a52)" 
                : "rgba(255, 255, 255, 0.8)",
              color: speedBoost ? "#fff" : "#000",
              fontSize: "clamp(12px, 2.5vw, 16px)", // Responsive font
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              userSelect: "none",
              touchAction: "manipulation",
              boxShadow: speedBoost 
                ? "0 4px 15px rgba(255, 107, 107, 0.4)" 
                : "0 3px 10px rgba(0, 0, 0, 0.2)",
              transform: speedBoost ? "scale(1.05)" : "scale(1)",
            }}
          >
            <div style={{ fontSize: "clamp(18px, 4vw, 24px)", marginBottom: "2px" }}>🚀</div>
            <div style={{ fontSize: "clamp(8px, 2vw, 12px)" }}>BOOST</div>
          </button>
        </div>
      )}

      {/* Countdown overlay */}
      {phase === "countdown" && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          fontSize: 90,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 20,
          fontWeight: 900,
        }}>
          {countdown > 0 ? countdown : "GO!"}
        </div>
      )}
      
      {/* Game Over overlay */}
      {showGameOver && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.7)",
          color: "#fff",
          fontSize: 48,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 30,
        }}>
          <div style={{ marginBottom: 30 }}>Game Over</div>
          <div style={{ fontSize: 32, marginBottom: 10 }}>Score: {score}</div>
          <div style={{ fontSize: 24, marginBottom: 30, color: "#ffd700" }}>
            High Score: {highScore}
          </div>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              style={{
                fontSize: 28,
                padding: "12px 40px",
                borderRadius: 10,
                border: "none",
                background: "#ff4141",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
                touchAction: "manipulation",
              }}
              onClick={startGame}
            >
              Opnieuw
            </button>
            <button
              style={{
                fontSize: 28,
                padding: "12px 40px",
                borderRadius: 10,
                border: "none",
                background: "#666",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
                touchAction: "manipulation",
              }}
              onClick={backToSettings}
            >
              Instellingen
            </button>
          </div>
        </div>
      )}
      
      {/* Statistics page */}
      {phase === "statistics" && (
        <StatisticsPage 
          currentPlayer={currentPlayer}
          onBack={() => setPhase("init")}
        />
      )}
      
      {/* Settings page */}
      {phase === "init" && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.7)",
          color: "#fff",
          fontSize: "clamp(20px, 4vw, 32px)", // Responsive font
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          zIndex: 40,
          padding: "clamp(10px, 3vw, 20px)", // Responsive padding
          overflowY: "auto",
        }}>
          <div style={{ 
            marginBottom: "clamp(20px, 5vh, 40px)",
            fontSize: "clamp(24px, 6vw, 40px)",
          }}>
            Tafel Race Game
          </div>
          
          {/* Player Selection */}
          <div style={{ 
            fontSize: "clamp(18px, 4vw, 28px)", 
            marginBottom: "clamp(15px, 4vh, 30px)", 
            textAlign: "center" 
          }}>
            <div style={{ marginBottom: 15 }}>Kies speler:</div>
            <div style={{ 
              display: "flex", 
              gap: "clamp(10px, 3vw, 20px)", 
              justifyContent: "center", 
              flexWrap: "wrap" 
            }}>
              <button
                style={{
                  fontSize: "clamp(16px, 3.5vw, 24px)",
                  padding: "clamp(8px, 2vw, 12px) clamp(15px, 4vw, 30px)",
                  borderRadius: 10,
                  border: "3px solid #ff4141",
                  background: currentPlayer === 'Floris' ? "#ff4141" : "transparent",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  touchAction: "manipulation",
                }}
                onClick={() => handlePlayerChange('Floris')}
              >
                👦 Floris
              </button>
              <button
                style={{
                  fontSize: "clamp(16px, 3.5vw, 24px)",
                  padding: "clamp(8px, 2vw, 12px) clamp(15px, 4vw, 30px)",
                  borderRadius: 10,
                  border: "3px solid #ff4141",
                  background: currentPlayer === 'Esmee' ? "#ff4141" : "transparent",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  touchAction: "manipulation",
                }}
                onClick={() => handlePlayerChange('Esmee')}
              >
                👧 Esmee
              </button>
              <button
                style={{
                  fontSize: "clamp(16px, 3.5vw, 24px)",
                  padding: "clamp(8px, 2vw, 12px) clamp(15px, 4vw, 30px)",
                  borderRadius: 10,
                  border: "3px solid #ff4141",
                  background: currentPlayer === 'Tim' ? "#ff4141" : "transparent",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  touchAction: "manipulation",
                }}
                onClick={() => handlePlayerChange('Tim')}
              >
                👨‍🦳 Tim
              </button>
            </div>
          </div>
          
          <div style={{ 
            fontSize: "clamp(14px, 3vw, 22px)", 
            marginBottom: "clamp(10px, 2vh, 20px)",
            textAlign: "center",
          }}>
            Aantal rijstroken: {lanes}
            <input
              type="range"
              min={LANES_MIN}
              max={LANES_MAX}
              value={lanes}
              onChange={e => setLanes(+e.target.value)}
              style={{ 
                marginLeft: 12, 
                width: "clamp(100px, 25vw, 150px)" // Responsive slider width
              }}
            />
          </div>
          
          <div style={{ 
            fontSize: "clamp(14px, 3vw, 22px)", 
            marginBottom: "clamp(10px, 2vh, 20px)",
            textAlign: "center",
          }}>
            Snelheid: {carSpeed}
            <input
              type="range"
              min={20}
              max={200}
              value={carSpeed}
              onChange={e => setCarSpeed(+e.target.value)}
              style={{ 
                marginLeft: 12, 
                width: "clamp(100px, 25vw, 150px)"
              }}
            />
          </div>
          
          <div style={{ 
            fontSize: "clamp(14px, 3vw, 22px)", 
            marginBottom: "clamp(15px, 3vh, 30px)",
            textAlign: "center",
          }}>
            Poorten interval: {gateInterval}s
            <input
              type="range"
              min={2}
              max={8}
              value={gateInterval}
              onChange={e => setGateInterval(+e.target.value)}
              style={{ 
                marginLeft: 12, 
                width: "clamp(100px, 25vw, 150px)"
              }}
            />
          </div>
          
          <button
            style={{
              fontSize: "clamp(18px, 4vw, 28px)",
              padding: "clamp(8px, 2vh, 12px) clamp(20px, 5vw, 40px)",
              borderRadius: 10,
              border: "none",
              background: "#ff4141",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: "clamp(10px, 2vh, 20px)",
              touchAction: "manipulation",
            }}
            onClick={startGame}
          >
            Start ({currentPlayer})
          </button>

          <button
            style={{
              fontSize: "clamp(16px, 3.5vw, 24px)",
              padding: "clamp(6px, 1.5vh, 10px) clamp(15px, 4vw, 30px)",
              borderRadius: 10,
              border: "2px solid #4CAF50",
              background: "transparent",
              color: "#4CAF50",
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: "clamp(20px, 4vh, 40px)",
              touchAction: "manipulation",
            }}
            onClick={goToStatistics}
          >
            📊 Statistieken ({currentPlayer})
          </button>

          {/* High Score Display */}
          <div style={{ 
            fontSize: "clamp(16px, 3.5vw, 24px)", 
            marginBottom: "clamp(15px, 3vh, 30px)",
            color: "#ffd700",
            textAlign: "center"
          }}>
            🏆 {currentPlayer}'s High Score: {highScore}
          </div>

          {/* Recent Incorrect Answers */}
          {incorrectAnswers.length > 0 && (
            <div style={{
              background: "rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "clamp(10px, 3vw, 20px)",
              maxWidth: "clamp(300px, 80vw, 600px)", // Responsive width
              width: "100%",
            }}>
              <h3 style={{ 
                fontSize: "clamp(14px, 3vw, 20px)", 
                marginBottom: 15, 
                color: "#ff6b6b",
                textAlign: "center" 
              }}>
                {currentPlayer}'s Fouten (Laatste 10)
              </h3>
              
              <div style={{ 
                maxHeight: "clamp(200px, 30vh, 300px)", // Responsive height
                overflowY: "auto",
                fontSize: "clamp(12px, 2.5vw, 16px)",
              }}>
                {incorrectAnswers.map((answer, index) => (
                  <div key={answer.id} style={{
                    background: "rgba(255,255,255,0.05)",
                    margin: "5px 0",
                    padding: "8px",
                    borderRadius: 5,
                    borderLeft: "3px solid #ff6b6b",
                  }}>
                    <div style={{ fontWeight: "bold" }}>
                      {answer.question} = {answer.correctAnswer}
                    </div>
                    <div style={{ 
                      fontSize: "clamp(10px, 2vw, 14px)", 
                      color: "#ffcccc",
                      marginTop: 2 
                    }}>
                      Jouw antwoord: {answer.givenAnswer} | {new Date(answer.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Repeats Info */}
          {pendingRepeats.length > 0 && (
            <div style={{
              background: "rgba(255,165,0,0.2)",
              borderRadius: 10,
              padding: "clamp(8px, 2vw, 15px)",
              marginTop: "clamp(10px, 2vh, 20px)",
              maxWidth: "clamp(300px, 80vw, 600px)",
              width: "100%",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "clamp(12px, 2.5vw, 16px)", color: "#ffa500" }}>
                📝 {pendingRepeats.length} vraag{pendingRepeats.length !== 1 ? 'en' : ''} worden herhaald voor {currentPlayer}
              </div>
              <div style={{ fontSize: "clamp(10px, 2vw, 14px)", color: "#ffcc99", marginTop: 5 }}>
                Foutieve antwoorden komen terug na elke {REPEAT_AFTER_QUESTIONS} vragen
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 4.2, 12], fov: 60 }} style={{ width: "100vw", height: "100vh" }}>
        <Sky sunPosition={[100, 20, 100]} turbidity={8} distance={450} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[0, 20, 10]} intensity={0.7} />
        <OrbitControls enableZoom={false} enableRotate={false} />
        <Road lanes={lanes} />
        <Car
          lane={carLane}
          laneX={laneX}
          lanes={lanes}
          invincible={invincible}
        />
        {answerBlocks.map((b) => (
          <AnswerBlock
            key={b.id}
            lane={b.lane}
            laneX={laneX}
            z={b.z}
            value={b.value}
            carLane={carLane}
          />
        ))}
        {obstacles.map((o) => (
          <ObstacleCar
            key={o.id}
            lane={o.lane}
            laneX={laneX}
            z={o.z}
            colorIndex={o.colorIndex}
          />
        ))}
        <GameLogic
          phase={phase}
          carLane={carLane}
          answerBlocks={answerBlocks}
          setAnswerBlocks={setAnswerBlocks}
          obstacles={obstacles}
          setObstacles={setObstacles}
          invincible={invincible}
          setInvincible={setInvincible}
          setInvStart={setInvStart}
          invStart={invStart}
          currentQuestion={currentQuestion}
          setCurrentQuestion={setCurrentQuestion}
          currentCorrect={currentCorrect}
          setCurrentCorrect={setCurrentCorrect}
          currentRepeatId={currentRepeatId}
          setCurrentRepeatId={setCurrentRepeatId}
          updateScore={updateScore}
          setLives={setLives}
          lives={lives}
          setPhase={setPhase}
          setShowGameOver={setShowGameOver}
          lanes={lanes}
          actualCarSpeed={actualCarSpeed}
          blockStartZ={blockStartZ}
          gateIntervalMs={gateIntervalMs}
          lastGateTime={lastGateTime}
          setLastGateTime={setLastGateTime}
          bufferActive={bufferActive}
          setBufferActive={setBufferActive}
          speedBoost={speedBoost}
          questionsAnswered={questionsAnswered}
          setQuestionsAnswered={setQuestionsAnswered}
          pendingRepeats={pendingRepeats}
          setPendingRepeats={setPendingRepeats}
          setIncorrectAnswers={setIncorrectAnswers}
          setRedFlash={setRedFlash}
          currentPlayer={currentPlayer}
          setGreenFlash={setGreenFlash}
          setShowCorrectAnswer={setShowCorrectAnswer}
          setCorrectAnswerDisplay={setCorrectAnswerDisplay}
        />
      </Canvas>
    </div>
  );
}

// --- Statistics Page Component ---
function StatisticsPage({ currentPlayer, onBack }) {
  const [statistics, setStatistics] = useState(getStatistics(currentPlayer));

  const handleReset = () => {
    if (confirm(`Weet je zeker dat je alle statistieken voor ${currentPlayer} wilt wissen?`)) {
      resetStatistics(currentPlayer);
      setStatistics({});
    }
  };

  // Generate all multiplication tables 1x1 to 10x10
  const generateAllQuestions = () => {
    const questions = [];
    for (let table = 1; table <= 10; table++) {
      for (let multiplier = 1; multiplier <= 10; multiplier++) {
        const question = `${table} × ${multiplier}`;
        const answer = table * multiplier;
        const stats = statistics[question] || { attempts: 0, mistakes: 0 };
        questions.push({
          question,
          answer,
          attempts: stats.attempts,
          mistakes: stats.mistakes,
          successRate: stats.attempts > 0 ? ((stats.attempts - stats.mistakes) / stats.attempts * 100).toFixed(1) : 0
        });
      }
    }
    return questions;
  };

  const allQuestions = generateAllQuestions();
  const totalAttempts = allQuestions.reduce((sum, q) => sum + q.attempts, 0);
  const totalMistakes = allQuestions.reduce((sum, q) => sum + q.mistakes, 0);
  const overallSuccessRate = totalAttempts > 0 ? ((totalAttempts - totalMistakes) / totalAttempts * 100).toFixed(1) : 0;

  return (
    <div style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.9)",
      color: "#fff",
      fontSize: "clamp(14px, 2.5vw, 16px)", // Responsive base font
      padding: "clamp(10px, 3vw, 20px)", // Responsive padding
      overflowY: "auto",
      zIndex: 40,
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header Section */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "flex-start", // Changed from center for better mobile layout
          marginBottom: "clamp(20px, 4vh, 30px)",
          flexWrap: "wrap",
          gap: "15px"
        }}>
          <div style={{ flex: "1", minWidth: "250px" }}>
            <h1 style={{ 
              fontSize: "clamp(24px, 6vw, 36px)", // Responsive title
              marginBottom: "clamp(8px, 2vh, 10px)", 
              color: "#4CAF50",
              lineHeight: 1.2
            }}>
              📊 Statistieken - {currentPlayer}
            </h1>
            <div style={{ 
              fontSize: "clamp(14px, 3vw, 18px)", // Responsive subtitle
              color: "#ccc",
              lineHeight: 1.3
            }}>
              Totaal: {totalAttempts} pogingen | {totalMistakes} fouten | {overallSuccessRate}% correct
            </div>
          </div>
          
          <div style={{ 
            display: "flex", 
            gap: "10px",
            flexWrap: "wrap",
            justifyContent: "flex-end"
          }}>
            <button
              style={{
                fontSize: "clamp(16px, 3.5vw, 20px)",
                padding: "clamp(8px, 2vw, 10px) clamp(15px, 4vw, 25px)",
                borderRadius: 8,
                border: "2px solid #666",
                background: "transparent",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
                touchAction: "manipulation",
                minWidth: "80px"
              }}
              onClick={onBack}
            >
              ← Terug
            </button>
            <button
              style={{
                fontSize: "clamp(16px, 3.5vw, 20px)",
                padding: "clamp(8px, 2vw, 10px) clamp(15px, 4vw, 25px)",
                borderRadius: 8,
                border: "2px solid #ff4444",
                background: "transparent",
                color: "#ff4444",
                fontWeight: 600,
                cursor: "pointer",
                touchAction: "manipulation",
                minWidth: "80px"
              }}
              onClick={handleReset}
            >
              🗑️ Reset
            </button>
          </div>
        </div>

        {/* Multiplication Table Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(11, 1fr)", // Fixed 11 columns (header + 10 numbers)
          gap: "1px",
          background: "#333",
          padding: "1px",
          borderRadius: 8,
          marginBottom: "clamp(15px, 3vh, 20px)",
          fontSize: "clamp(10px, 2vw, 14px)" // Responsive grid font
        }}>
          {/* Header row */}
          <div style={{ 
            background: "#555", 
            padding: "clamp(4px, 1.5vw, 8px)", 
            fontWeight: "bold", 
            textAlign: "center",
            fontSize: "clamp(12px, 2.5vw, 14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "clamp(35px, 8vw, 60px)"
          }}>
            ×
          </div>
          {[1,2,3,4,5,6,7,8,9,10].map(num => (
            <div key={num} style={{ 
              background: "#555", 
              padding: "clamp(4px, 1.5vw, 8px)", 
              fontWeight: "bold", 
              textAlign: "center",
              fontSize: "clamp(12px, 2.5vw, 14px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "clamp(35px, 8vw, 60px)"
            }}>
              {num}
            </div>
          ))}

          {/* Table rows */}
          {[1,2,3,4,5,6,7,8,9,10].map(table => (
            <React.Fragment key={table}>
              {/* Row header */}
              <div style={{ 
                background: "#555", 
                padding: "clamp(4px, 1.5vw, 8px)", 
                fontWeight: "bold", 
                textAlign: "center",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "clamp(35px, 8vw, 60px)"
              }}>
                {table}
              </div>
              
              {/* Cells */}
              {[1,2,3,4,5,6,7,8,9,10].map(multiplier => {
                const question = `${table} × ${multiplier}`;
                const stats = statistics[question] || { attempts: 0, mistakes: 0 };
                const successRate = stats.attempts > 0 ? (stats.attempts - stats.mistakes) / stats.attempts : 1;
                
                let bgColor = "#222"; // Default: not attempted
                if (stats.attempts > 0) {
                  if (successRate >= 0.9) bgColor = "#2d5a2d"; // Green: 90%+ success
                  else if (successRate >= 0.7) bgColor = "#5a5a2d"; // Yellow: 70-89% success  
                  else if (successRate >= 0.5) bgColor = "#5a4a2d"; // Orange: 50-69% success
                  else bgColor = "#5a2d2d"; // Red: <50% success
                }

                return (
                  <div 
                    key={multiplier}
                    style={{ 
                      background: bgColor,
                      padding: "clamp(2px, 1vw, 4px)",
                      textAlign: "center",
                      fontSize: "clamp(10px, 2vw, 12px)",
                      lineHeight: 1.1,
                      minHeight: "clamp(35px, 8vw, 60px)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      cursor: "pointer"
                    }}
                    title={`${question} = ${table * multiplier}\nPogingen: ${stats.attempts}\nFouten: ${stats.mistakes}\nSucces: ${stats.attempts > 0 ? (successRate * 100).toFixed(1) : 0}%`}
                  >
                    <div style={{ 
                      fontWeight: "bold", 
                      fontSize: "clamp(11px, 2.2vw, 14px)",
                      marginBottom: stats.attempts > 0 ? "1px" : "0"
                    }}>
                      {table * multiplier}
                    </div>
                    {stats.attempts > 0 && (
                      <>
                        <div style={{ 
                          fontSize: "clamp(8px, 1.5vw, 10px)", 
                          color: "#ccc",
                          lineHeight: 1
                        }}>
                          {stats.attempts}×
                        </div>
                        {stats.mistakes > 0 && (
                          <div style={{ 
                            fontSize: "clamp(8px, 1.5vw, 10px)", 
                            color: "#ff6666",
                            lineHeight: 1
                          }}>
                            {stats.mistakes}✗
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Legend */}
        <div style={{ 
          marginTop: "clamp(15px, 3vh, 20px)", 
          padding: "clamp(12px, 3vw, 15px)", 
          background: "rgba(255,255,255,0.1)", 
          borderRadius: 8,
          fontSize: "clamp(12px, 2.5vw, 14px)"
        }}>
          <strong style={{ fontSize: "clamp(14px, 3vw, 16px)" }}>Legenda:</strong>
          <div style={{ 
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", // Responsive grid
            gap: "clamp(10px, 2vw, 20px)", 
            marginTop: "clamp(8px, 2vw, 12px)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ 
                width: "clamp(16px, 4vw, 20px)", 
                height: "clamp(16px, 4vw, 20px)", 
                background: "#222", 
                borderRadius: 3,
                flexShrink: 0
              }}></div>
              <span>Niet geprobeerd</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ 
                width: "clamp(16px, 4vw, 20px)", 
                height: "clamp(16px, 4vw, 20px)", 
                background: "#2d5a2d", 
                borderRadius: 3,
                flexShrink: 0
              }}></div>
              <span>90%+ correct</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ 
                width: "clamp(16px, 4vw, 20px)", 
                height: "clamp(16px, 4vw, 20px)", 
                background: "#5a5a2d", 
                borderRadius: 3,
                flexShrink: 0
              }}></div>
              <span>70-89% correct</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ 
                width: "clamp(16px, 4vw, 20px)", 
                height: "clamp(16px, 4vw, 20px)", 
                background: "#5a4a2d", 
                borderRadius: 3,
                flexShrink: 0
              }}></div>
              <span>50-69% correct</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ 
                width: "clamp(16px, 4vw, 20px)", 
                height: "clamp(16px, 4vw, 20px)", 
                background: "#5a2d2d", 
                borderRadius: 3,
                flexShrink: 0
              }}></div>
              <span>&lt;50% correct</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Game Logic Component ---
function GameLogic({
  phase, carLane, answerBlocks, setAnswerBlocks, obstacles, setObstacles,
  invincible, setInvincible, setInvStart, invStart, currentQuestion, setCurrentQuestion,
  currentCorrect, setCurrentCorrect, currentRepeatId, setCurrentRepeatId, updateScore, setLives, lives, setPhase,
  setShowGameOver, lanes, actualCarSpeed, blockStartZ, gateIntervalMs,
  lastGateTime, setLastGateTime, bufferActive, setBufferActive, bufferTime,
  speedBoost, questionsAnswered, setQuestionsAnswered, pendingRepeats, setPendingRepeats,
  setIncorrectAnswers, setRedFlash, currentPlayer, setGreenFlash, setShowCorrectAnswer, setCorrectAnswerDisplay
}) {
  const lastObstacleSpawnTimeRef = useRef(0); // Track last obstacle spawn time

  useFrame(() => {
    if (phase !== "play") return;

    const now = Date.now();

    // Move answer blocks
    setAnswerBlocks((blocks) =>
      blocks
        .map((b) => ({ ...b, z: b.z + actualCarSpeed }))
        .filter((b) => b.z < 2)
    );

    // Check collision with answer blocks
    answerBlocks.forEach((b) => {
      if (
        Math.abs(b.z) < 1.2 &&
        b.lane === carLane &&
        !invincible
      ) {
        if (b.value === currentCorrect) {
          updateScore(questionsAnswered + 1);
          setQuestionsAnswered(q => q + 1);
          
          // Update statistics for correct answer
          updateStatistics(currentQuestion, true, currentPlayer);
          
          // Flash green screen for 200ms
          setGreenFlash(true);
          setTimeout(() => setGreenFlash(false), 200);
          
          // Remove from pending repeats if this was a repeat question
          if (currentRepeatId) {
            removePendingRepeat(currentRepeatId, currentPlayer);
            setPendingRepeats(getPendingRepeats(currentPlayer));
          }
        } else {
          setLives((l) => l - 1);
          setInvincible(true);
          setInvStart(now);
          
          // Update statistics for incorrect answer
          updateStatistics(currentQuestion, false, currentPlayer);
          
          // Flash red screen for 200ms
          setRedFlash(true);
          setTimeout(() => setRedFlash(false), 200);
          
          // Show correct answer for 1 second
          setCorrectAnswerDisplay({
            question: currentQuestion,
            answer: currentCorrect
          });
          setShowCorrectAnswer(true);
          setTimeout(() => setShowCorrectAnswer(false), 1000);
          
          // Track incorrect answer for current player
          addIncorrectAnswer(currentQuestion, currentCorrect, b.value, currentPlayer);
          setIncorrectAnswers(getIncorrectAnswers(currentPlayer));
          
          // Add to pending repeats (only if not already a repeat)
          if (!currentRepeatId) {
            addPendingRepeat(currentQuestion, currentCorrect, currentPlayer);
            setPendingRepeats(getPendingRepeats(currentPlayer));
          }
        }
        
        // Remove the entire gate set and clear question
        setAnswerBlocks([]);
        setCurrentQuestion(null);
        setCurrentCorrect(null);
        setCurrentRepeatId(null);
      }
    });

    // Clear question when all gates have passed without collision
    if (answerBlocks.length > 0 && answerBlocks.every(b => b.z > 2)) {
      setCurrentQuestion(null);
      setCurrentCorrect(null);
      setCurrentRepeatId(null);
    }

    // Move obstacles
    setObstacles((obs) =>
      obs
        .map((o) => ({ ...o, z: o.z + actualCarSpeed }))
        .filter((o) => o.z < 2)
    );

    // Check collision with obstacles
    obstacles.forEach((o) => {
      if (
        Math.abs(o.z) < 1.2 &&
        o.lane === carLane &&
        !invincible
      ) {
        // Check if there's a gate in the same lane and we're within protection window
        const gateInSameLane = answerBlocks.find(gate => gate.lane === carLane);
        const protectionTime = 2000; // 2 seconds in milliseconds
        const protectionDistance = actualCarSpeed * protectionTime / 16.67; // Convert to distance
        
        let isProtected = false;
        if (gateInSameLane) {
          const distanceToGate = Math.abs(gateInSameLane.z);
          if (distanceToGate <= protectionDistance) {
            isProtected = true;
            console.log(`Traffic collision protected: gate distance=${distanceToGate.toFixed(2)}, protection=${protectionDistance.toFixed(2)}`);
          }
        }
        
        if (!isProtected) {
          setLives((l) => l - 1);
          setInvincible(true);
          setInvStart(now);
          
          // Flash red screen for 200ms (0.2 seconds)
          setRedFlash(true);
          setTimeout(() => setRedFlash(false), 200);
        }
        
        setObstacles((obs) => obs.filter((obstacle) => obstacle.id !== o.id));
      }
    });

    // Invincibility timer
    if (invincible && now - invStart > INVINCIBILITY_TIME) {
      setInvincible(false);
    }

    // Game over
    if (lives <= 0 && phase === "play") {
      setPhase("gameover");
      setShowGameOver(true);
    }
  });

  // Spawn new gates when no gates are active
  useEffect(() => {
    if (phase !== "play") return;
    
    const effectiveInterval = Math.max(gateIntervalMs, 100); // Minimum 100ms to prevent issues
    
    const t = setInterval(() => {
      // Only spawn new gates if no active gates exist
      if (answerBlocks.length === 0) {
        const [q, c, opts, repeatId] = generateQuestion(lanes, questionsAnswered, getPendingRepeats(currentPlayer));
        setCurrentQuestion(q);
        setCurrentCorrect(c);
        setCurrentRepeatId(repeatId);
        
        const newBlocks = opts.map((opt, i) => ({
          lane: i,
          z: blockStartZ, // Now spawns at -100 (top of screen)
          value: opt,
          id: Math.random().toString(36).slice(2),
          questionId: Date.now().toString(),
        }));
        
        setAnswerBlocks(newBlocks);
        setLastGateTime(Date.now());
        console.log(`Spawned new gates at z=${blockStartZ}`);
      }
    }, effectiveInterval);
    
    return () => clearInterval(t);
  }, [phase, lanes, gateIntervalMs, blockStartZ, answerBlocks.length, questionsAnswered, currentPlayer]);

  // Improved obstacle spawning with proper timing and location controls
  useEffect(() => {
    if (phase !== "play") return;
    
    const maxTrafficCars = Math.max(1, Math.floor(lanes / 2));
    const OBSTACLE_SPAWN_INTERVAL = 2500; // How often we check for spawning
    const OBSTACLE_SPAWN_Z = blockStartZ; // Spawn at same location as gates
    const OBSTACLE_RATE_COOLDOWN = 2000; // Min 2 seconds between obstacle spawns
    const GATE_SPAWN_BUFFER = 2000; // Don't spawn obstacles 2s before/after gates
    
    const t = setInterval(() => {
      const now = Date.now();
      
      // 1. Rate Limit: Check if 2 seconds have passed since the last obstacle spawn
      if (now - lastObstacleSpawnTimeRef.current < OBSTACLE_RATE_COOLDOWN) {
        return;
      }
      
      // 2. Gate Proximity: Check if too close to a gate spawn event
      // Rule 2a: Too soon after the last gate set spawned
      if (now - lastGateTime < GATE_SPAWN_BUFFER) {
        return;
      }
      
      // Rule 2b: Too soon before an imminently spawning gate set
      // If no answer blocks are on screen, new gates are due based on gateIntervalMs
      const effectiveGateSpawnInterval = Math.max(gateIntervalMs, 100);
      if (answerBlocks.length === 0 && effectiveGateSpawnInterval < GATE_SPAWN_BUFFER) {
        return;
      }
      
      setObstacles((currentObs) => {
        // 3. Max Traffic: Check if max number of obstacles already on screen
        const activeCars = currentObs.filter((o) => o.z > OBSTACLE_SPAWN_Z - 50).length;
        if (activeCars >= maxTrafficCars) {
          return currentObs;
        }
        
        // 4. Lane Availability: Find lanes not occupied by other obstacles at spawn location
        const availableLanes = [];
        for (let lane = 0; lane < lanes; lane++) {
          const isLaneOccupiedByObstacle = currentObs.some(
            (obstacle) =>
              obstacle.lane === lane &&
              Math.abs(obstacle.z - OBSTACLE_SPAWN_Z) < CAR_LENGTH * 3 // Check 3 car lengths for spacing
          );
          if (!isLaneOccupiedByObstacle) {
            availableLanes.push(lane);
          }
        }
        
        if (availableLanes.length > 0) {
          const selectedLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
          lastObstacleSpawnTimeRef.current = now; // Update last spawn time
          
          return [
            ...currentObs,
            {
              lane: selectedLane,
              z: OBSTACLE_SPAWN_Z,
              id: Math.random().toString(36).slice(2),
              colorIndex: currentObs.length % 5,
            },
          ];
        }
        return currentObs;
      });
    }, OBSTACLE_SPAWN_INTERVAL);
    
    return () => clearInterval(t);
  }, [phase, lanes, blockStartZ, gateIntervalMs, lastGateTime, answerBlocks.length]);

  // Buffer management around gates
  useEffect(() => {
    if (phase !== "play") return;
    
    const checkBuffer = () => {
      const approachingGates = answerBlocks.filter((b) => 
        b.z > -30 && b.z < 10
      );
      
      if (approachingGates.length > 0 && !bufferActive) {
        setBufferActive(true);
        
        const closestGate = approachingGates.reduce((closest, gate) => 
          Math.abs(gate.z) < Math.abs(closest.z) ? gate : closest
        );
        
        const timeToReach = Math.abs(closestGate.z) / actualCarSpeed * 16.67;
        
        setTimeout(() => {
          setBufferActive(false);
        }, timeToReach + bufferTime);
      }
    };
    
    const interval = setInterval(checkBuffer, 500);
    return () => clearInterval(interval);
  }, [answerBlocks, bufferActive, actualCarSpeed, bufferTime]);

  return null;
}

// --- Road Component ---
function Road({ lanes }) {
  return (
    <group>
      {/* Road base - positioned lower and extended to reach 80% screen height */}
      <mesh position={[0, -0.4, -90]} receiveShadow>
        <boxGeometry args={[lanes * 2.5 + 2, 0.3, 220]} />
        <meshStandardMaterial color={ROAD_COLOR} />
      </mesh>
      {/* Lane separator lines - adjusted for new positioning */}
      {Array.from({ length: lanes - 1 }).map((_, i) => (
        <mesh key={i} position={[(i - (lanes - 2) / 2) * 2.5, -0.249, -90]}>
          <boxGeometry args={[0.05, 0.01, 220]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
      ))}
    </group>
  );
}

// --- Answer Block Component ---
function AnswerBlock({ lane, laneX, z, value, carLane }) {
  // Hide label if block is in front of car (z between -2 and 2) and in same lane
  const hideLabel = z > -2 && z < 2 && lane === carLane;
  
  return (
    <group position={[laneX(lane), 0.1, z]}>
      <mesh>
        <boxGeometry args={[1.08, 0.63, 1.08]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
      {!hideLabel && (
        <Html center distanceFactor={8} style={ANSWER_LABEL_STYLE}>
          {value}
        </Html>
      )}
    </group>
  );
}

export default TafelRaceGame;
