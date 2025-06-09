import React from 'react';

// Test importing TafelRaceGame without Three.js imports first
const TestImport = () => {
  try {
    // Try to import TafelRaceGame
    console.log('Testing import...');
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: '#333', 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px'
      }}>
        Basic React component is working. Now testing TafelRaceGame import...
      </div>
    );
  } catch (error) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: '#f00', 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px'
      }}>
        Error: {error.message}
      </div>
    );
  }
};

export default TestImport;
