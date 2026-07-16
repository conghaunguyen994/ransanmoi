/**
 * brick_breaker.js - Neon Brick Breaker
 */

(function () {
    const breakerLobby = document.getElementById('breakerLobby');
    const breakerGameArea = document.getElementById('breakerGameArea');
    const btnStartBreaker = document.getElementById('btnStartBreaker');
    const btnQuitBreaker = document.getElementById('btnQuitBreaker');

    const labelScore = document.getElementById('breakerScore');
    const labelLives = document.getElementById('breakerLives');

    const canvas = document.getElementById('breakerCanvas');
    const ctx = canvas.getContext('2d');

    // Cấu hình gạch
    const BRICK_ROWS = 5;
    const BRICK_COLS = 8;
    const BRICK_HEIGHT = 20;
    const BRICK_GAP = 6;
    const BRICK_OFFSET_TOP = 50;
    const BRICK_OFFSET_LEFT = 35;

    // Màu sắc Neon cho 5 hàng gạch
    const NEON_COLORS = ['#ff007f', '#ff7300', '#ffe600', '#39ff14', '#00f0ff'];

    const state = {
        score: 0,
        lives: 3,
        gameActive: false,
        animationId: null,

        paddle: {
            x: 250,
            y: 460,
            width: 90,
            height: 14,
            speed: 7
        },

        ball: {
            x: 300,
            y: 440,
            dx: 3,
            dy: -3.5,
            radius: 8,
            trail: [] // Danh sách vết bóng mờ { x, y, alpha }
        },

        bricks: [], // { x, y, width, height, active, color, points }
        keys: {}
    };

    const BRICK_WIDTH = Math.floor((canvas.width - (BRICK_OFFSET_LEFT * 2) - (BRICK_COLS - 1) * BRICK_GAP) / BRICK_COLS);

    function initBricks() {
        state.bricks = [];
        for (let r = 0; r < BRICK_ROWS; r++) {
            for (let c = 0; c < BRICK_COLS; c++) {
                const brickX = BRICK_OFFSET_LEFT + c * (BRICK_WIDTH + BRICK_GAP);
                const brickY = BRICK_OFFSET_TOP + r * (BRICK_HEIGHT + BRICK_GAP);
                state.bricks.push({
                    x: brickX,
                    y: brickY,
                    width: BRICK_WIDTH,
                    height: BRICK_HEIGHT,
                    active: true,
                    color: NEON_COLORS[r % NEON_COLORS.length],
                    points: (BRICK_ROWS - r) * 10 // Hàng trên nhiều điểm hơn
                });
            }
        }
    }

    function initGame() {
        state.score = 0;
        state.lives = 3;
        
        labelScore.innerText = state.score;
        labelLives.innerText = state.lives;

        state.paddle.x = canvas.width / 2 - state.paddle.width / 2;

        resetBall();
        initBricks();

        state.gameActive = true;
        animate();
    }

    function resetBall() {
        state.ball.x = canvas.width / 2;
        state.ball.y = state.paddle.y - 12;
        state.ball.dx = (Math.random() - 0.5) * 4;
        state.ball.dy = -3.5;
        state.ball.trail = [];
    }

    function update() {
        // 1. Di chuyển thanh đỡ (Paddle)
        if (state.keys['ArrowLeft'] || state.keys['a'] || state.keys['A']) {
            state.paddle.x = Math.max(10, state.paddle.x - state.paddle.speed);
        }
        if (state.keys['ArrowRight'] || state.keys['d'] || state.keys['D']) {
            state.paddle.x = Math.min(canvas.width - state.paddle.width - 10, state.paddle.x + state.paddle.speed);
        }

        // 2. Cập nhật vệt bóng mờ (Trail)
        state.ball.trail.push({ x: state.ball.x, y: state.ball.y, alpha: 1.0 });
        if (state.ball.trail.length > 8) {
            state.ball.trail.shift();
        }

        // 3. Di chuyển quả bóng (Ball)
        const b = state.ball;
        b.x += b.dx;
        b.y += b.dy;

        // Chạm biên trái / phải -> Đổi hướng X
        if (b.x - b.radius < 10 || b.x + b.radius > canvas.width - 10) {
            b.dx *= -1;
            b.x = b.x - b.radius < 10 ? 10 + b.radius : canvas.width - 10 - b.radius;
        }

        // Chạm biên trên -> Đổi hướng Y
        if (b.y - b.radius < 10) {
            b.dy *= -1;
            b.y = 10 + b.radius;
        }

        // Chạm biên dưới -> Mất mạng
        if (b.y + b.radius > canvas.height) {
            state.lives--;
            labelLives.innerText = state.lives;

            if (state.lives <= 0) {
                handleGameOver();
            } else {
                resetBall();
            }
            return;
        }

        // 4. Va chạm quả bóng với thanh đỡ (Paddle)
        const p = state.paddle;
        if (b.x >= p.x && b.x <= p.x + p.width && 
            b.y + b.radius >= p.y && b.y - b.radius <= p.y + p.height) {
            
            // Tính góc nảy dựa trên khoảng cách va chạm so với tâm thanh đỡ
            const hitPoint = (b.x - (p.x + p.width / 2)) / (p.width / 2);
            
            b.dx = hitPoint * 4.5;
            b.dy = -Math.abs(b.dy); // Đổi hướng bay lên
            b.y = p.y - b.radius; // Đẩy bóng ra
        }

        // 5. Va chạm quả bóng với Gạch (Bricks)
        let activeBricks = 0;
        for (const brick of state.bricks) {
            if (!brick.active) continue;
            activeBricks++;

            // Kiểm tra va chạm hộp bao quanh gạch
            if (b.x + b.radius >= brick.x && b.x - b.radius <= brick.x + brick.width &&
                b.y + b.radius >= brick.y && b.y - b.radius <= brick.y + brick.height) {
                
                brick.active = false;
                state.score += brick.points;
                labelScore.innerText = state.score;

                // Thuật toán phản xạ đơn giản: Đổi hướng Y nếu va đập trên dưới, đổi hướng X nếu va đập 2 bên hông
                const fromLeft = b.x < brick.x;
                const fromRight = b.x > brick.x + brick.width;
                const fromTop = b.y < brick.y;
                const fromBottom = b.y > brick.y + brick.height;

                if (fromLeft || fromRight) {
                    b.dx *= -1;
                } else {
                    b.dy *= -1;
                }

                break; // Chỉ va chạm 1 viên mỗi frame
            }
        }

        // Chiến thắng khi đập vỡ hết sạch gạch
        if (activeBricks === 0) {
            alert('XUẤT SẮC! BẠN ĐÃ DỌN SẠCH GẠCH!');
            initGame();
        }
    }

    function draw() {
        // Xóa bảng chính
        ctx.fillStyle = '#050805';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Vẽ nền lưới xiên mờ
        ctx.strokeStyle = 'rgba(57, 255, 20, 0.02)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // 1. Vẽ thanh đỡ (Paddle - Neon màu xanh lá)
        ctx.save();
        ctx.fillStyle = '#39ff14';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#39ff14';
        ctx.beginPath();
        ctx.roundRect(state.paddle.x, state.paddle.y, state.paddle.width, state.paddle.height, 4);
        ctx.fill();
        ctx.restore();

        // 2. Vẽ gạch (Bricks - các khối neon phát sáng màu sắc sặc sỡ)
        for (const brick of state.bricks) {
            if (!brick.active) continue;
            ctx.save();
            ctx.fillStyle = brick.color;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 0.5;
            ctx.shadowBlur = 8;
            ctx.shadowColor = brick.color;
            
            ctx.beginPath();
            ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 3);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // 3. Vẽ vệt bóng mờ chuyển động (Motion Trail)
        const b = state.ball;
        for (let i = 0; i < b.trail.length; i++) {
            const t = b.trail[i];
            ctx.save();
            ctx.globalAlpha = (i + 1) / b.trail.length * 0.25;
            ctx.fillStyle = '#ffe600';
            ctx.beginPath();
            ctx.arc(t.x, t.y, b.radius - (b.trail.length - 1 - i) * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 4. Vẽ Quả bóng (Ball - Neon vàng chanh rực rỡ)
        ctx.save();
        ctx.fillStyle = '#ffe600';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ffe600';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
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
        alert('GAME OVER! Tổng số điểm phá gạch: ' + state.score);
        breakerLobby.classList.remove('hidden');
        breakerGameArea.classList.add('hidden');
    }

    // --- KEY LISTENERS ---
    window.addEventListener('keydown', function (e) {
        const view = document.getElementById('breakerView');
        if (view.classList.contains('hidden')) return;

        state.keys[e.key] = true;
    });

    window.addEventListener('keyup', function (e) {
        state.keys[e.key] = false;
    });

    // --- BUTTON BINDINGS ---
    btnStartBreaker.addEventListener('click', function () {
        breakerLobby.classList.add('hidden');
        breakerGameArea.classList.remove('hidden');
        initGame();
    });

    btnQuitBreaker.addEventListener('click', function () {
        state.gameActive = false;
        cancelAnimationFrame(state.animationId);
        breakerLobby.classList.remove('hidden');
        breakerGameArea.classList.add('hidden');
    });
})();
