// dino.js - Neon Dino (Khủng long nhảy chướng ngại vật)

const dinoCanvas = document.getElementById('dinoCanvas');
const dinoCtx = dinoCanvas.getContext('2d');

const dinoScoreText = document.getElementById('dinoScore');
const dinoHighScoreText = document.getElementById('dinoHighScore');
const dinoStatusText = document.getElementById('dinoStatusText');

const offlineAlert = document.getElementById('offlineAlert');
const btnPlayDinoOffline = document.getElementById('btnPlayDinoOffline');
const btnCloseOfflineAlert = document.getElementById('btnCloseOfflineAlert');

// --- HẰNG SỐ VẬT LÝ & TRẠNG THÁI ---
const DINO_GROUND_Y = 160; // Đường mặt đất y
const DINO_NORMAL_HEIGHT = 44;
const DINO_DUCK_HEIGHT = 22;
const DINO_WIDTH = 30;

const dinoState = {
    // Khủng long
    x: 50,
    y: DINO_GROUND_Y - DINO_NORMAL_HEIGHT,
    width: DINO_WIDTH,
    height: DINO_NORMAL_HEIGHT,
    isJumping: false,
    isDucking: false,
    velocity: 0,
    gravity: 0.6,
    jumpForce: -11,
    
    // Trạng thái chơi
    status: 'START', // START | PLAYING | GAMEOVER
    score: 0,
    highScore: parseInt(localStorage.getItem('dino_high_score') || '0'),
    
    // Tốc độ và chướng ngại vật
    gameSpeed: 6,
    maxGameSpeed: 15,
    obstacles: [],
    spawnTimer: 0,
    
    // Hiệu ứng hạt bụi phát sáng khi va chạm
    particles: [],
    
    // Để vẽ động tác chân khủng long chạy
    legsFrame: 0
};

// Khởi tạo bảng điểm cao ban đầu
dinoHighScoreText.innerText = String(dinoState.highScore).padStart(5, '0');

// --- QUẢN LÝ THIẾT KẾ ĐỒ HỌA NEON (VECTOR ART) ---

// Vẽ Khủng long Dino
function drawDino() {
    dinoCtx.save();
    
    // Hiệu ứng phát sáng màu xanh lá neon
    dinoCtx.shadowBlur = 10;
    dinoCtx.shadowColor = '#39ff14';
    dinoCtx.strokeStyle = '#39ff14';
    dinoCtx.fillStyle = '#07080c';
    dinoCtx.lineWidth = 2.5;
    
    dinoCtx.beginPath();
    
    if (dinoState.isDucking) {
        // Vẽ Dino đang cúi người (thấp hơn, kéo dài hơn)
        const dx = dinoState.x;
        const dy = dinoState.y;
        const dw = 44;
        const dh = DINO_DUCK_HEIGHT;
        
        // Vẽ thân hình chữ nhật bo tròn đơn giản
        dinoCtx.rect(dx, dy, dw, dh);
        dinoCtx.stroke();
        dinoCtx.fill();
        
        // Vẽ mắt cúi đầu
        dinoCtx.fillStyle = '#39ff14';
        dinoCtx.fillRect(dx + 34, dy + 5, 4, 4);
    } else {
        // Vẽ Dino đứng thẳng (Phong cách Vector Cyberpunk)
        const dx = dinoState.x;
        const dy = dinoState.y;
        
        // Vẽ đường viền khủng long T-Rex retro
        dinoCtx.moveTo(dx, dy + 25); // Đuôi
        dinoCtx.lineTo(dx + 5, dy + 32);
        dinoCtx.lineTo(dx + 12, dy + 32); // Thân dưới
        
        // Chân chạy (thay đổi vị trí theo khung legsFrame)
        if (dinoState.isJumping) {
            dinoCtx.lineTo(dx + 10, dy + 42); // Chân co lên
            dinoCtx.moveTo(dx + 18, dy + 42);
        } else {
            const frame = Math.floor(dinoState.legsFrame / 8) % 2;
            if (frame === 0) {
                dinoCtx.lineTo(dx + 10, dy + 44); // Chân trái chạm đất
                dinoCtx.lineTo(dx + 12, dy + 44);
                dinoCtx.moveTo(dx + 18, dy + 32);
                dinoCtx.lineTo(dx + 20, dy + 40); // Chân phải nhấc lên
            } else {
                dinoCtx.lineTo(dx + 10, dy + 32);
                dinoCtx.lineTo(dx + 12, dy + 40); // Chân trái nhấc lên
                dinoCtx.moveTo(dx + 18, dy + 32);
                dinoCtx.lineTo(dx + 20, dy + 44); // Chân phải chạm đất
                dinoCtx.lineTo(dx + 22, dy + 44);
            }
        }
        
        dinoCtx.moveTo(dx + 12, dy + 32);
        dinoCtx.lineTo(dx + 24, dy + 32); // Thân trước
        dinoCtx.lineTo(dx + 24, dy + 18); // Cổ trước
        dinoCtx.lineTo(dx + 30, dy + 18); // Đầu mõm dưới
        dinoCtx.lineTo(dx + 30, dy + 5);   // Đầu trước
        dinoCtx.lineTo(dx + 18, dy + 5);   // Đầu trên
        dinoCtx.lineTo(dx + 18, dy + 12);  // Gáy đầu
        dinoCtx.lineTo(dx + 14, dy + 16);  // Cổ sau
        dinoCtx.lineTo(dx + 8, dy + 22);   // Lưng
        dinoCtx.closePath();
        dinoCtx.stroke();
        dinoCtx.fill();
        
        // Tay ngắn T-Rex
        dinoCtx.beginPath();
        dinoCtx.moveTo(dx + 22, dy + 22);
        dinoCtx.lineTo(dx + 26, dy + 22);
        dinoCtx.lineTo(dx + 26, dy + 26);
        dinoCtx.stroke();
        
        // Điểm sáng mắt
        dinoCtx.fillStyle = '#39ff14';
        dinoCtx.fillRect(dx + 22, dy + 8, 3, 3);
    }
    
    dinoCtx.restore();
}

// Vẽ chướng ngại vật (Cây xương rồng neon hồng hoặc Laser bird cyan)
function drawObstacles() {
    dinoState.obstacles.forEach(obs => {
        dinoCtx.save();
        
        if (obs.type === 'CACTUS') {
            // Vẽ xương rồng neon màu hồng phát sáng
            dinoCtx.shadowBlur = 10;
            dinoCtx.shadowColor = '#ff007f';
            dinoCtx.strokeStyle = '#ff007f';
            dinoCtx.fillStyle = '#07080c';
            dinoCtx.lineWidth = 2.5;
            
            dinoCtx.beginPath();
            dinoCtx.rect(obs.x, obs.y, obs.width, obs.height);
            dinoCtx.stroke();
            dinoCtx.fill();
            
            // Nhánh bên trái xương rồng
            if (obs.height > 20) {
                dinoCtx.beginPath();
                dinoCtx.moveTo(obs.x, obs.y + obs.height - 20);
                dinoCtx.lineTo(obs.x - 6, obs.y + obs.height - 20);
                dinoCtx.lineTo(obs.x - 6, obs.y + obs.height - 28);
                dinoCtx.stroke();
                
                // Nhánh bên phải xương rồng
                dinoCtx.beginPath();
                dinoCtx.moveTo(obs.x + obs.width, obs.y + obs.height - 15);
                dinoCtx.lineTo(obs.x + obs.width + 6, obs.y + obs.height - 15);
                dinoCtx.lineTo(obs.x + obs.width + 6, obs.y + obs.height - 24);
                dinoCtx.stroke();
            }
            
        } else if (obs.type === 'BIRD') {
            // Vẽ Chim Laser phát sáng màu xanh cyan
            dinoCtx.shadowBlur = 10;
            dinoCtx.shadowColor = '#00f0ff';
            dinoCtx.strokeStyle = '#00f0ff';
            dinoCtx.fillStyle = '#07080c';
            dinoCtx.lineWidth = 2.5;
            
            const bx = obs.x;
            const by = obs.y;
            const bw = obs.width;
            const bh = obs.height;
            
            dinoCtx.beginPath();
            dinoCtx.moveTo(bx, by + bh / 2);
            dinoCtx.lineTo(bx + bw / 3, by); // Mỏ
            dinoCtx.lineTo(bx + bw, by + 2); // Thân sau
            dinoCtx.lineTo(bx + bw * 0.7, by + bh); // Bụng
            
            // Vẽ cánh chim đập lên xuống theo legsFrame
            const flap = Math.floor(dinoState.legsFrame / 6) % 2;
            if (flap === 0) {
                dinoCtx.lineTo(bx + bw / 2, by + bh + 6); // Cánh đập xuống
            } else {
                dinoCtx.lineTo(bx + bw / 2, by - 6);      // Cánh vươn lên
            }
            
            dinoCtx.closePath();
            dinoCtx.stroke();
            dinoCtx.fill();
        }
        
        dinoCtx.restore();
    });
}

// Vẽ vạch đất Neon và lưới Cyberpunk chuyển dịch ngược
function drawGround() {
    dinoCtx.save();
    
    // Đường ngang đất chính phát sáng neon tím
    dinoCtx.shadowBlur = 8;
    dinoCtx.shadowColor = '#b026ff';
    dinoCtx.strokeStyle = '#b026ff';
    dinoCtx.lineWidth = 2;
    
    dinoCtx.beginPath();
    dinoCtx.moveTo(0, DINO_GROUND_Y);
    dinoCtx.lineTo(dinoCanvas.width, DINO_GROUND_Y);
    dinoCtx.stroke();
    
    // Vẽ các gờ đất chạy ngược lại để tạo cảm giác di chuyển
    dinoCtx.shadowBlur = 4;
    dinoCtx.lineWidth = 1.5;
    dinoCtx.beginPath();
    
    const speedOffset = (Math.floor(dinoState.legsFrame * dinoState.gameSpeed) % 80);
    for (let gx = -speedOffset; gx < dinoCanvas.width; gx += 80) {
        dinoCtx.moveTo(gx, DINO_GROUND_Y);
        dinoCtx.lineTo(gx - 15, DINO_GROUND_Y + 12);
        dinoCtx.moveTo(gx + 40, DINO_GROUND_Y);
        dinoCtx.lineTo(gx + 30, DINO_GROUND_Y + 8);
    }
    dinoCtx.stroke();
    
    dinoCtx.restore();
}

// --- LOGIC VẬT LÝ & VA CHẠM (GAME LOOP) ---

// Khởi tạo lại trò chơi mới
function resetDinoGame() {
    dinoState.x = 50;
    dinoState.height = DINO_NORMAL_HEIGHT;
    dinoState.y = DINO_GROUND_Y - DINO_NORMAL_HEIGHT;
    dinoState.velocity = 0;
    dinoState.isJumping = false;
    dinoState.isDucking = false;
    
    dinoState.score = 0;
    dinoState.gameSpeed = 6;
    dinoState.obstacles = [];
    dinoState.particles = [];
    dinoState.spawnTimer = 60; // Spawn chướng ngại đầu tiên nhanh
    
    dinoState.status = 'PLAYING';
    dinoStatusText.innerText = "ĐANG CHƠI - ĐIỂM SỐ TĂNG DẦN";
}

// Tạo hiệu ứng hạt nổ khi va chạm thất bại
function spawnParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        dinoState.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8 - 2,
            size: Math.random() * 3 + 2,
            alpha: 1,
            color: color
        });
    }
}

// Cập nhật tọa độ hạt phát sáng
function updateParticles() {
    for (let i = dinoState.particles.length - 1; i >= 0; i--) {
        const p = dinoState.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.02;
        
        if (p.alpha <= 0) {
            dinoState.particles.splice(i, 1);
        }
    }
}

// Vẽ hạt phát sáng
function drawParticles() {
    dinoState.particles.forEach(p => {
        dinoCtx.save();
        dinoCtx.shadowBlur = 6;
        dinoCtx.shadowColor = p.color;
        dinoCtx.fillStyle = p.color;
        dinoCtx.globalAlpha = p.alpha;
        dinoCtx.beginPath();
        dinoCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        dinoCtx.fill();
        dinoCtx.restore();
    });
}

// Sinh chướng ngại vật ngẫu nhiên
function spawnObstacle() {
    const isBird = Math.random() < 0.25; // 25% sinh chim bay
    
    if (isBird) {
        // Chim bay ở hai tầm cao khác nhau
        const heights = [105, 135]; // 105: nhảy cúi né, 135: nhảy qua hoặc cúi
        const chosenY = heights[Math.floor(Math.random() * heights.length)];
        dinoState.obstacles.push({
            type: 'BIRD',
            x: dinoCanvas.width,
            y: chosenY,
            width: 26,
            height: 18
        });
    } else {
        // Sinh cây xương rồng (cactus)
        const sizeRand = Math.random();
        let width = 16;
        let height = 30;
        
        if (sizeRand > 0.7) {
            width = 28; // Xương rồng kép
            height = 36;
        } else if (sizeRand > 0.4) {
            width = 18; // Xương rồng to
            height = 38;
        }
        
        dinoState.obstacles.push({
            type: 'CACTUS',
            x: dinoCanvas.width,
            y: DINO_GROUND_Y - height,
            width: width,
            height: height
        });
    }
}

// Cập nhật trạng thái game
function updateDinoGame() {
    if (dinoState.status !== 'PLAYING') {
        if (dinoState.status === 'GAMEOVER') {
            updateParticles();
        }
        return;
    }
    
    dinoState.legsFrame++;
    
    // Tích điểm tăng dần
    dinoState.score += 0.15;
    dinoScoreText.innerText = String(Math.floor(dinoState.score)).padStart(5, '0');
    
    // Gia tốc game tốc độ tăng dần từ từ
    if (dinoState.gameSpeed < dinoState.maxGameSpeed) {
        dinoState.gameSpeed += 0.001;
    }
    
    // Vật lý Khủng long nhảy
    dinoState.y += dinoState.velocity;
    
    if (dinoState.y + dinoState.height < DINO_GROUND_Y) {
        // Đang ở trên không
        dinoState.velocity += dinoState.gravity;
        dinoState.isJumping = true;
    } else {
        // Trở lại chạm mặt đất
        dinoState.y = DINO_GROUND_Y - dinoState.height;
        dinoState.velocity = 0;
        dinoState.isJumping = false;
    }
    
    // Xử lý tạo chướng ngại vật theo thời gian đếm ngược
    dinoState.spawnTimer--;
    if (dinoState.spawnTimer <= 0) {
        spawnObstacle();
        dinoState.spawnTimer = Math.random() * 50 + (60 - Math.floor(dinoState.gameSpeed * 2)); // Tần số sinh nhanh hơn khi tốc độ tăng
    }
    
    // Di chuyển chướng ngại vật và kiểm tra va chạm
    for (let i = dinoState.obstacles.length - 1; i >= 0; i--) {
        const obs = dinoState.obstacles[i];
        obs.x -= dinoState.gameSpeed;
        
        // Xoá chướng ngại vật trượt ra ngoài màn hình bên trái
        if (obs.x + obs.width < 0) {
            dinoState.obstacles.splice(i, 1);
            continue;
        }
        
        // Kiểm tra va chạm Bounding Box (AABB)
        const hit = (
            dinoState.x < obs.x + obs.width &&
            dinoState.x + dinoState.width > obs.x &&
            dinoState.y < obs.y + obs.height &&
            dinoState.y + dinoState.height > obs.y
        );
        
        if (hit) {
            // Xử lý game kết thúc (Dino chết)
            dinoState.status = 'GAMEOVER';
            
            // Phát tia nổ hạt
            const color = obs.type === 'CACTUS' ? '#ff007f' : '#00f0ff';
            spawnParticles(dinoState.x + dinoState.width / 2, dinoState.y + dinoState.height / 2, color);
            spawnParticles(dinoState.x + dinoState.width / 2, dinoState.y + dinoState.height / 2, '#39ff14');
            
            dinoStatusText.innerText = "GAME OVER - NHẤN SPACE ĐỂ CHƠI LẠI!";
            
            // Cập nhật Điểm cao nhất
            const currentScoreInt = Math.floor(dinoState.score);
            if (currentScoreInt > dinoState.highScore) {
                dinoState.highScore = currentScoreInt;
                localStorage.setItem('dino_high_score', String(currentScoreInt));
                dinoHighScoreText.innerText = String(currentScoreInt).padStart(5, '0');
            }
            break;
        }
    }
}

// Vẽ toàn bộ màn hình Dino
function renderDinoGame() {
    // 1. Nền canvas tối
    dinoCtx.fillStyle = '#07080c';
    dinoCtx.fillRect(0, 0, dinoCanvas.width, dinoCanvas.height);
    
    // 2. Vẽ các thực thể
    drawGround();
    drawObstacles();
    
    if (dinoState.status !== 'GAMEOVER' || dinoState.particles.length > 0) {
        drawDino();
    }
    
    drawParticles();
    
    // 3. Màn hình chờ bắt đầu
    if (dinoState.status === 'START') {
        dinoCtx.save();
        dinoCtx.fillStyle = 'rgba(7, 8, 12, 0.7)';
        dinoCtx.fillRect(0, 0, dinoCanvas.width, dinoCanvas.height);
        
        dinoCtx.shadowBlur = 10;
        dinoCtx.shadowColor = '#39ff14';
        dinoCtx.fillStyle = '#39ff14';
        dinoCtx.font = "bold 20px 'Outfit', sans-serif";
        dinoCtx.textAlign = 'center';
        dinoCtx.fillText("🦖 NEON DINO 🦖", dinoCanvas.width / 2, 75);
        
        dinoCtx.shadowColor = '#00f0ff';
        dinoCtx.fillStyle = '#00f0ff';
        dinoCtx.font = "13px 'Outfit', sans-serif";
        dinoCtx.fillText("NHẤN [SPACE] HOẶC [MŨI TÊN LÊN] ĐỂ BẮT ĐẦU CHƠI", dinoCanvas.width / 2, 115);
        dinoCtx.restore();
    }
    
    // 4. Màn hình kết thúc chơi
    if (dinoState.status === 'GAMEOVER') {
        dinoCtx.save();
        dinoCtx.shadowBlur = 10;
        dinoCtx.shadowColor = '#ff007f';
        dinoCtx.fillStyle = '#ff007f';
        dinoCtx.font = "bold 22px 'Outfit', sans-serif";
        dinoCtx.textAlign = 'center';
        dinoCtx.fillText("GAME OVER", dinoCanvas.width / 2, 75);
        
        dinoCtx.shadowColor = '#ffe600';
        dinoCtx.fillStyle = '#ffe600';
        dinoCtx.font = "12px 'Outfit', sans-serif";
        dinoCtx.fillText("NHẤN SPACE ĐỂ CHƠI LẠI TRẬN ĐẤU MỚI", dinoCanvas.width / 2, 115);
        dinoCtx.restore();
    }
}

// Vòng lặp hoạt hình Dino chính
function dinoGameTick() {
    updateDinoGame();
    renderDinoGame();
    requestAnimationFrame(dinoGameTick);
}

// Khởi chạy hoạt ảnh
requestAnimationFrame(dinoGameTick);

// --- BỘ LẮNG NGHE SỰ KIỆN PHÍM BẤM ---

// Nhảy
function triggerDinoJump() {
    if (dinoState.status === 'START' || dinoState.status === 'GAMEOVER') {
        resetDinoGame();
        return;
    }
    if (!dinoState.isJumping && !dinoState.isDucking) {
        dinoState.velocity = dinoState.jumpForce;
        dinoState.isJumping = true;
    }
}

// Bắt đầu cúi
function triggerDinoDuckStart() {
    if (dinoState.status === 'PLAYING' && !dinoState.isJumping) {
        dinoState.isDucking = true;
        dinoState.height = DINO_DUCK_HEIGHT;
        dinoState.y = DINO_GROUND_Y - DINO_DUCK_HEIGHT;
    }
}

// Dừng cúi
function triggerDinoDuckEnd() {
    if (dinoState.isDucking) {
        dinoState.isDucking = false;
        dinoState.height = DINO_NORMAL_HEIGHT;
        dinoState.y = DINO_GROUND_Y - DINO_NORMAL_HEIGHT;
    }
}

// Bắt phím ấn
window.addEventListener('keydown', (e) => {
    // Bỏ qua nếu đang gõ chữ trong ô chat / nhập liệu
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
    }

    // Chỉ hoạt động khi đang ở view Dino
    const dinoView = document.getElementById('dinoView');
    if (dinoView.classList.contains('hidden')) return;
    
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        triggerDinoJump();
        e.preventDefault(); // Tránh cuộn trang
    }
    
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        triggerDinoDuckStart();
        e.preventDefault(); // Tránh cuộn trang
    }
});

// Thả phím ấn
window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        triggerDinoDuckEnd();
    }
});

// Hỗ trợ cả thao tác chạm (click canvas để nhảy trên điện thoại)
dinoCanvas.addEventListener('touchstart', (e) => {
    triggerDinoJump();
    e.preventDefault();
});
dinoCanvas.addEventListener('mousedown', () => {
    triggerDinoJump();
});

// --- LẮNG NGHE SỰ KIỆN MẤT KẾT NỐI INTERNET (OFFLINE DETECTOR) ---

function showOfflineAlert() {
    if (offlineAlert) {
        offlineAlert.classList.remove('hidden');
    }
}

function hideOfflineAlert() {
    if (offlineAlert) {
        offlineAlert.classList.add('hidden');
    }
}

// Bắt sự kiện mạng thay đổi trạng thái
window.addEventListener('offline', () => {
    showOfflineAlert();
});

window.addEventListener('online', () => {
    hideOfflineAlert();
});

// Tự động kiểm tra lúc tải trang ban đầu
if (!navigator.onLine) {
    showOfflineAlert();
}

// Nút bấm chơi trên Alert popup chuyển tab sang Dino
if (btnPlayDinoOffline) {
    btnPlayDinoOffline.addEventListener('click', () => {
        hideOfflineAlert();
        
        // Kích hoạt tab Dino bằng cách giả lập click tab Dino
        const btnDino = document.getElementById('btnDino');
        if (btnDino) {
            btnDino.click();
        }
    });
}

// Nút Đóng Alert popup
if (btnCloseOfflineAlert) {
    btnCloseOfflineAlert.addEventListener('click', () => {
        hideOfflineAlert();
    });
}
