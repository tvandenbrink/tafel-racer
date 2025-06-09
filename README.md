# Tafel Race Game

A 3D educational racing game built with React Three Fiber to help children practice multiplication tables in an engaging and interactive way.

## 🎮 Game Overview

Tafel Race is a fun multiplication table practice game where players drive a car through gates with correct answers while avoiding traffic obstacles. The game adapts to each player's performance and provides detailed statistics tracking.

## ✨ Features

### 🏎️ 3D Racing Experience
- **Immersive 3D Environment**: Built with React Three Fiber and Three.js
- **Responsive Controls**: Arrow keys for desktop, touch controls for mobile/tablet
- **Speed Boost**: Hold Up arrow or boost button for faster movement
- **Lane-based Movement**: Navigate between 2-10 lanes (configurable)

### 🧮 Educational Content
- **Multiplication Tables**: Practice tables 1×1 through 10×10
- **Adaptive Difficulty**: Incorrect answers are repeated after every 5 questions
- **Smart Question Generation**: Questions from the same multiplication table as options
- **Performance Tracking**: Detailed statistics for each multiplication fact

### 👥 Multi-Player Support
- **Individual Profiles**: Separate progress for Floris, Esmee, and Tim
- **Personal High Scores**: Track best scores for each player
- **Individual Statistics**: Detailed performance data per player
- **Mistake Tracking**: Recent incorrect answers logged per player

### 📱 Cross-Platform Design
- **Mobile Responsive**: Optimized UI for phones and tablets
- **Touch Controls**: Lane selection buttons and speed boost button
- **Adaptive Layout**: Responsive font sizes and spacing using CSS clamp()
- **Portrait/Landscape**: Automatic lane count adjustment for mobile devices

### 📊 Advanced Statistics
- **Performance Grid**: Visual 10×10 multiplication table with color-coded performance
- **Success Rates**: Percentage accuracy for each multiplication fact
- **Attempt Tracking**: Number of times each question was attempted
- **Mistake Count**: Track incorrect answers for focused practice

### ⚙️ Customizable Settings
- **Lane Configuration**: 2-10 lanes (mobile defaults to 4, desktop to 6)
- **Speed Control**: Adjustable car speed (20-200)
- **Gate Intervals**: Configurable time between question gates (2-8 seconds)
- **Responsive Design**: All settings scale appropriately on different devices

### 🚗 Traffic System
- **Smart Obstacle Spawning**: Traffic cars spawn at same location as gates
- **Collision Protection**: 2-second buffer before/after gates prevents unfair collisions
- **Lane Management**: Maximum traffic density based on lane count
- **Spacing Control**: Proper distance between traffic vehicles

### 🎯 Game Mechanics
- **Lives System**: 3 lives with visual feedback
- **Invincibility Frames**: 2-second protection after taking damage
- **Visual Feedback**: Red flash for damage, green flash for correct answers
- **Correct Answer Display**: Show correct answer for 1 second after mistakes
- **Question Visibility**: Answer labels hidden when directly in front of player

## 🎨 Visual Design

### Color-Coded Performance
- **🟢 Green (90%+ correct)**: Mastered
- **🟡 Yellow (70-89% correct)**: Good progress
- **🟠 Orange (50-69% correct)**: Needs practice
- **🔴 Red (<50% correct)**: Requires attention
- **⚫ Gray**: Not yet attempted

### Responsive UI Elements
- **Adaptive Font Sizes**: Scale from mobile to desktop using CSS clamp()
- **Touch-Friendly Buttons**: Properly sized for finger interaction
- **Visual Hierarchy**: Clear information structure with proper contrast
- **Smooth Animations**: Transitions and hover effects for better UX

## 🛠️ Technical Features

### Performance Optimization
- **Efficient Rendering**: Only render visible objects
- **Smart Spawning**: Controlled intervals prevent performance issues
- **Memory Management**: Automatic cleanup of off-screen objects
- **State Management**: Optimized React state updates

### Data Persistence
- **Local Storage**: All progress saved locally per player
- **Statistics Tracking**: Comprehensive performance data
- **High Score Persistence**: Maintained across sessions
- **Mistake Recovery**: Failed questions automatically queued for repeat

### Mobile Optimization
- **Touch Events**: Proper touch handling with preventDefault
- **Responsive Layouts**: Grid systems that adapt to screen size
- **Performance**: Optimized for mobile device capabilities
- **Battery Friendly**: Efficient rendering and minimal background processing

## 🎯 Educational Benefits

### Learning Reinforcement
- **Spaced Repetition**: Incorrect answers resurface after 5 questions
- **Progress Tracking**: Visual feedback on improvement areas
- **Gamification**: Points, lives, and high scores motivate practice
- **Immediate Feedback**: Instant results with correct answer display

### Adaptive Learning
- **Personalized Difficulty**: Each player's weak areas get extra practice
- **Performance Analytics**: Detailed insights into learning progress
- **Focused Practice**: Statistics highlight areas needing attention
- **Motivation**: High scores and visual progress encourage continued use

## 🚀 Getting Started

1. **Installation**: Clone the repository and install dependencies
2. **Player Selection**: Choose your player profile (Floris, Esmee, or Tim)
3. **Configuration**: Adjust lanes, speed, and gate intervals as desired
4. **Practice**: Start playing and track your multiplication table progress!

## 📱 Controls

### Desktop
- **Arrow Left/Right**: Change lanes
- **Arrow Up**: Speed boost
- **Mouse Click**: Settings and menu navigation

### Mobile/Tablet
- **Lane Buttons**: Tap to change lanes (shows answer values)
- **Boost Button**: Hold for speed boost
- **Touch**: All menu interactions

## 🏆 Scoring System

- **+1 Point**: Each correct answer
- **High Score**: Best score per player
- **Lives**: 3 lives, lose one for wrong answers or traffic collisions
- **Statistics**: Detailed performance tracking for improvement

The game combines education with entertainment, making multiplication practice engaging and effective for learners of all ages!