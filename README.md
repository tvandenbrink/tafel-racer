# Tafel Race Game 🏎️

A 3D racing game designed to help children practice multiplication tables in an engaging and interactive way.

## Features

- **3D Racing Environment**: Built with React Three Fiber for smooth 3D graphics
- **Multiple Players**: Support for Floris, Esmee, and Tim with individual progress tracking
- **Smart Learning System**: Wrong answers are repeated after every 5 questions
- **Visual Statistics**: Color-coded 10×10 multiplication grid showing progress
- **Visual Feedback**: Green flash for correct answers, red flash for mistakes
- **Configurable Difficulty**: Adjustable speed, lanes, and timing
- **High Score Tracking**: Individual high scores for each player

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
Open http://localhost:5173 to view the game.

### Build
```bash
npm run build
```

## How to Play

1. **Select Player**: Choose your player (Floris, Esmee, or Tim)
2. **Configure Settings**: Adjust lanes, speed, and gate intervals
3. **Drive & Answer**: Use arrow keys to move, drive through correct answers
4. **Avoid Traffic**: Don't hit other cars while solving multiplication problems
5. **Track Progress**: View your statistics to see which tables need more practice

## Controls

- **Left/Right Arrow**: Change lanes
- **Up Arrow**: Speed boost
- **Mouse**: Navigate menus

## Technology Stack

- React 18
- Three.js / React Three Fiber
- Vite
- Local Storage for persistence

## License

MIT License - see LICENSE file for details
