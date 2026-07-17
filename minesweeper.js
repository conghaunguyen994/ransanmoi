// ===========================
// NEON MINESWEEPER
// ===========================
function initMinesweeper(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const W = 460, H = 500;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 35px rgba(0,240,255,0.25);';
    container.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const ROWS = 10, COLS = 10, MINES = 15;
    const CELL_SIZE = 40;
    const OFFSET_X = (W - COLS * CELL_SIZE) / 2;
    const OFFSET_Y = 80;

    let state = {};

    function initState() {
        // Build empty grid
        const grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({
            mine: false,
            revealed: false,
            flagged: false,
            neighborMines: 0
        })));

        // Place mines
        let placed = 0;
        while (placed < MINES) {
            const r = Math.floor(Math.random() * ROWS);
            const c = Math.floor(Math.random() * COLS);
            if (!grid[r][c].mine) {
                grid[r][c].mine = true;
                placed++;
            }
        }

        // Calculate neighbors
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (grid[r][c].mine) continue;
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc].mine) {
                            count++;
                        }
                    }
                }
                grid[r][c].neighborMines = count;
            }
        }

        state = {
            phase: 'playing', // playing | won | lost
            grid,
            minesLeft: MINES,
            startTime: Date.now(),
            elapsedTime: 0,
            timerInterval: null
        };

        state.timerInterval = setInterval(() => {
            if (state.phase === 'playing') {
                state.elapsedTime = Math.floor((Date.now() - state.startTime) / 1000);
            }
        }, 1000);
    }
    initState();

    // Prevent context menu (right click) on canvas
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    canvas.addEventListener('mousedown', (e) => {
        if (state.phase !== 'playing') {
            initState();
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (W / rect.width);
        const my = (e.clientY - rect.top) * (H / rect.height);

        const col = Math.floor((mx - OFFSET_X) / CELL_SIZE);
        const row = Math.floor((my - OFFSET_Y) / CELL_SIZE);

        if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
            const cell = state.grid[row][col];
            if (e.button === 0) { // Left click
                revealCell(row, col);
            } else if (e.button === 2) { // Right click
                if (!cell.revealed) {
                    cell.flagged = !cell.flagged;
                    state.minesLeft += cell.flagged ? -1 : 1;
                }
            }
            checkWin();
        }
    });

    function revealCell(r, c) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
        const cell = state.grid[r][c];
        if (cell.revealed || cell.flagged) return;

        cell.revealed = true;

        if (cell.mine) {
            state.phase = 'lost';
            clearInterval(state.timerInterval);
            revealAllMines();
            return;
        }

        if (cell.neighborMines === 0) {
            // Flood fill cascade
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    revealCell(r + dr, c + dc);
                }
            }
        }
    }

    function revealAllMines() {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (state.grid[r][c].mine) {
                    state.grid[r][c].revealed = true;
                }
            }
        }
    }

    function checkWin() {
        if (state.phase !== 'playing') return;
        let unrevealedSafeCells = 0;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = state.grid[r][c];
                if (!cell.mine && !cell.revealed) unrevealedSafeCells++;
            }
        }
        if (unrevealedSafeCells === 0) {
            state.phase = 'won';
            clearInterval(state.timerInterval);
        }
    }

    function draw() {
        ctx.fillStyle = '#060812';
        ctx.fillRect(0, 0, W, H);

        // Header Stats
        ctx.save();
        ctx.fillStyle = '#00f0ff'; ctx.font = '700 18px Outfit,Arial';
        ctx.shadowBlur = 10; ctx.shadowColor = '#00f0ff';
        ctx.fillText(`🚩 ${state.minesLeft}`, 30, 40);

        ctx.fillStyle = '#ffe600'; ctx.shadowColor = '#ffe600';
        ctx.textAlign = 'right';
        ctx.fillText(`⏱ ${state.elapsedTime}s`, W - 30, 40);
        ctx.restore();

        // Draw cells
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = state.grid[r][c];
                const x = OFFSET_X + c * CELL_SIZE;
                const y = OFFSET_Y + r * CELL_SIZE;

                ctx.save();
                if (cell.revealed) {
                    if (cell.mine) {
                        ctx.fillStyle = 'rgba(255, 0, 127, 0.25)';
                        ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
                        ctx.strokeStyle = '#ff007f'; ctx.lineWidth = 1.5;
                        ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);

                        // Draw Mine Symbol
                        ctx.font = '16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText('💣', x + CELL_SIZE/2, y + CELL_SIZE/2);
                    } else {
                        // Safe revealed cell
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                        ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'; ctx.lineWidth = 1;
                        ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);

                        if (cell.neighborMines > 0) {
                            const colors = ['#00f0ff', '#00ff88', '#ff3399', '#bf00ff', '#ffe600', '#ff6600', '#ff007f', '#ffffff'];
                            const numColor = colors[(cell.neighborMines - 1) % colors.length];
                            ctx.fillStyle = numColor; ctx.font = '700 16px Outfit,Arial';
                            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                            ctx.shadowBlur = 8; ctx.shadowColor = numColor;
                            ctx.fillText(cell.neighborMines, x + CELL_SIZE/2, y + CELL_SIZE/2);
                        }
                    }
                } else {
                    // Unrevealed cell
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                    ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
                    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)'; ctx.lineWidth = 1;
                    ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);

                    if (cell.flagged) {
                        ctx.font = '16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText('🚩', x + CELL_SIZE/2, y + CELL_SIZE/2);
                    }
                }
                ctx.restore();
            }
        }

        // Overlay Game Over
        if (state.phase !== 'playing') {
            ctx.save();
            ctx.fillStyle = 'rgba(5, 8, 20, 0.85)';
            ctx.fillRect(0, 0, W, H);

            const isWin = state.phase === 'won';
            const statusColor = isWin ? '#00ff88' : '#ff007f';
            ctx.fillStyle = statusColor; ctx.font = '700 32px Outfit,Arial';
            ctx.textAlign = 'center'; ctx.shadowBlur = 18; ctx.shadowColor = statusColor;
            ctx.fillText(isWin ? 'VICTORY! 🏆' : 'GAME OVER! 💣', W/2, H/2 - 20);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'; ctx.font = '400 13px Inter,Arial'; ctx.shadowBlur = 0;
            ctx.fillText('Nhấp chuột bất kỳ để chơi lại', W/2, H/2 + 20);
            ctx.restore();
        }
    }

    let animId;
    function loop() {
        draw();
        animId = requestAnimationFrame(loop);
    }
    const old = container._gameCleanup;
    if (old) old();
    container._gameCleanup = () => {
        cancelAnimationFrame(animId);
        clearInterval(state.timerInterval);
    };
    loop();
}
