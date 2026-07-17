// ===========================
// NEON TOWER BLOXX
// ===========================
function initTowerBloxx(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const W = 460, H = 500;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 35px rgba(0,255,136,0.25);cursor:pointer;';
    container.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const BLOCK_W = 100;
    const BLOCK_H = 35;
    const BASE_Y = H - 60;

    let state = {};

    function initState() {
        state = {
            phase: 'idle', // idle | playing | over
            score: 0,
            best: parseInt(localStorage.getItem('neon_tower_best') || '0'),
            tower: [], // placed blocks: { x, y, w }
            crane: {
                angle: 0,
                speed: 0.05,
                length: 120,
                x: 0, y: 0
            },
            currentBlock: {
                x: 0, y: 0, w: BLOCK_W, h: BLOCK_H, active: true
            },
            viewY: 0, // camera scroll
            particles: [],
            lives: 3
        };
        // Add foundation base
        state.tower.push({ x: W / 2 - BLOCK_W / 2, y: BASE_Y, w: BLOCK_W });
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
        if (state.currentBlock.active) {
            dropBlock();
        }
    });

    function dropBlock() {
        state.currentBlock.active = false;
        // Animation to fall down
        const fall = setInterval(() => {
            if (state.phase !== 'playing') {
                clearInterval(fall);
                return;
            }
            state.currentBlock.y += 8;

            // Check collision with top of the tower
            const topBlock = state.tower[state.tower.length - 1];
            const targetY = topBlock.y - BLOCK_H;

            if (state.currentBlock.y >= targetY) {
                state.currentBlock.y = targetY;
                clearInterval(fall);

                // Check alignment
                const diff = state.currentBlock.x - topBlock.x;
                if (Math.abs(diff) >= topBlock.w) {
                    // Missed completely!
                    state.lives--;
                    spawnParticles(state.currentBlock.x + topBlock.w/2, state.currentBlock.y, '#ff007f');
                    if (state.lives <= 0) {
                        state.phase = 'over';
                        if (state.score > state.best) {
                            state.best = state.score;
                            localStorage.setItem('neon_tower_best', state.best);
                        }
                    } else {
                        resetCurrentBlock();
                    }
                } else {
                    // Success landing - chop block
                    let newW = topBlock.w - Math.abs(diff);
                    let newX = diff > 0 ? state.currentBlock.x : topBlock.x;

                    state.tower.push({
                        x: newX,
                        y: targetY,
                        w: newW
                    });

                    state.score++;

                    // Particles explosion
                    spawnParticles(newX + newW/2, targetY, '#00ff88');

                    // Scroll camera if tower gets high
                    const screenPos = targetY - state.viewY;
                    if (screenPos < H * 0.4) {
                        state.viewY -= BLOCK_H;
                    }

                    resetCurrentBlock();
                }
            }
        }, 16);
    }

    function resetCurrentBlock() {
        const topBlock = state.tower[state.tower.length - 1];
        state.currentBlock = {
            x: 0,
            y: state.viewY + 60,
            w: topBlock.w,
            h: BLOCK_H,
            active: true
        };
    }

    function spawnParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            state.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 1, color
            });
        }
    }

    function update() {
        if (state.phase !== 'playing') return;

        // Update crane swing
        state.crane.angle += state.crane.speed;
        const swingLimit = Math.PI / 4; // 45 deg limit
        if (Math.abs(state.crane.angle) > swingLimit) {
            state.crane.speed *= -1; // reverse swing direction
        }

        // Set current block position at crane tip
        if (state.currentBlock.active) {
            const cx = W / 2;
            const cy = state.viewY + 20;
            state.crane.x = cx + Math.sin(state.crane.angle) * state.crane.length;
            state.crane.y = cy + Math.cos(state.crane.angle) * state.crane.length;
            state.currentBlock.x = state.crane.x - state.currentBlock.w / 2;
            state.currentBlock.y = state.crane.y;
        }

        // Update particles
        state.particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            p.life -= 0.05;
        });
        state.particles = state.particles.filter(p => p.life > 0);
    }

    function draw() {
        ctx.fillStyle = '#060812';
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.translate(0, -state.viewY);

        // Grid background relative to camera scroll
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        for (let y = Math.floor(state.viewY / 50) * 50; y < state.viewY + H + 50; y += 50) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        // Foundation / Tower Blocks
        state.tower.forEach((b, idx) => {
            ctx.save();
            const color = idx === 0 ? '#8f92a1' : '#00ff88';
            ctx.fillStyle = color + '22';
            ctx.strokeStyle = color; ctx.lineWidth = 2;
            ctx.shadowBlur = 8; ctx.shadowColor = color;
            ctx.beginPath();
            ctx.roundRect(b.x, b.y, b.w, BLOCK_H, 4);
            ctx.fill(); ctx.stroke();
            ctx.restore();
        });

        // Current Block
        if (state.phase === 'playing') {
            ctx.save();
            ctx.fillStyle = '#00f0ff22';
            ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 2;
            ctx.shadowBlur = 10; ctx.shadowColor = '#00f0ff';
            ctx.beginPath();
            ctx.roundRect(state.currentBlock.x, state.currentBlock.y, state.currentBlock.w, state.currentBlock.h, 4);
            ctx.fill(); ctx.stroke();
            ctx.restore();

            // Crane Rope
            ctx.save();
            ctx.strokeStyle = '#ffe600'; ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(W / 2, state.viewY + 20);
            ctx.lineTo(state.crane.x, state.crane.y);
            ctx.stroke();
            ctx.restore();
        }

        // Particles
        state.particles.forEach(p => {
            ctx.save(); ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color; ctx.shadowBlur = 5; ctx.shadowColor = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });

        ctx.restore();

        // HUD (non-scrolled)
        ctx.save();
        ctx.fillStyle = '#bf00ff'; ctx.font = '700 18px Outfit,Arial';
        ctx.fillText('🧱 TOWER BLOXX', 15, 35);
        ctx.fillStyle = '#ffe600'; ctx.font = '700 24px Outfit,Arial'; ctx.textAlign = 'right';
        ctx.fillText(state.score, W - 15, 35);
        ctx.fillStyle = 'rgba(255, 230, 0, 0.4)'; ctx.font = '600 11px Outfit,Arial';
        ctx.fillText(`BEST: ${state.best}`, W - 15, 52);

        // Lives
        ctx.fillStyle = '#ff007f'; ctx.font = '16px Arial'; ctx.textAlign = 'left';
        ctx.fillText('❤'.repeat(state.lives), 15, 56);
        ctx.restore();

        // Overlays
        if (state.phase === 'idle') {
            ctx.save(); ctx.fillStyle = 'rgba(5, 8, 20, 0.85)'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#00f0ff'; ctx.font = '700 28px Outfit,Arial'; ctx.textAlign = 'center'; ctx.shadowBlur = 15; ctx.shadowColor = '#00f0ff';
            ctx.fillText('TOWER BLOXX', W / 2, H / 2 - 40);
            ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '400 13px Inter,Arial'; ctx.shadowBlur = 0;
            ctx.fillText('Click chuột để thả block đang đung đưa', W / 2, H / 2);
            ctx.fillText('Xếp chồng chuẩn để giữ tháp không bị nhỏ đi!', W / 2, H / 2 + 20);
            ctx.fillStyle = '#bf00ff'; ctx.font = '600 12px Outfit,Arial';
            ctx.fillText('Click để BẮT ĐẦU', W / 2, H / 2 + 50);
            ctx.restore();
        }
        if (state.phase === 'over') {
            ctx.save(); ctx.fillStyle = 'rgba(5, 8, 20, 0.88)'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#ff007f'; ctx.font = '700 32px Outfit,Arial'; ctx.textAlign = 'center'; ctx.shadowBlur = 18; ctx.shadowColor = '#ff007f';
            ctx.fillText('GAME OVER!', W / 2, H / 2 - 25);
            ctx.fillStyle = '#ffe600'; ctx.font = '700 22px Outfit,Arial'; ctx.shadowColor = '#ffe600';
            ctx.fillText(`TỔNG SỐ TẦNG: ${state.score}`, W / 2, H / 2 + 15);
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
