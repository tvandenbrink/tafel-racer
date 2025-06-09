# Tafel Race Game - Portable Version

## How to Play on Any Computer (No Internet Required)

### Option 1: Using Built-in Server (Recommended)

**Requirements:**
- Node.js installed on the computer

**Steps:**
1. Copy the entire `tafel-racer` folder to the target computer
2. Open Command Prompt/Terminal in the `tafel-racer` folder
3. Run: `npm run preview` or double-click `serve-portable.bat` (Windows)
4. Game opens automatically at `http://localhost:3004`

### Option 2: Using Python Server (Alternative)

**Requirements:**
- Python installed on the computer

**Steps:**
1. Copy the `dist` folder to the target computer
2. Open Command Prompt/Terminal in the `dist` folder
3. Run one of these commands:
   - **Python 3:** `python -m http.server 8000`
   - **Python 2:** `python -m SimpleHTTPServer 8000`
4. Open browser and go to: `http://localhost:8000`

### Option 3: Using Any Web Server

**Requirements:**
- Any local web server (XAMPP, WAMP, Apache, nginx, etc.)

**Steps:**
1. Copy the `dist` folder contents to your web server's document root
2. Access via `http://localhost` or your server's URL

### Why doesn't double-clicking index.html work?

Modern browsers block local file access for security reasons (CORS policy). The game needs to be served through a web server (even locally) to work properly.

### Troubleshooting:

**Port already in use:**
- Try a different port: `npm run preview -- --port 3005`
- Or kill the process using the port

**Browser doesn't open automatically:**
- Manually go to `http://localhost:3004`
- Try a different browser (Chrome, Firefox, Edge)

**Files missing after copying:**
- Make sure all files in the `dist` folder were copied
- Check that `assets` folder contains CSS and JS files

### Game Features:
- **Players:** Switch between Floris and Esmee
- **Controls:** Arrow keys to move, Up arrow for speed boost
- **Progress:** Individual high scores and error tracking per player
- **Offline:** Works completely without internet once running

### File Structure:
```
tafel-racer/
├── dist/                    (Built game files)
│   ├── index.html
│   └── assets/
│       ├── index-[hash].css
│       └── index-[hash].js
├── serve-portable.bat       (Windows server starter)
└── package.json            (For npm commands)
```

**For distribution:** Copy the entire `tafel-racer` folder (includes source + built files) for maximum compatibility.
