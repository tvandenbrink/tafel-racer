import React, { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Sky, OrbitControls } from "@react-three/drei";

// --- Constants ---
const CAR_SPEED = 0.05;
const OBSTACLE_INTERVAL = 3000;
const INVINCIBILITY_TIME = 2000;
const COUNTDOWN_START = 3;
const BLOCK_START_Z = -60;
const LANES_MIN = 2;
const LANES_MAX = 10;
const ROAD_COLOR = "#777";
const REPEAT_AFTER_QUESTIONS = 5; // Repeat incorrect answers after this many questions

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
  bottom: 40,
  left: "50%",
  transform: "translateX(-50%)",
  background: "#fff",
  color: "#000",
  fontSize: 40,
  border: "4px solid #ff4141",
  borderRadius: 12,
  padding: "16px 40px",
  fontWeight: 700,
  zIndex: 10,
  boxShadow: "0 2px 16px #0002",
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
  const [lanes, setLanes] = useState(6); // Changed from 4 to 6
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
      <div style={HUD_STYLE}>
        Speler: {currentPlayer} &nbsp;|&nbsp; Score: {score} &nbsp;|&nbsp; Lives: {lives}
        <br />
        High Score: {highScore}
      </div>
      
      {/* Show current question only when there are active gates */}
      {phase === "play" && currentQuestion && answerBlocks.length > 0 && (
        <div style={SOM_STYLE}>{currentQuestion}</div>
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
          <div style={{ display: "flex", gap: "20px" }}>
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
          fontSize: 32,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          zIndex: 40,
          padding: "20px",
          overflowY: "auto",
        }}>
          <div style={{ marginBottom: 40 }}>Tafel Race Game</div>
          
          {/* Player Selection */}
          <div style={{ fontSize: 28, marginBottom: 30, textAlign: "center" }}>
            <div style={{ marginBottom: 15 }}>Kies speler:</div>
            <div style={{ display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                style={{
                  fontSize: 24,
                  padding: "12px 30px",
                  borderRadius: 10,
                  border: "3px solid #ff4141",
                  background: currentPlayer === 'Floris' ? "#ff4141" : "transparent",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => handlePlayerChange('Floris')}
              >
                👦 Floris
              </button>
              <button
                style={{
                  fontSize: 24,
                  padding: "12px 30px",
                  borderRadius: 10,
                  border: "3px solid #ff4141",
                  background: currentPlayer === 'Esmee' ? "#ff4141" : "transparent",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => handlePlayerChange('Esmee')}
              >
                👧 Esmee
              </button>
              <button
                style={{
                  fontSize: 24,
                  padding: "12px 30px",
                  borderRadius: 10,
                  border: "3px solid #ff4141",
                  background: currentPlayer === 'Tim' ? "#ff4141" : "transparent",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => handlePlayerChange('Tim')}
              >
                👨‍🦳 Tim
              </button>
            </div>
          </div>
          
          <div style={{ fontSize: 22, marginBottom: 20 }}>
            Aantal rijstroken: {lanes}
            <input
              type="range"
              min={LANES_MIN}
              max={LANES_MAX}
              value={lanes}
              onChange={e => setLanes(+e.target.value)}
              style={{ marginLeft: 12, width: 150 }}
            />
          </div>
          
          <div style={{ fontSize: 22, marginBottom: 20 }}>
            Snelheid: {carSpeed}
            <input
              type="range"
              min={20}
              max={200}
              value={carSpeed}
              onChange={e => setCarSpeed(+e.target.value)}
              style={{ marginLeft: 12, width: 150 }}
            />
          </div>
          
          <div style={{ fontSize: 22, marginBottom: 30 }}>
            Poorten interval: {gateInterval}s
            <input
              type="range"
              min={2}
              max={8}
              value={gateInterval}
              onChange={e => setGateInterval(+e.target.value)}
              style={{ marginLeft: 12, width: 150 }}
            />
          </div>
          
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
              marginBottom: 20,
            }}
            onClick={startGame}
          >
            Start ({currentPlayer})
          </button>

          <button
            style={{
              fontSize: 24,
              padding: "10px 30px",
              borderRadius: 10,
              border: "2px solid #4CAF50",
              background: "transparent",
              color: "#4CAF50",
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 40,
            }}
            onClick={goToStatistics}
          >
            📊 Statistieken ({currentPlayer})
          </button>

          {/* High Score Display */}
          <div style={{ 
            fontSize: 24, 
            marginBottom: 30,
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
              padding: 20,
              maxWidth: "600px",
              width: "100%",
            }}>
              <h3 style={{ 
                fontSize: 20, 
                marginBottom: 15, 
                color: "#ff6b6b",
                textAlign: "center" 
              }}>
                {currentPlayer}'s Fouten (Laatste 10)
              </h3>
              
              <div style={{ 
                maxHeight: "300px", 
                overflowY: "auto",
                fontSize: 16,
              }}>
                {incorrectAnswers.map((answer, index) => (
                  <div key={answer.id} style={{
                    background: "rgba(255,255,255,0.05)",
                    margin: "5px 0",
                    padding: "10px",
                    borderRadius: 5,
                    borderLeft: "3px solid #ff6b6b",
                  }}>
                    <div style={{ fontWeight: "bold" }}>
                      {answer.question} = {answer.correctAnswer}
                    </div>
                    <div style={{ 
                      fontSize: 14, 
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
              padding: 15,
              marginTop: 20,
              maxWidth: "600px",
              width: "100%",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 16, color: "#ffa500" }}>
                📝 {pendingRepeats.length} vraag{pendingRepeats.length !== 1 ? 'en' : ''} worden herhaald voor {currentPlayer}
              </div>
              <div style={{ fontSize: 14, color: "#ffcc99", marginTop: 5 }}>
                Foutieve antwoorden komen terug na elke {REPEAT_AFTER_QUESTIONS} vragen
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 7, 12], fov: 60 }} style={{ width: "100vw", height: "100vh" }}>
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
          bufferTime={bufferTime}
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
      fontSize: 16,
      padding: "20px",
      overflowY: "auto",
      zIndex: 40,
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: 30,
          flexWrap: "wrap",
          gap: "20px"
        }}>
          <div>
            <h1 style={{ fontSize: 36, marginBottom: 10, color: "#4CAF50" }}>
              📊 Statistieken - {currentPlayer}
            </h1>
            <div style={{ fontSize: 18, color: "#ccc" }}>
              Totaal: {totalAttempts} pogingen | {totalMistakes} fouten | {overallSuccessRate}% correct
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "15px" }}>
            <button
              style={{
                fontSize: 20,
                padding: "10px 25px",
                borderRadius: 8,
                border: "2px solid #666",
                background: "transparent",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={onBack}
            >
              ← Terug
            </button>
            <button
              style={{
                fontSize: 20,
                padding: "10px 25px",
                borderRadius: 8,
                border: "2px solid #ff4444",
                background: "transparent",
                color: "#ff4444",
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={handleReset}
            >
              🗑️ Reset
            </button>
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
          gap: "2px",
          background: "#333",
          padding: "2px",
          borderRadius: 8,
        }}>
          {/* Header row */}
          <div style={{ 
            background: "#555", 
            padding: "8px", 
            fontWeight: "bold", 
            textAlign: "center",
            fontSize: 14
          }}>
            ×
          </div>
          {[1,2,3,4,5,6,7,8,9,10].map(num => (
            <div key={num} style={{ 
              background: "#555", 
              padding: "8px", 
              fontWeight: "bold", 
              textAlign: "center",
              fontSize: 14
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
                padding: "8px", 
                fontWeight: "bold", 
                textAlign: "center",
                fontSize: 14
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
                      padding: "8px 4px",
                      textAlign: "center",
                      fontSize: 12,
                      lineHeight: 1.2,
                      minHeight: "60px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center"
                    }}
                    title={`${question} = ${table * multiplier}\nPogingen: ${stats.attempts}\nFouten: ${stats.mistakes}\nSucces: ${stats.attempts > 0 ? (successRate * 100).toFixed(1) : 0}%`}
                  >
                    <div style={{ fontWeight: "bold", fontSize: 14 }}>
                      {table * multiplier}
                    </div>
                    {stats.attempts > 0 && (
                      <>
                        <div style={{ fontSize: 10, color: "#ccc" }}>
                          {stats.attempts}×
                        </div>
                        {stats.mistakes > 0 && (
                          <div style={{ fontSize: 10, color: "#ff6666" }}>
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

        <div style={{ 
          marginTop: 20, 
          padding: 15, 
          background: "rgba(255,255,255,0.1)", 
          borderRadius: 8,
          fontSize: 14 
        }}>
          <strong>Legenda:</strong>
          <div style={{ display: "flex", gap: "20px", marginTop: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: 20, height: 20, background: "#222", borderRadius: 3 }}></div>
              Niet geprobeerd
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: 20, height: 20, background: "#2d5a2d", borderRadius: 3 }}></div>
              90%+ correct
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: 20, height: 20, background: "#5a5a2d", borderRadius: 3 }}></div>
              70-89% correct
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: 20, height: 20, background: "#5a4a2d", borderRadius: 3 }}></div>
              50-69% correct
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: 20, height: 20, background: "#5a2d2d", borderRadius: 3 }}></div>
              &lt;50% correct
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
          z: blockStartZ,
          value: opt,
          id: Math.random().toString(36).slice(2),
          questionId: Date.now().toString(),
        }));
        
        setAnswerBlocks(newBlocks);
        setLastGateTime(Date.now());
      }
    }, effectiveInterval);
    
    return () => clearInterval(t);
  }, [phase, lanes, gateIntervalMs, blockStartZ, answerBlocks.length, questionsAnswered, currentPlayer]);

  // Fixed obstacle spawning - simplified and more reliable
  useEffect(() => {
    if (phase !== "play") return;
    
    const maxTrafficCars = Math.max(1, Math.floor(lanes / 2));
    const SPAWN_INTERVAL = 3000; // Increased to 3 seconds for better visibility
    
    const t = setInterval(() => {
      setObstacles((obs) => {
        // Count active obstacles (those still visible)
        const activeCars = obs.filter((o) => o.z > -100).length;
        
        if (activeCars < maxTrafficCars) {
          const newLane = Math.floor(Math.random() * lanes);
          const obstacleSpawnZ = -80;
          
          // Simple check: don't spawn if there's already a car in this lane nearby
          const conflictingCar = obs.find((car) => 
            car.lane === newLane && Math.abs(car.z - obstacleSpawnZ) < 20
          );
          
          if (!conflictingCar) {
            console.log(`Spawning traffic car in lane ${newLane} at z=${obstacleSpawnZ}`); // Enhanced debug log
            return [
              ...obs,
              {
                lane: newLane,
                z: obstacleSpawnZ,
                id: Math.random().toString(36).slice(2),
                colorIndex: obs.length % 5, // Alternating color index (0-4)
              },
            ];
          }
        }
        return obs;
      });
    }, SPAWN_INTERVAL);
    
    return () => clearInterval(t);
  }, [phase, lanes]); // Removed answerBlocks dependency

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
      {/* Road base - wider to accommodate proper lane spacing */}
      <mesh position={[0, 0, -60]} receiveShadow>
        <boxGeometry args={[lanes * 2.5 + 2, 0.3, 130]} />
        <meshStandardMaterial color={ROAD_COLOR} />
      </mesh>
      {/* Lane separator lines - adjusted for new spacing */}
      {Array.from({ length: lanes - 1 }).map((_, i) => (
        <mesh key={i} position={[(i - (lanes - 2) / 2) * 2.5, 0.151, -60]}>
          <boxGeometry args={[0.05, 0.01, 130]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
      ))}
    </group>
  );
}

// --- Car Component ---
function Car({ lane, laneX, lanes, invincible }) {
  const ref = useRef();
  const [wiggle, setWiggle] = useState(0);
  
  useFrame((_, delta) => {
    if (invincible) {
      setWiggle((w) => w + delta * 16);
      if (ref.current) {
        ref.current.material.opacity = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() / 80));
        ref.current.rotation.z = 0.15 * Math.sin(wiggle);
      }
    } else {
      setWiggle(0);
      if (ref.current) {
        ref.current.material.opacity = 1;
        ref.current.rotation.z = 0;
      }
    }
  });

  return (
    <group position={[laneX(lane), 0, 0]}>
      {/* Main car body - lower and wider */}
      <mesh ref={ref} position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[1.6, 0.5, 2.4]} />
        <meshStandardMaterial color="#e74c3c" transparent metalness={0.3} roughness={0.4} />
      </mesh>
      
      {/* Car roof/cabin - more realistic proportions */}
      <mesh position={[0, 0.75, -0.1]} castShadow>
        <boxGeometry args={[1.3, 0.4, 1.6]} />
        <meshStandardMaterial color="#c0392b" metalness={0.2} roughness={0.5} />
      </mesh>
      
      {/* Hood */}
      <mesh position={[0, 0.38, 0.8]} castShadow>
        <boxGeometry args={[1.5, 0.08, 0.8]} />
        <meshStandardMaterial color="#e74c3c" metalness={0.3} roughness={0.4} />
      </mesh>
      
      {/* Trunk */}
      <mesh position={[0, 0.38, -1.0]} castShadow>
        <boxGeometry args={[1.5, 0.08, 0.6]} />
        <meshStandardMaterial color="#e74c3c" metalness={0.3} roughness={0.4} />
      </mesh>
      
      {/* Front bumper */}
      <mesh position={[0, 0.2, 1.3]} castShadow>
        <boxGeometry args={[1.4, 0.25, 0.15]} />
        <meshStandardMaterial color="#2c3e50" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Rear bumper */}
      <mesh position={[0, 0.2, -1.3]} castShadow>
        <boxGeometry args={[1.4, 0.25, 0.15]} />
        <meshStandardMaterial color="#2c3e50" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Front headlights - larger and more detailed */}
      <mesh position={[0.6, 0.32, 1.25]} castShadow>
        <cylinderGeometry args={[0.18, 0.15, 0.12, 8]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#f8f9fa" emissive="#ffffff" emissiveIntensity={0.3} metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[-0.6, 0.32, 1.25]} castShadow>
        <cylinderGeometry args={[0.18, 0.15, 0.12, 8]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#f8f9fa" emissive="#ffffff" emissiveIntensity={0.3} metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Headlight inner reflectors */}
      <mesh position={[0.6, 0.32, 1.2]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.05, 6]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-0.6, 0.32, 1.2]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.05, 6]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Rear lights - more detailed */}
      <mesh position={[0.55, 0.32, -1.25]} castShadow>
        <boxGeometry args={[0.25, 0.15, 0.08]} />
        <meshStandardMaterial color="#dc3545" emissive="#ff0000" emissiveIntensity={0.2} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.55, 0.32, -1.25]} castShadow>
        <boxGeometry args={[0.25, 0.15, 0.08]} />
        <meshStandardMaterial color="#dc3545" emissive="#ff0000" emissiveIntensity={0.2} metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Turn signals */}
      <mesh position={[0.7, 0.32, 1.15]} castShadow>
        <boxGeometry args={[0.15, 0.1, 0.06]} />
        <meshStandardMaterial color="#ffa500" emissive="#ff8c00" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[-0.7, 0.32, 1.15]} castShadow>
        <boxGeometry args={[0.15, 0.1, 0.06]} />
        <meshStandardMaterial color="#ffa500" emissive="#ff8c00" emissiveIntensity={0.1} />
      </mesh>
      
      {/* Windshield - angled */}
      <mesh position={[0, 0.78, 0.5]} rotation={[-0.1, 0, 0]} castShadow>
        <boxGeometry args={[1.25, 0.35, 0.04]} />
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.8} metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Rear window - angled */}
      <mesh position={[0, 0.78, -0.7]} rotation={[0.15, 0, 0]} castShadow>
        <boxGeometry args={[1.25, 0.3, 0.04]} />
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.8} metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Side windows */}
      <mesh position={[0.68, 0.73, 0]} rotation={[0, 0, 0.1]} castShadow>
        <boxGeometry args={[0.04, 0.25, 1.2]} />
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.8} />
      </mesh>
      <mesh position={[-0.68, 0.73, 0]} rotation={[0, 0, -0.1]} castShadow>
        <boxGeometry args={[0.04, 0.25, 1.2]} />
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.8} />
      </mesh>
      
      {/* Side mirrors - more detailed */}
      <mesh position={[0.82, 0.65, 0.3]} castShadow>
        <boxGeometry args={[0.06, 0.04, 0.08]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      <mesh position={[-0.82, 0.65, 0.3]} castShadow>
        <boxGeometry args={[0.06, 0.04, 0.08]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      
      {/* Mirror glass */}
      <mesh position={[0.85, 0.65, 0.3]} castShadow>
        <boxGeometry args={[0.02, 0.03, 0.05]} />
        <meshStandardMaterial color="#87ceeb" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[-0.85, 0.65, 0.3]} castShadow>
        <boxGeometry args={[0.02, 0.03, 0.05]} />
        <meshStandardMaterial color="#87ceeb" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Door handles */}
      <mesh position={[0.78, 0.45, 0.2]} castShadow>
        <boxGeometry args={[0.03, 0.02, 0.08]} />
        <meshStandardMaterial color="#2c3e50" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.78, 0.45, 0.2]} castShadow>
        <boxGeometry args={[0.03, 0.02, 0.08]} />
        <meshStandardMaterial color="#2c3e50" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Wheels - front, more detailed with better proportions */}
      <mesh position={[0.7, 0.12, 0.9]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.18, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
      <mesh position={[-0.7, 0.12, 0.9]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.18, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
      
      {/* Wheels - rear */}
      <mesh position={[0.7, 0.12, -0.9]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.18, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
      <mesh position={[-0.7, 0.12, -0.9]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.18, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
      
      {/* Alloy wheel rims - front */}
      <mesh position={[0.7, 0.12, 0.9]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.19, 8]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.7, 0.12, 0.9]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.19, 8]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Alloy wheel rims - rear */}
      <mesh position={[0.7, 0.12, -0.9]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.19, 8]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.7, 0.12, -0.9]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.19, 8]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Brake discs */}
      <mesh position={[0.7, 0.12, 0.9]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.02, 16]} />
        <meshStandardMaterial color="#444444" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[-0.7, 0.12, 0.9]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.02, 16]} />
        <meshStandardMaterial color="#444444" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0.7, 0.12, -0.9]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.02, 16]} />
        <meshStandardMaterial color="#444444" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[-0.7, 0.12, -0.9]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.02, 16]} />
        <meshStandardMaterial color="#444444" metalness={0.9} roughness={0.3} />
      </mesh>
      
      {/* Front grille - more detailed */}
      <mesh position={[0, 0.38, 1.28]} castShadow>
        <boxGeometry args={[0.9, 0.25, 0.04]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Grille horizontal slats */}
      <mesh position={[0, 0.42, 1.29]} castShadow>
        <boxGeometry args={[0.8, 0.02, 0.02]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0, 0.38, 1.29]} castShadow>
        <boxGeometry args={[0.8, 0.02, 0.02]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0, 0.34, 1.29]} castShadow>
        <boxGeometry args={[0.8, 0.02, 0.02]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      
      {/* License plate holder */}
      <mesh position={[0, 0.25, 1.32]} castShadow>
        <boxGeometry args={[0.3, 0.08, 0.02]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Exhaust pipe */}
      <mesh position={[0.4, 0.08, -1.35]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
        <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.3} />
      </mesh>
      
      {/* Side skirts */}
      <mesh position={[0.82, 0.15, 0]} castShadow>
        <boxGeometry args={[0.04, 0.1, 2.0]} />
        <meshStandardMaterial color="#c0392b" metalness={0.2} roughness={0.5} />
      </mesh>
      <mesh position={[-0.82, 0.15, 0]} castShadow>
        <boxGeometry args={[0.04, 0.1, 2.0]} />
        <meshStandardMaterial color="#c0392b" metalness={0.2} roughness={0.5} />
      </mesh>
    </group>
  );
}

// --- Answer Block Component ---
function AnswerBlock({ lane, laneX, z, value, carLane }) {
  // Hide label if block is in front of car (z between -2 and 2) and in same lane
  const hideLabel = z > -2 && z < 2 && lane === carLane;
  
  return (
    <group position={[laneX(lane), 0.5, z]}>
      <mesh>
        <boxGeometry args={[1.08, 0.63, 1.08]} /> {/* 10% smaller: 1.2->1.08, 0.7->0.63 */}
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

// --- Obstacle Car Component ---
function ObstacleCar({ lane, laneX, z, colorIndex = 0 }) {
  // Simplified alternating color palette - 5 distinct colors
  const colors = [
    "#2c3e50", // Dark blue-gray
    "#e74c3c", // Red
    "#3498db", // Blue
    "#27ae60", // Green
    "#f39c12", // Orange
  ];
  
  // Use the provided colorIndex to ensure consistent color
  const carColor = colors[colorIndex % colors.length];
  const roofColor = carColor === "#f39c12" ? "#e67e22" : carColor; // Slightly darker orange roof

  return (
    <group position={[laneX(lane), 0, z]}>
      {/* Main car body */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[1.4, 0.6, 2.2]} />
        <meshStandardMaterial color={carColor} metalness={0.2} roughness={0.6} />
      </mesh>
      
      {/* Car roof/cabin */}
      <mesh position={[0, 0.9, -0.2]} castShadow>
        <boxGeometry args={[1.2, 0.5, 1.4]} />
        <meshStandardMaterial color={roofColor} metalness={0.1} roughness={0.7} />
      </mesh>
      
      {/* Front bumper */}
      <mesh position={[0, 0.25, 1.2]} castShadow>
        <boxGeometry args={[1.3, 0.3, 0.2]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      
      {/* Rear bumper */}
      <mesh position={[0, 0.25, -1.2]} castShadow>
        <boxGeometry args={[1.3, 0.3, 0.2]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      
      {/* Front headlights */}
      <mesh position={[0.5, 0.35, 1.15]} castShadow>
        <boxGeometry args={[0.25, 0.15, 0.1]} />
        <meshStandardMaterial color="#f8f9fa" emissive="#ffffff" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[-0.5, 0.35, 1.15]} castShadow>
        <boxGeometry args={[0.25, 0.15, 0.1]} />
        <meshStandardMaterial color="#f8f9fa" emissive="#ffffff" emissiveIntensity={0.1} />
      </mesh>
      
      {/* Rear lights */}
      <mesh position={[0.5, 0.35, -1.15]} castShadow>
        <boxGeometry args={[0.2, 0.12, 0.1]} />
        <meshStandardMaterial color="#dc3545" emissive="#ff0000" emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[-0.5, 0.35, -1.15]} castShadow>
        <boxGeometry args={[0.2, 0.12, 0.1]} />
        <meshStandardMaterial color="#dc3545" emissive="#ff0000" emissiveIntensity={0.05} />
      </mesh>
      
      {/* Windshield */}
      <mesh position={[0, 0.85, 0.4]} castShadow>
        <boxGeometry args={[1.1, 0.4, 0.05]} />
        <meshStandardMaterial color="#17a2b8" transparent opacity={0.6} />
      </mesh>
      
      {/* Rear window */}
      <mesh position={[0, 0.85, -0.8]} castShadow>
        <boxGeometry args={[1.1, 0.35, 0.05]} />
        <meshStandardMaterial color="#17a2b8" transparent opacity={0.6} />
      </mesh>
      
      {/* Side mirrors */}
      <mesh position={[0.75, 0.75, 0.2]} castShadow>
        <boxGeometry args={[0.08, 0.06, 0.12]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      <mesh position={[-0.75, 0.75, 0.2]} castShadow>
        <boxGeometry args={[0.08, 0.06, 0.12]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      
      {/* Wheels - front */}
      <mesh position={[0.6, 0.15, 0.8]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.15, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.6, 0.15, 0.8]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.15, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Wheels - rear */}
      <mesh position={[0.6, 0.15, -0.8]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.15, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.6, 0.15, -0.8]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.15, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Wheel rims - front */}
      <mesh position={[0.6, 0.15, 0.8]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.16, 8]} />
        <meshStandardMaterial color="#6c757d" />
      </mesh>
      <mesh position={[-0.6, 0.15, 0.8]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.16, 8]} />
        <meshStandardMaterial color="#6c757d" />
      </mesh>
      
      {/* Wheel rims - rear */}
      <mesh position={[0.6, 0.15, -0.8]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.16, 8]} />
        <meshStandardMaterial color="#6c757d" />
      </mesh>
      <mesh position={[-0.6, 0.15, -0.8]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.16, 8]} />
        <meshStandardMaterial color="#6c757d" />
      </mesh>
      
      {/* License plate */}
      <mesh position={[0, 0.25, 1.32]} castShadow>
        <boxGeometry args={[0.3, 0.08, 0.02]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Exhaust pipe */}
      <mesh position={[0.4, 0.08, -1.35]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
        <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.3} />
      </mesh>
      
      {/* Side skirts */}
      <mesh position={[0.82, 0.15, 0]} castShadow>
        <boxGeometry args={[0.04, 0.1, 2.0]} />
        <meshStandardMaterial color="#c0392b" metalness={0.2} roughness={0.5} />
      </mesh>
      <mesh position={[-0.82, 0.15, 0]} castShadow>
        <boxGeometry args={[0.04, 0.1, 2.0]} />
        <meshStandardMaterial color="#c0392b" metalness={0.2} roughness={0.5} />
      </mesh>
    </group>
  );
}

export default TafelRaceGame;
