// ===========================
// NEON ASTEROIDS
// Vector-style space shooter. Rotate and thrust the ship, shoot glowing asteroids.
// Asteroids break into smaller parts. Enemy saucers appear. Synthesized sound FX.
// ===========================
function initNeonAsteroids(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const W = 720;
    const H = 450;

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:12px;position:relative;';
    container.appendChild(wrap);

    // Canvas
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 40px rgba(255,115,0,0.25);background:#07080c;';
    wrap.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // UI Panel
    const uiDiv = document.createElement('div');
    uiDiv.style.cssText = 'display:flex;justify-content:space-between;width:100%;max-width:720px;color:#8f92a1;font-family:\'Outfit\',sans-serif;font-size:14px;';
    uiDiv.innerHTML = `<div>MẠNG: <span id="astLives" style="color:#ff007f;font-weight:bold;">3</span></div>
                       <div>ĐIỂM: <span id="astScore" style="color:#ffe600;font-weight:bold;">0</span></div>
                       <div>KỶ LỤC: <span id="astBest" style="color:#00f0ff;font-weight:bold;">0</span></div>`;
    wrap.appendChild(uiDiv);

    let audioCtx = null;
    function playSynthSound(freq, dur, type, vol) {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = type || 'sine';
            o.frequency.value = freq;
            g.gain.setValueAtTime(vol || 0.1, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
            o.connect(g);
            g.connect(audioCtx.destination);
            o.start();
            o.stop(audioCtx.currentTime + dur);
        } catch (e) {}
    }

    let state = {};
    let bestScore = parseInt(localStorage.getItem('neon_asteroids_best') || '0');
    document.getElementById('astBest').innerText = bestScore;

    // Procedural Asteroid shape helper
    function createAsteroid(x, y, radius, category) {
        const numPoints = Math.floor(Math.random() * 5) + 8; // 8 to 12 points
        const offsets = [];
        for (let i = 0; i < numPoints; i++) {
            offsets.push(0.75 + Math.random() * 0.4); // distortion offset factor
        }
        
        // Random velocity
        const angle = Math.random() * Math.PI * 2;
        const speed = (4 - category) * 22 + Math.random() * 20; // smaller = faster

        return {
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius,
            category, // 3 = Large, 2 = Medium, 1 = Small
            offsets,
            numPoints,
            angle: 0,
            rotSpeed: (Math.random() - 0.5) * 1.5,
            color: ['#00f0ff', '#39ff14', '#b026ff'][category - 1] || '#00f0ff'
        };
    }

    // Input state
    const keys = {
        ArrowUp: false, KeyW: false,
        ArrowLeft: false, KeyA: false,
        ArrowRight: false, KeyD: false,
        Space: false
    };

    function handleKeyDown(e) {
        if (e.code in keys) {
            e.preventDefault();
            keys[e.code] = true;
        }
    }

    function handleKeyUp(e) {
        if (e.code in keys) {
            e.preventDefault();
            keys[e.code] = false;
        }
        if (e.code === 'Space' && state.status === 'playing') {
            fireLaser();
        } else if (e.code === 'Space' && state.status !== 'playing') {
            startGame();
        }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    function fireLaser() {
        if (state.lasers.length >= 8) return; // Limit active lasers
        
        const ship = state.ship;
        // Tip of the ship
        const lx = ship.x + Math.cos(ship.angle) * 15;
        const ly = ship.y + Math.sin(ship.angle) * 15;
        
        state.lasers.push({
            x: lx, y: ly,
            vx: Math.cos(ship.angle) * 360,
            vy: Math.sin(ship.angle) * 360,
            life: 1.2, // seconds
            color: '#ff007f'
        });
        playSynthSound(880, 0.08, 'triangle', 0.1);
    }

    function spawnUfo() {
        const edge = Math.random() < 0.5;
        const x = edge ? 0 : W;
        const y = Math.random() * (H - 100) + 50;
        
        state.ufo = {
            x, y,
            vx: (edge ? 1 : -1) * 80,
            vy: (Math.random() - 0.5) * 50,
            width: 32,
            height: 16,
            nextShotTime: performance.now() + 1000,
            color: '#ff7300'
        };
    }

    function checkCollisions() {
        if (state.status !== 'playing') return;

        const ship = state.ship;
        const isInvincible = (performance.now() - ship.spawnTime) < 2000;

        // 1. Lasers vs Asteroids
        for (let l = state.lasers.length - 1; l >= 0; l--) {
            const laser = state.lasers[l];
            for (let a = state.asteroids.length - 1; a >= 0; a--) {
                const ast = state.asteroids[a];
                const dx = laser.x - ast.x;
                const dy = laser.y - ast.y;
                const d = dx*dx + dy*dy;
                if (d < ast.radius * ast.radius) {
                    // Hit!
                    // Explode
                    createExplosion(ast.x, ast.y, ast.color, 12);
                    playSynthSound(260 - ast.category * 40, 0.25, 'sawtooth', 0.15);
                    
                    // Split
                    if (ast.category > 1) {
                        const newCat = ast.category - 1;
                        const newRad = ast.radius / 2;
                        state.asteroids.push(createAsteroid(ast.x, ast.y, newRad, newCat));
                        state.asteroids.push(createAsteroid(ast.x, ast.y, newRad, newCat));
                    }
                    
                    state.asteroids.splice(a, 1);
                    state.lasers.splice(l, 1);

                    state.score += (4 - ast.category) * 100;
                    document.getElementById('astScore').innerText = state.score;
                    if (state.score > bestScore) {
                        bestScore = state.score;
                        localStorage.setItem('neon_asteroids_best', bestScore);
                        document.getElementById('astBest').innerText = bestScore;
                    }
                    break;
                }
            }
        }

        // 2. Lasers vs UFO
        if (state.ufo) {
            for (let l = state.lasers.length - 1; l >= 0; l--) {
                const laser = state.lasers[l];
                const dx = laser.x - state.ufo.x;
                const dy = laser.y - state.ufo.y;
                if (dx*dx + dy*dy < 24 * 24) {
                    createExplosion(state.ufo.x, state.ufo.y, state.ufo.color, 16);
                    playSynthSound(440, 0.3, 'sawtooth', 0.18);
                    state.ufo = null;
                    state.lasers.splice(l, 1);
                    state.score += 500;
                    document.getElementById('astScore').innerText = state.score;
                    break;
                }
            }
        }

        // 3. UFO Lasers vs Ship
        if (state.ufoLaser && !isInvincible) {
            const dx = state.ufoLaser.x - ship.x;
            const dy = state.ufoLaser.y - ship.y;
            if (dx*dx + dy*dy < 12 * 12) {
                hitShip();
                state.ufoLaser = null;
            }
        }

        // 4. Ship vs Asteroids
        if (!isInvincible) {
            for (let a = 0; a < state.asteroids.length; a++) {
                const ast = state.asteroids[a];
                const dx = ship.x - ast.x;
                const dy = ship.y - ast.y;
                const distSq = dx*dx + dy*dy;
                const buffer = ast.radius + 8; // Ship radius approx 8
                if (distSq < buffer * buffer) {
                    hitShip();
                    break;
                }
            }
        }

        // 5. Ship vs UFO
        if (state.ufo && !isInvincible) {
            const dx = ship.x - state.ufo.x;
            const dy = ship.y - state.ufo.y;
            if (dx*dx + dy*dy < 24 * 24) {
                hitShip();
            }
        }
    }

    function hitShip() {
        createExplosion(state.ship.x, state.ship.y, '#ff007f', 24);
        playSynthSound(100, 0.6, 'sawtooth', 0.25);
        state.lives--;
        document.getElementById('astLives').innerText = state.lives;

        if (state.lives <= 0) {
            state.status = 'gameover';
        } else {
            // Respawn
            state.ship.x = W / 2;
            state.ship.y = H / 2;
            state.ship.vx = 0;
            state.ship.vy = 0;
            state.ship.angle = -Math.PI / 2;
            state.ship.spawnTime = performance.now();
        }
    }

    function createExplosion(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 120 + 30;
            state.particles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 1.0,
                decay: Math.random() * 0.04 + 0.02,
                color
            });
        }
    }

    function spawnNextLevel() {
        state.level++;
        state.asteroids = [];
        const numAsteroids = 4 + state.level;
        for (let i = 0; i < numAsteroids; i++) {
            let ax, ay;
            // Spawn away from the center (where ship starts)
            do {
                ax = Math.random() * W;
                ay = Math.random() * H;
            } while (Math.abs(ax - W/2) < 100 && Math.abs(ay - H/2) < 100);
            
            state.asteroids.push(createAsteroid(ax, ay, 40, 3));
        }
        playSynthSound(600, 0.4, 'sine', 0.1);
    }

    function startGame() {
        state = {
            status: 'playing',
            score: 0,
            lives: 3,
            level: 0,
            ship: {
                x: W / 2,
                y: H / 2,
                vx: 0,
                vy: 0,
                angle: -Math.PI / 2,
                spawnTime: performance.now()
            },
            asteroids: [],
            lasers: [],
            particles: [],
            ufo: null,
            ufoLaser: null,
            nextUfoTime: performance.now() + 5000 + Math.random() * 5000
        };

        document.getElementById('astLives').innerText = 3;
        document.getElementById('astScore').innerText = 0;
        spawnNextLevel();
    }

    // Initialize initial scene to draw a neat screen
    startGame();
    state.status = 'menu'; // Wait for Spacebar to officially play

    let lastTime = performance.now();
    let animId = 0;

    function loop(now) {
        let dt = (now - lastTime) / 1000;
        if (dt > 0.1) dt = 0.1; // Cap time step
        lastTime = now;

        update(dt);
        draw();

        animId = requestAnimationFrame(loop);
    }

    function update(dt) {
        if (state.status !== 'playing') {
            // Update backdrop asteroids only
            state.asteroids.forEach(ast => {
                ast.x = (ast.x + ast.vx * dt + W) % W;
                ast.y = (ast.y + ast.vy * dt + H) % H;
                ast.angle += ast.rotSpeed * dt;
            });
            // Update particles
            state.particles.forEach((p, idx) => {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= p.decay;
                if (p.life <= 0) state.particles.splice(idx, 1);
            });
            return;
        }

        // --- GAME PLAYING STATE UPDATES ---

        // 1. Update Ship position
        const ship = state.ship;
        const rotSpeed = 4.2; // rad/s
        if (keys.ArrowLeft || keys.KeyA) {
            ship.angle -= rotSpeed * dt;
        }
        if (keys.ArrowRight || keys.KeyD) {
            ship.angle += rotSpeed * dt;
        }
        if (keys.ArrowUp || keys.KeyW) {
            const accel = 320; // px/s^2
            ship.vx += Math.cos(ship.angle) * accel * dt;
            ship.vy += Math.sin(ship.angle) * accel * dt;
            
            // Thrust flame particles
            if (Math.random() < 0.35) {
                const bx = ship.x - Math.cos(ship.angle) * 12;
                const by = ship.y - Math.sin(ship.angle) * 12;
                state.particles.push({
                    x: bx, y: by,
                    vx: -Math.cos(ship.angle) * 60 + (Math.random() - 0.5) * 30,
                    vy: -Math.sin(ship.angle) * 60 + (Math.random() - 0.5) * 30,
                    life: 0.4,
                    decay: 0.05,
                    color: '#ff7300'
                });
            }
        }

        // Apply friction drag
        ship.vx *= Math.pow(0.985, dt * 60);
        ship.vy *= Math.pow(0.985, dt * 60);

        // Move ship
        ship.x = (ship.x + ship.vx * dt + W) % W;
        ship.y = (ship.y + ship.vy * dt + H) % H;

        // 2. Update Asteroids
        state.asteroids.forEach(ast => {
            ast.x = (ast.x + ast.vx * dt + W) % W;
            ast.y = (ast.y + ast.vy * dt + H) % H;
            ast.angle += ast.rotSpeed * dt;
        });

        // 3. Update Lasers
        for (let i = state.lasers.length - 1; i >= 0; i--) {
            const l = state.lasers[i];
            l.x += l.vx * dt;
            l.y += l.vy * dt;
            l.life -= dt;
            // Remove dead or off-screen lasers
            if (l.life <= 0 || l.x < 0 || l.x > W || l.y < 0 || l.y > H) {
                state.lasers.splice(i, 1);
            }
        }

        // 4. Update Saucer UFO
        const nowMs = performance.now();
        if (!state.ufo && nowMs > state.nextUfoTime) {
            spawnUfo();
        }

        if (state.ufo) {
            state.ufo.x += state.ufo.vx * dt;
            state.ufo.y += state.ufo.vy * dt;

            // Simple vertical waving
            state.ufo.y += Math.sin(nowMs / 200) * 1.5;

            // Check screen boundary for removal
            if (state.ufo.x < -40 || state.ufo.x > W + 40) {
                state.ufo = null;
                state.nextUfoTime = nowMs + 10000 + Math.random() * 10000;
            } else {
                // Shoot at ship
                if (nowMs > state.ufo.nextShotTime) {
                    const u = state.ufo;
                    const angle = Math.atan2(ship.y - u.y, ship.x - u.x) + (Math.random() - 0.5) * 0.4;
                    state.ufoLaser = {
                        x: u.x, y: u.y,
                        vx: Math.cos(angle) * 220,
                        vy: Math.sin(angle) * 220,
                        color: '#ff7300'
                    };
                    u.nextShotTime = nowMs + 1500 + Math.random() * 1000;
                    playSynthSound(330, 0.1, 'sawtooth', 0.08);
                }
            }
        }

        // Update UFO Laser
        if (state.ufoLaser) {
            const ul = state.ufoLaser;
            ul.x += ul.vx * dt;
            ul.y += ul.vy * dt;
            if (ul.x < 0 || ul.x > W || ul.y < 0 || ul.y > H) {
                state.ufoLaser = null;
            }
        }

        // 5. Update Particles
        state.particles.forEach((p, idx) => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= p.decay;
            if (p.life <= 0) state.particles.splice(idx, 1);
        });

        // Check level clear
        if (state.asteroids.length === 0) {
            spawnNextLevel();
        }

        checkCollisions();
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        // Grid lines in background
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 30) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = 0; y < H; y += 30) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        // Draw Asteroids
        state.asteroids.forEach(ast => {
            ctx.save();
            ctx.translate(ast.x, ast.y);
            ctx.rotate(ast.angle);
            ctx.shadowBlur = 10;
            ctx.shadowColor = ast.color;
            ctx.strokeStyle = ast.color;
            ctx.lineWidth = 2;

            ctx.beginPath();
            for (let i = 0; i < ast.numPoints; i++) {
                const angle = (i / ast.numPoints) * Math.PI * 2;
                const r = ast.radius * ast.offsets[i];
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        });

        // Draw Lasers
        state.lasers.forEach(l => {
            ctx.save();
            ctx.shadowBlur = 8;
            ctx.shadowColor = l.color;
            ctx.strokeStyle = l.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(l.x, l.y);
            ctx.lineTo(l.x - l.vx * 0.03, l.y - l.vy * 0.03); // dynamic trail look
            ctx.stroke();
            ctx.restore();
        });

        // Draw UFO Laser
        if (state.ufoLaser) {
            const ul = state.ufoLaser;
            ctx.save();
            ctx.shadowBlur = 8;
            ctx.shadowColor = ul.color;
            ctx.strokeStyle = ul.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(ul.x, ul.y);
            ctx.lineTo(ul.x - ul.vx * 0.04, ul.y - ul.vy * 0.04);
            ctx.stroke();
            ctx.restore();
        }

        // Draw UFO
        if (state.ufo) {
            const u = state.ufo;
            ctx.save();
            ctx.shadowBlur = 12;
            ctx.shadowColor = u.color;
            ctx.strokeStyle = u.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            // Vector flying saucer drawing
            ctx.moveTo(u.x - 16, u.y);
            ctx.lineTo(u.x + 16, u.y);
            ctx.lineTo(u.x + 10, u.y + 6);
            ctx.lineTo(u.x - 10, u.y + 6);
            ctx.closePath();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(u.x - 10, u.y);
            ctx.lineTo(u.x - 6, u.y - 6);
            ctx.lineTo(u.x + 6, u.y - 6);
            ctx.lineTo(u.x + 10, u.y);
            ctx.stroke();
            ctx.restore();
        }

        // Draw Ship
        if (state.status === 'playing' || state.status === 'menu') {
            const ship = state.ship;
            const isInvincible = (performance.now() - ship.spawnTime) < 2000;
            
            // Flash if invincible
            if (!isInvincible || Math.floor(performance.now() / 150) % 2 === 0) {
                ctx.save();
                ctx.translate(ship.x, ship.y);
                ctx.rotate(ship.angle);
                
                const shipColor = isInvincible ? '#ffe600' : '#ffe600';
                ctx.shadowBlur = 12;
                ctx.shadowColor = shipColor;
                ctx.strokeStyle = shipColor;
                ctx.lineWidth = 2.5;

                ctx.beginPath();
                // Classic triangular vector ship
                ctx.moveTo(15, 0);
                ctx.lineTo(-10, -10);
                ctx.lineTo(-6, 0);
                ctx.lineTo(-10, 10);
                ctx.closePath();
                ctx.stroke();

                // Thrust flame
                if ((keys.ArrowUp || keys.KeyW) && Math.random() < 0.75) {
                    ctx.strokeStyle = '#ff7300';
                    ctx.shadowColor = '#ff7300';
                    ctx.beginPath();
                    ctx.moveTo(-7, -4);
                    ctx.lineTo(-18, 0);
                    ctx.lineTo(-7, 4);
                    ctx.stroke();
                }

                ctx.restore();
            }
        }

        // Draw Particles
        state.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 6;
            ctx.shadowColor = p.color;
            ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
            ctx.restore();
        });

        // Draw Overlays
        if (state.status === 'menu') {
            drawOverlay('NEON ASTEROIDS', '#ffe600', 'Bấm Space để xuất kích phi thuyền');
        } else if (state.status === 'gameover') {
            drawOverlay('GAME OVER', '#ff007f', 'Bấm Space để xuất kích lại');
        }
    }

    function drawOverlay(title, titleColor, desc) {
        ctx.fillStyle = 'rgba(7, 8, 12, 0.85)';
        ctx.fillRect(0, 0, W, H);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = '700 36px \'Outfit\', Arial';
        ctx.fillStyle = titleColor;
        ctx.shadowBlur = 20;
        ctx.shadowColor = titleColor;
        ctx.fillText(title, W / 2, H / 2 - 30);

        ctx.font = '500 15px \'Outfit\', Arial';
        ctx.fillStyle = '#8f92a1';
        ctx.shadowBlur = 0;
        ctx.fillText(desc, W / 2, H / 2 + 20);

        if (state.status === 'gameover') {
            ctx.font = '700 20px \'Outfit\', Arial';
            ctx.fillStyle = '#00f0ff';
            ctx.fillText(`ĐIỂM SỐ: ${state.score}`, W / 2, H / 2 + 65);
        } else {
            // Instructions
            ctx.font = '500 12px monospace';
            ctx.fillStyle = '#8f92a1';
            ctx.fillText('ĐIỀU KHIỂN: W/↑ (Tăng tốc) | A,D/←,→ (Quay phi thuyền) | SPACE (Bắn tia laser)', W / 2, H / 2 + 75);
        }
    }

    // Start loop
    animId = requestAnimationFrame(loop);

    // Destructor
    container._gameCleanup = function() {
        cancelAnimationFrame(animId);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        if (audioCtx) {
            try { audioCtx.close(); } catch (e) {}
        }
        console.log('Neon Asteroids resources cleaned up.');
    };
}
