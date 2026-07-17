// ===========================
// NEON DASH (Geometry Dash style)
// Player tự chạy, nhảy qua gai/chướng ngại vật, va chạm = chết.
// ===========================
function initNeonDash(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const W = 720, H = 360;
    const GROUND_Y = 300;       // mặt đất
    const PLAYER_SIZE = 26;
    const GRAVITY = 2600;       // px/s^2 (nặng để nhảy ngắn & gọn)
    const JUMP_V = -680;        // vận tốc nhảy (px/s)
    const BASE_SPEED = 280;     // px/s
    const MAX_SPEED = 520;

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:0;';
    container.appendChild(wrap);

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 40px rgba(57,255,20,0.35);background:#07080c;cursor:pointer;';
    wrap.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let audioCtx = null;
    function beep(freq, dur, type) {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = type || 'square'; o.frequency.value = freq;
            g.gain.value = 0.0001;
            o.connect(g); g.connect(audioCtx.destination);
            const now = audioCtx.currentTime;
            g.gain.exponentialRampToValueAtTime(0.14, now + 0.008);
            g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
            o.start(now); o.stop(now + dur);
        } catch (e) {}
    }

    const COLOR_PALETTES = ['#39ff14', '#00f0ff', '#ffe600', '#ff7300', '#ff007f', '#b026ff'];

    let camX = 0;
    let state = {};
    let best = parseInt(localStorage.getItem('neon_dash_best') || '0');

    // Sinh chướng ngại vật phía trước player khi chạy
    // fromX là vị trí KẾT THÚC của vật trước đó (right edge)
    function makeNextObstacle(fromX) {
        // loại: 'spike' (1 gai), 'spike3' (3 gai liền), 'block' (khối cao cần nhảy), 'pad' (platform)
        const types = ['spike', 'spike', 'spike', 'spike3', 'block', 'pad'];
        const t = types[Math.floor(Math.random() * types.length)];
        // khoảng trống từ mép phải vật trước đến mép trái vật mới
        // đủ dài để nhảy-cầu-cất-hết-đáp có nhịp; tốc độ càng cao thì hơi rộng thêm
        const spacing = 120 + Math.random() * 80;
        const x = fromX + spacing;
        if (t === 'spike') {
            return { type: 'spike', x, w: 24, h: 24, color: '#ff007f' };
        } else if (t === 'spike3') {
            return { x, w: 72, h: 24, color: '#ff007f', triple: true };
        } else if (t === 'block') {
            return { type: 'block', x, w: 28, h: 40, color: '#b026ff' };
        } else {
            return { type: 'pad', x, w: 120, h: 12, color: '#00f0ff', topY: GROUND_Y - 70 };
        }
    }

    function buildInitialObstacles() {
        state.obstacles = [];
        // vật đầu sinh sau x=360 (cho player có chỗ chạy lúc vào)
        let prevEnd = 360;
        for (let i = 0; i < 20; i++) {
            const o = makeNextObstacle(prevEnd);
            state.obstacles.push(o);
            prevEnd = o.x + o.w;
        }
        state.spawnUntilX = prevEnd;
    }

    function ensureAhead() {
        while (state.spawnUntilX - camX < W + 300) {
            const last = state.obstacles[state.obstacles.length - 1];
            const o = makeNextObstacle(last.x + last.w);
            state.obstacles.push(o);
            state.spawnUntilX = o.x + o.w;
        }
        // dọn các vật đã lùi xa phía sau camera
        state.obstacles = state.obstacles.filter(o => o.x - camX > -200);
    }

    function startGame() {
        state = {
            phase: 'playing',
            px: 120,
            py: GROUND_Y - PLAYER_SIZE,
            vy: 0,
            onGround: true,
            rot: 0,
            speed: BASE_SPEED,
            score: 0,
            flashed: false,
            deadAt: 0,
            particles: [],
            attempt: (state.attempt || 0) + 1,
            startedAt: performance.now(),
            animId: 0
        };
        buildInitialObstacles();
        camX = 0;
        beep(440, 0.12, 'sine');
    }

    function jump() {
        if (state.phase !== 'playing') return;
        if (state.onGround) {
            state.vy = JUMP_V;
            state.onGround = false;
            beep(660, 0.08, 'sine');
        }
    }

    function die() {
        if (state.phase !== 'playing') return;
        state.phase = 'dead';
        state.deadAt = performance.now();
        beep(120, 0.5, 'sawtooth');
        for (let i = 0; i < 24; i++) {
            state.particles.push({
                x: state.px, y: state.py,
                vx: (Math.random() - 0.5) * 360,
                vy: -Math.random() * 380,
                life: 1, color: COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)]
            });
        }
        if (state.score > best) {
            best = state.score;
            localStorage.setItem('neon_dash_best', best);
        }
    }

    function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function getHitbox() {
        // hitbox nhỏ hơn hình vẽ để dễ chơi hơn
        const pad = 4;
        return { x: state.px + pad, y: state.py + pad, w: PLAYER_SIZE - pad * 2, h: PLAYER_SIZE - pad * 2 };
    }

    function update(dt) {
        // particles luôn cập nhật (chết hay sống)
        if (state.particles.length) {
            state.particles.forEach(p => {
                p.x += p.vx * dt; p.y += p.vy * dt;
                p.vy += 900 * dt; p.life -= dt * (p.dust ? 4 : 1.5);
            });
            state.particles = state.particles.filter(p => p.life > 0);
        }

        // Trọng lực & đáp đất LUÔN áp dụng (kể cả khi chết) để không bị "đóng băng trên trời")
        state.vy += GRAVITY * dt;
        state.py += state.vy * dt;
        if (!state.onGround && state.phase === 'playing') state.rot += dt * 7.5;

        if (state.py >= GROUND_Y - PLAYER_SIZE) {
            state.py = GROUND_Y - PLAYER_SIZE;
            const wasAir = !state.onGround;
            state.vy = 0;
            state.onGround = true;
            if (wasAir && state.phase === 'playing') {
                state.rot = Math.round(state.rot / (Math.PI / 2)) * (Math.PI / 2);
                for (let i = 0; i < 4; i++) {
                    state.particles.push({
                        x: state.px, y: GROUND_Y,
                        vx: -Math.random() * 80 - 40, vy: -Math.random() * 60,
                        life: 0.4, color: '#39ff14', dust: true
                    });
                }
            }
        }

        // Sau khi đã chết -> dừng mọi logic khác (camera, va chạm, spawn) để cảnh lặng lại
        if (state.phase !== 'playing') return;

        // tăng tốc dần
        state.speed = Math.min(MAX_SPEED, state.speed + dt * 14);
        state.score = Math.floor((state.px - 120) / 6);

        // di chuyển camera theo player
        camX += state.speed * dt;

        // Chỉ reset onGround khi thực sự rời bề mặt đỡ (block/pad đã qua)
        // Kiểm tra trên block/pad: nếu không còn đứng trên bề mặt nào, cho rơi tự do
        let onSurface = state.py >= GROUND_Y - PLAYER_SIZE - 0.5;

        // va chạm với các vật
        const worldPx = camX + state.px;
        const hb = { x: worldPx + 4, y: state.py + 4, w: PLAYER_SIZE - 8, h: PLAYER_SIZE - 8 };
        for (const o of state.obstacles) {
            if (o.triple) {
                for (let i = 0; i < 3; i++) {
                    const sx = o.x + i * 24;
                    if (hitSpike(sx, hb)) { die(); return; }
                }
            } else if (o.type === 'spike') {
                if (hitSpike(o.x, hb)) { die(); return; }
            } else if (o.type === 'block') {
                const r = { x: o.x, y: GROUND_Y - o.h, w: o.w, h: o.h };
                if (rectsOverlap(hb.x, hb.y, hb.w, hb.h, r.x, r.y, r.w, r.h)) {
                    // nếu đang rơi và đáp lên đỉnh khối -> đứng (không chết)
                    if (state.vy > 0 && hb.y + hb.h <= r.y + 14) {
                        state.py = r.y - PLAYER_SIZE;
                        state.vy = 0;
                        state.onGround = true;
                        onSurface = true;
                        state.rot = Math.round(state.rot / (Math.PI / 2)) * (Math.PI / 2);
                    } else {
                        die(); return;
                    }
                }
            } else if (o.type === 'pad') {
                const r = { x: o.x, y: o.topY, w: o.w, h: o.h };
                if (rectsOverlap(hb.x, hb.y, hb.w, hb.h, r.x, r.y, r.w, r.h) && state.vy > 0
                    && hb.y + hb.h <= r.y + 14) {
                    state.py = r.y - PLAYER_SIZE;
                    state.vy = 0;
                    state.onGround = true;
                    onSurface = true;
                    state.rot = Math.round(state.rot / (Math.PI / 2)) * (Math.PI / 2);
                }
            }
        }

        // Nếu không đứng trên bất kỳ bề mặt nào thì đang trong không khí
        if (!onSurface) state.onGround = false;

        ensureAhead();
    }

    function hitSpike(sx, hb) {
        // hitbox tam giác nhỏ sát gai: dùng hộp nhỏ ở giữa gai
        const gw = 24, gh = 24;
        const box = { x: sx + 6, y: GROUND_Y - gh + 6, w: gw - 12, h: gh - 6 };
        return rectsOverlap(hb.x, hb.y, hb.w, hb.h, box.x, box.y, box.w, box.h);
    }

    function draw() {
        const now = performance.now();
        ctx.fillStyle = '#07080c';
        ctx.fillRect(0, 0, W, H);

        // màu chủ đạo thay đổi theo điểm
        const palIdx = Math.floor(state.score / 400) % COLOR_PALETTES.length;
        const neon = COLOR_PALETTES[palIdx];

        // nền lưới neon kéo theo camera
        ctx.save();
        ctx.strokeStyle = 'rgba(120,140,180,0.12)';
        ctx.lineWidth = 1;
        const gridSize = 40;
        const offX = -((camX) % gridSize);
        for (let x = offX; x < W; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = 0; y < H; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }
        ctx.restore();

        // mặt đất phát sáng
        ctx.save();
        ctx.strokeStyle = neon;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 16; ctx.shadowColor = neon;
        ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(W, GROUND_Y); ctx.stroke();
        // nền dưới đất
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(10,14,24,0.9)';
        ctx.fillRect(0, GROUND_Y + 1, W, H - GROUND_Y);
        // viền nhấp nháy phía dưới
        ctx.fillStyle = hexToRgba(neon, 0.05);
        for (let x = 0; x < W; x += 30) ctx.fillRect(x, GROUND_Y + 4, 14, 2);
        ctx.restore();

        // vẽ chướng ngại vật
        for (const o of state.obstacles) {
            const sx = o.x - camX;
            if (sx > W + 60 || sx + o.w < -60) continue;
            if (o.triple) {
                for (let i = 0; i < 3; i++) drawSpike(sx + i * 24, o.color);
            } else if (o.type === 'spike') {
                drawSpike(sx, o.color);
            } else if (o.type === 'block') {
                drawBlock(sx, GROUND_Y - o.h, o.w, o.h, o.color);
            } else if (o.type === 'pad') {
                drawPad(sx, o.topY, o.w, o.h, o.color);
            }
        }

        // player (cube neon xoay khi bay)
        ctx.save();
        const cx = state.px + PLAYER_SIZE / 2;
        const cy = state.py + PLAYER_SIZE / 2;
        ctx.translate(cx, cy);
        if (!state.onGround) ctx.rotate(state.rot);
        ctx.shadowBlur = 18; ctx.shadowColor = neon;
        const grad = ctx.createLinearGradient(-PLAYER_SIZE/2, -PLAYER_SIZE/2, PLAYER_SIZE/2, PLAYER_SIZE/2);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(1, neon);
        ctx.fillStyle = grad;
        ctx.fillRect(-PLAYER_SIZE/2, -PLAYER_SIZE/2, PLAYER_SIZE, PLAYER_SIZE);
        // viền
        ctx.strokeStyle = '#07080c'; ctx.lineWidth = 2; ctx.shadowBlur = 0;
        ctx.strokeRect(-PLAYER_SIZE/2, -PLAYER_SIZE/2, PLAYER_SIZE, PLAYER_SIZE);
        // mặt cười nhỏ
        ctx.fillStyle = '#07080c';
        ctx.fillRect(-7, -3, 4, 4);
        ctx.fillRect(3, -3, 4, 4);
        ctx.fillRect(-6, 5, 12, 2);
        ctx.restore();

        // particles
        for (const p of state.particles) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 8; ctx.shadowColor = p.color;
            ctx.fillRect(p.x - state.px + 120 - 3, p.y - 3, 6, 6);
            ctx.restore();
        }

        // HUD: score + best + speed
        ctx.save();
        ctx.fillStyle = neon;
        ctx.font = '700 20px Outfit,Arial,sans-serif';
        ctx.textAlign = 'left';
        ctx.shadowBlur = 8; ctx.shadowColor = neon;
        ctx.fillText('ĐIỂM: ' + state.score, 16, 32);
        ctx.fillStyle = 'rgba(255,230,0,0.6)';
        ctx.font = '600 12px Outfit,Arial,sans-serif'; ctx.shadowBlur = 0;
        ctx.fillText('BEST: ' + best, 16, 52);
        // speed%
        ctx.fillStyle = '#00f0ff';
        ctx.font = '600 12px Outfit,Arial,sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('TỐC ĐỘ: ' + Math.round(state.speed / BASE_SPEED * 100) + '%', W - 16, 32);
        ctx.restore();

        // tên game
        ctx.save();
        ctx.fillStyle = 'rgba(57,255,20,0.8)';
        ctx.font = '700 12px Outfit,Arial,sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 6; ctx.shadowColor = '#39ff14';
        ctx.fillText('🏃 NEON DASH', W/2, 18);
        ctx.restore();

        // Idle
        if (state.phase === 'idle') {
            ctx.fillStyle = 'rgba(5,5,15,0.82)';
            ctx.fillRect(0, 0, W, H);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#39ff14';
            ctx.font = '700 36px Outfit,Arial,sans-serif';
            ctx.shadowBlur = 18; ctx.shadowColor = '#39ff14';
            ctx.fillText('NEON DASH', W/2, H/2 - 50);
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '400 14px Inter,Arial,sans-serif'; ctx.shadowBlur = 0;
            ctx.fillText('Giữ SPACE hoặc click để nhảy qua gai & khối.', W/2, H/2 - 10);
            ctx.fillText('Càng xa tốc độ càng nhanh, điểm tăng dần.', W/2, H/2 + 14);
            ctx.fillStyle = 'rgba(0,240,255,0.85)';
            ctx.font = '600 15px Outfit,Arial,sans-serif';
            ctx.fillText('SPACE / Click để bắt đầu', W/2, H/2 + 55);
            if (best > 0) {
                ctx.fillStyle = 'rgba(255,230,0,0.5)';
                ctx.font = '400 12px Inter,Arial,sans-serif';
                ctx.fillText('BEST: ' + best, W/2, H/2 + 80);
            }
        }

        // Dead overlay
        if (state.phase === 'dead') {
            ctx.fillStyle = 'rgba(5,5,15,0.86)';
            ctx.fillRect(0, 0, W, H);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ff007f';
            ctx.font = '700 32px Outfit,Arial,sans-serif';
            ctx.shadowBlur = 16; ctx.shadowColor = '#ff007f';
            ctx.fillText('CHẾT RỒI!', W/2, H/2 - 40);
            ctx.fillStyle = '#ffe600';
            ctx.font = '700 24px Outfit,Arial,sans-serif';
            ctx.shadowColor = '#ffe600';
            ctx.fillText('ĐIỂM: ' + state.score, W/2, H/2 + 5);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '400 12px Inter,Arial,sans-serif'; ctx.shadowBlur = 0;
            ctx.fillText('BEST: ' + best, W/2, H/2 + 32);
            ctx.fillStyle = 'rgba(0,240,255,0.85)';
            ctx.font = '600 14px Outfit,Arial,sans-serif';
            ctx.fillText('Space / Click để chơi lại', W/2, H/2 + 64);
        }
    }

    function drawSpike(x, color) {
        ctx.save();
        const w = 24, h = 24;
        const topY = GROUND_Y - h;
        ctx.shadowBlur = 12; ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + w/2, topY);
        ctx.lineTo(x, GROUND_Y);
        ctx.lineTo(x + w, GROUND_Y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#07080c';
        ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
        ctx.stroke();
        ctx.restore();
    }
    function drawBlock(x, y, w, h, color) {
        ctx.save();
        ctx.shadowBlur = 10; ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        ctx.restore();
    }
    function drawPad(x, y, w, h, color) {
        ctx.save();
        ctx.shadowBlur = 12; ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 0;
        ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
        ctx.restore();
    }

    function hexToRgba(hex, a) {
        const v = hex.replace('#','');
        const n = parseInt(v, 16);
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }

    function press() {
        if (state.phase === 'idle') { startGame(); return; }
        if (state.phase === 'dead') { startGame(); return; }
        jump();
    }

    canvas.addEventListener('mousedown', (e) => { e.preventDefault(); press(); });
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); press(); }, { passive: false });

    function onKey(e) {
        if (document.getElementById('dashView') && document.getElementById('dashView').classList.contains('hidden')) return;
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
        if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
            e.preventDefault();
            press();
        }
    }
    window.addEventListener('keydown', onKey);

    let last = performance.now();
    function loop(now) {
        const dt = Math.min(0.033, (now - last) / 1000);
        last = now;
        update(dt);
        draw();
        state.animId = requestAnimationFrame(loop);
    }

    const oldCleanup = container._gameCleanup;
    if (oldCleanup) oldCleanup();
    container._gameCleanup = () => {
        cancelAnimationFrame(state.animId);
        window.removeEventListener('keydown', onKey);
        if (audioCtx) { try { audioCtx.close(); } catch(e){} audioCtx = null; }
    };

    state = { phase: 'idle', score: 0, attempt: 0, obstacles: [], particles: [], animId: 0, px: 120, py: GROUND_Y - PLAYER_SIZE, speed: BASE_SPEED };
    last = performance.now();
    loop(last);
}