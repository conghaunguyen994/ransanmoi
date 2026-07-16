/**
 * pacman.js - Neon Pacman Cyberpunk
 */

(function () {
    const pacmanLobby = document.getElementById('pacmanLobby');
    const pacmanGameArea = document.getElementById('pacmanGameArea');
    const btnStartPacman = document.getElementById('btnStartPacman');
    const btnQuitPacman = document.getElementById('btnQuitPacman');

    const labelScore = document.getElementById('pacmanScore');
    const labelLives = document.getElementById('pacmanLives');

    const canvas = document.getElementById('pacmanCanvas');
    const ctx = canvas.getContext('2d');

    const TILE_SIZE = 20; // 22 cột x 24 hàng -> 440 x 480 px

    // Định nghĩa bản đồ mê cung Pac-man:
    // 1: Tường (Wall), 2: Chấm điểm (Dot), 3: Quả năng lượng (Power Pellet), 0: Trống (Empty)
    const ORIGINAL_MAP = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,3,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,3,1],
        [1,2,1,1,1,2,1,1,1,2,1,1,2,1,1,1,2,1,1,1,2,1],
        [1,2,1,1,1,2,1,1,1,2,1,1,2,1,1,1,2,1,1,1,2,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,1,2,1,2,1,1,1,1,1,1,2,1,2,1,1,1,2,1],
        [1,2,2,2,2,2,1,2,2,2,1,1,2,2,2,1,2,2,2,2,2,1],
        [1,1,1,1,1,2,1,1,1,0,1,1,0,1,1,1,2,1,1,1,1,1],
        [0,0,0,0,1,2,1,0,0,0,0,0,0,0,0,1,2,1,0,0,0,0],
        [1,1,1,1,1,2,1,0,1,1,0,0,1,1,0,1,2,1,1,1,1,1],
        [0,0,0,0,0,2,0,0,1,0,0,0,0,1,0,0,2,0,0,0,0,0],
        [1,1,1,1,1,2,1,0,1,1,1,1,1,1,0,1,2,1,1,1,1,1],
        [0,0,0,0,1,2,1,0,0,0,0,0,0,0,0,1,2,1,0,0,0,0],
        [1,1,1,1,1,2,1,2,1,1,1,1,1,1,2,1,2,1,1,1,1,1],
        [1,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,1,2,1,1,1,2,1,1,2,1,1,1,2,1,1,1,2,1],
        [1,3,2,2,1,2,2,2,2,2,0,0,2,2,2,2,2,1,2,2,3,1],
        [1,1,1,2,1,2,1,2,1,1,1,1,1,1,2,1,2,1,2,1,1,1],
        [1,2,2,2,2,2,1,2,2,2,1,1,2,2,2,1,2,2,2,2,2,1],
        [1,2,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,1],
        [1,2,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    const state = {
        grid: [],
        score: 0,
        lives: 3,
        gameActive: false,
        animationId: null,

        pacman: {
            x: 10 * TILE_SIZE + TILE_SIZE / 2,
            y: 16 * TILE_SIZE + TILE_SIZE / 2,
            dirX: 0,
            dirY: 0,
            nextDirX: 0,
            nextDirY: 0,
            speed: 2,
            angle: 0.2
        },

        ghosts: [], // { x, y, dirX, dirY, color, name, isFrightened }
        frightenedTimer: 0,

        keys: {}
    };

    const GHOST_CONFIGS = [
        { name: 'Blinky', color: '#ff007f', startX: 10, startY: 10 },
        { name: 'Pinky', color: '#ff7300', startX: 11, startY: 10 },
        { name: 'Inky', color: '#00f0ff', startX: 10, startY: 11 },
        { name: 'Clyde', color: '#ffe600', startX: 11, startY: 11 }
    ];

    function initGame() {
        state.score = 0;
        state.lives = 3;
        state.frightenedTimer = 0;
        
        labelScore.innerText = state.score;
        labelLives.innerText = state.lives;

        // Sao chép sâu bản đồ gốc
        state.grid = ORIGINAL_MAP.map(row => [...row]);

        resetPositions();
        state.gameActive = true;
        animate();
    }

    function resetPositions() {
        state.pacman.x = 10 * TILE_SIZE + TILE_SIZE / 2;
        state.pacman.y = 16 * TILE_SIZE + TILE_SIZE / 2;
        state.pacman.dirX = 0;
        state.pacman.dirY = 0;
        state.pacman.nextDirX = 0;
        state.pacman.nextDirY = 0;

        state.ghosts = GHOST_CONFIGS.map(g => ({
            x: g.startX * TILE_SIZE + TILE_SIZE / 2,
            y: g.startY * TILE_SIZE + TILE_SIZE / 2,
            dirX: 0,
            dirY: -1,
            color: g.color,
            name: g.name,
            speed: 1.5,
            isFrightened: false
        }));
    }

    function isWall(x, y) {
        // Chuyển đổi tọa độ thực thành tọa độ lưới cờ
        const cellX = Math.floor(x / TILE_SIZE);
        const cellY = Math.floor(y / TILE_SIZE);

        if (cellX < 0 || cellX >= 22 || cellY < 0 || cellY >= 23) return true;
        return state.grid[cellY][cellX] === 1;
    }

    function update() {
        const pm = state.pacman;

        // 1. Chuyển hướng Pacman dựa trên phím bấm người dùng
        if (state.keys['ArrowUp'] || state.keys['w'] || state.keys['W']) {
            pm.nextDirX = 0; pm.nextDirY = -1;
        } else if (state.keys['ArrowDown'] || state.keys['s'] || state.keys['S']) {
            pm.nextDirX = 0; pm.nextDirY = 1;
        } else if (state.keys['ArrowLeft'] || state.keys['a'] || state.keys['A']) {
            pm.nextDirX = -1; pm.nextDirY = 0;
        } else if (state.keys['ArrowRight'] || state.keys['d'] || state.keys['D']) {
            pm.nextDirX = 1; pm.nextDirY = 0;
        }

        // Tự động rẽ khi đến góc rẽ nếu không có tường cản
        // Kiểm tra xem việc rẽ theo hướng tiếp theo có bị cản bởi tường không
        const isAlignToGrid = (pm.x % TILE_SIZE === TILE_SIZE / 2) && (pm.y % TILE_SIZE === TILE_SIZE / 2);

        if (isAlignToGrid) {
            // Ăn hạt chấm sáng
            const gridX = Math.floor(pm.x / TILE_SIZE);
            const gridY = Math.floor(pm.y / TILE_SIZE);
            
            if (state.grid[gridY][gridX] === 2) {
                state.grid[gridY][gridX] = 0;
                state.score += 10;
                labelScore.innerText = state.score;
            } else if (state.grid[gridY][gridX] === 3) {
                // Ăn Hạt Năng Lượng (Power Pellet) -> Bóng ma hoảng sợ
                state.grid[gridY][gridX] = 0;
                state.score += 50;
                labelScore.innerText = state.score;
                state.frightenedTimer = 350; // 350 frames hoảng sợ (~6s)
                state.ghosts.forEach(g => g.isFrightened = true);
            }

            // Nếu hướng tiếp theo hợp lệ, đổi hướng di chuyển
            const testX = pm.x + pm.nextDirX * TILE_SIZE;
            const testY = pm.y + pm.nextDirY * TILE_SIZE;
            if (!isWall(testX, testY)) {
                pm.dirX = pm.nextDirX;
                pm.dirY = pm.nextDirY;
            }
        }

        // Di chuyển Pac-man
        const nextX = pm.x + pm.dirX * pm.speed;
        const nextY = pm.y + pm.dirY * pm.speed;

        if (!isWall(nextX, nextY)) {
            pm.x = nextX;
            pm.y = nextY;
        } else {
            pm.dirX = 0;
            pm.dirY = 0;
        }

        // Cập nhật hoạt ảnh nhấp nháy há mồm
        pm.angle += 0.05;
        if (pm.angle > 0.4) pm.angle = 0.1;

        // Giảm thời gian hoảng sợ của bóng ma
        if (state.frightenedTimer > 0) {
            state.frightenedTimer--;
            if (state.frightenedTimer === 0) {
                state.ghosts.forEach(g => g.isFrightened = false);
            }
        }

        // 2. Cập nhật di chuyển Bóng Ma (Ghosts)
        for (const g of state.ghosts) {
            // Khi đi tới ngã tư/ngã ba trên lưới, ngẫu nhiên chọn hướng đi tiếp
            const gx = Math.floor(g.x / TILE_SIZE);
            const gy = Math.floor(g.y / TILE_SIZE);
            
            const align = (g.x % TILE_SIZE === TILE_SIZE / 2) && (g.y % TILE_SIZE === TILE_SIZE / 2);
            if (align) {
                // Liệt kê các hướng đi khả thi tiếp theo (tránh quay ngược đầu ngay lập tức)
                const possibleDirs = [];
                const dirs = [
                    { x: 1, y: 0 },
                    { x: -1, y: 0 },
                    { x: 0, y: 1 },
                    { x: 0, y: -1 }
                ];

                for (const d of dirs) {
                    // Không đi lùi trực tiếp
                    if (d.x === -g.dirX && d.y === -g.dirY) continue;
                    
                    const testX = g.x + d.x * TILE_SIZE;
                    const testY = g.y + d.y * TILE_SIZE;
                    if (!isWall(testX, testY)) {
                        possibleDirs.push(d);
                    }
                }

                if (possibleDirs.length > 0) {
                    const chosen = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
                    g.dirX = chosen.x;
                    g.dirY = chosen.y;
                } else {
                    // Nếu kẹt đường thì cho đi lùi
                    g.dirX = -g.dirX;
                    g.dirY = -g.dirY;
                }
            }

            g.x += g.dirX * (g.isFrightened ? 1.0 : g.speed);
            g.y += g.dirY * (g.isFrightened ? 1.0 : g.speed);

            // 3. Va chạm Pac-man và Bóng Ma
            const dist = Math.hypot(pm.x - g.x, pm.y - g.y);
            if (dist < 15) {
                if (g.isFrightened) {
                    // Pacman ăn Bóng Ma
                    g.x = 10 * TILE_SIZE + TILE_SIZE / 2;
                    g.y = 10 * TILE_SIZE + TILE_SIZE / 2;
                    g.isFrightened = false;
                    state.score += 200;
                    labelScore.innerText = state.score;
                } else {
                    // Pacman chết
                    state.lives--;
                    labelLives.innerText = state.lives;
                    if (state.lives <= 0) {
                        handleGameOver();
                    } else {
                        resetPositions();
                    }
                    return;
                }
            }
        }

        // Kiểm tra hết sạch chấm trên màn để chiến thắng
        let dotsLeft = 0;
        for (let r = 0; r < state.grid.length; r++) {
            for (let c = 0; c < state.grid[r].length; c++) {
                if (state.grid[r][c] === 2 || state.grid[r][c] === 3) {
                    dotsLeft++;
                }
            }
        }
        if (dotsLeft === 0) {
            alert('CHÚC MỪNG CHIẾN THẮNG! Bạn đã ăn sạch chấm sáng!');
            initGame();
        }
    }

    function draw() {
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 1. Vẽ mê cung (Tường LED Neon phát sáng)
        for (let r = 0; r < state.grid.length; r++) {
            for (let c = 0; c < state.grid[r].length; c++) {
                const cell = state.grid[r][c];
                const x = c * TILE_SIZE;
                const y = r * TILE_SIZE;

                if (cell === 1) {
                    ctx.save();
                    ctx.fillStyle = '#11121d';
                    ctx.strokeStyle = '#00f0ff';
                    ctx.lineWidth = 1.5;
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = '#00f0ff';

                    ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                    ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                    ctx.restore();
                } else if (cell === 2) {
                    // Vẽ Hạt chấm điểm nhỏ phát sáng màu vàng nhạt
                    ctx.save();
                    ctx.fillStyle = '#ffe600';
                    ctx.shadowBlur = 5;
                    ctx.shadowColor = '#ffe600';
                    ctx.beginPath();
                    ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                } else if (cell === 3) {
                    // Vẽ Hạt năng lượng to phát sáng nhấp nháy màu hồng đỏ
                    ctx.save();
                    ctx.fillStyle = '#ff007f';
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#ff007f';
                    ctx.beginPath();
                    ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
        }

        // 2. Vẽ Pacman (Vector nhấp nháy há mồm vàng chanh)
        const pm = state.pacman;
        let rotation = 0;
        if (pm.dirX === 1) rotation = 0;
        else if (pm.dirX === -1) rotation = Math.PI;
        else if (pm.dirY === 1) rotation = Math.PI / 2;
        else if (pm.dirY === -1) rotation = -Math.PI / 2;

        ctx.save();
        ctx.translate(pm.x, pm.y);
        ctx.rotate(rotation);
        ctx.fillStyle = '#ffe600';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ffe600';

        ctx.beginPath();
        // Vẽ cung tròn há mồm
        ctx.arc(0, 0, TILE_SIZE / 2 - 1, pm.angle, Math.PI * 2 - pm.angle);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // 3. Vẽ Bóng Ma
        for (const g of state.ghosts) {
            ctx.save();
            ctx.fillStyle = g.isFrightened ? '#0055ff' : g.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = g.isFrightened ? '#0055ff' : g.color;

            ctx.beginPath();
            // Đầu bo cung tròn
            ctx.arc(g.x, g.y - 2, TILE_SIZE / 2 - 1, Math.PI, 0, false);
            // Thân dẹt xuống dưới
            ctx.lineTo(g.x + TILE_SIZE / 2 - 1, g.y + TILE_SIZE / 2 - 1);
            // Đuôi chân lượn sóng zic-zac
            ctx.lineTo(g.x + TILE_SIZE / 4, g.y + TILE_SIZE / 4);
            ctx.lineTo(g.x, g.y + TILE_SIZE / 2 - 1);
            ctx.lineTo(g.x - TILE_SIZE / 4, g.y + TILE_SIZE / 4);
            ctx.lineTo(g.x - TILE_SIZE / 2 + 1, g.y + TILE_SIZE / 2 - 1);
            ctx.closePath();
            ctx.fill();

            // Vẽ mắt nhỏ màu trắng
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(g.x - 3, g.y - 3, 2.5, 0, Math.PI * 2);
            ctx.arc(g.x + 3, g.y - 3, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Vẽ con ngươi màu xanh dương đuôi mắt
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(g.x - 3 + g.dirX, g.y - 3 + g.dirY, 1, 0, Math.PI * 2);
            ctx.arc(g.x + 3 + g.dirX, g.y - 3 + g.dirY, 1, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    function animate() {
        if (!state.gameActive) return;
        update();
        draw();
        state.animationId = requestAnimationFrame(animate);
    }

    function handleGameOver() {
        state.gameActive = false;
        cancelAnimationFrame(state.animationId);
        alert('GAME OVER! Tổng điểm ăn chấm: ' + state.score);
        pacmanLobby.classList.remove('hidden');
        pacmanGameArea.classList.add('hidden');
    }

    // --- KEY LISTENERS ---
    window.addEventListener('keydown', function (e) {
        const view = document.getElementById('pacmanView');
        if (view.classList.contains('hidden')) return;

        state.keys[e.key] = true;
        // Chặn phím mũi tên làm cuộn màn hình
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        }
    });

    window.addEventListener('keyup', function (e) {
        state.keys[e.key] = false;
    });

    // --- BUTTONS ---
    btnStartPacman.addEventListener('click', function () {
        pacmanLobby.classList.add('hidden');
        pacmanGameArea.classList.remove('hidden');
        initGame();
    });

    btnQuitPacman.addEventListener('click', function () {
        state.gameActive = false;
        cancelAnimationFrame(state.animationId);
        pacmanLobby.classList.remove('hidden');
        pacmanGameArea.classList.add('hidden');
    });
})();
