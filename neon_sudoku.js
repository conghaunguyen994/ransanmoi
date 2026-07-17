// ===========================
// NEON SUDOKU
// ===========================
function initNeonSudoku(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const SIZE = 9;
    const CELL = 44;
    const BOARD = SIZE * CELL; // 396
    const PAD_H = 50;
    const W = BOARD;
    const H = BOARD + PAD_H + 20; // thẻ số dưới + lề

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:0;';
    container.appendChild(wrap);

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 40px rgba(176,38,255,0.35);background:#07080c;';
    wrap.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const NUM_COLORS = ['#cccccc','#39ff14','#00f0ff','#ffe600','#ff7300','#ff007f','#b026ff','#00ff88','#ff4444'];

    let state = {};
    let best = parseInt(localStorage.getItem('neon_sudoku_best_time') || '0');

    function emptyGrid() { return Array.from({length: SIZE}, () => Array(SIZE).fill(0)); }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // Sinh một bảng Sudoku hoàn chỉnh hợp lệ bằng công thức + biến đổi ngẫu nhiên
    function generateSolution() {
        const base = (r, c) => ((r % 3) * 3 + Math.floor(r / 3) + c) % 9 + 1;
        let sol = Array.from({length: SIZE}, (_, r) => Array.from({length: SIZE}, (_, c) => base(r, c)));
        // Đánh nhãn lại chữ số ngẫu nhiên
        const map = shuffle([1,2,3,4,5,6,7,8,9]);
        sol = sol.map(row => row.map(v => map[v - 1]));
        // Hoán vị các hàng trong mỗi band (chỉ số tương đối 0..2)
        for (let band = 0; band < 3; band++) {
            const order = shuffle([0,1,2]);
            const tmp = sol.slice(band*3, band*3+3);
            for (let i = 0; i < 3; i++) sol[band*3 + i] = tmp[order[i]].slice();
        }
        // Hoán vị các cột trong mỗi stack
        for (let stack = 0; stack < 3; stack++) {
            const order = shuffle([0,1,2]);
            for (let r = 0; r < SIZE; r++) {
                const tmp = [sol[r][stack*3], sol[r][stack*3+1], sol[r][stack*3+2]];
                for (let i = 0; i < 3; i++) sol[r][stack*3 + i] = tmp[order[i]];
            }
        }
        // Hoán vị cả 3 bands & 3 stacks
        const bandOrder = shuffle([0,1,2]);
        const newSol = emptyGrid();
        for (let b = 0; b < 3; b++) for (let i = 0; i < 3; i++) newSol[b*3 + i] = sol[bandOrder[b]*3 + i].slice();
        const stackOrder = shuffle([0,1,2]);
        for (let r = 0; r < SIZE; r++) {
            const row = newSol[r].slice();
            for (let s = 0; s < 3; s++) for (let i = 0; i < 3; i++) newSol[r][s*3 + i] = row[stackOrder[s]*3 + i];
        }
        return newSol;
    }

    function makePuzzle(sol, holes) {
        const puzzle = sol.map(row => row.slice());
        const cells = [];
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) cells.push([r,c]);
        shuffle(cells);
        for (let i = 0; i < holes; i++) { const [r,c] = cells[i]; puzzle[r][c] = 0; }
        return puzzle;
    }

    function newPuzzle() {
        state.solution = generateSolution();
        state.puzzle = makePuzzle(state.solution, 44);
        state.board = state.puzzle.map(row => row.slice());
        state.fixed = state.puzzle.map(row => row.map(v => v !== 0));
        state.selected = null;
        state.mistakes = 0;
        state.startTime = Date.now();
        state.phase = 'playing';
    }

    function conflicts(r, c) {
        const v = state.board[r][c];
        if (!v) return [];
        const bad = [];
        for (let i = 0; i < SIZE; i++) {
            if (i !== c && state.board[r][i] === v) bad.push([r, i]);
            if (i !== r && state.board[i][c] === v) bad.push([i, c]);
        }
        const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
            const rr = br+i, cc = bc+j;
            if (rr !== r && cc !== c && state.board[rr][cc] === v) bad.push([rr, cc]);
        }
        return bad;
    }

    function isSolved() {
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
            if (state.board[r][c] !== state.solution[r][c]) return false;
        }
        return true;
    }

    function placeNumber(n) {
        if (state.phase !== 'playing' || !state.selected) return;
        const [r, c] = state.selected;
        if (state.fixed[r][c]) return;
        if (n === 0) { state.board[r][c] = 0; return; }
        state.board[r][c] = n;
        if (n !== state.solution[r][c]) state.mistakes++;
        if (isSolved()) {
            state.phase = 'won';
            state.elapsed = Math.floor((Date.now() - state.startTime) / 1000);
            if (best === 0 || state.elapsed < best) {
                best = state.elapsed;
                localStorage.setItem('neon_sudoku_best_time', best);
            }
        }
    }

    function cellAt(mx, my) {
        if (mx < 0 || my < 0 || mx >= BOARD || my >= BOARD) return null;
        return [Math.floor(my / CELL), Math.floor(mx / CELL)];
    }

    canvas.addEventListener('click', (e) => {
        if (state.phase === 'won') { newPuzzle(); return; }
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (W / rect.width);
        const my = (e.clientY - rect.top) * (H / rect.height);
        const numPadY = BOARD + 10;
        if (my >= numPadY && my < numPadY + PAD_H) {
            // number pad: 9 ô + Clear
            const padW = W;
            const cellW = padW / 10;
            const idx = Math.floor(mx / cellW);
            if (idx >= 0 && idx < 9) placeNumber(idx + 1);
            else if (idx === 9) placeNumber(0);
            return;
        }
        const cell = cellAt(mx, my);
        if (cell) state.selected = cell;
    });

    window.addEventListener('keydown', onKey);
    function onKey(e) {
        if (document.getElementById('sudokuView') && document.getElementById('sudokuView').classList.contains('hidden')) return;
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
        if (state.phase !== 'playing') return;
        if (e.key >= '1' && e.key <= '9') placeNumber(parseInt(e.key));
        else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') placeNumber(0);
        else if (state.selected) {
            const [r,c] = state.selected;
            let nr = r, nc = c;
            if (e.key === 'ArrowUp') nr = (r + SIZE - 1) % SIZE;
            else if (e.key === 'ArrowDown') nr = (r + 1) % SIZE;
            else if (e.key === 'ArrowLeft') nc = (c + SIZE - 1) % SIZE;
            else if (e.key === 'ArrowRight') nc = (c + 1) % SIZE;
            else return;
            state.selected = [nr, nc];
            e.preventDefault();
        }
    }

    function fmtTime(s) {
        const m = Math.floor(s / 60), ss = s % 60;
        return (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
    }

    function draw() {
        ctx.fillStyle = '#07080c';
        ctx.fillRect(0, 0, W, H);

        // Highlight ô chọn + row/col/box
        if (state.selected) {
            const [sr, sc] = state.selected;
            ctx.fillStyle = 'rgba(0,240,255,0.06)';
            for (let i = 0; i < SIZE; i++) {
                ctx.fillRect(i * CELL, sr * CELL, CELL, CELL);
                ctx.fillRect(sc * CELL, i * CELL, CELL, CELL);
            }
            const br = Math.floor(sr/3)*3, bc = Math.floor(sc/3)*3;
            ctx.fillRect(bc * CELL, br * CELL, CELL*3, CELL*3);
            ctx.fillStyle = 'rgba(0,240,255,0.18)';
            ctx.fillRect(sc * CELL, sr * CELL, CELL, CELL);
        }

        // Tô conflict
        const conflictSet = new Set();
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
            if (state.board[r][c] && conflicts(r,c).length) conflictSet.add(r + ',' + c);
        }
        conflictSet.forEach(k => {
            const [r,c] = k.split(',').map(Number);
            ctx.fillStyle = 'rgba(255,0,128,0.18)';
            ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
        });

        // Ô chọn viền
        if (state.selected) {
            const [r,c] = state.selected;
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8; ctx.shadowColor = '#00f0ff';
            ctx.strokeRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
            ctx.shadowBlur = 0;
        }

        // Lưới mảnh
        ctx.strokeStyle = 'rgba(120,140,180,0.25)';
        ctx.lineWidth = 1;
        for (let i = 1; i < SIZE; i++) {
            ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, BOARD); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(BOARD, i * CELL); ctx.stroke();
        }
        // Lưới dày 3x3
        ctx.strokeStyle = 'rgba(176,38,255,0.9)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 6; ctx.shadowColor = '#b026ff';
        for (let i = 0; i <= SIZE; i += 3) {
            ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, BOARD); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(BOARD, i * CELL); ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // Số
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
            const v = state.board[r][c];
            if (!v) continue;
            const isBad = conflictSet.has(r + ',' + c);
            if (state.fixed[r][c]) {
                ctx.fillStyle = isBad ? '#ff4444' : '#e0e0e0';
                ctx.font = '700 22px Outfit,Arial,sans-serif';
            } else {
                ctx.fillStyle = isBad ? '#ff4444' : NUM_COLORS[v];
                ctx.shadowBlur = 6; ctx.shadowColor = isBad ? '#ff4444' : NUM_COLORS[v];
                ctx.font = '700 22px Outfit,Arial,sans-serif';
            }
            ctx.fillText(v, c * CELL + CELL/2, r * CELL + CELL/2 + 1);
            ctx.shadowBlur = 0;
        }

        // Number pad
        const padY = BOARD + 10;
        const cellW = W / 10;
        ctx.font = '700 20px Outfit,Arial,sans-serif';
        for (let i = 0; i < 10; i++) {
            const x = i * cellW;
            ctx.fillStyle = 'rgba(20,24,40,0.85)';
            ctx.strokeStyle = 'rgba(176,38,255,0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.roundRect(x + 2, padY, cellW - 4, PAD_H - 4, 6); ctx.fill(); ctx.stroke();
            if (i < 9) {
                ctx.fillStyle = NUM_COLORS[i+1];
                ctx.shadowBlur = 6; ctx.shadowColor = NUM_COLORS[i+1];
                ctx.fillText((i+1).toString(), x + cellW/2, padY + (PAD_H-4)/2 + 1);
            } else {
                ctx.fillStyle = '#ff4444';
                ctx.font = '700 12px Outfit,Arial,sans-serif';
                ctx.fillText('XÓA', x + cellW/2, padY + (PAD_H-4)/2 + 1);
                ctx.font = '700 20px Outfit,Arial,sans-serif';
            }
            ctx.shadowBlur = 0;
        }

        // HUD tên + timer (vẽ góc trên canvas? ko có chỗ, để ngay dưới board)
        ctx.fillStyle = 'rgba(176,38,255,0.7)';
        ctx.font = '700 13px Outfit,Arial,sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('🧩 NEON SUDOKU', 6, 14);

        // Overlays
        if (state.phase === 'won') {
            ctx.fillStyle = 'rgba(5,5,15,0.85)';
            ctx.fillRect(0, 0, W, H);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#39ff14';
            ctx.font = '700 34px Outfit,Arial,sans-serif';
            ctx.shadowBlur = 16; ctx.shadowColor = '#39ff14';
            ctx.fillText('HOÀN THÀNH!', W/2, H/2 - 30);
            ctx.fillStyle = '#ffe600';
            ctx.font = '700 22px Outfit,Arial,sans-serif';
            ctx.shadowColor = '#ffe600';
            ctx.fillText('Thời gian: ' + fmtTime(state.elapsed), W/2, H/2 + 8);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '400 13px Inter,Arial,sans-serif';
            ctx.shadowBlur = 0;
            ctx.fillText('Sai lầm: ' + state.mistakes + '  •  Best: ' + (best ? fmtTime(best) : '--'), W/2, H/2 + 38);
            ctx.fillStyle = 'rgba(0,240,255,0.8)';
            ctx.fillText('Click để chơi bảng mới', W/2, H/2 + 64);
        }
    }

    function loop() {
        draw();
        state.animId = requestAnimationFrame(loop);
    }

    const oldCleanup = container._gameCleanup;
    if (oldCleanup) oldCleanup();
    container._gameCleanup = () => {
        cancelAnimationFrame(state.animId);
        window.removeEventListener('keydown', onKey);
    };

    newPuzzle();
    loop();
}