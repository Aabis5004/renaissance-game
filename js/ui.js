async function loadLeaderboard() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/leaderboard`);
        const leaderboard = await response.json();
        
        const container = document.getElementById('leaderboard-content');
        
        if (leaderboard.length === 0) {
            container.innerHTML = '<p>No players yet. Be the first champion!</p>';
        } else {
            let html = '<div class="leaderboard-list">';
            leaderboard.forEach((player, index) => {
                html += `
                    <div class="leaderboard-row">
                        <span class="rank">${index + 1}</span>
                        <span class="name">${player.display_name}</span>
                        <span class="score">${player.privacy_score}</span>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        }
        
        showScreen('leaderboard-screen');
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        alert('Failed to load leaderboard');
    }
}

function showStats() {
    alert('Stats feature coming soon!');
}
