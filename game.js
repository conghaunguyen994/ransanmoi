	// game.js - Neon Snake Game

// Lấy tham chiếu đến Canvas và Context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Trạng thái cấu hình game
const GRID_SIZE = 20; // 20x20 ô lưới
const TILE_COUNT = canvas.width / GRID_SIZE; // Số pixel mỗi ô (400 / 20 = 20px)

// Bảng màu Neon chủ đạo đổi theo cấp độ (cứ mỗi 100 điểm)
const COLOR_PALETTES = [
    '#39ff14', // Xanh lá neon
    '#ff007f', // Hồng neon
    '#00f0ff', // Xanh dương neon
    '#ff7300', // Cam neon
    '#b026ff'  // Tím neon
];

// Đối tượng trạng thái game (Game State Model)
const gameState = {
    score: 0,
    highScoreClassic: 0,
    highScoreChallenge: 0,
    gameStatus: 'MENU', // MENU | PLAYING | PAUSED | GAME_OVER
    mode: 'CLASSIC', // CLASSIC | CHALLENGE
    
    // Tự động lái của Admin
    autopilot: false,
    adminSequence: '', // Theo dõi chuỗi phím gõ của người dùng
    
    // Màu sắc neon hiện tại
    neonColor: '#39ff14',
    colorIndex: 0,
    
    // Hiệu ứng rung màn hình
    shakeFrames: 0,
    
    // Rắn (mảng tọa độ các đốt, đầu ở index 0)
    snake: [],
    direction: 'RIGHT', // UP | DOWN | LEFT | RIGHT
    inputQueue: [], // Hàng đợi điều khiển
    
    // Mồi và vật cản
    food: { x: -1, y: -1 },
    obstacles: [],
    
    // Hệ thống hạt (particle effects)
    particles: [],
    
    // Tốc độ và Game loop timer
    speed: 150, // ms mỗi tick (tốc độ khởi đầu)
    gameInterval: null
};

// --- LOGIC TÌM ĐƯỜNG TỰ ĐỘNG (BFS PATHFINDING FOR AUTOPILOT) ---

// Thuật toán BFS tìm hướng đi tối ưu kế tiếp từ đầu rắn đến mồi
function calculateAutopilotDirection() {
    const head = gameState.snake[0];
    const target = gameState.food;
    
    // Hàng đợi BFS chứa các nút: { x, y, path: [] }
    const queue = [{ x: head.x, y: head.y, path: [] }];
    
    // Ma trận đánh dấu đã đi qua để tránh lặp
    const visited = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
    visited[head.x][head.y] = true;
    
    // Đánh dấu thân rắn làm vật cản (trừ đốt đuôi cùng vì nó sẽ đi ra sau tick tiếp theo)
    gameState.snake.forEach((segment, index) => {
        if (index < gameState.snake.length - 1) {
            visited[segment.x][segment.y] = true;
        }
    });
    
    // Đánh dấu các chướng ngại vật trong Challenge Mode
    if (gameState.mode === 'CHALLENGE') {
        gameState.obstacles.forEach(obs => {
            visited[obs.x][obs.y] = true;
        });
    }
    
    let shortestPath = null;
    
    // 4 hướng di chuyển cơ bản
    const moves = [
        { name: 'UP', dx: 0, dy: -1 },
        { name: 'DOWN', dx: 0, dy: 1 },
        { name: 'LEFT', dx: -1, dy: 0 },
        { name: 'RIGHT', dx: 1, dy: 0 }
    ];
    
    // Duyệt tìm đường đi ngắn nhất
    while (queue.length > 0) {
        const current = queue.shift();
        
        // Đã tìm thấy mồi
        if (current.x === target.x && current.y === target.y) {
            shortestPath = current.path;
            break;
        }
        
        for (let m of moves) {
            // Tính tọa độ có xử lý đi xuyên biên (wrap-around)
            let nextX = (current.x + m.dx + GRID_SIZE) % GRID_SIZE;
            let nextY = (current.y + m.dy + GRID_SIZE) % GRID_SIZE;
            
            if (!visited[nextX][nextY]) {
                visited[nextX][nextY] = true;
                queue.push({
                    x: nextX,
                    y: nextY,
                    path: [...current.path, m.name]
                });
            }
        }
    }
    
    // Nếu tìm thấy đường đi trực tiếp, chọn bước đầu tiên của đường đi
    if (shortestPath && shortestPath.length > 0) {
        return shortestPath[0];
    }
    
    // --- CHẾ ĐỘ SỐNG SÓT (SURVIVAL FALLBACK) ---
    // Khi bị bao vây hoặc kẹt cứng (không có đường đến mồi), tìm ô trống an toàn bất kỳ để đi tiếp
    const safeMoves = moves.filter(m => {
        let nextX = (head.x + m.dx + GRID_SIZE) % GRID_SIZE;
        let nextY = (head.y + m.dy + GRID_SIZE) % GRID_SIZE;
        
        // Kiểm tra xem ô tiếp theo có đè vào thân rắn không
        let hitSnake = false;
        gameState.snake.forEach((segment, index) => {
            if (index < gameState.snake.length - 1 && segment.x === nextX && segment.y === nextY) {
                hitSnake = true;
            }
        });
        
        // Kiểm tra xem ô tiếp theo có đè vào chướng ngại vật không
        let hitObstacle = false;
        if (gameState.mode === 'CHALLENGE') {
            hitObstacle = gameState.obstacles.some(obs => obs.x === nextX && obs.y === nextY);
        }
        
        return !hitSnake && !hitObstacle;
    });
    
    if (safeMoves.length > 0) {
        // Sắp xếp các ô an toàn theo khoảng cách Manhattan đến mồi để ưu tiên bò về phía mồi
        safeMoves.sort((a, b) => {
            const nextAX = (head.x + a.dx + GRID_SIZE) % GRID_SIZE;
            const nextAY = (head.y + a.dy + GRID_SIZE) % GRID_SIZE;
            const nextBX = (head.x + b.dx + GRID_SIZE) % GRID_SIZE;
            const nextBY = (head.y + b.dy + GRID_SIZE) % GRID_SIZE;
            
            const distA = Math.abs(nextAX - target.x) + Math.abs(nextAY - target.y);
            const distB = Math.abs(nextBX - target.x) + Math.abs(nextBY - target.y);
            return distA - distB;
        });
        return safeMoves[0].name;
    }
    
    // Không còn đường trống nào, giữ nguyên hướng đi cũ để chấp nhận thua cuộc
    return gameState.direction;
}

// --- LOGIC SINH CHƯỚNG NGẠI VẬT (CHALLENGE MODE) ---

// Sinh ngẫu nhiên 5 chướng ngại vật tĩnh
function generateObstacles() {
    gameState.obstacles = [];
    while (gameState.obstacles.length < 5) {
        const obs = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
        };
        
        // Tránh đè lên rắn bắt đầu (X từ 7 đến 10, Y = 10)
        // Cách xa đầu rắn ban đầu (X = 10, Y = 10) ít nhất 3 bước đi
        const startDist = Math.abs(obs.x - 10) + Math.abs(obs.y - 10);
        if (startDist < 4) continue;
        
        // Tránh trùng chướng ngại vật trước đó
        let duplicate = false;
        for (let existing of gameState.obstacles) {
            if (existing.x === obs.x && existing.y === obs.y) {
                duplicate = true;
                break;
            }
        }
        if (duplicate) continue;
        
        gameState.obstacles.push(obs);
    }
}

// --- LOGIC SINH MỒI ---

// Sinh mồi ngẫu nhiên ở một ô trống trên lưới
function generateFood() {
    let newFood;
    let overlap;
    do {
        overlap = false;
        newFood = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
        };
        
        // Tránh sinh mồi đè lên rắn
        for (let segment of gameState.snake) {
            if (segment.x === newFood.x && segment.y === newFood.y) {
                overlap = true;
                break;
            }
        }
        
        // Tránh sinh mồi đè lên chướng ngại vật
        if (gameState.mode === 'CHALLENGE') {
            for (let obs of gameState.obstacles) {
                if (obs.x === newFood.x && obs.y === newFood.y) {
                    overlap = true;
                    break;
                }
            }
        }
    } while (overlap);
    
    gameState.food = newFood;
}

// --- HỆ THỐNG HẠT BỤI SÁNG (PARTICLES) ---

// Khởi tạo các hạt sáng tại vị trí ăn mồi
function createParticles(foodX, foodY) {
    const px = foodX * TILE_COUNT + TILE_COUNT / 2;
    const py = foodY * TILE_COUNT + TILE_COUNT / 2;
    
    for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1.5;
        gameState.particles.push({
            x: px,
            y: py,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: '#ffe600', // Màu vàng neon phát sáng cho mồi
            alpha: 1,
            decay: Math.random() * 0.05 + 0.03
        });
    }
}

// Cập nhật và vẽ các hạt sáng
function updateAndDrawParticles() {
    ctx.save();
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const p = gameState.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        
        if (p.alpha <= 0) {
            gameState.particles.splice(i, 1);
        } else {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.shadowBlur = 6;
            ctx.shadowColor = p.color;
            ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        }
    }
    ctx.restore();
}

// --- LOGIC DI CHUYỂN & VÒNG LẶP GAME ---

// Khởi chạy game từ Menu hoặc Restart
function startGame() {
    // Reset trạng thái
    gameState.score = 0;
    gameState.direction = 'RIGHT';
    gameState.inputQueue = [];
    gameState.gameStatus = 'PLAYING';
    gameState.speed = 150; // Trở lại tốc độ ban đầu
    gameState.particles = [];
    gameState.colorIndex = 0;
    gameState.neonColor = COLOR_PALETTES[0];
    gameState.autopilot = false; // Reset autopilot
    gameState.adminSequence = '';
    
    // Cập nhật bảng màu UI theo mặc định
    updateUIColors();
    
    // Khởi tạo rắn ở giữa màn hình (độ dài 4)
    gameState.snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 },
        { x: 7, y: 10 }
    ];
    
    // Nếu chế độ là Challenge, sinh vật cản
    if (gameState.mode === 'CHALLENGE') {
        generateObstacles();
    } else {
        gameState.obstacles = [];
    }
    
    // Sinh mồi ban đầu
    generateFood();
    
    // Cập nhật UI
    document.getElementById('currentScore').innerText = gameState.score;
    
    // Hiển thị điểm cao tương ứng của chế độ hiện tại
    const highScoreVal = gameState.mode === 'CLASSIC' ? gameState.highScoreClassic : gameState.highScoreChallenge;
    const headerLabel = gameState.mode === 'CLASSIC' ? 'CLASSIC HIGH' : 'CHALLENGE HIGH';
    
    document.querySelector('.score-board').innerHTML = `
        <div class="score-item">SCORE <span id="currentScore" style="color: ${gameState.neonColor}; text-shadow: 0 0 8px ${gameState.neonColor};">${gameState.score}</span></div>
        <div class="score-item">${headerLabel} <span id="highScoreText" style="color: ${gameState.neonColor}; text-shadow: 0 0 8px ${gameState.neonColor};">${highScoreVal}</span></div>
    `;
    
    document.getElementById('footerText').innerHTML = 'NHẤN <span style="color:#ff007f; text-shadow:0 0 5px #ff007f;">ESC</span> HOẶC <span style="color:#ff007f; text-shadow:0 0 5px #ff007f;">P</span> ĐỂ TẠM DỪNG';
    
    // Khởi chạy loop
    if (gameState.gameInterval) clearInterval(gameState.gameInterval);
    gameState.gameInterval = setInterval(gameTick, gameState.speed);
}

// Cập nhật màu sắc giao diện theo màu neon chủ đạo hiện hành
function updateUIColors() {
    const canvasEl = document.getElementById('gameCanvas');
    canvasEl.style.borderColor = gameState.neonColor;
    canvasEl.style.boxShadow = `0 0 15px ${gameState.neonColor}`;
    
    const scoreVal = document.getElementById('currentScore');
    if (scoreVal) {
        scoreVal.style.color = gameState.neonColor;
        scoreVal.style.textShadow = `0 0 8px ${gameState.neonColor}`;
    }
    
    const hsVal = document.getElementById('highScoreText');
    if (hsVal) {
        hsVal.style.color = gameState.neonColor;
        hsVal.style.textShadow = `0 0 8px ${gameState.neonColor}`;
    }
}

// Tick xử lý logic sau mỗi khoảng thời gian 'speed'
function gameTick() {
    if (gameState.gameStatus !== 'PLAYING') return;

    // 1. Xử lý hướng đi từ Autopilot hoặc hàng đợi inputQueue
    if (gameState.autopilot) {
        gameState.direction = calculateAutopilotDirection();
        gameState.inputQueue = []; // Xóa hàng đợi tay khi lái tự động
    } else if (gameState.inputQueue.length > 0) {
        const nextDirection = gameState.inputQueue.shift();
        if (!isOpposite(nextDirection, gameState.direction)) {
            gameState.direction = nextDirection;
        }
    }

    // 2. Tính toán vị trí đầu mới của rắn
    const head = { ...gameState.snake[0] };
    if (gameState.direction === 'LEFT') head.x -= 1;
    else if (gameState.direction === 'RIGHT') head.x += 1;
    else if (gameState.direction === 'UP') head.y -= 1;
    else if (gameState.direction === 'DOWN') head.y += 1;

    // 3. Cơ chế đi xuyên tường (Wrap Around)
    head.x = (head.x + GRID_SIZE) % GRID_SIZE;
    head.y = (head.y + GRID_SIZE) % GRID_SIZE;

    // 4. Kiểm tra va chạm với chướng ngại vật (Challenge Mode)
    if (gameState.mode === 'CHALLENGE') {
        for (let obs of gameState.obstacles) {
            if (obs.x === head.x && obs.y === head.y) {
                triggerGameOver();
                return;
            }
        }
    }

    // 5. Kiểm tra va chạm với chính đuôi rắn (bỏ qua đốt đuôi cuối cùng vì nó sẽ di chuyển đi)
    for (let i = 0; i < gameState.snake.length - 1; i++) {
        if (gameState.snake[i].x === head.x && gameState.snake[i].y === head.y) {
            triggerGameOver();
            return;
        }
    }

    // 6. Cập nhật vị trí rắn (Thêm đầu)
    gameState.snake.unshift(head);

    // 7. Kiểm tra Rắn có ăn Mồi không
    if (head.x === gameState.food.x && head.y === gameState.food.y) {
        // Tăng điểm
        gameState.score += 10;
        document.getElementById('currentScore').innerText = gameState.score;
        
        // Tạo hiệu ứng hạt bụi sáng và rung màn hình
        createParticles(gameState.food.x, gameState.food.y);
        gameState.shakeFrames = 6; // Rung màn hình trong 6 frames (100ms)
        
        // Kiểm tra đổi màu Neon theo điểm số (mỗi 100 điểm)
        const newColorIndex = Math.floor(gameState.score / 100) % COLOR_PALETTES.length;
        if (newColorIndex !== gameState.colorIndex) {
            gameState.colorIndex = newColorIndex;
            gameState.neonColor = COLOR_PALETTES[newColorIndex];
            updateUIColors();
        }
        
        // Sinh mồi mới
        generateFood();
        
        // Tăng tốc độ game (giảm 5ms, chặn ở tối đa 50ms)
        const oldSpeed = gameState.speed;
        gameState.speed = Math.max(50, gameState.speed - 5);
        
        if (gameState.speed !== oldSpeed) {
            clearInterval(gameState.gameInterval);
            gameState.gameInterval = setInterval(gameTick, gameState.speed);
        }
    } else {
        // Nếu không ăn mồi, bỏ đốt ở đuôi
        gameState.snake.pop();
    }

    // 8. Vẽ lại giao diện
    render();
}

// Kiểm tra hai hướng có đối ngược nhau không
function isOpposite(dir1, dir2) {
    if (dir1 === 'LEFT' && dir2 === 'RIGHT') return true;
    if (dir1 === 'RIGHT' && dir2 === 'LEFT') return true;
    if (dir1 === 'UP' && dir2 === 'DOWN') return true;
    if (dir1 === 'DOWN' && dir2 === 'UP') return true;
    return false;
}

// Kích hoạt trạng thái tạm dừng (Pause)
function togglePause() {
    if (gameState.gameStatus === 'PLAYING') {
        gameState.gameStatus = 'PAUSED';
        clearInterval(gameState.gameInterval);
        renderPauseOverlay();
    } else if (gameState.gameStatus === 'PAUSED') {
        gameState.gameStatus = 'PLAYING';
        gameState.gameInterval = setInterval(gameTick, gameState.speed);
    }
}

// Xử lý Game Over
function triggerGameOver() {
    gameState.gameStatus = 'GAME_OVER';
    clearInterval(gameState.gameInterval);
    
    let isNewHighScore = false;
    
    if (gameState.mode === 'CLASSIC') {
        if (gameState.score > gameState.highScoreClassic) {
            gameState.highScoreClassic = gameState.score;
            localStorage.setItem('neon_snake_classic_high', gameState.highScoreClassic);
            isNewHighScore = true;
        }
    } else {
        if (gameState.score > gameState.highScoreChallenge) {
            gameState.highScoreChallenge = gameState.score;
            localStorage.setItem('neon_snake_challenge_high', gameState.highScoreChallenge);
            isNewHighScore = true;
        }
    }
    
    renderGameOverOverlay(isNewHighScore);
}

// --- LOGIC HÌNH ẢNH & RENDERING ---

// Hàm render toàn bộ bàn chơi
function render() {
    // 1. Áp dụng hiệu ứng Rung màn hình nếu có
    ctx.save();
    if (gameState.shakeFrames > 0) {
        const dx = (Math.random() - 0.5) * 6;
        const dy = (Math.random() - 0.5) * 6;
        ctx.translate(dx, dy);
        gameState.shakeFrames--;
    }
    
    // Vẽ nền tối của Canvas
    ctx.fillStyle = '#07080c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Vẽ lưới ô mờ
    drawGrid();

    // Vẽ chướng ngại vật (Challenge Mode)
    if (gameState.mode === 'CHALLENGE') {
        drawObstacles();
    }

    // Vẽ Rắn Neon
    drawSnake();
    
    // Vẽ Mồi Neon
    drawFood();
    
    // Cập nhật và vẽ các hạt bụi sáng
    updateAndDrawParticles();
    
    // Vẽ nhãn trạng thái Autopilot nếu đang hoạt động
    if (gameState.autopilot) {
        ctx.save();
        ctx.fillStyle = '#ffe600'; // Màu vàng neon phát sáng
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ffe600';
        ctx.font = "bold 11px 'Outfit', sans-serif";
        ctx.textAlign = 'right';
        ctx.fillText('⚡ AUTO-PILOT ON', canvas.width - 15, 25);
        ctx.restore();
    }
    
    ctx.restore(); // Khôi phục trạng thái translate rung màn hình
}

// Hàm vẽ lưới
function drawGrid() {
    ctx.strokeStyle = 'rgba(34, 36, 54, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE_COUNT, 0);
        ctx.lineTo(i * TILE_COUNT, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * TILE_COUNT);
        ctx.lineTo(canvas.width, i * TILE_COUNT);
        ctx.stroke();
    }
}

// Hàm vẽ chướng ngại vật (Các khối phát sáng màu vàng)
function drawObstacles() {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffe600';
    ctx.fillStyle = '#ffe600';
    
    gameState.obstacles.forEach(obs => {
        ctx.fillRect(obs.x * TILE_COUNT + 1, obs.y * TILE_COUNT + 1, TILE_COUNT - 2, TILE_COUNT - 2);
    });
    ctx.restore();
}

// Hàm vẽ Rắn với hiệu ứng Neon phát sáng
function drawSnake() {
    ctx.save();
    
    // Cấu hình bóng mờ neon phát sáng theo màu chủ đạo hiện tại
    ctx.shadowBlur = 10;
    ctx.shadowColor = gameState.neonColor;
    ctx.fillStyle = gameState.neonColor;
    
    gameState.snake.forEach((segment, index) => {
        if (index === 0) {
            // Làm đầu rắn sáng nổi bật hơn body (màu trắng neon)
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.fillRect(segment.x * TILE_COUNT + 1, segment.y * TILE_COUNT + 1, TILE_COUNT - 2, TILE_COUNT - 2);
            ctx.fillStyle = gameState.neonColor;
            ctx.shadowColor = gameState.neonColor;
        } else {
            ctx.fillRect(segment.x * TILE_COUNT + 1, segment.y * TILE_COUNT + 1, TILE_COUNT - 2, TILE_COUNT - 2);
        }
    });
    
    ctx.restore();
}

// Hàm vẽ Mồi Neon (Hình tròn phát sáng màu đỏ/hồng neon)
function drawFood() {
    if (gameState.food.x === -1 || gameState.food.y === -1) return;
    
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ff007f';
    ctx.fillStyle = '#ff007f';
    
    const radius = TILE_COUNT / 2 - 2;
    const centerX = gameState.food.x * TILE_COUNT + TILE_COUNT / 2;
    const centerY = gameState.food.y * TILE_COUNT + TILE_COUNT / 2;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Vẽ tâm sáng màu trắng
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius / 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// Vẽ lớp phủ Pause
function renderPauseOverlay() {
    ctx.fillStyle = 'rgba(7, 8, 12, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = gameState.neonColor;
    ctx.fillStyle = gameState.neonColor;
    ctx.font = "bold 32px 'Outfit', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    ctx.restore();
    
    document.getElementById('footerText').innerHTML = 'NHẤN <span style="color:#39ff14; text-shadow:0 0 5px #39ff14;">ESC</span> ĐỂ TIẾP TỤC HOẶC <span style="color:#ff007f; text-shadow:0 0 5px #ff007f;">R</span> ĐỂ CHƠI LẠI';
}

// Vẽ lớp phủ Game Over
function renderGameOverOverlay(isNewHighScore) {
    ctx.fillStyle = 'rgba(7, 8, 12, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff007f';
    ctx.fillStyle = '#ff007f';
    ctx.font = "bold 36px 'Outfit', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);
    
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 5;
    ctx.font = "20px 'Courier New', monospace";
    ctx.fillText(`SCORE: ${gameState.score}`, canvas.width / 2, canvas.height / 2 + 10);
    
    if (isNewHighScore) {
        ctx.fillStyle = '#ffe600';
        ctx.shadowColor = '#ffe600';
        ctx.shadowBlur = 10;
        ctx.font = "bold 16px 'Outfit', sans-serif";
        ctx.fillText('NEW HIGH SCORE!', canvas.width / 2, canvas.height / 2 + 45);
    }
    
    ctx.restore();
    
    document.getElementById('footerText').innerHTML = 'NHẤN <span style="color:#39ff14; text-shadow:0 0 5px #39ff14;">ENTER</span> ĐỂ CHƠI LẠI HOẶC <span style="color:#ff007f; text-shadow:0 0 5px #ff007f;">ESC</span> VỀ MENU';
}

// Màn hình Menu chính lựa chọn chế độ chơi
function drawMenu() {
    ctx.fillStyle = '#07080c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    
    ctx.save();
    // Tiêu đề NEON SNAKE phát sáng
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#39ff14';
    ctx.fillStyle = '#39ff14';
    ctx.font = "bold 32px 'Outfit', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('NEON SNAKE', canvas.width / 2, canvas.height / 2 - 60);
    
    // Các tùy chọn menu
    ctx.font = "bold 16px 'Outfit', sans-serif";
    
    // Classic Mode
    if (gameState.mode === 'CLASSIC') {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#39ff14';
        ctx.fillText('▶  CLASSIC MODE  ◀', canvas.width / 2, canvas.height / 2 + 10);
    } else {
        ctx.fillStyle = '#8f92a1';
        ctx.shadowBlur = 0;
        ctx.fillText('CLASSIC MODE', canvas.width / 2, canvas.height / 2 + 10);
    }
    
    // Challenge Mode
    if (gameState.mode === 'CHALLENGE') {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff007f';
        ctx.fillText('▶  CHALLENGE MODE  ◀', canvas.width / 2, canvas.height / 2 + 45);
    } else {
        ctx.fillStyle = '#8f92a1';
        ctx.shadowBlur = 0;
        ctx.fillText('CHALLENGE MODE', canvas.width / 2, canvas.height / 2 + 45);
    }
    
    // Hướng dẫn nhanh ở cuối
    ctx.fillStyle = '#8f92a1';
    ctx.shadowBlur = 0;
    ctx.font = "12px 'Inter', sans-serif";
    ctx.fillText('ẤN PHÍM LÊN / XUỐNG ĐỂ CHỌN CHẾ ĐỘ', canvas.width / 2, canvas.height / 2 + 100);
    ctx.fillText('NHẤN ENTER ĐỂ BẮT ĐẦU CHƠI', canvas.width / 2, canvas.height / 2 + 120);
    
    ctx.restore();
}
// --- XỬ LÝ LẮNG NGHE BÀN PHÍM ---

window.addEventListener('keydown', (e) => {
    // 0. Bỏ qua phím nếu đang tập trung vào ô nhập văn bản (nhập mã phòng, nickname)
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
    }
    
    // Chỉ hoạt động khi Snake View đang active
    if (document.getElementById('snakeView').classList.contains('hidden')) {
        return;
    }

    const key = e.key;
    
    // 1. Phím tắt điều khiển khi ở trạng thái MENU
    if (gameState.gameStatus === 'MENU') {
        if (key === 'ArrowUp' || key.toLowerCase() === 'w' || key === 'ArrowDown' || key.toLowerCase() === 's') {
            // Đảo ngược lựa chọn chế độ
            gameState.mode = gameState.mode === 'CLASSIC' ? 'CHALLENGE' : 'CLASSIC';
            drawMenu();
            e.preventDefault();
            return;
        }
        if (key === 'Enter' || key === ' ') {
            startGame();
            return;
        }
    }
    
    // 2. Phím tắt điều khiển khi ở trạng thái GAME_OVER
    if (gameState.gameStatus === 'GAME_OVER') {
        if (key === 'Enter' || key === ' ') {
            startGame();
            return;
        }
        if (key === 'Escape') {
            gameState.gameStatus = 'MENU';
            drawMenu();
            
            // Cập nhật lại UI scoreboard ban đầu
            const hsVal = parseInt(localStorage.getItem('neon_snake_classic_high')) || 0;
            document.querySelector('.score-board').innerHTML = `
                <div class="score-item">SCORE <span id="currentScore">0</span></div>
                <div class="score-item">CLASSIC HIGH <span id="classicHighScore">${hsVal}</span></div>
            `;
            document.getElementById('footerText').innerHTML = 'NHẤN <span class="blink">ENTER</span> ĐỂ BẮT ĐẦU';
            return;
        }
    }
    
    // 3. Phím tắt điều khiển khi đang chơi hoặc tạm dừng
    if (gameState.gameStatus === 'PLAYING' || gameState.gameStatus === 'PAUSED') {
        if (key === 'Escape' || key.toLowerCase() === 'p') {
            togglePause();
            return;
        }
    }
    
    if (key.toLowerCase() === 'r') {
        startGame();
        return;
    }
    
    // 4. Phím điều khiển hướng đi của Rắn (chỉ nhận khi đang chơi)
    if (gameState.gameStatus === 'PLAYING') {
        let newDir = null;
        if (key === 'ArrowUp' || key.toLowerCase() === 'w') newDir = 'UP';
        else if (key === 'ArrowDown' || key.toLowerCase() === 's') newDir = 'DOWN';
        else if (key === 'ArrowLeft' || key.toLowerCase() === 'a') newDir = 'LEFT';
        else if (key === 'ArrowRight' || key.toLowerCase() === 'd') newDir = 'RIGHT';
        
        if (newDir) {
            const lastQueuedDir = gameState.inputQueue.length > 0 ? gameState.inputQueue[gameState.inputQueue.length - 1] : gameState.direction;
            if (newDir !== lastQueuedDir && !isOpposite(newDir, lastQueuedDir)) {
                gameState.inputQueue.push(newDir);
            }
            e.preventDefault(); // Ngăn cuộn trang web
        }
        
        // 5. Theo dõi nhập phím tuần tự để phát hiện cheat code Admin kích hoạt Autopilot
        const char = key.toLowerCase();
        if (char.length === 1 && /[a-z]/.test(char)) {
            gameState.adminSequence += char;
            if (gameState.adminSequence.length > 10) {
                gameState.adminSequence = gameState.adminSequence.substring(gameState.adminSequence.length - 10);
            }
            
            // Nếu người dùng gõ từ khóa "admin" hoặc "auto"
            if (gameState.adminSequence.endsWith('admin') || gameState.adminSequence.endsWith('auto')) {
                gameState.autopilot = !gameState.autopilot;
                gameState.adminSequence = ''; // Reset
                console.log(`Admin Autopilot Mode: ${gameState.autopilot ? 'ENABLED' : 'DISABLED'}`);
            }
        }
    }
});

// Khởi chạy khi tài liệu HTML tải xong
window.addEventListener('DOMContentLoaded', () => {
    // Load điểm cao từ LocalStorage
    gameState.highScoreClassic = parseInt(localStorage.getItem('neon_snake_classic_high')) || 0;
    gameState.highScoreChallenge = parseInt(localStorage.getItem('neon_snake_challenge_high')) || 0;
    
    // Hiển thị điểm cao trên UI
    const hsVal = document.getElementById('classicHighScore');
    if (hsVal) {
        hsVal.innerText = gameState.highScoreClassic;
    }
    
    // Vẽ bảng Menu chính ban đầu
    drawMenu();
    console.log('Neon Snake initialized successfully with Menu.');
    
    // Thiết lập chuyển đổi View trên Menubar
    document.getElementById('btnHome').addEventListener('click', () => {
        document.getElementById('btnHome').classList.add('active');
        document.getElementById('btnSnake').classList.remove('active');
        document.getElementById('btnCaro').classList.remove('active');
        document.getElementById('btnDino').classList.remove('active');
        document.getElementById('btnChess').classList.remove('active');
        document.getElementById('btnXiangqi').classList.remove('active');
        document.getElementById('btnMiner').classList.remove('active');
        document.getElementById('btnTetris').classList.remove('active');
        document.getElementById('btnPikachu').classList.remove('active');
        document.getElementById('btnSolitaire').classList.remove('active');
        document.getElementById('btnInvaders').classList.remove('active');
        document.getElementById('btnPacman').classList.remove('active');
        document.getElementById('btnBreaker').classList.remove('active');
        document.getElementById('btn2048').classList.remove('active');
        
        document.getElementById('dashboardView').classList.remove('hidden');
        document.getElementById('snakeView').classList.add('hidden');
        document.getElementById('caroView').classList.add('hidden');
        document.getElementById('dinoView').classList.add('hidden');
        document.getElementById('chessView').classList.add('hidden');
        document.getElementById('xiangqiView').classList.add('hidden');
        document.getElementById('minerView').classList.add('hidden');
        document.getElementById('tetrisView').classList.add('hidden');
        document.getElementById('pikachuView').classList.add('hidden');
        document.getElementById('solitaireView').classList.add('hidden');
        document.getElementById('invadersView').classList.add('hidden');
        document.getElementById('pacmanView').classList.add('hidden');
        document.getElementById('breakerView').classList.add('hidden');
        document.getElementById('game2048View').classList.add('hidden');
        
        // Tự động tạm dừng game Rắn nếu đang chơi để tránh rắn tự chết
        if (gameState.gameStatus === 'PLAYING') {
            togglePause();
        }
    });

    document.getElementById('btnSnake').addEventListener('click', () => {
        document.getElementById('btnTetris').classList.remove('active');
        document.getElementById('btnPikachu').classList.remove('active');
        document.getElementById('btnSolitaire').classList.remove('active');
        document.getElementById('btnInvaders').classList.remove('active');
        document.getElementById('btnPacman').classList.remove('active');
        document.getElementById('btnBreaker').classList.remove('active');
        document.getElementById('btn2048').classList.remove('active');
        
        document.getElementById('snakeView').classList.remove('hidden');
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('caroView').classList.add('hidden');
        document.getElementById('dinoView').classList.add('hidden');
        document.getElementById('chessView').classList.add('hidden');
        document.getElementById('xiangqiView').classList.add('hidden');
        document.getElementById('minerView').classList.add('hidden');
        document.getElementById('tetrisView').classList.add('hidden');
        document.getElementById('pikachuView').classList.add('hidden');
        document.getElementById('solitaireView').classList.add('hidden');
        document.getElementById('invadersView').classList.add('hidden');
        document.getElementById('pacmanView').classList.add('hidden');
        document.getElementById('breakerView').classList.add('hidden');
        document.getElementById('game2048View').classList.add('hidden');
        
        // Vẽ lại bảng Snake để đảm bảo hiển thị đúng
        if (gameState.gameStatus === 'MENU') {
            drawMenu();
        } else if (gameState.gameStatus === 'PLAYING') {
            render();
        } else if (gameState.gameStatus === 'PAUSED') {
            renderPauseOverlay();
        } else if (gameState.gameStatus === 'GAME_OVER') {
            renderGameOverOverlay(gameState.score > gameState.highScoreClassic);
        }
    });

    document.getElementById('btnCaro').addEventListener('click', () => {
        document.getElementById('btnCaro').classList.add('active');
        document.getElementById('btnHome').classList.remove('active');
        document.getElementById('btnSnake').classList.remove('active');
        document.getElementById('btnDino').classList.remove('active');
        document.getElementById('btnChess').classList.remove('active');
        document.getElementById('btnXiangqi').classList.remove('active');
        document.getElementById('btnMiner').classList.remove('active');
        document.getElementById('btnSolitaire').classList.remove('active');
        document.getElementById('btnInvaders').classList.remove('active');
        document.getElementById('btnPacman').classList.remove('active');
        document.getElementById('btnBreaker').classList.remove('active');
        document.getElementById('btn2048').classList.remove('active');
        
        document.getElementById('caroView').classList.remove('hidden');
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('snakeView').classList.add('hidden');
        document.getElementById('dinoView').classList.add('hidden');
        document.getElementById('chessView').classList.add('hidden');
        document.getElementById('xiangqiView').classList.add('hidden');
        document.getElementById('minerView').classList.add('hidden');
        document.getElementById('tetrisView').classList.add('hidden');
        document.getElementById('pikachuView').classList.add('hidden');
        document.getElementById('solitaireView').classList.add('hidden');
        document.getElementById('invadersView').classList.add('hidden');
        document.getElementById('pacmanView').classList.add('hidden');
        document.getElementById('breakerView').classList.add('hidden');
        document.getElementById('game2048View').classList.add('hidden');
        
        // Tự động tạm dừng game Rắn nếu đang chơi để tránh rắn tự chết
        if (gameState.gameStatus === 'PLAYING') {
            togglePause();
        }
    });

    document.getElementById('btnDino').addEventListener('click', () => {
        document.getElementById('btnDino').classList.add('active');
        document.getElementById('btnHome').classList.remove('active');
        document.getElementById('btnSnake').classList.remove('active');
        document.getElementById('btnCaro').classList.remove('active');
        document.getElementById('btnChess').classList.remove('active');
        document.getElementById('btnXiangqi').classList.remove('active');
        document.getElementById('btnMiner').classList.remove('active');
        document.getElementById('btnSolitaire').classList.remove('active');
        document.getElementById('btnInvaders').classList.remove('active');
        document.getElementById('btnPacman').classList.remove('active');
        document.getElementById('btnBreaker').classList.remove('active');
        document.getElementById('btn2048').classList.remove('active');
        
        document.getElementById('dinoView').classList.remove('hidden');
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('snakeView').classList.add('hidden');
        document.getElementById('caroView').classList.add('hidden');
        document.getElementById('chessView').classList.add('hidden');
        document.getElementById('xiangqiView').classList.add('hidden');
        document.getElementById('minerView').classList.add('hidden');
        document.getElementById('tetrisView').classList.add('hidden');
        document.getElementById('pikachuView').classList.add('hidden');
        document.getElementById('solitaireView').classList.add('hidden');
        document.getElementById('invadersView').classList.add('hidden');
        document.getElementById('pacmanView').classList.add('hidden');
        document.getElementById('breakerView').classList.add('hidden');
        document.getElementById('game2048View').classList.add('hidden');
        
        // Tự động tạm dừng game Rắn nếu đang chơi để tránh rắn tự chết
        if (gameState.gameStatus === 'PLAYING') {
            togglePause();
        }
    });

    document.getElementById('btnChess').addEventListener('click', () => {
        document.getElementById('btnChess').classList.add('active');
        document.getElementById('btnHome').classList.remove('active');
        document.getElementById('btnSnake').classList.remove('active');
        document.getElementById('btnCaro').classList.remove('active');
        document.getElementById('btnDino').classList.remove('active');
        document.getElementById('btnXiangqi').classList.remove('active');
        document.getElementById('btnMiner').classList.remove('active');
        document.getElementById('btnSolitaire').classList.remove('active');
        document.getElementById('btnInvaders').classList.remove('active');
        document.getElementById('btnPacman').classList.remove('active');
        document.getElementById('btnBreaker').classList.remove('active');
        document.getElementById('btn2048').classList.remove('active');
        
        document.getElementById('chessView').classList.remove('hidden');
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('snakeView').classList.add('hidden');
        document.getElementById('caroView').classList.add('hidden');
        document.getElementById('dinoView').classList.add('hidden');
        document.getElementById('xiangqiView').classList.add('hidden');
        document.getElementById('minerView').classList.add('hidden');
        document.getElementById('tetrisView').classList.add('hidden');
        document.getElementById('pikachuView').classList.add('hidden');
        document.getElementById('solitaireView').classList.add('hidden');
        document.getElementById('invadersView').classList.add('hidden');
        document.getElementById('pacmanView').classList.add('hidden');
        document.getElementById('breakerView').classList.add('hidden');
        document.getElementById('game2048View').classList.add('hidden');
        
        // Tự động tạm dừng game Rắn nếu đang chơi để tránh rắn tự chết
        if (gameState.gameStatus === 'PLAYING') {
            togglePause();
        }
        
        // Vẽ lại bàn cờ vua khi chuyển tab
        if (typeof window.renderChessBoard === 'function') {
            window.renderChessBoard();
        }
    });

    document.getElementById('btnXiangqi').addEventListener('click', () => {
        document.getElementById('btnXiangqi').classList.add('active');
        document.getElementById('btnHome').classList.remove('active');
        document.getElementById('btnSnake').classList.remove('active');
        document.getElementById('btnCaro').classList.remove('active');
        document.getElementById('btnDino').classList.remove('active');
        document.getElementById('btnChess').classList.remove('active');
        document.getElementById('btnMiner').classList.remove('active');
        document.getElementById('btnSolitaire').classList.remove('active');
        document.getElementById('btnInvaders').classList.remove('active');
        document.getElementById('btnPacman').classList.remove('active');
        document.getElementById('btnBreaker').classList.remove('active');
        document.getElementById('btn2048').classList.remove('active');
        
        document.getElementById('xiangqiView').classList.remove('hidden');
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('snakeView').classList.add('hidden');
        document.getElementById('caroView').classList.add('hidden');
        document.getElementById('dinoView').classList.add('hidden');
        document.getElementById('chessView').classList.add('hidden');
        document.getElementById('minerView').classList.add('hidden');
        document.getElementById('tetrisView').classList.add('hidden');
        document.getElementById('pikachuView').classList.add('hidden');
        document.getElementById('solitaireView').classList.add('hidden');
        document.getElementById('invadersView').classList.add('hidden');
        document.getElementById('pacmanView').classList.add('hidden');
        document.getElementById('breakerView').classList.add('hidden');
        document.getElementById('game2048View').classList.add('hidden');
        
        // Tự động tạm dừng game Rắn nếu đang chơi để tránh rắn tự chết
        if (gameState.gameStatus === 'PLAYING') {
            togglePause();
        }
        
        // Vẽ lại bàn cờ tướng khi chuyển tab
        if (typeof window.renderXiangqiBoard === 'function') {
            window.renderXiangqiBoard();
        }
    });

    document.getElementById('btnMiner').addEventListener('click', () => {
        document.getElementById('btnMiner').classList.add('active');
        document.getElementById('btnHome').classList.remove('active');
        document.getElementById('btnSnake').classList.remove('active');
        document.getElementById('btnCaro').classList.remove('active');
        document.getElementById('btnDino').classList.remove('active');
        document.getElementById('btnChess').classList.remove('active');
        document.getElementById('btnXiangqi').classList.remove('active');
        document.getElementById('btnTetris').classList.remove('active');
        document.getElementById('btnPikachu').classList.remove('active');
        document.getElementById('btnSolitaire').classList.remove('active');
        document.getElementById('btnInvaders').classList.remove('active');
        document.getElementById('btnPacman').classList.remove('active');
        document.getElementById('btnBreaker').classList.remove('active');
        document.getElementById('btn2048').classList.remove('active');
        
        document.getElementById('minerView').classList.remove('hidden');
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('snakeView').classList.add('hidden');
        document.getElementById('caroView').classList.add('hidden');
        document.getElementById('dinoView').classList.add('hidden');
        document.getElementById('chessView').classList.add('hidden');
        document.getElementById('xiangqiView').classList.add('hidden');
        document.getElementById('tetrisView').classList.add('hidden');
        document.getElementById('pikachuView').classList.add('hidden');
        document.getElementById('solitaireView').classList.add('hidden');
        document.getElementById('invadersView').classList.add('hidden');
        document.getElementById('pacmanView').classList.add('hidden');
        document.getElementById('breakerView').classList.add('hidden');
        document.getElementById('game2048View').classList.add('hidden');
        
        // Tự động tạm dừng game Rắn nếu đang chơi để tránh rắn tự chết
        if (gameState.gameStatus === 'PLAYING') {
            togglePause();
        }
    });

    document.getElementById('btnTetris').addEventListener('click', () => {
        document.getElementById('btnTetris').classList.add('active');
        document.getElementById('btnHome').classList.remove('active');
        document.getElementById('btnSnake').classList.remove('active');
        document.getElementById('btnCaro').classList.remove('active');
        document.getElementById('btnDino').classList.remove('active');
        document.getElementById('btnChess').classList.remove('active');
        document.getElementById('btnXiangqi').classList.remove('active');
        document.getElementById('btnMiner').classList.remove('active');
        document.getElementById('btnPikachu').classList.remove('active');
        document.getElementById('btnSolitaire').classList.remove('active');
        document.getElementById('btnInvaders').classList.remove('active');
        document.getElementById('btnPacman').classList.remove('active');
        document.getElementById('btnBreaker').classList.remove('active');
        document.getElementById('btn2048').classList.remove('active');
        
        document.getElementById('tetrisView').classList.remove('hidden');
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('snakeView').classList.add('hidden');
        document.getElementById('caroView').classList.add('hidden');
        document.getElementById('dinoView').classList.add('hidden');
        document.getElementById('chessView').classList.add('hidden');
        document.getElementById('xiangqiView').classList.add('hidden');
        document.getElementById('minerView').classList.add('hidden');
        document.getElementById('pikachuView').classList.add('hidden');
        document.getElementById('solitaireView').classList.add('hidden');
        document.getElementById('invadersView').classList.add('hidden');
        document.getElementById('pacmanView').classList.add('hidden');
        document.getElementById('breakerView').classList.add('hidden');
        document.getElementById('game2048View').classList.add('hidden');
        
        // Tự động tạm dừng game Rắn nếu đang chơi để tránh rắn tự chết
        if (gameState.gameStatus === 'PLAYING') {
            togglePause();
        }
    });

    document.getElementById('btnPikachu').addEventListener('click', () => {
        document.getElementById('btnPikachu').classList.add('active');
        document.getElementById('btnHome').classList.remove('active');
        document.getElementById('btnSnake').classList.remove('active');
        document.getElementById('btnCaro').classList.remove('active');
        document.getElementById('btnDino').classList.remove('active');
        document.getElementById('btnChess').classList.remove('active');
        document.getElementById('btnXiangqi').classList.remove('active');
        document.getElementById('btnMiner').classList.remove('active');
        document.getElementById('btnTetris').classList.remove('active');
        document.getElementById('btnSolitaire').classList.remove('active');
        document.getElementById('btnInvaders').classList.remove('active');
        document.getElementById('btnPacman').classList.remove('active');
        document.getElementById('btnBreaker').classList.remove('active');
        document.getElementById('btn2048').classList.remove('active');
        
        document.getElementById('pikachuView').classList.remove('hidden');
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('snakeView').classList.add('hidden');
        document.getElementById('caroView').classList.add('hidden');
        document.getElementById('dinoView').classList.add('hidden');
        document.getElementById('chessView').classList.add('hidden');
        document.getElementById('xiangqiView').classList.add('hidden');
        document.getElementById('minerView').classList.add('hidden');
        document.getElementById('tetrisView').classList.add('hidden');
        document.getElementById('solitaireView').classList.add('hidden');
        document.getElementById('invadersView').classList.add('hidden');
        document.getElementById('pacmanView').classList.add('hidden');
        document.getElementById('breakerView').classList.add('hidden');
        document.getElementById('game2048View').classList.add('hidden');
        
        // Tự động tạm dừng game Rắn nếu đang chơi để tránh rắn tự chết
        if (gameState.gameStatus === 'PLAYING') {
            togglePause();
        }
    });

    document.getElementById('btnSolitaire').addEventListener('click', () => {
        document.getElementById('btnSolitaire').classList.add('active');
        document.getElementById('btnHome').classList.remove('active');
        document.getElementById('btnSnake').classList.remove('active');
        document.getElementById('btnCaro').classList.remove('active');
        document.getElementById('btnDino').classList.remove('active');
        document.getElementById('btnChess').classList.remove('active');
        document.getElementById('btnXiangqi').classList.remove('active');
        document.getElementById('btnMiner').classList.remove('active');
        document.getElementById('btnTetris').classList.remove('active');
        document.getElementById('btnPikachu').classList.remove('active');
        document.getElementById('btnInvaders').classList.remove('active');
        document.getElementById('btnPacman').classList.remove('active');
        document.getElementById('btnBreaker').classList.remove('active');
        document.getElementById('btn2048').classList.remove('active');
        
        document.getElementById('solitaireView').classList.remove('hidden');
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('snakeView').classList.add('hidden');
        document.getElementById('caroView').classList.add('hidden');
        document.getElementById('dinoView').classList.add('hidden');
        document.getElementById('chessView').classList.add('hidden');
        document.getElementById('xiangqiView').classList.add('hidden');
        document.getElementById('minerView').classList.add('hidden');
        document.getElementById('tetrisView').classList.add('hidden');
        document.getElementById('pikachuView').classList.add('hidden');
        document.getElementById('invadersView').classList.add('hidden');
        document.getElementById('pacmanView').classList.add('hidden');
        document.getElementById('breakerView').classList.add('hidden');
        document.getElementById('game2048View').classList.add('hidden');
        document.getElementById('invadersView').classList.add('hidden');
        document.getElementById('pacmanView').classList.add('hidden');
        document.getElementById('breakerView').classList.add('hidden');
        document.getElementById('game2048View').classList.add('hidden');
        
        // Tự động tạm dừng game Rắn nếu đang chơi để tránh rắn tự chết
        if (gameState.gameStatus === 'PLAYING') {
            togglePause();
        }
    });

    document.getElementById('btnInvaders').addEventListener('click', () => {
        document.getElementById('btnInvaders').classList.add('active');
        document.getElementById('btnHome').classList.remove('active');
        document.getElementById('btnSnake').classList.remove('active');
        document.getElementById('btnCaro').classList.remove('active');
        document.getElementById('btnDino').classList.remove('active');
        document.getElementById('btnChess').classList.remove('active');
        document.getElementById('btnXiangqi').classList.remove('active');
        document.getElementById('btnMiner').classList.remove('active');
        document.getElementById('btnTetris').classList.remove('active');
        document.getElementById('btnPikachu').classList.remove('active');
        document.getElementById('btnSolitaire').classList.remove('active');
        document.getElementById('btnPacman').classList.remove('active');
        document.getElementById('btnBreaker').classList.remove('active');
        document.getElementById('btn2048').classList.remove('active');
        
        document.getElementById('invadersView').classList.remove('hidden');
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('snakeView').classList.add('hidden');
        document.getElementById('caroView').classList.add('hidden');
        document.getElementById('dinoView').classList.add('hidden');
        document.getElementById('chessView').classList.add('hidden');
        document.getElementById('xiangqiView').classList.add('hidden');
        document.getElementById('minerView').classList.add('hidden');
        document.getElementById('tetrisView').classList.add('hidden');
        document.getElementById('pikachuView').classList.add('hidden');
        document.getElementById('solitaireView').classList.add('hidden');
        document.getElementById('pacmanView').classList.add('hidden');
        document.getElementById('breakerView').classList.add('hidden');
        document.getElementById('game2048View').classList.add('hidden');
        
        if (gameState.gameStatus === 'PLAYING') {
            togglePause();
        }
    });

    document.getElementById('btnPacman').addEventListener('click', () => {
        document.getElementById('btnPacman').classList.add('active');
        document.getElementById('btnHome').classList.remove('active');
        document.getElementById('btnSnake').classList.remove('active');
        document.getElementById('btnCaro').classList.remove('active');
        document.getElementById('btnDino').classList.remove('active');
        document.getElementById('btnChess').classList.remove('active');
        document.getElementById('btnXiangqi').classList.remove('active');
        document.getElementById('btnMiner').classList.remove('active');
        document.getElementById('btnTetris').classList.remove('active');
        document.getElementById('btnPikachu').classList.remove('active');
        document.getElementById('btnSolitaire').classList.remove('active');
        document.getElementById('btnInvaders').classList.remove('active');
        document.getElementById('btnBreaker').classList.remove('active');
        document.getElementById('btn2048').classList.remove('active');
        
        document.getElementById('pacmanView').classList.remove('hidden');
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('snakeView').classList.add('hidden');
        document.getElementById('caroView').classList.add('hidden');
        document.getElementById('dinoView').classList.add('hidden');
        document.getElementById('chessView').classList.add('hidden');
        document.getElementById('xiangqiView').classList.add('hidden');
        document.getElementById('minerView').classList.add('hidden');
        document.getElementById('tetrisView').classList.add('hidden');
        document.getElementById('pikachuView').classList.add('hidden');
        document.getElementById('solitaireView').classList.add('hidden');
        document.getElementById('invadersView').classList.add('hidden');
        document.getElementById('breakerView').classList.add('hidden');
        document.getElementById('game2048View').classList.add('hidden');
        
        if (gameState.gameStatus === 'PLAYING') {
            togglePause();
        }
    });

    document.getElementById('btnBreaker').addEventListener('click', () => {
        document.getElementById('btnBreaker').classList.add('active');
        document.getElementById('btnHome').classList.remove('active');
        document.getElementById('btnSnake').classList.remove('active');
        document.getElementById('btnCaro').classList.remove('active');
        document.getElementById('btnDino').classList.remove('active');
        document.getElementById('btnChess').classList.remove('active');
        document.getElementById('btnXiangqi').classList.remove('active');
        document.getElementById('btnMiner').classList.remove('active');
        document.getElementById('btnTetris').classList.remove('active');
        document.getElementById('btnPikachu').classList.remove('active');
        document.getElementById('btnSolitaire').classList.remove('active');
        document.getElementById('btnInvaders').classList.remove('active');
        document.getElementById('btnPacman').classList.remove('active');
        document.getElementById('btn2048').classList.remove('active');
        
        document.getElementById('breakerView').classList.remove('hidden');
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('snakeView').classList.add('hidden');
        document.getElementById('caroView').classList.add('hidden');
        document.getElementById('dinoView').classList.add('hidden');
        document.getElementById('chessView').classList.add('hidden');
        document.getElementById('xiangqiView').classList.add('hidden');
        document.getElementById('minerView').classList.add('hidden');
        document.getElementById('tetrisView').classList.add('hidden');
        document.getElementById('pikachuView').classList.add('hidden');
        document.getElementById('solitaireView').classList.add('hidden');
        document.getElementById('invadersView').classList.add('hidden');
        document.getElementById('pacmanView').classList.add('hidden');
        document.getElementById('game2048View').classList.add('hidden');
        
        if (gameState.gameStatus === 'PLAYING') {
            togglePause();
        }
    });

    document.getElementById('btn2048').addEventListener('click', () => {
        document.getElementById('btn2048').classList.add('active');
        document.getElementById('btnHome').classList.remove('active');
        document.getElementById('btnSnake').classList.remove('active');
        document.getElementById('btnCaro').classList.remove('active');
        document.getElementById('btnDino').classList.remove('active');
        document.getElementById('btnChess').classList.remove('active');
        document.getElementById('btnXiangqi').classList.remove('active');
        document.getElementById('btnMiner').classList.remove('active');
        document.getElementById('btnTetris').classList.remove('active');
        document.getElementById('btnPikachu').classList.remove('active');
        document.getElementById('btnSolitaire').classList.remove('active');
        document.getElementById('btnInvaders').classList.remove('active');
        document.getElementById('btnPacman').classList.remove('active');
        document.getElementById('btnBreaker').classList.remove('active');
        
        document.getElementById('game2048View').classList.remove('hidden');
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('snakeView').classList.add('hidden');
        document.getElementById('caroView').classList.add('hidden');
        document.getElementById('dinoView').classList.add('hidden');
        document.getElementById('chessView').classList.add('hidden');
        document.getElementById('xiangqiView').classList.add('hidden');
        document.getElementById('minerView').classList.add('hidden');
        document.getElementById('tetrisView').classList.add('hidden');
        document.getElementById('pikachuView').classList.add('hidden');
        document.getElementById('solitaireView').classList.add('hidden');
        document.getElementById('invadersView').classList.add('hidden');
        document.getElementById('pacmanView').classList.add('hidden');
        document.getElementById('breakerView').classList.add('hidden');
        
        if (gameState.gameStatus === 'PLAYING') {
            togglePause();
        }
    });

    // Liên kết Click hành động từ các Game Card trên Dashboard
    // Hàm bind sự kiện click an toàn cho các thẻ game card ở Dashboard
    function bindCardToBtn(cardId, btnId, viewId, initFn) {
        const card = document.getElementById(cardId);
        if (card) {
            card.addEventListener('click', () => {
                switchTo(viewId, btnId);
                if (initFn) initFn();
            });
        }
    }

    bindCardToBtn('cardSnake', 'btnSnake', 'snakeView', () => {
        if (gameState.gameStatus === 'MENU') drawMenu();
        else if (gameState.gameStatus === 'PLAYING') render();
    });
    bindCardToBtn('cardCaro', 'btnCaro', 'caroView');
    bindCardToBtn('cardDino', 'btnDino', 'dinoView');
    bindCardToBtn('cardChess', 'btnChess', 'chessView');
    bindCardToBtn('cardXiangqi', 'btnXiangqi', 'xiangqiView');
    bindCardToBtn('cardMiner', 'btnMiner', 'minerView', () => initGoldMiner('minerGameArea'));
    bindCardToBtn('cardTetris', 'btnTetris', 'tetrisView', () => initTetris('tetrisGameArea'));
    bindCardToBtn('cardPikachu', 'btnPikachu', 'pikachuView', () => initPikachu('pikachuGameArea'));
    bindCardToBtn('cardSolitaire', 'btnSolitaire', 'solitaireView', () => initSolitaire('solitaireGameArea'));
    bindCardToBtn('cardInvaders', 'btnInvaders', 'invadersView', () => initSpaceInvaders('invadersGameArea'));
    bindCardToBtn('cardPacman', 'btnPacman', 'pacmanView', () => initPacman());
    bindCardToBtn('cardBreaker', 'btnBreaker', 'breakerView', () => initBreaker('breakerGameArea'));
    bindCardToBtn('card2048', 'btn2048', 'game2048View', () => init2048('game2048GameArea'));
    bindCardToBtn('cardFlappy', 'btnFlappy', 'flappyView', () => initFlappyBird('flappyGameArea'));
    bindCardToBtn('cardWhack', 'btnWhack', 'whackView', () => initWhackMole('whackGameArea'));
    bindCardToBtn('cardWordle', 'btnWordle', 'wordleView', () => initWordle('wordleGameArea'));
    bindCardToBtn('cardPong', 'btnPong', 'pongView', () => initPong('pongGameArea'));
    bindCardToBtn('cardMemory', 'btnMemory', 'memoryView', () => initMemory('memoryGameArea'));
    bindCardToBtn('cardTypeRush', 'btnTypeRush', 'typeRushView', () => initTypeRush('typeRushGameArea'));
    bindCardToBtn('cardFrogger', 'btnFrogger', 'froggerView', () => initFrogger('froggerGameArea'));
    bindCardToBtn('cardTron', 'btnTron', 'tronView', () => initTron('tronGameArea'));
    bindCardToBtn('cardAim', 'btnAim', 'aimView', () => initAimTrainer('aimGameArea'));
    bindCardToBtn('cardMines', 'btnMines', 'minesView', () => initMinesweeper('minesGameArea'));
    bindCardToBtn('cardSpin', 'btnSpin', 'spinView', () => initNeonSpin('spinGameArea'));
    bindCardToBtn('cardTower', 'btnTower', 'towerView', () => initTowerBloxx('towerGameArea'));
    bindCardToBtn('cardSnake2P', 'btnSnake2P', 'snake2PView', () => initSnake2P('snake2PGameArea'));
    bindCardToBtn('cardHelix', 'btnHelix', 'helixView', () => initHelixJump('helixGameArea'));
    bindCardToBtn('cardHockey', 'btnHockey', 'hockeyView', () => initAirHockey('hockeyGameArea'));
    bindCardToBtn('cardGunny', 'btnGunny', 'gunnyView', () => initGunny('gunnyGameArea'));

    bindCardToBtn('cardSudoku', 'btnSudoku', 'sudokuView', () => initNeonSudoku('sudokuGameArea'));
    bindCardToBtn('cardSimon', 'btnSimon', 'simonView', () => initNeonSimon('simonGameArea'));
    bindCardToBtn('cardSlide', 'btnSlide', 'slideView', () => initNeonSlide('slideGameArea'));
    bindCardToBtn('cardReflex', 'btnReflex', 'reflexView', () => initNeonReflex('reflexGameArea'));
    bindCardToBtn('cardDash', 'btnDash', 'dashView', () => initNeonDash('dashGameArea'));

    // --- 3 GAME MỚI: Flappy, Whack, Wordle ---
    const NEW_VIEWS = [
        'dashboardView','snakeView','caroView','dinoView','chessView','xiangqiView',
        'minerView','tetrisView','pikachuView','solitaireView','invadersView','pacmanView',
        'breakerView','game2048View','flappyView','whackView','wordleView',
        'pongView','memoryView','typeRushView','froggerView','tronView','aimView',
        'minesView','spinView','towerView','snake2PView','helixView','hockeyView','gunnyView',
        'sudokuView','simonView','slideView','reflexView','dashView'
    ];
    const NEW_BTNS = [
        'btnHome','btnSnake','btnCaro','btnDino','btnChess','btnXiangqi',
        'btnMiner','btnTetris','btnPikachu','btnSolitaire','btnInvaders','btnPacman',
        'btnBreaker','btn2048','btnFlappy','btnWhack','btnWordle',
        'btnPong','btnMemory','btnTypeRush','btnFrogger','btnTron','btnAim',
        'btnMines','btnSpin','btnTower','btnSnake2P','btnHelix','btnHockey','btnGunny',
        'btnSudoku','btnSimon','btnSlide','btnReflex','btnDash'
    ];

    function switchTo(viewId, btnId) {
        NEW_VIEWS.forEach(v => {
            const el = document.getElementById(v);
            if (el) el.classList.toggle('hidden', v !== viewId);
        });
        NEW_BTNS.forEach(b => {
            const el = document.getElementById(b);
            if (el) el.classList.toggle('active', b === btnId);
        });
        if (gameState.gameStatus === 'PLAYING') togglePause();
    }

    document.getElementById('btnFlappy').addEventListener('click', () => {
        switchTo('flappyView', 'btnFlappy');
        initFlappyBird('flappyGameArea');
    });

    document.getElementById('btnQuitFlappy').addEventListener('click', () => {
        const area = document.getElementById('flappyGameArea');
        if (area && area._gameCleanup) area._gameCleanup();
        switchTo('dashboardView', 'btnHome');
    });

    document.getElementById('btnWhack').addEventListener('click', () => {
        switchTo('whackView', 'btnWhack');
        initWhackMole('whackGameArea');
    });

    document.getElementById('btnQuitWhack').addEventListener('click', () => {
        const area = document.getElementById('whackGameArea');
        if (area && area._gameCleanup) area._gameCleanup();
        switchTo('dashboardView', 'btnHome');
    });

    document.getElementById('btnWordle').addEventListener('click', () => {
        switchTo('wordleView', 'btnWordle');
        initWordle('wordleGameArea');
    });

    document.getElementById('btnQuitWordle').addEventListener('click', () => {
        switchTo('dashboardView', 'btnHome');
    });

    document.getElementById('btnPong').addEventListener('click', () => {
        switchTo('pongView', 'btnPong');
        initPong('pongGameArea');
    });

    document.getElementById('btnQuitPong').addEventListener('click', () => {
        const area = document.getElementById('pongGameArea');
        if (area && area._gameCleanup) area._gameCleanup();
        switchTo('dashboardView', 'btnHome');
    });

    document.getElementById('btnMemory').addEventListener('click', () => {
        switchTo('memoryView', 'btnMemory');
        initMemory('memoryGameArea');
    });

    document.getElementById('btnQuitMemory').addEventListener('click', () => {
        const area = document.getElementById('memoryGameArea');
        if (area && area._gameCleanup) area._gameCleanup();
        switchTo('dashboardView', 'btnHome');
    });

    document.getElementById('btnTypeRush').addEventListener('click', () => {
        switchTo('typeRushView', 'btnTypeRush');
        initTypeRush('typeRushGameArea');
    });

    document.getElementById('btnQuitTypeRush').addEventListener('click', () => {
        const area = document.getElementById('typeRushGameArea');
        if (area && area._gameCleanup) area._gameCleanup();
        switchTo('dashboardView', 'btnHome');
    });

    document.getElementById('btnFrogger').addEventListener('click', () => {
        switchTo('froggerView', 'btnFrogger');
        initFrogger('froggerGameArea');
    });

    document.getElementById('btnQuitFrogger').addEventListener('click', () => {
        const area = document.getElementById('froggerGameArea');
        if (area && area._gameCleanup) area._gameCleanup();
        switchTo('dashboardView', 'btnHome');
    });

    document.getElementById('btnTron').addEventListener('click', () => {
        switchTo('tronView', 'btnTron');
        initTron('tronGameArea');
    });

    document.getElementById('btnQuitTron').addEventListener('click', () => {
        const area = document.getElementById('tronGameArea');
        if (area && area._gameCleanup) area._gameCleanup();
        switchTo('dashboardView', 'btnHome');
    });

    document.getElementById('btnAim').addEventListener('click', () => {
        switchTo('aimView', 'btnAim');
        initAimTrainer('aimGameArea');
    });

    document.getElementById('btnQuitAim').addEventListener('click', () => {
        const area = document.getElementById('aimGameArea');
        if (area && area._gameCleanup) area._gameCleanup();
        switchTo('dashboardView', 'btnHome');
    });

    document.getElementById('btnMines').addEventListener('click', () => {
        switchTo('minesView', 'btnMines');
        initMinesweeper('minesGameArea');
    });

    document.getElementById('btnQuitMines').addEventListener('click', () => {
        const area = document.getElementById('minesGameArea');
        if (area && area._gameCleanup) area._gameCleanup();
        switchTo('dashboardView', 'btnHome');
    });

    document.getElementById('btnSpin').addEventListener('click', () => {
        switchTo('spinView', 'btnSpin');
        initNeonSpin('spinGameArea');
    });

    document.getElementById('btnQuitSpin').addEventListener('click', () => {
        const area = document.getElementById('spinGameArea');
        if (area && area._gameCleanup) area._gameCleanup();
        switchTo('dashboardView', 'btnHome');
    });

    document.getElementById('btnTower').addEventListener('click', () => {
        switchTo('towerView', 'btnTower');
        initTowerBloxx('towerGameArea');
    });

    document.getElementById('btnQuitTower').addEventListener('click', () => {
        const area = document.getElementById('towerGameArea');
        if (area && area._gameCleanup) area._gameCleanup();
        switchTo('dashboardView', 'btnHome');
    });

    document.getElementById('btnSnake2P').addEventListener('click', () => {
        switchTo('snake2PView', 'btnSnake2P');
        initSnake2P('snake2PGameArea');
    });

    document.getElementById('btnQuitSnake2P').addEventListener('click', () => {
        const area = document.getElementById('snake2PGameArea');
        if (area && area._gameCleanup) area._gameCleanup();
        switchTo('dashboardView', 'btnHome');
    });

    document.getElementById('btnHelix').addEventListener('click', () => {
        switchTo('helixView', 'btnHelix');
        initHelixJump('helixGameArea');
    });

    document.getElementById('btnQuitHelix').addEventListener('click', () => {
        const area = document.getElementById('helixGameArea');
        if (area && area._gameCleanup) area._gameCleanup();
        switchTo('dashboardView', 'btnHome');
    });

    document.getElementById('btnHockey').addEventListener('click', () => {
        switchTo('hockeyView', 'btnHockey');
        initAirHockey('hockeyGameArea');
    });

    document.getElementById('btnQuitHockey').addEventListener('click', () => {
        const area = document.getElementById('hockeyGameArea');
        if (area && area._gameCleanup) area._gameCleanup();
        switchTo('dashboardView', 'btnHome');
    });

    document.getElementById('btnGunny').addEventListener('click', () => {
        switchTo('gunnyView', 'btnGunny');
        initGunny('gunnyGameArea');
    });

    document.getElementById('btnQuitGunny').addEventListener('click', () => {
        const area = document.getElementById('gunnyGameArea');
        if (area && area._gameCleanup) area._gameCleanup();
        switchTo('dashboardView', 'btnHome');
    });

    document.getElementById('btnSudoku').addEventListener('click', () => {
        switchTo('sudokuView', 'btnSudoku');
        initNeonSudoku('sudokuGameArea');
    });
    document.getElementById('btnQuitSudoku').addEventListener('click', () => {
        const area = document.getElementById('sudokuGameArea');
        if (area && area._gameCleanup) area._gameCleanup();
        switchTo('dashboardView', 'btnHome');
    });

    document.getElementById('btnSimon').addEventListener('click', () => {
        switchTo('simonView', 'btnSimon');
        initNeonSimon('simonGameArea');
    });
    document.getElementById('btnQuitSimon').addEventListener('click', () => {
        const area = document.getElementById('simonGameArea');
        if (area && area._gameCleanup) area._gameCleanup();
        switchTo('dashboardView', 'btnHome');
    });

    document.getElementById('btnSlide').addEventListener('click', () => {
        switchTo('slideView', 'btnSlide');
        initNeonSlide('slideGameArea');
    });
    document.getElementById('btnQuitSlide').addEventListener('click', () => {
        const area = document.getElementById('slideGameArea');
        if (area && area._gameCleanup) area._gameCleanup();
        switchTo('dashboardView', 'btnHome');
    });

    document.getElementById('btnReflex').addEventListener('click', () => {
        switchTo('reflexView', 'btnReflex');
        initNeonReflex('reflexGameArea');
    });
    document.getElementById('btnQuitReflex').addEventListener('click', () => {
        const area = document.getElementById('reflexGameArea');
        if (area && area._gameCleanup) area._gameCleanup();
        switchTo('dashboardView', 'btnHome');
    });

    document.getElementById('btnDash').addEventListener('click', () => {
        switchTo('dashView', 'btnDash');
        initNeonDash('dashGameArea');
    });
    document.getElementById('btnQuitDash').addEventListener('click', () => {
        const area = document.getElementById('dashGameArea');
        if (area && area._gameCleanup) area._gameCleanup();
        switchTo('dashboardView', 'btnHome');
    });

    // Lắng nghe sự kiện click đóng/mở các group game trên Sidebar
    document.querySelectorAll('.sidebar-section-header').forEach(header => {
        header.addEventListener('click', () => {
            header.classList.toggle('collapsed');
            const content = header.nextElementSibling;
            if (content && content.classList.contains('sidebar-section-content')) {
                content.classList.toggle('collapsed');
            }
        });
    });
});
