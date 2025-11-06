// questionsData is provided globally by questions.js

// --- UI TEXT DEFINITIONS ---------------------------------------------------
const UI_TEXTS = {
    de: {
        startTitle: 'Willkommen zum Breakout Arzttarif!',
        startSubtitle: 'Zerstöre Steine und beantworte Quizfragen, um Punkte zu sammeln.',
        startButton: 'Spiel und Quiz beginnen',
        loading: 'Spiel und Quiz wird aufgestartet',
        scoreLabel: 'Punktestand',
        quizFeedbackCorrect: '+100 Punkte',
        quizFeedbackIncorrect: '-20 Punkte',
        gameEndTitle: 'Spielende',
        gameEndScore: (score) => `Endpunktestand: ${score}`,
        gameEndCorrect: (count) => `Richtige Antworten: ${count}`,
        gameEndIncorrect: (count) => `Falsche Antworten: ${count}`,
        gameEndReplay: 'Nochmal spielen',
        gameEndAlert: (score, correct, total) =>
            `Spielende!\nEndpunktestand: ${score}\nFragen: ${correct} richtig / ${total} insgesamt`
    },
    fr: {
        startTitle: 'Bienvenue dans Breakout Tarif médical !',
        startSubtitle: 'Détruisez des briques et répondez au quiz pour marquer des points.',
        startButton: 'Commencer le jeu et le quiz',
        loading: 'Chargement du jeu et du quiz',
        scoreLabel: 'Score',
        quizFeedbackCorrect: '+100 points',
        quizFeedbackIncorrect: '-20 points',
        gameEndTitle: 'Fin de la partie',
        gameEndScore: (score) => `Score final : ${score}`,
        gameEndCorrect: (count) => `Réponses correctes : ${count}`,
        gameEndIncorrect: (count) => `Réponses incorrectes : ${count}`,
        gameEndReplay: 'Rejouer',
        gameEndAlert: (score, correct, total) =>
            `Fin de la partie !\nScore final : ${score}\nQuestions : ${correct} bonnes / ${total} au total`
    },
    it: {
        startTitle: 'Benvenuto a Breakout Tariffa medica!',
        startSubtitle: 'Distruggi mattoni e rispondi al quiz per guadagnare punti.',
        startButton: 'Avvia gioco e quiz',
        loading: 'Caricamento di gioco e quiz',
        scoreLabel: 'Punteggio',
        quizFeedbackCorrect: '+100 punti',
        quizFeedbackIncorrect: '-20 punti',
        gameEndTitle: 'Fine partita',
        gameEndScore: (score) => `Punteggio finale: ${score}`,
        gameEndCorrect: (count) => `Risposte corrette: ${count}`,
        gameEndIncorrect: (count) => `Risposte errate: ${count}`,
        gameEndReplay: 'Gioca di nuovo',
        gameEndAlert: (score, correct, total) =>
            `Fine partita!\nPunteggio finale: ${score}\nDomande: ${correct} corrette / ${total} totali`
    }
};

let currentLanguage = 'de';

function getUIText(key, ...args) {
    const languagePack = UI_TEXTS[currentLanguage] || UI_TEXTS.de;
    const fallbackPack = UI_TEXTS.de;
    const value = languagePack[key] ?? fallbackPack[key];
    if (typeof value === 'function') return value(...args);
    return value;
}

function applyLanguageToUI() {
    if (startScreenTitleEl) startScreenTitleEl.textContent = getUIText('startTitle');
    if (startScreenSubtitleEl) startScreenSubtitleEl.textContent = getUIText('startSubtitle');
    if (startButton) startButton.textContent = getUIText('startButton');
    if (loadingScreen) loadingScreen.textContent = getUIText('loading');
    updateScoreDisplay();

    if (gameEndTitleEl) gameEndTitleEl.textContent = getUIText('gameEndTitle');
    if (gameEndScoreEl) gameEndScoreEl.textContent = getUIText('gameEndScore', 0);
    if (gameEndCorrectEl) gameEndCorrectEl.textContent = getUIText('gameEndCorrect', 0);
    if (gameEndIncorrectEl) gameEndIncorrectEl.textContent = getUIText('gameEndIncorrect', 0);
    if (gameEndPlayAgainButton) gameEndPlayAgainButton.textContent = getUIText('gameEndReplay');
}

function setGameLanguage(languageCode) {
    if (!UI_TEXTS[languageCode]) return;
    currentLanguage = languageCode;
    applyLanguageToUI();
}

window.setGameLanguage = setGameLanguage;

// 1. Canvas and Context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

// Game Constants
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 20;
const PADDLE_SPEED = 8;
const BALL_RADIUS = 10;
let maxBallSpeedX = 6; // For paddle collision adjustment
const BALL_TRAIL_MAX_LENGTH = 15;

const BRICK_WIDTH = 70;
const BRICK_HEIGHT = 25;
const BRICK_PADDING = 10;
const BRICK_ROWS = 5;
const BRICKS_PER_ROW = 10;
const BRICK_START_X = (canvasWidth - (BRICKS_PER_ROW * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING)) / 2;
const BRICK_START_Y = 50;
const BRICK_COLORS = ["#FF0000", "#FFA500", "#FFFF00", "#00FF00", "#0000FF"]; // Red, Orange, Yellow, Green, Blue
const PADDLE_COLORS = ["#0095DD", "#DD0095", "#95DD00", "#DD9500"]; // Some paddle colors for the optional feature

const POWER_UP_DROP_RATE = 0.25;
const POWER_UP_CONFIG = {
    slow: { color: '#6ec1ff', label: 'S' },
    laser: { color: '#ff6b6b', label: 'L' },
    sticky: { color: '#ffd166', label: 'ST' },
    expand: { color: '#7bd389', label: '+' }
};
const POWER_UP_FALL_SPEED = 2.4;
const LASER_SPEED = 10;
const LASER_COOLDOWN_MS = 350;

// Score
let score = 0;
const scoreDisplay = document.getElementById('scoreDisplay');

// DOM Elements required for translations and interactions
const startScreenTitleEl = document.getElementById('startScreenTextLine1');
const startScreenSubtitleEl = document.getElementById('startScreenTextLine2');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const loadingScreen = document.getElementById('loadingScreen');
const gameContainer = document.getElementById('gameContainer');
const gameEndPopup = document.getElementById('gameEndPopup');
const gameEndTitleEl = document.getElementById('gameEndTitle');
const gameEndScoreEl = document.getElementById('gameEndScore');
const gameEndCorrectEl = document.getElementById('gameEndCorrect');
const gameEndIncorrectEl = document.getElementById('gameEndIncorrect');
const gameEndPlayAgainButton = document.getElementById('gameEndPlayAgainButton');

// Sound Buffers
const gameSounds = {};
let soundsLoadedCount = 0;
const soundFiles = {
    'brick_hit': 'assets/sounds/brick_hit.wav',
    'paddle_hit': 'assets/sounds/paddle_hit.wav',
    'wall_hit': 'assets/sounds/wall_hit.wav',
    'game_over': 'assets/sounds/game_over.wav'
};
const totalSoundsToLoad = Object.keys(soundFiles).length;

// Quiz Statistics
let questionsAnsweredCorrectly = 0;
let questionsAnsweredTotal = 0;

// Game State
let gameIsOver = false;

// Quiz State Variables
let quizActive = false;
let currentQuestion = null;
let questionBrickTarget = 0;
let brickHitCount = 0;
let createdBrickCount = 0;
let ballSpeedBoostActive = false;
let boostStartTime = 0;
let originalBallSpeedX = 0;
let originalBallSpeedY = 0;
let usedQuestionIndices = [];
let shuffledQuizQueue = [];

let fallingPowerUps = [];
let activeLasers = [];
let slowEffectActive = false;
let slowEffectEndTime = 0;
let ballSpeedMultiplier = 1;
let laserActive = false;
let laserEffectEndTime = 0;
let lastLaserShotTime = 0;
let stickyActive = false;
let stickyEffectEndTime = 0;
let ballStuckToPaddle = false;
let expandActive = false;
let expandEffectEndTime = 0;

// Keyboard Navigation States
let selectedAnswerIndex = -1; 
let quizNavActive = false;    
let gameEndNavActive = false; 

// DOM Elements
const quizPopup = document.getElementById('quizPopup');
const quizTitle = document.getElementById('quizTitle');
const quizQuestionEl = document.getElementById('quizQuestion');
const quizAnswersEl = document.getElementById('quizAnswers');
const quizFeedback = document.getElementById('quizFeedback');

if (gameEndPlayAgainButton) {
    gameEndPlayAgainButton.addEventListener('click', () => {
        if (gameEndPopup) gameEndPopup.style.display = 'none';
        gameEndNavActive = false;
        gameEndPlayAgainButton.classList.remove('game-end-button-active');
        resetGame();
    });
}
// const startPrompt = document.getElementById('startPrompt'); // This line was removed in the previous step

// Keyboard control flags (for paddle)
let arrowLeftPressed = false;
let arrowRightPressed = false;

// Utility Function for Shuffling
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function lightenColor(color, percent) {
    const num = parseInt(color.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    let R = (num >> 16) + amt;
    let G = (num >> 8 & 0x00FF) + amt;
    let B = (num & 0x0000FF) + amt;
    R = R < 255 ? (R < 0 ? 0 : R) : 255;
    G = G < 255 ? (G < 0 ? 0 : G) : 255;
    B = B < 255 ? (B < 0 ? 0 : B) : 255;
    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function updateScoreDisplay() {
    if (!scoreDisplay) return;
    scoreDisplay.textContent = `${getUIText('scoreLabel')}: ${score}`;
}

// 2. Asset Loading
const backgroundImage = new Image();
backgroundImage.src = 'assets/images/background.png'; 
let backgroundLoaded = false;
backgroundImage.onload = () => { backgroundLoaded = true; };
backgroundImage.onerror = () => { console.error('Error loading background image.'); };

function loadSound(name, filePath) {
    return new Promise((resolve) => {
        const audio = new Audio(filePath);
        audio.addEventListener('canplaythrough', () => {
            gameSounds[name] = audio;
            soundsLoadedCount++;
            resolve();
        }, { once: true });
        audio.addEventListener('error', (e) => {
            console.error(`Error loading sound ${name} from ${filePath}:`, e);
            resolve();
        }, { once: true });
        audio.load();
    });
}

async function loadAllSounds() {
    const soundPromises = Object.keys(soundFiles).map(name => loadSound(name, soundFiles[name]));
    try { await Promise.all(soundPromises); }
    catch (error) { console.error('Error loading one or more sounds (Promise.all rejected):', error); }
}

function playSound(soundName) {
    const baseSound = gameSounds[soundName];
    if (!baseSound) return;
    const sound = baseSound.cloneNode();
    sound.volume = 0.7;
    sound.playbackRate = 1 + (Math.random() * 0.2 - 0.1);
    sound.play().catch(e => console.error(`Error playing sound ${soundName}:`, e));
}

let quizQuestions = window.questionsData || [];
function loadQuestions() { quizQuestions = window.questionsData || []; }

// 3. Game Entities (Paddle, Ball, Brick classes remain unchanged)
class Paddle { 
    constructor() {
        this.width = PADDLE_WIDTH; this.height = PADDLE_HEIGHT;
        this.x = (canvasWidth - this.width) / 2; this.y = canvasHeight - this.height - 10; 
        this.color = PADDLE_COLORS[0]; this.speed = PADDLE_SPEED;
    }
    draw(ctx) { ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, this.width, this.height); }
    changeColor() {
        const currentIndex = PADDLE_COLORS.indexOf(this.color);
        this.color = PADDLE_COLORS[(currentIndex + 1) % PADDLE_COLORS.length];
    }
}
class Ball {
    constructor() {
        this.radius = BALL_RADIUS; this.x = canvasWidth / 2; this.y = canvasHeight / 2;
        this.color = 'red'; this.dx = 4;  this.dy = -4;
        this.trail = [];
        this.stickyReleaseDX = 4;
        this.stickyReleaseDY = -4;
    }
    draw(ctx) {
        ctx.save();
        for (let i = 0; i < this.trail.length; i++) {
            const pos = this.trail[i];
            const alpha = (i + 1) / this.trail.length * 0.5;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.closePath();
        }
        ctx.restore();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
    update() {
        if (ballStuckToPaddle) {
            this.x = paddle.x + paddle.width / 2;
            this.y = paddle.y - this.radius;
            this.trail = [];
            return;
        }

        this.x += this.dx * ballSpeedMultiplier;
        this.y += this.dy * ballSpeedMultiplier;
        if (this.x + this.radius > canvasWidth || this.x - this.radius < 0) { this.dx *= -1; playSound('wall_hit'); }
        if (this.y - this.radius < 0) { this.dy *= -1; playSound('wall_hit'); }
        if (this.y + this.radius > canvasHeight) { playSound('game_over'); showGameEndPopup(); return; }
        if (this.dy > 0 && this.x + this.radius > paddle.x && this.x - this.radius < paddle.x + paddle.width &&
            this.y + this.radius > paddle.y && this.y - this.radius < paddle.y + paddle.height) {
            const centerRatio = ((this.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2));
            const newDx = centerRatio * maxBallSpeedX;
            const newDy = -Math.abs(this.dy || 4);

            if (stickyActive) {
                this.stickyReleaseDX = newDx || (Math.random() > 0.5 ? 4 : -4);
                this.stickyReleaseDY = newDy || -4;
                ballStuckToPaddle = true;
                this.dx = this.stickyReleaseDX;
                this.dy = this.stickyReleaseDY;
                this.y = paddle.y - this.radius;
            } else {
                this.dy = newDy;
                this.y = paddle.y - this.radius;
                this.dx = newDx;
            }

            playSound('paddle_hit'); paddle.changeColor();
        }
        for (let i = 0; i < bricks.length; i++) {
            const brick = bricks[i];
            const closestX = Math.max(brick.x, Math.min(this.x, brick.x + brick.width));
            const closestY = Math.max(brick.y, Math.min(this.y, brick.y + brick.height));
            const dX = this.x - closestX; const dY = this.y - closestY;
            if ((dX * dX + dY * dY) < (this.radius * this.radius)) {
                const oX = this.radius - Math.abs(dX); const oY = this.radius - Math.abs(dY);
                if (oX + 0.1 < oY) { this.dx *= -1; this.x += this.dx > 0 ? oX : -oX; }
                else if (oY + 0.1 < oX) { this.dy *= -1; this.y += this.dy > 0 ? oY : -oY; }
                else { this.dx *= -1; this.dy *= -1; this.x += this.dx > 0 ? oX : -oX; this.y += this.dy > 0 ? oY : -oY; }

                handleBrickDestruction(i, brick, 'ball', this);
                break;
            }
        }
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > BALL_TRAIL_MAX_LENGTH) this.trail.shift();
    }
}
class Brick {
    constructor(x, y, width, height, color) {
        this.x = x; this.y = y; this.width = width; this.height = height;
        this.color = color; this.isQuestionBrick = false;
    }
    draw(ctx) {
        const radius = 6;
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, lightenColor(this.color, 30));
        gradient.addColorStop(1, this.color);
        drawRoundedRect(ctx, this.x, this.y, this.width, this.height, radius);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = '#ffffff55';
        ctx.lineWidth = 2;
        ctx.stroke();
        if (this.isQuestionBrick) {
            const qT = "?"; const x = this.x + this.width / 2; const y = this.y + this.height / 2;
            ctx.font = "bold 16px Consolas"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillStyle = "rgba(220,220,220,0.7)"; const o = 1;
            ctx.fillText(qT, x-o, y-o); ctx.fillText(qT, x+o, y-o); ctx.fillText(qT, x-o, y+o); ctx.fillText(qT, x+o, y+o);
            ctx.fillStyle = "black"; ctx.fillText(qT, x, y);
        }
    }
}

function getRandomPowerUpType() {
    const keys = Object.keys(POWER_UP_CONFIG);
    return keys[Math.floor(Math.random() * keys.length)];
}

function maybeDropPowerUp(brick) {
    if (Math.random() > POWER_UP_DROP_RATE) return;
    const type = getRandomPowerUpType();
    fallingPowerUps.push(new PowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2, type));
}

function handleBrickDestruction(index, brick, cause, ballInstance = null) {
    bricks.splice(index, 1);
    score += 10;
    updateScoreDisplay();
    playSound('brick_hit');
    brickHitCount++;

    if (cause === 'ball' && ballInstance) {
        if (brickHitCount % 10 === 0) {
            ballInstance.dx *= 1.1;
            ballInstance.dy *= 1.1;
            ballInstance.dx = Math.max(-12, Math.min(12, ballInstance.dx));
            ballInstance.dy = Math.max(-12, Math.min(12, ballInstance.dy));
            maxBallSpeedX *= 1.1;
        }
    }

    maybeDropPowerUp(brick);

    if (brick.isQuestionBrick) {
        quizActive = true;
        startQuiz();
    }
}

class PowerUp {
    constructor(centerX, centerY, type) {
        this.type = type;
        this.width = 28;
        this.height = 28;
        this.x = centerX - this.width / 2;
        this.y = centerY - this.height / 2;
        this.speed = POWER_UP_FALL_SPEED;
    }
    update() {
        this.y += this.speed;
    }
    draw(ctx) {
        const config = POWER_UP_CONFIG[this.type] || { color: '#ffffff', label: '?' };
        ctx.fillStyle = config.color;
        drawRoundedRect(ctx, this.x, this.y, this.width, this.height, 6);
        ctx.fill();
        ctx.strokeStyle = '#00000055';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#1d1d1d';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(config.label || '?', this.x + this.width / 2, this.y + this.height / 2);
    }
}

class LaserShot {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 22;
        this.speed = LASER_SPEED;
    }
    get left() { return this.x - this.width / 2; }
    get right() { return this.x + this.width / 2; }
    get top() { return this.y - this.height; }
    get bottom() { return this.y; }
    update() {
        this.y -= this.speed;
    }
    draw(ctx) {
        ctx.fillStyle = '#ff4d4d';
        ctx.fillRect(this.left, this.top, this.width, this.height);
    }
}

function activatePowerUp(type) {
    const now = Date.now();
    switch (type) {
        case 'slow':
            slowEffectActive = true;
            slowEffectEndTime = now + 8000;
            ballSpeedMultiplier = 0.6;
            break;
        case 'laser':
            laserActive = true;
            laserEffectEndTime = now + 10000;
            lastLaserShotTime = 0;
            break;
        case 'sticky':
            stickyActive = true;
            stickyEffectEndTime = now + 12000;
            break;
        case 'expand':
            expandActive = true;
            expandEffectEndTime = now + 12000;
            paddle.width = Math.min(canvasWidth * 0.75, PADDLE_WIDTH * 1.6);
            if (paddle.x + paddle.width > canvasWidth) paddle.x = canvasWidth - paddle.width;
            if (paddle.x < 0) paddle.x = 0;
            break;
        default:
            break;
    }
}

function updatePowerUps() {
    for (let i = fallingPowerUps.length - 1; i >= 0; i--) {
        const powerUp = fallingPowerUps[i];
        powerUp.update();
        if (powerUp.y > canvasHeight) {
            fallingPowerUps.splice(i, 1);
            continue;
        }

        if (
            !quizActive && !gameIsOver &&
            powerUp.x < paddle.x + paddle.width &&
            powerUp.x + powerUp.width > paddle.x &&
            powerUp.y < paddle.y + paddle.height &&
            powerUp.y + powerUp.height > paddle.y
        ) {
            activatePowerUp(powerUp.type);
            fallingPowerUps.splice(i, 1);
        }
    }
}

function drawPowerUps(ctx) {
    for (let i = 0; i < fallingPowerUps.length; i++) {
        fallingPowerUps[i].draw(ctx);
    }
}

function updateLasers() {
    for (let i = activeLasers.length - 1; i >= 0; i--) {
        const laser = activeLasers[i];
        laser.update();

        if (laser.bottom < 0) {
            activeLasers.splice(i, 1);
            continue;
        }

        for (let j = bricks.length - 1; j >= 0; j--) {
            const brick = bricks[j];
            if (
                laser.right > brick.x &&
                laser.left < brick.x + brick.width &&
                laser.bottom > brick.y &&
                laser.top < brick.y + brick.height
            ) {
                handleBrickDestruction(j, brick, 'laser');
                activeLasers.splice(i, 1);
                break;
            }
        }
    }
}

function drawLasers(ctx) {
    for (let i = 0; i < activeLasers.length; i++) {
        activeLasers[i].draw(ctx);
    }
}

function shootLasers() {
    if (!laserActive) return;
    const now = Date.now();
    if (now - lastLaserShotTime < LASER_COOLDOWN_MS) return;
    lastLaserShotTime = now;

    const leftX = paddle.x + paddle.width * 0.25;
    const rightX = paddle.x + paddle.width * 0.75;
    const y = paddle.y;

    activeLasers.push(new LaserShot(leftX, y));
    activeLasers.push(new LaserShot(rightX, y));
    playSound('paddle_hit');
}

function refreshActivePowerUpEffects() {
    const now = Date.now();
    if (slowEffectActive && now > slowEffectEndTime) {
        slowEffectActive = false;
        ballSpeedMultiplier = 1;
    }
    if (laserActive && now > laserEffectEndTime) {
        laserActive = false;
    }
    if (stickyActive && now > stickyEffectEndTime) {
        stickyActive = false;
        if (ballStuckToPaddle) releaseBallFromPaddle();
    }
    if (expandActive && now > expandEffectEndTime) {
        expandActive = false;
        paddle.width = PADDLE_WIDTH;
        if (paddle.x + paddle.width > canvasWidth) paddle.x = canvasWidth - paddle.width;
        if (paddle.x < 0) paddle.x = 0;
    }
}

function releaseBallFromPaddle() {
    if (!ballStuckToPaddle) return;
    ballStuckToPaddle = false;
    ball.dx = ball.stickyReleaseDX || (Math.random() > 0.5 ? 4 : -4);
    ball.dy = ball.stickyReleaseDY || -4;
    if (ball.dy > 0) ball.dy = -Math.abs(ball.dy);
    if (Math.abs(ball.dy) < 1) ball.dy = -4;
    if (Math.abs(ball.dx) < 0.3) ball.dx = ball.dx < 0 ? -4 : 4;
    ball.trail = [];
}
let bricks = [];
function initializeBricks() { 
    bricks = []; createdBrickCount = 0; 
    questionBrickTarget = Math.floor(Math.random() * 3) + 6; 
    for (let r = 0; r < BRICK_ROWS; r++) {
        for (let c = 0; c < BRICKS_PER_ROW; c++) {
            createdBrickCount++;
            const brick = new Brick(
                BRICK_START_X + c * (BRICK_WIDTH + BRICK_PADDING),
                BRICK_START_Y + r * (BRICK_HEIGHT + BRICK_PADDING),
                BRICK_WIDTH, BRICK_HEIGHT, BRICK_COLORS[r % BRICK_COLORS.length]
            );
            if (createdBrickCount === questionBrickTarget) {
                brick.isQuestionBrick = true;
                questionBrickTarget += Math.floor(Math.random() * 3) + 6;
            }
            bricks.push(brick);
        }
    }
}

// 4. Rendering Function (drawGame remains unchanged)
function drawGame() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    if (backgroundLoaded) ctx.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);
    else { ctx.fillStyle = '#f0f0f0'; ctx.fillRect(0, 0, canvasWidth, canvasHeight); }
    for (let i = 0; i < bricks.length; i++) {
        bricks[i].draw(ctx);
    }
    drawPowerUps(ctx);
    paddle.draw(ctx);
    ball.draw(ctx);
    drawLasers(ctx);
}

// Update game state (update remains unchanged)
function update() {
    refreshActivePowerUpEffects();

    if (gameIsOver || quizActive) return;
    if (ballSpeedBoostActive && Date.now() - boostStartTime >= 10000) {
        ball.dx = originalBallSpeedX; ball.dy = originalBallSpeedY;
        ballSpeedBoostActive = false;
    }

    if (arrowLeftPressed) {
        paddle.x -= PADDLE_SPEED;
    }
    if (arrowRightPressed) {
        paddle.x += PADDLE_SPEED;
    }

    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;

    ball.update();
    updatePowerUps();
    updateLasers();
    checkWinCondition();
}

// Quiz Functions (getNewQuizQuestion, updateQuizAnswerSelectionVisuals, startQuiz, handleAnswer, endQuiz remain unchanged)
function getNewQuizQuestion() { 
    if (shuffledQuizQueue.length === 0) {
        if (quizQuestions.length === 0) return null;
        shuffledQuizQueue = quizQuestions.map((_, i) => i); shuffleArray(shuffledQuizQueue);
        shuffledQuizQueue = shuffledQuizQueue.map(i => quizQuestions[i]);
    }
    return shuffledQuizQueue.pop();
}

function updateQuizAnswerSelectionVisuals() {
    const buttons = quizAnswersEl.getElementsByTagName('button');
    if (!buttons.length) return; 

    for (let i = 0; i < buttons.length; i++) {
        if (i === selectedAnswerIndex) {
            buttons[i].classList.add('selected-answer-keyboard');
        } else {
            buttons[i].classList.remove('selected-answer-keyboard');
        }
    }
}

function startQuiz() {
    currentQuestion = getNewQuizQuestion();
    if (!currentQuestion) { quizActive = false; return; }
    quizTitle.textContent = currentQuestion.title;
    quizQuestionEl.textContent = currentQuestion.question;
    quizAnswersEl.innerHTML = ''; 
    currentQuestion.answers.forEach((answer, index) => { 
        const button = document.createElement('button');
        button.textContent = answer;
        button.onclick = () => handleAnswer(index); 
        quizAnswersEl.appendChild(button);
    });
    quizFeedback.textContent = '';
    quizPopup.style.display = 'block';
    
    selectedAnswerIndex = 0; 
    quizNavActive = true;   
    updateQuizAnswerSelectionVisuals(); 
}

function handleAnswer(selectedIndexParam) {
    if (!currentQuestion) return; 
    
    const actualSelectedIndex = selectedIndexParam; 
    
    const buttons = quizAnswersEl.getElementsByTagName('button');
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true; 
        if (i === currentQuestion.correct_answer_index) buttons[i].style.backgroundColor = 'lightgreen';
        else if (i === actualSelectedIndex) buttons[i].style.backgroundColor = 'salmon';
        else buttons[i].style.backgroundColor = 'lightgray';
    }
    questionsAnsweredTotal++;
    if (actualSelectedIndex === currentQuestion.correct_answer_index) {
        questionsAnsweredCorrectly++; score += 100;
        quizFeedback.textContent = getUIText('quizFeedbackCorrect'); quizFeedback.style.color = "green";
    } else {
        score -= 20; score = Math.max(0, score);
        quizFeedback.textContent = getUIText('quizFeedbackIncorrect'); quizFeedback.style.color = "red";
        if (!ballSpeedBoostActive) {
            ballSpeedBoostActive = true; originalBallSpeedX = ball.dx; originalBallSpeedY = ball.dy;
            ball.dx *= 1.5; ball.dy *= 1.5;
            ball.dx = Math.max(-9, Math.min(9, ball.dx)); ball.dy = Math.max(-9, Math.min(9, ball.dy));
            boostStartTime = Date.now();
        }
    }
    updateScoreDisplay();
    setTimeout(endQuiz, 2000); 
}

function endQuiz() {
    quizPopup.style.display = 'none';
    quizActive = false;
    currentQuestion = null; 
    
    quizNavActive = false; 
    selectedAnswerIndex = -1; 
    
    const buttons = quizAnswersEl.getElementsByTagName('button');
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('selected-answer-keyboard');
    }
    
    checkWinCondition(); 
}

// resetGame, checkWinCondition, showGameEndPopup remain unchanged
function resetGame() {
    score = 0; updateScoreDisplay(); initializeBricks();
    paddle.x = (canvasWidth - PADDLE_WIDTH) / 2; paddle.y = canvasHeight - PADDLE_HEIGHT - 10;
    paddle.width = PADDLE_WIDTH;
    paddle.color = PADDLE_COLORS[0];
    ball.x = canvasWidth / 2; ball.y = canvasHeight / 2;
    ball.dx = 4; ball.dy = -4; ball.trail = [];
    ball.stickyReleaseDX = 4; ball.stickyReleaseDY = -4;
    quizActive = false; gameIsOver = false;
    if (ballSpeedBoostActive) { ball.dx = originalBallSpeedX; ball.dy = originalBallSpeedY; ballSpeedBoostActive = false; }
    brickHitCount = 0; questionsAnsweredCorrectly = 0; questionsAnsweredTotal = 0; maxBallSpeedX = 6;
    shuffledQuizQueue = [];
    if (quizQuestions.length > 0) {
        shuffledQuizQueue = quizQuestions.map((_, i) => i); shuffleArray(shuffledQuizQueue);
        shuffledQuizQueue = shuffledQuizQueue.map(i => quizQuestions[i]);
    }
    usedQuestionIndices = [];

    fallingPowerUps = [];
    activeLasers = [];
    slowEffectActive = false; slowEffectEndTime = 0; ballSpeedMultiplier = 1;
    laserActive = false; laserEffectEndTime = 0; lastLaserShotTime = 0;
    stickyActive = false; stickyEffectEndTime = 0; ballStuckToPaddle = false;
    expandActive = false; expandEffectEndTime = 0;

    quizNavActive = false; selectedAnswerIndex = -1;
    gameEndNavActive = false;
    if (gameEndPlayAgainButton) {
        gameEndPlayAgainButton.classList.remove('game-end-button-active');
    }
}

function checkWinCondition() {
    if (!bricks) return;
    if (bricks.length === 0 && !quizActive) showGameEndPopup();
}

function showGameEndPopup() {
    gameIsOver = true;
    gameEndNavActive = true;
    if (gameEndPlayAgainButton) {
        gameEndPlayAgainButton.classList.add('game-end-button-active');
    }

    fallingPowerUps = [];
    activeLasers = [];

    if (!gameEndPopup || !gameEndTitleEl || !gameEndScoreEl || !gameEndCorrectEl || !gameEndIncorrectEl) {
        alert(getUIText('gameEndAlert', score, questionsAnsweredCorrectly, questionsAnsweredTotal));
        return;
    }
    const incorrectAnswers = questionsAnsweredTotal - questionsAnsweredCorrectly;
    gameEndTitleEl.textContent = getUIText('gameEndTitle');
    gameEndScoreEl.textContent = getUIText('gameEndScore', score);
    gameEndCorrectEl.textContent = getUIText('gameEndCorrect', questionsAnsweredCorrectly);
    gameEndIncorrectEl.textContent = getUIText('gameEndIncorrect', incorrectAnswers);
    gameEndPopup.style.display = 'block';
}

const paddle = new Paddle();
const ball = new Ball();

// Target initializeGame structure
async function initializeGame() {
    await Promise.all([loadQuestions(), loadAllSounds()]);
    if (loadingScreen) loadingScreen.style.display = 'none';

    resetGame();
    gameLoop();
    console.log("Game start initiated automatically after loading.");

    // Global event listeners (keydown for game control, keyup, mousemove)
    // These are added once here and have internal checks (e.g., !quizActive, !gameIsOver)
    // to ensure they only act when appropriate.
    document.addEventListener('keydown', (event) => { 
        if (gameEndNavActive) {
            if (['Enter', 'Escape'].includes(event.key)) { 
                 event.preventDefault(); 
                if (gameEndPlayAgainButton) gameEndPlayAgainButton.click();
            }
            return; 
        }

        if (quizNavActive && currentQuestion) {
            const buttons = quizAnswersEl.getElementsByTagName('button');
            if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) {
                event.preventDefault();
            }
            if (event.key === 'ArrowDown') {
                if (buttons.length > 0) {
                    selectedAnswerIndex = (selectedAnswerIndex + 1) % buttons.length;
                    updateQuizAnswerSelectionVisuals();
                }
            } else if (event.key === 'ArrowUp') {
                if (buttons.length > 0) {
                    selectedAnswerIndex = (selectedAnswerIndex - 1 + buttons.length) % buttons.length;
                    updateQuizAnswerSelectionVisuals();
                }
            } else if (event.key === 'Enter') {
                if (buttons.length > 0 && selectedAnswerIndex >= 0 && selectedAnswerIndex < buttons.length) {
                    if (!buttons[selectedAnswerIndex].disabled) { 
                        handleAnswer(selectedAnswerIndex);
                    }
                }
            } else if (event.key === 'Escape') { // Escape from Quiz
                endQuiz();
            }
            return; 
        }

        // Global Escape to hide game container if no popups are active
        if (event.key === 'Escape' && !quizActive && !gameEndNavActive && !gameIsOver) {
            if (gameContainer) gameContainer.style.display = 'none';
            gameIsOver = true; 
            return; 
        }

        // Paddle controls - only if game is active and no popups are shown
        if (!quizActive && !gameIsOver && !gameEndNavActive) {
            if (event.code === 'Space') {
                event.preventDefault();
                if (ballStuckToPaddle) releaseBallFromPaddle();
                else shootLasers();
                return;
            }
            if (event.key === "ArrowLeft") arrowLeftPressed = true;
            else if (event.key === "ArrowRight") arrowRightPressed = true;
        }
    });

    document.addEventListener('keyup', (event) => {
        if (event.key === "ArrowLeft") arrowLeftPressed = false;
        else if (event.key === "ArrowRight") arrowRightPressed = false;
    });

    document.addEventListener('mousemove', (event) => {
        if (quizActive || gameEndNavActive || gameIsOver) { 
            return; 
        }
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        paddle.x = mouseX - paddle.width / 2;

        if (paddle.x < 0) paddle.x = 0;
        if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
    });
    

}

function gameLoop() {
    update(); 
    drawGame(); 
    requestAnimationFrame(gameLoop);
}

// ----------- NEU: Steuerung für Startbildschirm und Spielstart ------------

if (gameContainer) gameContainer.style.display = 'none'; // Spiel-Canvas ausblenden

applyLanguageToUI();

// Nur laden, nicht starten
async function preloadGameAssets() {
    loadQuestions();
    try {
        await loadAllSounds();
    } finally {
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (startButton) startButton.disabled = false; // Button aktivieren!
    }
}
preloadGameAssets();

// Klick auf "Spiel und Quiz beginnen" startet das Spiel wirklich
if (startButton) {
    startButton.addEventListener('click', function () {
        if (startScreen) startScreen.style.display = 'none';
        if (gameContainer) gameContainer.style.display = 'block';
        initializeGame(); // Jetzt wirklich Spiel und Loop starten
    });
}
