class RenaissanceGame {
    constructor() {
        this.gameState = 'login';
        this.playerData = null;
        this.playerId = null;
        this.pollInterval = null;
        
        this.bindEvents();
        this.updateConnectionStatus('Ready to connect', 'ready');
        console.log('Renaissance Game initialized with HTTP polling');
    }
    
    updateConnectionStatus(message, type) {
        const statusText = document.getElementById('status-text');
        const statusIndicator = document.getElementById('status-indicator');
        
        if (statusText) statusText.textContent = message;
        if (statusIndicator) statusIndicator.className = type;
    }
    
    bindEvents() {
        document.getElementById('join-game').addEventListener('click', () => {
            this.joinGame();
        });
    }
    
    async joinGame() {
        const twitterHandle = document.getElementById('twitter-handle').value.trim();
        const displayName = document.getElementById('display-name').value.trim();
        
        if (!twitterHandle || !displayName) {
            alert('Please enter both Twitter handle and display name');
            return;
        }
        
        this.playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        try {
            this.updateConnectionStatus('Connecting...', 'connecting');
            
            // Join the player to database
            const joinResponse = await fetch(`${CONFIG.API_BASE_URL}/api/join-game`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    twitterHandle: twitterHandle.replace('@', ''),
                    displayName: displayName
                })
            });
            
            const joinResult = await joinResponse.json();
            
            if (!joinResult.success) {
                throw new Error(joinResult.error);
            }
            
            this.playerData = joinResult.player;
            
            // Join game queue
            const queueResponse = await fetch(`${CONFIG.API_BASE_URL}/api/join-queue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId: this.playerId,
                    twitterHandle: twitterHandle.replace('@', ''),
                    displayName: displayName
                })
            });
            
            const queueResult = await queueResponse.json();
            
            if (queueResult.success) {
                this.updateConnectionStatus('Connected', 'connected');
                this.startPolling();
                alert('Joined successfully! Looking for opponent...');
            }
            
        } catch (error) {
            console.error('Error joining game:', error);
            this.updateConnectionStatus('Connection Failed', 'error');
            alert(`Connection error: ${error.message}`);
        }
    }
    
    startPolling() {
        // Poll every 2 seconds
        this.pollInterval = setInterval(() => {
            this.pollGameState();
        }, 2000);
        
        // Initial poll
        this.pollGameState();
    }
    
    async pollGameState() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/game-state/${this.playerId}`);
            const gameState = await response.json();
            
            console.log('Game state:', gameState);
            
            switch (gameState.status) {
                case 'waiting':
                    if (document.getElementById('queue-position')) {
                        document.getElementById('queue-position').textContent = gameState.position;
                    }
                    this.showScreen('waiting-screen');
                    break;
                    
                case 'in-game':
                    this.startGame(gameState);
                    break;
                    
                case 'disconnected':
                    this.updateConnectionStatus('Searching for opponent...', 'connecting');
                    break;
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }
    
    startGame(gameData) {
        clearInterval(this.pollInterval);
        alert(`Game started! ${gameData.players[0].displayName} vs ${gameData.players[1].displayName}`);
        this.showScreen('game-screen');
        console.log('Game started with:', gameData);
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        if (document.getElementById(screenId)) {
            document.getElementById(screenId).classList.add('active');
        }
    }
}

function showScreen(screenId) {
    if (window.game) {
        window.game.showScreen(screenId);
    }
}

function cancelWaiting() {
    if (window.game && window.game.pollInterval) {
        clearInterval(window.game.pollInterval);
        window.game.showScreen('login-screen');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new RenaissanceGame();
});
