/**
 * pikachu.js - Neon Pikachu (Connect Animal Classic)
 */

(function () {
    // --- DOM Elements ---
    const pikachuLobby = document.getElementById('pikachuLobby');
    const pikachuGameArea = document.getElementById('pikachuGameArea');
    const btnStartPikachu = document.getElementById('btnStartPikachu');
    const btnQuitPikachu = document.getElementById('btnQuitPikachu');

    const labelScore = document.getElementById('pikachuScore');
    const labelLevel = document.getElementById('pikachuLevel');
    const timeBar = document.getElementById('pikachuTimeBar');

    const btnHint = document.getElementById('btnPikachuHint');
    const btnShuffle = document.getElementById('btnPikachuShuffle');
    const labelHintCount = document.getElementById('pikachuHintCount');
    const labelShuffleCount = document.getElementById('pikachuShuffleCount');

    const pikachuCanvas = document.getElementById('pikachuCanvas');
    const ctx = pikachuCanvas.getContext('2d');

    // --- GAME CONFIGS ---
    const COLS = 12; // Số cột của lưới (10 cột chứa thẻ + 2 cột biên trống)
    const ROWS = 8;  // Số hàng của lưới (6 hàng chứa thẻ + 2 hàng biên trống)
    const CARD_WIDTH = 50;  // Rộng mỗi ô thẻ
    const CARD_HEIGHT = 55; // Cao mỗi ô thẻ
    const OFFSET_X = 40;    // Căn lề trái
    const OFFSET_Y = 25;    // Căn lề trên

    // 12 loại Emojis động vật neon tuyệt đẹp
    const EMOJIS = ['🦊', '🐼', '🐨', '🐯', '🦁', '🐸', '🦄', '🐙', '🐝', '🦀', '🐳', '🦉'];

    // Màu sắc Neon viền tương ứng với từng Emoji
    const NEON_COLORS = [
        '#ff7300', // Cam
        '#ffffff', // Trắng
        '#8a8d9f', // Xám
        '#ffd700', // Vàng
        '#ff9500', // Vàng cam
        '#39ff14', // Xanh lá
        '#ff007f', // Hồng neon
        '#b026ff', // Tím
        '#ffe600', // Vàng chanh
        '#ff3b30', // Đỏ
        '#00f0ff', // Cyan
        '#0055ff'  // Xanh dương
    ];

    const state = {
        grid: Array(ROWS).fill().map(() => Array(COLS).fill(0)), // 0: ô trống, >0: id của Emoji
        score: 0,
        level: 1,
        timeLeft: 120, // 120 giây
        maxTime: 120,
        hintCount: 3,
        shuffleCount: 3,
        
        selected: null, // { r, c } ô đang chọn
        drawPath: null, // Danh sách điểm [{x, y}] để vẽ hiệu ứng đường nối sét
        pathTime: 0,    // Thời điểm vẽ đường nối
        
        gameActive: false,
        timerInterval: null,
        animationId: null
    };

    // --- GRID GENERATION ---

    function generateBoard() {
        // Tổng số ô chứa thẻ là (ROWS-2)*(COLS-2) = 6 * 10 = 60 ô
        const totalCards = (ROWS - 2) * (COLS - 2);
        
        // Tạo danh sách cặp thẻ gạch trùng nhau
        const cards = [];
        const numPairs = totalCards / 2;
        for (let i = 0; i < numPairs; i++) {
            // Lấy ngẫu nhiên Emoji id (1 -> 12)
            const id = Math.floor(Math.random() * EMOJIS.length) + 1;
            cards.push(id, id);
        }

        // Xáo trộn vị trí các thẻ gạch
        shuffleArray(cards);

        // Đổ thẻ vào lưới cờ (chừa biên trống xung quanh r=0, r=ROWS-1, c=0, c=COLS-1)
        let idx = 0;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
                    state.grid[r][c] = 0; // Đường biên trống để chạy đường nối bao quanh
                } else {
                    state.grid[r][c] = cards[idx++];
                }
            }
        }

        // Kiểm tra xem bàn cờ mới tạo có nước đi hợp lệ nào không, nếu không thì xáo trộn lại
        let attempts = 0;
        while (!hasValidMoves() && attempts < 100) {
            shuffleBoard(false);
            attempts++;
        }
    }

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    // Xáo trộn bàn cờ khi bị kẹt (không tính mất lượt shuffle của user nếu tự động xáo)
    function shuffleBoard(consumeCount = true) {
        if (consumeCount) {
            if (state.shuffleCount <= 0) return;
            state.shuffleCount--;
            labelShuffleCount.innerText = state.shuffleCount;
        }

        // Thu thập toàn bộ các thẻ gạch còn lại trên bàn
        const cards = [];
        for (let r = 1; r < ROWS - 1; r++) {
            for (let c = 1; c < COLS - 1; c++) {
                if (state.grid[r][c] !== 0) {
                    cards.push(state.grid[r][c]);
                }
            }
        }

        // Xáo trộn
        shuffleArray(cards);

        // Đặt lại vào lưới cờ
        let idx = 0;
        for (let r = 1; r < ROWS - 1; r++) {
            for (let c = 1; c < COLS - 1; c++) {
                if (state.grid[r][c] !== 0) {
                    state.grid[r][c] = cards[idx++];
                }
            }
        }

        state.selected = null;
        draw();
    }

    // --- Pikachu Pathfinding (BFS tìm đường đi ngắn nhất tối đa 2 lần rẽ) ---

    function getPointsConnection(p1, p2) {
        if (p1.r === p2.r && p1.c === p2.c) return null;
        if (state.grid[p1.r][p1.c] !== state.grid[p2.r][p2.c]) return null;

        // BFS hàng đợi lưu tọa độ, hướng di chuyển hiện tại, và số lần rẽ góc (turns)
        // queueItem = { r, c, dir: {dr, dc}, turns, path: [{r, c}] }
        const queue = [];
        
        // Hướng di chuyển: Lên, Xuống, Trái, Phải
        const dirs = [
            { dr: -1, dc: 0 },
            { dr: 1, dc: 0 },
            { dr: 0, dc: -1 },
            { dr: 0, dc: 1 }
        ];

        // Đẩy 4 hướng xuất phát ban đầu từ điểm p1
        for (const d of dirs) {
            const nr = p1.r + d.dr;
            const nc = p1.c + d.dc;
            
            // Điểm tiếp theo hợp lệ (nằm trong lưới và là ô trống, HOẶC là ô mục tiêu p2)
            if (isValidCell(nr, nc)) {
                if (state.grid[nr][nc] === 0 || (nr === p2.r && nc === p2.c)) {
                    queue.push({
                        r: nr,
                        c: nc,
                        dir: d,
                        turns: 0,
                        path: [p1, { r: nr, c: nc }]
                    });
                }
            }
        }

        // Bảng ghi nhận số góc rẽ nhỏ nhất tới mỗi ô có hướng dr, dc
        // Tránh lặp và tối ưu hóa đường đi
        const minTurns = Array(ROWS).fill().map(() => 
            Array(COLS).fill().map(() => ({}) )
        );

        while (queue.length > 0) {
            const curr = queue.shift();

            // Nếu chạm đích và số khúc cua nhỏ hơn hoặc bằng 2 -> tìm thấy đường nối thành công!
            if (curr.r === p2.r && curr.c === p2.c) {
                if (curr.turns <= 2) {
                    return curr.path;
                }
            }

            // Đi tiếp sang 4 hướng
            for (const d of dirs) {
                const nr = curr.r + d.dr;
                const nc = curr.c + d.dc;

                if (!isValidCell(nr, nc)) continue;

                // Tính toán số khúc rẽ khi đổi hướng
                const isTurn = (d.dr !== curr.dir.dr || d.dc !== curr.dir.dc);
                const nextTurns = curr.turns + (isTurn ? 1 : 0);

                if (nextTurns > 2) continue;

                // Chỉ đi vào ô trống hoặc ô đích
                if (state.grid[nr][nc] === 0 || (nr === p2.r && nc === p2.c)) {
                    const dirKey = `${d.dr},${d.dc}`;
                    const prevTurns = minTurns[nr][nc][dirKey];
                    
                    if (prevTurns === undefined || nextTurns < prevTurns) {
                        minTurns[nr][nc][dirKey] = nextTurns;
                        queue.push({
                            r: nr,
                            c: nc,
                            dir: d,
                            turns: nextTurns,
                            path: [...curr.path, { r: nr, c: nc }]
                        });
                    }
                }
            }
        }

        return null;
    }

    function isValidCell(r, c) {
        return r >= 0 && r < ROWS && c >= 0 && c < COLS;
    }

    // Kiểm tra bàn cờ còn cặp nào có thể kết nối được không
    function hasValidMoves() {
        for (let r1 = 0; r1 < ROWS; r1++) {
            for (let c1 = 0; c1 < COLS; c1++) {
                if (state.grid[r1][c1] === 0) continue;
                for (let r2 = r1; r2 < ROWS; r2++) {
                    const startCol = (r2 === r1) ? c1 + 1 : 0;
                    for (let c2 = startCol; c2 < COLS; c2++) {
                        if (state.grid[r2][c2] === 0) continue;
                        if (state.grid[r1][c1] === state.grid[r2][c2]) {
                            const p = getPointsConnection({ r: r1, c: c1 }, { r: r2, c: c2 });
                            if (p) return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    // Tìm kiếm ngẫu nhiên 1 cặp nước đi đúng để gợi ý (Hint)
    function findHintMove() {
        for (let r1 = 0; r1 < ROWS; r1++) {
            for (let c1 = 0; c1 < COLS; c1++) {
                if (state.grid[r1][c1] === 0) continue;
                for (let r2 = r1; r2 < ROWS; r2++) {
                    const startCol = (r2 === r1) ? c1 + 1 : 0;
                    for (let c2 = startCol; c2 < COLS; c2++) {
                        if (state.grid[r2][c2] === 0) continue;
                        if (state.grid[r1][c1] === state.grid[r2][c2]) {
                            const path = getPointsConnection({ r: r1, c: c1 }, { r: r2, c: c2 });
                            if (path) return { p1: { r: r1, c: c1 }, p2: { r: r2, c: c2 } };
                        }
                    }
                }
            }
        }
        return null;
    }

    // --- GAMEPLAY CONTROL ---

    function startTimer() {
        clearInterval(state.timerInterval);
        state.timerInterval = setInterval(() => {
            if (!state.gameActive || state.gameOver) return;

            state.timeLeft--;
            const percentage = (state.timeLeft / state.maxTime) * 100;
            timeBar.style.width = percentage + '%';

            if (state.timeLeft <= 0) {
                handleGameOver(false);
            }
        }, 1000);
    }

    function checkWin() {
        // Nếu tất cả các ô từ hàng 1 -> ROWS-2 và cột 1 -> COLS-2 đều bằng 0 -> chiến thắng!
        for (let r = 1; r < ROWS - 1; r++) {
            for (let c = 1; c < COLS - 1; c++) {
                if (state.grid[r][c] !== 0) return false;
            }
        }
        return true;
    }

    function handleGameOver(isWin) {
        state.gameActive = false;
        clearInterval(state.timerInterval);
        cancelAnimationFrame(state.animationId);

        if (isWin) {
            alert('CHÚC MỪNG! BẠN ĐÃ CHIẾN THẮNG LEVEL ' + state.level);
            // Sang màn tiếp theo
            state.level++;
            state.timeLeft = Math.max(40, 120 - (state.level - 1) * 10);
            state.maxTime = state.timeLeft;
            state.hintCount = Math.max(1, state.hintCount + 1);
            state.shuffleCount = Math.max(1, state.shuffleCount + 1);
            
            labelLevel.innerText = state.level;
            labelHintCount.innerText = state.hintCount;
            labelShuffleCount.innerText = state.shuffleCount;
            
            state.gameActive = true;
            generateBoard();
            startTimer();
            animate();
        } else {
            alert('HẾT GIỜ! GAME OVER! Tổng điểm: ' + state.score);
            pikachuLobby.classList.remove('hidden');
            pikachuGameArea.classList.add('hidden');
        }
    }

    // --- DRAWING GRAPHICS ---

    function getCellCoords(r, c) {
        return {
            x: OFFSET_X + c * CARD_WIDTH,
            y: OFFSET_Y + r * CARD_HEIGHT
        };
    }

    function draw() {
        // Xóa bảng chính
        ctx.fillStyle = '#07080c';
        ctx.fillRect(0, 0, pikachuCanvas.width, pikachuCanvas.height);

        // Vẽ các thẻ bài Pikachu
        for (let r = 1; r < ROWS - 1; r++) {
            for (let c = 1; c < COLS - 1; c++) {
                const cardId = state.grid[r][c];
                if (cardId === 0) continue;

                const pos = getCellCoords(r, c);
                const emoji = EMOJIS[cardId - 1];
                const color = NEON_COLORS[cardId - 1];

                const isSelected = state.selected && state.selected.r === r && state.selected.c === c;

                // Nền hộp Glassmorphism phát sáng
                ctx.fillStyle = isSelected ? 'rgba(255, 230, 0, 0.2)' : 'rgba(17, 18, 29, 0.7)';
                ctx.strokeStyle = isSelected ? '#ffe600' : color;
                ctx.lineWidth = isSelected ? 2.5 : 1.5;

                // Glow shadow
                ctx.shadowBlur = isSelected ? 12 : 5;
                ctx.shadowColor = isSelected ? '#ffe600' : color;

                // Vẽ bo góc nhẹ
                ctx.beginPath();
                ctx.roundRect(pos.x + 2, pos.y + 2, CARD_WIDTH - 4, CARD_HEIGHT - 4, 6);
                ctx.fill();
                ctx.stroke();

                ctx.shadowBlur = 0; // reset

                // Vẽ Emoji căn giữa thẻ
                ctx.font = '22px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(emoji, pos.x + CARD_WIDTH / 2, pos.y + CARD_HEIGHT / 2 + 2);
            }
        }

        // Vẽ hiệu ứng tia sét sét (Neon Lightning Path)
        if (state.drawPath && Date.now() - state.pathTime < 300) {
            ctx.strokeStyle = '#ffe600';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffe600';
            
            ctx.beginPath();
            const startPos = getCellCoords(state.drawPath[0].r, state.drawPath[0].c);
            ctx.moveTo(startPos.x + CARD_WIDTH / 2, startPos.y + CARD_HEIGHT / 2);

            for (let i = 1; i < state.drawPath.length; i++) {
                const pos = getCellCoords(state.drawPath[i].r, state.drawPath[i].c);
                ctx.lineTo(pos.x + CARD_WIDTH / 2, pos.y + CARD_HEIGHT / 2);
            }
            ctx.stroke();
            ctx.shadowBlur = 0; // reset
        } else if (state.drawPath) {
            state.drawPath = null; // Xóa path sau 300ms
        }
    }

    function animate() {
        if (!state.gameActive) return;
        draw();
        state.animationId = requestAnimationFrame(animate);
    }

    // --- INTERACTION ---

    pikachuCanvas.addEventListener('mousedown', function (e) {
        if (!state.gameActive || state.gameOver) return;

        const rect = pikachuCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Tính toán cột và hàng cờ tương ứng từ tọa độ chuột
        const c = Math.floor((mouseX - OFFSET_X) / CARD_WIDTH);
        const r = Math.floor((mouseY - OFFSET_Y) / CARD_HEIGHT);

        // Kiểm tra hợp lệ (không click vào biên trống hay ô trống đã biến mất)
        if (r <= 0 || r >= ROWS - 1 || c <= 0 || c >= COLS - 1) return;
        if (state.grid[r][c] === 0) return;

        if (!state.selected) {
            // Chọn thẻ đầu tiên
            state.selected = { r, c };
        } else {
            // Click thẻ thứ hai
            const p1 = state.selected;
            const p2 = { r, c };

            if (p1.r === p2.r && p1.c === p2.c) {
                // Hủy chọn nếu click lại chính nó
                state.selected = null;
                return;
            }

            const path = getPointsConnection(p1, p2);
            if (path) {
                // Tìm thấy cặp nối hợp lệ:
                state.grid[p1.r][p1.c] = 0;
                state.grid[p2.r][p2.c] = 0;
                
                state.score += 100;
                labelScore.innerText = state.score;

                // Lưu đường đi để vẽ hiệu ứng tia sét nối
                state.drawPath = path;
                state.pathTime = Date.now();

                state.selected = null;

                // Kiểm tra điều kiện thắng
                if (checkWin()) {
                    setTimeout(() => {
                        handleGameOver(true);
                    }, 400);
                } else {
                    // Kiểm tra xem bàn cờ sau nước đi này có rơi vào thế kẹt không
                    setTimeout(() => {
                        let shuffleAttempts = 0;
                        while (!hasValidMoves() && checkWin() === false && shuffleAttempts < 50) {
                            alert('HẾT ĐƯỜNG ĐI HỢP LỆ! Tự động xáo trộn bàn cờ.');
                            shuffleBoard(false);
                            shuffleAttempts++;
                        }
                    }, 400);
                }
            } else {
                // Nối thất bại -> Chuyển sang chọn thẻ vừa nhấp
                state.selected = { r, c };
            }
        }
    });

    // --- BUTTON BINDINGS ---

    btnStartPikachu.addEventListener('click', function () {
        pikachuLobby.classList.add('hidden');
        pikachuGameArea.classList.remove('hidden');

        state.score = 0;
        state.level = 1;
        state.timeLeft = 120;
        state.maxTime = 120;
        state.hintCount = 3;
        state.shuffleCount = 3;

        labelScore.innerText = '0';
        labelLevel.innerText = '1';
        labelHintCount.innerText = '3';
        labelShuffleCount.innerText = '3';
        timeBar.style.width = '100%';

        state.selected = null;
        state.drawPath = null;
        state.gameActive = true;

        generateBoard();
        startTimer();
        animate();
    });

    // Thoát game
    btnQuitPikachu.addEventListener('click', function () {
        state.gameActive = false;
        clearInterval(state.timerInterval);
        cancelAnimationFrame(state.animationId);

        pikachuLobby.classList.remove('hidden');
        pikachuGameArea.classList.add('hidden');
    });

    // Gợi ý nước đi
    btnHint.addEventListener('click', function () {
        if (!state.gameActive || state.hintCount <= 0) return;

        const move = findHintMove();
        if (move) {
            state.hintCount--;
            labelHintCount.innerText = state.hintCount;

            // Nháy sáng ô gợi ý (Thiết lập chọn luôn ô gợi ý đầu tiên cho người chơi)
            state.selected = move.p1;
            draw();
        } else {
            alert('Không còn cặp nào có thể nối được!');
        }
    });

    // Xáo trộn bảng thủ công
    btnShuffle.addEventListener('click', function () {
        if (!state.gameActive || state.shuffleCount <= 0) return;
        shuffleBoard(true);
    });
})();
