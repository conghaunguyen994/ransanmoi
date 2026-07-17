// ===========================
// NEON BUBBLE SHOOTER
// Shoot glowing neon bubbles, match 3 or more of the same color to burst them.
// Floating bubbles drop. Bouncy walls. Sound effects. Level progression.
// ===========================
function initNeonBubbleShooter(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const W = 540;
    const H = 580;
    const BUBBLE_RADIUS = 18;
    const ROW_HEIGHT = BUBBLE_RADIUS * 1.732; // Hexagonal offset height
    const COLS = 14;
    const MAX_ROWS = 12;

    const COLORS = [
        '#ff007f', // Rose
        '#00f0ff', // Cyan
        '#39ff14', // Green
        '#ffe600', // Yellow
        '#b026ff', // Purple
        '#ff7300'  // Orange
    ];

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:12px;position:relative;';
    container.appendChild(wrap);

    // Canvas
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 40px rgba(0,240,255,0.25);background:#07080c;';
    wrap.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // UI Score and High Score Info under Canvas
    const uiDiv = document.createElement('div');
    uiDiv.style.cssText = 'display:flex;justify-content:space-between;width:100%;max-width:540px;color:#8f92a1;font-family:\'Outfit\',sans-serif;font-size:14px;';
    uiDiv.innerHTML = `<div>ĐIỂM: <span id="bubbleScore" style="color:#00f0ff;font-weight:bold;">0</span></div>
                       <div>MỤC TIÊU: <span style="color:#39ff14;">DỌN SẠCH BÓNG</span></div>
                       <div>KỶ LỤC: <span id="bubbleBest" style="color:#ff007f;font-weight:bold;">0</span></div>`;
    wrap.appendChild(uiDiv);

    let audioCtx = null;
    function playSynthSound(freq, dur, type, vol) {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = type || 'sine';
            o.frequency.value = freq;
            g.gain.setValueAtTime(vol || 0.1, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
            o.connect(g);
            g.connect(audioCtx.destination);
            o.start();
            o.stop(audioCtx.currentTime + dur);
        } catch (e) {}
    }

    let state = {};
    let bestScore = parseInt(localStorage.getItem('neon_bubble_best') || '0');
    document.getElementById('bubbleBest').innerText = bestScore;

    function getGridPos(x, y) {
        const row = Math.round(y / ROW_HEIGHT);
        const isOffset = row % 2 !== 0;
        const offset = isOffset ? BUBBLE_RADIUS : 0;
        const col = Math.round((x - BUBBLE_RADIUS - offset) / (BUBBLE_RADIUS * 2));
        return { row, col };
    }

    function getBubbleCenter(row, col) {
        const isOffset = row % 2 !== 0;
        const offset = isOffset ? BUBBLE_RADIUS : 0;
        const x = col * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS + offset;
        const y = row * ROW_HEIGHT + BUBBLE_RADIUS;
        return { x, y };
    }

    function initGrid() {
        state.grid = [];
        for (let r = 0; r < MAX_ROWS; r++) {
            state.grid[r] = [];
            for (let c = 0; c < COLS; c++) {
                if (r < 6) {
                    // Fill initial 6 rows with random colors
                    state.grid[r][c] = COLORS[Math.floor(Math.random() * COLORS.length)];
                } else {
                    state.grid[r][c] = null;
                }
            }
        }
    }

    function checkWin() {
        for (let r = 0; r < MAX_ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (state.grid[r][c]) return false;
            }
        }
        return true;
    }

    function checkGameOver() {
        for (let c = 0; c < COLS; c++) {
            if (state.grid[MAX_ROWS - 2][c]) return true; // Reached bottom warning row
        }
        return false;
    }

    function getNeighbors(row, col) {
        const neighbors = [];
        const isOffset = row % 2 !== 0;
        const dirs = isOffset 
            ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]
            : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];

        dirs.forEach(([dr, dc]) => {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < MAX_ROWS && nc >= 0 && nc < COLS) {
                neighbors.push({ r: nr, c: nc });
            }
        });
        return neighbors;
    }

    // Breadth First Search for matches of same color
    function findMatches(startRow, startCol, color) {
        const matches = [];
        const visited = Array(MAX_ROWS).fill().map(() => Array(COLS).fill(false));
        const queue = [{ r: startRow, c: startCol }];
        visited[startRow][startCol] = true;

        while (queue.length > 0) {
            const curr = queue.shift();
            if (state.grid[curr.r][curr.c] === color) {
                matches.push(curr);
                const neighbors = getNeighbors(curr.r, curr.c);
                neighbors.forEach(n => {
                    if (!visited[n.r][n.c] && state.grid[n.r][n.c] === color) {
                        visited[n.r][n.c] = true;
                        queue.push(n);
                    }
                });
            }
        }
        return matches;
    }

    // Identify floating bubbles and drop them
    function dropFloatingBubbles() {
        const connected = Array(MAX_ROWS).fill().map(() => Array(COLS).fill(false));
        const queue = [];

        // Add top row bubbles to queue
        for (let c = 0; c < COLS; c++) {
            if (state.grid[0][c]) {
                connected[0][c] = true;
                queue.push({ r: 0, c: c });
            }
        }

        // BFS down from ceiling
        while (queue.length > 0) {
            const curr = queue.shift();
            const neighbors = getNeighbors(curr.r, curr.c);
            neighbors.forEach(n => {
                if (state.grid[n.r][n.c] && !connected[n.r][n.c]) {
                    connected[n.r][n.c] = true;
                    queue.push(n);
                }
            });
        }

        let dropCount = 0;
        // Drop any bubble not connected
        for (let r = 0; r < MAX_ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (state.grid[r][c] && !connected[r][c]) {
                    const center = getBubbleCenter(r, c);
                    // Add to falling anim
                    state.fallingParticles.push({
                        x: center.x,
                        y: center.y,
                        color: state.grid[r][c],
                        vy: 2,
                        gravity: 0.35,
                        life: 1.0
                    });
                    state.grid[r][c] = null;
                    dropCount++;
                }
            }
        }
        return dropCount;
    }

    function snapToGrid(bullet) {
        const gridPos = getGridPos(bullet.x, bullet.y);
        let targetRow = gridPos.row;
        let targetCol = gridPos.col;

        // Clip target column
        if (targetRow < 0) targetRow = 0;
        if (targetRow >= MAX_ROWS) targetRow = MAX_ROWS - 1;
        if (targetCol < 0) targetCol = 0;
        if (targetCol >= COLS) targetCol = COLS - 1;

        // If target slot is occupied, look at empty neighboring spots to find the closest one
        if (state.grid[targetRow][targetCol]) {
            let closestDist = Infinity;
            let bestR = targetRow, bestC = targetCol;
            const neighbors = getNeighbors(targetRow, targetCol);
            
            // Add self just in case, but filter neighbors for empty spots
            neighbors.forEach(n => {
                if (!state.grid[n.r][n.c]) {
                    const center = getBubbleCenter(n.r, n.c);
                    const dx = bullet.x - center.x;
                    const dy = bullet.y - center.y;
                    const d = dx*dx + dy*dy;
                    if (d < closestDist) {
                        closestDist = d;
                        bestR = n.r;
                        bestC = n.c;
                    }
                }
            });
            targetRow = bestR;
            targetCol = bestC;
        }

        state.grid[targetRow][targetCol] = bullet.color;
        playSynthSound(500, 0.08, 'triangle', 0.1);

        // Check for matches
        const matches = findMatches(targetRow, targetCol, bullet.color);
        if (matches.length >= 3) {
            // Explode matches
            matches.forEach(m => {
                state.grid[m.r][m.c] = null;
                const center = getBubbleCenter(m.r, m.c);
                createBubbleExplosion(center.x, center.y, bullet.color);
            });
            const poppedCount = matches.length;
            const droppedCount = dropFloatingBubbles();
            
            const points = poppedCount * 10 + droppedCount * 20;
            state.score += points;
            document.getElementById('bubbleScore').innerText = state.score;
            
            if (state.score > bestScore) {
                bestScore = state.score;
                localStorage.setItem('neon_bubble_best', bestScore);
                document.getElementById('bubbleBest').innerText = bestScore;
            }

            playSynthSound(780, 0.2, 'sine', 0.15);
            if (droppedCount > 0) {
                setTimeout(() => playSynthSound(950, 0.15, 'sine', 0.1), 80);
            }
        } else {
            // Increment misses
            state.missCount++;
            if (state.missCount >= 5) {
                // Drop ceiling down: Insert a random row at the top, shift others down
                state.missCount = 0;
                shiftGridDown();
                playSynthSound(220, 0.4, 'triangle', 0.15);
            }
        }

        // Spawn next bullet
        prepareNextBubble();

        if (checkWin()) {
            state.status = 'win';
            playSynthSound(880, 0.15, 'sine', 0.2);
            setTimeout(() => playSynthSound(1320, 0.3, 'sine', 0.2), 150);
        } else if (checkGameOver()) {
            state.status = 'gameover';
            playSynthSound(150, 0.6, 'sawtooth', 0.2);
        }
    }

    function shiftGridDown() {
        // Shift rows down
        for (let r = MAX_ROWS - 1; r > 0; r--) {
            state.grid[r] = [...state.grid[r - 1]];
        }
        // Insert a new row of random colors at top
        state.grid[0] = [];
        for (let c = 0; c < COLS; c++) {
            state.grid[0][c] = COLORS[Math.floor(Math.random() * COLORS.length)];
        }
    }

    function prepareNextBubble() {
        state.bullet = null;
        state.currentBulletColor = state.nextBulletColor;
        state.nextBulletColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    }

    function createBubbleExplosion(bx, by, color) {
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 3 + 2;
            state.particles.push({
                x: bx,
                y: by,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                radius: Math.random() * 4 + 2,
                color: color,
                alpha: 1.0,
                decay: Math.random() * 0.05 + 0.03
            });
        }
    }

    function launchBubble() {
        if (state.status !== 'playing' || state.bullet) return;

        const startX = W / 2;
        const startY = H - 45;
        const speed = 10;
        state.bullet = {
            x: startX,
            y: startY,
            vx: Math.cos(state.angle) * speed,
            vy: Math.sin(state.angle) * speed,
            color: state.currentBulletColor
        };
        playSynthSound(600, 0.08, 'sine', 0.08);
    }

    // Game loop structures
    function startGame() {
        state = {
            status: 'playing',
            score: 0,
            angle: -Math.PI / 2,
            currentBulletColor: COLORS[Math.floor(Math.random() * COLORS.length)],
            nextBulletColor: COLORS[Math.floor(Math.random() * COLORS.length)],
            bullet: null,
            particles: [],
            fallingParticles: [],
            missCount: 0,
            grid: []
        };
        initGrid();
        document.getElementById('bubbleScore').innerText = 0;
    }

    // Input handlers
    let mouseX = W / 2, mouseY = 0;
    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;

        const startX = W / 2;
        const startY = H - 45;
        state.angle = Math.atan2(mouseY - startY, mouseX - startX);
        
        // Limit angle to prevent shooting downward or straight sideways
        const minAngle = -Math.PI + 0.15;
        const maxAngle = -0.15;
        if (state.angle > maxAngle && state.angle < Math.PI/2) state.angle = maxAngle;
        if (state.angle < minAngle || state.angle >= Math.PI/2) state.angle = minAngle;
    }

    function handleMouseClick(e) {
        if (state.status === 'playing') {
            launchBubble();
        } else {
            startGame();
        }
    }

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleMouseClick);

    // Keyboard support for space and arrows
    function handleKeyDown(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            if (state.status === 'playing') launchBubble();
            else startGame();
        } else if (e.code === 'ArrowLeft') {
            state.angle = Math.max(-Math.PI + 0.15, state.angle - 0.06);
        } else if (e.code === 'ArrowRight') {
            state.angle = Math.min(-0.15, state.angle + 0.06);
        }
    }
    window.addEventListener('keydown', handleKeyDown);

    // Setup initial game state
    startGame();

    // Render loop
    let animId = 0;
    function draw() {
        ctx.clearRect(0, 0, W, H);

        // Draw Ceiling Line
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, ROW_HEIGHT * (MAX_ROWS - 2) + BUBBLE_RADIUS*2);
        ctx.lineTo(W, ROW_HEIGHT * (MAX_ROWS - 2) + BUBBLE_RADIUS*2);
        ctx.stroke();

        // 1. Draw grid bubbles
        for (let r = 0; r < MAX_ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const color = state.grid[r][c];
                if (color) {
                    const center = getBubbleCenter(r, c);
                    drawNeonBubble(center.x, center.y, color);
                }
            }
        }

        // 2. Draw aiming laser guideline (dots)
        if (state.status === 'playing' && !state.bullet) {
            const startX = W / 2;
            const startY = H - 45;
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 6]);
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(startX + Math.cos(state.angle) * 320, startY + Math.sin(state.angle) * 320);
            ctx.stroke();
            ctx.restore();
        }

        // 3. Draw active bullet
        if (state.bullet) {
            // Update bullet physics
            state.bullet.x += state.bullet.vx;
            state.bullet.y += state.bullet.vy;

            // Bounce off left/right walls
            if (state.bullet.x < BUBBLE_RADIUS) {
                state.bullet.x = BUBBLE_RADIUS;
                state.bullet.vx = -state.bullet.vx;
                playSynthSound(400, 0.05, 'sine', 0.05);
            } else if (state.bullet.x > W - BUBBLE_RADIUS) {
                state.bullet.x = W - BUBBLE_RADIUS;
                state.bullet.vx = -state.bullet.vx;
                playSynthSound(400, 0.05, 'sine', 0.05);
            }

            // Hit ceiling
            if (state.bullet.y < BUBBLE_RADIUS) {
                state.bullet.y = BUBBLE_RADIUS;
                snapToGrid(state.bullet);
            } else {
                // Check collision with other bubbles in grid
                let hit = false;
                for (let r = 0; r < MAX_ROWS; r++) {
                    for (let c = 0; c < COLS; c++) {
                        if (state.grid[r][c]) {
                            const center = getBubbleCenter(r, c);
                            const dx = state.bullet.x - center.x;
                            const dy = state.bullet.y - center.y;
                            const dist = Math.sqrt(dx*dx + dy*dy);
                            if (dist < BUBBLE_RADIUS * 1.6) { // Snapping overlap threshold
                                hit = true;
                                break;
                            }
                        }
                    }
                    if (hit) break;
                }
                if (hit) {
                    snapToGrid(state.bullet);
                }
            }

            if (state.bullet) {
                drawNeonBubble(state.bullet.x, state.bullet.y, state.bullet.color);
            }
        }

        // 4. Draw launcher cannon
        const launcherX = W / 2;
        const launcherY = H - 45;
        
        // Launcher neon base ring
        ctx.beginPath();
        ctx.arc(launcherX, launcherY, 26, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Pointer barrel
        ctx.save();
        ctx.translate(launcherX, launcherY);
        ctx.rotate(state.angle);
        ctx.fillStyle = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f0ff';
        ctx.fillRect(0, -6, 40, 12);
        ctx.restore();

        // Loaded current bubble
        if (!state.bullet && state.status === 'playing') {
            drawNeonBubble(launcherX, launcherY, state.currentBulletColor);
        }

        // Preview next bubble (small circle at launcher base)
        if (state.status === 'playing') {
            drawNeonBubble(launcherX - 55, launcherY + 10, state.nextBulletColor, BUBBLE_RADIUS * 0.65);
            ctx.fillStyle = '#8f92a1';
            ctx.font = '10px \'Outfit\', sans-serif';
            ctx.fillText('TIẾP', launcherX - 63, launcherY - 8);
        }

        // 5. Draw particles (explosions)
        state.particles.forEach((p, idx) => {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
            if (p.alpha <= 0) {
                state.particles.splice(idx, 1);
            } else {
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.shadowBlur = 8;
                ctx.shadowColor = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
                ctx.fill();
                ctx.restore();
            }
        });

        // 6. Draw falling bubbles
        state.fallingParticles.forEach((p, idx) => {
            p.y += p.vy;
            p.vy += p.gravity;
            p.life -= 0.02;
            if (p.life <= 0 || p.y > H + BUBBLE_RADIUS) {
                state.fallingParticles.splice(idx, 1);
            } else {
                ctx.save();
                ctx.globalAlpha = p.life;
                drawNeonBubble(p.x, p.y, p.color);
                ctx.restore();
            }
        });

        // 7. Draw Win/Game Over overlays
        if (state.status === 'win') {
            drawOverlay('BẠN ĐÃ THẮNG!', '#39ff14', 'Bấm Space / Click để chơi tiếp');
        } else if (state.status === 'gameover') {
            drawOverlay('GAME OVER', '#ff007f', 'Bấm Space / Click để chơi lại');
        }

        animId = requestAnimationFrame(draw);
    }

    function drawNeonBubble(x, y, color, rad = BUBBLE_RADIUS) {
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
        
        // Inner gradient for gorgeous 3D glowing sphere look
        const grad = ctx.createRadialGradient(x - rad/3, y - rad/3, 1, x, y, rad);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, color);
        grad.addColorStop(1, '#000000');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();

        // Stroke
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }

    function drawOverlay(title, titleColor, desc) {
        ctx.fillStyle = 'rgba(7, 8, 12, 0.85)';
        ctx.fillRect(0, 0, W, H);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = '700 36px \'Outfit\', Arial';
        ctx.fillStyle = titleColor;
        ctx.shadowBlur = 20;
        ctx.shadowColor = titleColor;
        ctx.fillText(title, W / 2, H / 2 - 30);

        ctx.font = '500 15px \'Outfit\', Arial';
        ctx.fillStyle = '#8f92a1';
        ctx.shadowBlur = 0;
        ctx.fillText(desc, W / 2, H / 2 + 25);

        ctx.font = '700 20px \'Outfit\', Arial';
        ctx.fillStyle = '#00f0ff';
        ctx.fillText(`ĐIỂM SỐ: ${state.score}`, W / 2, H / 2 + 70);
    }

    // Run animation loop
    animId = requestAnimationFrame(draw);

    // Destructor / Cleanup function to release memory & listeners on tab quit
    container._gameCleanup = function() {
        cancelAnimationFrame(animId);
        window.removeEventListener('keydown', handleKeyDown);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('click', handleMouseClick);
        if (audioCtx) {
            try { audioCtx.close(); } catch (e) {}
        }
        console.log('Neon Bubble Shooter resources cleaned up.');
    };
}
