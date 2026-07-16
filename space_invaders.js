/**
 * space_invaders.js - Neon Space Invaders
 */

(function () {
    const invadersLobby = document.getElementById('invadersLobby');
    const invadersGameArea = document.getElementById('invadersGameArea');
    const btnStartInvaders = document.getElementById('btnStartInvaders');
    const btnQuitInvaders = document.getElementById('btnQuitInvaders');

    const labelScore = document.getElementById('invadersScore');
    const labelLives = document.getElementById('invadersLives');
    const labelStage = document.getElementById('invadersStage');

    const canvas = document.getElementById('invadersCanvas');
    const ctx = canvas.getContext('2d');

    // Cấu hình trò chơi
    const ALIEN_ROWS = 4;
    const ALIEN_COLS = 8;
    const ALIEN_WIDTH = 32;
    const ALIEN_HEIGHT = 24;

    const state = {
        score: 0,
        lives: 3,
        stage: 1,
        gameActive: false,
        animationId: null,

        player: { x: 275, y: 440, width: 45, height: 20, speed: 6 },
        bullets: [],       // Đạn của Player { x, y, speed }
        alienBullets: [],  // Đạn của Alien { x, y, speed }
        aliens: [],        // Danh sách Alien { x, y, row, col, active, color }
        alienDir: 1,       // 1: Phải, -1: Trái
        alienSpeed: 1,
        lastAlienShotTime: 0,

        particles: [],     // Hiệu ứng nổ hạt bụi { x, y, vx, vy, color, alpha, life }
        keys: {}
    };

    // Tạo danh sách quân địch (Alien)
    function initAliens() {
        state.aliens = [];
        const colors = ['#ff007f', '#00f0ff', '#39ff14', '#ffe600']; // Mỗi hàng một màu neon
        for (let r = 0; r < ALIEN_ROWS; r++) {
            for (let c = 0; c < ALIEN_COLS; c++) {
                state.aliens.push({
                    x: 60 + c * 60,
                    y: 60 + r * 45,
                    row: r,
                    col: c,
                    width: ALIEN_WIDTH,
                    height: ALIEN_HEIGHT,
                    active: true,
                    color: colors[r % colors.length]
                });
            }
        }
        state.alienDir = 1;
        state.alienSpeed = 1 + (state.stage - 1) * 0.4;
    }

    function createExplosion(x, y, color) {
        for (let i = 0; i < 15; i++) {
            state.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                color: color,
                alpha: 1,
                life: 30 + Math.random() * 20
            });
        }
    }

    function startGame() {
        state.score = 0;
        state.lives = 3;
        state.stage = 1;
        state.bullets = [];
        state.alienBullets = [];
        state.particles = [];
        state.player.x = 275;

        labelScore.innerText = state.score;
        labelLives.innerText = state.lives;
        labelStage.innerText = state.stage;

        initAliens();
        state.gameActive = true;
        animate();
    }

    function update() {
        // 1. Di chuyển Player bằng cụm phím mũi tên hoặc A/D
        if (state.keys['ArrowLeft'] || state.keys['a'] || state.keys['A']) {
            state.player.x = Math.max(10, state.player.x - state.player.speed);
        }
        if (state.keys['ArrowRight'] || state.keys['d'] || state.keys['D']) {
            state.player.x = Math.min(canvas.width - state.player.width - 10, state.player.x + state.player.speed);
        }

        // 2. Bắn đạn (Space)
        if (state.keys[' '] || state.keys['Space']) {
            // Giới hạn tốc độ bắn đạn (300ms)
            const now = Date.now();
            if (!state.player.lastShotTime || now - state.player.lastShotTime > 350) {
                state.bullets.push({
                    x: state.player.x + state.player.width / 2 - 2,
                    y: state.player.y - 10,
                    width: 4,
                    height: 12,
                    speed: 7
                });
                state.player.lastShotTime = now;
            }
        }

        // 3. Di chuyển đạn của Player & va chạm Alien
        for (let i = state.bullets.length - 1; i >= 0; i--) {
            const b = state.bullets[i];
            b.y -= b.speed;

            // Bay ra ngoài
            if (b.y < 0) {
                state.bullets.splice(i, 1);
                continue;
            }

            // Kiểm tra va chạm với Alien
            let hit = false;
            for (const alien of state.aliens) {
                if (alien.active && 
                    b.x >= alien.x && b.x <= alien.x + alien.width &&
                    b.y >= alien.y && b.y <= alien.y + alien.height) {
                    
                    alien.active = false;
                    createExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2, alien.color);
                    state.score += 15;
                    labelScore.innerText = state.score;
                    hit = true;
                    break;
                }
            }

            if (hit) {
                state.bullets.splice(i, 1);
            }
        }

        // 4. Di chuyển liên đoàn Alien
        let shiftDown = false;
        let leftmost = canvas.width;
        let rightmost = 0;
        let activeCount = 0;

        for (const alien of state.aliens) {
            if (!alien.active) continue;
            activeCount++;
            if (alien.x < leftmost) leftmost = alien.x;
            if (alien.x + alien.width > rightmost) rightmost = alien.x + alien.width;
        }

        // Qua bàn mới nếu diệt sạch Alien
        if (activeCount === 0) {
            state.stage++;
            labelStage.innerText = state.stage;
            initAliens();
            return;
        }

        // Chạm biên -> Đổi hướng và đi xuống dưới
        if (rightmost + state.alienDir * state.alienSpeed > canvas.width - 20 || leftmost + state.alienDir * state.alienSpeed < 20) {
            state.alienDir *= -1;
            shiftDown = true;
        }

        for (const alien of state.aliens) {
            if (!alien.active) continue;
            alien.x += state.alienDir * state.alienSpeed;
            if (shiftDown) {
                alien.y += 20;
                // Nếu Alien chạm vạch của Player -> Game Over
                if (alien.y + alien.height >= state.player.y) {
                    handleGameOver();
                    return;
                }
            }
        }

        // 5. Quân địch Alien bắn trả tự động
        const now = Date.now();
        if (now - state.lastAlienShotTime > Math.max(500, 1500 - state.stage * 150)) {
            // Chọn ngẫu nhiên 1 Alien ngẫu nhiên đang hoạt động ở hàng dưới cùng để bắn
            const activeAliens = state.aliens.filter(a => a.active);
            if (activeAliens.length > 0) {
                const randomAlien = activeAliens[Math.floor(Math.random() * activeAliens.length)];
                state.alienBullets.push({
                    x: randomAlien.x + randomAlien.width / 2,
                    y: randomAlien.y + randomAlien.height,
                    width: 3,
                    height: 10,
                    speed: 3.5 + state.stage * 0.3
                });
                state.lastAlienShotTime = now;
            }
        }

        // 6. Cập nhật đạn của Alien & va chạm Player
        for (let i = state.alienBullets.length - 1; i >= 0; i--) {
            const ab = state.alienBullets[i];
            ab.y += ab.speed;

            if (ab.y > canvas.height) {
                state.alienBullets.splice(i, 1);
                continue;
            }

            // Kiểm tra va chạm với phi thuyền của Player
            if (ab.x >= state.player.x && ab.x <= state.player.x + state.player.width &&
                ab.y >= state.player.y && ab.y <= state.player.y + state.player.height) {
                
                state.alienBullets.splice(i, 1);
                state.lives--;
                labelLives.innerText = state.lives;
                createExplosion(state.player.x + state.player.width / 2, state.player.y + state.player.height / 2, '#ff007f');
                
                if (state.lives <= 0) {
                    handleGameOver();
                }
                break;
            }
        }

        // 7. Cập nhật các hạt bụi vụ nổ (Particles)
        for (let i = state.particles.length - 1; i >= 0; i--) {
            const p = state.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.alpha = Math.max(0, p.life / 50);

            if (p.life <= 0) {
                state.particles.splice(i, 1);
            }
        }
    }

    function draw() {
        // Xóa màn hình
        ctx.fillStyle = '#05050a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Vẽ lưới nền mờ ảo Cyberpunk
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
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

        // 1. Vẽ phi thuyền người chơi (Player - Vector phát sáng màu Cyan)
        ctx.save();
        ctx.fillStyle = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f0ff';
        ctx.beginPath();
        // Vẽ phi thuyền hình khối mũi nhọn
        ctx.moveTo(state.player.x + state.player.width / 2, state.player.y);
        ctx.lineTo(state.player.x + state.player.width, state.player.y + state.player.height);
        ctx.lineTo(state.player.x, state.player.y + state.player.height);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // 2. Vẽ liên đoàn Alien (Neon phát sáng tùy màu)
        for (const alien of state.aliens) {
            if (!alien.active) continue;
            ctx.save();
            ctx.fillStyle = alien.color;
            ctx.shadowBlur = 8;
            ctx.shadowColor = alien.color;
            
            // Vẽ alien dáng quái vật cua nhỏ bằng vector bo góc
            ctx.beginPath();
            ctx.roundRect(alien.x, alien.y, alien.width, alien.height, 4);
            ctx.fill();

            // Vẽ mắt nhỏ bên trong
            ctx.fillStyle = '#000';
            ctx.fillRect(alien.x + 6, alien.y + 6, 4, 4);
            ctx.fillRect(alien.x + alien.width - 10, alien.y + 6, 4, 4);
            ctx.restore();
        }

        // 3. Vẽ đạn của Player
        for (const b of state.bullets) {
            ctx.save();
            ctx.fillStyle = '#00f0ff';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#00f0ff';
            ctx.fillRect(b.x, b.y, b.width, b.height);
            ctx.restore();
        }

        // 4. Vẽ đạn của Alien
        for (const ab of state.alienBullets) {
            ctx.save();
            ctx.fillStyle = '#ff007f';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ff007f';
            ctx.fillRect(ab.x, ab.y, ab.width, ab.height);
            ctx.restore();
        }

        // 5. Vẽ hiệu ứng hạt bụi sáng nổ tung
        for (const p of state.particles) {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 6;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
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
        alert('GAME OVER! Điểm số của bạn: ' + state.score);
        invadersLobby.classList.remove('hidden');
        invadersGameArea.classList.add('hidden');
    }

    // --- KEYBOARD LISTENERS ---
    window.addEventListener('keydown', function (e) {
        const view = document.getElementById('invadersView');
        if (view.classList.contains('hidden')) return;

        state.keys[e.key] = true;
        // Chặn cuộn trang khi bấm phím Space
        if (e.key === ' ') {
            e.preventDefault();
        }
    });

    window.addEventListener('keyup', function (e) {
        state.keys[e.key] = false;
    });

    // --- BUTTON BINDINGS ---
    btnStartInvaders.addEventListener('click', function () {
        invadersLobby.classList.add('hidden');
        invadersGameArea.classList.remove('hidden');
        startGame();
    });

    btnQuitInvaders.addEventListener('click', function () {
        state.gameActive = false;
        cancelAnimationFrame(state.animationId);
        invadersLobby.classList.remove('hidden');
        invadersGameArea.classList.add('hidden');
    });
})();
