// ===========================
// NEON HELIX JUMP
// ===========================
function initHelixJump(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const W = 460, H = 500;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 35px rgba(0,240,255,0.2);cursor:pointer;';
    container.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const PLATFORM_COUNT = 6;
    const SPACING = 120; // vertical spacing
    const ROT_SPEED = 0.04;

    let state = {};

    function initPlatforms(startIdx) {
        const list = [];
        for (let i = 0; i < PLATFORM_COUNT; i++) {
            list.push(createPlatform(startIdx + i));
        }
        return list;
    }

    function createPlatform(index) {
        // Random openings (angles in radians)
        const openings = [];
        const openingCount = 1 + (index % 2); // 1 or 2 openings
        for (let i = 0; i < openingCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            openings.push({ start: angle, size: 0.8 }); // size in radians
        }
        return {
            y: index * SPACING,
            openings,
            color: ['#00f0ff', '#ff007f', '#ffe600', '#bf00ff'][index % 4],
            index
        };
    }

    function initState() {
        state = {
            phase: 'idle', // idle | playing | over
            ball: {
                x: W/2,
                y: 180, // screen y
                vy: 0,
                radius: 8,
                worldY: 180 // tracking absolute vertical pos
            },
            platforms: initPlatforms(0),
            cameraY: 180,
            rotation: 0,
            targetRotation: 0,
            score: 0,
            best: parseInt(localStorage.getItem('neon_helix_best') || '0'),
            particles: []
        };
    }
    initState();

    // Rotate platform left/right via dragging or arrow keys
    let isDragging = false;
    let prevX = 0;

    canvas.addEventListener('mousedown', e => {
        if (state.phase === 'idle') { state.phase = 'playing'; return; }
        if (state.phase === 'over') { initState(); state.phase = 'playing'; return; }
        isDragging = true;
        prevX = e.clientX;
    });

    window.addEventListener('mousemove', e => {
        if (!isDragging || state.phase !== 'playing') return;
        const dx = e.clientX - prevX;
        state.rotation -= dx * 0.007;
        prevX = e.clientX;
    });

    window.addEventListener('mouseup', () => { isDragging = false; });

    // Touch support
    canvas.addEventListener('touchstart', e => {
        if (state.phase === 'idle') { state.phase = 'playing'; return; }
        if (state.phase === 'over') { initState(); state.phase = 'playing'; return; }
        isDragging = true;
        prevX = e.touches[0].clientX;
    });
    window.addEventListener('touchmove', e => {
        if (!isDragging || state.phase !== 'playing') return;
        const dx = e.touches[0].clientX - prevX;
        state.rotation -= dx * 0.01;
        prevX = e.touches[0].clientX;
    });
    window.addEventListener('touchend', () => { isDragging = false; });

    function update() {
        if (state.phase !== 'playing') return;

        const b = state.ball;

        // Apply gravity
        b.vy += 0.28; // gravity
        b.worldY += b.vy;

        // Check platform collisions
        state.platforms.forEach(p => {
            const dist = b.worldY - p.y;
            // Ball is falling down and hits the platform vertical level
            if (b.vy > 0 && Math.abs(dist) < 8) {
                // Check if ball is in an opening
                let inOpening = false;
                const ballAngle = (Math.atan2(0, -1) - state.rotation + Math.PI*2) % (Math.PI*2); // angle of ball relative to rotating platform

                p.openings.forEach(op => {
                    const diff = Math.abs((ballAngle - op.start + Math.PI*2) % (Math.PI*2));
                    if (diff < op.size / 2 || diff > Math.PI*2 - op.size / 2) {
                        inOpening = true;
                    }
                });

                if (inOpening) {
                    // Fall through opening
                    state.score += 10;
                } else {
                    // Bounce
                    b.worldY = p.y - 8;
                    b.vy = -6.5; // bounce velocity
                    // Spawn bounce particles
                    for (let i = 0; i < 6; i++) {
                        state.particles.push({
                            x: b.x, y: b.worldY - state.cameraY + 200,
                            vx: (Math.random()-0.5)*4,
                            vy: (Math.random()-0.5)*4,
                            life: 1, color: p.color
                        });
                    }
                }
            }
        });

        // Update platform array as camera scrolls down
        if (b.worldY - state.cameraY > 50) {
            state.cameraY += (b.worldY - state.cameraY - 50) * 0.1;
        }

        // Keep platforms populated ahead
        const lowestPlatformY = state.platforms[state.platforms.length - 1].y;
        if (lowestPlatformY - b.worldY < H * 1.5) {
            const nextIdx = state.platforms[state.platforms.length - 1].index + 1;
            state.platforms.push(createPlatform(nextIdx));
            if (state.platforms.length > 10) state.platforms.shift();
        }

        // Particle update
        state.particles.forEach(p => {
            p.x += p.vx; p.y += p.vy; p.life -= 0.05;
        });
        state.particles = state.particles.filter(p => p.life > 0);

        // Check if ball falls out of screen (fail state or off-limits)
        if (b.worldY - state.cameraY > H) {
            state.phase = 'over';
            if (state.score > state.best) {
                state.best = state.score;
                localStorage.setItem('neon_helix_best', state.best);
            }
        }
    }

    function draw() {
        ctx.fillStyle = '#060812';
        ctx.fillRect(0, 0, W, H);

        const cy = state.cameraY - 200; // scroll offset

        // Draw Central Shaft / Tower
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(W/2 - 18, 0, 36, H);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(W/2 - 18, 0); ctx.lineTo(W/2 - 18, H); ctx.moveTo(W/2 + 18, 0); ctx.lineTo(W/2 + 18, H); ctx.stroke();
        ctx.restore();

        // Draw Platforms
        state.platforms.forEach(p => {
            const screenY = p.y - cy;
            if (screenY < -40 || screenY > H + 40) return;

            // Render 3D-like rotating platform slices
            ctx.save();
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 12;
            ctx.shadowBlur = 10; ctx.shadowColor = p.color;

            // Draw solid circle slices
            const segmentCount = 36;
            const step = (Math.PI * 2) / segmentCount;

            for (let i = 0; i < segmentCount; i++) {
                const startAngle = i * step + state.rotation;
                const endAngle = startAngle + step;

                // Check if this segment overlaps with any opening
                let isOpened = false;
                const centerAngle = (startAngle + step/2 + Math.PI*2) % (Math.PI*2);

                p.openings.forEach(op => {
                    const diff = Math.abs((centerAngle - op.start + Math.PI*2) % (Math.PI*2));
                    if (diff < op.size / 2 || diff > Math.PI*2 - op.size / 2) {
                        isOpened = true;
                    }
                });

                if (!isOpened) {
                    ctx.beginPath();
                    // Perspective projection (ellipse-like drawing for depth)
                    ctx.ellipse(W/2, screenY, 80, 18, 0, startAngle, endAngle);
                    ctx.stroke();
                }
            }
            ctx.restore();
        });

        // Draw Ball
        if (state.phase !== 'over') {
            const screenBY = state.ball.worldY - cy;
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 15; ctx.shadowColor = '#ffffff';
            ctx.beginPath();
            ctx.arc(state.ball.x, screenBY, state.ball.radius, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
        }

        // Draw particles
        state.particles.forEach(p => {
            ctx.save(); ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color; ctx.shadowBlur = 5; ctx.shadowColor = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });

        // HUD Score
        ctx.save();
        ctx.fillStyle = '#00f0ff'; ctx.font = '700 18px Outfit,Arial';
        ctx.fillText('🌀 HELIX JUMP', 15, 35);
        ctx.fillStyle = '#ffe600'; ctx.font = '700 24px Outfit,Arial'; ctx.textAlign = 'right';
        ctx.fillText(state.score, W - 15, 35);
        ctx.fillStyle = 'rgba(255, 230, 0, 0.4)'; ctx.font = '600 11px Outfit,Arial';
        ctx.fillText(`BEST: ${state.best}`, W - 15, 52);
        ctx.restore();

        // Overlays
        if (state.phase === 'idle') {
            ctx.save(); ctx.fillStyle = 'rgba(5, 8, 20, 0.85)'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#00f0ff'; ctx.font = '700 28px Outfit,Arial'; ctx.textAlign = 'center'; ctx.shadowBlur = 15; ctx.shadowColor = '#00f0ff';
            ctx.fillText('HELIX JUMP', W / 2, H / 2 - 40);
            ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '400 13px Inter,Arial'; ctx.shadowBlur = 0;
            ctx.fillText('Kéo thả chuột hoặc vuốt để xoay cột tháp', W / 2, H / 2);
            ctx.fillText('Giúp bóng rơi qua các khe hở phát sáng!', W / 2, H / 2 + 20);
            ctx.fillStyle = '#ffe600'; ctx.font = '600 12px Outfit,Arial';
            ctx.fillText('Click để BẮT ĐẦU', W / 2, H / 2 + 50);
            ctx.restore();
        }
        if (state.phase === 'over') {
            ctx.save(); ctx.fillStyle = 'rgba(5, 8, 20, 0.88)'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#ff007f'; ctx.font = '700 32px Outfit,Arial'; ctx.textAlign = 'center'; ctx.shadowBlur = 18; ctx.shadowColor = '#ff007f';
            ctx.fillText('GAME OVER!', W / 2, H / 2 - 25);
            ctx.fillStyle = '#ffe600'; ctx.font = '700 22px Outfit,Arial'; ctx.shadowColor = '#ffe600';
            ctx.fillText(`ĐIỂM SỐ: ${state.score}`, W / 2, H / 2 + 15);
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
