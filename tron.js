// ===========================
// NEON TRON
// ===========================
function initTron(containerId) {
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

    const GRID_SIZE = 100;
    const CELL_SIZE = W / GRID_SIZE;

    let state = {};

    function initState() {
        state = {
            phase: 'idle',
            grid: Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0)),
            p1: { x: 20, y: GRID_SIZE / 2, dx: 1, dy: 0, nextDx: 1, nextDy: 0, color: '#00f0ff', dead: false, trail: [] },
            p2: { x: GRID_SIZE - 20, y: GRID_SIZE / 2, dx: -1, dy: 0, nextDx: -1, nextDy: 0, color: '#ff007f', dead: false, trail: [] },
            winner: null
        };
        // Mark starting positions
        state.grid[state.p1.y][state.p1.x] = 1;
        state.grid[state.p2.y][state.p2.x] = 2;
    }
    initState();

    const onKey = (e) => {
        if (!document.getElementById(containerId)) return;
        if (state.phase === 'idle') { state.phase = 'playing'; return; }
        if (state.phase === 'over') { initState(); return; }

        const p1 = state.p1;
        if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && p1.dy === 0) { e.preventDefault(); p1.nextDx = 0; p1.nextDy = -1; }
        else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && p1.dy === 0) { e.preventDefault(); p1.nextDx = 0; p1.nextDy = 1; }
        else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && p1.dx === 0) { p1.nextDx = -1; p1.nextDy = 0; }
        else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && p1.dx === 0) { p1.nextDx = 1; p1.nextDy = 0; }
    };
    document.addEventListener('keydown', onKey);

    function update() {
        if (state.phase !== 'playing') return;

        const p1 = state.p1;
        const p2 = state.p2;

        // Apply next directions
        p1.dx = p1.nextDx; p1.dy = p1.nextDy;
        p2.dx = p2.nextDx; p2.dy = p2.nextDy;

        // Store trails
        p1.trail.push({ x: p1.x, y: p1.y });
        p2.trail.push({ x: p2.x, y: p2.y });

        // Move players
        p1.x += p1.dx; p1.y += p1.dy;
        p2.x += p2.dx; p2.y += p2.dy;

        // P2 AI simple logic (avoid obstacles and target p1)
        const dirs = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 }
        ].filter(d => d.dx !== -p2.dx || d.dy !== -p2.dy); // no reversing

        // Filter valid moves
        const validDirs = dirs.filter(d => {
            const nx = p2.x + d.dx;
            const ny = p2.y + d.dy;
            return nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && state.grid[ny][nx] === 0;
        });

        if (validDirs.length > 0) {
            // Find best dir heading towards p1
            validDirs.sort((a, b) => {
                const distA = Math.hypot(p2.x + a.dx - p1.x, p2.y + a.dy - p1.y);
                const distB = Math.hypot(p2.x + b.dx - p1.x, p2.y + b.dy - p1.y);
                return distA - distB;
            });
            // 90% chance to take best move, 10% random to not be too perfect
            const chosen = (Math.random() < 0.9) ? validDirs[0] : validDirs[Math.floor(Math.random() * validDirs.length)];
            p2.nextDx = chosen.dx;
            p2.nextDy = chosen.dy;
        }

        // Check collision
        let p1Crash = p1.x < 0 || p1.x >= GRID_SIZE || p1.y < 0 || p1.y >= GRID_SIZE || (state.grid[p1.y] && state.grid[p1.y][p1.x] !== 0);
        let p2Crash = p2.x < 0 || p2.x >= GRID_SIZE || p2.y < 0 || p2.y >= GRID_SIZE || (state.grid[p2.y] && state.grid[p2.y][p2.x] !== 0);

        if (p1.x === p2.x && p1.y === p2.y) {
            p1Crash = true;
            p2Crash = true;
        }

        if (p1Crash || p2Crash) {
            p1.dead = p1Crash;
            p2.dead = p2Crash;
            state.phase = 'over';
            if (p1Crash && p2Crash) state.winner = 'HOÀ';
            else if (p1Crash) state.winner = 'AI';
            else state.winner = 'PLAYER';
            return;
        }

        // Mark grid
        state.grid[p1.y][p1.x] = 1;
        state.grid[p2.y][p2.x] = 2;
    }

    function draw() {
        ctx.fillStyle = '#060812';
        ctx.fillRect(0, 0, W, H);

        // Draw Grid Lines (Subtle)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        for (let i = 0; i < W; i += CELL_SIZE * 5) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke();
        }

        // Draw Trails
        const drawPlayerTrail = (p) => {
            ctx.save();
            ctx.strokeStyle = p.color;
            ctx.lineWidth = CELL_SIZE - 1;
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            if (p.trail.length > 0) {
                ctx.moveTo(p.trail[0].x * CELL_SIZE + CELL_SIZE/2, p.trail[0].y * CELL_SIZE + CELL_SIZE/2);
                p.trail.forEach(pt => {
                    ctx.lineTo(pt.x * CELL_SIZE + CELL_SIZE/2, pt.y * CELL_SIZE + CELL_SIZE/2);
                });
                ctx.lineTo(p.x * CELL_SIZE + CELL_SIZE/2, p.y * CELL_SIZE + CELL_SIZE/2);
            }
            ctx.stroke();
            ctx.restore();
        };
        drawPlayerTrail(state.p1);
        drawPlayerTrail(state.p2);

        // Draw Lightcycles
        const drawBike = (p) => {
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 15;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            ctx.arc(p.x * CELL_SIZE + CELL_SIZE/2, p.y * CELL_SIZE + CELL_SIZE/2, CELL_SIZE * 1.5, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
        };
        drawBike(state.p1);
        drawBike(state.p2);

        // HUD overlay
        if (state.phase === 'idle') {
            ctx.save(); ctx.fillStyle = 'rgba(5,8,20,0.85)'; ctx.fillRect(0,0,W,H);
            ctx.fillStyle = '#00f0ff'; ctx.font = '700 28px Outfit,Arial'; ctx.textAlign = 'center'; ctx.shadowBlur=15; ctx.shadowColor='#00f0ff';
            ctx.fillText('🌀 NEON TRON', W/2, H/2-40);
            ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='400 13px Inter,Arial'; ctx.shadowBlur=0;
            ctx.fillText('Điều khiển Xe đua Ánh sáng (W/A/S/D hoặc Arrows)', W/2, H/2);
            ctx.fillText('Tránh tự đâm vào tường hoặc vệt sáng đuôi!', W/2, H/2 + 20);
            ctx.fillStyle='rgba(255,0,127,0.8)'; ctx.font='600 12px Outfit,Arial';
            ctx.fillText('Nhấn phím bất kỳ để BẮT ĐẦU', W/2, H/2+50);
            ctx.restore();
        }
        if (state.phase === 'over') {
            ctx.save(); ctx.fillStyle = 'rgba(5,8,20,0.88)'; ctx.fillRect(0,0,W,H);
            ctx.fillStyle = state.winner === 'PLAYER' ? '#00f0ff' : '#ff007f'; ctx.font = '700 34px Outfit,Arial'; ctx.textAlign='center'; ctx.shadowBlur=18; ctx.shadowColor=ctx.fillStyle;
            ctx.fillText(state.winner === 'HOÀ' ? 'CẢ HAI CÙNG THUA!' : `${state.winner} CHIẾN THẮNG!`, W/2, H/2-20);
            ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='400 13px Inter,Arial'; ctx.shadowBlur=0;
            ctx.fillText('Nhấn phím bất kỳ để chơi lại', W/2, H/2+20);
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
