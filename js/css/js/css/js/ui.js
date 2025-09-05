// Renaissance Game - UI Helper Functions

async function loadLeaderboard() {
    try {
        showLoadingState('leaderboard-content', 'Loading champions...');
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/leaderboard?limit=25`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const leaderboard = await response.json();
        
        const container = document.getElementById('leaderboard-content');
        
        let html = `
            <div class="leaderboard-header">
                <div>Rank</div>
                <div>Player</div>
                <div>Games</div>
                <div>Win Rate</div>
                <div>Score</div>
            </div>
        `;
        
        if (leaderboard.length === 0) {
            html += '<div style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.7);">No players yet. Be the first champion!</div>';
        } else {
            leaderboard.forEach((player) => {
                const rankClass = player.rank === 1 ? 'first' : player.rank === 2 ? 'second' : player.rank === 3 ? 'third' : '';
                
                html += `
                    <div class="leaderboard-row">
                        <div class="rank ${rankClass}">${player.rank}</div>
                        <div>
                            <div style="font-weight: 700;">${player.display_name}</div>
                            <div style="font-size: 0.8em; opacity: 0.7;">@${player.twitter_handle}</div>
                        </div>
                        <div>${player.games_played}</div>
                        <div>${player.win_rate}%</div>
                        <div style="color: var(--aztec-gold); font-weight: 700;">${player.privacy_score}</div>
                    </div>
                `;
            });
        }
        
        container.innerHTML = html;
        showScreen('leaderboard-screen');
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        showError('Failed to load leaderboard. Check your connection.');
    }
}

function showLoadingState(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
    }
}

function showError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'error-toast';
    errorEl.textContent = message;
    errorEl.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #EF4444;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        font-family: var(--noir-font);
        z-index: 10000;
        animation: toast-slide-in 0.3s ease-out;
    `;
    
    document.body.appendChild(errorEl);
    
    setTimeout(() => {
        errorEl.style.animation = 'toast-slide-out 0.3s ease-in forwards';
        setTimeout(() => errorEl.remove(), 300);
    }, 3000);
}

// Add loading spinner styles
const loadingStyles = document.createElement('style');
loadingStyles.textContent = `
    .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 2rem;
        color: rgba(255, 255, 255, 0.7);
    }
    
    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(124, 58, 237, 0.3);
        border-top: 3px solid var(--aztec-purple);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    @keyframes toast-slide-in {
        0% { transform: translateX(-50%) translateY(-20px); opacity: 0; }
        100% { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    
    @keyframes toast-slide-out {
        0% { transform: translateX(-50%) translateY(0); opacity: 1; }
        100% { transform: translateX(-50%) translateY(-20px); opacity: 0; }
    }
    
    .rank.first { color: #FFD700; }
    .rank.second { color: #C0C0C0; }
    .rank.third { color: #CD7F32; }
`;
document.head.appendChild(loadingStyles);
