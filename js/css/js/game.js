// Renaissance Game - Main Game Logic
class RenaissanceGame {
    constructor() {
        this.socket = null;
        this.gameState = 'login';
        this.playerData = null;
        this.gameTimer = null;
        this.gameStartTime = null;
        
        this.powers = {
            honk: { current: 100, max: 100, cooldown: 0, maxCooldown: CONFIG.HONK_COOLDOWN },
            plonk: { current: 100, max: 100, cooldown: 0, maxCooldown: CONFIG.PLONK_COOLDOWN }
        };
        
        this.initializeSocket();
        this.bindEvents();
        this.startGameLoop();
        this.updateStats();
        
        console.log('Renaissance Game initialized');
    }
    
    initializeSocket() {
        console.log('Connecting to:', CONFIG.SOCKET_URL);
        
        this.updateConnectionStatus('Connecting...', 'connecting');
        
        this.socket = io(CONFIG.SOCKET_URL, {
            transports: ['websocket', 'polling'],
            timeout: 20000,
            forceNew: true
        });
        
        this.socket.on('connect', () => {
            console.log('Connected to Renaissance server');
            this.updateConnectionStatus('Connected', 'connected');
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.updateConnectionStatus('Connection Failed', 'error');
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus('Disconnected', 'error');
        });
        
        // Game events
        this.socket.on('waiting-for-opponent', (data) => {
            console.log('Waiting for opponent:', data);
            document.getElementById('queue-position').textContent = data.position;
            this.showScreen('waiting-screen');
        });
        
        this.socket.on('game-start', (data) => {
            console.log('Game starting!', data);
            this.startGame(data);
        });
        
        this.socket.on('opponent-honk-attack', (data) => {
            console.log('Opponent HONK attack:', data);
            this.handleOpponentAttack('honk', data);
        });
        
        this.socket.on('opponent-plonk-shield', (data) => {
            console.log('Opponent PLONK shield:', data);
            this.handleOpponentShield(data);
        });
        
        this.socket.on('opponent-disconnected', () => {
            alert('Opponent disconnected! You win!');
            this.endGame(true);
        });
    }
    
    updateConnectionStatus(message, type) {
        const statusText = document.getElementById('status-text');
        const statusIndicator = document.getElementById('status-indicator');
        
        if (statusText) statusText.textContent = message;
        if (statusIndicator) {
            statusIndicator.className = type;
        }
    }
    
    bindEvents() {
        // Login form
        document.getElementById('join-game').addEventListener('click', () => {
            this.joinGame();
        });
        
        // Enter key for inputs
        ['twitter-handle', 'display-name'].forEach(id => {
            document.getElementById(id).addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.joinGame();
            });
        });
        
        // Attack buttons
        document.getElementById('honk-attack').addEventListener('click', () => {
            this.performHonkAttack();
        });
        
        document.getElementById('plonk-shield').addEventListener('click', () => {
            this.performPlonkShield();
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (this.gameState === 'playing') {
                switch(e.key.toLowerCase()) {
                    case ' ':
                    case 'h':
                        e.preventDefault();
                        this.performHonkAttack();
                        break;
                    case 's':
                        e.preventDefault();
                        this.performPlonkShield();
                        break;
                }
            }
        });
    }
    
    async joinGame() {
        const twitterHandle = document.getElementById('twitter-handle').value.trim();
        const displayName = document.getElementById('display-name').value.trim();
        
        if (!twitterHandle || !displayName) {
            alert('Please enter both Twitter handle and display name');
            return;
        }
        
        // Show loading state
        const joinBtn = document.getElementById('join-game');
        const originalText = joinBtn.innerHTML;
        joinBtn.innerHTML = '<span>CONNECTING...</span>';
        joinBtn.disabled = true;
        
        // Clean twitter handle
        const cleanHandle = twitterHandle.replace('@', '');
        
        try {
            console.log('Joining game with:', { twitterHandle: cleanHandle, displayName });
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/join-game`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    twitterHandle: cleanHandle,
                    displayName: displayName
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('Join game result:', result);
            
            if (result.success) {
                this.playerData = result.player;
                console.log('Player data:', this.playerData);
                
                // Emit player ready to socket
                this.socket.emit('player-ready', this.playerData);
                
                this.showNotification('Joined successfully!', 'success');
            } else {
                throw new Error(result.error || 'Failed to join game');
            }
        } catch (error) {
            console.error('Error joining game:', error);
            alert(`Connection error: ${error.message}\n\nMake sure your backend server is running on:\n${CONFIG.API_BASE_URL}`);
            this.showNotification('Failed to join', 'error');
        } finally {
            // Restore button
            joinBtn.innerHTML = originalText;
            joinBtn.disabled = false;
        }
    }
    
    startGame(gameData) {
        console.log('Starting game with data:', gameData);
        this.gameState = 'playing';
        this.gameStartTime = Date.now();
        
        // Set player names
        const isPlayer1 = gameData.players[0].handle === this.playerData.twitter_handle;
        const playerIndex = isPlayer1 ? 0 : 1;
        const opponentIndex = isPlayer1 ? 1 : 0;
        
        document.getElementById('player1-name').textContent = gameData.players[playerIndex].name;
        document.getElementById('player2-name').textContent = gameData.players[opponentIndex].name;
        
        // Reset powers
        this.powers.honk.current = 100;
        this.powers.plonk.current = 100;
        this.powers.honk.cooldown = 0;
        this.powers.plonk.cooldown = 0;
        
        this.showScreen('game-screen');
        this.startGameTimer();
        this.updatePowerBars();
        
        // Show game start effect
        this.showDamageNumber('FIGHT!', window.innerWidth/2, window.innerHeight/2, '#FFD700');
        this.playSound('game-start');
    }
    
    performHonkAttack() {
        if (this.powers.honk.cooldown > 0 || this.powers.honk.current < 20) {
            console.log('HONK attack blocked - cooldown or insufficient power');
            return;
        }
        
        const damage = Math.floor(Math.random() * 30) + 15; // 15-45 damage
        this.powers.honk.current -= 20;
        this.powers.honk.cooldown = this.powers.honk.maxCooldown;
        
        console.log(`Performing HONK attack: ${damage} damage`);
        
        // Visual effects
        this.createAttackEffect('honk', damage);
        this.updatePowerBars();
        this.playSound('honk-attack');
        
        // Send to opponent
        this.socket.emit('honk-attack', { power: damage });
        
        // Start cooldown
        this.startCooldown('honk');
    }
    
    performPlonkShield() {
        if (this.powers.plonk.cooldown > 0 || this.powers.plonk.current < 30) {
            console.log('PLONK shield blocked - cooldown or insufficient power');
            return;
        }
        
        const shieldStrength = Math.floor(Math.random() * 40) + 20; // 20-60 shield
        this.powers.plonk.current -= 30;
        this.powers.plonk.cooldown = this.powers.plonk.maxCooldown;
        
        console.log(`Performing PLONK shield: ${shieldStrength} strength`);
        
        // Visual effects
        this.createShieldEffect(shieldStrength);
        this.updatePowerBars();
        this.playSound('plonk-shield');
        
        // Send to opponent
        this.socket.emit('plonk-shield', { strength: shieldStrength });
        
        // Start cooldown
        this.startCooldown('plonk');
    }
    
    createAttackEffect(type, damage) {
        const button = document.getElementById('honk-attack');
        const rect = button.getBoundingClientRect();
        
        // Create particles
        for (let i = 0; i < 10; i++) {
            this.createParticle(
                rect.left + rect.width/2,
                rect.top + rect.height/2,
                type
            );
        }
        
        // Show damage number
        this.showDamageNumber(`${damage}`, rect.left + rect.width/2, rect.top, '#FFFF00');
    }
    
    createShieldEffect(strength) {
        const button = document.getElementById('plonk-shield');
        const rect = button.getBoundingClientRect();
        
        // Create shield particles
        for (let i = 0; i < 15; i++) {
            this.createParticle(
                rect.left + rect.width/2,
                rect.top + rect.height/2,
                'plonk'
            );
        }
        
        // Show shield strength
        this.showDamageNumber(`+${strength}`, rect.left + rect.width/2, rect.top, '#00FFFF');
    }
    
    createParticle(x, y, type) {
        const particle = document.createElement('div');
        particle.className = `particle ${type}-particle`;
        particle.style.position = 'fixed';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.width = (Math.random() * 10 + 5) + 'px';
        particle.style.height = particle.style.width;
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '1000';
        
        if (type === 'honk') {
            particle.style.background = 'radial-gradient(circle, #7C3AED, #A855F7)';
            particle.style.boxShadow = '0 0 10px #7C3AED';
        } else {
            particle.style.background = 'radial-gradient(circle, #F59E0B, #FCD34D)';
            particle.style.boxShadow = '0 0 10px #F59E0B';
        }
        
        particle.style.animation = 'particle-float 3s ease-out forwards';
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 3000);
    }
    
    showDamageNumber(text, x, y, color) {
        const number = document.createElement('div');
        number.className = 'damage-number';
        number.textContent = text;
        number.style.position = 'fixed';
        number.style.left = (x - 50) + 'px';
        number.style.top = (y - 30) + 'px';
        number.style.color = color;
        number.style.fontSize = '2rem';
        number.style.fontWeight = '900';
        number.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
        number.style.pointerEvents = 'none';
        number.style.zIndex = '10000';
        number.style.animation = 'damage-float 1.5s ease-out forwards';
        
        document.body.appendChild(number);
        
        setTimeout(() => {
            if (number.parentNode) {
                number.parentNode.removeChild(number);
            }
        }, 1500);
    }
    
    handleOpponentAttack(type, data) {
        const damage = data.damage;
        const playerSide = document.querySelector('.player-info.right');
        const rect = playerSide.getBoundingClientRect();
        
        this.showDamageNumber(`-${damage}`, rect.left + rect.width/2, rect.top + rect.height/2, '#FF4444');
        this.createExplosionEffect(rect.left + rect.width/2, rect.top + rect.height/2);
        this.screenShake();
    }
    
    handleOpponentShield(data) {
        const playerSide = document.querySelector('.player-info.left');
        const rect = playerSide.getBoundingClientRect();
        
        this.showDamageNumber('BLOCKED!', rect.left + rect.width/2, rect.top + rect.height/2, '#00FF00');
    }
    
    createExplosionEffect(x, y) {
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'fixed';
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.width = '4px';
            particle.style.height = '4px';
            particle.style.background = '#FF4444';
            particle.style.borderRadius = '50%';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '1000';
            
            const angle = (i / 20) * Math.PI * 2;
            const speed = Math.random() * 100 + 50;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            particle.style.animation = `explosion-particle 1s ease-out forwards`;
            particle.style.setProperty('--vx', vx + 'px');
            particle.style.setProperty('--vy', vy + 'px');
            
            document.body.appendChild(particle);
            
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 1000);
        }
    }
    
    screenShake() {
        document.body.style.animation = 'screen-shake 0.5s ease-in-out';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 500);
    }
    
    startCooldown(type) {
        const button = document.getElementById(`${type === 'honk' ? 'honk-attack' : 'plonk-shield'}`);
        const cooldownBar = document.getElementById(`${type}-cooldown`);
        
        button.disabled = true;
        
        const interval = setInterval(() => {
            this.powers[type].cooldown -= 100;
            const progress = (this.powers[type].maxCooldown - this.powers[type].cooldown) / this.powers[type].maxCooldown * 100;
            cooldownBar.style.width = progress + '%';
            
            if (this.powers[type].cooldown <= 0) {
                clearInterval(interval);
                button.disabled = false;
                cooldownBar.style.width = '0%';
            }
        }, 100);
    }
    
    updatePowerBars() {
        document.getElementById('player1-honk').style.width = this.powers.honk.current + '%';
        document.getElementById('player1-plonk').style.width = this.powers.plonk.current + '%';
    }
    
    startGameTimer() {
        this.gameTimer = setInterval(() => {
            const elapsed = Date.now() - this.gameStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            document.getElementById('game-timer').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    async updateStats() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/stats`);
            if (response.ok) {
                const stats = await response.json();
                document.getElementById('active-players').textContent = stats.online_players || 0;
                document.getElementById('total-games').textContent = stats.total_games || 0;
            }
        } catch (error) {
            console.log('Stats update failed - server may be starting up');
        }
    }
    
    playSound(type) {
        // Simple sound effects using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            const sounds = {
                'game-start': { freq: 440, duration: 0.3, type: 'sine' },
                'honk-attack': { freq: 800, duration: 0.2, type: 'square' },
                'plonk-shield': { freq: 300, duration: 0.4, type: 'sine' }
            };
            
            const sound = sounds[type];
            if (sound) {
                oscillator.frequency.value = sound.freq;
                oscillator.type = sound.type;
                
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + sound.duration);
            }
        } catch (error) {
            console.log('Audio not available');
        }
    }
    
    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 8px;
            color: white;
            font-family: var(--noir-font);
            font-weight: 700;
            z-index: 10000;
            animation: notification-slide-in 0.3s ease-out;
        `;
        
        if (type === 'success') {
            notification.style.background = '#10B981';
        } else if (type === 'error') {
            notification.style.background = '#EF4444';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'notification-slide-out 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.gameState = screenId.replace('-screen', '');
    }
    
    startGameLoop() {
        setInterval(() => {
            // Regenerate power slowly
            if (this.gameState === 'playing') {
                this.powers.honk.current = Math.min(100, this.powers.honk.current + 1);
                this.powers.plonk.current = Math.min(100, this.powers.plonk.current + 1);
                this.updatePowerBars();
            }
        }, 1000);
    }
    
    endGame(won) {
        this.gameState = 'ended';
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
        }
        
        const message = won ? 'Victory! You won the battle!' : 'Defeat! Better luck next time!';
        setTimeout(() => {
            alert(message);
            this.showScreen('login-screen');
        }, 1000);
    }
}

// Global functions for buttons
function showScreen(screenId) {
    if (window.game) {
        window.game.showScreen(screenId);
    }
}

function cancelWaiting() {
    if (window.game) {
        window.game.showScreen('login-screen');
    }
}

function showStats() {
    alert('Stats coming soon!');
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Renaissance Game...');
    window.game = new RenaissanceGame();
});
