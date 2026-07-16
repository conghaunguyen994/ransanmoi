// ===========================
// NEON FLAPPY BIRD
// ===========================
function initFlappyBird(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const W = 400, H = 600;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 40px rgba(0,240,255,0.3);cursor:pointer;';
    container.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:0;';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const GRAVITY = 0.45, FLAP = -9, PIPE_W = 52, GAP = 160, PIPE_SPEED = 2.8, PIPE_INTERVAL = 90;

    let state = {};
    function initState() {
        state = {
            bird: { x: 100, y: H / 2, vy: 0, angle: 0 },
            pipes: [],
            stars: Array.from({ length: 80 }, () => ({
                x: Math.random() * W, y: Math.random() * H,
                r: Math.random() * 1.4 + 0.3,
                speed: Math.random() * 0.4 + 0.1,
                alpha: Math.random() * 0.6 + 0.2
            })),
            score: 0,
            best: parseInt(localStorage.getItem('neon_flappy_best') || '0'),
            frame: 0,
            phase: 'idle',
            trail: []
        };
    }
    initState();

    function flap() {
        if (state.phase === 'idle') state.phase = 'playing';
        if (state.phase === 'playing') state.bird.vy = FLAP;
        if (state.phase === 'dead') initState();
    }

    canvas.addEventListener('click', flap);
    function onKey(e) {
        if (e.code === 'Space') { e.preventDefault(); flap(); }
    }
    document.addEventListener('keydown', onKey);

    function drawRR(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function update() {
        state.frame++;
        state.stars.forEach(s => { s.x -= s.speed; if (s.x < 0) s.x = W; });
        if (state.phase !== 'playing') return;

        state.bird.vy += GRAVITY;
        state.bird.y += state.bird.vy;
        state.bird.angle = Math.max(-30, Math.min(90, state.bird.vy * 4));

        state.trail.push({ x: state.bird.x, y: state.bird.y });
        if (state.trail.length > 10) state.trail.shift();

        if (state.frame % PIPE_INTERVAL === 0) {
            const topH = 80 + Math.random() * (H - GAP - 160);
            state.pipes.push({ x: W + 10, topH, scored: false });
        }
        state.pipes.forEach(p => {
            p.x -= PIPE_SPEED;
            if (!p.scored && p.x + PIPE_W < state.bird.x) {
                p.scored = true; state.score++;
                if (state.score > state.best) {
                    state.best = state.score;
                    localStorage.setItem('neon_flappy_best', state.best);
                }
            }
        });
        state.pipes = state.pipes.filter(p => p.x + PIPE_W > 0);

        if (state.bird.y + 14 > H || state.bird.y - 14 < 0) { state.phase = 'dead'; return; }
        for (const p of state.pipes) {
            const inX = state.bird.x + 13 > p.x + 4 && state.bird.x - 13 < p.x + PIPE_W - 4;
            if (inX && (state.bird.y - 13 < p.topH || state.bird.y + 13 > p.topH + GAP)) {
                state.phase = 'dead'; return;
            }
        }
    }

    function draw() {
        ctx.fillStyle = '#080912';
        ctx.fillRect(0, 0, W, H);

        // Stars
        state.stars.forEach(s => {
            ctx.save(); ctx.globalAlpha = s.alpha;
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });

        // Pipes
        state.pipes.forEach((p, i) => {
            const col = i % 2 === 0 ? '#00f0ff' : '#ff00a0';
            const dark = i % 2 === 0 ? '#003d44' : '#44002a';
            ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = col;
            ctx.strokeStyle = col; ctx.lineWidth = 2;
            // Top
            ctx.fillStyle = dark; drawRR(p.x, 0, PIPE_W, p.topH - 4, 6); ctx.fill(); ctx.stroke();
            drawRR(p.x - 4, p.topH - 22, PIPE_W + 8, 22, 5); ctx.fill(); ctx.stroke();
            // Bottom
            const botY = p.topH + GAP;
            ctx.fillStyle = dark; drawRR(p.x, botY + 22, PIPE_W, H - botY - 22, 6); ctx.fill(); ctx.stroke();
            drawRR(p.x - 4, botY, PIPE_W + 8, 22, 5); ctx.fill(); ctx.stroke();
            ctx.restore();
        });

        // Trail
        state.trail.forEach((t, i) => {
            ctx.save(); ctx.globalAlpha = (i / state.trail.length) * 0.3;
            ctx.fillStyle = '#ffe600'; ctx.shadowBlur = 8; ctx.shadowColor = '#ffe600';
            ctx.beginPath(); ctx.arc(t.x, t.y, 9, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });

        // Bird
        ctx.save();
        ctx.translate(state.bird.x, state.bird.y);
        ctx.rotate((state.bird.angle * Math.PI) / 180);
        ctx.shadowBlur = 18; ctx.shadowColor = '#ffe600';
        ctx.fillStyle = '#ffe600'; ctx.beginPath(); ctx.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff9900'; ctx.beginPath(); ctx.ellipse(-4, 3, 8, 5, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(5, -4, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(6, -4, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff6600'; ctx.beginPath(); ctx.moveTo(13, -1); ctx.lineTo(20, 1); ctx.lineTo(13, 3); ctx.closePath(); ctx.fill();
        ctx.restore();

        // Score HUD
        ctx.save();
        ctx.fillStyle = '#ffffff'; ctx.font = '700 36px Outfit,Arial,sans-serif'; ctx.textAlign = 'center';
        ctx.shadowBlur = 10; ctx.shadowColor = '#00f0ff';
        if (state.phase !== 'idle') ctx.fillText(state.score, W / 2, 60);
        ctx.fillStyle = 'rgba(255,230,0,0.8)'; ctx.font = '600 13px Outfit,Arial,sans-serif';
        ctx.textAlign = 'right'; ctx.shadowBlur = 0;
        ctx.fillText('BEST: ' + state.best, W - 16, 22);
        ctx.restore();

        // Idle overlay
        if (state.phase === 'idle') {
            ctx.save();
            ctx.fillStyle = 'rgba(0,240,255,0.9)'; ctx.font = '700 28px Outfit,Arial,sans-serif';
            ctx.textAlign = 'center'; ctx.shadowBlur = 15; ctx.shadowColor = '#00f0ff';
            ctx.fillText('NEON FLAPPY BIRD', W / 2, H / 2 - 40);
            ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '400 14px Inter,Arial,sans-serif'; ctx.shadowBlur = 0;
            ctx.fillText('Click hoặc nhấn Space để bắt đầu', W / 2, H / 2 + 10);
            ctx.fillStyle = 'rgba(255,230,0,0.7)'; ctx.font = '700 13px Outfit,Arial,sans-serif';
            ctx.fillText('🐦 Bay qua khe ống laser!', W / 2, H / 2 + 40);
            ctx.restore();
        }

        // Dead overlay
        if (state.phase === 'dead') {
            ctx.save();
            ctx.fillStyle = 'rgba(5,5,15,0.78)'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#ff007f'; ctx.font = '700 38px Outfit,Arial,sans-serif';
            ctx.textAlign = 'center'; ctx.shadowBlur = 18; ctx.shadowColor = '#ff007f';
            ctx.fillText('GAME OVER!', W / 2, H / 2 - 50);
            ctx.fillStyle = '#ffe600'; ctx.font = '700 26px Outfit,Arial,sans-serif';
            ctx.shadowColor = '#ffe600'; ctx.fillText('ĐIỂM: ' + state.score, W / 2, H / 2 + 5);
            ctx.fillStyle = '#8f92a1'; ctx.font = '400 13px Inter,Arial,sans-serif'; ctx.shadowBlur = 0;
            ctx.fillText('Click hoặc Space để chơi lại', W / 2, H / 2 + 46);
            ctx.restore();
        }
    }

    let animId;
    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }

    const oldCleanup = container._gameCleanup;
    if (oldCleanup) oldCleanup();
    container._gameCleanup = () => {
        cancelAnimationFrame(animId);
        document.removeEventListener('keydown', onKey);
    };
    loop();
}
