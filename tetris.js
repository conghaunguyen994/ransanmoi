/**
 * tetris.js - Neon Tetris (Xếp Hình Cổ Điển Cyberpunk)
 */

(function () {
    // --- DOM Elements ---
    const tetrisLobby = document.getElementById('tetrisLobby');
    const tetrisGameArea = document.getElementById('tetrisGameArea');
    const btnStartTetris = document.getElementById('btnStartTetris');
    const btnQuitTetris = document.getElementById('btnQuitTetris');
    
    const labelScore = document.getElementById('tetrisScore');
    const labelLevel = document.getElementById('tetrisLevel');
    const labelLines = document.getElementById('tetrisLines');
    
    const tetrisCanvas = document.getElementById('tetrisCanvas');
    const ctx = tetrisCanvas.getContext('2d');
    
    const tetrisNextCanvas = document.getElementById('tetrisNextCanvas');
    const nextCtx = tetrisNextCanvas.getContext('2d');

    // --- GAME CONFIGS ---
    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 24; // Kích thước mỗi ô (24px * 10 = 240px rộng, 24px * 20 = 480px cao)

    // Màu sắc khối cờ dạng phát sáng Neon
    const COLORS = [
        null,
        '#00f0ff', // I (Cyan)
        '#ffd700', // O (Gold Yellow)
        '#b026ff', // T (Purple)
        '#39ff14', // S (Green)
        '#ff3b30', // Z (Red)
        '#0055ff', // J (Blue)
        '#ff7300'  // L (Orange)
    ];

    // Định nghĩa 7 khối Tetromino chuẩn
    const SHAPES = [
        [],
        [[1, 1, 1, 1]], // I
        [[2, 2], [2, 2]], // O
        [[0, 3, 0], [3, 3, 3]], // T
        [[0, 4, 4], [4, 4, 0]], // S
        [[5, 5, 0], [0, 5, 5]], // Z
        [[6, 0, 0], [6, 6, 6]], // J
        [[0, 0, 7], [7, 7, 7]]  // L
    ];

    const state = {
        grid: Array(ROWS).fill().map(() => Array(COLS).fill(0)),
        score: 0,
        level: 1,
        lines: 0,
        currentPiece: null, // { shape: [[]], x, y, colorId }
        nextPiece: null,
        gameOver: false,
        dropCounter: 0,
        dropInterval: 1000, // ms mỗi nhịp rơi (giảm dần khi tăng level)
        lastTime: 0,
        animationId: null
    };

    // --- GAME ENGINE ---

    function createPiece(type) {
        return {
            shape: SHAPES[type],
            colorId: type,
            x: Math.floor((COLS - SHAPES[type][0].length) / 2),
            y: 0
        };
    }

    function resetGame() {
        state.grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));
        state.score = 0;
        state.level = 1;
        state.lines = 0;
        state.gameOver = false;
        state.dropInterval = 1000;
        state.dropCounter = 0;

        labelScore.innerText = '0';
        labelLevel.innerText = '1';
        labelLines.innerText = '0';

        // Tạo 2 khối ngẫu nhiên ban đầu
        state.nextPiece = createPiece(Math.floor(Math.random() * 7) + 1);
        spawnPiece();
    }

    function spawnPiece() {
        state.currentPiece = state.nextPiece;
        state.nextPiece = createPiece(Math.floor(Math.random() * 7) + 1);

        // Kiểm tra ngay khi spawn xem có bị đè cờ không -> Game Over
        if (checkCollision(state.currentPiece)) {
            state.gameOver = true;
            cancelAnimationFrame(state.animationId);
            alert('GAME OVER! Điểm của bạn: ' + state.score);
            tetrisLobby.classList.remove('hidden');
            tetrisGameArea.classList.add('hidden');
        }

        drawNextPiece();
    }

    // Kiểm tra va chạm với biên hoặc các khối đã khóa dưới đáy
    function checkCollision(piece, offsetX = 0, offsetY = 0, customShape = piece.shape) {
        for (let r = 0; r < customShape.length; r++) {
            for (let c = 0; c < customShape[r].length; c++) {
                if (customShape[r][c] !== 0) {
                    const targetX = piece.x + c + offsetX;
                    const targetY = piece.y + r + offsetY;

                    // Kiểm tra biên
                    if (targetX < 0 || targetX >= COLS || targetY >= ROWS) {
                        return true;
                    }

                    // Kiểm tra đè khối cũ dưới lưới (chỉ tính khi targetY hợp lệ >= 0)
                    if (targetY >= 0 && state.grid[targetY][targetX] !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Khóa khối cờ vào lưới và kiểm tra xóa hàng
    function mergePiece() {
        const p = state.currentPiece;
        for (let r = 0; r < p.shape.length; r++) {
            for (let c = 0; c < p.shape[r].length; c++) {
                if (p.shape[r][c] !== 0) {
                    if (p.y + r >= 0) {
                        state.grid[p.y + r][p.x + c] = p.colorId;
                    }
                }
            }
        }
    }

    // Xóa các hàng đã xếp đầy cờ
    function clearLines() {
        let linesCleared = 0;
        
        outer: for (let r = ROWS - 1; r >= 0; r--) {
            for (let c = 0; c < COLS; c++) {
                if (state.grid[r][c] === 0) {
                    continue outer;
                }
            }

            // Hàng đầy: xóa và đưa các hàng phía trên xuống
            state.grid.splice(r, 1);
            state.grid.unshift(Array(COLS).fill(0));
            linesCleared++;
            r++; // Kiểm tra lại hàng này sau khi dồn xuống
        }

        if (linesCleared > 0) {
            state.lines += linesCleared;
            // Tính điểm kiểu Tetris chuẩn
            const linePoints = [0, 100, 300, 500, 800];
            state.score += (linePoints[linesCleared] || 800) * state.level;

            // Tăng level mỗi khi xóa 10 hàng
            state.level = Math.floor(state.lines / 10) + 1;
            state.dropInterval = Math.max(100, 1000 - (state.level - 1) * 120);

            labelScore.innerText = state.score;
            labelLevel.innerText = state.level;
            labelLines.innerText = state.lines;
        }
    }

    // Rơi khối cờ xuống 1 đơn vị
    function dropPiece() {
        state.currentPiece.y++;
        if (checkCollision(state.currentPiece)) {
            state.currentPiece.y--;
            mergePiece();
            clearLines();
            spawnPiece();
        }
        state.dropCounter = 0;
    }

    // Di chuyển ngang
    function movePiece(dir) {
        state.currentPiece.x += dir;
        if (checkCollision(state.currentPiece)) {
            state.currentPiece.x -= dir;
        }
    }

    // Xoay khối hình
    function rotatePiece() {
        const shape = state.currentPiece.shape;
        const n = shape.length;
        const m = shape[0].length;
        
        // Tạo ma trận xoay 90 độ
        const rotated = Array(m).fill().map(() => Array(n).fill(0));
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < m; c++) {
                rotated[c][n - 1 - r] = shape[r][c];
            }
        }

        // Kiểm tra va chạm sau xoay, nếu đè thì thử dịch chuyển ngang (wall kick) để xoay mượt
        const originalX = state.currentPiece.x;
        let success = false;
        
        const kicks = [0, -1, 1, -2, 2];
        for (const dx of kicks) {
            state.currentPiece.x += dx;
            if (!checkCollision(state.currentPiece, 0, 0, rotated)) {
                state.currentPiece.shape = rotated;
                success = true;
                break;
            }
            state.currentPiece.x = originalX; // reset thử tiếp
        }
    }

    // Rơi tự do ngay lập tức (Hard Drop)
    function hardDropPiece() {
        while (!checkCollision(state.currentPiece, 0, 1)) {
            state.currentPiece.y++;
        }
        mergePiece();
        clearLines();
        spawnPiece();
    }

    // --- DRAWING GRAPHICS ---

    function drawGridBlock(context, x, y, colorId, size) {
        const color = COLORS[colorId];
        context.fillStyle = color;
        context.shadowBlur = 10;
        context.shadowColor = color;
        
        // Vẽ khối có bo viền neon
        context.fillRect(x * size + 1.5, y * size + 1.5, size - 3, size - 3);
        context.strokeStyle = '#ffffffaa';
        context.lineWidth = 1;
        context.strokeRect(x * size + 3, y * size + 3, size - 6, size - 6);
        
        context.shadowBlur = 0; // reset
    }

    function draw() {
        // Xóa bảng chính
        ctx.fillStyle = '#07080c';
        ctx.fillRect(0, 0, tetrisCanvas.width, tetrisCanvas.height);

        // Vẽ các khối đã khóa trên lưới
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const block = state.grid[r][c];
                if (block !== 0) {
                    drawGridBlock(ctx, c, r, block, BLOCK_SIZE);
                }
            }
        }

        // Vẽ khối đang rơi
        const p = state.currentPiece;
        if (p) {
            for (let r = 0; r < p.shape.length; r++) {
                for (let c = 0; c < p.shape[r].length; c++) {
                    if (p.shape[r][c] !== 0) {
                        drawGridBlock(ctx, p.x + c, p.y + r, p.colorId, BLOCK_SIZE);
                    }
                }
            }
        }
    }

    // Vẽ khối hình tiếp theo lên bảng Preview
    function drawNextPiece() {
        nextCtx.fillStyle = '#000000';
        nextCtx.fillRect(0, 0, tetrisNextCanvas.width, tetrisNextCanvas.height);

        const p = state.nextPiece;
        if (!p) return;

        const nextBlockSize = 16;
        const shapeW = p.shape[0].length * nextBlockSize;
        const shapeH = p.shape.length * nextBlockSize;

        // Căn lề chính giữa canvas preview 80x80
        const startX = (80 - shapeW) / 2;
        const startY = (80 - shapeH) / 2;

        nextCtx.shadowBlur = 8;
        nextCtx.shadowColor = COLORS[p.colorId];
        nextCtx.fillStyle = COLORS[p.colorId];

        for (let r = 0; r < p.shape.length; r++) {
            for (let c = 0; c < p.shape[r].length; c++) {
                if (p.shape[r][c] !== 0) {
                    nextCtx.fillRect(startX + c * nextBlockSize + 1, startY + r * nextBlockSize + 1, nextBlockSize - 2, nextBlockSize - 2);
                }
            }
        }
        nextCtx.shadowBlur = 0; // reset
    }

    // --- GAME LOOP ---
    function gameLoop(time = 0) {
        if (state.gameOver) return;

        const deltaTime = time - state.lastTime;
        state.lastTime = time;

        state.dropCounter += deltaTime;
        if (state.dropCounter > state.dropInterval) {
            dropPiece();
        }

        draw();
        state.animationId = requestAnimationFrame(gameLoop);
    }

    // --- CONTROL KEYBOARD BINDINGS ---
    window.addEventListener('keydown', function (e) {
        if (state.gameOver || state.status !== 'PLAYING') return;

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                movePiece(-1);
                draw();
                break;
            case 'ArrowRight':
                e.preventDefault();
                movePiece(1);
                draw();
                break;
            case 'ArrowUp':
                e.preventDefault();
                rotatePiece();
                draw();
                break;
            case 'ArrowDown':
                e.preventDefault();
                dropPiece();
                draw();
                break;
            case ' ':
                e.preventDefault();
                hardDropPiece();
                draw();
                break;
        }
    });

    // --- BUTTON BINDINGS ---
    btnStartTetris.addEventListener('click', function () {
        tetrisLobby.classList.add('hidden');
        tetrisGameArea.classList.remove('hidden');

        state.status = 'PLAYING';
        resetGame();
        state.lastTime = performance.now();
        gameLoop();
    });

    btnQuitTetris.addEventListener('click', function () {
        state.gameOver = true;
        cancelAnimationFrame(state.animationId);

        state.status = 'LOBBY';
        tetrisLobby.classList.remove('hidden');
        tetrisGameArea.classList.add('hidden');
    });
})();
