// ===========================
// NEON PONG
// ===========================
function initPong(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const W = 600, H = 400;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 40px rgba(0,240,255,0.25);';
    container.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:12px;';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Mode selector
    const modeBar = document.createElement('div');
    modeBar.style.cssText = 'display:flex;gap:10px;margin-bottom:4px;';
    ['vs AI', '2 NGƯỜI'].forEach((label, i) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.style.cssText = `padding:7px 18px;border-radius:6px;font-family:'Outfit',Arial;font-weight:700;
            font-size:12px;letter-spacing:1px;cursor:pointer;transition:all 0.2s;
            border:1px solid ${i===0?'#00f0ff':'#ff007f'};
            background:${i===0?'rgba(0,240,255,0.12)':'rgba(255,0,127,0.08)'};
            color:${i===0?'#00f0ff':'#ff007f'};`;
        btn.addEventListener('click', () => { state.mode = i === 0 ? 'ai' : '2p'; resetGame(); });
        modeBar.appendChild(btn);
    });
    container.insertBefore(modeBar, canvas);

    const PADDLE_W = 10, PADDLE_H = 70, BALL_R = 8, PADDLE_SPEED = 4;

    let state = {};
    function resetGame() {
        state = {
            mode: state.mode || 'ai',
            phase: 'idle',
            score: [0, 0],
            ball: { x: W/2, y: H/2, vx: 4*(Math.random()>0.5?1:-1), vy: 3*(Math.random()>0.5?1:-1) },
            paddles: [
                { x: 16, y: H/2 - PADDLE_H/2, vy: 0 }, // left (player 1)
                { x: W - 16 - PADDLE_W, y: H/2 - PADDLE_H/2, vy: 0 } // right (player 2 / AI)
            ],
            keys: {},
            particles: [],
            trail: []
        };
    }
    resetGame();

    canvas.addEventListener('click', () => { if (state.phase === 'idle') state.phase = 'playing'; });

    const onKey = (e) => {
        if (!document.getElementById(containerId)) return;
        state.keys[e.code] = e.type === 'keydown';
        if (['ArrowUp','ArrowDown'].includes(e.code)) e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKey);

    function spawnParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            state.particles.push({
                x, y,
                vx: (Math.random()-0.5)*6,
                vy: (Math.random()-0.5)*6,
                life: 1, color
            });
        }
    }

    function update() {
        if (state.phase !== 'playing') return;
        const b = state.ball;
        const [p1, p2] = state.paddles;

        // Player 1 (W/S or Arrow keys)
        if (state.keys['KeyW'] || state.keys['ArrowUp']) p1.vy = -PADDLE_SPEED;
        else if (state.keys['KeyS'] || state.keys['ArrowDown']) p1.vy = PADDLE_SPEED;
        else p1.vy = 0;
        p1.y = Math.max(0, Math.min(H - PADDLE_H, p1.y + p1.vy));

        // Player 2 / AI
        if (state.mode === '2p') {
            if (state.keys['ArrowUp']) p2.vy = -PADDLE_SPEED;
            else if (state.keys['ArrowDown']) p2.vy = PADDLE_SPEED;
            // Override: 2p uses O/L
            if (state.keys['KeyO']) p2.vy = -PADDLE_SPEED;
            else if (state.keys['KeyL']) p2.vy = PADDLE_SPEED;
            else if (!state.keys['ArrowUp'] && !state.keys['ArrowDown']) p2.vy = 0;
        } else {
            // AI: track ball with slight delay
            const target = b.y - PADDLE_H / 2;
            const diff = target - p2.y;
            p2.vy = Math.sign(diff) * Math.min(Math.abs(diff) * 0.08, PADDLE_SPEED * 0.85);
        }
        p2.y = Math.max(0, Math.min(H - PADDLE_H, p2.y + p2.vy));

        // Ball trail
        state.trail.push({ x: b.x, y: b.y });
        if (state.trail.length > 12) state.trail.shift();

        // Move ball
        b.x += b.vx;
        b.y += b.vy;

        // Wall bounce top/bottom
        if (b.y - BALL_R < 0) { b.y = BALL_R; b.vy = Math.abs(b.vy); spawnParticles(b.x, 0, '#00f0ff'); }
        if (b.y + BALL_R > H) { b.y = H - BALL_R; b.vy = -Math.abs(b.vy); spawnParticles(b.x, H, '#00f0ff'); }

        // Paddle collision
        function hitPaddle(paddle, side) {
            const px = side === 'left' ? paddle.x + PADDLE_W : paddle.x;
            if (b.x - BALL_R < paddle.x + PADDLE_W && b.x + BALL_R > paddle.x &&
                b.y > paddle.y && b.y < paddle.y + PADDLE_H) {
                const relHit = (b.y - (paddle.y + PADDLE_H/2)) / (PADDLE_H/2);
                const speed = Math.min(Math.hypot(b.vx, b.vy) * 1.04, 14);
                b.vy = relHit * 6;
                b.vx = (side === 'left' ? 1 : -1) * Math.sqrt(speed*speed - b.vy*b.vy);
                b.x = side === 'left' ? paddle.x + PADDLE_W + BALL_R + 1 : paddle.x - BALL_R - 1;
                spawnParticles(b.x, b.y, side === 'left' ? '#00f0ff' : '#ff007f');
            }
        }
        hitPaddle(p1, 'left');
        hitPaddle(p2, 'right');

        // Scoring
        if (b.x - BALL_R < 0) {
            state.score[1]++;
            resetBall(1);
        } else if (b.x + BALL_R > W) {
            state.score[0]++;
            resetBall(-1);
        }

        // Particles
        state.particles.forEach(p => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.06;
        });
        state.particles = state.particles.filter(p => p.life > 0);

        if (state.score[0] >= 7 || state.score[1] >= 7) state.phase = 'over';
    }

    function resetBall(dir) {
        state.ball = {
            x: W/2, y: H/2,
            vx: 4 * dir, vy: 3 * (Math.random()>0.5?1:-1)
        };
        state.trail = [];
    }

    function drawGlowRect(x, y, w, h, color) {
        ctx.save();
        ctx.shadowBlur = 14;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        ctx.restore();
    }

    function draw() {
        // BG
        ctx.fillStyle = '#050810';
        ctx.fillRect(0, 0, W, H);

        // Center line
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.setLineDash([10, 12]);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
        ctx.restore();

        if (state.phase === 'idle') {
            ctx.save();
            ctx.fillStyle = '#00f0ff'; ctx.font = '700 28px Outfit,Arial'; ctx.textAlign = 'center';
            ctx.shadowBlur = 15; ctx.shadowColor = '#00f0ff';
            ctx.fillText('NEON PONG', W/2, H/2 - 30);
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '400 13px Inter,Arial'; ctx.shadowBlur = 0;
            ctx.fillText('P1: W/S   P2(2P mode): O/L', W/2, H/2 + 10);
            ctx.fillStyle = 'rgba(255,230,0,0.7)'; ctx.font = '600 12px Outfit,Arial';
            ctx.fillText('Click để bắt đầu • Đến 7 điểm để thắng', W/2, H/2 + 38);
            ctx.restore();
            return;
        }

        // Trail
        state.trail.forEach((t, i) => {
            ctx.save(); ctx.globalAlpha = (i/state.trail.length) * 0.4;
            ctx.fillStyle = '#00f0ff'; ctx.shadowBlur = 8; ctx.shadowColor = '#00f0ff';
            const r = BALL_R * (i/state.trail.length);
            ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        });

        // Ball
        ctx.save();
        ctx.shadowBlur = 22; ctx.shadowColor = '#fff';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(state.ball.x, state.ball.y, BALL_R, 0, Math.PI*2); ctx.fill();
        ctx.restore();

        // Paddles
        drawGlowRect(state.paddles[0].x, state.paddles[0].y, PADDLE_W, PADDLE_H, '#00f0ff');
        drawGlowRect(state.paddles[1].x, state.paddles[1].y, PADDLE_W, PADDLE_H, '#ff007f');

        // Particles
        state.particles.forEach(p => {
            ctx.save(); ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color; ctx.shadowBlur = 6; ctx.shadowColor = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        });

        // Score
        ctx.save();
        ctx.fillStyle = '#00f0ff'; ctx.font = '700 48px Outfit,Arial'; ctx.textAlign = 'center';
        ctx.shadowBlur = 12; ctx.shadowColor = '#00f0ff';
        ctx.fillText(state.score[0], W/2 - 80, 56);
        ctx.fillStyle = '#ff007f'; ctx.shadowColor = '#ff007f';
        ctx.fillText(state.score[1], W/2 + 80, 56);
        ctx.restore();

        // Labels
        ctx.save();
        ctx.fillStyle = 'rgba(0,240,255,0.4)'; ctx.font = '600 10px Outfit,Arial';
        ctx.textAlign = 'center'; ctx.fillText('P1', W/2 - 80, 72);
        ctx.fillStyle = 'rgba(255,0,127,0.4)';
        ctx.fillText(state.mode === 'ai' ? 'AI' : 'P2', W/2 + 80, 72);
        ctx.restore();

        // Game over
        if (state.phase === 'over') {
            ctx.save();
            ctx.fillStyle = 'rgba(5,8,20,0.82)'; ctx.fillRect(0, 0, W, H);
            const winner = state.score[0] >= 7 ? 'P1' : (state.mode === 'ai' ? 'AI' : 'P2');
            const winCol = state.score[0] >= 7 ? '#00f0ff' : '#ff007f';
            ctx.fillStyle = winCol; ctx.font = '700 38px Outfit,Arial';
            ctx.textAlign = 'center'; ctx.shadowBlur = 18; ctx.shadowColor = winCol;
            ctx.fillText(winner + ' THẮNG! 🏆', W/2, H/2 - 20);
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '400 13px Inter,Arial'; ctx.shadowBlur = 0;
            ctx.fillText('Click để chơi lại', W/2, H/2 + 24);
            ctx.restore();
            canvas.onclick = () => { resetGame(); state.phase = 'playing'; canvas.onclick = () => { if(state.phase==='idle') state.phase='playing'; }; };
        }
    }

    let animId;
    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }
    const old = container._gameCleanup;
    if (old) old();
    container._gameCleanup = () => {
        cancelAnimationFrame(animId);
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('keyup', onKey);
    };
    loop();
}
