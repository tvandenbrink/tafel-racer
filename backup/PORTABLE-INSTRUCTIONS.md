# Tafel Race Game - Portable Version

## How to Play on Any Computer (No Internet Required)

### ⚠️ Important: Build First
The game must be built on a computer WITH Node.js first:
```bash
npm run build
```
This creates the `dist` folder that contains the portable game.

### Option 1: Python Server (Most Common)

**Requirements:** Python installed (usually pre-installed on Mac/Linux)

**Windows:**
- Double-click `serve-python.bat`
- OR open Command Prompt in game folder and run: `python -m http.server 8000`

**Mac/Linux:**
```bash
cd dist
python3 -m http.server 8000
# OR for older Python:
python -m SimpleHTTPServer 8000
```

**Access:** http://localhost:8000

### Option 2: PHP Server (If PHP available)

**Windows/Mac/Linux:**
```bash
cd dist
php -S localhost:8000
```

**Access:** http://localhost:8000

### Option 3: Any Web Server

**Requirements:** Any local web server (XAMPP, WAMP, Apache, nginx, IIS)

**Steps:**
1. Copy contents of `dist` folder to web server document root
2. Access via web server URL (usually http://localhost)

### Option 4: Browser Extensions (Chrome/Edge)

**Requirements:** Chrome or Edge browser

**Steps:**
1. Install "Web Server for Chrome" extension
2. Choose `dist` folder as web folder
3. Click the provided URL

### Option 5: Node.js (If Available)

**Requirements:** Node.js installed

**Steps:**
```bash
npm run preview
# OR double-click serve-portable.bat
```

**Access:** http://localhost:3004

### Distribution Package

For easy distribution, create a package with:
```
tafel-racer-portable/
├── dist/                    (The built game)
├── serve-python.bat        (Windows Python server)
├── serve-portable.bat      (Windows Node.js server)
├── PORTABLE-INSTRUCTIONS.md
└── start-game.html         (Double-click option)
```

### Option 6: Direct Browser File (Limited)

⚠️ **Not recommended** due to CORS restrictions, but may work in some browsers:

1. Open `dist/index.html` directly in browser
2. If blank page, try different browser or use server options above

### Troubleshooting

**Blank page when opening index.html directly:**
- This is normal due to browser security (CORS)
- Use any of the server options above

**Python not found:**
- Windows: Install Python from python.org
- Mac: Python usually pre-installed, try `python3`
- Linux: Install via package manager

**Port already in use:**
- Change port number: `python -m http.server 8001`
- Or kill process using the port

### Game Features
- **Offline Play:** Works completely without internet
- **Player Profiles:** Separate progress for Floris and Esmee  
- **Persistent Data:** Scores and progress saved locally
- **Cross-Platform:** Works on Windows, Mac, Linux
- **No Installation:** Just run from any folder

### Performance Tips
- Modern browser recommended (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Close other browser tabs for better performance
- Game runs at 60 FPS on most computers
