import React, { useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

// Test GameLogic component
const TestGameLogic = () => {
  useFrame((state, delta) => {
    // Simple test of useFrame
    // console.log('Frame update:', Date.now());
  });
  
  return null;
};

// Minimal version to test basic structure
const TafelRaceGameMinimal = () => {
  const [gameState, setGameState] = useState('settings');

  const startGame = () => {
    setGameState('playing');
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {gameState === 'settings' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '40px',
          borderRadius: '10px',
          textAlign: 'center',
          zIndex: 1000
        }}>
          <h1>Tafel Race Game - Minimal Test</h1>
          <button
            onClick={startGame}
            style={{
              fontSize: '24px',
              padding: '15px 30px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Start Game
          </button>
        </div>
      )}
      
      {gameState === 'playing' && (        <Canvas camera={{ position: [0, 5, 8], fov: 75 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={'orange'} />
          </mesh>
          <Text
            position={[0, 2, 0]}
            fontSize={1}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            Test Text
          </Text>
          <TestGameLogic />
        </Canvas>
      )}
    </div>
  );
};

export default TafelRaceGameMinimal;
