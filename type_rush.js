// ===========================
// NEON TYPE RUSH
// ===========================
function initTypeRush(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const W = 560, H = 460;
    const WORDS_POOL = [
        'neon','cyber','pulse','laser','storm','pixel','flash','boost','swift','blaze',
        'hyper','turbo','matrix','nexus','alpha','delta','sigma','omega','gamma','theta',
        'prime','ultra','super','mega','nova','star','moon','sun','fire','ice',
        'code','hack','byte','data','sync','core','grid','wave','zone','mode',
        'speed','power','force','light','dark','void','apex','zero','hero','king',
        'dragon','phoenix','thunder','lightning','shadow','crystal','plasma','vortex',
        'arcade','retro','glory','epic','chaos','order','space','time','life','soul',
        'blade','sword','arrow','shield','magic','spell','quest','realm','tower','crown',
        'binary','vector','signal','quantum','fusion','impact','launch','charge','drive','boost'
    ];
    const GAME_DURATION = 60;
    const COLORS = ['#00f0ff','#ff007f','#ffe600','#bf00ff','#00ff88','#ff6600'];

    let state = {};
    function initState() {
        state = {
            phase: 'idle',
            words: [],
            input: '',
            score: 0,
            streak: 0,
            maxStreak: 0,
            lives: 5,
            timeLeft: GAME_DURATION,
            best: parseInt(localStorage.getItem('neon_typerush_best') || '0'),
            particles: [],
            spawnTimer: 0,
            spawnInterval: 90, // frames
            tickInterval: null,
            level: 1
        };
    }
    initState();

    // Canvas
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;border-radius:12px;box-shadow:0 0 35px rgba(255,230,0,0.2);';

    // Input field
    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.placeholder = 'Gõ từ vào đây và nhấn Enter...';
    inputEl.style.cssText = `
        width:520px; padding:10px 16px; border-radius:8px;
        background:rgba(255,255,255,0.06); border:1.5px solid rgba(255,230,0,0.4);
        color:#ffe600; font-family:'Outfit',Arial; font-size:16px; font-weight:600;
        letter-spacing:1px; outline:none; box-shadow:0 0 12px rgba(255,230,0,0.15);
        text-align:center;
    `;

    container.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;';
    container.appendChild(canvas);
    container.appendChild(inputEl);
    setTimeout(() => inputEl.focus(), 100);

    const ctx = canvas.getContext('2d');

    function startGame() {
        initState();
        state.phase = 'playing';
        state.tickInterval = setInterval(() => {
            if (state.phase !== 'playing') { clearInterval(state.tickInterval); return; }
            state.timeLeft--;
            state.level = Math.floor((GAME_DURATION - state.timeLeft) / 12) + 1;
            state.spawnInterval = Math.max(40, 90 - state.level * 8);
            if (state.timeLeft <= 0) endGame();
        }, 1000);
    }

    function endGame() {
        state.phase = 'over';
        clearInterval(state.tickInterval);
        if (state.score > state.best) {
            state.best = state.score;
            localStorage.setItem('neon_typerush_best', state.best);
        }
        inputEl.value = '';
    }

    function spawnWord() {
        const word = WORDS_POOL[Math.floor(Math.random() * WORDS_POOL.length)];
        const speed = 0.6 + state.level * 0.18;
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        state.words.push({
            text: word,
            x: 40 + Math.random() * (W - word.length * 12 - 80),
            y: -20,
            speed,
            color,
            typed: 0, // how many chars matched
            pulse: Math.random() * Math.PI * 2
        });
    }

    function tryType(val) {
        if (state.phase !== 'playing') return;
        state.input = val;

        // Find best matching word
        let bestMatch = null, bestLen = 0;
        state.words.forEach(w => {
            if (w.text.startsWith(val) && val.length > bestLen) {
                bestMatch = w; bestLen = val.length;
            }
        });

        state.words.forEach(w => { w.typed = 0; });
        if (bestMatch) bestMatch.typed = val.length;
    }

    function submitWord(val) {
        if (state.phase === 'idle') { startGame(); inputEl.value = ''; return; }
        if (state.phase === 'over') { initState(); inputEl.value = ''; return; }
        if (!val.trim()) return;

        const idx = state.words.findIndex(w => w.text === val.trim().toLowerCase());
        if (idx !== -1) {
            const w = state.words[idx];
            state.streak++;
            if (state.streak > state.maxStreak) state.maxStreak = state.streak;
            const bonus = state.streak >= 3 ? 2 : 1;
            const pts = (w.text.length * 10 + Math.floor(w.y / 10)) * bonus;
            state.score += pts;
            // Particles
            for (let i = 0; i < 12; i++) {
                state.particles.push({
                    x: w.x + w.text.length * 7,
                    y: w.y,
                    vx: (Math.random()-0.5) * 8,
                    vy: (Math.random()-0.5) * 8,
                    life: 1, color: w.color,
                    text: i === 0 ? `+${pts}` : null
                });
            }
            state.words.splice(idx, 1);
        } else {
            state.streak = 0;
        }
        state.input = '';
        inputEl.value = '';
    }

    inputEl.addEventListener('input', (e) => tryType(e.target.value.toLowerCase()));
    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitWord(inputEl.value.toLowerCase());
    });

    function update() {
        if (state.phase !== 'playing') return;
        state.spawnTimer++;
        if (state.spawnTimer >= state.spawnInterval) {
            state.spawnTimer = 0;
            spawnWord();
        }

        for (let i = state.words.length - 1; i >= 0; i--) {
            const w = state.words[i];
            w.y += w.speed;
            w.pulse += 0.06;
            if (w.y > H - 40) {
                state.words.splice(i, 1);
                state.lives--;
                state.streak = 0;
                if (state.lives <= 0) endGame();
            }
        }

        state.particles.forEach(p => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life -= 0.04;
        });
        state.particles = state.particles.filter(p => p.life > 0);
    }

    function drawLives() {
        for (let i = 0; i < 5; i++) {
            ctx.save();
            ctx.fillStyle = i < state.lives ? '#ff007f' : 'rgba(255,0,127,0.15)';
            ctx.shadowBlur = i < state.lives ? 8 : 0;
            ctx.shadowColor = '#ff007f';
            ctx.font = '16px Arial';
            ctx.fillText('❤', W - 28 - i * 22, 30);
            ctx.restore();
        }
    }

    function draw() {
        ctx.fillStyle = '#060810';
        ctx.fillRect(0, 0, W, H);

        // Danger zone line
        ctx.save();
        ctx.strokeStyle = 'rgba(255,0,127,0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.moveTo(0, H - 38); ctx.lineTo(W, H - 38); ctx.stroke();
        ctx.fillStyle = 'rgba(255,0,127,0.3)'; ctx.font = '10px Outfit,Arial';
        ctx.textAlign = 'right'; ctx.shadowBlur = 0;
        ctx.fillText('DANGER ZONE', W - 8, H - 42);
        ctx.restore();

        if (state.phase === 'idle') {
            ctx.save();
            ctx.fillStyle = '#ffe600'; ctx.font = '700 28px Outfit,Arial';
            ctx.textAlign = 'center'; ctx.shadowBlur = 15; ctx.shadowColor = '#ffe600';
            ctx.fillText('⌨️ NEON TYPE RUSH', W/2, H/2 - 50);
            ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '400 13px Inter,Arial'; ctx.shadowBlur = 0;
            ctx.fillText('Gõ các từ đang rơi và nhấn Enter để phá hủy chúng!', W/2, H/2 + 0);
            ctx.fillStyle = 'rgba(0,240,255,0.7)'; ctx.font = '600 12px Outfit,Arial';
            ctx.fillText('Nhấn Enter để bắt đầu • 60 giây • 5 mạng sống', W/2, H/2 + 32);
            ctx.restore();
            drawLives();
            return;
        }

        // Words
        state.words.forEach(w => {
            const fullText = w.text;
            const typed = w.typed;
            const fontSize = 18 + w.text.length;
            ctx.font = `700 ${fontSize}px Outfit,Arial`;
            ctx.textAlign = 'left';

            // Background pill
            const tw = ctx.measureText(fullText).width;
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath(); ctx.roundRect(w.x - 8, w.y - fontSize, tw + 16, fontSize + 8, 6); ctx.fill();
            ctx.strokeStyle = `${w.color}55`; ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();

            // Typed portion (bright)
            if (typed > 0) {
                ctx.save();
                ctx.fillStyle = '#fff'; ctx.shadowBlur = 10; ctx.shadowColor = w.color;
                ctx.fillText(fullText.slice(0, typed), w.x, w.y);
                ctx.restore();
                const tw2 = ctx.measureText(fullText.slice(0, typed)).width;
                ctx.save();
                ctx.fillStyle = w.color; ctx.shadowBlur = 6; ctx.shadowColor = w.color;
                ctx.fillText(fullText.slice(typed), w.x + tw2, w.y);
                ctx.restore();
            } else {
                ctx.save();
                ctx.fillStyle = w.color;
                ctx.shadowBlur = 4 + Math.sin(w.pulse) * 3;
                ctx.shadowColor = w.color;
                ctx.fillText(fullText, w.x, w.y);
                ctx.restore();
            }
        });

        // Particles
        state.particles.forEach(p => {
            ctx.save(); ctx.globalAlpha = p.life;
            if (p.text) {
                ctx.fillStyle = '#ffe600'; ctx.font = '700 14px Outfit,Arial';
                ctx.textAlign = 'center'; ctx.shadowBlur = 8; ctx.shadowColor = '#ffe600';
                ctx.fillText(p.text, p.x, p.y);
            } else {
                ctx.fillStyle = p.color; ctx.shadowBlur = 6; ctx.shadowColor = p.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();
        });

        // HUD
        ctx.save();
        ctx.fillStyle = '#ffe600'; ctx.font = '700 20px Outfit,Arial';
        ctx.textAlign = 'left'; ctx.shadowBlur = 8; ctx.shadowColor = '#ffe600';
        ctx.fillText('ĐIỂM: ' + state.score, 16, 32);
        // Streak
        if (state.streak >= 2) {
            ctx.fillStyle = '#00ff88'; ctx.font = '700 13px Outfit,Arial'; ctx.shadowColor = '#00ff88';
            ctx.fillText(`🔥 x${state.streak} STREAK!`, 16, 52);
        }
        // Timer
        const tColor = state.timeLeft <= 10 ? '#ff4444' : '#00f0ff';
        ctx.fillStyle = tColor; ctx.font = '700 20px Outfit,Arial';
        ctx.textAlign = 'center'; ctx.shadowColor = tColor;
        ctx.fillText(`⏱ ${state.timeLeft}s`, W/2, 32);
        // Level
        ctx.fillStyle = 'rgba(191,0,255,0.7)'; ctx.font = '600 11px Outfit,Arial'; ctx.shadowBlur = 0;
        ctx.fillText('LEV ' + state.level, W/2, 48);
        // Best
        ctx.fillStyle = 'rgba(255,230,0,0.4)'; ctx.font = '600 11px Outfit,Arial';
        ctx.textAlign = 'right'; ctx.fillText('BEST: ' + state.best, W - 130, 32);
        ctx.restore();

        // Timer bar
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath(); ctx.roundRect(0, H - 5, W, 5, 0); ctx.fill();
        const tCol = state.timeLeft <= 10 ? '#ff4444' : '#00f0ff';
        ctx.fillStyle = tCol; ctx.shadowBlur = 4; ctx.shadowColor = tCol;
        ctx.beginPath(); ctx.roundRect(0, H - 5, W * (state.timeLeft/GAME_DURATION), 5, 0); ctx.fill();
        ctx.restore();

        drawLives();

        // Input echo
        if (state.input && state.phase === 'playing') {
            ctx.save();
            ctx.fillStyle = 'rgba(255,230,0,0.7)'; ctx.font = '700 14px Outfit,Arial';
            ctx.textAlign = 'center'; ctx.shadowBlur = 8; ctx.shadowColor = '#ffe600';
            ctx.fillText('▶ ' + state.input, W/2, H - 48);
            ctx.restore();
        }

        // Game over
        if (state.phase === 'over') {
            ctx.save();
            ctx.fillStyle = 'rgba(5,8,20,0.85)'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#ffe600'; ctx.font = '700 34px Outfit,Arial';
            ctx.textAlign = 'center'; ctx.shadowBlur = 18; ctx.shadowColor = '#ffe600';
            ctx.fillText('HẾT GIỜ! ⌛', W/2, H/2 - 60);
            ctx.fillStyle = '#00f0ff'; ctx.font = '700 24px Outfit,Arial'; ctx.shadowColor = '#00f0ff';
            ctx.fillText('ĐIỂM: ' + state.score, W/2, H/2 - 10);
            ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '400 13px Inter,Arial'; ctx.shadowBlur = 0;
            ctx.fillText(`BEST: ${state.best}  •  Max Streak: ${state.maxStreak}x`, W/2, H/2 + 22);
            ctx.fillStyle = 'rgba(0,240,255,0.6)'; ctx.font = '400 13px Inter,Arial';
            ctx.fillText('Nhấn Enter để chơi lại', W/2, H/2 + 52);
            ctx.restore();
        }
    }

    let animId;
    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }
    const old = container._gameCleanup;
    if (old) old();
    container._gameCleanup = () => {
        cancelAnimationFrame(animId);
        clearInterval(state.tickInterval);
    };
    loop();
}
