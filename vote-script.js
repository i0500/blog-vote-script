document.addEventListener('DOMContentLoaded', function() {
    if (!document.querySelector('.post-only-script')) return;
    if (!window.location.href.includes('/20')) return;
    if (!window.VOTE_CONFIG || !window.VOTE_CONFIG.SCRIPT_URL) return;

    const voteSections = document.querySelectorAll('.community-section');
    
    voteSections.forEach(section => {
        const fullSymbol = section.getAttribute('data-symbol');
        if (!fullSymbol) return;
        
        const SCRIPT_URL = window.VOTE_CONFIG.SCRIPT_URL;
        const VOTE_COOLDOWN = 30 * 60 * 1000;
        const VOTE_KEY = `vote_${fullSymbol}_${encodeURIComponent(window.location.href)}`;

        section.querySelectorAll('.vote-btn').forEach(button => {
            button.addEventListener('click', function() {
                const option = this.getAttribute('data-vote');
                submitVote(option);
            });
        });

        async function submitVote(option) {
            const loading = section.querySelector('#loadingIndicator');
            try {
                loading.style.display = 'block';
                
                const response = await fetch(
                    `${SCRIPT_URL}?action=vote&symbol=${fullSymbol}&option=${option}&postUrl=${encodeURIComponent(window.location.href)}`
                );
                
                if (response.ok) {
                    localStorage.setItem(VOTE_KEY, JSON.stringify({
                        timestamp: new Date().getTime(),
                        option: option
                    }));
                    
                    await fetchResults();
                    showOnlyResults();
                }
            } catch (error) {
                console.error('Vote failed:', error);
                alert('Error processing your vote 😢');
            } finally {
                loading.style.display = 'none';
            }
        }

        function checkVoteStatus() {
            const voteStatus = localStorage.getItem(VOTE_KEY);
            
            if (voteStatus) {
                const { timestamp } = JSON.parse(voteStatus);
                const now = new Date().getTime();
                
                if (now - timestamp < VOTE_COOLDOWN) {
                    showOnlyResults();
                } else {
                    localStorage.removeItem(VOTE_KEY);
                    showVoteForm();
                }
            } else {
                showVoteForm();
            }
        }

        function showOnlyResults() {
            const voteForm = section.querySelector('#voteForm');
            const voteResults = section.querySelector('#voteResults');
            
            if (voteForm) voteForm.style.display = 'none';
            if (voteResults) voteResults.style.display = 'block';
            
            const voteStatus = JSON.parse(localStorage.getItem(VOTE_KEY));
            if (voteStatus) {
                const statusMsg = document.createElement('p');
                statusMsg.className = 'vote-status';
                statusMsg.innerHTML = `Thanks for participating! ✨`;
                statusMsg.style.textAlign = 'center';
                statusMsg.style.color = '#e5e7eb';
                statusMsg.style.marginTop = '15px';
                statusMsg.style.fontSize = '0.95em';
                
                const existingStatus = voteResults.querySelector('.vote-status');
                if (existingStatus) {
                    existingStatus.remove();
                }
                
                voteResults.insertBefore(statusMsg, voteResults.firstChild);
            }
        }

        function showVoteForm() {
            const voteForm = section.querySelector('#voteForm');
            const voteResults = section.querySelector('#voteResults');
            
            if (voteForm) voteForm.style.display = 'block';
            if (voteResults) voteResults.style.display = 'none';
        }

        async function fetchResults() {
            try {
                const currentUrl = window.location.href;
                const response = await fetch(
                    `${SCRIPT_URL}?action=getResults&symbol=${fullSymbol}&postUrl=${encodeURIComponent(currentUrl)}`
                );
                const results = await response.json();
                updateResults(results);
            } catch (error) {
                console.error('Failed to fetch results:', error);
            }
        }

        function updateResults(results) {
            const container = section.querySelector('.results-container');
            const voteData = Object.entries(results).filter(([key]) => 
                !['lastUpdate', 'totalVotes'].includes(key)
            );
            const total = voteData.reduce((sum, [_, count]) => sum + Number(count), 0);
            
            const options = {
                strongBuy: { text: 'Strong Buy', emoji: '🚀', class: 'strong-buy', color: '#059669' },
                buy: { text: 'Buy', emoji: '📈', class: 'buy', color: '#2563eb' },
                hold: { text: 'Hold', emoji: '🤝', class: 'hold', color: '#d97706' },
                sell: { text: 'Sell', emoji: '📉', class: 'sell', color: '#dc2626' },
                strongSell: { text: 'Strong Sell', emoji: '⚠️', class: 'strong-sell', color: '#991b1b' }
            };
            
            const isMobile = window.innerWidth <= 767;
            
            container.innerHTML = voteData
                .map(([option, count]) => {
                    const percent = total ? ((count / total) * 100).toFixed(1) : 0;
                    const opt = options[option];
                    
                    if (isMobile) {
                        return `
                            <div class="result-bar ${opt.class}">
                                <div class="result-label">
                                    <span class="emoji">${opt.emoji}</span>
                                    <span class="text">${opt.text}</span>
                                </div>
                                <div class="circle-progress">
                                    <div class="progress-bar" style="width: ${percent}%"></div>
                                    <div class="percent-text">${percent}%</div>
                                </div>
                                <div class="vote-count">${count} votes</div>
                            </div>
                        `;
                    } else {
                        const radius = 36;
                        const circumference = 2 * Math.PI * radius;
                        const offset = circumference * (1 - percent / 100);
                        
                        return `
                            <div class="result-bar ${opt.class}">
                                <div class="result-label">
                                    <span class="emoji">${opt.emoji}</span>
                                    <span class="text">${opt.text}</span>
                                </div>
                                <div class="circle-progress">
                                    <svg class="progress-ring" viewBox="0 0 80 80">
                                        <circle
                                            class="progress-ring-bg"
                                            cx="40"
                                            cy="40"
                                            r="${radius}"
                                            fill="none"
                                            stroke="rgba(0,0,0,0.2)"
                                            stroke-width="6"
                                            stroke-linecap="round"
                                        />
                                        <circle
                                            class="progress-ring-circle"
                                            cx="40"
                                            cy="40"
                                            r="${radius}"
                                            fill="none"
                                            stroke="${opt.color}"
                                            stroke-width="6"
                                            stroke-dasharray="${circumference}"
                                            stroke-dashoffset="${offset}"
                                            stroke-linecap="round"
                                        />
                                    </svg>
                                    <div class="percent-text">${percent}%</div>
                                </div>
                                <div class="vote-count">${count} votes</div>
                            </div>
                        `;
                    }
                }).join('');
            
            section.querySelector('#totalVotes').textContent = total;
            
            if (results.lastUpdate) {
                const updateTime = new Date(results.lastUpdate);
                const options = {
                    timeZone: 'America/New_York',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                };
                section.querySelector('#lastUpdate').textContent = 
                    `🕒 Last Update: ${updateTime.toLocaleString('en-US', options)} ET`;
            }
        }

        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                const results = JSON.parse(localStorage.getItem(VOTE_KEY));
                if (results) {
                    updateResults(results);
                }
            }, 250);
        });

        checkVoteStatus();
        fetchResults();
    });
});
