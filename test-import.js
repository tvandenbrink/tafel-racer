// Test file to check if TafelRaceGame can be imported
try {
  const TafelRaceGame = require('./TafelRaceGame.jsx');
  console.log('Import successful:', typeof TafelRaceGame);
} catch (error) {
  console.error('Import failed:', error.message);
}
