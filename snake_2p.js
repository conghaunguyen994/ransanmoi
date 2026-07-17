// ===========================
// NEON SNAKE 2 PLAYERS
// ===========================
function initSnake2P(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const W = 500, H = 500;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 35px rgba(0,240,255,0.25);';
    container.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const COLS = 25, ROWS = 25;
    const CELL = W / COLS;

    let state = {};

    function initState() {
        state = {
            phase: 'idle', // idle | playing | over
            p1: {
                body: [{ x: 5, y: 12 }, { x: 4, y: 12 }, { x: 3, y: 12 }],
                dx: 1, dy: 0,
                nextDx: 1, nextDy: 0,
                color: '#00f0ff',
                score: 0,
                dead: false
            },
            p2: {
                body: [{ x: 19, y: 12 }, { x: 20, y: 12 }, { x: 21, y: 12 }],
                dx: -1, dy: 0,
                nextDx: -1, nextDy: 0,
                color: '#ff007f',
                score: 0,
                dead: false
            },
            food: { x: 12, y: 12 },
            winner: null
        };
        spawnFood();
    }
    initState();

    function spawnFood() {
        let attempts = 0;
        while (attempts < 100) {
            const fx = Math.floor(Math.random() * COLS);
            const fy = Math.floor(Math.random() * ROWS);
            // Check collision with both snakes
            const inP1 = state.p1.body.some(b => b.x === fx && b.y === fy);
            const inP2 = state.p2.body.some(b => b.x === fx && b.y === fy);
            if (!inP1 && !inP2) {
                state.food = { x: fx, y: fy };
                break;
            }
            attempts++;
        }
    }

    const onKey = (e) => {
        if (!document.getElementById(containerId)) return;
        if (state.phase === 'idle') { state.phase = 'playing'; return; }
        if (state.phase === 'over') { initState(); state.phase = 'playing'; return; }

        const p1 = state.p1;
        const p2 = state.p2;

        // Player 1: WASD
        if ((e.key === 'w' || e.key === 'W') && p1.dy === 0) { p1.nextDx = 0; p1.nextDy = -1; }
        else if ((e.key === 's' || e.key === 'S') && p1.dy === 0) { p1.nextDx = 0; p1.nextDy = 1; }
        else if ((e.key === 'a' || e.key === 'A') && p1.dx === 0) { p1.nextDx = -1; p1.nextDy = 0; }
        else if ((e.key === 'd' || e.key === 'D') && p1.dx === 0) { p1.nextDx = 1; p1.nextDy = 0; }

        // Player 2: Arrow keys
        if (e.key === 'ArrowUp' && p2.dy === 0) { e.preventDefault(); p2.nextDx = 0; p2.nextDy = -1; }
        else if (e.key === 'ArrowDown' && p2.dy === 0) { e.preventDefault(); p2.nextDx = 0; p2.nextDy = 1; }
        else if (e.key === 'ArrowLeft' && p2.dx === 0) { p2.nextDx = -1; p2.nextDy = 0; }
        else if (e.key === 'ArrowRight' && p2.dx === 0) { p2.nextDx = 1; p2.nextDy = 0; }
    };
    document.addEventListener('keydown', onKey);

    let gameTick = 0;
    function update() {
        if (state.phase !== 'playing') return;

        gameTick++;
        if (gameTick % 8 !== 0) return; // move every 8 frames to control speed

        const p1 = state.p1;
        const p2 = state.p2;

        p1.dx = p1.nextDx; p1.dy = p1.nextDy;
        p2.dx = p2.nextDx; p2.dy = p2.nextDy;

        // Move heads
        const h1 = { x: (p1.body[0].x + p1.dx + COLS) % COLS, y: (p1.body[0].y + p1.dy + ROWS) % ROWS };
        const h2 = { x: (p2.body[0].x + p2.dx + COLS) % COLS, y: (p2.body[0].y + p2.dy + ROWS) % ROWS };

        p1.body.unshift(h1);
        p2.body.unshift(h2);

        // Check food collision
        let p1Ate = h1.x === state.food.x && h1.y === state.food.y;
        let p2Ate = h2.x === state.food.x && h2.y === state.food.y;

        if (p1Ate) {
            p1.score += 10;
            spawnFood();
        } else {
            p1.body.pop();
        }

        if (p2Ate) {
            p2.score += 10;
            if (!p1Ate) spawnFood(); // only spawn once if both hit same food
        } else {
            p2.body.pop();
        }

        // Check self and opponent collisions
        let p1Dead = false;
        let p2Dead = false;

        // P1 collisions
        // self
        for (let i = 1; i < p1.body.length; i++) {
            if (h1.x === p1.body[i].x && h1.y === p1.body[i].y) p1Dead = true;
        }
        // with p2 body
        p2.body.forEach(b => {
            if (h1.x === b.x && h1.y === b.y) p1Dead = true;
        });

        // P2 collisions
        // self
        for (let i = 1; i < p2.body.length; i++) {
            if (h2.x === p2.body[i].x && h2.y === p2.body[i].y) p2Dead = true;
        }
        // with p1 body
        p1.body.forEach(b => {
            if (h2.x === b.x && h2.y === b.y) p2Dead = true;
        });

        // Check head-on collision
        if (h1.x === h2.x && h1.y === h2.y) {
            p1Dead = true;
            p2Dead = true;
        }

        if (p1Dead || p2Dead) {
            state.phase = 'over';
            p1.dead = p1Dead;
            p2.dead = p2Dead;
            if (p1Dead && p2Dead) state.winner = 'HOÀ';
            else if (p1Dead) state.winner = 'P2 (PINK)';
            else state.winner = 'P1 (CYAN)';
        }
    }

    function draw() {
        ctx.fillStyle = '#060812';
        ctx.fillRect(0, 0, W, H);

        // Grid lines (very faint)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.01)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= COLS; i++) {
            ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL); ctx.stroke();
        }

        // Draw food
        ctx.save();
        ctx.fillStyle = '#00ff88';
        ctx.shadowBlur = 12; ctx.shadowColor = '#00ff88';
        ctx.beginPath();
        ctx.arc(state.food.x * CELL + CELL/2, state.food.y * CELL + CELL/2, CELL/2 - 2, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();

        // Draw snakes
        const drawSnake = (p) => {
            p.body.forEach((b, idx) => {
                ctx.save();
                ctx.fillStyle = p.color;
                ctx.shadowBlur = idx === 0 ? 10 : 0;
                ctx.shadowColor = p.color;
                ctx.beginPath();
                ctx.roundRect(b.x * CELL + 1, b.y * CELL + 1, CELL - 2, CELL - 2, 4);
                ctx.fill();
                ctx.restore();
            });
        };
        drawSnake(state.p1);
        drawSnake(state.p2);

        // HUD Score
        ctx.save();
        ctx.fillStyle = state.p1.color; ctx.font = '700 18px Outfit,Arial';
        ctx.fillText(`P1: ${state.p1.score}`, 20, 30);
        ctx.fillStyle = state.p2.color; ctx.textAlign = 'right';
        ctx.fillText(`P2: ${state.p2.score}`, W - 20, 30);
        ctx.restore();

        // Overlays
        if (state.phase === 'idle') {
            ctx.save(); ctx.fillStyle = 'rgba(5,8,20,0.85)'; ctx.fillRect(0,0,W,H);
            ctx.fillStyle = '#00f0ff'; ctx.font = '700 28px Outfit,Arial'; ctx.textAlign = 'center'; ctx.shadowBlur=15; ctx.shadowColor='#00f0ff';
            ctx.fillText('🐍 NEON SNAKE 2P', W/2, H/2-50);
            ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='400 13px Inter,Arial'; ctx.shadowBlur=0;
            ctx.fillText('P1: W/A/S/D (CYAN)', W/2, H/2-10);
            ctx.fillText('P2: Phím mũi tên (PINK)', W/2, H/2+15);
            ctx.fillStyle='#ffe600'; ctx.font='600 12px Outfit,Arial';
            ctx.fillText('Ấn phím bất kỳ để BẮT ĐẦU', W/2, H/2+50);
            ctx.restore();
        }

        if (state.phase === 'over') {
            ctx.save(); ctx.fillStyle = 'rgba(5,8,20,0.88)'; ctx.fillRect(0,0,W,H);
            ctx.fillStyle = '#00ff88'; ctx.font = '700 32px Outfit,Arial'; ctx.textAlign='center'; ctx.shadowBlur=18; ctx.shadowColor='#00ff88';
            ctx.fillText(state.winner === 'HOÀ' ? 'CẢ HAI CÙNG THUA!' : `${state.winner} THẮNG! 🏆`, W/2, H/2-20);
            ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='400 13px Inter,Arial'; ctx.shadowBlur=0;
            ctx.fillText('Ấn phím bất kỳ để chơi lại', W/2, H/2+20);
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
