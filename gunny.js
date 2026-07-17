// ===========================
// NEON GUNNY (BẮN SÚNG TỌA ĐỘ)
// ===========================
function initGunny(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const W = 600, H = 400;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 35px rgba(57,255,20,0.25);';
    container.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Generate terrain heights
    const terrain = [];
    const terrainResolution = W;
    function generateTerrain() {
        const startHeight = H - 80;
        for (let x = 0; x < W; x++) {
            // Combine multiple sine waves for bumpy hills
            const height = startHeight 
                + Math.sin(x * 0.01) * 35 
                + Math.cos(x * 0.035) * 15
                + Math.sin(x * 0.005) * 20;
            terrain[x] = Math.min(H - 30, Math.max(H/2 + 20, height));
        }
    }
    generateTerrain();

    let state = {};

    function initState() {
        state = {
            phase: 'idle', // idle | playing | over
            turn: 'p1', // p1 | p2
            mode: 'ai', // ai | 2p
            wind: (Math.random() - 0.5) * 0.15, // wind force X
            p1: {
                x: 80,
                y: 0,
                angle: 45, // degrees
                power: 0,
                charging: false,
                hp: 100,
                color: '#00f0ff'
            },
            p2: {
                x: W - 80,
                y: 0,
                angle: 135,
                power: 0,
                charging: false,
                hp: 100,
                color: '#ff007f'
            },
            bullet: null, // { x, y, vx, vy }
            particles: [],
            winner: null
        };
        // Place tanks on terrain
        state.p1.y = terrain[Math.floor(state.p1.x)] - 8;
        state.p2.y = terrain[Math.floor(state.p2.x)] - 8;
    }
    initState();

    // Mode Selector UI overlay inside JS
    const modeBar = document.createElement('div');
    modeBar.style.cssText = 'display:flex;gap:10px;margin-bottom:5px;';
    ['ĐẤU AI', '2 NGƯỜI CHƠI'].forEach((label, idx) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.style.cssText = `padding:6px 14px;border-radius:6px;font-family:'Outfit',Arial;font-weight:700;
            font-size:11px;letter-spacing:0.5px;cursor:pointer;transition:all 0.2s;
            border:1px solid ${idx===0?'#39ff14':'#ffe600'};
            background:${idx===0?'rgba(57,255,20,0.1)':'rgba(255,230,0,0.1)'};
            color:${idx===0?'#39ff14':'#ffe600'};`;
        btn.addEventListener('click', () => {
            state.mode = idx === 0 ? 'ai' : '2p';
            resetGame();
        });
        modeBar.appendChild(btn);
    });
    container.insertBefore(modeBar, canvas);

    function resetGame() {
        generateTerrain();
        initState();
    }

    const onKey = (e) => {
        if (!document.getElementById(containerId)) return;
        if (state.phase === 'idle') { state.phase = 'playing'; return; }
        if (state.phase === 'over') { resetGame(); state.phase = 'playing'; return; }

        if (state.bullet) return; // Can't adjust during bullet fly

        const activePlayer = state.turn === 'p1' ? state.p1 : state.p2;

        // Angle controls (Left / Right / Up / Down)
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
            e.preventDefault();
            activePlayer.angle = Math.max(0, Math.min(180, activePlayer.angle + 3));
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            e.preventDefault();
            activePlayer.angle = Math.max(0, Math.min(180, activePlayer.angle - 3));
        }

        // Fire Charge (Hold Space)
        if (e.key === ' ' && !activePlayer.charging) {
            e.preventDefault();
            activePlayer.charging = true;
            activePlayer.power = 5;
        }
    };

    const onKeyUp = (e) => {
        if (e.key === ' ') {
            const activePlayer = state.turn === 'p1' ? state.p1 : state.p2;
            if (activePlayer.charging) {
                e.preventDefault();
                activePlayer.charging = false;
                fireBullet(activePlayer);
            }
        }
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKeyUp);

    function fireBullet(player) {
        const rad = (player.angle * Math.PI) / 180;
        // Bullet speed coefficient
        const speed = player.power * 0.15;
        state.bullet = {
            x: player.x,
            y: player.y - 10,
            vx: Math.cos(rad) * speed,
            vy: -Math.sin(rad) * speed,
            trail: []
        };
    }

    function aiTurn() {
        setTimeout(() => {
            if (state.phase !== 'playing' || state.turn !== 'p2') return;

            const p2 = state.p2;
            const p1 = state.p1;

            // Target calculation
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;

            // Simple projectile calculation for angle & power
            p2.angle = 120 + Math.random() * 30; // aim back left
            p2.power = 40 + Math.random() * 30;

            fireBullet(p2);
        }, 1200);
    }

    function createExplosion(x, y, radius, color) {
        // Deform terrain around explosion point
        for (let ix = Math.floor(x - radius); ix <= Math.ceil(x + radius); ix++) {
            if (ix >= 0 && ix < W) {
                const distY = Math.sqrt(radius*radius - (ix-x)*(ix-x));
                terrain[ix] = Math.min(H - 20, Math.max(terrain[ix], y + distY));
            }
        }

        // Particle particles
        for (let i = 0; i < 20; i++) {
            state.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8 - 2,
                life: 1.0,
                color
            });
        }
    }

    function update() {
        if (state.phase !== 'playing') return;

        // Charging power logic
        const activePlayer = state.turn === 'p1' ? state.p1 : state.p2;
        if (activePlayer.charging) {
            activePlayer.power += 1.5;
            if (activePlayer.power > 100) {
                activePlayer.power = 100;
                activePlayer.charging = false;
                fireBullet(activePlayer);
            }
        }

        // Bullet physics update
        if (state.bullet) {
            const b = state.bullet;
            // Add gravity and wind force
            b.vy += 0.16; // gravity
            b.vx += state.wind * 0.05; // wind resistance

            b.x += b.vx;
            b.y += b.vy;

            b.trail.push({ x: b.x, y: b.y });
            if (b.trail.length > 8) b.trail.shift();

            // Collision check
            const tx = Math.floor(b.x);
            let hitGround = false;

            if (tx >= 0 && tx < W) {
                if (b.y >= terrain[tx]) {
                    hitGround = true;
                }
            } else {
                // Out of screen walls
                if (b.y > H) {
                    state.bullet = null;
                    switchTurn();
                    return;
                }
            }

            // Hit target check
            const target = state.turn === 'p1' ? state.p2 : state.p1;
            const dist = Math.hypot(b.x - target.x, b.y - target.y);

            if (dist < 18) {
                // Direct Hit!
                target.hp = Math.max(0, target.hp - 35);
                createExplosion(b.x, b.y, 25, target.color);
                state.bullet = null;
                checkGameOver();
                if (state.phase === 'playing') switchTurn();
                return;
            }

            if (hitGround) {
                createExplosion(b.x, b.y, 18, '#39ff14');
                // Check splash damage
                [state.p1, state.p2].forEach(p => {
                    const splashDist = Math.hypot(b.x - p.x, b.y - p.y);
                    if (splashDist < 30) {
                        p.hp = Math.max(0, p.hp - Math.floor(25 * (1 - splashDist/30)));
                    }
                });
                state.bullet = null;
                checkGameOver();
                if (state.phase === 'playing') switchTurn();
            }
        }

        // Update tank heights relative to deformed terrain
        state.p1.y = terrain[Math.floor(state.p1.x)] - 8;
        state.p2.y = terrain[Math.floor(state.p2.x)] - 8;

        // Particle update
        state.particles.forEach(p => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= 0.04;
        });
        state.particles = state.particles.filter(p => p.life > 0);
    }

    function checkGameOver() {
        if (state.p1.hp <= 0 && state.p2.hp <= 0) {
            state.phase = 'over'; state.winner = 'HOÀ';
        } else if (state.p1.hp <= 0) {
            state.phase = 'over'; state.winner = state.mode === 'ai' ? 'AI' : 'P2 (HỒNG)';
        } else if (state.p2.hp <= 0) {
            state.phase = 'over'; state.winner = 'P1 (XANH)';
        }
    }

    function switchTurn() {
        state.turn = state.turn === 'p1' ? 'p2' : 'p1';
        state.wind = (Math.random() - 0.5) * 0.18; // randomize wind each turn
        if (state.mode === 'ai' && state.turn === 'p2') {
            aiTurn();
        }
    }

    function draw() {
        ctx.fillStyle = '#060812';
        ctx.fillRect(0, 0, W, H);

        // Draw Terrain (Neon polygon)
        ctx.save();
        ctx.fillStyle = '#112211';
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 10; ctx.shadowColor = '#39ff14';

        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x < W; x++) {
            ctx.lineTo(x, terrain[x]);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Draw Wind indicator
        ctx.save();
        ctx.strokeStyle = '#ffe600'; ctx.lineWidth = 2; ctx.shadowBlur = 6; ctx.shadowColor = '#ffe600';
        ctx.beginPath();
        ctx.moveTo(W/2, 25);
        ctx.lineTo(W/2 + state.wind * 400, 25);
        ctx.stroke();
        // Arrow tip
        ctx.fillStyle = '#ffe600';
        ctx.font = '10px Outfit,Arial'; ctx.textAlign = 'center';
        ctx.fillText(`GIÓ: ${state.wind > 0 ? '▶' : '◀'} ${Math.abs(Math.round(state.wind * 100))}`, W/2, 15);
        ctx.restore();

        // Draw Tanks (Mallets representation)
        const drawTank = (p, isActive) => {
            ctx.save();
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 10; ctx.shadowColor = p.color;

            // Tank Body
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, Math.PI, 0);
            ctx.fill();

            // Turret barrel
            const rad = (p.angle * Math.PI) / 180;
            ctx.strokeStyle = p.color; ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - 4);
            ctx.lineTo(p.x + Math.cos(rad) * 16, p.y - 4 - Math.sin(rad) * 16);
            ctx.stroke();

            // HP bar
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(p.x - 12, p.y - 20, 24, 4);
            ctx.fillStyle = '#39ff14';
            ctx.fillRect(p.x - 12, p.y - 20, 24 * (p.hp / 100), 4);

            // Active indicator
            if (isActive) {
                ctx.fillStyle = '#ffe600'; ctx.font = 'bold 9px Outfit,Arial'; ctx.textAlign = 'center';
                ctx.fillText('▼', p.x, p.y - 25);
            }

            ctx.restore();
        };

        drawTank(state.p1, state.turn === 'p1');
        drawTank(state.p2, state.turn === 'p2');

        // Draw Power charging bar
        const active = state.turn === 'p1' ? state.p1 : state.p2;
        if (active.charging) {
            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(W/2 - 100, H - 20, 200, 10);
            ctx.fillStyle = '#ffe600'; ctx.shadowBlur = 8; ctx.shadowColor = '#ffe600';
            ctx.fillRect(W/2 - 100, H - 20, 2 * active.power, 10);
            ctx.restore();
        }

        // Draw Bullet & Trail
        if (state.bullet) {
            const b = state.bullet;
            b.trail.forEach((t, idx) => {
                ctx.save(); ctx.globalAlpha = idx / b.trail.length;
                ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 8; ctx.shadowColor = '#ffffff';
                ctx.beginPath(); ctx.arc(t.x, t.y, 2.5, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            });

            ctx.save();
            ctx.fillStyle = '#ffff88'; ctx.shadowBlur = 12; ctx.shadowColor = '#ffff00';
            ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        // Particles
        state.particles.forEach(p => {
            ctx.save(); ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color; ctx.shadowBlur = 6; ctx.shadowColor = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        });

        // Overlay text
        if (state.phase === 'idle') {
            ctx.save(); ctx.fillStyle = 'rgba(5, 8, 20, 0.85)'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#39ff14'; ctx.font = '700 28px Outfit,Arial'; ctx.textAlign = 'center'; ctx.shadowBlur = 15; ctx.shadowColor = '#39ff14';
            ctx.fillText('💣 NEON GUNNY', W / 2, H / 2 - 40);
            ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '400 13px Inter,Arial'; ctx.shadowBlur = 0;
            ctx.fillText('Nút Up/Down (hoặc W/S) để chỉnh góc bắn', W / 2, H / 2);
            ctx.fillText('Nhấn GIỮ phím SPACE để tăng lực bắn, thả ra để bắn!', W / 2, H / 2 + 20);
            ctx.fillStyle = '#ffe600'; ctx.font = '600 12px Outfit,Arial';
            ctx.fillText('Click để BẮT ĐẦU', W / 2, H / 2 + 50);
            ctx.restore();
        }
        if (state.phase === 'over') {
            ctx.save(); ctx.fillStyle = 'rgba(5, 8, 20, 0.88)'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#ff007f'; ctx.font = '700 32px Outfit,Arial'; ctx.textAlign = 'center'; ctx.shadowBlur = 18; ctx.shadowColor = '#ff007f';
            ctx.fillText(state.winner === 'HOÀ' ? 'CẢ HAI CÙNG BỊ TIÊU DIỆT!' : `${state.winner} CHIẾN THẮNG! 🏆`, W / 2, H / 2 - 15);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; ctx.font = '400 13px Inter,Arial'; ctx.shadowBlur = 0;
            ctx.fillText('Click để chơi lại', W / 2, H / 2 + 25);
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
        document.removeEventListener('keyup', onKeyUp);
    };
    loop();
}
