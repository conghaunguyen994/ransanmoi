// ===========================
// NEON AIR HOCKEY
// ===========================
function initAirHockey(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const W = 460, H = 500;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 35px rgba(255,230,0,0.25);';
    container.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Game Mode selector
    const modeBar = document.createElement('div');
    modeBar.style.cssText = 'display:flex;gap:10px;';
    ['vs AI', '2 PLAYERS'].forEach((label, i) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.style.cssText = `padding:6px 14px;border-radius:6px;font-family:'Outfit',Arial;font-weight:700;
            font-size:11px;letter-spacing:0.5px;cursor:pointer;transition:all 0.2s;
            border:1px solid ${i===0?'#00f0ff':'#ff007f'};
            background:${i===0?'rgba(0,240,255,0.1)':'rgba(255,0,127,0.1)'};
            color:${i===0?'#00f0ff':'#ff007f'};`;
        btn.addEventListener('click', () => { state.mode = i === 0 ? 'ai' : '2p'; resetGame(); });
        modeBar.appendChild(btn);
    });
    container.insertBefore(modeBar, canvas);

    const PUCK_RADIUS = 12;
    const MALLET_RADIUS = 20;
    const GOAL_WIDTH = 120;

    let state = {};

    function resetGame() {
        state = {
            mode: state.mode || 'ai',
            phase: 'idle', // idle | playing | over
            puck: { x: W/2, y: H/2, vx: 0, vy: 0 },
            m1: { x: W/2, y: H - 60, targetX: W/2, targetY: H - 60 }, // Player 1 (Bottom)
            m2: { x: W/2, y: 60 }, // Player 2 / AI (Top)
            score: [0, 0], // [P1, P2]
            keys: {},
            particles: []
        };
    }
    resetGame();

    canvas.addEventListener('mousedown', () => {
        if (state.phase === 'idle') state.phase = 'playing';
        if (state.phase === 'over') { resetGame(); state.phase = 'playing'; }
    });

    // Control Player 1 (Bottom Mallet) with Mouse
    canvas.addEventListener('mousemove', e => {
        if (state.phase !== 'playing') return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (W / rect.width);
        const my = (e.clientY - rect.top) * (H / rect.height);

        // Clamp to bottom half of the board
        state.m1.targetX = Math.max(MALLET_RADIUS, Math.min(W - MALLET_RADIUS, mx));
        state.m1.targetY = Math.max(H/2 + MALLET_RADIUS, Math.min(H - MALLET_RADIUS, my));
    });

    // Keyboard support for Player 2 (Top Mallet) if 2 Players mode
    const onKey = e => {
        if (!document.getElementById(containerId)) return;
        state.keys[e.key] = e.type === 'keydown';
        if (['w','s','a','d','ArrowUp','ArrowDown'].includes(e.key)) e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKey);

    function spawnParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            state.particles.push({
                x, y,
                vx: (Math.random()-0.5)*8,
                vy: (Math.random()-0.5)*8,
                life: 1, color
            });
        }
    }

    function update() {
        if (state.phase !== 'playing') return;

        const p = state.puck;
        const m1 = state.m1;
        const m2 = state.m2;

        // Move Player 1 Mallet smoothly toward target
        m1.x += (m1.targetX - m1.x) * 0.35;
        m1.y += (m1.targetY - m1.y) * 0.35;

        // Move Player 2 (Top Mallet)
        if (state.mode === '2p') {
            const speed = 4.5;
            if (state.keys['w'] || state.keys['W']) m2.y -= speed;
            if (state.keys['s'] || state.keys['S']) m2.y += speed;
            if (state.keys['a'] || state.keys['A']) m2.x -= speed;
            if (state.keys['d'] || state.keys['D']) m2.x += speed;

            // Clamp to top half of board
            m2.x = Math.max(MALLET_RADIUS, Math.min(W - MALLET_RADIUS, m2.x));
            m2.y = Math.max(MALLET_RADIUS, Math.min(H/2 - MALLET_RADIUS, m2.y));
        } else {
            // AI Logic: tracks puck in the top half
            const targetX = p.x;
            const targetY = p.y < H/2 ? p.y - 10 : 80;
            m2.x += (targetX - m2.x) * 0.08;
            m2.y += (targetY - m2.y) * 0.08;

            m2.x = Math.max(MALLET_RADIUS, Math.min(W - MALLET_RADIUS, m2.x));
            m2.y = Math.max(MALLET_RADIUS, Math.min(50, m2.y)); // Restrict AI depth
        }

        // Update puck position
        p.x += p.vx;
        p.y += p.vy;

        // Apply friction
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Wall collisions
        if (p.x - PUCK_RADIUS < 0) { p.x = PUCK_RADIUS; p.vx = -p.vx; spawnParticles(0, p.y, '#ffe600'); }
        if (p.x + PUCK_RADIUS > W) { p.x = W - PUCK_RADIUS; p.vx = -p.vx; spawnParticles(W, p.y, '#ffe600'); }

        // Top/Bottom walls (excluding goal area)
        const isGoalX = p.x > W/2 - GOAL_WIDTH/2 && p.x < W/2 + GOAL_WIDTH/2;
        if (!isGoalX) {
            if (p.y - PUCK_RADIUS < 0) { p.y = PUCK_RADIUS; p.vy = -p.vy; spawnParticles(p.x, 0, '#ffe600'); }
            if (p.y + PUCK_RADIUS > H) { p.y = H - PUCK_RADIUS; p.vy = -p.vy; spawnParticles(p.x, H, '#ffe600'); }
        } else {
            // Check Goals
            if (p.y - PUCK_RADIUS < -20) {
                // P1 Scores!
                state.score[0]++;
                resetPuck();
                spawnParticles(W/2, 10, '#00f0ff');
            } else if (p.y + PUCK_RADIUS > H + 20) {
                // P2 Scores!
                state.score[1]++;
                resetPuck();
                spawnParticles(W/2, H - 10, '#ff007f');
            }
        }

        // Collisions between Mallets and Puck (elastic collision simulation)
        function checkMalletCollision(m, color) {
            const dist = Math.hypot(p.x - m.x, p.y - m.y);
            const minDist = PUCK_RADIUS + MALLET_RADIUS;

            if (dist < minDist) {
                // Push puck outside mallet radius
                const angle = Math.atan2(p.y - m.y, p.x - m.x);
                p.x = m.x + Math.cos(angle) * minDist;
                p.y = m.y + Math.sin(angle) * minDist;

                // Adjust velocities
                p.vx = Math.cos(angle) * 7.5;
                p.vy = Math.sin(angle) * 7.5;

                spawnParticles(p.x, p.y, color);
            }
        }
        checkMalletCollision(m1, '#00f0ff');
        checkMalletCollision(m2, '#ff007f');

        // Particle update
        state.particles.forEach(pt => {
            pt.x += pt.vx; pt.y += pt.vy; pt.life -= 0.05;
        });
        state.particles = state.particles.filter(pt => pt.life > 0);

        // Win state check
        if (state.score[0] >= 7 || state.score[1] >= 7) {
            state.phase = 'over';
        }
    }

    function resetPuck() {
        state.puck = { x: W/2, y: H/2, vx: 0, vy: 0 };
    }

    function draw() {
        ctx.fillStyle = '#060812';
        ctx.fillRect(0, 0, W, H);

        // Draw Center line & Center circle
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
        ctx.beginPath(); ctx.arc(W/2, H/2, 60, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        // Draw Goals
        ctx.save();
        ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 3; ctx.shadowBlur = 8; ctx.shadowColor = '#00f0ff';
        ctx.beginPath(); ctx.moveTo(W/2 - GOAL_WIDTH/2, 1); ctx.lineTo(W/2 + GOAL_WIDTH/2, 1); ctx.stroke();
        ctx.strokeStyle = '#ff007f'; ctx.shadowColor = '#ff007f';
        ctx.beginPath(); ctx.moveTo(W/2 - GOAL_WIDTH/2, H-1); ctx.lineTo(W/2 + GOAL_WIDTH/2, H-1); ctx.stroke();
        ctx.restore();

        // Draw Mallet 1 (Player 1)
        ctx.save();
        ctx.fillStyle = '#00f0ff'; ctx.shadowBlur = 12; ctx.shadowColor = '#00f0ff';
        ctx.beginPath(); ctx.arc(state.m1.x, state.m1.y, MALLET_RADIUS, 0, Math.PI*2); ctx.fill();
        ctx.restore();

        // Draw Mallet 2 (Player 2 / AI)
        ctx.save();
        ctx.fillStyle = '#ff007f'; ctx.shadowBlur = 12; ctx.shadowColor = '#ff007f';
        ctx.beginPath(); ctx.arc(state.m2.x, state.m2.y, MALLET_RADIUS, 0, Math.PI*2); ctx.fill();
        ctx.restore();

        // Draw Puck (Ball)
        ctx.save();
        ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 12; ctx.shadowColor = '#ffffff';
        ctx.beginPath(); ctx.arc(state.puck.x, state.puck.y, PUCK_RADIUS, 0, Math.PI*2); ctx.fill();
        ctx.restore();

        // Particles
        state.particles.forEach(pt => {
            ctx.save(); ctx.globalAlpha = pt.life;
            ctx.fillStyle = pt.color; ctx.shadowBlur = 5; ctx.shadowColor = pt.color;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });

        // HUD Scores
        ctx.save();
        ctx.fillStyle = '#00f0ff'; ctx.font = '700 24px Outfit,Arial';
        ctx.fillText(state.score[0], 25, H/2 + 35);
        ctx.fillStyle = '#ff007f';
        ctx.fillText(state.score[1], 25, H/2 - 15);
        ctx.restore();

        // Overlays
        if (state.phase === 'idle') {
            ctx.save(); ctx.fillStyle = 'rgba(5, 8, 20, 0.85)'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#00f0ff'; ctx.font = '700 28px Outfit,Arial'; ctx.textAlign = 'center'; ctx.shadowBlur = 15; ctx.shadowColor = '#00f0ff';
            ctx.fillText('AIR HOCKEY', W / 2, H / 2 - 40);
            ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '400 13px Inter,Arial'; ctx.shadowBlur = 0;
            ctx.fillText('Di chuyển chuột để điều khiển P1 (Xanh)', W / 2, H / 2);
            ctx.fillText('P2 (2P mode): Di chuyển bằng WASD (Hồng)', W / 2, H / 2 + 20);
            ctx.fillStyle = '#ffe600'; ctx.font = '600 12px Outfit,Arial';
            ctx.fillText('Click để BẮT ĐẦU (7 điểm thắng)', W / 2, H / 2 + 50);
            ctx.restore();
        }
        if (state.phase === 'over') {
            ctx.save(); ctx.fillStyle = 'rgba(5, 8, 20, 0.88)'; ctx.fillRect(0, 0, W, H);
            const winner = state.score[0] >= 7 ? 'P1 (XANH)' : (state.mode === 'ai' ? 'AI' : 'P2 (HỒNG)');
            ctx.fillStyle = state.score[0] >= 7 ? '#00f0ff' : '#ff007f'; ctx.font = '700 32px Outfit,Arial'; ctx.textAlign = 'center'; ctx.shadowBlur = 18; ctx.shadowColor = ctx.fillStyle;
            ctx.fillText(`${winner} THẮNG! 🏆`, W / 2, H / 2 - 20);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; ctx.font = '400 13px Inter,Arial'; ctx.shadowBlur = 0;
            ctx.fillText('Click để chơi lại', W / 2, H / 2 + 20);
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
    container._gameCleanup = () => {
        cancelAnimationFrame(animId);
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('keyup', onKey);
    };
    loop();
}
