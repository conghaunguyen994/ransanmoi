/**
 * game_2048.js - Neon 2048 Puzzle
 */

(function () {
    const game2048Lobby = document.getElementById('game2048Lobby');
    const game2048GameArea = document.getElementById('game2048GameArea');
    const btnStart2048 = document.getElementById('btnStart2048');
    const btnQuit2048 = document.getElementById('btnQuit2048');

    const labelScore = document.getElementById('game2048Score');
    const labelBest = document.getElementById('game2048Best');

    const canvas = document.getElementById('game2048Canvas');
    const ctx = canvas.getContext('2d');

    const GRID_SIZE = 4;
    const CELL_WIDTH = 85;
    const CELL_GAP = 12;
    const OFFSET = 12; // Căn lề trái/trên: (400 - (85*4 + 12*3)) / 2 = 12

    // Màu sắc Glassmorphism & Neon cho từng loại số ô cờ:
    const TILE_STYLES = {
        2:    { bg: 'rgba(57, 255, 20, 0.08)',  border: '#39ff14', text: '#39ff14' },   // Xanh lá
        4:    { bg: 'rgba(0, 240, 255, 0.08)',   border: '#00f0ff', text: '#00f0ff' },   // Cyan
        8:    { bg: 'rgba(255, 0, 127, 0.08)',  border: '#ff007f', text: '#ff007f' },   // Hồng
        16:   { bg: 'rgba(255, 115, 0, 0.08)',  border: '#ff7300', text: '#ff7300' },   // Cam
        32:   { bg: 'rgba(176, 38, 255, 0.08)',  border: '#b026ff', text: '#b026ff' },   // Tím
        64:   { bg: 'rgba(255, 230, 0, 0.08)',  border: '#ffe600', text: '#ffe600' },   // Vàng chanh
        128:  { bg: 'rgba(57, 255, 20, 0.15)',  border: '#39ff14', text: '#fff' },
        256:  { bg: 'rgba(0, 240, 255, 0.15)',   border: '#00f0ff', text: '#fff' },
        512:  { bg: 'rgba(255, 0, 127, 0.15)',  border: '#ff007f', text: '#fff' },
        1024: { bg: 'rgba(255, 115, 0, 0.15)',  border: '#ff7300', text: '#fff' },
        2048: { bg: 'rgba(255, 215, 0, 0.25)',  border: '#ffd700', text: '#ffe600' }    // Vàng hoàng gia
    };

    const state = {
        grid: Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0)),
        score: 0,
        bestScore: 0,
        gameActive: false
    };

    function initGame() {
        state.score = 0;
        state.bestScore = parseInt(localStorage.getItem('neon_2048_best')) || 0;
        
        labelScore.innerText = state.score;
        labelBest.innerText = state.bestScore;

        // Xóa bảng ô cờ về 0
        state.grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));

        // Sinh 2 ô số xuất phát ban đầu (2 hoặc 4)
        spawnTile();
        spawnTile();

        state.gameActive = true;
        draw();
    }

    // Sinh 1 ô số ngẫu nhiên vào các ô còn trống
    function spawnTile() {
        const emptyCells = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (state.grid[r][c] === 0) {
                    emptyCells.push({ r, c });
                }
            }
        }

        if (emptyCells.length > 0) {
            const chosen = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            // 90% cơ hội ra 2, 10% ra 4
            state.grid[chosen.r][chosen.c] = Math.random() < 0.9 ? 2 : 4;
        }
    }

    // --- GAME LOGIC SLIDE ALGORITHMS ---

    // Dồn 1 dòng về bên trái
    function slideRowLeft(row) {
        // Lọc bỏ các số 0
        let filtered = row.filter(val => val !== 0);
        
        // Gộp hai số giống nhau kề sát
        for (let i = 0; i < filtered.length - 1; i++) {
            if (filtered[i] === filtered[i + 1]) {
                filtered[i] = filtered[i] * 2;
                state.score += filtered[i];
                filtered[i + 1] = 0;
            }
        }

        // Lọc số 0 tạo ra sau gộp lần nữa
        filtered = filtered.filter(val => val !== 0);

        // Bù thêm các số 0 vào đuôi cho đủ chiều dài
        while (filtered.length < GRID_SIZE) {
            filtered.push(0);
        }

        return filtered;
    }

    // Xoay ma trận 90 độ theo chiều kim đồng hồ để tận dụng thuật toán dồn bên trái cho cả 4 hướng
    function rotateGridClockwise() {
        const newGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                newGrid[c][GRID_SIZE - 1 - r] = state.grid[r][c];
            }
        }
        state.grid = newGrid;
    }

    function handleMove(direction) {
        if (!state.gameActive) return;

        // Lưu bản sao trạng thái lưới trước di chuyển để kiểm tra xem có sự thay đổi nào không
        const prevGridStr = JSON.stringify(state.grid);

        // Định hướng xoay ma trận cờ để áp dụng hàm slideRowLeft
        // direction: 'LEFT', 'UP', 'RIGHT', 'DOWN'
        let rotations = 0;
        if (direction === 'UP') rotations = 3;
        else if (direction === 'RIGHT') rotations = 2;
        else if (direction === 'DOWN') rotations = 1;

        for (let i = 0; i < rotations; i++) {
            rotateGridClockwise();
        }

        // Dồn bài
        for (let r = 0; r < GRID_SIZE; r++) {
            state.grid[r] = slideRowLeft(state.grid[r]);
        }

        // Xoay ngược ma trận cờ về vị trí ban đầu
        const inverseRotations = (4 - rotations) % 4;
        for (let i = 0; i < inverseRotations; i++) {
            rotateGridClockwise();
        }

        // Nếu lưới cờ có sự thay đổi -> sinh thêm ô số mới
        if (JSON.stringify(state.grid) !== prevGridStr) {
            spawnTile();
            
            // Đồng bộ điểm số
            labelScore.innerText = state.score;
            if (state.score > state.bestScore) {
                state.bestScore = state.score;
                labelBest.innerText = state.bestScore;
                localStorage.setItem('neon_2048_best', state.bestScore);
            }

            draw();
        }

        // Kiểm tra kẹt bàn chơi (Thua cuộc) - LUÔN kiểm tra sau mỗi nước đi
        if (isGameOver()) {
            state.gameActive = false;
            draw();
            drawGameOverOverlay();
        }
    }

    // Kiểm tra bàn chơi có bị kẹt cứng nước đi không
    function isGameOver() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (state.grid[r][c] === 0) return false;
                // Kiểm tra ô kề cận bên phải
                if (c < GRID_SIZE - 1 && state.grid[r][c] === state.grid[r][c + 1]) return false;
                // Kiểm tra ô kề cận bên dưới
                if (r < GRID_SIZE - 1 && state.grid[r][c] === state.grid[r + 1][c]) return false;
            }
        }
        return true;
    }

    // Vẽ màn hình Game Over lên Canvas
    function drawGameOverOverlay() {
        // Lớp phủ mờ tối
        ctx.fillStyle = 'rgba(5, 5, 15, 0.82)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Box trung tâm
        const bx = 40, by = 110, bw = 320, bh = 180;
        ctx.save();
        ctx.fillStyle = 'rgba(17, 18, 29, 0.95)';
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff007f';
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 12);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Tiêu đề GAME OVER
        ctx.save();
        ctx.fillStyle = '#ff007f';
        ctx.font = '700 36px Outfit, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff007f';
        ctx.fillText('GAME OVER!', canvas.width / 2, by + 55);
        ctx.restore();

        // Dòng phụ hiển thị điểm
        ctx.save();
        ctx.fillStyle = '#8f92a1';
        ctx.font = '400 13px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Không còn nước đi hợp lệ', canvas.width / 2, by + 100);
        ctx.restore();

        // Điểm số nổi bật
        ctx.save();
        ctx.fillStyle = '#ffe600';
        ctx.font = '700 28px Outfit, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ffe600';
        ctx.fillText('ĐIỂM: ' + state.score, canvas.width / 2, by + 140);
        ctx.restore();

        // Hướng dẫn chơi lại
        ctx.save();
        ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.font = '400 11px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Nhấn THOÁT GAME để chơi lại', canvas.width / 2, by + 170);
        ctx.restore();
    }

    // --- DRAWING GRAPHICS ---

    function draw() {
        // Xóa bảng cờ
        ctx.fillStyle = '#0d0d15';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Vẽ các ô cờ trống làm nền mờ
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const x = OFFSET + c * (CELL_WIDTH + CELL_GAP);
                const y = OFFSET + r * (CELL_WIDTH + CELL_GAP);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.lineWidth = 1;

                ctx.beginPath();
                ctx.roundRect(x, y, CELL_WIDTH, CELL_WIDTH, 6);
                ctx.fill();
                ctx.stroke();
            }
        }

        // Vẽ các ô số hoạt động
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const val = state.grid[r][c];
                if (val === 0) continue;

                const x = OFFSET + c * (CELL_WIDTH + CELL_GAP);
                const y = OFFSET + r * (CELL_WIDTH + CELL_GAP);

                // Lấy màu sắc tùy chỉnh theo mốc số
                const style = TILE_STYLES[val] || { bg: 'rgba(255, 255, 255, 0.2)', border: '#ffffff', text: '#ffffff' };

                ctx.save();
                ctx.fillStyle = style.bg;
                ctx.strokeStyle = style.border;
                ctx.lineWidth = 2;
                ctx.shadowBlur = 10;
                ctx.shadowColor = style.border;

                ctx.beginPath();
                ctx.roundRect(x + 2, y + 2, CELL_WIDTH - 4, CELL_WIDTH - 4, 6);
                ctx.fill();
                ctx.stroke();
                ctx.restore();

                // Vẽ text chữ số căn giữa ô cờ
                ctx.fillStyle = style.text;
                // Co phông chữ nhỏ lại khi chữ số đạt 4 chữ số (ví dụ: 1024, 2048)
                ctx.font = `700 ${val >= 1024 ? 22 : val >= 128 ? 26 : 30}px Outfit, Arial, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(val, x + CELL_WIDTH / 2, y + CELL_WIDTH / 2 + 2);
            }
        }
    }

    // --- KEY LISTENERS ---
    window.addEventListener('keydown', function (e) {
        const view = document.getElementById('game2048View');
        if (view.classList.contains('hidden')) return;

        let moved = false;
        switch (e.key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                handleMove('LEFT');
                moved = true;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                handleMove('RIGHT');
                moved = true;
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
                handleMove('UP');
                moved = true;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                handleMove('DOWN');
                moved = true;
                break;
        }

        if (moved) {
            e.preventDefault(); // Ngăn cuộn trang
        }
    });

    // --- BUTTON BINDINGS ---
    btnStart2048.addEventListener('click', function () {
        game2048Lobby.classList.add('hidden');
        game2048GameArea.classList.remove('hidden');
        initGame();
    });

    btnQuit2048.addEventListener('click', function () {
        state.gameActive = false;
        game2048Lobby.classList.remove('hidden');
        game2048GameArea.classList.add('hidden');
    });
})();
