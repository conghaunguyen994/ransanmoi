// ===========================
// NEON CONNECT FOUR
// Connect four tokens in a row (horizontally, vertically, or diagonally).
// Local 2-Player or vs AI mode. Bouncy falling physics. Synth sound FX.
// ===========================
function initNeonConnectFour(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const W = 560;
    const H = 480;
    const COLS = 7;
    const ROWS = 6;
    const CELL_SIZE = 70;
    const BOARD_WIDTH = COLS * CELL_SIZE;
    const BOARD_HEIGHT = ROWS * CELL_SIZE;
    const START_X = (W - BOARD_WIDTH) / 2;
    const START_Y = (H - BOARD_HEIGHT) / 2 + 20;

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:12px;position:relative;';
    container.appendChild(wrap);

    // Canvas
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 40px rgba(176,38,255,0.25);background:#07080c;';
    wrap.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // UI Control panel above or below
    const uiDiv = document.createElement('div');
    uiDiv.style.cssText = 'display:flex;justify-content:space-between;align-items:center;width:100%;max-width:560px;color:#8f92a1;font-family:\'Outfit\',sans-serif;font-size:14px;';
    uiDiv.innerHTML = `<div>CHẾ ĐỘ: <select id="c4Mode" style="background:#11121d;color:#00f0ff;border:1px solid #222436;border-radius:4px;padding:3px 8px;font-family:'Outfit';font-size:12px;outline:none;cursor:pointer;">
                           <option value="ai">ĐẤU VỚI AI</option>
                           <option value="2p">CHƠI ĐÔI (LOCAL)</option>
                       </select></div>
                       <div id="c4Status" style="color:#ffe600;font-weight:bold;letter-spacing:1px;">LƯỢT ĐI: NGƯỜI CHƠI</div>
                       <button id="btnC4Restart" style="background:#11121d;color:#ff007f;border:1px solid #ff007f;border-radius:6px;padding:4px 12px;font-family:'Outfit';font-size:12px;cursor:pointer;transition:all 0.2s;">CHƠI LẠI</button>`;
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

    let board = []; // 2D array: board[row][col] where 0 = empty, 1 = Player 1, 2 = Player 2 (or AI)
    let state = {};

    function initBoard() {
        board = [];
        for (let r = 0; r < ROWS; r++) {
            board[r] = Array(COLS).fill(0);
        }
    }

    function checkWin(b) {
        // Horizontal
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                const val = b[r][c];
                if (val !== 0 && val === b[r][c+1] && val === b[r][c+2] && val === b[r][c+3]) {
                    return { win: true, winner: val, line: [[r, c], [r, c+1], [r, c+2], [r, c+3]] };
                }
            }
        }
        // Vertical
        for (let r = 0; r < ROWS - 3; r++) {
            for (let c = 0; c < COLS; c++) {
                const val = b[r][c];
                if (val !== 0 && val === b[r+1][c] && val === b[r+2][c] && val === b[r+3][c]) {
                    return { win: true, winner: val, line: [[r, c], [r+1, c], [r+2, c], [r+3, c]] };
                }
            }
        }
        // Positive Diagonal (up-right)
        for (let r = 3; r < ROWS; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                const val = b[r][c];
                if (val !== 0 && val === b[r-1][c+1] && val === b[r-2][c+2] && val === b[r-3][c+3]) {
                    return { win: true, winner: val, line: [[r, c], [r-1, c+1], [r-2, c+2], [r-3, c+3]] };
                }
            }
        }
        // Negative Diagonal (down-right)
        for (let r = 0; r < ROWS - 3; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                const val = b[r][c];
                if (val !== 0 && val === b[r+1][c+1] && val === b[r+2][c+2] && val === b[r+3][c+3]) {
                    return { win: true, winner: val, line: [[r, c], [r+1, c+1], [r+2, c+2], [r+3, c+3]] };
                }
            }
        }

        // Draw check
        let isDraw = true;
        for (let c = 0; c < COLS; c++) {
            if (b[0][c] === 0) { isDraw = false; break; }
        }
        if (isDraw) return { win: false, winner: 0, draw: true };

        return { win: false };
    }

    function getNextOpenRow(b, col) {
        for (let r = ROWS - 1; r >= 0; r--) {
            if (b[r][col] === 0) return r;
        }
        return -1;
    }

    // AI MINIMAX ALGORITHM WITH ALPHA-BETA PRUNING
    function evaluateWindow(window, player) {
        let score = 0;
        const opp = player === 1 ? 2 : 1;

        const countPlayer = window.filter(cell => cell === player).length;
        const countOpp = window.filter(cell => cell === opp).length;
        const countEmpty = window.filter(cell => cell === 0).length;

        if (countPlayer === 4) {
            score += 10000;
        } else if (countPlayer === 3 && countEmpty === 1) {
            score += 100;
        } else if (countPlayer === 2 && countEmpty === 2) {
            score += 10;
        }

        if (countOpp === 3 && countEmpty === 1) {
            score -= 80;
        }

        return score;
    }

    function scorePosition(b, player) {
        let score = 0;

        // Score center column (heuristic priority)
        const centerCol = Math.floor(COLS / 2);
        const centerCount = b.map(row => row[centerCol]).filter(cell => cell === player).length;
        score += centerCount * 12;

        // Horizontal
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                const window = [b[r][c], b[r][c+1], b[r][c+2], b[r][c+3]];
                score += evaluateWindow(window, player);
            }
        }

        // Vertical
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS - 3; r++) {
                const window = [b[r][c], b[r+1][c], b[r+2][c], b[r+3][c]];
                score += evaluateWindow(window, player);
            }
        }

        // Diagonal up-right
        for (let r = 3; r < ROWS; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                const window = [b[r][c], b[r-1][c+1], b[r-2][c+2], b[r-3][c+3]];
                score += evaluateWindow(window, player);
            }
        }

        // Diagonal down-right
        for (let r = 0; r < ROWS - 3; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                const window = [b[r][c], b[r+1][c+1], b[r+2][c+2], b[r+3][c+3]];
                score += evaluateWindow(window, player);
            }
        }

        return score;
    }

    function minimax(b, depth, alpha, beta, maximizingPlayer) {
        const gameRes = checkWin(b);
        if (depth === 0 || gameRes.win || gameRes.draw) {
            if (gameRes.win) {
                return gameRes.winner === 2 ? { score: 1000000 + depth } : { score: -1000000 - depth };
            }
            if (gameRes.draw) return { score: 0 };
            return { score: scorePosition(b, 2) };
        }

        const validCols = [];
        for (let c = 0; c < COLS; c++) {
            if (b[0][c] === 0) validCols.push(c);
        }

        // Shuffle valid columns slightly for dynamic play
        validCols.sort(() => Math.random() - 0.5);

        if (maximizingPlayer) {
            let value = -Infinity;
            let bestCol = validCols[0];
            for (let col of validCols) {
                const tempB = b.map(row => [...row]);
                const row = getNextOpenRow(tempB, col);
                tempB[row][col] = 2;
                
                const score = minimax(tempB, depth - 1, alpha, beta, false).score;
                if (score > value) {
                    value = score;
                    bestCol = col;
                }
                alpha = Math.max(alpha, value);
                if (alpha >= beta) break;
            }
            return { score: value, col: bestCol };
        } else {
            let value = Infinity;
            let bestCol = validCols[0];
            for (let col of validCols) {
                const tempB = b.map(row => [...row]);
                const row = getNextOpenRow(tempB, col);
                tempB[row][col] = 1;
                
                const score = minimax(tempB, depth - 1, alpha, beta, true).score;
                if (score < value) {
                    value = score;
                    bestCol = col;
                }
                beta = Math.min(beta, value);
                if (alpha >= beta) break;
            }
            return { score: value, col: bestCol };
        }
    }

    function makeAIMove() {
        state.status = 'ai_thinking';
        document.getElementById('c4Status').innerText = 'AI ĐANG SUY NGHĨ...';
        
        setTimeout(() => {
            // Minimax depth of 4 (smart and instant)
            const res = minimax(board, 4, -Infinity, Infinity, true);
            const col = res.col;
            if (col !== undefined && col !== null && board[0][col] === 0) {
                dropToken(col, 2);
            }
        }, 350);
    }

    function dropToken(col, player) {
        const row = getNextOpenRow(board, col);
        if (row === -1) return;

        // Visual animation setup
        // Starts falling from top of canvas
        const targetY = START_Y + row * CELL_SIZE + CELL_SIZE / 2;
        const targetX = START_X + col * CELL_SIZE + CELL_SIZE / 2;

        state.animations.push({
            col, row, player,
            x: targetX,
            y: START_Y - CELL_SIZE,
            targetY,
            vy: 0,
            gravity: 0.65,
            bounce: 0.42,
            bounceCount: 0,
            active: true
        });

        // Reserve cell on logical board immediately to prevent double drops
        board[row][col] = player;
        state.status = 'animating';
    }

    function handleFinishTurn() {
        const res = checkWin(board);
        if (res.win) {
            state.status = 'gameover';
            state.winLine = res.line;
            if (res.winner === 1) {
                document.getElementById('c4Status').innerText = state.mode === 'ai' ? 'BẠN ĐÃ THẮNG AI!' : 'NGƯỜI CHƠI 1 THẮNG!';
                playSynthSound(523.25, 0.15, 'sine', 0.15);
                setTimeout(() => playSynthSound(659.25, 0.15, 'sine', 0.15), 120);
                setTimeout(() => playSynthSound(783.99, 0.35, 'sine', 0.2), 240);
            } else {
                document.getElementById('c4Status').innerText = state.mode === 'ai' ? 'AI THẮNG CUỘC!' : 'NGƯỜI CHƠI 2 THẮNG!';
                playSynthSound(293.66, 0.25, 'sawtooth', 0.15);
                setTimeout(() => playSynthSound(220, 0.5, 'sawtooth', 0.15), 200);
            }
        } else if (res.draw) {
            state.status = 'gameover';
            document.getElementById('c4Status').innerText = 'HÒA CỜ!';
            playSynthSound(440, 0.3, 'triangle', 0.1);
        } else {
            // Swap turns
            state.turn = state.turn === 1 ? 2 : 1;
            state.status = 'playing';

            if (state.mode === 'ai') {
                if (state.turn === 1) {
                    document.getElementById('c4Status').innerText = 'LƯỢT ĐI: NGƯỜI CHƠI';
                } else {
                    makeAIMove();
                }
            } else {
                document.getElementById('c4Status').innerText = `LƯỢT ĐI: NGƯỜI CHƠI ${state.turn}`;
            }
        }
    }

    function startGame() {
        initBoard();
        state = {
            status: 'playing',
            turn: 1, // 1 = player, 2 = AI/P2
            hoverCol: 0,
            winLine: null,
            animations: [],
            mode: document.getElementById('c4Mode').value
        };

        if (state.mode === 'ai') {
            document.getElementById('c4Status').innerText = 'LƯỢT ĐI: NGƯỜI CHƠI';
        } else {
            document.getElementById('c4Status').innerText = 'LƯỢT ĐI: NGƯỜI CHƠI 1';
        }
    }

    // Input Handlers
    function handleMouseMove(e) {
        if (state.status !== 'playing' || state.turn !== 1 && state.mode === 'ai') return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;

        // Calculate column index from mouse position
        const col = Math.floor((mx - START_X) / CELL_SIZE);
        if (col >= 0 && col < COLS) {
            if (col !== state.hoverCol) {
                state.hoverCol = col;
                playSynthSound(800, 0.02, 'sine', 0.03); // micro click sound
            }
        }
    }

    function handleMouseClick(e) {
        if (state.status === 'gameover') {
            startGame();
            return;
        }

        if (state.status !== 'playing') return;
        if (state.turn !== 1 && state.mode === 'ai') return;

        if (state.hoverCol >= 0 && state.hoverCol < COLS) {
            if (board[0][state.hoverCol] === 0) {
                dropToken(state.hoverCol, state.turn);
            } else {
                // Column full warning tone
                playSynthSound(150, 0.1, 'sawtooth', 0.08);
            }
        }
    }

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleMouseClick);

    // Keyboard controls
    function handleKeyDown(e) {
        if (state.status !== 'playing') return;
        if (state.turn !== 1 && state.mode === 'ai') return;

        if (e.code === 'ArrowLeft') {
            state.hoverCol = Math.max(0, state.hoverCol - 1);
            playSynthSound(800, 0.02, 'sine', 0.03);
        } else if (e.code === 'ArrowRight') {
            state.hoverCol = Math.min(COLS - 1, state.hoverCol + 1);
            playSynthSound(800, 0.02, 'sine', 0.03);
        } else if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            if (board[0][state.hoverCol] === 0) {
                dropToken(state.hoverCol, state.turn);
            }
        }
    }
    window.addEventListener('keydown', handleKeyDown);

    // HTML UI element triggers
    document.getElementById('c4Mode').addEventListener('change', () => {
        startGame();
    });
    document.getElementById('btnC4Restart').addEventListener('click', () => {
        startGame();
    });

    startGame();

    // Render loop
    let animId = 0;

    function draw() {
        ctx.clearRect(0, 0, W, H);

        // 1. Draw hovering preview chip at the top
        if (state.status === 'playing' && (state.turn === 1 || state.mode !== 'ai')) {
            const hx = START_X + state.hoverCol * CELL_SIZE + CELL_SIZE / 2;
            const hy = START_Y - CELL_SIZE / 2 - 5;
            const color = state.turn === 1 ? '#ff007f' : '#00f0ff';
            
            ctx.save();
            ctx.globalAlpha = 0.45;
            drawChip(hx, hy, color);
            ctx.restore();

            // Tiny pointing arrow downwards
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(hx, hy + 18);
            ctx.lineTo(hx - 5, hy + 12);
            ctx.lineTo(hx + 5, hy + 12);
            ctx.fill();
        }

        // 2. Draw static chips already on board
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const val = board[r][c];
                if (val !== 0) {
                    // Check if there is an active falling animation for this cell
                    const isAnimating = state.animations.some(a => a.active && a.row === r && a.col === c);
                    if (!isAnimating) {
                        const cx = START_X + c * CELL_SIZE + CELL_SIZE / 2;
                        const cy = START_Y + r * CELL_SIZE + CELL_SIZE / 2;
                        const color = val === 1 ? '#ff007f' : '#00f0ff';
                        drawChip(cx, cy, color);
                    }
                }
            }
        }

        // 3. Render falling animation chips
        let allAnimationsFinished = true;
        state.animations.forEach(anim => {
            if (anim.active) {
                allAnimationsFinished = false;
                // Apply physics acceleration
                anim.vy += anim.gravity;
                anim.y += anim.vy;

                // Bounce when landing on target position
                if (anim.y >= anim.targetY) {
                    anim.y = anim.targetY;
                    anim.vy = -anim.vy * anim.bounce;
                    anim.bounceCount++;

                    // Bounce sound effect gets progressively quieter
                    playSynthSound(300 - anim.bounceCount * 30, 0.05, 'triangle', 0.1 / (anim.bounceCount + 1));

                    if (anim.bounceCount > 3 || Math.abs(anim.vy) < 0.3) {
                        anim.active = false;
                    }
                }
                const color = anim.player === 1 ? '#ff007f' : '#00f0ff';
                drawChip(anim.x, anim.y, color);
            }
        });

        // If animations completed while we were waiting, continue the game
        if (state.status === 'animating' && allAnimationsFinished) {
            state.animations = [];
            handleFinishTurn();
        }

        // 4. Render Board overlay frame (neon grid structure)
        ctx.save();
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#b026ff';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#b026ff';
        // Fill back translucent layer
        ctx.fillStyle = 'rgba(7, 8, 12, 0.65)';
        ctx.beginPath();
        ctx.rect(START_X, START_Y, BOARD_WIDTH, BOARD_HEIGHT);
        ctx.fill();
        ctx.stroke();

        // Draw horizontal grid divider lines
        ctx.shadowBlur = 6;
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(176,38,255,0.45)';
        for (let r = 1; r < ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(START_X, START_Y + r * CELL_SIZE);
            ctx.lineTo(START_X + BOARD_WIDTH, START_Y + r * CELL_SIZE);
            ctx.stroke();
        }
        // Draw vertical grid divider lines
        for (let c = 1; c < COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(START_X + c * CELL_SIZE, START_Y);
            ctx.lineTo(START_X + c * CELL_SIZE, START_Y + BOARD_HEIGHT);
            ctx.stroke();
        }
        ctx.restore();

        // 5. Draw punched circular holes inside the board
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cx = START_X + c * CELL_SIZE + CELL_SIZE / 2;
                const cy = START_Y + r * CELL_SIZE + CELL_SIZE / 2;
                
                // Clear the arc to reveal the background disc
                ctx.save();
                ctx.globalCompositeOperation = 'destination-out';
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(cx, cy, 24, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Draw neon ring highlight around hole
                ctx.save();
                ctx.strokeStyle = 'rgba(176, 38, 255, 0.25)';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(cx, cy, 25, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        // 6. Highlight winning line
        if (state.status === 'gameover' && state.winLine) {
            ctx.save();
            ctx.strokeStyle = '#39ff14';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#39ff14';
            ctx.lineWidth = 6;
            ctx.beginPath();
            state.winLine.forEach((coord, index) => {
                const r = coord[0], c = coord[1];
                const cx = START_X + c * CELL_SIZE + CELL_SIZE / 2;
                const cy = START_Y + r * CELL_SIZE + CELL_SIZE / 2;
                if (index === 0) ctx.moveTo(cx, cy);
                else ctx.lineTo(cx, cy);
            });
            ctx.stroke();

            // Draw glowing check dots inside winning chips
            state.winLine.forEach(coord => {
                const r = coord[0], c = coord[1];
                const cx = START_X + c * CELL_SIZE + CELL_SIZE / 2;
                const cy = START_Y + r * CELL_SIZE + CELL_SIZE / 2;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(cx, cy, 6, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }

        animId = requestAnimationFrame(draw);
    }

    function drawChip(x, y, color, rad = 23) {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        
        // Sphere radial gradient highlight
        const grad = ctx.createRadialGradient(x - rad/3, y - rad/3, 2, x, y, rad);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, color);
        grad.addColorStop(1, '#020202');
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    animId = requestAnimationFrame(draw);

    // Destructor
    container._gameCleanup = function() {
        cancelAnimationFrame(animId);
        window.removeEventListener('keydown', handleKeyDown);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('click', handleMouseClick);
        if (audioCtx) {
            try { audioCtx.close(); } catch (e) {}
        }
        console.log('Neon Connect Four resources cleaned up.');
    };
}
