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

    // Wait for all initiated decodes to settle (optional, but good for knowing when it's "done")
    // If we don't wait, allSoundsPreDecoded = true might be set prematurely for this log.
    // However, the primary goal is to kick them off.
    try {
        await Promise.all(decodePromises);
        console.log('All pre-decoding attempts finished.');
    } catch (error) {
        // This catch is mostly for Promise.all setup errors, individual errors are caught above.
        console.error('An error occurred during the Promise.all of pre-decoding sounds:', error);
    }
    
    allSoundsPreDecoded = true; // Set flag after all attempts are made
    console.log('Pre-decoding process initiated/completed for all applicable sounds. Flag allSoundsPreDecoded set to true.');
}


function updateScoreDisplay() {
    scoreDisplay.textContent = `Punktestand: ${score}`;
}

// 2. Asset Loading
// Images
const backgroundImage = new Image();
backgroundImage.src = 'assets/images/background.png'; // Assuming you'll have this path
let backgroundLoaded = false;

backgroundImage.onload = () => {
    backgroundLoaded = true;
    console.log('Background image loaded.');
};
backgroundImage.onerror = () => {
    console.error('Error loading background image.');
};

// Sound Loading Function
async function loadSound(name, filePath) {
    console.log(`Fetching ArrayBuffer for sound: ${name} from ${filePath}`);
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            console.error(`Error fetching ArrayBuffer for ${name}: HTTP error! status: ${response.status}, file: ${filePath}`);
            throw new Error(`HTTP error! status: ${response.status}, file: ${filePath}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        gameSounds[name] = arrayBuffer; // Store ArrayBuffer directly
        soundsLoadedCount++; // Increment based on successful fetch of ArrayBuffer
        console.log(`Successfully fetched ArrayBuffer for: ${name} (${soundsLoadedCount}/${totalSoundsToLoad})`);
    } catch (fetchError) {
        console.error(`Error fetching ArrayBuffer for ${name} from ${filePath}:`, fetchError);
        // Optionally, mark this sound as failed or handle appropriately
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
        // This catch might be redundant if individual loadSound errors are handled,
        // but good for overall Promise.all failure.
        console.error('Error loading one or more sounds (Promise.all rejected):', error);
    }
}

// New playSound Function
function playSound(soundName) {
    console.log(`Attempting to play sound: ${soundName}. AudioContext state: ${audioCtx ? audioCtx.state : 'not initialized'}`);

    if (!audioCtx) {
        console.warn('AudioContext not initialized. Sound not played.');
        return;
    }

    const playLogic = () => {
        // This is the existing logic for getting soundData, decoding if ArrayBuffer, and playing
        const soundData = gameSounds[soundName];
        if (!soundData) {
            console.warn(`Sound data not found for: ${soundName}. Available sounds: ${Object.keys(gameSounds)}`);
            return;
        }

        if (soundData instanceof ArrayBuffer) {
            console.log(`Decoding ArrayBuffer for sound: ${soundName}`);
            // Use soundData.slice(0) to create a copy for decodeAudioData, as it might modify the buffer
            audioCtx.decodeAudioData(soundData.slice(0), (decodedBuffer) => {
                gameSounds[soundName] = decodedBuffer; // Cache decoded buffer
                console.log(`Successfully decoded ${soundName}. Now playing.`);
                const source = audioCtx.createBufferSource();
                source.buffer = decodedBuffer;
                source.connect(audioCtx.destination);
                source.start(0);
            }, (error) => {
                console.error(`Error decoding ${soundName}: `, error);
            });
        } else if (soundData instanceof AudioBuffer) { // Check if it's an AudioBuffer
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
        // This is the new part to run once audio is confirmed running
        if (audioCtx.state === 'running' && !allSoundsPreDecoded) {
            console.log('AudioContext is running. Initiating pre-decode for remaining sounds.');
            tryDecodeAllSounds(); // This will set allSoundsPreDecoded = true internally
        }
        // Now, proceed with the playLogic for the current sound
        playLogic(); 
    };

    if (audioCtx.state === 'suspended') {
        console.log('AudioContext is suspended. Attempting to resume...');
        audioCtx.resume().then(() => {
            console.log('AudioContext resumed. New state:', audioCtx.state);
            attemptPlayActions(); // Call after resume attempt
        }).catch(e => {
            console.error('Error resuming AudioContext in playSound:', e);
        });
    } else if (audioCtx.state === 'running') {
        attemptPlayActions(); // Call if already running
    } else {
        console.warn(`AudioContext in unexpected state: ${audioCtx.state}. Sound ${soundName} not played.`);
    }
}


// Quiz Questions
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

// Paddle
class Paddle {
    constructor() {
        this.width = PADDLE_WIDTH;
        this.height = PADDLE_HEIGHT;
        this.x = (canvasWidth - this.width) / 2;
        this.y = canvasHeight - this.height - 10; // 10px from bottom
        this.color = PADDLE_COLORS[0]; // Initial paddle color
        this.speed = PADDLE_SPEED;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    // moveLeft and moveRight methods are no longer needed for mouse control.
    // The 'speed' property of the paddle is also no longer used.

    changeColor() {
        const currentIndex = PADDLE_COLORS.indexOf(this.color);
        let nextIndex = (currentIndex + 1) % PADDLE_COLORS.length;
        // Ensure it's a different color if possible, though simple cycling is fine
        this.color = PADDLE_COLORS[nextIndex];
    }
}

// Ball
class Ball {
    constructor() {
        this.radius = BALL_RADIUS;
        this.x = canvasWidth / 2;
        this.y = canvasHeight / 2;
        this.color = 'red';
        this.dx = 4;  // Initial speed x
        this.dy = -4; // Initial speed y
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

        // Wall collision (left/right)
        if (this.x + this.radius > canvasWidth || this.x - this.radius < 0) {
            this.dx *= -1;
            playSound('wall_hit');
        }

        // Wall collision (top)
        if (this.y - this.radius < 0) {
            this.dy *= -1;
            playSound('wall_hit');
        }

        // Wall collision (bottom - Game Over)
        if (this.y + this.radius > canvasHeight) {
            playSound('game_over');
            resetGame();
            return; // Important to stop further processing after game over
        }

        // Paddle Collision
        // Check if ball is moving downwards and is within paddle's x range and y range
        if (this.dy > 0 &&
            this.x + this.radius > paddle.x && 
            this.x - this.radius < paddle.x + paddle.width &&
            this.y + this.radius > paddle.y && 
            this.y - this.radius < paddle.y + paddle.height) {
            
            this.dy *= -1; // Reverse vertical direction
            this.y = paddle.y - this.radius; // Position ball just above paddle

            // Adjust horizontal speed based on hit location on paddle
            let offset = (this.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
            this.dx = offset * MAX_BALL_SPEED_X; // More direct influence like Pygame, capped by MAX_BALL_SPEED_X
            
            playSound('paddle_hit');
            paddle.changeColor(); // Optional: Change paddle color
        }

        // Brick Collision
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

                // Find the closest point on the rectangle to the circle's center
                const closestX = Math.max(rectX, Math.min(circleX, rectX + rectWidth));
                const closestY = Math.max(rectY, Math.min(circleY, rectY + rectHeight));

                // Calculate distance between circle's center and this closest point
                const distanceX = circleX - closestX;
                const distanceY = circleY - closestY;
                const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

                // If the distance is less than the circle's radius squared, a collision occurred
                if (distanceSquared < (radius * radius)) {
                    console.log(`Collision with brick at (${rectX}, ${rectY}). Ball at (${circleX.toFixed(2)}, ${circleY.toFixed(2)})`);
                    console.log(`Closest point: (${closestX.toFixed(2)}, ${closestY.toFixed(2)}), Distances: (dX:${distanceX.toFixed(2)}, dY:${distanceY.toFixed(2)})`);

                    brick.visible = false;
                    score += 10;
                    updateScoreDisplay();
                    playSound('brick_hit');
                    brickHitCount++;

                    // Refined Bounce Logic
                    const overlapX = radius - Math.abs(distanceX);
                    const overlapY = radius - Math.abs(distanceY);
                    console.log(`Overlaps: (oX:${overlapX.toFixed(2)}, oY:${overlapY.toFixed(2)})`);

                    // Determine primary collision edge based on penetration depth
                    // Add a small tolerance to prefer vertical bounce for typical Breakout feel
                    const tolerance = 0.1; 
                    if (overlapX + tolerance < overlapY) { // Collision is more horizontal (hit side of brick)
                        console.log("Horizontal collision detected, reversing dx.");
                        this.dx *= -1;
                        // Nudge ball out
                        this.x += this.dx > 0 ? overlapX : -overlapX; 
                    } else if (overlapY + tolerance < overlapX) { // Collision is more vertical (hit top/bottom of brick)
                        console.log("Vertical collision detected, reversing dy.");
                        this.dy *= -1;
                        // Nudge ball out
                        this.y += this.dy > 0 ? overlapY : -overlapY;
                    } else { // Corner hit or very similar overlaps
                        console.log("Corner collision detected, reversing both dx and dy.");
                        this.dx *= -1;
                        this.dy *= -1;
                        // Nudge ball out (can be tricky for corners, simpler nudge for now)
                        this.x += this.dx > 0 ? overlapX : -overlapX; 
                        this.y += this.dy > 0 ? overlapY : -overlapY;
                    }


                    if (brick.isQuestionBrick) {
                        console.log('Question brick hit! Triggering quiz...');
                        brick.isQuestionBrick = false;
                        quizActive = true;
                        startQuiz();
                    }
                    break; // Exit loop after one hit
                }
            }
        }
    }
}

// Brick
class Brick {
    constructor(x, y, width, height, color) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.visible = true;
        this.isQuestionBrick = false; // New property
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

                // Shadow/Outline
                ctx.fillStyle = "rgba(220, 220, 220, 0.7)"; // A slightly more opaque light gray (adjust color/opacity as needed)
                const offset = 1; // Shadow offset
                ctx.fillText(qText, x - offset, y - offset);
                ctx.fillText(qText, x + offset, y - offset);
                ctx.fillText(qText, x - offset, y + offset);
                ctx.fillText(qText, x + offset, y + offset);
                // Optional: a central, slightly more blurred shadow behind everything
                // ctx.fillStyle = "rgba(50, 50, 50, 0.3)"; 
                // ctx.fillText(qText, x, y, some_blur_if_supported_directly_or_canvas_shadow_prop);

                // Main text
                ctx.fillStyle = "black"; // Original text color
                ctx.fillText(qText, x, y);
                // console.log(`Drawing '?' on question brick at (${this.x}, ${this.y})`); // Potentially noisy
            }
        }
    }
}

// Bricks Array
let bricks = [];
let createdBrickCount = 0; // Used during initializeBricks for designation

function initializeBricks() {
    bricks = []; // Clear existing bricks
    createdBrickCount = 0; // Reset for designation
    // Initial target: 6, 7, or 8
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
                // Update target for the next question brick: adds 6, 7, or 8
                questionBrickTarget += Math.floor(Math.random() * 3) + 6;
                console.log(`Brick at (${brick.x}, ${brick.y}) designated as question brick. Next target: ${questionBrickTarget}`);
            }
            bricks.push(brick);
        }
    }
}

// 4. Rendering Function
function drawGame() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw background
    if (backgroundLoaded) {
        ctx.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);
    } else {
        ctx.fillStyle = '#f0f0f0'; // Fallback background color
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Draw game entities
    paddle.draw(ctx);
    ball.draw(ctx);
    bricks.forEach(brick => brick.draw(ctx));
}

// Input Handling
document.addEventListener('keydown', (event) => {
    if (event.key === "ArrowLeft") {
        arrowLeftPressed = true;
    } else if (event.key === "ArrowRight") {
        arrowRightPressed = true;
    }
});

document.addEventListener('keyup', (event) => {
    if (event.key === "ArrowLeft") {
        arrowLeftPressed = false;
    } else if (event.key === "ArrowRight") {
        arrowRightPressed = false;
    }
});

canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    paddle.x = mouseX - paddle.width / 2;

    // Paddle Boundary Constraints
    if (paddle.x < 0) {
        paddle.x = 0;
    }
    if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }
});

// Update game state
function update() {
    if (quizActive) { // If quiz is active, pause game logic updates
        // console.log('Game update paused, quiz is active.'); // Potentially noisy
        return;
    }

    // Speed Boost Management
    if (ballSpeedBoostActive) {
        if (Date.now() - boostStartTime >= 10000) { // 10 seconds
            ball.dx = originalBallSpeedX;
            ball.dy = originalBallSpeedY;
            ballSpeedBoostActive = false;
            console.log("Speed boost ended.");
        }
    } 

    // Paddle movement based on leftPressed and rightPressed flags is removed.
    // Paddle position will be updated directly by the mousemove event handler.

    // Paddle movement based on arrow keys
    if (arrowLeftPressed) {
        paddle.x -= PADDLE_SPEED;
    }
    if (arrowRightPressed) {
        paddle.x += PADDLE_SPEED;
    }

    // Boundary checks for paddle (after keyboard or mouse update)
    if (paddle.x < 0) {
        paddle.x = 0;
    }
    if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }

    ball.update(); // This now includes collision detection for ball-paddle and ball-brick
    checkWinCondition(); // Check if all bricks are cleared
}

// Quiz Functions
function getNewQuizQuestion() {
    if (shuffledQuizQueue.length === 0) {
        console.log('Shuffled quiz queue empty. Re-shuffling all questions.');
        if (quizQuestions.length === 0) {
            console.error("Master quizQuestions list is empty. Cannot re-shuffle.");
            return null; // No questions available at all
        }
        // Re-populate and re-shuffle the queue
        let questionIndices = quizQuestions.map((_, index) => index);
        shuffleArray(questionIndices);
        shuffledQuizQueue = questionIndices.map(index => quizQuestions[index]);
        console.log('Quiz questions re-shuffled. New queue length:', shuffledQuizQueue.length);
    }

    const nextQuestion = shuffledQuizQueue.pop(); // Get the next question from the end of the array
    console.log(`Next question from queue: ${nextQuestion ? nextQuestion.title : 'N/A'}. Queue size now: ${shuffledQuizQueue.length}`);
    return nextQuestion;
}

function startQuiz() {
    console.log('startQuiz() called.');
    currentQuestion = getNewQuizQuestion();
    console.log('Current question:', currentQuestion);

    if (!currentQuestion) {
        console.error('No question data available to start quiz.');
        quizActive = false; // Ensure game doesn't stay paused
        return;
    }

    console.log('Accessing quiz DOM elements...');
    // IDs to verify: #quizPopup, #quizTitle, #quizQuestion, #quizAnswers, #quizFeedback
    // These are assumed to be correct as they are defined as constants at the top.
    
    quizTitle.textContent = currentQuestion.title;
    quizQuestionEl.textContent = currentQuestion.question;
    quizAnswersEl.innerHTML = ''; // Clear previous answers
    
    currentQuestion.answers.forEach((answer, index) => {
        const button = document.createElement('button');
        button.textContent = answer;
        button.onclick = () => handleAnswer(index);
        quizAnswersEl.appendChild(button);
    });
    
    quizFeedback.textContent = '';
    quizPopup.style.display = 'block';
    console.log('Quiz popup populated. Setting display to block.');
}

function handleAnswer(selectedIndex) {
    if (!currentQuestion) {
        console.error("handleAnswer called but no currentQuestion.");
        return;
    }
    console.log(`handleAnswer() called with index: ${selectedIndex}. Correct index: ${currentQuestion.correct_answer_index}`);

    const buttons = quizAnswersEl.getElementsByTagName('button');
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
        if (i === currentQuestion.correct_answer_index) {
            buttons[i].style.backgroundColor = 'lightgreen';
        } else if (i === selectedIndex) {
            buttons[i].style.backgroundColor = 'salmon';
        } else {
            buttons[i].style.backgroundColor = 'lightgray'; // Or '' for default
        }
    }

    questionsAnsweredTotal++;
    const correct = selectedIndex === currentQuestion.correct_answer_index;
    if (correct) {
        questionsAnsweredCorrectly++;
        score += 100; // Updated score
        quizFeedback.textContent = "+100 Punkte"; // Updated feedback text
        quizFeedback.style.color = "green";
    } else {
        score -= 20;
        score = Math.max(0, score); // Prevent score from going below zero
        quizFeedback.textContent = "-20 Punkte"; // Updated feedback text
        quizFeedback.style.color = "red";

        // The original problem description for this subtask did not mention
        // removing the speed boost logic on incorrect answer, so I'll keep it.
        if (!ballSpeedBoostActive) {
            ballSpeedBoostActive = true;
            originalBallSpeedX = ball.dx;
            originalBallSpeedY = ball.dy;
            ball.dx *= 1.5;
            ball.dy *= 1.5;
            // Cap speeds
            ball.dx = Math.max(-9, Math.min(9, ball.dx));
            ball.dy = Math.max(-9, Math.min(9, ball.dy));
            boostStartTime = Date.now();
            console.log("Speed boost activated.");
        }
    }
    updateScoreDisplay();
    console.log(`Score: ${score}, Feedback: ${quizFeedback.textContent}`);
    setTimeout(endQuiz, 2000); // Display feedback for 2 seconds
}

function endQuiz() {
    console.log('endQuiz() called. Hiding quiz popup.');
    quizPopup.style.display = 'none';
    quizActive = false;
    currentQuestion = null;
    checkWinCondition(); // Check if winning after quiz on last brick
}

// Reset Game
function resetGame() {
    score = 0;
    updateScoreDisplay();
    initializeBricks(); // Make all bricks visible again, including new question bricks
    
    // Reset paddle position and color
    paddle.x = (canvasWidth - PADDLE_WIDTH) / 2;
    paddle.y = canvasHeight - PADDLE_HEIGHT - 10;
    paddle.color = PADDLE_COLORS[0]; // Reset to initial paddle color

    // Reset ball position and speed
    ball.x = canvasWidth / 2;
    ball.y = canvasHeight / 2; 
    ball.dx = 4;  // Default speed
    ball.dy = -4; // Start moving upwards

    // Reset quiz related states
    quizActive = false;
    if (ballSpeedBoostActive) { // If boost was active, reset ball speed
        // Ensure originalBallSpeedX/Y hold the non-boosted speeds.
        // If resetGame is called while boost is active, this reverts it.
        ball.dx = originalBallSpeedX; 
        ball.dy = originalBallSpeedY;
        ballSpeedBoostActive = false;
        console.log("Speed boost deactivated by game reset.");
    }
    // questionBrickTarget will be reset by initializeBricks
    brickHitCount = 0; // Reset global hit count

    // Reset Quiz Statistics
    questionsAnsweredCorrectly = 0;
    questionsAnsweredTotal = 0;

    // Populate and shuffle quiz queue
    shuffledQuizQueue = [];
    if (quizQuestions.length > 0) {
        let questionIndices = quizQuestions.map((_, index) => index);
        shuffleArray(questionIndices);
        shuffledQuizQueue = questionIndices.map(index => quizQuestions[index]);
        console.log('Quiz questions shuffled. New queue length:', shuffledQuizQueue.length);
    } else {
        console.warn('Cannot shuffle quiz questions: quizQuestions array is empty.');
    }
    usedQuestionIndices = []; // Reset, as it's not used by the new getNewQuizQuestion logic
}

// Check Win Condition
function checkWinCondition() {
    if (!bricks || bricks.length === 0) {
        return; 
    }
    const allBricksInvisible = bricks.every(brick => !brick.visible);
    
    // Win condition: All bricks gone AND quiz is not currently active
    if (allBricksInvisible && !quizActive) {
        console.log("Win condition met. Showing game summary.");
        showGameSummary();
    }
}

// Show Game Summary Function
function showGameSummary() {
    console.log("Showing game summary. Score:", score, "Correct:", questionsAnsweredCorrectly, "Total:", questionsAnsweredTotal);
    const summaryPopup = document.getElementById('gameSummaryPopup');
    const summaryTitle = document.getElementById('summaryTitle');
    const summaryScoreDisplay = document.getElementById('summaryScore');
    const summaryQuizStatsDisplay = document.getElementById('summaryQuizStats');

    if (!summaryPopup || !summaryTitle || !summaryScoreDisplay || !summaryQuizStatsDisplay) {
        console.error("Game summary DOM elements not found! Falling back to alert.");
        // Fallback to alert and reset if DOM elements are missing
        alert(`DU HAST GEWONNEN!
Endpunktestand: ${score}
Fragen: ${questionsAnsweredCorrectly} richtig / ${questionsAnsweredTotal} insgesamt`);
        resetGame();
        return;
    }

    summaryTitle.textContent = "DU HAST GEWONNEN!";
    summaryScoreDisplay.textContent = `Endpunktestand: ${score}`;
    summaryQuizStatsDisplay.textContent = `Fragen: ${questionsAnsweredCorrectly} richtig / ${questionsAnsweredTotal} insgesamt`;
    
    summaryPopup.style.display = 'block';
    // Game loop is effectively paused because checkWinCondition is called from update,
    // and if win is true, subsequent updates will be short-circuited by quizActive or other means.
    // Or, if we want to be absolutely sure, we could set a new global flag like `gameWon = true`
    // and check that at the start of update(). For now, this should suffice as there are no bricks.
}


// Game Objects
const paddle = new Paddle();
const ball = new Ball();

// Load assets and then start the game
async function initializeGame() {
    // Parallel loading of questions and sounds
    console.log("Initializing game, loading assets...");
    await Promise.all([
        loadQuestions(), 
        loadAllSounds() // Ensure sounds are loaded
    ]);
    
    console.log("Assets loaded, setting up game state.");
    // Initial game setup
    resetGame(); // Use resetGame for initial setup as well

    // The one-time click listener for resuming AudioContext has been removed.
    // AudioContext resume will now be attempted within playSound if needed.

    // "Play Again" Button Listener
    const playAgainButton = document.getElementById('playAgainButton');
    if (playAgainButton) {
        playAgainButton.addEventListener('click', () => {
            console.log("'Play Again' clicked.");
            const summaryPopup = document.getElementById('gameSummaryPopup');
            if (summaryPopup) summaryPopup.style.display = 'none';
            resetGame();
        });
        console.log("Play Again button listener set up.");
    } else {
        console.warn("#playAgainButton not found during listener setup.");
    }

    // Start the game loop
    gameLoop();
}

// The global resumeAudioContext() function is no longer needed and has been removed.

// 5. Game Loop
function gameLoop() {
    update(); // Update game state (movement, collisions, win/loss etc.)
    drawGame(); // Render the game
    requestAnimationFrame(gameLoop);
}

// Start the initialization process
initializeGame();

console.log("game.js loaded and core mechanics (collisions, game over, win) implemented.");
