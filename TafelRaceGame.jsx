import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Sky } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import Car from "./Car.jsx";
import ObstacleCar from "./ObstacleCar.jsx";

// --- Constants ---
const CAR_SPEED = 0.05;
const OBSTACLE_INTERVAL = 3000;
const INVINCIBILITY_TIME = 2000;
const COUNTDOWN_START = 3;
const BLOCK_START_Z = -80;
const LANES_MIN = 2;
const LANES_MAX = 10;
const ROAD_COLOR = "#555";
const REPEAT_AFTER_QUESTIONS = 5;
const CAR_LENGTH = 2.4;
const GATE_PROTECTION_DISTANCE = CAR_LENGTH * 3;
const ALL_TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const DEFAULT_PLAYER = 'Abel';

// --- World scroll & road curve system ---
// Module-level so all 3D components can read it without prop drilling
let worldScroll = 0;

function getRoadOffset(z) {
  const t = (z + worldScroll) * 0.006;
  return {
    x: Math.sin(t * 1.1) * 2.8 + Math.sin(t * 0.47) * 1.4,
    y: Math.sin(t * 0.7) * 1.0 + Math.cos(t * 0.35) * 0.5,
  };
}

// --- Local Storage Functions ---
const getHighScore = (player = DEFAULT_PLAYER) => {
  return parseInt(localStorage.getItem(`tafelRaceHighScore_${player}`) || '0');
};

const setHighScore = (score, player = DEFAULT_PLAYER) => {
  localStorage.setItem(`tafelRaceHighScore_${player}`, score.toString());
};

const getIncorrectAnswers = (player = DEFAULT_PLAYER) => {
  const stored = localStorage.getItem(`tafelRaceIncorrectAnswers_${player}`);
  return stored ? JSON.parse(stored) : [];
};

const addIncorrectAnswer = (question, correctAnswer, givenAnswer, player = DEFAULT_PLAYER) => {
  const incorrectAnswers = getIncorrectAnswers(player);
  const newEntry = { question, correctAnswer, givenAnswer, timestamp: Date.now(), id: Math.random().toString(36).slice(2) };
  incorrectAnswers.unshift(newEntry);
  if (incorrectAnswers.length > 10) incorrectAnswers.splice(10);
  localStorage.setItem(`tafelRaceIncorrectAnswers_${player}`, JSON.stringify(incorrectAnswers));
};

const getPendingRepeats = (player = DEFAULT_PLAYER) => {
  const stored = localStorage.getItem(`tafelRacePendingRepeats_${player}`);
  return stored ? JSON.parse(stored) : [];
};

const addPendingRepeat = (question, correctAnswer, player = DEFAULT_PLAYER) => {
  const pendingRepeats = getPendingRepeats(player);
  pendingRepeats.push({ question, correctAnswer, addedAt: Date.now(), id: Math.random().toString(36).slice(2) });
  localStorage.setItem(`tafelRacePendingRepeats_${player}`, JSON.stringify(pendingRepeats));
};

const removePendingRepeat = (id, player = DEFAULT_PLAYER) => {
  const pendingRepeats = getPendingRepeats(player);
  const filtered = pendingRepeats.filter(repeat => repeat.id !== id);
  localStorage.setItem(`tafelRacePendingRepeats_${player}`, JSON.stringify(filtered));
};

const getStatistics = (player = DEFAULT_PLAYER) => {
  const stored = localStorage.getItem(`tafelRaceStatistics_${player}`);
  return stored ? JSON.parse(stored) : {};
};

const updateStatistics = (question, isCorrect, player = DEFAULT_PLAYER) => {
  const stats = getStatistics(player);
  if (!stats[question]) stats[question] = { attempts: 0, mistakes: 0 };
  stats[question].attempts++;
  if (!isCorrect) stats[question].mistakes++;
  localStorage.setItem(`tafelRaceStatistics_${player}`, JSON.stringify(stats));
};

const resetStatistics = (player = DEFAULT_PLAYER) => {
  localStorage.removeItem(`tafelRaceStatistics_${player}`);
  localStorage.removeItem(`tafelRaceIncorrectAnswers_${player}`);
  localStorage.removeItem(`tafelRacePendingRepeats_${player}`);
};

const getSelectedTables = (player = DEFAULT_PLAYER) => {
  const stored = localStorage.getItem(`tafelRaceSelectedTables_${player}`);
  return stored ? JSON.parse(stored) : [1, 2, 3, 4, 5];
};

const setSelectedTables = (tables, player = DEFAULT_PLAYER) => {
  localStorage.setItem(`tafelRaceSelectedTables_${player}`, JSON.stringify(tables));
};

// --- Utility: Generate question ---
function generateQuestion(lanes, questionsAnswered = 0, pendingRepeats = [], selectedTables = ALL_TABLES) {
  const tables = selectedTables.length > 0 ? selectedTables : ALL_TABLES;

  // Check if we should repeat an incorrect answer
  if (pendingRepeats.length > 0 && questionsAnswered > 0 && questionsAnswered % REPEAT_AFTER_QUESTIONS === 0) {
    const repeatQuestion = pendingRepeats[0];
    const correct = repeatQuestion.correctAnswer;
    let options = [correct];
    const questionParts = repeatQuestion.question.split(' × ');
    if (questionParts.length === 2) {
      const table = parseInt(questionParts[0]);
      while (options.length < lanes) {
        let opt = table * (Math.floor(Math.random() * 10) + 1);
        if (!options.includes(opt)) options.push(opt);
      }
    } else {
      while (options.length < lanes) {
        let opt = Math.floor(Math.random() * 100) + 1;
        if (!options.includes(opt)) options.push(opt);
      }
    }
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return [repeatQuestion.question, correct, options, repeatQuestion.id];
  }

  // Generate new question from selected tables
  const table = tables[Math.floor(Math.random() * tables.length)];
  const multiplier = Math.floor(Math.random() * 10) + 1;
  const correct = table * multiplier;
  let options = [correct];

  while (options.length < lanes) {
    const randomTable = tables[Math.floor(Math.random() * tables.length)];
    let opt = randomTable * (Math.floor(Math.random() * 10) + 1);
    if (!options.includes(opt)) options.push(opt);
  }

  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return [`${table} × ${multiplier}`, correct, options, null];
}

// --- Confetti Particle ---
function ConfettiParticle({ delay, color }) {
  const style = {
    position: 'absolute',
    left: `${Math.random() * 100}%`,
    top: '-20px',
    width: `${8 + Math.random() * 12}px`,
    height: `${8 + Math.random() * 12}px`,
    background: color,
    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
    animation: `confetti ${1.5 + Math.random() * 1.5}s ease-out ${delay}s forwards`,
    pointerEvents: 'none',
    zIndex: 100,
  };
  return <div style={style} />;
}

// --- Star burst effect ---
function StarBurst({ x, y }) {
  const stars = ['⭐', '✨', '🌟', '💫'];
  return (
    <div style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none', zIndex: 100 }}>
      {stars.map((s, i) => (
        <span key={i} style={{
          position: 'absolute',
          fontSize: 24 + Math.random() * 16,
          animation: `starBurst 0.8s ease-out ${i * 0.1}s forwards`,
          transform: `translate(${(Math.random() - 0.5) * 60}px, ${(Math.random() - 0.5) * 60}px)`,
        }}>{s}</span>
      ))}
    </div>
  );
}

// --- Main Game Component ---
function TafelRaceGame() {
  const [phase, setPhase] = useState("init");
  const [currentPlayer, setCurrentPlayer] = useState(DEFAULT_PLAYER);
  const [lanes, setLanes] = useState(() => {
    const isMobile = window.innerWidth < window.innerHeight;
    return 4;
  });
  const [carSpeed, setCarSpeed] = useState(150);
  const [gateInterval, setGateInterval] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScoreState] = useState(getHighScore(DEFAULT_PLAYER));
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
  const [incorrectAnswers, setIncorrectAnswers] = useState(getIncorrectAnswers(DEFAULT_PLAYER));
  const [pendingRepeats, setPendingRepeats] = useState(getPendingRepeats(DEFAULT_PLAYER));
  const [redFlash, setRedFlash] = useState(false);
  const [greenFlash, setGreenFlash] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [correctAnswerDisplay, setCorrectAnswerDisplay] = useState({ question: '', answer: '' });
  const [selectedTables, setSelectedTablesState] = useState(getSelectedTables(DEFAULT_PLAYER));
  const [showConfetti, setShowConfetti] = useState(false);
  const [streak, setStreak] = useState(0);
  const [showStreak, setShowStreak] = useState(false);
  const [newHighScore, setNewHighScore] = useState(false);
  const [encouragement, setEncouragement] = useState(null);
  const [showCorrectConfirm, setShowCorrectConfirm] = useState(null);

  const [speedBoost, setSpeedBoost] = useState(false);
  const actualCarSpeed = (carSpeed / 1000) * (speedBoost ? 4 : 1);
  const blockStartZ = BLOCK_START_Z;
  const gateIntervalMs = gateInterval * 1000;

  const confettiColors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#96E6A1', '#DDA0DD', '#FFA07A', '#87CEEB'];

  // --- Table selection ---
  const toggleTable = useCallback((table) => {
    setSelectedTablesState(prev => {
      const next = prev.includes(table)
        ? prev.filter(t => t !== table)
        : [...prev, table].sort((a, b) => a - b);
      if (next.length === 0) return prev; // Must have at least 1
      setSelectedTables(next, currentPlayer);
      return next;
    });
  }, [currentPlayer]);

  const selectAllTables = useCallback(() => {
    setSelectedTablesState(ALL_TABLES);
    setSelectedTables(ALL_TABLES, currentPlayer);
  }, [currentPlayer]);

  const selectEasyTables = useCallback(() => {
    const easy = [1, 2, 5, 10];
    setSelectedTablesState(easy);
    setSelectedTables(easy, currentPlayer);
  }, [currentPlayer]);

  // --- Handlers ---
  const startGame = useCallback(() => {
    if (selectedTables.length === 0) return;
    setScore(0);
    setLives(3);
    setCarLane(0);
    setObstacles([]);
    setAnswerBlocks([]);
    setShowGameOver(false);
    setCountdown(COUNTDOWN_START);
    setQuestionsAnswered(0);
    setStreak(0);
    setNewHighScore(false);
    worldScroll = 0;
    setPhase("countdown");
    setPendingRepeats(getPendingRepeats(currentPlayer));
  }, [currentPlayer, selectedTables]);

  const backToSettings = useCallback(() => {
    setPhase("init");
    setShowGameOver(false);
  }, []);

  const updateScore = useCallback((newScore) => {
    setScore(newScore);
    const currentHighScore = getHighScore(currentPlayer);
    if (newScore > currentHighScore) {
      setHighScoreState(newScore);
      setHighScore(newScore, currentPlayer);
      if (newScore > 0) setNewHighScore(true);
    }
  }, [currentPlayer]);

  const handlePlayerChange = useCallback((newPlayer) => {
    setCurrentPlayer(newPlayer);
    setHighScoreState(getHighScore(newPlayer));
    setIncorrectAnswers(getIncorrectAnswers(newPlayer));
    setPendingRepeats(getPendingRepeats(newPlayer));
    setSelectedTablesState(getSelectedTables(newPlayer));
  }, []);

  const goToStatistics = useCallback(() => {
    setPhase("statistics");
  }, []);

  // --- Countdown effect ---
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown === 0) {
      setPhase("play");
      const [q, c, opts, repeatId] = generateQuestion(lanes, questionsAnswered, getPendingRepeats(currentPlayer), selectedTables);
      setCurrentQuestion(q);
      setCurrentCorrect(c);
      setCurrentRepeatId(repeatId);
      setAnswerBlocks(
        opts.map((opt, i) => ({
          lane: i, z: BLOCK_START_Z, value: opt,
          id: Math.random().toString(36).slice(2),
          questionId: Date.now().toString(),
        }))
      );
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, lanes, questionsAnswered, currentPlayer, selectedTables]);

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

  const laneX = (lane) => (lane - (lanes - 1) / 2) * 2.5;

  const handleLaneClick = useCallback((targetLane) => {
    if (phase === "play") setCarLane(targetLane);
  }, [phase]);

  // --- Lives display as hearts ---
  const heartsDisplay = useMemo(() => {
    const hearts = [];
    for (let i = 0; i < 3; i++) {
      hearts.push(i < lives ? '❤️' : '🖤');
    }
    return hearts.join(' ');
  }, [lives]);

  // --- Render ---
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "linear-gradient(180deg, #87CEEB 0%, #E0F7FA 50%, #B2EBF2 100%)" }}>
      {/* Red flash overlay */}
      {redFlash && (
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(255, 50, 50, 0.5)", zIndex: 50, pointerEvents: "none",
          borderRadius: 0,
        }} />
      )}

      {/* Green flash overlay */}
      {greenFlash && (
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(46, 213, 115, 0.4)", zIndex: 50, pointerEvents: "none",
        }} />
      )}

      {/* Confetti */}
      {showConfetti && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 90, overflow: 'hidden' }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <ConfettiParticle key={i} delay={i * 0.05} color={confettiColors[i % confettiColors.length]} />
          ))}
        </div>
      )}

      {/* Correct answer display for wrong answers */}
      {showCorrectAnswer && (
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0, 0, 0, 0.85)", color: "#fff",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          zIndex: 60, pointerEvents: "none",
        }}>
          <div style={{ fontSize: "clamp(24px, 5vw, 40px)", fontWeight: 700, marginBottom: 6, fontFamily: "'Nunito', sans-serif", animation: 'bounceIn 0.3s ease-out' }}>
            Bijna! Onthoud dit:
          </div>
          <div style={{
            fontSize: "clamp(36px, 9vw, 70px)", fontWeight: 700, color: "#FFE66D",
            fontFamily: "'Fredoka One', cursive", animation: 'pop 0.4s ease-out 0.1s both',
            background: 'rgba(255,255,255,0.1)', padding: '10px 30px', borderRadius: 16,
          }}>
            {correctAnswerDisplay.question} = {correctAnswerDisplay.answer}
          </div>
          <div style={{ fontSize: "clamp(18px, 4vw, 28px)", marginTop: 12, color: "#4ECDC4", animation: 'slideUp 0.3s ease-out 0.3s both' }}>
            Komt deze straks weer terug! 🔄
          </div>
        </div>
      )}

      {/* Encouragement message */}
      {encouragement && (
        <div style={{
          position: 'absolute', top: '22%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 56, pointerEvents: 'none', animation: 'bounceIn 0.4s ease-out',
          fontFamily: "'Fredoka One', cursive", fontSize: 'clamp(32px, 7vw, 56px)',
          color: '#2ED573', textShadow: '0 3px 15px rgba(0,0,0,0.5)',
        }}>
          {encouragement}
        </div>
      )}

      {/* Correct equation confirmation */}
      {showCorrectConfirm && (
        <div style={{
          position: 'absolute', top: '32%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 55, pointerEvents: 'none', animation: 'slideUp 0.3s ease-out',
          fontFamily: "'Fredoka One', cursive", fontSize: 'clamp(20px, 4.5vw, 36px)',
          color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          background: 'rgba(46, 213, 115, 0.8)', padding: '6px 20px', borderRadius: 12,
        }}>
          ✓ {showCorrectConfirm}
        </div>
      )}

      {/* Streak display */}
      {showStreak && streak >= 3 && (
        <div style={{
          position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 55, pointerEvents: 'none', animation: 'bounceIn 0.5s ease-out',
          fontFamily: "'Fredoka One', cursive", fontSize: 'clamp(28px, 6vw, 48px)',
          color: '#FFE66D', textShadow: '0 3px 10px rgba(0,0,0,0.5)',
        }}>
          🔥 {streak}x Streak! 🔥
        </div>
      )}

      {/* HUD */}
      <div style={{
        position: "absolute", top: 12, left: 12,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)",
        color: "#fff", fontSize: "clamp(13px, 2.8vw, 20px)",
        borderRadius: 12, padding: "8px 14px", zIndex: 10,
        fontWeight: 700, fontFamily: "'Nunito', sans-serif",
        border: '2px solid rgba(255,255,255,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ color: '#FFE66D' }}>🏎️ {currentPlayer}</span>
          <span style={{ color: '#aaa' }}>|</span>
          <span>⭐ {score}</span>
          <span style={{ color: '#aaa' }}>|</span>
          <span>{heartsDisplay}</span>
          {streak >= 2 && (
            <>
              <span style={{ color: '#aaa' }}>|</span>
              <span style={{ color: '#FFA502' }}>🔥{streak}</span>
            </>
          )}
        </div>
        {highScore > 0 && (
          <div style={{ fontSize: "clamp(10px, 2vw, 14px)", color: "#ffd700", marginTop: 2 }}>
            🏆 Record: {highScore}
            {newHighScore && <span style={{ color: '#2ED573', marginLeft: 6 }}>NIEUW!</span>}
          </div>
        )}
      </div>

      {/* Show current question at top */}
      {phase === "play" && currentQuestion && answerBlocks.length > 0 && (
        <div style={{
          position: "absolute", top: 50, left: "50%", transform: "translateX(-50%)",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff", fontSize: "clamp(24px, 5vw, 48px)",
          borderRadius: 16, padding: "10px 28px", fontWeight: 700,
          zIndex: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          fontFamily: "'Fredoka One', cursive",
          border: '3px solid rgba(255,255,255,0.3)',
          animation: 'pop 0.3s ease-out',
        }}>
          {currentQuestion}
        </div>
      )}

      {/* Lane Control Buttons for Touch */}
      {phase === "play" && answerBlocks.length > 0 && (
        <>
          <div style={{
            position: "absolute", bottom: "clamp(95px, 15vh, 135px)", left: "50%", transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "#fff", fontSize: "clamp(16px, 3.5vw, 28px)", fontWeight: "700",
            padding: "6px 14px", borderRadius: 10, zIndex: 15, textAlign: "center",
            border: "2px solid rgba(255,255,255,0.3)", fontFamily: "'Fredoka One', cursive",
            boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
          }}>
            {currentQuestion}
          </div>

          <div style={{
            position: "absolute", bottom: "clamp(20px, 4vh, 40px)", left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: "clamp(4px, 1vw, 8px)", zIndex: 15, padding: "8px 12px",
            background: "rgba(0, 0, 0, 0.4)", borderRadius: 16,
            backdropFilter: "blur(8px)", maxWidth: "95vw", overflowX: "auto",
            border: '2px solid rgba(255,255,255,0.1)',
          }}>
            {answerBlocks.map((block) => (
              <button
                key={block.id}
                className="answer-btn"
                onClick={() => handleLaneClick(block.lane)}
                onTouchStart={(e) => { e.preventDefault(); handleLaneClick(block.lane); }}
                style={{
                  width: "clamp(50px, 10vw, 70px)", height: "clamp(50px, 10vw, 70px)",
                  borderRadius: "12px",
                  border: carLane === block.lane ? "3px solid #FFE66D" : "2px solid rgba(255,255,255,0.5)",
                  background: carLane === block.lane
                    ? "linear-gradient(135deg, #FF6B6B, #ee5a52)"
                    : "rgba(255, 255, 255, 0.9)",
                  color: carLane === block.lane ? "#fff" : "#333",
                  fontSize: "clamp(14px, 3vw, 22px)", fontWeight: "900",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  userSelect: "none", touchAction: "manipulation",
                  boxShadow: carLane === block.lane
                    ? "0 4px 15px rgba(255, 107, 107, 0.5), inset 0 0 10px rgba(255,255,255,0.2)"
                    : "0 2px 8px rgba(0, 0, 0, 0.2)",
                  transform: carLane === block.lane ? "scale(1.08)" : "scale(1)",
                  flexShrink: 0,
                }}
              >
                {block.value}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Speed Boost Button */}
      {phase === "play" && (
        <div style={{
          position: "absolute", bottom: "clamp(80px, 12vh, 120px)", right: "clamp(15px, 3vw, 25px)", zIndex: 15,
        }}>
          <button
            onTouchStart={(e) => { e.preventDefault(); setSpeedBoost(true); }}
            onTouchEnd={(e) => { e.preventDefault(); setSpeedBoost(false); }}
            onTouchCancel={() => setSpeedBoost(false)}
            onMouseDown={() => setSpeedBoost(true)}
            onMouseUp={() => setSpeedBoost(false)}
            onMouseLeave={() => setSpeedBoost(false)}
            style={{
              width: "clamp(55px, 11vw, 75px)", height: "clamp(55px, 11vw, 75px)",
              borderRadius: "50%", border: "3px solid rgba(255,255,255,0.5)",
              background: speedBoost
                ? "linear-gradient(135deg, #FF6B6B, #ee5a52)"
                : "rgba(255, 255, 255, 0.85)",
              color: speedBoost ? "#fff" : "#333",
              fontSize: "clamp(12px, 2.5vw, 16px)", fontWeight: "700",
              cursor: "pointer", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              userSelect: "none", touchAction: "manipulation",
              boxShadow: speedBoost
                ? "0 4px 20px rgba(255, 107, 107, 0.5)"
                : "0 3px 12px rgba(0, 0, 0, 0.2)",
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            <div style={{ fontSize: "clamp(18px, 4vw, 24px)", marginBottom: "1px" }}>🚀</div>
            <div style={{ fontSize: "clamp(7px, 1.8vw, 11px)", fontWeight: 900 }}>TURBO</div>
          </button>
        </div>
      )}

      {/* Countdown overlay */}
      {phase === "countdown" && (
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)",
          color: "#fff", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", zIndex: 20,
        }}>
          <div style={{
            fontSize: "clamp(80px, 20vw, 150px)", fontWeight: 900,
            fontFamily: "'Fredoka One', cursive",
            animation: 'countdownPulse 0.8s ease-out',
            color: countdown > 0 ? '#FFE66D' : '#2ED573',
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
            key: countdown,
          }}>
            {countdown > 0 ? countdown : "GO!"}
          </div>
          {countdown > 0 && (
            <div style={{ fontSize: "clamp(18px, 4vw, 28px)", color: '#aaa', marginTop: 10, fontFamily: "'Nunito', sans-serif" }}>
              Maak je klaar... 🏁
            </div>
          )}
        </div>
      )}

      {/* Game Over overlay */}
      {showGameOver && (
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
          color: "#fff", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", zIndex: 30,
          fontFamily: "'Nunito', sans-serif",
        }}>
          <div style={{
            fontSize: "clamp(36px, 8vw, 60px)", fontWeight: 900,
            fontFamily: "'Fredoka One', cursive",
            color: '#FFE66D', marginBottom: 4,
            animation: 'bounceIn 0.5s ease-out',
          }}>
            {score >= 10 ? 'Fantastisch! 🌟' : score >= 5 ? 'Goed gedaan! ⭐' : 'Goed geprobeerd! 💪'}
          </div>

          <div style={{
            fontSize: "clamp(14px, 3vw, 20px)", color: '#aaa', marginBottom: 12,
            animation: 'slideUp 0.3s ease-out 0.1s both',
          }}>
            {score >= 10
              ? `Wauw ${currentPlayer}, ${score} sommen goed!`
              : score >= 5
                ? `Knap ${currentPlayer}, je wordt steeds beter!`
                : `Oefening baart kunst, ${currentPlayer}!`}
          </div>

          <div style={{ fontSize: "clamp(24px, 5.5vw, 40px)", marginBottom: 6, animation: 'slideUp 0.5s ease-out 0.2s both' }}>
            ⭐ Score: <span style={{ color: '#FFE66D', fontWeight: 900 }}>{score}</span>
          </div>

          <div style={{ fontSize: "clamp(16px, 4vw, 24px)", marginBottom: 6, color: "#ffd700", animation: 'slideUp 0.5s ease-out 0.3s both' }}>
            🏆 Record: {highScore}
            {newHighScore && <span style={{ color: '#2ED573', marginLeft: 8, fontWeight: 900 }}>NIEUW RECORD! 🎉</span>}
          </div>

          {streak >= 3 && (
            <div style={{ fontSize: "clamp(14px, 3vw, 20px)", marginBottom: 10, color: "#FFA502", animation: 'slideUp 0.5s ease-out 0.4s both' }}>
              🔥 Beste reeks: {streak} op rij!
            </div>
          )}

          <div style={{ display: "flex", gap: "clamp(10px, 3vw, 20px)", flexWrap: "wrap", justifyContent: "center", marginTop: 10, animation: 'slideUp 0.5s ease-out 0.5s both' }}>
            <button
              className="start-btn"
              style={{
                fontSize: "clamp(18px, 4vw, 28px)", padding: "clamp(10px, 2.5vh, 14px) clamp(24px, 6vw, 44px)",
                borderRadius: 14, border: "none",
                background: "linear-gradient(135deg, #2ED573, #1ABC9C)",
                color: "#fff", fontWeight: 700, cursor: "pointer",
                touchAction: "manipulation", boxShadow: "0 4px 15px rgba(46,213,115,0.4)",
              }}
              onClick={startGame}
            >
              🔄 Nog een keer!
            </button>
            <button
              className="start-btn"
              style={{
                fontSize: "clamp(18px, 4vw, 28px)", padding: "clamp(10px, 2.5vh, 14px) clamp(24px, 6vw, 44px)",
                borderRadius: 14, border: "2px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.1)",
                color: "#fff", fontWeight: 700, cursor: "pointer",
                touchAction: "manipulation",
              }}
              onClick={backToSettings}
            >
              ⚙️ Menu
            </button>
          </div>
        </div>
      )}

      {/* Statistics page */}
      {phase === "statistics" && (
        <StatisticsPage currentPlayer={currentPlayer} onBack={() => setPhase("init")} />
      )}

      {/* === SETTINGS / START SCREEN === */}
      {phase === "init" && (
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
          color: "#fff", display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "flex-start", zIndex: 40, padding: "clamp(10px, 3vw, 20px)",
          overflowY: "auto", fontFamily: "'Nunito', sans-serif",
        }}>
          {/* Title */}
          <div style={{
            marginBottom: "clamp(6px, 1.5vh, 12px)", marginTop: "clamp(4px, 1vh, 8px)",
            textAlign: 'center',
          }}>
            <div className="game-title" style={{
              fontSize: "clamp(30px, 8vw, 52px)",
              fontFamily: "'Fredoka One', cursive",
              lineHeight: 1.1,
            }}>
              🏎️ Abels Tafel Racer 🏎️
            </div>
            <div style={{ fontSize: "clamp(11px, 2vw, 14px)", color: '#8892b0', marginTop: 2 }}>
              Leer de tafels door te racen!
            </div>
          </div>

          {/* Player Selection */}
          <div style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: 12,
            padding: "clamp(8px, 2vw, 14px)", marginBottom: "clamp(6px, 1vh, 10px)",
            width: '100%', maxWidth: 500, border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ fontSize: "clamp(13px, 2.5vw, 16px)", marginBottom: 6, fontWeight: 700, color: '#8892b0' }}>
              Kies speler:
            </div>
            <div style={{ display: "flex", gap: "clamp(8px, 2vw, 14px)", justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { name: 'Abel', emoji: '👦', color: '#FFE66D' },
                { name: 'Elias', emoji: '👦', color: '#4ECDC4' },
                { name: 'Floris', emoji: '👦', color: '#FF6B6B' },
              ].map(player => (
                <button
                  key={player.name}
                  className="player-btn"
                  style={{
                    fontSize: "clamp(14px, 3vw, 20px)",
                    padding: "clamp(6px, 1.5vw, 10px) clamp(12px, 3vw, 20px)",
                    borderRadius: 12, border: `3px solid ${player.color}`,
                    background: currentPlayer === player.name
                      ? `linear-gradient(135deg, ${player.color}, ${player.color}88)`
                      : "rgba(255,255,255,0.05)",
                    color: currentPlayer === player.name ? '#1a1a2e' : '#fff',
                    fontWeight: 800, cursor: "pointer", touchAction: "manipulation",
                  }}
                  onClick={() => handlePlayerChange(player.name)}
                >
                  {player.emoji} {player.name}
                </button>
              ))}
            </div>
          </div>

          {/* === TABLE SELECTION === */}
          <div style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: 12,
            padding: "clamp(8px, 2vw, 14px)", marginBottom: "clamp(6px, 1vh, 10px)",
            width: '100%', maxWidth: 500, border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ fontSize: "clamp(13px, 2.5vw, 16px)", marginBottom: 6, fontWeight: 700, color: '#8892b0' }}>
              Welke tafels wil je oefenen?
            </div>

            {/* Quick select buttons */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                className="table-toggle"
                onClick={selectAllTables}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: '2px solid #4ECDC4',
                  background: selectedTables.length === 10 ? '#4ECDC4' : 'transparent',
                  color: selectedTables.length === 10 ? '#1a1a2e' : '#4ECDC4',
                  fontWeight: 700, fontSize: "clamp(11px, 2.5vw, 14px)", cursor: 'pointer',
                }}
              >
                Alle tafels
              </button>
              <button
                className="table-toggle"
                onClick={selectEasyTables}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: '2px solid #FFE66D',
                  background: JSON.stringify(selectedTables) === JSON.stringify([1,2,5,10]) ? '#FFE66D' : 'transparent',
                  color: JSON.stringify(selectedTables) === JSON.stringify([1,2,5,10]) ? '#1a1a2e' : '#FFE66D',
                  fontWeight: 700, fontSize: "clamp(11px, 2.5vw, 14px)", cursor: 'pointer',
                }}
              >
                Makkelijk (1,2,5,10)
              </button>
            </div>

            {/* Table toggle grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
              gap: "clamp(4px, 1vw, 8px)", maxWidth: 350, margin: '0 auto',
            }}>
              {ALL_TABLES.map(table => {
                const isSelected = selectedTables.includes(table);
                const tableColors = ['#FF6B6B', '#FFA502', '#FFE66D', '#2ED573', '#4ECDC4', '#45B7D1', '#667eea', '#764ba2', '#DDA0DD', '#FF69B4'];
                const color = tableColors[table - 1];
                return (
                  <button
                    key={table}
                    className="table-toggle"
                    onClick={() => toggleTable(table)}
                    style={{
                      width: '100%', aspectRatio: '1.1',
                      borderRadius: 10, border: `3px solid ${color}`,
                      background: isSelected ? color : 'rgba(255,255,255,0.05)',
                      color: isSelected ? '#1a1a2e' : color,
                      fontWeight: 900, fontSize: "clamp(16px, 4vw, 24px)",
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Fredoka One', cursive",
                      boxShadow: isSelected ? `0 3px 12px ${color}66` : 'none',
                      opacity: isSelected ? 1 : 0.5,
                    }}
                  >
                    {table}
                  </button>
                );
              })}
            </div>
            <div style={{ textAlign: 'center', marginTop: 4, fontSize: "clamp(10px, 2vw, 12px)", color: '#8892b0' }}>
              {selectedTables.length} tafel{selectedTables.length !== 1 ? 's' : ''} geselecteerd
            </div>
          </div>

          {/* Settings sliders */}
          <div style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: 12,
            padding: "clamp(8px, 2vw, 14px)", marginBottom: "clamp(6px, 1vh, 10px)",
            width: '100%', maxWidth: 500, border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ fontSize: "clamp(11px, 2.2vw, 14px)", marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🛣️ Rijstroken: <strong>{lanes}</strong></span>
              <input type="range" min={LANES_MIN} max={LANES_MAX} value={lanes}
                onChange={e => setLanes(+e.target.value)}
                style={{ width: "clamp(80px, 20vw, 120px)", accentColor: '#4ECDC4' }} />
            </div>
            <div style={{ fontSize: "clamp(11px, 2.2vw, 14px)", marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>💨 Snelheid: <strong>{carSpeed}</strong></span>
              <input type="range" min={20} max={200} value={carSpeed}
                onChange={e => setCarSpeed(+e.target.value)}
                style={{ width: "clamp(80px, 20vw, 120px)", accentColor: '#FF6B6B' }} />
            </div>
            <div style={{ fontSize: "clamp(11px, 2.2vw, 14px)", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>⏱️ Interval: <strong>{gateInterval}s</strong></span>
              <input type="range" min={0} max={8} value={gateInterval}
                onChange={e => setGateInterval(+e.target.value)}
                style={{ width: "clamp(80px, 20vw, 120px)", accentColor: '#FFE66D' }} />
            </div>
          </div>

          {/* Start + Stats buttons side by side */}
          <div style={{ display: 'flex', gap: "clamp(8px, 2vw, 14px)", flexWrap: 'wrap', justifyContent: 'center', marginBottom: "clamp(6px, 1vh, 10px)" }}>
            <button
              className="start-btn"
              style={{
                fontSize: "clamp(18px, 4.5vw, 30px)",
                padding: "clamp(10px, 2vh, 14px) clamp(20px, 5vw, 40px)",
                borderRadius: 14, border: "none",
                background: "linear-gradient(135deg, #FF6B6B, #ee5a52, #FF4757)",
                color: "#fff", fontWeight: 700, cursor: "pointer",
                touchAction: "manipulation",
                boxShadow: "0 4px 20px rgba(255,75,75,0.4)",
                fontFamily: "'Fredoka One', cursive",
              }}
              onClick={startGame}
            >
              🏁 Start Race!
            </button>
            <button
              className="start-btn"
              style={{
                fontSize: "clamp(13px, 2.8vw, 18px)",
                padding: "clamp(8px, 1.5vh, 12px) clamp(14px, 3.5vw, 24px)",
                borderRadius: 14, border: "2px solid #4ECDC4",
                background: "rgba(78, 205, 196, 0.1)",
                color: "#4ECDC4", fontWeight: 700, cursor: "pointer",
                touchAction: "manipulation",
              }}
              onClick={goToStatistics}
            >
              📊 Stats
            </button>
          </div>

          {/* High Score Display */}
          {highScore > 0 && (
            <div style={{
              fontSize: "clamp(12px, 2.5vw, 16px)", marginBottom: "clamp(4px, 1vh, 8px)",
              color: "#ffd700", textAlign: "center", fontWeight: 700,
            }}>
              🏆 {currentPlayer}'s Record: {highScore}
            </div>
          )}

          {/* Recent Incorrect Answers */}
          {incorrectAnswers.length > 0 && (
            <div style={{
              background: "rgba(255,107,107,0.1)", borderRadius: 12,
              padding: "clamp(8px, 2vw, 12px)", maxWidth: 500, width: "100%",
              border: '1px solid rgba(255,107,107,0.2)', marginBottom: 6,
            }}>
              <h3 style={{ fontSize: "clamp(12px, 2.5vw, 15px)", color: "#FF6B6B", textAlign: "center", margin: '0 0 6px 0' }}>
                Oefenpuntjes van {currentPlayer} 📝
              </h3>
              <div style={{ maxHeight: "clamp(80px, 12vh, 150px)", overflowY: "auto", fontSize: "clamp(11px, 2.2vw, 14px)" }}>
                {incorrectAnswers.map((answer) => (
                  <div key={answer.id} style={{
                    background: "rgba(255,255,255,0.05)", margin: "4px 0", padding: "6px 10px",
                    borderRadius: 8, borderLeft: "3px solid #FF6B6B",
                  }}>
                    <div style={{ fontWeight: "bold" }}>
                      {answer.question} = {answer.correctAnswer}
                    </div>
                    <div style={{ fontSize: "clamp(10px, 2vw, 13px)", color: "#ffaaaa", marginTop: 1 }}>
                      Jouw antwoord: {answer.givenAnswer}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Repeats Info */}
          {pendingRepeats.length > 0 && (
            <div style={{
              background: "rgba(255,165,0,0.15)", borderRadius: 10,
              padding: "clamp(6px, 1.5vw, 10px)", maxWidth: 500, width: "100%",
              textAlign: "center", border: '1px solid rgba(255,165,0,0.2)',
            }}>
              <div style={{ fontSize: "clamp(11px, 2.2vw, 13px)", color: "#FFA502" }}>
                📝 {pendingRepeats.length} extra oefen-vraag{pendingRepeats.length !== 1 ? 'en' : ''} voor {currentPlayer}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas shadows camera={{ position: [0, 4.2, 12], fov: 60 }} style={{ width: "100vw", height: "100vh" }}>
        <Sky sunPosition={[100, 30, 100]} turbidity={3} rayleigh={0.5} distance={450} />
        <ambientLight intensity={0.6} color="#FFF8E7" />
        <directionalLight
          position={[10, 20, 10]} intensity={1.0} color="#FFFFFF"
          castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}
          shadow-camera-far={200} shadow-camera-left={-30} shadow-camera-right={30}
          shadow-camera-top={30} shadow-camera-bottom={-30}
        />
        <directionalLight position={[-10, 10, -5]} intensity={0.2} color="#87CEEB" />
        <hemisphereLight intensity={0.5} color="#87CEEB" groundColor="#4CAF50" />
        <fog attach="fog" args={['#B0D4F1', 60, 180]} />

        <WorldScrollUpdater phase={phase} actualCarSpeed={actualCarSpeed} />
        <CameraController phase={phase} />

        <CurvedRoad lanes={lanes} />
        <ScrollingScenery lanes={lanes} phase={phase} actualCarSpeed={actualCarSpeed} />

        <RoadFollower z={0}>
          <Car lane={carLane} laneX={laneX} lanes={lanes} invincible={invincible} />
        </RoadFollower>

        {answerBlocks.map((b) => (
          <RoadFollower key={b.id} z={b.z}>
            <AnswerBlock lane={b.lane} laneX={laneX} z={b.z} value={b.value} carLane={carLane} />
          </RoadFollower>
        ))}
        {obstacles.map((o) => (
          <RoadFollower key={o.id} z={o.z}>
            <ObstacleCar lane={o.lane} laneX={laneX} z={o.z} colorIndex={o.colorIndex} />
          </RoadFollower>
        ))}

        <GameLogic
          phase={phase} carLane={carLane} answerBlocks={answerBlocks} setAnswerBlocks={setAnswerBlocks}
          obstacles={obstacles} setObstacles={setObstacles} invincible={invincible} setInvincible={setInvincible}
          setInvStart={setInvStart} invStart={invStart} currentQuestion={currentQuestion} setCurrentQuestion={setCurrentQuestion}
          currentCorrect={currentCorrect} setCurrentCorrect={setCurrentCorrect} currentRepeatId={currentRepeatId}
          setCurrentRepeatId={setCurrentRepeatId} updateScore={updateScore} setLives={setLives} lives={lives}
          setPhase={setPhase} setShowGameOver={setShowGameOver} lanes={lanes} actualCarSpeed={actualCarSpeed}
          blockStartZ={blockStartZ} gateIntervalMs={gateIntervalMs} lastGateTime={lastGateTime}
          setLastGateTime={setLastGateTime}
          speedBoost={speedBoost} questionsAnswered={questionsAnswered} setQuestionsAnswered={setQuestionsAnswered}
          pendingRepeats={pendingRepeats} setPendingRepeats={setPendingRepeats} setIncorrectAnswers={setIncorrectAnswers}
          setRedFlash={setRedFlash} currentPlayer={currentPlayer} setGreenFlash={setGreenFlash}
          setShowCorrectAnswer={setShowCorrectAnswer} setCorrectAnswerDisplay={setCorrectAnswerDisplay}
          selectedTables={selectedTables} setShowConfetti={setShowConfetti}
          streak={streak} setStreak={setStreak} setShowStreak={setShowStreak}
          setEncouragement={setEncouragement} setShowCorrectConfirm={setShowCorrectConfirm}
        />

        <EffectComposer>
          <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.5} intensity={0.4} />
          <Vignette eskil={false} offset={0.1} darkness={0.4} />
        </EffectComposer>
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

  const generateAllQuestions = () => {
    const questions = [];
    for (let table = 1; table <= 10; table++) {
      for (let multiplier = 1; multiplier <= 10; multiplier++) {
        const question = `${table} × ${multiplier}`;
        const answer = table * multiplier;
        const stats = statistics[question] || { attempts: 0, mistakes: 0 };
        questions.push({
          question, answer, attempts: stats.attempts, mistakes: stats.mistakes,
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
      position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
      color: "#fff", fontSize: "clamp(14px, 2.5vw, 16px)",
      padding: "clamp(10px, 3vw, 20px)", overflowY: "auto", zIndex: 40,
      fontFamily: "'Nunito', sans-serif",
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          marginBottom: "clamp(16px, 3vh, 24px)", flexWrap: "wrap", gap: "12px"
        }}>
          <div style={{ flex: "1", minWidth: "250px" }}>
            <h1 style={{
              fontSize: "clamp(22px, 5vw, 32px)", marginBottom: 6, color: "#4ECDC4",
              lineHeight: 1.2, fontFamily: "'Fredoka One', cursive", margin: '0 0 6px 0',
            }}>
              📊 Statistieken - {currentPlayer}
            </h1>
            <div style={{ fontSize: "clamp(13px, 2.5vw, 16px)", color: "#8892b0" }}>
              {totalAttempts} pogingen | {totalMistakes} fouten | {overallSuccessRate}% correct
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              className="start-btn"
              style={{
                fontSize: "clamp(14px, 3vw, 18px)", padding: "8px 18px",
                borderRadius: 10, border: "2px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.05)", color: "#fff",
                fontWeight: 600, cursor: "pointer", touchAction: "manipulation",
              }}
              onClick={onBack}
            >
              ← Terug
            </button>
            <button
              className="start-btn"
              style={{
                fontSize: "clamp(14px, 3vw, 18px)", padding: "8px 18px",
                borderRadius: 10, border: "2px solid rgba(255,107,107,0.5)",
                background: "rgba(255,107,107,0.1)", color: "#FF6B6B",
                fontWeight: 600, cursor: "pointer", touchAction: "manipulation",
              }}
              onClick={handleReset}
            >
              🗑️ Reset
            </button>
          </div>
        </div>

        {/* Grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(11, 1fr)", gap: "2px",
          background: "rgba(255,255,255,0.1)", padding: "2px", borderRadius: 12,
          marginBottom: 16, fontSize: "clamp(10px, 2vw, 14px)",
        }}>
          <div style={{ background: "rgba(255,255,255,0.15)", padding: "clamp(4px, 1.5vw, 8px)", fontWeight: "bold", textAlign: "center",
            fontSize: "clamp(12px, 2.5vw, 14px)", display: "flex", alignItems: "center", justifyContent: "center",
            minHeight: "clamp(35px, 8vw, 60px)", borderRadius: '10px 0 0 0',
          }}>
            ×
          </div>
          {[1,2,3,4,5,6,7,8,9,10].map((num, i) => (
            <div key={num} style={{
              background: "rgba(255,255,255,0.15)", padding: "clamp(4px, 1.5vw, 8px)", fontWeight: "bold", textAlign: "center",
              fontSize: "clamp(12px, 2.5vw, 14px)", display: "flex", alignItems: "center", justifyContent: "center",
              minHeight: "clamp(35px, 8vw, 60px)", borderRadius: i === 9 ? '0 10px 0 0' : 0,
            }}>
              {num}
            </div>
          ))}

          {[1,2,3,4,5,6,7,8,9,10].map((table, ri) => (
            <React.Fragment key={table}>
              <div style={{
                background: "rgba(255,255,255,0.15)", padding: "clamp(4px, 1.5vw, 8px)", fontWeight: "bold", textAlign: "center",
                fontSize: "clamp(12px, 2.5vw, 14px)", display: "flex", alignItems: "center", justifyContent: "center",
                minHeight: "clamp(35px, 8vw, 60px)",
                borderRadius: ri === 9 ? '0 0 0 10px' : 0,
              }}>
                {table}
              </div>
              {[1,2,3,4,5,6,7,8,9,10].map((multiplier, ci) => {
                const question = `${table} × ${multiplier}`;
                const stats = statistics[question] || { attempts: 0, mistakes: 0 };
                const successRate = stats.attempts > 0 ? (stats.attempts - stats.mistakes) / stats.attempts : 1;

                let bgColor = "rgba(255,255,255,0.03)";
                if (stats.attempts > 0) {
                  if (successRate >= 0.9) bgColor = "rgba(46, 213, 115, 0.3)";
                  else if (successRate >= 0.7) bgColor = "rgba(255, 230, 77, 0.25)";
                  else if (successRate >= 0.5) bgColor = "rgba(255, 165, 2, 0.25)";
                  else bgColor = "rgba(255, 107, 107, 0.3)";
                }

                return (
                  <div key={multiplier} style={{
                    background: bgColor, padding: "clamp(2px, 1vw, 4px)", textAlign: "center",
                    fontSize: "clamp(10px, 2vw, 12px)", lineHeight: 1.1,
                    minHeight: "clamp(35px, 8vw, 60px)", display: "flex", flexDirection: "column",
                    justifyContent: "center", alignItems: "center",
                    borderRadius: (ri === 9 && ci === 9) ? '0 0 10px 0' : 0,
                  }}
                    title={`${question} = ${table * multiplier}\nPogingen: ${stats.attempts}\nFouten: ${stats.mistakes}`}
                  >
                    <div style={{ fontWeight: "bold", fontSize: "clamp(11px, 2.2vw, 14px)" }}>
                      {table * multiplier}
                    </div>
                    {stats.attempts > 0 && (
                      <>
                        <div style={{ fontSize: "clamp(8px, 1.5vw, 10px)", color: "#aaa" }}>{stats.attempts}×</div>
                        {stats.mistakes > 0 && (
                          <div style={{ fontSize: "clamp(8px, 1.5vw, 10px)", color: "#FF6B6B" }}>{stats.mistakes}✗</div>
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
          padding: "clamp(10px, 2.5vw, 14px)", background: "rgba(255,255,255,0.05)",
          borderRadius: 12, fontSize: "clamp(12px, 2.5vw, 14px)",
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <strong>Legenda:</strong>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginTop: 8 }}>
            {[
              { color: "rgba(255,255,255,0.03)", label: "Niet geprobeerd" },
              { color: "rgba(46, 213, 115, 0.3)", label: "90%+ correct" },
              { color: "rgba(255, 230, 77, 0.25)", label: "70-89% correct" },
              { color: "rgba(255, 165, 2, 0.25)", label: "50-69% correct" },
              { color: "rgba(255, 107, 107, 0.3)", label: "<50% correct" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 18, height: 18, background: item.color, borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }} />
                <span>{item.label}</span>
              </div>
            ))}
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
  lastGateTime, setLastGateTime,
  speedBoost, questionsAnswered, setQuestionsAnswered, pendingRepeats, setPendingRepeats,
  setIncorrectAnswers, setRedFlash, currentPlayer, setGreenFlash, setShowCorrectAnswer, setCorrectAnswerDisplay,
  selectedTables, setShowConfetti, streak, setStreak, setShowStreak,
  setEncouragement, setShowCorrectConfirm
}) {
  const lastObstacleSpawnTimeRef = useRef(0);
  const hitThisFrame = useRef(false);

  useFrame(() => {
    if (phase !== "play") return;
    const now = Date.now();
    hitThisFrame.current = false;

    setAnswerBlocks((blocks) =>
      blocks.map((b) => ({ ...b, z: b.z + actualCarSpeed })).filter((b) => b.z < 2)
    );

    answerBlocks.forEach((b) => {
      if (Math.abs(b.z) < 1.2 && b.lane === carLane && !invincible && !hitThisFrame.current && currentCorrect !== null) {
        if (b.value === currentCorrect) {
          updateScore(questionsAnswered + 1);
          setQuestionsAnswered(q => q + 1);
          updateStatistics(currentQuestion, true, currentPlayer);

          // Streak tracking
          setStreak(s => {
            const newStreak = s + 1;
            if (newStreak >= 3) {
              setShowStreak(true);
              setTimeout(() => setShowStreak(false), 1200);
            }
            if (newStreak >= 3 && newStreak % 3 === 0) {
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 2000);
            }
            return newStreak;
          });

          setGreenFlash(true);
          setTimeout(() => setGreenFlash(false), 200);

          // Show equation confirmation
          setShowCorrectConfirm(`${currentQuestion} = ${currentCorrect}`);
          setTimeout(() => setShowCorrectConfirm(null), 1200);

          // Encouraging message
          const messages = ['Super! ⭐', 'Goed zo! 🎉', 'Knap! 💪', 'Top! 🌟', 'Yes! 🏆', 'Wauw! ✨', 'Lekker! 🚀', 'Cool! 😎'];
          setEncouragement(messages[Math.floor(Math.random() * messages.length)]);
          setTimeout(() => setEncouragement(null), 1200);

          if (currentRepeatId) {
            removePendingRepeat(currentRepeatId, currentPlayer);
            setPendingRepeats(getPendingRepeats(currentPlayer));
          }
        } else {
          hitThisFrame.current = true;
          setLives((l) => l - 1);
          setInvincible(true);
          setInvStart(now);
          setStreak(0);

          updateStatistics(currentQuestion, false, currentPlayer);

          setRedFlash(true);
          setTimeout(() => setRedFlash(false), 200);

          setCorrectAnswerDisplay({ question: currentQuestion, answer: currentCorrect });
          setShowCorrectAnswer(true);
          setTimeout(() => setShowCorrectAnswer(false), 1500);

          addIncorrectAnswer(currentQuestion, currentCorrect, b.value, currentPlayer);
          setIncorrectAnswers(getIncorrectAnswers(currentPlayer));

          if (!currentRepeatId) {
            addPendingRepeat(currentQuestion, currentCorrect, currentPlayer);
            setPendingRepeats(getPendingRepeats(currentPlayer));
          }
        }

        setAnswerBlocks([]);
        setCurrentQuestion(null);
        setCurrentCorrect(null);
        setCurrentRepeatId(null);
      }
    });

    if (answerBlocks.length > 0 && answerBlocks.every(b => b.z > 2)) {
      setCurrentQuestion(null);
      setCurrentCorrect(null);
      setCurrentRepeatId(null);
    }

    setObstacles((obs) =>
      obs.map((o) => ({ ...o, z: o.z + actualCarSpeed })).filter((o) => o.z < 2)
    );

    obstacles.forEach((o) => {
      if (Math.abs(o.z) < 1.2 && o.lane === carLane && !invincible && !hitThisFrame.current) {
        const gateInSameLane = answerBlocks.find(gate => gate.lane === carLane);
        const protectionTime = 2000;
        const protectionDistance = actualCarSpeed * protectionTime / 16.67;

        let isProtected = false;
        if (gateInSameLane) {
          const distanceToGate = Math.abs(gateInSameLane.z);
          if (distanceToGate <= protectionDistance) isProtected = true;
        }

        if (!isProtected) {
          hitThisFrame.current = true;
          setLives((l) => l - 1);
          setInvincible(true);
          setInvStart(now);
          setStreak(0);
          setRedFlash(true);
          setTimeout(() => setRedFlash(false), 200);
        }

        setObstacles((obs) => obs.filter((obstacle) => obstacle.id !== o.id));
      }
    });

    if (invincible && now - invStart > INVINCIBILITY_TIME) {
      setInvincible(false);
    }

    // Check game over - use callback to read actual current lives value
    setLives(currentLives => {
      if (currentLives <= 0 && phase === "play") {
        setPhase("gameover");
        setShowGameOver(true);
      }
      return currentLives; // don't change, just read
    });
  });

  // Spawn new gates
  useEffect(() => {
    if (phase !== "play") return;
    const effectiveInterval = Math.max(gateIntervalMs, 100);
    const t = setInterval(() => {
      if (answerBlocks.length === 0) {
        const [q, c, opts, repeatId] = generateQuestion(lanes, questionsAnswered, getPendingRepeats(currentPlayer), selectedTables);
        setCurrentQuestion(q);
        setCurrentCorrect(c);
        setCurrentRepeatId(repeatId);
        setAnswerBlocks(opts.map((opt, i) => ({
          lane: i, z: blockStartZ, value: opt,
          id: Math.random().toString(36).slice(2),
          questionId: Date.now().toString(),
        })));
        setLastGateTime(Date.now());
      }
    }, effectiveInterval);
    return () => clearInterval(t);
  }, [phase, lanes, gateIntervalMs, blockStartZ, answerBlocks.length, questionsAnswered, currentPlayer, selectedTables]);

  // Obstacle spawning
  useEffect(() => {
    if (phase !== "play") return;
    const maxTrafficCars = Math.max(1, Math.floor(lanes / 2));
    const OBSTACLE_SPAWN_INTERVAL = 2500;
    const OBSTACLE_SPAWN_Z = blockStartZ;
    const OBSTACLE_RATE_COOLDOWN = 2000;
    const GATE_SPAWN_BUFFER = 2000;

    const t = setInterval(() => {
      const now = Date.now();
      if (now - lastObstacleSpawnTimeRef.current < OBSTACLE_RATE_COOLDOWN) return;
      if (now - lastGateTime < GATE_SPAWN_BUFFER) return;

      const effectiveGateSpawnInterval = Math.max(gateIntervalMs, 100);
      if (answerBlocks.length === 0 && effectiveGateSpawnInterval < GATE_SPAWN_BUFFER) return;

      setObstacles((currentObs) => {
        const activeCars = currentObs.filter((o) => o.z > OBSTACLE_SPAWN_Z - 50).length;
        if (activeCars >= maxTrafficCars) return currentObs;

        const availableLanes = [];
        for (let lane = 0; lane < lanes; lane++) {
          const occupied = currentObs.some(o => o.lane === lane && Math.abs(o.z - OBSTACLE_SPAWN_Z) < CAR_LENGTH * 3);
          if (!occupied) availableLanes.push(lane);
        }

        if (availableLanes.length > 0) {
          const selectedLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
          lastObstacleSpawnTimeRef.current = now;
          return [...currentObs, {
            lane: selectedLane, z: OBSTACLE_SPAWN_Z,
            id: Math.random().toString(36).slice(2),
            colorIndex: currentObs.length % 7,
          }];
        }
        return currentObs;
      });
    }, OBSTACLE_SPAWN_INTERVAL);
    return () => clearInterval(t);
  }, [phase, lanes, blockStartZ, gateIntervalMs, lastGateTime, answerBlocks.length]);

  return null;
}

// --- Road Component (improved) ---
// --- Camera Controller: height variation + curves ---
// --- Updates the module-level worldScroll every frame ---
function WorldScrollUpdater({ phase, actualCarSpeed }) {
  useFrame(() => {
    if (phase === "play") {
      worldScroll += actualCarSpeed;
    }
  });
  return null;
}

// --- Camera follows road offset at car position (z=0), very subtle ---
function CameraController({ phase }) {
  const { camera } = useThree();

  useFrame(() => {
    if (phase === "play") {
      const offset = getRoadOffset(0);
      // Camera follows road curve smoothly with slight lag
      camera.position.x += (offset.x - camera.position.x) * 0.04;
      camera.position.y += (4.2 + offset.y - camera.position.y) * 0.04;
      camera.position.z = 12;

      // Subtle tilt in curves
      const targetTilt = -offset.x * 0.008;
      camera.rotation.z += (targetTilt - camera.rotation.z) * 0.05;

    } else {
      camera.position.set(0, 4.2, 12);
      camera.rotation.z = 0;
    }
  });

  return null;
}

// --- RoadFollower: offsets children to follow road curve at given z ---
function RoadFollower({ z, children }) {
  const groupRef = useRef();

  useFrame(() => {
    if (groupRef.current) {
      const offset = getRoadOffset(z);
      groupRef.current.position.x = offset.x;
      groupRef.current.position.y = offset.y;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

// --- Road with scrolling lane markings ---
// --- Curved Road: segments that follow getRoadOffset ---
function CurvedRoad({ lanes }) {
  const roadWidth = lanes * 2.5 + 2;
  const roadHalf = roadWidth / 2;
  const segmentLength = 3;
  const segmentCount = 70;
  const startZ = 10;

  // Refs for each road segment group
  const segmentRefs = useRef([]);
  const curbRefs = useRef({ left: [], right: [] });
  const dashRefs = useRef([]);

  // Update segment positions every frame to follow road curve
  useFrame(() => {
    for (let i = 0; i < segmentCount; i++) {
      const z = startZ - i * segmentLength;
      const offset = getRoadOffset(z);
      const ref = segmentRefs.current[i];
      if (ref) {
        ref.position.x = offset.x;
        ref.position.y = offset.y - 0.4;
        ref.position.z = z;
      }
    }
    // Curb segments
    for (let i = 0; i < segmentCount; i++) {
      const z = startZ - i * segmentLength;
      const offset = getRoadOffset(z);
      if (curbRefs.current.left[i]) {
        curbRefs.current.left[i].position.set(offset.x - roadHalf + 0.15, offset.y - 0.28, z);
      }
      if (curbRefs.current.right[i]) {
        curbRefs.current.right[i].position.set(offset.x + roadHalf - 0.15, offset.y - 0.28, z);
      }
    }
    // Lane dash segments - scroll with worldScroll and wrap around
    const dashSpacing = 5;
    const dashRange = 40 * dashSpacing; // total range of dashes
    for (let d = 0; d < dashRefs.current.length; d++) {
      const ref = dashRefs.current[d];
      if (ref && ref.userData) {
        // Scroll dashes forward and wrap
        let z = ref.userData.baseZ + (worldScroll % dashSpacing);
        // Wrap into visible range
        while (z > startZ + dashSpacing) z -= dashRange;
        while (z < startZ - dashRange + dashSpacing) z += dashRange;
        const offset = getRoadOffset(z);
        ref.position.x = offset.x + ref.userData.laneX;
        ref.position.y = offset.y - 0.23;
        ref.position.z = z;
      }
    }
  });

  // Build lane dash list
  const dashes = useMemo(() => {
    const result = [];
    for (let lane = 0; lane < lanes - 1; lane++) {
      const lx = (lane - (lanes - 2) / 2) * 2.5;
      for (let j = 0; j < 40; j++) {
        result.push({ laneX: lx, baseZ: startZ - j * 5, id: `d${lane}_${j}` });
      }
    }
    return result;
  }, [lanes]);

  return (
    <group>
      {/* Road segments */}
      {Array.from({ length: segmentCount }).map((_, i) => (
        <mesh
          key={`seg${i}`}
          ref={el => segmentRefs.current[i] = el}
          receiveShadow
        >
          <boxGeometry args={[roadWidth, 0.3, segmentLength + 0.1]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#505050" : "#484848"} />
        </mesh>
      ))}

      {/* Curb segments - left */}
      {Array.from({ length: segmentCount }).map((_, i) => (
        <mesh
          key={`cl${i}`}
          ref={el => curbRefs.current.left[i] = el}
        >
          <boxGeometry args={[0.3, 0.2, segmentLength + 0.1]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#FF4757" : "#FFFFFF"} />
        </mesh>
      ))}

      {/* Curb segments - right */}
      {Array.from({ length: segmentCount }).map((_, i) => (
        <mesh
          key={`cr${i}`}
          ref={el => curbRefs.current.right[i] = el}
        >
          <boxGeometry args={[0.3, 0.2, segmentLength + 0.1]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#FF4757" : "#FFFFFF"} />
        </mesh>
      ))}

      {/* Lane dashes */}
      {dashes.map((d, idx) => (
        <mesh
          key={d.id}
          ref={el => {
            if (el) { el.userData = { laneX: d.laneX, baseZ: d.baseZ }; }
            dashRefs.current[idx] = el;
          }}
        >
          <boxGeometry args={[0.08, 0.01, 2]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.15} />
        </mesh>
      ))}

      {/* Grass on sides - large flat planes (static, far enough to not notice curve) */}
      <mesh position={[-(roadHalf + 20), -0.6, -90]} receiveShadow>
        <boxGeometry args={[40, 0.2, 240]} />
        <meshStandardMaterial color="#4CAF50" />
      </mesh>
      <mesh position={[(roadHalf + 20), -0.6, -90]} receiveShadow>
        <boxGeometry args={[40, 0.2, 240]} />
        <meshStandardMaterial color="#4CAF50" />
      </mesh>
    </group>
  );
}

// --- Scrolling Scenery: everything moves to create driving feeling ---
function ScrollingScenery({ lanes, phase, actualCarSpeed }) {
  const groupRef = useRef();
  const scrollOffset = useRef(0);
  const roadEdge = (lanes * 2.5 + 2) / 2 + 2;
  const LOOP_LENGTH = 200; // scenery loops every 200 units

  // Deterministic pseudo-random using seed
  const seededRandom = (seed) => {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  // Generate all scenery items with deterministic positions
  const sceneryItems = useMemo(() => {
    const trees = [];
    for (let i = 0; i < 40; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      trees.push({
        x: side * (roadEdge + 1 + seededRandom(i * 7 + 1) * 8),
        zBase: (i / 40) * LOOP_LENGTH,
        scale: 0.7 + seededRandom(i * 3 + 5) * 0.6,
        type: Math.floor(seededRandom(i * 11 + 3) * 3),
        id: `t${i}`,
      });
    }

    const flowers = [];
    for (let i = 0; i < 50; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const colors = ['#FF6B6B', '#FFE66D', '#DDA0DD', '#FF69B4', '#FFA07A', '#87CEEB'];
      flowers.push({
        x: side * (roadEdge + 0.5 + seededRandom(i * 13 + 7) * 10),
        zBase: (i / 50) * LOOP_LENGTH,
        color: colors[Math.floor(seededRandom(i * 17 + 2) * 6)],
        id: `f${i}`,
      });
    }

    const hills = [];
    for (let i = 0; i < 16; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      hills.push({
        x: side * (roadEdge + 5 + seededRandom(i * 19 + 4) * 12),
        zBase: (i / 16) * LOOP_LENGTH,
        scaleX: 4 + seededRandom(i * 23 + 1) * 6,
        scaleY: 1.5 + seededRandom(i * 29 + 3) * 2.5,
        scaleZ: 4 + seededRandom(i * 31 + 2) * 5,
        shade: i % 3,
        id: `h${i}`,
      });
    }

    const mountains = [];
    for (let i = 0; i < 10; i++) {
      // Place mountains far from road on alternating sides
      const side = i % 2 === 0 ? -1 : 1;
      const dist = 35 + seededRandom(i * 37 + 11) * 30;
      mountains.push({
        x: side * dist,
        zBase: (i / 10) * LOOP_LENGTH,
        height: 8 + seededRandom(i * 41 + 7) * 12,
        width: 6 + seededRandom(i * 43 + 5) * 8,
        id: `m${i}`,
      });
    }

    const clouds = [];
    for (let i = 0; i < 10; i++) {
      clouds.push({
        x: -30 + seededRandom(i * 47 + 3) * 60,
        y: 8 + seededRandom(i * 53 + 1) * 5,
        zBase: (i / 10) * LOOP_LENGTH,
        id: `c${i}`,
      });
    }

    return { trees, flowers, hills, mountains, clouds };
  }, [roadEdge]);

  // Wrap z position into visible range - items scroll TOWARD player (+z)
  const wrapZ = (zBase) => {
    let z = zBase + (scrollOffset.current % LOOP_LENGTH);
    if (z > LOOP_LENGTH / 2) z -= LOOP_LENGTH;
    if (z < -LOOP_LENGTH / 2) z += LOOP_LENGTH;
    return z - 80; // offset to center view
  };

  useFrame(() => {
    if (phase === "play") {
      scrollOffset.current += actualCarSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Mountains (scroll slowly for parallax) */}
      {sceneryItems.mountains.map(m => {
        const z = wrapZ(m.zBase) * 0.3 - 60; // slower parallax
        return (
          <group key={m.id} position={[m.x, -0.5, z]}>
            <mesh position={[0, m.height / 2, 0]} castShadow>
              <coneGeometry args={[m.width, m.height, 6]} />
              <meshStandardMaterial color="#6B7B8D" />
            </mesh>
            {m.height > 14 && (
              <mesh position={[0, m.height * 0.75, 0]}>
                <coneGeometry args={[m.width * 0.35, m.height * 0.3, 6]} />
                <meshStandardMaterial color="#E8EAF0" />
              </mesh>
            )}
            <mesh position={[m.width * 0.6, m.height * 0.3, m.width * 0.3]}>
              <coneGeometry args={[m.width * 0.5, m.height * 0.6, 5]} />
              <meshStandardMaterial color="#7B8D9E" />
            </mesh>
          </group>
        );
      })}

      {/* Hills */}
      {sceneryItems.hills.map(h => {
        const z = wrapZ(h.zBase);
        const roadOff = getRoadOffset(z);
        return (
          <mesh key={h.id} position={[h.x + roadOff.x, -0.5 + roadOff.y, z]} scale={[h.scaleX, h.scaleY, h.scaleZ]}>
            <sphereGeometry args={[1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={h.shade === 0 ? '#4CAF50' : h.shade === 1 ? '#43A047' : '#388E3C'} />
          </mesh>
        );
      })}

      {/* Trees */}
      {sceneryItems.trees.map(tree => {
        const z = wrapZ(tree.zBase);
        const roadOff = getRoadOffset(z);
        return (
          <group key={tree.id} position={[tree.x + roadOff.x, -0.4 + roadOff.y, z]} scale={tree.scale} castShadow>
            <mesh position={[0, 0.8, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.2, 1.6, 8]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>

            {tree.type === 0 && (
              <>
                <mesh position={[0, 2.0, 0]} castShadow>
                  <sphereGeometry args={[0.9, 12, 12]} />
                  <meshStandardMaterial color="#2ECC71" />
                </mesh>
                <mesh position={[0.3, 2.3, 0.2]}>
                  <sphereGeometry args={[0.5, 10, 10]} />
                  <meshStandardMaterial color="#27AE60" />
                </mesh>
              </>
            )}

            {tree.type === 1 && (
              <>
                <mesh position={[0, 2.2, 0]} castShadow>
                  <coneGeometry args={[0.8, 1.8, 8]} />
                  <meshStandardMaterial color="#27AE60" />
                </mesh>
                <mesh position={[0, 3.0, 0]}>
                  <coneGeometry args={[0.6, 1.3, 8]} />
                  <meshStandardMaterial color="#2ECC71" />
                </mesh>
                <mesh position={[0, 3.6, 0]}>
                  <coneGeometry args={[0.35, 0.9, 8]} />
                  <meshStandardMaterial color="#58D68D" />
                </mesh>
              </>
            )}

            {tree.type === 2 && (
              <>
                <mesh position={[-0.3, 1.8, 0]} castShadow>
                  <sphereGeometry args={[0.6, 10, 10]} />
                  <meshStandardMaterial color="#2ECC71" />
                </mesh>
                <mesh position={[0.3, 1.9, 0.2]}>
                  <sphereGeometry args={[0.65, 10, 10]} />
                  <meshStandardMaterial color="#27AE60" />
                </mesh>
                <mesh position={[0, 2.3, -0.1]}>
                  <sphereGeometry args={[0.55, 10, 10]} />
                  <meshStandardMaterial color="#58D68D" />
                </mesh>
              </>
            )}
          </group>
        );
      })}

      {/* Flowers */}
      {sceneryItems.flowers.map(flower => {
        const z = wrapZ(flower.zBase);
        return (
          <group key={flower.id} position={[flower.x + getRoadOffset(z).x, -0.35 + getRoadOffset(z).y, z]}>
            <mesh position={[0, 0.15, 0]}>
              <sphereGeometry args={[0.12, 8, 8]} />
              <meshStandardMaterial color={flower.color} />
            </mesh>
            <mesh position={[0, 0.05, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.15, 4]} />
              <meshStandardMaterial color="#27AE60" />
            </mesh>
          </group>
        );
      })}

      {/* Clouds (very slow parallax) */}
      {sceneryItems.clouds.map(c => {
        const z = wrapZ(c.zBase) * 0.15 - 40; // very slow
        return (
          <group key={c.id} position={[c.x, c.y, z]}>
            <mesh>
              <sphereGeometry args={[1.5, 10, 10]} />
              <meshStandardMaterial color="#FFFFFF" transparent opacity={0.85} />
            </mesh>
            <mesh position={[1.2, -0.2, 0]}>
              <sphereGeometry args={[1.0, 10, 10]} />
              <meshStandardMaterial color="#FFFFFF" transparent opacity={0.85} />
            </mesh>
            <mesh position={[-1.1, -0.1, 0.3]}>
              <sphereGeometry args={[1.2, 10, 10]} />
              <meshStandardMaterial color="#FFFFFF" transparent opacity={0.85} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// --- Answer Block Component (improved) ---
function AnswerBlock({ lane, laneX, z, value, carLane }) {
  const groupRef = useRef();
  const hideLabel = z > -2 && z < 2 && lane === carLane;

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  // Colorful answer blocks - replaced yellow with darker gold, all colors have good contrast
  const blockColors = [
    { bg: '#FF6B6B', text: '#fff' },   // red
    { bg: '#E67E22', text: '#fff' },   // orange
    { bg: '#D4A017', text: '#1a1a2e' }, // dark gold (was yellow - now readable)
    { bg: '#2ED573', text: '#1a1a2e' }, // green
    { bg: '#4ECDC4', text: '#1a1a2e' }, // teal
    { bg: '#3B82F6', text: '#fff' },   // blue
    { bg: '#667eea', text: '#fff' },   // indigo
    { bg: '#764ba2', text: '#fff' },   // purple
    { bg: '#E056A0', text: '#fff' },   // pink
    { bg: '#EF4444', text: '#fff' },   // bright red
  ];
  const { bg: color, text: textColor } = blockColors[lane % blockColors.length];

  return (
    <group position={[laneX(lane), 0.4, z]}>
      {/* Floating platform */}
      <mesh>
        <boxGeometry args={[1.2, 0.15, 1.2]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.5} />
      </mesh>
      {/* Top surface glow */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[1.0, 0.02, 1.0]} />
        <meshStandardMaterial color="#FFFFFF" transparent opacity={0.4} />
      </mesh>
      {/* Star decoration on top */}
      <group ref={groupRef} position={[0, 0.35, 0]}>
        <mesh>
          <octahedronGeometry args={[0.2, 0]} />
          <meshStandardMaterial color="#FFE66D" emissive="#FFE66D" emissiveIntensity={0.3} />
        </mesh>
      </group>

      {!hideLabel && (
        <Html center distanceFactor={8} style={{
          background: color,
          color: textColor,
          fontWeight: 900,
          fontSize: 200,
          borderRadius: 12,
          padding: "8px 20px",
          border: `3px solid ${textColor === '#fff' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)'}`,
          boxShadow: `0 4px 15px ${color}88`,
          pointerEvents: "none",
          fontFamily: "'Fredoka One', cursive",
          textShadow: textColor === '#fff' ? '0 2px 4px rgba(0,0,0,0.3)' : 'none',
        }}>
          {value}
        </Html>
      )}
    </group>
  );
}

export default TafelRaceGame;
