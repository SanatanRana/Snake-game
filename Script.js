
        // Game Configuration
        const CONFIG = {
            gridSize: 20,
            cellSize: 20,
            canvasSize: 400,
            difficulties: {
                easy: 150,
                medium: 100,
                hard: 60
            }
        };

        // Game State
        class Game {
            constructor() {
                this.canvas = document.getElementById('gameCanvas');
                this.ctx = this.canvas.getContext('2d');
                this.score = 0;
                this.highScore = this.loadHighScore();
                this.difficulty = 'medium';
                this.speed = CONFIG.difficulties[this.difficulty];
                this.gameState = 'idle'; // idle, playing, paused, gameOver
                this.lastRenderTime = 0;
                
                this.initSnake();
                this.generateFood();
                this.setupEventListeners();
                this.updateDisplay();
            }

            initSnake() {
                const center = Math.floor(CONFIG.gridSize / 2);
                this.snake = [
                    { x: center, y: center },
                    { x: center - 1, y: center },
                    { x: center - 2, y: center }
                ];
                this.direction = { x: 1, y: 0 };
                this.nextDirection = { x: 1, y: 0 };
            }

            generateFood() {
                let foodPosition;
                do {
                    foodPosition = {
                        x: Math.floor(Math.random() * CONFIG.gridSize),
                        y: Math.floor(Math.random() * CONFIG.gridSize)
                    };
                } while (this.isSnakeCell(foodPosition.x, foodPosition.y));
                
                this.food = foodPosition;
            }

            isSnakeCell(x, y) {
                return this.snake.some(segment => segment.x === x && segment.y === y);
            }

            setupEventListeners() {
                // Keyboard controls
                document.addEventListener('keydown', (e) => this.handleKeyPress(e));
                
                // Button controls
                document.getElementById('startBtn').addEventListener('click', () => this.start());
                document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
                document.getElementById('resetBtn').addEventListener('click', () => this.reset());

                // Difficulty selection
                document.querySelectorAll('.difficulty-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => this.changeDifficulty(e.target.dataset.level));
                });

                // Mobile controls
                document.getElementById('upBtn').addEventListener('click', () => this.changeDirection(0, -1));
                document.getElementById('downBtn').addEventListener('click', () => this.changeDirection(0, 1));
                document.getElementById('leftBtn').addEventListener('click', () => this.changeDirection(-1, 0));
                document.getElementById('rightBtn').addEventListener('click', () => this.changeDirection(1, 0));

                // Touch swipe controls
                let touchStartX = 0;
                let touchStartY = 0;

                this.canvas.addEventListener('touchstart', (e) => {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                }, { passive: true });

                this.canvas.addEventListener('touchend', (e) => {
                    if (!touchStartX || !touchStartY) return;

                    const touchEndX = e.changedTouches[0].clientX;
                    const touchEndY = e.changedTouches[0].clientY;

                    const dx = touchEndX - touchStartX;
                    const dy = touchEndY - touchStartY;

                    if (Math.abs(dx) > Math.abs(dy)) {
                        this.changeDirection(dx > 0 ? 1 : -1, 0);
                    } else {
                        this.changeDirection(0, dy > 0 ? 1 : -1);
                    }

                    touchStartX = 0;
                    touchStartY = 0;
                }, { passive: true });
            }

            handleKeyPress(e) {
                // Start game on any key when in idle or gameOver state
                if (this.gameState === 'idle' || this.gameState === 'gameOver') {
                    this.start();
                    e.preventDefault();
                    return;
                }

                // Pause on spacebar
                if (e.code === 'Space' && this.gameState !== 'idle') {
                    this.togglePause();
                    e.preventDefault();
                    return;
                }

                // Direction controls
                const keyMap = {
                    'ArrowUp': { x: 0, y: -1 },
                    'KeyW': { x: 0, y: -1 },
                    'ArrowDown': { x: 0, y: 1 },
                    'KeyS': { x: 0, y: 1 },
                    'ArrowLeft': { x: -1, y: 0 },
                    'KeyA': { x: -1, y: 0 },
                    'ArrowRight': { x: 1, y: 0 },
                    'KeyD': { x: 1, y: 0 }
                };

                if (keyMap[e.code]) {
                    this.changeDirection(keyMap[e.code].x, keyMap[e.code].y);
                    e.preventDefault();
                }
            }

            changeDirection(x, y) {
                // Prevent 180-degree turns
                if (this.direction.x === -x || this.direction.y === -y) return;
                this.nextDirection = { x, y };
            }

            changeDifficulty(level) {
                if (this.gameState === 'playing') return;
                
                this.difficulty = level;
                this.speed = CONFIG.difficulties[level];
                
                document.querySelectorAll('.difficulty-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.level === level);
                });
            }

            start() {
                if (this.gameState === 'gameOver' || this.gameState === 'idle') {
                    this.reset();
                }
                
                this.gameState = 'playing';
                this.hideOverlay('startOverlay');
                this.hideOverlay('gameOverOverlay');
                this.updateButtons();
                this.lastRenderTime = 0;
                requestAnimationFrame((time) => this.gameLoop(time));
            }

            togglePause() {
                if (this.gameState === 'playing') {
                    this.gameState = 'paused';
                } else if (this.gameState === 'paused') {
                    this.gameState = 'playing';
                    this.lastRenderTime = 0;
                    requestAnimationFrame((time) => this.gameLoop(time));
                }
                this.updateButtons();
            }

            reset() {
                this.score = 0;
                this.gameState = 'idle';
                this.initSnake();
                this.generateFood();
                this.updateDisplay();
                this.updateButtons();
                this.render();
                this.showOverlay('startOverlay');
            }

            gameLoop(currentTime) {
                if (this.gameState !== 'playing') return;

                const deltaTime = currentTime - this.lastRenderTime;

                if (deltaTime >= this.speed) {
                    this.update();
                    this.render();
                    this.lastRenderTime = currentTime;
                }

                requestAnimationFrame((time) => this.gameLoop(time));
            }

            update() {
                // Update direction
                this.direction = { ...this.nextDirection };

                // Calculate new head position
                const head = { ...this.snake[0] };
                head.x += this.direction.x;
                head.y += this.direction.y;

                // Check wall collision
                if (head.x < 0 || head.x >= CONFIG.gridSize || 
                    head.y < 0 || head.y >= CONFIG.gridSize) {
                    this.gameOver();
                    return;
                }

                // Check self collision
                if (this.isSnakeCell(head.x, head.y)) {
                    this.gameOver();
                    return;
                }

                // Add new head
                this.snake.unshift(head);

                // Check food collision
                if (head.x === this.food.x && head.y === this.food.y) {
                    this.score += 10;
                    this.updateDisplay();
                    this.generateFood();
                } else {
                    // Remove tail if no food eaten
                    this.snake.pop();
                }
            }

            render() {
                // Clear canvas
                this.ctx.fillStyle = '#f8f9fa';
                this.ctx.fillRect(0, 0, CONFIG.canvasSize, CONFIG.canvasSize);

                // Draw grid
                this.ctx.strokeStyle = '#e9ecef';
                this.ctx.lineWidth = 1;
                for (let i = 0; i <= CONFIG.gridSize; i++) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(i * CONFIG.cellSize, 0);
                    this.ctx.lineTo(i * CONFIG.cellSize, CONFIG.canvasSize);
                    this.ctx.stroke();

                    this.ctx.beginPath();
                    this.ctx.moveTo(0, i * CONFIG.cellSize);
                    this.ctx.lineTo(CONFIG.canvasSize, i * CONFIG.cellSize);
                    this.ctx.stroke();
                }

                // Draw snake
                this.snake.forEach((segment, index) => {
                    const gradient = this.ctx.createLinearGradient(
                        segment.x * CONFIG.cellSize,
                        segment.y * CONFIG.cellSize,
                        (segment.x + 1) * CONFIG.cellSize,
                        (segment.y + 1) * CONFIG.cellSize
                    );
                    
                    if (index === 0) {
                        gradient.addColorStop(0, '#667eea');
                        gradient.addColorStop(1, '#764ba2');
                    } else {
                        gradient.addColorStop(0, '#667eea');
                        gradient.addColorStop(1, '#5568d3');
                    }

                    this.ctx.fillStyle = gradient;
                    this.ctx.fillRect(
                        segment.x * CONFIG.cellSize + 2,
                        segment.y * CONFIG.cellSize + 2,
                        CONFIG.cellSize - 4,
                        CONFIG.cellSize - 4
                    );
                    
                    // Add rounded corners effect
                    this.ctx.strokeStyle = index === 0 ? '#764ba2' : '#5568d3';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(
                        segment.x * CONFIG.cellSize + 2,
                        segment.y * CONFIG.cellSize + 2,
                        CONFIG.cellSize - 4,
                        CONFIG.cellSize - 4
                    );
                });

                // Draw food with pulse effect
                const time = Date.now() / 500;
                const pulseSize = Math.sin(time) * 2 + CONFIG.cellSize - 4;
                const offset = (CONFIG.cellSize - pulseSize) / 2;
                
                this.ctx.fillStyle = '#ff6b6b';
                this.ctx.beginPath();
                this.ctx.arc(
                    this.food.x * CONFIG.cellSize + CONFIG.cellSize / 2,
                    this.food.y * CONFIG.cellSize + CONFIG.cellSize / 2,
                    pulseSize / 2,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();
            }

            gameOver() {
                this.gameState = 'gameOver';
                
                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    this.saveHighScore();
                }
                
                this.updateDisplay();
                this.updateButtons();
                
                document.getElementById('finalScore').textContent = `Score: ${this.score}`;
                this.showOverlay('gameOverOverlay');
            }

            updateDisplay() {
                document.getElementById('score').textContent = this.score;
                document.getElementById('highScore').textContent = this.highScore;
            }

            updateButtons() {
                const startBtn = document.getElementById('startBtn');
                const pauseBtn = document.getElementById('pauseBtn');

                startBtn.disabled = this.gameState === 'playing' || this.gameState === 'paused';
                pauseBtn.disabled = this.gameState === 'idle' || this.gameState === 'gameOver';
                pauseBtn.textContent = this.gameState === 'paused' ? 'Resume' : 'Pause';
            }

            showOverlay(id) {
                document.getElementById(id).classList.add('active');
            }

            hideOverlay(id) {
                document.getElementById(id).classList.remove('active');
            }

            saveHighScore() {
                try {
                    localStorage.setItem('snakeHighScore', this.highScore.toString());
                } catch (e) {
                    console.log('LocalStorage not available');
                }
            }

            loadHighScore() {
                try {
                    return parseInt(localStorage.getItem('snakeHighScore')) || 0;
                } catch (e) {
                    return 0;
                }
            }
        }

        // Initialize game when page loads
        window.addEventListener('load', () => {
            new Game();
        });