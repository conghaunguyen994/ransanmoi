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
        items: [],
        explosions: [] // Hiệu ứng nổ { x, y, radius, maxRadius, alpha }
    };

    // Định nghĩa các loại vật phẩm
    const ITEM_TYPES = {
        GOLD_S: { radius: 14, color: '#ffd700', score: 100, weight: 1.2 },
        GOLD_M: { radius: 24, color: '#ffd700', score: 250, weight: 2.2 },
        GOLD_L: { radius: 36, color: '#ffd700', score: 500, weight: 4.0 },
        DIAMOND: { radius: 10, color: '#b026ff', score: 600, weight: 0.5 },
        ROCK_S: { radius: 18, color: '#7f8c8d', score: 20, weight: 3.5 },
        ROCK_L: { radius: 30, color: '#7f8c8d', score: 50, weight: 6.0 },
        TNT: { radius: 20, color: '#ff3b30', score: 0, weight: 1.0 }, // Thùng thuốc nổ
        PIG: { radius: 16, color: '#ff85a2', score: 150, weight: 1.5 }, // Heo di động
        BAT: { radius: 15, color: '#34495e', score: 80, weight: 1.0 }, // Dơi di động
        LUCKY: { radius: 16, color: '#ff3b30', score: null, weight: 1.5 } // Điểm random
    };

    // --- LOAD ASSET SPRITES ---
    const imgMiner = new Image();
    imgMiner.src = 'assets/miner_character.png';

    const imgGold = new Image();
    imgGold.src = 'assets/neon_gold_nugget.png';

    const imgDiamond = new Image();
    imgDiamond.src = 'assets/neon_diamond.png';

    const imgTNT = new Image();
    imgTNT.src = 'assets/tnt_barrel.png';

    const imgPig = new Image();
    imgPig.src = 'assets/little_pig.png';

    const imgBat = new Image();
    imgBat.src = 'assets/flying_bat.png';

    // --- GAME ENGINE ---
    
    // Sinh ngẫu nhiên các vật phẩm dựa theo cấp độ
    function generateItemsForLevel() {
        state.items = [];
        state.explosions = [];
        const count = 10 + state.level * 2;
        const types = Object.keys(ITEM_TYPES);

        for (let i = 0; i < count; i++) {
            let itemTypeKey = types[Math.floor(Math.random() * types.length)];
            
            // Điều chỉnh xác suất: Diamond/TNT/Heo/Dơi phụ thuộc cấp độ
            if (state.level === 1) {
                // Màn 1: Không có heo, dơi, TNT
                if (['TNT', 'PIG', 'BAT'].includes(itemTypeKey)) {
                    itemTypeKey = 'GOLD_S';
                }
            } else {
                // Các màn sau: diamond hiếm hơn
                if (itemTypeKey === 'DIAMOND' && Math.random() > 0.3) {
                    itemTypeKey = 'GOLD_S';
                }
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

            // Tốc độ di chuyển cho Heo và Dơi
            let speedX = 0;
            let speedY = 0;
            if (itemTypeKey === 'PIG') {
                speedX = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.8);
            } else if (itemTypeKey === 'BAT') {
                speedX = (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.0);
                speedY = (Math.random() > 0.5 ? 0.3 : -0.3); // Bay lượn sóng
            }

            state.items.push({
                x, y,
                radius: conf.radius,
                color: conf.color,
                scoreValue: actualScore,
                weight: conf.weight,
                type: itemTypeKey,
                speedX,
                speedY,
                initialY: y // Để tính toán chuyển động lượn sóng cho dơi
            });
        }
    }

    // Phóng móc
    function shootHook() {
        if (state.hook.state !== 'SWINGING') return;
        state.hook.state = 'SHOOTING';
    }

    // Kích nổ bom TNT
    function triggerTNT(tntX, tntY) {
        // Thêm hiệu ứng nổ
        state.explosions.push({
            x: tntX,
            y: tntY,
            radius: 10,
            maxRadius: 100,
            alpha: 1.0
        });

        // Hủy diệt các vật thể nằm trong bán kính nổ
        const explosionRadius = 110;
        state.items = state.items.filter(item => {
            const dist = Math.hypot(item.x - tntX, item.y - tntY);
            if (dist < explosionRadius) {
                // Nếu nổ trúng 1 quả bom TNT khác -> kích nổ dây chuyền
                if (item.type === 'TNT') {
                    setTimeout(() => triggerTNT(item.x, item.y), 150);
                }
                return false; // Bị nổ tung (xóa khỏi mảng)
            }
            return true;
        });

        minerStatusText.innerText = 'BÙM! Thùng thuốc nổ đã kích hoạt!';
        minerStatusText.style.color = '#ff3b30';
    }

    // Cập nhật trạng thái Móc & Va chạm
    function updateGame() {
        if (state.status !== 'PLAYING') return;

        const hook = state.hook;

        // 1. Cập nhật vị trí di chuyển cho các vật thể tự động (Heo, Dơi)
        for (const item of state.items) {
            if (item.type === 'PIG') {
                item.x += item.speedX;
                // Quay đầu khi chạm biên
                if (item.x - item.radius < 5 || item.x + item.radius > minerCanvas.width - 5) {
                    item.speedX *= -1;
                }
            } else if (item.type === 'BAT') {
                item.x += item.speedX;
                // Chuyển động lượn sóng Y
                item.y = item.initialY + Math.sin(item.x * 0.05) * 20;
                
                // Quay đầu khi chạm biên
                if (item.x - item.radius < 5 || item.x + item.radius > minerCanvas.width - 5) {
                    item.speedX *= -1;
                }
            }
        }

        // 2. Cập nhật hiệu ứng nổ
        for (let i = state.explosions.length - 1; i >= 0; i--) {
            const exp = state.explosions[i];
            exp.radius += 5;
            exp.alpha -= 0.04;
            if (exp.alpha <= 0) {
                state.explosions.splice(i, 1);
            }
        }

        // 3. Xử lý trạng thái Móc
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
                    // Nếu là bom TNT -> Nổ ngay lập tức, không kéo về
                    if (item.type === 'TNT') {
                        triggerTNT(item.x, item.y);
                        hook.state = 'RETRIEVING';
                        state.items.splice(i, 1); // Xóa bom TNT
                    } else {
                        // Tóm được vật phẩm thường
                        hook.state = 'RETRIEVING';
                        // Dừng di chuyển của vật thể bị kéo
                        item.speedX = 0;
                        item.speedY = 0;
                        hook.grabbedItem = item;
                        state.items.splice(i, 1); // Xóa khỏi danh sách dưới đất
                    }
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
                    let name = 'vật phẩm';
                    if (hook.grabbedItem.type.startsWith('GOLD')) name = 'Vàng';
                    else if (hook.grabbedItem.type === 'DIAMOND') name = 'Kim cương';
                    else if (hook.grabbedItem.type === 'PIG') name = 'Heo con';
                    else if (hook.grabbedItem.type === 'BAT') name = 'Con dơi';
                    else if (hook.grabbedItem.type === 'LUCKY') name = 'Túi may mắn';

                    minerStatusText.innerText = `Kéo được ${name}! +${hook.grabbedItem.scoreValue} điểm.`;
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

        // Vẽ hậu cảnh hầm mỏ nhẹ nhàng
        ctx.strokeStyle = '#1a1f2c';
        ctx.lineWidth = 1;
        for (let i = 0; i < minerCanvas.width; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, 80);
            ctx.lineTo(i, minerCanvas.height);
            ctx.stroke();
        }
        for (let j = 80; j < minerCanvas.height; j += 40) {
            ctx.beginPath();
            ctx.moveTo(0, j);
            ctx.lineTo(minerCanvas.width, j);
            ctx.stroke();
        }

        // Vẽ dây móc
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#00f0ff';
        ctx.beginPath();
        ctx.moveTo(300, HOOK_START_Y + 15); // Xuất phát từ dưới máy đào một chút
        ctx.lineTo(state.hook.x, state.hook.y);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset

        // Tính toán animation kéo tời cho thợ đào vàng
        let minerOffsetY = 0;
        let minerAngle = 0;
        if (state.hook.state === 'RETRIEVING') {
            // Lắc người nhẹ liên tục mô phỏng đang quay tay quay kéo cáp
            minerOffsetY = Math.sin(Date.now() * 0.02) * 4;
            minerAngle = Math.sin(Date.now() * 0.02) * 0.06;
        }

        // Vẽ thợ đào vàng cổ điển ở giữa trên (300, 30)
        ctx.save();
        ctx.translate(300, 35 + minerOffsetY);
        ctx.rotate(minerAngle);
        try {
            ctx.drawImage(imgMiner, -35, -30, 70, 70);
        } catch (e) {
            // Fallback
            ctx.fillStyle = '#b026ff';
            ctx.beginPath();
            ctx.arc(0, 15, 15, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Vẽ ròng rọc quay (pulley animation) ở trục quay
        ctx.save();
        ctx.translate(300, HOOK_START_Y + 15);
        if (state.hook.state === 'RETRIEVING') {
            // Xoay liên tục khi đang kéo đồ
            ctx.rotate(Date.now() * 0.015);
        }
        // Vẽ đĩa xích ròng rọc neon màu tím
        ctx.strokeStyle = '#b026ff';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#b026ff';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.stroke();
        // Vẽ 4 nan hoa nhỏ xoay theo
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(i * Math.PI / 2) * 8, Math.sin(i * Math.PI / 2) * 8);
            ctx.stroke();
        }
        ctx.restore();

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

        // Vẽ hiệu ứng nổ TNT
        for (const exp of state.explosions) {
            ctx.save();
            ctx.globalAlpha = exp.alpha;
            
            // Vẽ quầng lửa neon cam đỏ
            const grad = ctx.createRadialGradient(exp.x, exp.y, exp.radius * 0.1, exp.x, exp.y, exp.radius);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.2, '#ff9f43');
            grad.addColorStop(0.8, '#ff3b30');
            grad.addColorStop(1, '#07080c');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawItem(item) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = item.color;
        
        if (item.type.startsWith('GOLD')) {
            try {
                // Vẽ sprite vàng neon
                ctx.drawImage(imgGold, item.x - item.radius, item.y - item.radius, item.radius * 2, item.radius * 2);
            } catch (e) {
                ctx.fillStyle = item.color;
                ctx.beginPath();
                ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (item.type === 'DIAMOND') {
            try {
                // Vẽ sprite kim cương neon
                ctx.drawImage(imgDiamond, item.x - item.radius, item.y - item.radius, item.radius * 2, item.radius * 2);
            } catch (e) {
                ctx.fillStyle = item.color;
                ctx.beginPath();
                ctx.moveTo(item.x, item.y - item.radius);
                ctx.lineTo(item.x + item.radius, item.y);
                ctx.lineTo(item.x, item.y + item.radius);
                ctx.lineTo(item.x - item.radius, item.y);
                ctx.closePath();
                ctx.fill();
            }
        } else if (item.type === 'TNT') {
            try {
                // Vẽ thùng thuốc nổ
                ctx.drawImage(imgTNT, item.x - item.radius, item.y - item.radius, item.radius * 2, item.radius * 2);
            } catch (e) {
                ctx.fillStyle = item.color;
                ctx.fillRect(item.x - item.radius, item.y - item.radius, item.radius * 2, item.radius * 2);
            }
        } else if (item.type === 'PIG') {
            try {
                // Vẽ heo con di chuyển
                ctx.drawImage(imgPig, item.x - item.radius, item.y - item.radius, item.radius * 2, item.radius * 2);
            } catch (e) {
                ctx.fillStyle = item.color;
                ctx.beginPath();
                ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (item.type === 'BAT') {
            try {
                // Vẽ dơi bay
                ctx.drawImage(imgBat, item.x - item.radius, item.y - item.radius, item.radius * 2, item.radius * 2);
            } catch (e) {
                ctx.fillStyle = item.color;
                ctx.beginPath();
                ctx.ellipse(item.x, item.y, item.radius, item.radius * 0.6, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (item.type.startsWith('ROCK')) {
            // Đá giữ nguyên hình lục giác Cyberpunk phát sáng xám
            ctx.fillStyle = item.color;
            ctx.beginPath();
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
            // Túi may mắn phát sáng đỏ neon
            ctx.fillStyle = item.color;
            ctx.beginPath();
            ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Vẽ dấu hỏi chấm nhỏ lên túi
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', item.x, item.y);
        }
        
        ctx.restore();
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
