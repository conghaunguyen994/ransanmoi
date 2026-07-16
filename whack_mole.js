// ===========================
// NEON WHACK-A-MOLE
// ===========================
function initWhackMole(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const W = 420, H = 520;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 40px rgba(255,0,128,0.3);cursor:pointer;';
    container.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:0;';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const COLS = 3, ROWS = 3, CELL_W = 120, CELL_H = 130;
    const GRID_OFFSET_X = (W - COLS * CELL_W) / 2;
    const GRID_OFFSET_Y = 100;
    const GAME_DURATION = 30; // seconds
    const HOLE_RX = 46, HOLE_RY = 14; // ellipse radii for holes

    const MOLE_COLORS = ['#ff007f', '#00f0ff', '#ffe600', '#bf00ff', '#00ff88'];

    let state = {};

    function initState() {
        state = {
            phase: 'idle', // idle | playing | over
            score: 0,
            best: parseInt(localStorage.getItem('neon_whack_best') || '0'),
            timeLeft: GAME_DURATION,
            moles: Array.from({ length: 9 }, (_, i) => ({
                id: i, active: false, hit: false,
                timer: 0, duration: 0,
                popAnim: 0, // 0..1 how far out
                hitAnim: 0,
                color: MOLE_COLORS[i % MOLE_COLORS.length]
            })),
            particles: [],
            missAnim: null,
            tickInterval: null,
            moleInterval: null
        };
    }
    initState();

    function startGame() {
        initState();
        state.phase = 'playing';
        state.timeLeft = GAME_DURATION;

        state.tickInterval = setInterval(() => {
            if (state.phase !== 'playing') { clearInterval(state.tickInterval); return; }
            state.timeLeft--;
            if (state.timeLeft <= 0) endGame();
        }, 1000);

        spawnMoles();
    }

    function spawnMoles() {
        if (state.phase !== 'playing') return;
        const speed = Math.max(0.6, 1 - (GAME_DURATION - state.timeLeft) * 0.02);
        const inactive = state.moles.filter(m => !m.active);
        if (inactive.length > 0) {
            const m = inactive[Math.floor(Math.random() * inactive.length)];
            m.active = true; m.hit = false; m.popAnim = 0; m.hitAnim = 0;
            m.duration = Math.floor((800 + Math.random() * 600) * speed);
            m.timer = m.duration;
            m.color = MOLE_COLORS[Math.floor(Math.random() * MOLE_COLORS.length)];
        }
        const nextDelay = Math.max(350, 700 - (GAME_DURATION - state.timeLeft) * 12);
        state.moleTimeout = setTimeout(spawnMoles, nextDelay);
    }

    function endGame() {
        state.phase = 'over';
        clearInterval(state.tickInterval);
        clearTimeout(state.moleTimeout);
        if (state.score > state.best) {
            state.best = state.score;
            localStorage.setItem('neon_whack_best', state.best);
        }
    }

    function getMolePos(id) {
        const col = id % COLS, row = Math.floor(id / COLS);
        const cx = GRID_OFFSET_X + col * CELL_W + CELL_W / 2;
        const cy = GRID_OFFSET_Y + row * CELL_H + CELL_H - 20;
        return { cx, cy };
    }

    canvas.addEventListener('click', (e) => {
        if (state.phase === 'idle') { startGame(); return; }
        if (state.phase === 'over') { initState(); return; }

        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (W / rect.width);
        const my = (e.clientY - rect.top) * (H / rect.height);

        let hit = false;
        state.moles.forEach(m => {
            if (!m.active || m.hit) return;
            const { cx, cy } = getMolePos(m.id);
            const moleTop = cy - 50 * m.popAnim;
            const dx = mx - cx, dy = my - (moleTop - 10);
            if (Math.sqrt(dx * dx + dy * dy) < 36) {
                m.hit = true; m.hitAnim = 1;
                state.score++;
                hit = true;
                // Particles
                for (let i = 0; i < 10; i++) {
                    state.particles.push({
                        x: cx, y: moleTop - 10,
                        vx: (Math.random() - 0.5) * 8,
                        vy: (Math.random() - 0.5) * 8,
                        life: 1, color: m.color
                    });
                }
            }
        });
        if (!hit && state.phase === 'playing') {
            state.missAnim = { x: mx, y: my, life: 1 };
        }
    });

    function update() {
        if (state.phase !== 'playing') return;

        state.moles.forEach(m => {
            if (!m.active) return;
            if (m.hit) {
                m.hitAnim = Math.max(0, m.hitAnim - 0.06);
                m.popAnim = Math.max(0, m.popAnim - 0.05);
                if (m.popAnim <= 0) m.active = false;
            } else {
                m.timer -= 16;
                // Pop up phase (first 30% of duration)
                const popPhase = m.duration * 0.3;
                const downPhase = m.duration * 0.3;
                const elapsed = m.duration - m.timer;
                if (elapsed < popPhase) {
                    m.popAnim = Math.min(1, elapsed / popPhase);
                } else if (m.timer < downPhase) {
                    m.popAnim = Math.max(0, m.timer / downPhase);
                    if (m.popAnim <= 0) m.active = false;
                } else {
                    m.popAnim = 1;
                }
            }
        });

        // Particles
        state.particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            p.vy += 0.2;
            p.life -= 0.05;
        });
        state.particles = state.particles.filter(p => p.life > 0);

        if (state.missAnim) state.missAnim.life -= 0.06;
        if (state.missAnim && state.missAnim.life <= 0) state.missAnim = null;
    }

    function drawHole(cx, cy) {
        // Shadow under hole
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, HOLE_RX, HOLE_RY, 0, 0, Math.PI * 2);
        ctx.fill();
        // Hole outline neon glow
        ctx.strokeStyle = 'rgba(0,240,255,0.25)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00f0ff';
        ctx.stroke();
        ctx.restore();
    }

    function drawMole(m) {
        if (!m.active || m.popAnim <= 0) return;
        const { cx, cy } = getMolePos(m.id);
        const riseY = 50 * m.popAnim;
        const moleY = cy - riseY;

        ctx.save();
        // Clip to above hole surface
        ctx.beginPath();
        ctx.rect(cx - 50, 0, 100, cy + HOLE_RY);
        ctx.clip();

        const scale = m.hit ? 1 + m.hitAnim * 0.3 : 1;
        ctx.translate(cx, moleY);
        ctx.scale(scale, scale);

        // Glow
        ctx.shadowBlur = m.hit ? 30 : 14;
        ctx.shadowColor = m.color;

        // Body
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, 28, 32, 0, 0, Math.PI * 2);
        ctx.fill();

        // Face
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.ellipse(0, 5, 18, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        const eyeColors = ['#ff007f', '#00f0ff', '#ffe600', '#bf00ff', '#00ff88'];
        ctx.fillStyle = '#111';
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(-8, -2, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -2, 4, 0, Math.PI * 2); ctx.fill();
        // Shine
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-6, -4, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(10, -4, 1.5, 0, Math.PI * 2); ctx.fill();

        // Nose
        ctx.fillStyle = '#ff6699';
        ctx.beginPath(); ctx.arc(0, 6, 4, 0, Math.PI * 2); ctx.fill();

        // Whiskers
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-20, 8); ctx.lineTo(-8, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(20, 8); ctx.lineTo(8, 7); ctx.stroke();

        // Ears
        ctx.fillStyle = m.color;
        ctx.shadowBlur = 6; ctx.shadowColor = m.color;
        ctx.beginPath(); ctx.ellipse(-20, -22, 9, 14, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(20, -22, 9, 14, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath(); ctx.ellipse(-20, -22, 5, 9, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(20, -22, 5, 9, 0.3, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    function draw() {
        // Background
        ctx.fillStyle = '#0a0b16';
        ctx.fillRect(0, 0, W, H);

        // Grid background deco
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cx = GRID_OFFSET_X + c * CELL_W + CELL_W / 2;
                const cy = GRID_OFFSET_Y + r * CELL_H + CELL_H / 2;
                ctx.save();
                ctx.strokeStyle = 'rgba(255,255,255,0.04)';
                ctx.lineWidth = 1;
                ctx.strokeRect(GRID_OFFSET_X + c * CELL_W + 5, GRID_OFFSET_Y + r * CELL_H + 5, CELL_W - 10, CELL_H - 10);
                ctx.restore();
            }
        }

        // Holes (draw below moles)
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const id = r * COLS + c;
                const { cx, cy } = getMolePos(id);
                drawHole(cx, cy);
            }
        }

        // Moles
        state.moles.forEach(m => drawMole(m));

        // Particles
        state.particles.forEach(p => {
            ctx.save(); ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 6; ctx.shadowColor = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });

        // Miss anim
        if (state.missAnim) {
            ctx.save(); ctx.globalAlpha = state.missAnim.life;
            ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2;
            ctx.shadowBlur = 8; ctx.shadowColor = '#ff4444';
            const sz = 12;
            ctx.beginPath();
            ctx.moveTo(state.missAnim.x - sz, state.missAnim.y - sz);
            ctx.lineTo(state.missAnim.x + sz, state.missAnim.y + sz);
            ctx.moveTo(state.missAnim.x + sz, state.missAnim.y - sz);
            ctx.lineTo(state.missAnim.x - sz, state.missAnim.y + sz);
            ctx.stroke();
            ctx.restore();
        }

        // HUD
        ctx.save();
        // Score
        ctx.fillStyle = '#ffe600'; ctx.font = '700 22px Outfit,Arial,sans-serif';
        ctx.textAlign = 'left'; ctx.shadowBlur = 8; ctx.shadowColor = '#ffe600';
        ctx.fillText('ĐIỂM: ' + state.score, 20, 40);
        // Best
        ctx.fillStyle = 'rgba(255,230,0,0.5)'; ctx.font = '600 11px Outfit,Arial,sans-serif'; ctx.shadowBlur = 0;
        ctx.fillText('BEST: ' + state.best, 20, 58);
        // Timer
        if (state.phase === 'playing') {
            const timerColor = state.timeLeft <= 10 ? '#ff4444' : '#00f0ff';
            ctx.fillStyle = timerColor; ctx.font = '700 22px Outfit,Arial,sans-serif';
            ctx.textAlign = 'right'; ctx.shadowBlur = 8; ctx.shadowColor = timerColor;
            ctx.fillText('⏱ ' + state.timeLeft + 's', W - 20, 40);
            // Timer bar
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.beginPath(); ctx.roundRect(20, 70, W - 40, 6, 3); ctx.fill();
            ctx.fillStyle = timerColor; ctx.shadowBlur = 6; ctx.shadowColor = timerColor;
            ctx.beginPath(); ctx.roundRect(20, 70, (W - 40) * (state.timeLeft / GAME_DURATION), 6, 3); ctx.fill();
        }
        ctx.restore();

        // Title
        ctx.save();
        ctx.fillStyle = 'rgba(255,0,128,0.8)'; ctx.font = '700 15px Outfit,Arial,sans-serif';
        ctx.textAlign = 'center'; ctx.shadowBlur = 10; ctx.shadowColor = '#ff007f';
        ctx.fillText('🎯 NEON WHACK-A-MOLE', W / 2, 88);
        ctx.restore();

        // Idle overlay
        if (state.phase === 'idle') {
            ctx.save();
            ctx.fillStyle = 'rgba(5,5,15,0.82)'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#ff007f'; ctx.font = '700 30px Outfit,Arial,sans-serif';
            ctx.textAlign = 'center'; ctx.shadowBlur = 15; ctx.shadowColor = '#ff007f';
            ctx.fillText('NEON WHACK-A-MOLE', W / 2, H / 2 - 50);
            ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '400 14px Inter,Arial,sans-serif'; ctx.shadowBlur = 0;
            ctx.fillText('Click vào chuột neon trước khi chúng trốn!', W / 2, H / 2 + 5);
            ctx.fillStyle = 'rgba(0,240,255,0.7)'; ctx.font = '600 13px Outfit,Arial,sans-serif';
            ctx.fillText('Thời gian: 30 giây — Click để bắt đầu!', W / 2, H / 2 + 35);
            ctx.restore();
        }

        // Over overlay
        if (state.phase === 'over') {
            ctx.save();
            ctx.fillStyle = 'rgba(5,5,15,0.85)'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#ff007f'; ctx.font = '700 36px Outfit,Arial,sans-serif';
            ctx.textAlign = 'center'; ctx.shadowBlur = 18; ctx.shadowColor = '#ff007f';
            ctx.fillText('HẾT GIỜ!', W / 2, H / 2 - 55);
            ctx.fillStyle = '#ffe600'; ctx.font = '700 26px Outfit,Arial,sans-serif';
            ctx.shadowColor = '#ffe600'; ctx.fillText('ĐIỂM: ' + state.score, W / 2, H / 2 + 2);
            ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '400 12px Inter,Arial,sans-serif'; ctx.shadowBlur = 0;
            ctx.fillText('BEST: ' + state.best, W / 2, H / 2 + 30);
            ctx.fillStyle = 'rgba(0,240,255,0.7)'; ctx.font = '400 13px Inter,Arial,sans-serif';
            ctx.fillText('Click để chơi lại', W / 2, H / 2 + 58);
            ctx.restore();
        }
    }

    let animId;
    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }

    const oldCleanup = container._gameCleanup;
    if (oldCleanup) oldCleanup();
    container._gameCleanup = () => {
        cancelAnimationFrame(animId);
        clearInterval(state.tickInterval);
        clearTimeout(state.moleTimeout);
    };
    loop();
}
