// ===========================
// NEON SPIN
// ===========================
function initNeonSpin(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const W = 460, H = 500;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 35px rgba(191,0,255,0.25);cursor:pointer;';
    container.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const CENTER_X = W / 2;
    const CENTER_Y = H / 2 + 20;
    const ORBIT_RADIUS = 75;
    const DOT_RADIUS = 10;

    let state = {};

    function initState() {
        state = {
            phase: 'idle', // idle | playing | over
            angle: 0,
            direction: 1, // 1 for clockwise, -1 counter-clockwise
            score: 0,
            best: parseInt(localStorage.getItem('neon_spin_best') || '0'),
            obstacles: [],
            spawnTimer: 0,
            spawnInterval: 120, // frames
            speed: 0.045,
            particles: []
        };
    }
    initState();

    canvas.addEventListener('mousedown', () => {
        if (state.phase === 'idle') {
            state.phase = 'playing';
            return;
        }
        if (state.phase === 'over') {
            initState();
            state.phase = 'playing';
            return;
        }
        // Change spin direction on click
        state.direction *= -1;
        // Spark particles at player position
        const px = CENTER_X + Math.cos(state.angle) * ORBIT_RADIUS;
        const py = CENTER_Y + Math.sin(state.angle) * ORBIT_RADIUS;
        for (let i = 0; i < 6; i++) {
            state.particles.push({
                x: px, y: py,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 1, color: '#00f0ff'
            });
        }
    });

    function spawnObstacle() {
        const side = Math.random() > 0.5 ? 1 : -1;
        state.obstacles.push({
            x: CENTER_X + (Math.random() - 0.5) * 220,
            y: -20,
            vy: 2.2 + Math.random() * 1.5 + (state.score * 0.08),
            size: 12 + Math.random() * 10,
            color: '#ff007f',
            scored: false
        });
    }

    function update() {
        if (state.phase !== 'playing') return;

        // Update angle
        state.angle += state.speed * state.direction;

        // Spawn obstacles
        state.spawnTimer++;
        if (state.spawnTimer >= state.spawnInterval) {
            state.spawnTimer = 0;
            spawnObstacle();
            // speed increase slightly
            state.speed = Math.min(0.08, 0.045 + state.score * 0.001);
            state.spawnInterval = Math.max(50, 120 - state.score * 2);
        }

        // Update obstacles
        const px = CENTER_X + Math.cos(state.angle) * ORBIT_RADIUS;
        const py = CENTER_Y + Math.sin(state.angle) * ORBIT_RADIUS;

        for (let i = state.obstacles.length - 1; i >= 0; i--) {
            const obs = state.obstacles[i];
            obs.y += obs.vy;

            // Check collision with spinning dot
            const dist = Math.hypot(px - obs.x, py - obs.y);
            if (dist < DOT_RADIUS + obs.size * 0.8) {
                // Game Over!
                state.phase = 'over';
                if (state.score > state.best) {
                    state.best = state.score;
                    localStorage.setItem('neon_spin_best', state.best);
                }
                return;
            }

            // Score when passing center height
            if (!obs.scored && obs.y > CENTER_Y) {
                obs.scored = true;
                state.score++;
            }

            if (obs.y > H + 30) {
                state.obstacles.splice(i, 1);
            }
        }

        // Update particles
        state.particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            p.life -= 0.04;
        });
        state.particles = state.particles.filter(p => p.life > 0);
    }

    function draw() {
        ctx.fillStyle = '#060812';
        ctx.fillRect(0, 0, W, H);

        // Orbit ring
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, ORBIT_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Obstacles
        state.obstacles.forEach(obs => {
            ctx.save();
            ctx.fillStyle = obs.color;
            ctx.shadowBlur = 10; ctx.shadowColor = obs.color;
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, obs.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Player Dot
        if (state.phase !== 'over') {
            const px = CENTER_X + Math.cos(state.angle) * ORBIT_RADIUS;
            const py = CENTER_Y + Math.sin(state.angle) * ORBIT_RADIUS;

            ctx.save();
            ctx.fillStyle = '#00f0ff';
            ctx.shadowBlur = 15; ctx.shadowColor = '#00f0ff';
            ctx.beginPath();
            ctx.arc(px, py, DOT_RADIUS, 0, Math.PI * 2);
            ctx.fill();

            // Inner core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Particles
        state.particles.forEach(p => {
            ctx.save(); ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color; ctx.shadowBlur = 5; ctx.shadowColor = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });

        // HUD
        ctx.save();
        ctx.fillStyle = '#bf00ff'; ctx.font = '700 18px Outfit,Arial';
        ctx.fillText('🌀 NEON SPIN', 15, 35);
        ctx.fillStyle = '#ffe600'; ctx.font = '700 24px Outfit,Arial'; ctx.textAlign = 'right';
        ctx.fillText(state.score, W - 15, 35);
        ctx.fillStyle = 'rgba(255, 230, 0, 0.4)'; ctx.font = '600 11px Outfit,Arial';
        ctx.fillText(`BEST: ${state.best}`, W - 15, 52);
        ctx.restore();

        // Overlays
        if (state.phase === 'idle') {
            ctx.save(); ctx.fillStyle = 'rgba(5, 8, 20, 0.85)'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#00f0ff'; ctx.font = '700 28px Outfit,Arial'; ctx.textAlign = 'center'; ctx.shadowBlur = 15; ctx.shadowColor = '#00f0ff';
            ctx.fillText('NEON SPIN', W / 2, H / 2 - 40);
            ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '400 13px Inter,Arial'; ctx.shadowBlur = 0;
            ctx.fillText('Click để đổi hướng xoay tròn', W / 2, H / 2);
            ctx.fillText('Tránh chướng ngại vật màu hồng rơi xuống!', W / 2, H / 2 + 20);
            ctx.fillStyle = '#bf00ff'; ctx.font = '600 12px Outfit,Arial';
            ctx.fillText('Click để BẮT ĐẦU', W / 2, H / 2 + 50);
            ctx.restore();
        }
        if (state.phase === 'over') {
            ctx.save(); ctx.fillStyle = 'rgba(5, 8, 20, 0.88)'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#ff007f'; ctx.font = '700 32px Outfit,Arial'; ctx.textAlign = 'center'; ctx.shadowBlur = 18; ctx.shadowColor = '#ff007f';
            ctx.fillText('GAME OVER!', W / 2, H / 2 - 25);
            ctx.fillStyle = '#ffe600'; ctx.font = '700 22px Outfit,Arial'; ctx.shadowColor = '#ffe600';
            ctx.fillText(`ĐIỂM: ${state.score}`, W / 2, H / 2 + 15);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; ctx.font = '400 13px Inter,Arial'; ctx.shadowBlur = 0;
            ctx.fillText('Click để chơi lại', W / 2, H / 2 + 45);
            ctx.restore();
        }
    }

    let animId;
    function loop() {
        update();
        draw();
        animId = requestAnimationFrame(loop);
    }
    const old = container._gameCleanup;
    if (old) old();
    container._gameCleanup = () => cancelAnimationFrame(animId);
    loop();
}
