class RenaissanceGame {
    constructor() {
        this.socket = null;
        this.gameState = 'login';
        this.playerData = null;
        
        this.initializeSocket();
        this.bindEvents();
        
        console.log('Renaissance Game initialized');
    }
    
    initializeSocket() {
        console.log('Connecting to:', CONFIG.SOCKET_URL);
        
        this.updateConnectionStatus('Connecting...', 'connecting');
        
        this.socket = io(CONFIG.SOCKET_URL, {
            transports: ['websocket', 'polling'],
            timeout: 20000
        });
        
        this.socket.on('connect', () => {
            console.log('Connected to Renaissance server');
            this.updateConnectionStatus('Connected', 'connected');
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.updateConnectionStatus('Connection Failed', 'error');
        });
        
        this.socket.on('waiting-for-opponent', (data) => {
            document.getElementById('queue-position').textContent = data.position;
            this.showScreen('waiting-screen');
        });
        
        this.socket.on('game-start', (data) => {
            console.log('Game starting!', data);
            this.startGame(data);
        });
        
        this.socket.on('opponent-honk-attack', (data) => {
            this.handleOpponentAttack('honk', data);
        });
        
        this.socket.on('opponent-plonk-shield', (data) => {
            this.handleOpponentShield(data);
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
        document.getElementById('join-game').addEventListener('click', () => {
            this.joinGame();
        });
        
        if (document.getElementById('honk-attack')) {
            document.getElementById('honk-attack').addEventListener('click', () => {
                this.performHonkAttack();
            });
        }
        
        if (document.getElementById('plonk-shield')) {
            document.getElementById('plonk-shield').addEventListener('click', () => {
                this.performPlonkShield();
            });
        }
    }
    
    async joinGame() {
        const twitterHandle = document.getElementById('twitter-handle').value.trim();
        const displayName = document.getElementById('display-name').value.trim();
        
        if (!twitterHandle || !displayName) {
            alert('Please enter both Twitter handle and display name');
            return;
        }
        
        const joinBtn = document.getElementById('join-game');
        const originalText = joinBtn.innerHTML;
        joinBtn.innerHTML = '<span>CONNECTING...</span>';
        joinBtn.disabled = true;
        
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/join-game`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    twitterHandle: twitterHandle.replace('@', ''),
                    displayName: displayName
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.playerData = result.player;
                this.socket.emit('player-ready', this.playerData);
                this.showNotification('Joined successfully!', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error joining game:', error);
            alert(`Connection error: ${error.message}`);
        } finally {
            joinBtn.innerHTML = originalText;
            joinBtn.disabled = false;
        }
    }
    
    startGame(gameData) {
        this.showScreen('game-screen');
        console.log('Game started with:', gameData);
    }
    
    performHonkAttack() {
        this.socket.emit('honk-attack', { power: 25 });
        console.log('HONK attack!');
    }
    
    performPlonkShield() {
        this.socket.emit('plonk-shield', { strength: 30 });
        console.log('PLONK shield!');
    }
    
    handleOpponentAttack(type, data) {
        console.log('Opponent attack:', data);
    }
    
    handleOpponentShield(data) {
        console.log('Opponent shield:', data);
    }
    
    showNotification(message, type) {
        console.log('Notification:', message);
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }
}

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

document.addEventListener('DOMContentLoaded', () => {
    window.game = new RenaissanceGame();
});
