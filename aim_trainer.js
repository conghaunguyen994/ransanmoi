// ===========================
// NEON AIM TRAINER
// ===========================
function initAimTrainer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const W = 600, H = 450;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 35px rgba(255,230,0,0.25);cursor:crosshair;';
    container.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const GAME_DURATION = 30; // seconds

    let state = {};
    function initState() {
        state = {
            phase: 'idle',
            targets: [],
            clicks: 0,
            hits: 0,
            score: 0,
            timeLeft: GAME_DURATION,
            best: parseInt(localStorage.getItem('neon_aim_best') || '0'),
            tickInterval: null,
            particles: []
        };
    }
    initState();

    function startGame() {
        initState();
        state.phase = 'playing';
        spawnTarget();
        spawnTarget();
        state.tickInterval = setInterval(() => {
            if (state.phase !== 'playing') { clearInterval(state.tickInterval); return; }
            state.timeLeft--;
            if (state.timeLeft <= 0) endGame();
        }, 1000);
    }

    function endGame() {
        state.phase = 'over';
        clearInterval(state.tickInterval);
        if (state.score > state.best) {
            state.best = state.score;
            localStorage.setItem('neon_aim_best', state.best);
        }
    }

    function spawnTarget() {
        const r = 14 + Math.random() * 12;
        state.targets.push({
            x: r + Math.random() * (W - r * 2),
            y: r + Math.random() * (H - r * 2),
            r,
            maxLife: 2000 + Math.random() * 1500, // 2-3.5 seconds
            life: 0,
            color: ['#00f0ff', '#ff007f', '#ffe600', '#00ff88'][Math.floor(Math.random() * 4)]
        });
    }

    canvas.addEventListener('click', (e) => {
        if (state.phase === 'idle') { startGame(); return; }
        if (state.phase === 'over') { initState(); return; }

        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (W / rect.width);
        const my = (e.clientY - rect.top) * (H / rect.height);

        state.clicks++;
        let hit = false;

        for (let i = state.targets.length - 1; i >= 0; i--) {
            const t = state.targets[i];
            const dist = Math.hypot(mx - t.x, my - t.y);
            // Dynamic radius based on life
            const currentR = t.r * Math.sin((t.life / t.maxLife) * Math.PI);
            if (dist < currentR) {
                state.hits++;
                state.score += Math.floor(100 * (1 - dist / currentR)); // more points for dead center hits
                hit = true;
                // Spawn hit particles
                for (let p = 0; p < 8; p++) {
                    state.particles.push({
                        x: t.x, y: t.y,
                        vx: (Math.random() - 0.5) * 6,
                        vy: (Math.random() - 0.5) * 6,
                        life: 1,
                        color: t.color
                    });
                }
                state.targets.splice(i, 1);
                spawnTarget();
                break;
            }
        }

        if (!hit) {
            // Miss particles
            for (let p = 0; p < 4; p++) {
                state.particles.push({
                    x: mx, y: my,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    life: 0.6,
                    color: '#ff4444'
                });
            }
        }
    });

    function update() {
        if (state.phase !== 'playing') return;

        // Update targets life
        for (let i = state.targets.length - 1; i >= 0; i--) {
            const t = state.targets[i];
            t.life += 16; // rough estimate of elapsed frame time
            if (t.life >= t.maxLife) {
                state.targets.splice(i, 1);
                spawnTarget(); // Respawn target
            }
        }

        // Particles
        state.particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            p.life -= 0.05;
        });
        state.particles = state.particles.filter(p => p.life > 0);
    }

    function draw() {
        ctx.fillStyle = '#060810';
        ctx.fillRect(0, 0, W, H);

        if (state.phase === 'idle') {
            ctx.save(); ctx.fillStyle = 'rgba(5,8,20,0.85)'; ctx.fillRect(0,0,W,H);
            ctx.fillStyle = '#ffe600'; ctx.font = '700 28px Outfit,Arial'; ctx.textAlign = 'center'; ctx.shadowBlur=15; ctx.shadowColor='#ffe600';
            ctx.fillText('🎯 NEON AIM TRAINER', W/2, H/2-40);
            ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='400 13px Inter,Arial'; ctx.shadowBlur=0;
            ctx.fillText('Click vào các vòng tròn neon càng nhanh càng tốt.', W/2, H/2);
            ctx.fillText('Chính xác cao được nhiều điểm hơn!', W/2, H/2 + 20);
            ctx.fillStyle='rgba(0,240,255,0.8)'; ctx.font='600 12px Outfit,Arial';
            ctx.fillText('Click vào màn hình để BẮT ĐẦU (30s)', W/2, H/2+50);
            ctx.restore();
            return;
        }

        // Targets
        state.targets.forEach(t => {
            const currentR = t.r * Math.sin((t.life / t.maxLife) * Math.PI);
            if (currentR <= 0) return;

            ctx.save();
            ctx.strokeStyle = t.color;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 12;
            ctx.shadowColor = t.color;
            ctx.fillStyle = t.color + '22';

            ctx.beginPath();
            ctx.arc(t.x, t.y, currentR, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Inner target dot
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(t.x, t.y, Math.max(2, currentR * 0.2), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Particles
        state.particles.forEach(p => {
            ctx.save(); ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color; ctx.shadowBlur = 6; ctx.shadowColor = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        });

        // HUD
        ctx.save();
        ctx.fillStyle = '#00f0ff'; ctx.font = '700 18px Outfit,Arial';
        ctx.fillText('ĐIỂM: ' + state.score, 15, 30);

        const accuracy = state.clicks > 0 ? Math.round((state.hits / state.clicks) * 100) : 100;
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '500 12px Inter,Arial';
        ctx.fillText(`Độ chính xác: ${accuracy}%`, 15, 50);

        ctx.fillStyle = '#ffe600'; ctx.font = '700 18px Outfit,Arial'; ctx.textAlign = 'right';
        ctx.fillText(`⏱ ${state.timeLeft}s`, W - 15, 30);

        ctx.fillStyle = 'rgba(255,230,0,0.4)'; ctx.font = '500 12px Inter,Arial';
        ctx.fillText(`BEST: ${state.best}`, W - 15, 50);
        ctx.restore();

        // Game over
        if (state.phase === 'over') {
            ctx.save(); ctx.fillStyle = 'rgba(5,8,20,0.9)'; ctx.fillRect(0,0,W,H);
            ctx.fillStyle = '#ffe600'; ctx.font = '700 32px Outfit,Arial'; ctx.textAlign='center'; ctx.shadowBlur=18; ctx.shadowColor='#ffe600';
            ctx.fillText('HẾT GIỜ! ⌛', W/2, H/2-50);
            ctx.fillStyle='#00f0ff'; ctx.font='700 22px Outfit,Arial'; ctx.shadowColor='#00f0ff';
            ctx.fillText(`ĐIỂM: ${state.score}`, W/2, H/2 - 10);
            ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='400 13px Inter,Arial'; ctx.shadowBlur=0;
            ctx.fillText(`Độ chính xác: ${accuracy}% (${state.hits}/${state.clicks} click)`, W/2, H/2 + 20);
            ctx.fillStyle='rgba(0,255,136,0.8)'; ctx.font='400 13px Inter,Arial';
            ctx.fillText('Click để chơi lại', W/2, H/2 + 50);
            ctx.restore();
        }
    }

    let animId;
    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }
    const old = container._gameCleanup;
    if (old) old();
    container._gameCleanup = () => { cancelAnimationFrame(animId); clearInterval(state.tickInterval); };
    loop();
}
