// ===========================
// NEON FROGGER
// ===========================
function initFrogger(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const COLS = 13, ROWS = 14;
    const CELL = 38;
    const W = COLS * CELL, H = ROWS * CELL;

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 35px rgba(0,255,136,0.25);';
    container.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Row definitions: type, speed, direction, obstacles count, color
    const ROW_DEFS = [
        { type: 'safe',  color: '#0a1020' }, // row 13: start
        { type: 'road',  speed: 2.2, dir: 1,  count: 3, color: '#001a00', objColor: '#ff4400', w: 2 }, // cars
        { type: 'road',  speed: 1.6, dir: -1, count: 4, color: '#001500', objColor: '#ff6600', w: 1 },
        { type: 'road',  speed: 2.8, dir: 1,  count: 2, color: '#001a00', objColor: '#ff2200', w: 3 },
        { type: 'road',  speed: 1.4, dir: -1, count: 4, color: '#001500', objColor: '#ff8800', w: 1 },
        { type: 'road',  speed: 3.2, dir: 1,  count: 2, color: '#001a00', objColor: '#ff0000', w: 2 },
        { type: 'safe',  color: '#0a1520' }, // middle safe strip
        { type: 'river', speed: 1.8, dir: -1, count: 3, color: '#000820', objColor: '#00cc88', w: 2 }, // logs
        { type: 'river', speed: 2.4, dir: 1,  count: 4, color: '#000e28', objColor: '#00aa66', w: 1 },
        { type: 'river', speed: 1.2, dir: -1, count: 2, color: '#000820', objColor: '#00ff88', w: 3 },
        { type: 'river', speed: 2.0, dir: 1,  count: 3, color: '#000e28', objColor: '#00cc66', w: 2 },
        { type: 'river', speed: 2.8, dir: -1, count: 2, color: '#000820', objColor: '#00ee77', w: 1 },
        { type: 'river', speed: 1.6, dir: 1,  count: 3, color: '#000e28', objColor: '#00bb55', w: 2 },
        { type: 'goal',  color: '#000520' }, // row 0: goal
    ].reverse(); // reverse so index 0 = top (goal)

    let state = {};
    function initState() {
        // Build obstacles per row
        const obstacles = [];
        for (let row = 0; row < ROWS; row++) {
            const def = ROW_DEFS[row];
            const rowObjs = [];
            if (def.type === 'road' || def.type === 'river') {
                const spacing = W / def.count;
                for (let i = 0; i < def.count; i++) {
                    rowObjs.push({
                        x: (i * spacing) + Math.random() * (spacing * 0.4),
                        w: def.w * CELL + CELL * 0.8,
                        speed: def.speed,
                        dir: def.dir
                    });
                }
            }
            obstacles.push(rowObjs);
        }
        state = {
            phase: 'idle',
            frog: { row: ROWS - 1, col: Math.floor(COLS / 2), onLog: null, dead: false },
            obstacles,
            score: 0,
            lives: 3,
            best: parseInt(localStorage.getItem('neon_frogger_best') || '0'),
            goals: Array(5).fill(false), // 5 goal spots
            deathAnim: null,
            flashTimer: 0
        };
    }
    initState();

    const onKey = (e) => {
        if (!document.getElementById(containerId)) return;
        if (state.phase === 'idle') { state.phase = 'playing'; return; }
        if (state.phase === 'over') { initState(); return; }
        if (state.frog.dead) return;

        const f = state.frog;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); f.row = Math.max(0, f.row - 1); f.onLog = null; }
        else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); f.row = Math.min(ROWS - 1, f.row + 1); f.onLog = null; }
        else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { f.col = Math.max(0, f.col - 1); f.onLog = null; }
        else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { f.col = Math.min(COLS - 1, f.col + 1); f.onLog = null; }
    };
    document.addEventListener('keydown', onKey);

    function die() {
        if (state.frog.dead) return;
        state.frog.dead = true;
        state.deathAnim = { x: state.frog.col * CELL + CELL/2, y: state.frog.row * CELL + CELL/2, t: 0 };
        setTimeout(() => {
            state.lives--;
            if (state.lives <= 0) { state.phase = 'over'; if (state.score > state.best) { state.best = state.score; localStorage.setItem('neon_frogger_best', state.best); } return; }
            state.frog = { row: ROWS - 1, col: Math.floor(COLS / 2), onLog: null, dead: false };
            state.deathAnim = null;
        }, 800);
    }

    function update() {
        if (state.phase !== 'playing' || state.frog.dead) return;
        const f = state.frog;
        const def = ROW_DEFS[f.row];

        // Move obstacles
        for (let row = 0; row < ROWS; row++) {
            const d = ROW_DEFS[row];
            if (d.type !== 'road' && d.type !== 'river') continue;
            state.obstacles[row].forEach(obj => {
                obj.x += obj.speed * obj.dir;
                if (obj.dir > 0 && obj.x > W + obj.w) obj.x = -obj.w;
                if (obj.dir < 0 && obj.x + obj.w < 0) obj.x = W;
            });
        }

        const fx = f.col * CELL + CELL / 2;
        const fy = f.row * CELL + CELL / 2;

        if (def.type === 'road') {
            // Check hit by car
            for (const car of state.obstacles[f.row]) {
                if (fx > car.x + 2 && fx < car.x + car.w - 2) { die(); return; }
            }
        } else if (def.type === 'river') {
            // Must be on a log
            let onAnyLog = false;
            for (const log of state.obstacles[f.row]) {
                if (fx > log.x + 4 && fx < log.x + log.w - 4) {
                    // Ride log
                    f.col += log.speed * log.dir / CELL;
                    f.col = Math.max(0, Math.min(COLS - 1, f.col));
                    onAnyLog = true;
                    break;
                }
            }
            if (!onAnyLog) { die(); return; }
        } else if (def.type === 'goal') {
            // Reached goal row
            const goalSlot = Math.round(f.col / (COLS / 5));
            if (goalSlot >= 0 && goalSlot < 5 && !state.goals[goalSlot]) {
                state.goals[goalSlot] = true;
                state.score += 100;
                f.row = ROWS - 1; f.col = Math.floor(COLS / 2);
                state.flashTimer = 30;
                if (state.goals.every(g => g)) {
                    // All goals filled!
                    state.score += 500;
                    state.goals = Array(5).fill(false);
                }
            } else {
                die();
            }
        }

        if (f.col < 0 || f.col >= COLS) die();
    }

    function draw() {
        ctx.fillStyle = '#050810';
        ctx.fillRect(0, 0, W, H);

        // Draw rows
        for (let row = 0; row < ROWS; row++) {
            const def = ROW_DEFS[row];
            const y = row * CELL;
            ctx.fillStyle = def.color;
            ctx.fillRect(0, y, W, CELL);

            // Lane lines for roads
            if (def.type === 'road') {
                ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
                ctx.setLineDash([8, 8]);
                ctx.beginPath(); ctx.moveTo(0, y + CELL/2); ctx.lineTo(W, y + CELL/2); ctx.stroke();
                ctx.restore();
            }
            // Water wave for river
            if (def.type === 'river') {
                ctx.save(); ctx.strokeStyle = 'rgba(0,100,255,0.12)'; ctx.lineWidth = 1;
                for (let xi = 0; xi < W; xi += 20) {
                    ctx.beginPath();
                    ctx.moveTo(xi, y + CELL*0.3);
                    ctx.quadraticCurveTo(xi+5, y+CELL*0.2, xi+10, y+CELL*0.3);
                    ctx.quadraticCurveTo(xi+15, y+CELL*0.4, xi+20, y+CELL*0.3);
                    ctx.stroke();
                }
                ctx.restore();
            }

            // Draw obstacles
            state.obstacles[row].forEach(obj => {
                if (def.type === 'road') {
                    // Car
                    ctx.save();
                    ctx.fillStyle = def.objColor;
                    ctx.shadowBlur = 10; ctx.shadowColor = def.objColor;
                    ctx.beginPath(); ctx.roundRect(obj.x, y+4, obj.w, CELL-8, 5); ctx.fill();
                    // Headlights
                    ctx.fillStyle = '#ffff88';
                    ctx.shadowBlur = 8; ctx.shadowColor = '#ffff00';
                    const hx = obj.dir > 0 ? obj.x + obj.w - 6 : obj.x + 2;
                    ctx.fillRect(hx, y+7, 4, 5);
                    ctx.fillRect(hx, y+CELL-12, 4, 5);
                    ctx.restore();
                } else if (def.type === 'river') {
                    // Log
                    ctx.save();
                    ctx.fillStyle = '#4a2a10';
                    ctx.shadowBlur = 8; ctx.shadowColor = def.objColor;
                    ctx.strokeStyle = def.objColor; ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.roundRect(obj.x, y+5, obj.w, CELL-10, 6); ctx.fill(); ctx.stroke();
                    // Wood grain
                    ctx.strokeStyle = 'rgba(255,180,100,0.2)'; ctx.lineWidth = 1; ctx.setLineDash([4,6]);
                    for (let lx = obj.x+12; lx < obj.x+obj.w-6; lx+=14) {
                        ctx.beginPath(); ctx.moveTo(lx, y+6); ctx.lineTo(lx, y+CELL-6); ctx.stroke();
                    }
                    ctx.restore();
                }
            });
        }

        // Goal slots
        const goalY = 0;
        const slotW = W / 5;
        for (let i = 0; i < 5; i++) {
            const sx = i * slotW + slotW/2 - CELL*0.4;
            ctx.save();
            if (state.goals[i]) {
                ctx.fillStyle = 'rgba(0,255,136,0.25)'; ctx.shadowBlur = 12; ctx.shadowColor = '#00ff88';
                ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2;
            } else {
                ctx.fillStyle = 'rgba(0,240,255,0.07)'; ctx.strokeStyle = 'rgba(0,240,255,0.3)'; ctx.lineWidth = 1;
            }
            ctx.beginPath(); ctx.roundRect(sx, goalY+3, CELL*0.8, CELL-6, 5); ctx.fill(); ctx.stroke();
            if (state.goals[i]) {
                ctx.font = '18px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#00ff88'; ctx.shadowBlur = 0;
                ctx.fillText('🐸', sx + CELL*0.4, goalY + CELL*0.65);
            }
            ctx.restore();
        }

        // Flash on goal
        if (state.flashTimer > 0) {
            state.flashTimer--;
            ctx.save(); ctx.globalAlpha = state.flashTimer / 30 * 0.4;
            ctx.fillStyle = '#00ff88'; ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }

        // Death explosion
        if (state.deathAnim) {
            state.deathAnim.t++;
            const t = state.deathAnim.t;
            ctx.save();
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const r = t * 2;
                ctx.globalAlpha = Math.max(0, 1 - t/30);
                ctx.fillStyle = '#ff4400';
                ctx.shadowBlur = 10; ctx.shadowColor = '#ff4400';
                ctx.beginPath();
                ctx.arc(state.deathAnim.x + Math.cos(angle)*r, state.deathAnim.y + Math.sin(angle)*r, 5, 0, Math.PI*2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Draw Frog
        if (!state.frog.dead) {
            const fx = state.frog.col * CELL, fy = state.frog.row * CELL;
            ctx.save();
            ctx.shadowBlur = 12; ctx.shadowColor = '#00ff88';
            // Body
            ctx.fillStyle = '#00cc44';
            ctx.beginPath(); ctx.ellipse(fx+CELL/2, fy+CELL/2, CELL*0.38, CELL*0.32, 0, 0, Math.PI*2); ctx.fill();
            // Eyes
            ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.arc(fx+CELL*0.3, fy+CELL*0.32, 5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(fx+CELL*0.7, fy+CELL*0.32, 5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(fx+CELL*0.3, fy+CELL*0.32, 2.5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(fx+CELL*0.7, fy+CELL*0.32, 2.5, 0, Math.PI*2); ctx.fill();
            // Legs
            ctx.strokeStyle = '#00aa33'; ctx.lineWidth = 3; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(fx+CELL*0.2, fy+CELL*0.55); ctx.lineTo(fx+CELL*0.05, fy+CELL*0.75); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(fx+CELL*0.8, fy+CELL*0.55); ctx.lineTo(fx+CELL*0.95, fy+CELL*0.75); ctx.stroke();
            ctx.restore();
        }

        // HUD
        ctx.save();
        ctx.fillStyle = '#00ff88'; ctx.font = '700 16px Outfit,Arial';
        ctx.textAlign = 'left'; ctx.shadowBlur = 8; ctx.shadowColor = '#00ff88';
        ctx.fillText('ĐIỂM: ' + state.score, 8, H - 8);
        ctx.fillStyle = '#ff007f'; ctx.textAlign = 'right'; ctx.shadowColor = '#ff007f';
        ctx.fillText('❤'.repeat(state.lives), W - 8, H - 8);
        ctx.fillStyle = 'rgba(255,230,0,0.5)'; ctx.font = '600 11px Outfit,Arial'; ctx.textAlign = 'center'; ctx.shadowBlur = 0;
        ctx.fillText('BEST: ' + state.best, W/2, H - 8);
        ctx.restore();

        // Overlay
        if (state.phase === 'idle') {
            ctx.save(); ctx.fillStyle = 'rgba(5,8,20,0.82)'; ctx.fillRect(0,0,W,H);
            ctx.fillStyle = '#00ff88'; ctx.font = '700 26px Outfit,Arial'; ctx.textAlign = 'center'; ctx.shadowBlur=15; ctx.shadowColor='#00ff88';
            ctx.fillText('🐸 NEON FROGGER', W/2, H/2-40);
            ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='400 13px Inter,Arial'; ctx.shadowBlur=0;
            ctx.fillText('Dùng mũi tên/WASD để di chuyển', W/2, H/2+5);
            ctx.fillStyle='rgba(0,240,255,0.7)'; ctx.font='600 12px Outfit,Arial';
            ctx.fillText('Nhấn phím bất kỳ để bắt đầu', W/2, H/2+32);
            ctx.restore();
        }
        if (state.phase === 'over') {
            ctx.save(); ctx.fillStyle = 'rgba(5,8,20,0.85)'; ctx.fillRect(0,0,W,H);
            ctx.fillStyle = '#ff007f'; ctx.font = '700 34px Outfit,Arial'; ctx.textAlign='center'; ctx.shadowBlur=18; ctx.shadowColor='#ff007f';
            ctx.fillText('GAME OVER!', W/2, H/2-45);
            ctx.fillStyle='#ffe600'; ctx.font='700 22px Outfit,Arial'; ctx.shadowColor='#ffe600';
            ctx.fillText('ĐIỂM: '+state.score, W/2, H/2+5);
            ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.font='400 13px Inter,Arial'; ctx.shadowBlur=0;
            ctx.fillText('Nhấn phím bất kỳ để chơi lại', W/2, H/2+38);
            ctx.restore();
        }
    }

    let animId;
    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }
    const old = container._gameCleanup;
    if (old) old();
    container._gameCleanup = () => { cancelAnimationFrame(animId); document.removeEventListener('keydown', onKey); };
    loop();
}
