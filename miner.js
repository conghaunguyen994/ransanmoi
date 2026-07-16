/**
 * miner.js - Neon Gold Miner (Đào Vàng Cyberpunk)
 */

(function () {
    // --- DOM Elements ---
    const minerLobby = document.getElementById('minerLobby');
    const minerGameArea = document.getElementById('minerGameArea');
    const btnStartMiner = document.getElementById('btnStartMiner');
    const btnQuitMiner = document.getElementById('btnQuitMiner');
    const minerTargetScoreVal = document.getElementById('minerTargetScore');
    const minerCurrentScoreVal = document.getElementById('minerCurrentScore');
    const minerTimerVal = document.getElementById('minerTimer');
    const minerLevelVal = document.getElementById('minerLevel');
    const minerCanvas = document.getElementById('minerCanvas');
    const ctx = minerCanvas.getContext('2d');
    const minerStatusText = document.getElementById('minerStatusText');

    // --- GAME PARAMETERS & CONFIGS ---
    const SWING_SPEED = 0.035; // Tốc độ lắc móc (radian mỗi frame)
    const MAX_ANGLE = Math.PI * 0.4; // Góc giới hạn tối đa (~72 độ)
    const SHOOT_SPEED = 6.5; // Tốc độ phóng móc
    const RETRIEVE_SPEED_BASE = 5.0; // Tốc độ kéo móc trống cơ bản
    const HOOK_START_Y = 50; // Điểm đặt móc ở đầu trục
    const HOOK_RADIUS = 12; // Bán kính vòng bo móc

    const state = {
        status: 'LOBBY', // LOBBY | PLAYING | NEXT_LEVEL_DELAY | GAME_OVER
        score: 0,
        targetScore: 1000,
        level: 1,
        timeRemaining: 60,
        gameInterval: null,
        timerInterval: null,

        // Móc
        hook: {
            x: 300,
            y: HOOK_START_Y,
            angle: 0,
            swingDirection: 1, // 1: phải, -1: trái
            length: 45,
            state: 'SWINGING', // SWINGING | SHOOTING | RETRIEVING
            grabbedItem: null
        },

        // Mảng các vật thể dưới đất
        items: []
    };

    // Định nghĩa các loại vật phẩm
    const ITEM_TYPES = {
        GOLD_S: { radius: 14, color: '#ffd700', score: 100, weight: 1.2 },
        GOLD_M: { radius: 24, color: '#ffd700', score: 250, weight: 2.2 },
        GOLD_L: { radius: 36, color: '#ffd700', score: 500, weight: 4.0 },
        DIAMOND: { radius: 10, color: '#b026ff', score: 600, weight: 0.5 },
        ROCK_S: { radius: 18, color: '#7f8c8d', score: 20, weight: 3.5 },
        ROCK_L: { radius: 30, color: '#7f8c8d', score: 50, weight: 6.0 },
        LUCKY: { radius: 16, color: '#ff3b30', score: null, weight: 1.5 } // Điểm random
    };

    // --- GAME ENGINE ---
    
    // Sinh ngẫu nhiên các vật phẩm dựa theo cấp độ
    function generateItemsForLevel() {
        state.items = [];
        const count = 10 + state.level * 2;
        const types = Object.keys(ITEM_TYPES);

        for (let i = 0; i < count; i++) {
            let itemTypeKey = types[Math.floor(Math.random() * types.length)];
            // Điều chỉnh xác suất: Diamond hiếm hơn
            if (itemTypeKey === 'DIAMOND' && Math.random() > 0.3) {
                itemTypeKey = 'GOLD_S';
            }
            
            const conf = ITEM_TYPES[itemTypeKey];
            let x, y, overlap;
            let attempts = 0;

            // Đảm bảo các vật thể không đè lên nhau và cách xa điểm trục quay của móc
            do {
                x = conf.radius + Math.random() * (minerCanvas.width - conf.radius * 2);
                y = 150 + Math.random() * (minerCanvas.height - 150 - conf.radius);
                overlap = false;

                for (const existing of state.items) {
                    const dist = Math.hypot(x - existing.x, y - existing.y);
                    if (dist < conf.radius + existing.radius + 15) {
                        overlap = true;
                        break;
                    }
                }
                attempts++;
            } while (overlap && attempts < 100);

            // Lucky bag thiết lập điểm ngẫu nhiên
            let actualScore = conf.score;
            if (itemTypeKey === 'LUCKY') {
                actualScore = [50, 100, 250, 500, 800][Math.floor(Math.random() * 5)];
            }

            state.items.push({
                x, y,
                radius: conf.radius,
                color: conf.color,
                scoreValue: actualScore,
                weight: conf.weight,
                type: itemTypeKey
            });
        }
    }

    // Phóng móc
    function shootHook() {
        if (state.hook.state !== 'SWINGING') return;
        state.hook.state = 'SHOOTING';
    }

    // Cập nhật trạng thái Móc & Va chạm
    function updateGame() {
        if (state.status !== 'PLAYING') return;

        const hook = state.hook;

        if (hook.state === 'SWINGING') {
            // Lắc qua lại theo cung tròn
            hook.angle += hook.swingDirection * SWING_SPEED;
            if (hook.angle >= MAX_ANGLE) {
                hook.angle = MAX_ANGLE;
                hook.swingDirection = -1;
            } else if (hook.angle <= -MAX_ANGLE) {
                hook.angle = -MAX_ANGLE;
                hook.swingDirection = 1;
            }
            // Điểm đầu móc
            hook.x = 300 + Math.sin(hook.angle) * hook.length;
            hook.y = HOOK_START_Y + Math.cos(hook.angle) * hook.length;
        } else if (hook.state === 'SHOOTING') {
            // Phóng móc đi thẳng
            hook.length += SHOOT_SPEED;
            hook.x = 300 + Math.sin(hook.angle) * hook.length;
            hook.y = HOOK_START_Y + Math.cos(hook.angle) * hook.length;

            // Kiểm tra va chạm biên màn hình
            if (hook.x < 5 || hook.x > minerCanvas.width - 5 || hook.y > minerCanvas.height - 5) {
                hook.state = 'RETRIEVING';
            }

            // Kiểm tra va chạm vật phẩm
            for (let i = 0; i < state.items.length; i++) {
                const item = state.items[i];
                const dist = Math.hypot(hook.x - item.x, hook.y - item.y);
                if (dist < item.radius + HOOK_RADIUS) {
                    // Tóm được vật phẩm
                    hook.state = 'RETRIEVING';
                    hook.grabbedItem = item;
                    state.items.splice(i, 1); // Xóa khỏi danh sách dưới đất
                    break;
                }
            }
        } else if (hook.state === 'RETRIEVING') {
            // Kéo móc thu về
            let speed = RETRIEVE_SPEED_BASE;
            if (hook.grabbedItem) {
                speed = RETRIEVE_SPEED_BASE / hook.grabbedItem.weight;
            }
            hook.length -= speed;
            if (hook.length <= 45) {
                hook.length = 45;
                hook.state = 'SWINGING';

                // Cộng điểm nếu kéo được đồ
                if (hook.grabbedItem) {
                    state.score += hook.grabbedItem.scoreValue;
                    minerCurrentScoreVal.innerText = state.score;
                    
                    // Show text thông báo điểm
                    minerStatusText.innerText = `Kéo thành công! +${hook.grabbedItem.scoreValue} điểm.`;
                    minerStatusText.style.color = '#39ff14';
                    
                    hook.grabbedItem = null;
                }
            }
            hook.x = 300 + Math.sin(hook.angle) * hook.length;
            hook.y = HOOK_START_Y + Math.cos(hook.angle) * hook.length;
        }

        // Cập nhật vị trí của vật đang bị kéo theo móc
        if (hook.grabbedItem) {
            hook.grabbedItem.x = hook.x;
            hook.grabbedItem.y = hook.y;
        }

        draw();
    }

    // --- DRAWING GRAPHICS ---
    function draw() {
        ctx.fillStyle = '#07080c';
        ctx.fillRect(0, 0, minerCanvas.width, minerCanvas.height);

        // Vẽ dây móc
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#00f0ff';
        ctx.beginPath();
        ctx.moveTo(300, HOOK_START_Y);
        ctx.lineTo(state.hook.x, state.hook.y);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset

        // Vẽ cụm máy tời đào vàng (trục quay)
        ctx.fillStyle = '#b026ff';
        ctx.beginPath();
        ctx.arc(300, HOOK_START_Y, 15, 0, Math.PI * 2);
        ctx.fill();

        // Vẽ đầu móc
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(state.hook.x, state.hook.y, HOOK_RADIUS, state.hook.angle, state.hook.angle + Math.PI);
        ctx.stroke();

        // Vẽ các vật phẩm
        for (const item of state.items) {
            drawItem(item);
        }

        // Nếu có vật phẩm đang bị móc kéo theo
        if (state.hook.grabbedItem) {
            drawItem(state.hook.grabbedItem);
        }
    }

    function drawItem(item) {
        ctx.fillStyle = item.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = item.color;
        ctx.beginPath();
        
        if (item.type === 'DIAMOND') {
            // Kim cương hình thoi
            ctx.moveTo(item.x, item.y - item.radius);
            ctx.lineTo(item.x + item.radius, item.y);
            ctx.lineTo(item.x, item.y + item.radius);
            ctx.lineTo(item.x - item.radius, item.y);
            ctx.closePath();
            ctx.fill();
        } else if (item.type.startsWith('ROCK')) {
            // Đá hình lục giác xù xì
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3 + 0.1;
                const rx = item.x + Math.cos(angle) * item.radius;
                const ry = item.y + Math.sin(angle) * item.radius;
                if (i === 0) ctx.moveTo(rx, ry);
                else ctx.lineTo(rx, ry);
            }
            ctx.closePath();
            ctx.fill();
        } else {
            // Vàng và Túi may mắn hình tròn
            ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.shadowBlur = 0; // reset
    }

    // --- GAME CONTROLFLOWS ---
    function startLevel() {
        state.status = 'PLAYING';
        state.timeRemaining = 60;
        state.targetScore = 800 + state.level * 700;
        
        minerTargetScoreVal.innerText = state.targetScore;
        minerCurrentScoreVal.innerText = state.score;
        minerTimerVal.innerText = `${state.timeRemaining}s`;
        minerLevelVal.innerText = state.level;

        generateItemsForLevel();

        // Xóa các interval cũ đề phòng
        clearInterval(state.gameInterval);
        clearInterval(state.timerInterval);

        // Chạy game loop (~60fps)
        state.gameInterval = setInterval(updateGame, 1000 / 60);

        // Chạy đếm ngược thời gian
        state.timerInterval = setInterval(() => {
            state.timeRemaining--;
            minerTimerVal.innerText = `${state.timeRemaining}s`;

            if (state.timeRemaining <= 0) {
                endLevel();
            }
        }, 1000);

        minerStatusText.innerText = 'Trò chơi bắt đầu! Đạt đủ mục tiêu điểm để qua màn.';
        minerStatusText.style.color = '#00f0ff';
    }

    function endLevel() {
        clearInterval(state.gameInterval);
        clearInterval(state.timerInterval);

        if (state.score >= state.targetScore) {
            // Qua màn
            state.level++;
            state.status = 'NEXT_LEVEL_DELAY';
            minerStatusText.innerText = `VƯỢT ẢI THÀNH CÔNG! Chuẩn bị sang Cấp độ ${state.level}...`;
            minerStatusText.style.color = '#39ff14';
            
            setTimeout(() => {
                startLevel();
            }, 3000);
        } else {
            // Thua cuộc
            state.status = 'GAME_OVER';
            minerStatusText.innerText = `GAME OVER! Bạn không đạt đủ điểm mục tiêu (${state.targetScore} điểm).`;
            minerStatusText.style.color = '#ff3b30';
            
            setTimeout(() => {
                state.status = 'LOBBY';
                minerLobby.classList.remove('hidden');
                minerGameArea.classList.add('hidden');
            }, 4000);
        }
    }

    // --- INPUT CONTROLLERS (SPACE BAR & CANVAS CLICK) ---
    function handleTrigger() {
        if (state.status === 'PLAYING') {
            shootHook();
        }
    }

    window.addEventListener('keydown', function (e) {
        if (e.code === 'Space') {
            e.preventDefault();
            handleTrigger();
        }
    });

    minerCanvas.addEventListener('mousedown', function (e) {
        e.preventDefault();
        handleTrigger();
    });

    // --- BUTTON BINDINGS ---
    btnStartMiner.addEventListener('click', function () {
        minerLobby.classList.add('hidden');
        minerGameArea.classList.remove('hidden');
        
        state.score = 0;
        state.level = 1;
        startLevel();
    });

    btnQuitMiner.addEventListener('click', function () {
        clearInterval(state.gameInterval);
        clearInterval(state.timerInterval);

        state.status = 'LOBBY';
        minerLobby.classList.remove('hidden');
        minerGameArea.classList.add('hidden');
    });
})();
