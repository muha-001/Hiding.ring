// === Game Settings ===
        const LEVELS = {
            beginner: { hands: 8, time: null, scoreMultiplier: 1 },
            pro: { hands: 12, time: 45, scoreMultiplier: 2 },
            legendary: { hands: 16, time: 30, scoreMultiplier: 3 }
        };

        // === Game State ===
        let currentLevel = 'beginner';
        let winningHandIndex = -1;
        let selectedHandIndex = -1;
        let eliminatedHands = [];
        let score = 0;
        let timeLeft = 0;
        let timerInterval = null;
        let isGameOver = false;
        let audioEnabled = true;

        // === DOM Elements ===
        const elements = {
            levelScreen: document.getElementById('levelScreen'),
            handsGrid: document.getElementById('handsGrid'),
            btnLock: document.getElementById('btnLock'),
            btnEliminate: document.getElementById('btnEliminate'),
            btnReveal: document.getElementById('btnReveal'),
            btnReset: document.getElementById('btnReset'),
            timerDisplay: document.getElementById('timerDisplay'),
            scoreDisplay: document.getElementById('scoreDisplay'),
            levelDisplay: document.getElementById('levelDisplay'),
            progressBar: document.getElementById('progressBar'),
            resultOverlay: document.getElementById('resultOverlay'),
            resultIcon: document.getElementById('resultIcon'),
            resultTitle: document.getElementById('resultTitle'),
            resultScore: document.getElementById('resultScore'),
            particleCanvas: document.getElementById('particleCanvas'),
            audioToggle: document.getElementById('audioToggle')
        };

        // === Audio Engine ===
        class AudioEngine {
            constructor() {
                this.ctx = null;
                this.initialized = false;
            }

            init() {
                if (this.initialized) return;
                try {
                    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                    this.initialized = true;
                } catch (e) {
                    console.log('Audio not supported');
                }
            }

            resume() {
                if (this.ctx && this.ctx.state === 'suspended') {
                    this.ctx.resume();
                }
            }

            playTone(freq, type, duration, volume = 0.3) {
                if (!audioEnabled || !this.ctx || !this.initialized) return;
                try {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = type;
                    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start();
                    osc.stop(this.ctx.currentTime + duration);
                } catch (e) {
                    console.log('Audio play error:', e);
                }
            }

            playClick() { this.playTone(800, 'sine', 0.1, 0.2); }
            playSelect() { this.playTone(1200, 'sine', 0.15, 0.3); }
            playEliminate() {
                this.playTone(400, 'square', 0.3, 0.2);
                setTimeout(() => this.playTone(300, 'square', 0.3, 0.2), 100);
            }
            playLock() {
                this.playTone(600, 'triangle', 0.2, 0.3);
                setTimeout(() => this.playTone(800, 'triangle', 0.2, 0.3), 150);
            }
            playWin() {
                const notes = [523, 659, 784, 1046, 784, 1046];
                notes.forEach((freq, i) => {
                    setTimeout(() => this.playTone(freq, 'sine', 0.3, 0.4), i * 150);
                });
            }
            playLose() {
                const notes = [400, 350, 300, 250];
                notes.forEach((freq, i) => {
                    setTimeout(() => this.playTone(freq, 'sawtooth', 0.4, 0.3), i * 200);
                });
            }
            playTimeWarning() { this.playTone(1000, 'square', 0.1, 0.2); }
            playTimeReset() {
                this.playTone(600, 'sine', 0.2, 0.3);
                setTimeout(() => this.playTone(800, 'sine', 0.2, 0.3), 100);
                setTimeout(() => this.playTone(1000, 'sine', 0.3, 0.3), 200);
            }
        }

        const audio = new AudioEngine();

        // === Toggle Audio ===
        function toggleAudio() {
            audioEnabled = !audioEnabled;
            elements.audioToggle.innerHTML = audioEnabled 
                ? '<i class="fa-solid fa-volume-high"></i>' 
                : '<i class="fa-solid fa-volume-xmark"></i>';
            if (audioEnabled) {
                audio.init();
                audio.resume();
                audio.playClick();
            }
        }

        // === Particle System ===
        class ParticleSystem {
            constructor() {
                this.canvas = elements.particleCanvas;
                this.ctx = this.canvas.getContext('2d');
                this.particles = [];
                this.resize();
                window.addEventListener('resize', () => this.resize());
            }

            resize() {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
            }

            createExplosion(x, y, color, count = 100) {
                for (let i = 0; i < count; i++) {
                    this.particles.push({
                        x: x,
                        y: y,
                        vx: (Math.random() - 0.5) * 15,
                        vy: (Math.random() - 0.5) * 15,
                        life: 1,
                        color: color,
                        size: Math.random() * 8 + 2
                    });
                }
                this.animate();
            }

            createConfetti() {
                const colors = ['#fbbf24', '#3b82f6', '#10b981', '#ef4444', '#f97316'];
                for (let i = 0; i < 200; i++) {
                    this.particles.push({
                        x: Math.random() * this.canvas.width,
                        y: -20,
                        vx: (Math.random() - 0.5) * 5,
                        vy: Math.random() * 10 + 5,
                        life: 1,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        size: Math.random() * 10 + 5,
                        rotation: Math.random() * 360,
                        rotationSpeed: (Math.random() - 0.5) * 10
                    });
                }
                this.animate();
            }

            animate() {
                if (this.particles.length === 0) return;
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.particles = this.particles.filter(p => {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.3;
                    p.life -= 0.01;
                    if (p.rotation !== undefined) {
                        p.rotation += p.rotationSpeed;
                    }
                    if (p.life <= 0 || p.y > this.canvas.height) return false;
                    this.ctx.save();
                    this.ctx.globalAlpha = p.life;
                    this.ctx.fillStyle = p.color;
                    if (p.rotation !== undefined) {
                        this.ctx.translate(p.x, p.y);
                        this.ctx.rotate(p.rotation * Math.PI / 180);
                        this.ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                    } else {
                        this.ctx.beginPath();
                        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                    this.ctx.restore();
                    return true;
                });
                if (this.particles.length > 0) {
                    requestAnimationFrame(() => this.animate());
                }
            }
        }

        const particles = new ParticleSystem();

        // === Game Logic ===
        function showLevelScreen() {
            stopTimer();
            elements.levelScreen.classList.remove('hidden');
            elements.resultOverlay.classList.remove('show');
            elements.btnLock.style.display = 'flex';
            elements.btnEliminate.style.display = 'flex';
            elements.btnReveal.style.display = 'flex';
            elements.btnReset.style.display = 'flex';
            isGameOver = false;
            elements.handsGrid.innerHTML = '';
            elements.progressBar.style.width = '100%';
            elements.timerDisplay.classList.remove('warning', 'danger');
        }

        function startGame(level) {
            audio.init();
            audio.resume();
            audio.playClick();
            
            currentLevel = level;
            const config = LEVELS[level];
            
            elements.levelScreen.classList.add('hidden');
            elements.levelDisplay.textContent = level.toUpperCase();
            elements.btnReset.style.display = 'flex';
            
            winningHandIndex = Math.floor(Math.random() * config.hands);
            selectedHandIndex = -1;
            eliminatedHands = [];
            score = 0;
            isGameOver = false;
            timeLeft = config.time || 0;
            
            elements.scoreDisplay.textContent = '0';
            updateTimerDisplay();
            
            createHands(config.hands);
            
            if (config.time) {
                startTimer();
            }
            
            resetButtons();
        }

        function createHands(count) {
            elements.handsGrid.innerHTML = '';
            let columns = 4;
            if (count === 12) columns = 4;
            if (count === 16) columns = 4;
            elements.handsGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
            
            for (let i = 0; i < count; i++) {
                const handCard = document.createElement('div');
                handCard.className = 'hand-card';
                handCard.id = `hand-${i}`;
                handCard.dataset.index = i;
                handCard.onclick = () => selectHand(i);
                
                const icon = document.createElement('i');
                icon.className = 'fa-solid fa-hand-fist hand-icon';
                
                const content = document.createElement('div');
                content.className = 'hand-content';
                if (i === winningHandIndex) {
                    content.innerHTML = '<i class="fa-solid fa-ring ring-icon" style="color: var(--gold); filter: drop-shadow(0 0 10px var(--gold));"></i>';
                } else {
                    content.innerHTML = '<i class="fa-regular fa-circle" style="color: #475569;"></i>';
                }
                
                // Add number below the hand (in English numerals)
                const numberSpan = document.createElement('span');
                numberSpan.className = 'hand-number';
                numberSpan.textContent = (i + 1).toString();
                
                handCard.appendChild(icon);
                handCard.appendChild(numberSpan);
                handCard.appendChild(content);
                
                elements.handsGrid.appendChild(handCard);
            }
        }

        function startTimer() {
            stopTimer();
            timerInterval = setInterval(() => {
                timeLeft--;
                updateTimerDisplay();
                
                const totalTime = LEVELS[currentLevel].time;
                const progress = totalTime ? (timeLeft / totalTime) * 100 : 100;
                elements.progressBar.style.width = `${progress}%`;
                
                if (timeLeft <= 10 && timeLeft > 0) {
                    elements.timerDisplay.classList.add('danger');
                    elements.timerDisplay.classList.remove('warning');
                    if (timeLeft % 2 === 0) audio.playTimeWarning();
                } else if (timeLeft <= 20 && timeLeft > 10) {
                    elements.timerDisplay.classList.add('warning');
                }
                
                if (timeLeft <= 0) {
                    gameOver(false, 'TIME EXPIRED!');
                }
            }, 1000);
        }

        function stopTimer() {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        }

        function updateTimerDisplay() {
            if (LEVELS[currentLevel].time === null) {
                elements.timerDisplay.textContent = '∞';
                elements.timerDisplay.classList.remove('warning', 'danger');
                return;
            }
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            elements.timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        function resetButtons() {
            elements.btnLock.disabled = true;
            elements.btnEliminate.disabled = true;
            elements.btnReveal.disabled = true;
        }

        function selectHand(index) {
            if (isGameOver || eliminatedHands.includes(index)) return;
            audio.playSelect();
            selectedHandIndex = index;
            
            document.querySelectorAll('.hand-card').forEach((card, i) => {
                card.classList.toggle('selected', i === index);
            });
            
            elements.btnLock.disabled = false;
            elements.btnEliminate.disabled = false;
            
            const config = LEVELS[currentLevel];
            const remaining = config.hands - eliminatedHands.length;
            if (remaining === 1) {
                elements.btnReveal.disabled = false;
                elements.btnLock.disabled = true;
                elements.btnEliminate.disabled = true;
            } else {
                elements.btnReveal.disabled = true;
            }
        }

        function lockSelection() {
            if (selectedHandIndex === -1 || isGameOver) return;
            audio.playLock();
            revealResult();
        }

        function eliminateHand() {
            if (selectedHandIndex === -1 || isGameOver) return;
            
            const handElement = document.getElementById(`hand-${selectedHandIndex}`);
            
            if (selectedHandIndex === winningHandIndex) {
                audio.playLose();
                handElement.classList.add('open');
                gameOver(false, 'CRITICAL ERROR! You eliminated the Ring!');
                return;
            }
            
            audio.playEliminate();
            handElement.classList.add('eliminated');
            eliminatedHands.push(selectedHandIndex);
            
            score += 100 * LEVELS[currentLevel].scoreMultiplier;
            elements.scoreDisplay.textContent = score;
            
            // === ORIGINAL TIME RESET BEHAVIOR (FULL RESET) ===
            const config = LEVELS[currentLevel];
            if (config.time !== null) {
                timeLeft = config.time; // Reset time fully
                audio.playTimeReset();
                updateTimerDisplay();
                elements.progressBar.style.width = '100%';
            }
            
            selectedHandIndex = -1;
            document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected'));
            resetButtons();
            
            const remaining = config.hands - eliminatedHands.length;
            if (remaining === 1) {
                const remainingIndex = Array.from({length: config.hands}, (_, i) => i)
                    .find(i => !eliminatedHands.includes(i));
                selectHand(remainingIndex);
            }
        }

        function revealResult() {
            if (isGameOver) return;
            isGameOver = true;
            stopTimer();
            
            document.querySelectorAll('.hand-card').forEach((card, index) => {
                if (!eliminatedHands.includes(index)) {
                    card.classList.add('open');
                }
            });
            
            const win = selectedHandIndex === winningHandIndex;
            
            if (win) {
                const timeBonus = LEVELS[currentLevel].time ? timeLeft * 10 : 500;
                const eliminationBonus = eliminatedHands.length * 50;
                const finalScore = score + timeBonus + eliminationBonus;
                
                audio.playWin();
                particles.createConfetti();
                
                document.body.style.animation = 'shake 0.5s';
                setTimeout(() => document.body.style.animation = '', 500);
                
                showResult(true, 'VICTORY!', `Final Score: ${finalScore}`);
            } else {
                audio.playLose();
                showResult(false, 'DEFEAT!', 'Better luck next time');
            }
            
            elements.btnLock.style.display = 'none';
            elements.btnEliminate.style.display = 'none';
            elements.btnReveal.style.display = 'none';
        }

        function gameOver(win, message) {
            isGameOver = true;
            stopTimer();
            showResult(win, win ? 'VICTORY!' : 'GAME OVER', message);
            elements.btnLock.style.display = 'none';
            elements.btnEliminate.style.display = 'none';
            elements.btnReveal.style.display = 'none';
        }

        function showResult(win, title, subtitle) {
            elements.resultIcon.className = `result-icon fa-solid ${win ? 'fa-trophy' : 'fa-skull'}`;
            elements.resultTitle.textContent = title;
            elements.resultScore.textContent = subtitle;
            elements.resultOverlay.className = `result-overlay show ${win ? 'win' : 'lose'}`;
            
            if (win) {
                const rect = elements.resultIcon.getBoundingClientRect();
                particles.createExplosion(
                    rect.left + rect.width / 2,
                    rect.top + rect.height / 2,
                    '#fbbf24',
                    150
                );
            }
        }

        // Initialize
        window.onload = () => {
            showLevelScreen();
        };

// Centralized event binding: behavior is identical to the original inline handlers.
document.querySelector('#audioToggle').addEventListener('click', toggleAudio);
document.querySelectorAll('[data-level]').forEach((card) => {
    card.addEventListener('click', () => startGame(card.dataset.level));
});
document.querySelectorAll('[data-action]').forEach((control) => {
    const actions = {
        'lock-selection': lockSelection,
        'eliminate-hand': eliminateHand,
        'reveal-result': revealResult,
        'show-level-screen': showLevelScreen
    };
    const action = actions[control.dataset.action];
    if (action) control.addEventListener('click', action);
});
