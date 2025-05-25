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
const MAX_BALL_SPEED_X = 6; // For paddle collision adjustment

const BRICK_WIDTH = 70;
const BRICK_HEIGHT = 25;
const BRICK_PADDING = 10;
const BRICK_ROWS = 5;
const BRICKS_PER_ROW = 10;
const BRICK_START_X = (canvasWidth - (BRICKS_PER_ROW * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING)) / 2;
const BRICK_START_Y = 50;
const BRICK_COLORS = ["#FF0000", "#FFA500", "#FFFF00", "#00FF00", "#0000FF"]; // Red, Orange, Yellow, Green, Blue
const PADDLE_COLORS = ["#0095DD", "#DD0095", "#95DD00", "#DD9500"]; // Some paddle colors for the optional feature

// Score
let score = 0;
const scoreDisplay = document.getElementById('scoreDisplay');

// AudioContext and Sound Buffers
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
console.log('AudioContext initial state:', audioCtx.state); // Log initial state
const gameSounds = {}; // To store AudioBuffers
let soundsLoadedCount = 0; // Counter for loaded sounds
const soundFiles = {
    'brick_hit': 'assets/sounds/brick_hit.wav',
    'paddle_hit': 'assets/sounds/paddle_hit.wav',
    'wall_hit': 'assets/sounds/wall_hit.wav',
    'game_over': 'assets/sounds/game_over.wav'
};
const totalSoundsToLoad = Object.keys(soundFiles).length;
let allSoundsPreDecoded = false; // New global flag

// Quiz Statistics
let questionsAnsweredCorrectly = 0;
let questionsAnsweredTotal = 0;

// Game State
let gameIsOver = false;

// Quiz State Variables
let quizActive = false;
let currentQuestion = null;
let questionBrickTarget = 0;
// brickHitCount for actual hits during gameplay, not for designation.
// createdBrickCount will be used locally in initializeBricks for designation.
let brickHitCount = 0; 
let ballSpeedBoostActive = false;
let boostStartTime = 0;
let originalBallSpeedX = 0;
let originalBallSpeedY = 0;
// quizQuestions is already declared and loaded below
let usedQuestionIndices = []; // This might become obsolete or repurposed.
let shuffledQuizQueue = []; // New global for shuffled questions

// DOM Elements for Quiz
const quizPopup = document.getElementById('quizPopup');
const quizTitle = document.getElementById('quizTitle');

// Keyboard control flags
let arrowLeftPressed = false;
let arrowRightPressed = false;
const quizQuestionEl = document.getElementById('quizQuestion'); // Renamed to avoid conflict with global
const quizAnswersEl = document.getElementById('quizAnswers');   // Renamed to avoid conflict with global
const quizFeedback = document.getElementById('quizFeedback');

// Utility Function for Shuffling
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
}

async function tryDecodeAllSounds() {
    console.log('Attempting to pre-decode all remaining sounds...');
    const decodePromises = [];

    for (const soundName in gameSounds) {
        const soundData = gameSounds[soundName];
        if (soundData instanceof ArrayBuffer) {
            console.log(`Pre-decoding: ${soundName}`);
            const decodePromise = audioCtx.decodeAudioData(soundData.slice(0)) // Use slice(0) for safety
                .then(decodedBuffer => {
                    gameSounds[soundName] = decodedBuffer;
                    console.log(`Successfully pre-decoded: ${soundName}`);
                })
                .catch(error => {
                    console.error(`Error pre-decoding ${soundName}: `, error);
                });
            decodePromises.push(decodePromise);
        }
    }

    try {
        await Promise.all(decodePromises);
        console.log('All pre-decoding attempts finished.');
    } catch (error) {
        console.error('An error occurred during the Promise.all of pre-decoding sounds:', error);
    }
    
    allSoundsPreDecoded = true; 
    console.log('Pre-decoding process initiated/completed for all applicable sounds. Flag allSoundsPreDecoded set to true.');
}


function updateScoreDisplay() {
    scoreDisplay.textContent = `Punktestand: ${score}`;
}

// 2. Asset Loading
const backgroundImage = new Image();
backgroundImage.src = 'assets/images/background.png'; 
let backgroundLoaded = false;

backgroundImage.onload = () => {
    backgroundLoaded = true;
    console.log('Background image loaded.');
};
backgroundImage.onerror = () => {
    console.error('Error loading background image.');
};

async function loadSound(name, filePath) {
    console.log(`Fetching ArrayBuffer for sound: ${name} from ${filePath}`);
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            console.error(`Error fetching ArrayBuffer for ${name}: HTTP error! status: ${response.status}, file: ${filePath}`);
            throw new Error(`HTTP error! status: ${response.status}, file: ${filePath}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        gameSounds[name] = arrayBuffer; 
        soundsLoadedCount++; 
        console.log(`Successfully fetched ArrayBuffer for: ${name} (${soundsLoadedCount}/${totalSoundsToLoad})`);
    } catch (fetchError) {
        console.error(`Error fetching ArrayBuffer for ${name} from ${filePath}:`, fetchError);
    }
}

async function loadAllSounds() {
    console.log("Starting to load all sounds...");
    const soundPromises = [];
    for (const name in soundFiles) {
        soundPromises.push(loadSound(name, soundFiles[name]));
    }
    try {
        await Promise.all(soundPromises);
        if (soundsLoadedCount === totalSoundsToLoad) {
            console.log("All sounds processing finished. Successfully loaded count:", soundsLoadedCount);
        } else {
            console.warn(`Sound loading process finished, but not all sounds were successful. Loaded: ${soundsLoadedCount}/${totalSoundsToLoad}`);
        }
    } catch (error) {
        console.error('Error loading one or more sounds (Promise.all rejected):', error);
    }
}

function playSound(soundName) {
    console.log(`Attempting to play sound: ${soundName}. AudioContext state: ${audioCtx ? audioCtx.state : 'not initialized'}`);

    if (!audioCtx) {
        console.warn('AudioContext not initialized. Sound not played.');
        return;
    }

    const playLogic = () => {
        const soundData = gameSounds[soundName];
        if (!soundData) {
            console.warn(`Sound data not found for: ${soundName}. Available sounds: ${Object.keys(gameSounds)}`);
            return;
        }

        if (soundData instanceof ArrayBuffer) {
            console.log(`Decoding ArrayBuffer for sound: ${soundName}`);
            audioCtx.decodeAudioData(soundData.slice(0), (decodedBuffer) => {
                gameSounds[soundName] = decodedBuffer; 
                console.log(`Successfully decoded ${soundName}. Now playing.`);
                const source = audioCtx.createBufferSource();
                source.buffer = decodedBuffer;
                source.connect(audioCtx.destination);
                source.start(0);
            }, (error) => {
                console.error(`Error decoding ${soundName}: `, error);
            });
        } else if (soundData instanceof AudioBuffer) { 
            console.log(`Playing already decoded sound: ${soundName}`);
            const source = audioCtx.createBufferSource();
            source.buffer = soundData;
            source.connect(audioCtx.destination);
            source.start(0);
        } else {
            console.error(`Unexpected data type for sound: ${soundName}. Data:`, soundData);
        }
    };

    const attemptPlayActions = () => {
        if (audioCtx.state === 'running' && !allSoundsPreDecoded) {
            console.log('AudioContext is running. Initiating pre-decode for remaining sounds.');
            tryDecodeAllSounds(); 
        }
        playLogic(); 
    };

    if (audioCtx.state === 'suspended') {
        console.log('AudioContext is suspended. Attempting to resume...');
        audioCtx.resume().then(() => {
            console.log('AudioContext resumed. New state:', audioCtx.state);
            attemptPlayActions(); 
        }).catch(e => {
            console.error('Error resuming AudioContext in playSound:', e);
        });
    } else if (audioCtx.state === 'running') {
        attemptPlayActions(); 
    } else {
        console.warn(`AudioContext in unexpected state: ${audioCtx.state}. Sound ${soundName} not played.`);
    }
}

let quizQuestions = [];

async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        quizQuestions = await response.json();
        console.log(`Successfully loaded ${quizQuestions.length} questions.`);
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

// 3. Game Entities
class Paddle {
    constructor() {
        this.width = PADDLE_WIDTH;
        this.height = PADDLE_HEIGHT;
        this.x = (canvasWidth - this.width) / 2;
        this.y = canvasHeight - this.height - 10; 
        this.color = PADDLE_COLORS[0]; 
        this.speed = PADDLE_SPEED;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    changeColor() {
        const currentIndex = PADDLE_COLORS.indexOf(this.color);
        let nextIndex = (currentIndex + 1) % PADDLE_COLORS.length;
        this.color = PADDLE_COLORS[nextIndex];
    }
}

class Ball {
    constructor() {
        this.radius = BALL_RADIUS;
        this.x = canvasWidth / 2;
        this.y = canvasHeight / 2;
        this.color = 'red';
        this.dx = 4;  
        this.dy = -4; 
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;

        if (this.x + this.radius > canvasWidth || this.x - this.radius < 0) {
            this.dx *= -1;
            playSound('wall_hit');
        }

        if (this.y - this.radius < 0) {
            this.dy *= -1;
            playSound('wall_hit');
        }

        if (this.y + this.radius > canvasHeight) {
            playSound('game_over');
            showGameEndPopup(); // Changed from resetGame()
            return; 
        }

        if (this.dy > 0 &&
            this.x + this.radius > paddle.x && 
            this.x - this.radius < paddle.x + paddle.width &&
            this.y + this.radius > paddle.y && 
            this.y - this.radius < paddle.y + paddle.height) {
            
            this.dy *= -1; 
            this.y = paddle.y - this.radius; 

            let offset = (this.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
            this.dx = offset * MAX_BALL_SPEED_X; 
            
            playSound('paddle_hit');
            paddle.changeColor(); 
        }

        for (let i = 0; i < bricks.length; i++) {
            const brick = bricks[i];
            if (brick.visible) {
                const circleX = this.x;
                const circleY = this.y;
                const radius = this.radius;

                const rectX = brick.x;
                const rectY = brick.y;
                const rectWidth = brick.width;
                const rectHeight = brick.height;

                const closestX = Math.max(rectX, Math.min(circleX, rectX + rectWidth));
                const closestY = Math.max(rectY, Math.min(circleY, rectY + rectHeight));

                const distanceX = circleX - closestX;
                const distanceY = circleY - closestY;
                const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

                if (distanceSquared < (radius * radius)) {
                    brick.visible = false;
                    score += 10;
                    updateScoreDisplay();
                    playSound('brick_hit');
                    brickHitCount++;

                    const overlapX = radius - Math.abs(distanceX);
                    const overlapY = radius - Math.abs(distanceY);
                    const tolerance = 0.1; 

                    if (overlapX + tolerance < overlapY) { 
                        this.dx *= -1;
                        this.x += this.dx > 0 ? overlapX : -overlapX; 
                    } else if (overlapY + tolerance < overlapX) { 
                        this.dy *= -1;
                        this.y += this.dy > 0 ? overlapY : -overlapY;
                    } else { 
                        this.dx *= -1;
                        this.dy *= -1;
                        this.x += this.dx > 0 ? overlapX : -overlapX; 
                        this.y += this.dy > 0 ? overlapY : -overlapY;
                    }

                    if (brick.isQuestionBrick) {
                        brick.isQuestionBrick = false;
                        quizActive = true;
                        startQuiz();
                    }
                    break; 
                }
            }
        }
    }
}

class Brick {
    constructor(x, y, width, height, color) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.visible = true;
        this.isQuestionBrick = false; 
    }

    draw(ctx) {
        if (this.visible) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);

            if (this.isQuestionBrick) {
                const qText = "?";
                const x = this.x + this.width / 2;
                const y = this.y + this.height / 2;
                ctx.font = "bold 16px Consolas";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "rgba(220, 220, 220, 0.7)"; 
                const offset = 1; 
                ctx.fillText(qText, x - offset, y - offset);
                ctx.fillText(qText, x + offset, y - offset);
                ctx.fillText(qText, x - offset, y + offset);
                ctx.fillText(qText, x + offset, y + offset);
                ctx.fillStyle = "black"; 
                ctx.fillText(qText, x, y);
            }
        }
    }
}

let bricks = [];
let createdBrickCount = 0; 

function initializeBricks() {
    bricks = []; 
    createdBrickCount = 0; 
    questionBrickTarget = Math.floor(Math.random() * 3) + 6; 

    for (let row = 0; row < BRICK_ROWS; row++) {
        for (let col = 0; col < BRICKS_PER_ROW; col++) {
            createdBrickCount++;
            const x = BRICK_START_X + col * (BRICK_WIDTH + BRICK_PADDING);
            const y = BRICK_START_Y + row * (BRICK_HEIGHT + BRICK_PADDING);
            const color = BRICK_COLORS[row % BRICK_COLORS.length];
            const brick = new Brick(x, y, BRICK_WIDTH, BRICK_HEIGHT, color);

            if (createdBrickCount === questionBrickTarget) {
                brick.isQuestionBrick = true;
                questionBrickTarget += Math.floor(Math.random() * 3) + 6;
            }
            bricks.push(brick);
        }
    }
}

// 4. Rendering Function
function drawGame() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    if (backgroundLoaded) {
        ctx.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);
    } else {
        ctx.fillStyle = '#f0f0f0'; 
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    paddle.draw(ctx);
    ball.draw(ctx);
    bricks.forEach(brick => brick.draw(ctx));
}

// Input Handling
document.addEventListener('keydown', (event) => {
    if (event.key === "ArrowLeft") arrowLeftPressed = true;
    else if (event.key === "ArrowRight") arrowRightPressed = true;
});
document.addEventListener('keyup', (event) => {
    if (event.key === "ArrowLeft") arrowLeftPressed = false;
    else if (event.key === "ArrowRight") arrowRightPressed = false;
});
canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    paddle.x = event.clientX - rect.left - paddle.width / 2;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
});

// Update game state
function update() {
    if (gameIsOver) return; // Pause game if game over popup is shown
    if (quizActive) return;

    if (ballSpeedBoostActive && Date.now() - boostStartTime >= 10000) {
        ball.dx = originalBallSpeedX;
        ball.dy = originalBallSpeedY;
        ballSpeedBoostActive = false;
        console.log("Speed boost ended.");
    } 

    if (arrowLeftPressed) paddle.x -= PADDLE_SPEED;
    if (arrowRightPressed) paddle.x += PADDLE_SPEED;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;

    ball.update(); 
    checkWinCondition(); 
}

// Quiz Functions
function getNewQuizQuestion() {
    if (shuffledQuizQueue.length === 0) {
        if (quizQuestions.length === 0) return null;
        let questionIndices = quizQuestions.map((_, index) => index);
        shuffleArray(questionIndices);
        shuffledQuizQueue = questionIndices.map(index => quizQuestions[index]);
    }
    return shuffledQuizQueue.pop();
}

function startQuiz() {
    currentQuestion = getNewQuizQuestion();
    if (!currentQuestion) {
        quizActive = false; return;
    }
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
}

function handleAnswer(selectedIndex) {
    if (!currentQuestion) return;
    const buttons = quizAnswersEl.getElementsByTagName('button');
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
        if (i === currentQuestion.correct_answer_index) buttons[i].style.backgroundColor = 'lightgreen';
        else if (i === selectedIndex) buttons[i].style.backgroundColor = 'salmon';
        else buttons[i].style.backgroundColor = 'lightgray';
    }

    questionsAnsweredTotal++;
    const correct = selectedIndex === currentQuestion.correct_answer_index;
    if (correct) {
        questionsAnsweredCorrectly++;
        score += 100; 
        quizFeedback.textContent = "+100 Punkte"; 
        quizFeedback.style.color = "green";
    } else {
        score -= 20;
        score = Math.max(0, score); 
        quizFeedback.textContent = "-20 Punkte"; 
        quizFeedback.style.color = "red";
        if (!ballSpeedBoostActive) {
            ballSpeedBoostActive = true;
            originalBallSpeedX = ball.dx;
            originalBallSpeedY = ball.dy;
            ball.dx *= 1.5; ball.dy *= 1.5;
            ball.dx = Math.max(-9, Math.min(9, ball.dx));
            ball.dy = Math.max(-9, Math.min(9, ball.dy));
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
    checkWinCondition(); 
}

// Reset Game
function resetGame() {
    score = 0;
    updateScoreDisplay();
    initializeBricks(); 
    
    paddle.x = (canvasWidth - PADDLE_WIDTH) / 2;
    paddle.y = canvasHeight - PADDLE_HEIGHT - 10;
    paddle.color = PADDLE_COLORS[0]; 

    ball.x = canvasWidth / 2;
    ball.y = canvasHeight / 2; 
    ball.dx = 4;  
    ball.dy = -4; 

    quizActive = false;
    if (ballSpeedBoostActive) { 
        ball.dx = originalBallSpeedX; 
        ball.dy = originalBallSpeedY;
        ballSpeedBoostActive = false;
    }
    brickHitCount = 0; 

    questionsAnsweredCorrectly = 0;
    questionsAnsweredTotal = 0;
    gameIsOver = false; // Reset game over flag

    shuffledQuizQueue = [];
    if (quizQuestions.length > 0) {
        let questionIndices = quizQuestions.map((_, index) => index);
        shuffleArray(questionIndices);
        shuffledQuizQueue = questionIndices.map(index => quizQuestions[index]);
    }
    usedQuestionIndices = []; 
}

// Check Win Condition
function checkWinCondition() {
    if (!bricks || bricks.length === 0) return; 
    const allBricksInvisible = bricks.every(brick => !brick.visible);
    if (allBricksInvisible && !quizActive) {
        showGameEndPopup(); // Changed from showGameSummary()
    }
}

// Show Game End Popup Function (New)
function showGameEndPopup() {
    gameIsOver = true; 

    const gameEndPopup = document.getElementById('gameEndPopup');
    const gameEndTitle = document.getElementById('gameEndTitle');
    const gameEndScore = document.getElementById('gameEndScore');
    const gameEndCorrect = document.getElementById('gameEndCorrect');
    const gameEndIncorrect = document.getElementById('gameEndIncorrect');

    if (!gameEndPopup || !gameEndTitle || !gameEndScore || !gameEndCorrect || !gameEndIncorrect) {
        console.error("Game end popup DOM elements not found! Cannot display results.");
        alert(`Spielende!\nEndpunktestand: ${score}\nFragen: ${questionsAnsweredCorrectly} richtig / ${questionsAnsweredTotal} insgesamt`);
        return;
    }

    const incorrectAnswers = questionsAnsweredTotal - questionsAnsweredCorrectly;

    gameEndTitle.textContent = "Spielende"; 
    gameEndScore.textContent = `Endpunktestand: ${score}`;
    gameEndCorrect.textContent = `Richtige Antworten: ${questionsAnsweredCorrectly}`;
    gameEndIncorrect.textContent = `Falsche Antworten: ${incorrectAnswers}`;
    
    gameEndPopup.style.display = 'block';
    console.log("Game end popup displayed. Score:", score, "Correct:", questionsAnsweredCorrectly, "Total:", questionsAnsweredTotal);
}

// Game Objects
const paddle = new Paddle();
const ball = new Ball();

// Load assets and then start the game
async function initializeGame() {
    console.log("Initializing game, loading assets...");
    await Promise.all([
        loadQuestions(), 
        loadAllSounds() 
    ]);
    
    console.log("Assets loaded, setting up game state.");
    resetGame(); 

    // "Play Again" Button Listener for the new Game End Popup
    const gameEndPlayAgainButton = document.getElementById('gameEndPlayAgainButton');
    if (gameEndPlayAgainButton) {
        gameEndPlayAgainButton.addEventListener('click', () => {
            console.log("'Nochmal spielen' clicked on gameEndPopup.");
            const gameEndPopup = document.getElementById('gameEndPopup');
            if (gameEndPopup) gameEndPopup.style.display = 'none';
            resetGame(); 
        });
        console.log("Game End 'Play Again' button listener set up.");
    } else {
        console.warn("#gameEndPlayAgainButton not found during listener setup.");
    }

    gameLoop();
}

// 5. Game Loop
function gameLoop() {
    update(); 
    drawGame(); 
    requestAnimationFrame(gameLoop);
}

initializeGame();
console.log("game.js loaded and core mechanics (collisions, game over, win) implemented.");
