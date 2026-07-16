// ===========================
// NEON MEMORY MATCH
// ===========================
function initMemory(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const SYMBOLS = ['🌌','⚡','🔥','💎','🌀','🎯','👾','🚀','🌈','💫','🎮','🏆','🌊','🎪','💥','🔮'];
    const LEVELS = [
        { cols: 4, rows: 3, label: 'DỄ (4×3)' },
        { cols: 4, rows: 4, label: 'TRUNG BÌNH (4×4)' },
        { cols: 6, rows: 4, label: 'KHÓ (6×4)' }
    ];

    const COLORS = ['#00f0ff','#ff007f','#ffe600','#bf00ff','#00ff88','#ff6600','#ff3399','#39ff14'];

    let state = {};

    function initState(levelIdx) {
        const lv = LEVELS[levelIdx];
        const total = lv.cols * lv.rows;
        const pairs = total / 2;
        const syms = SYMBOLS.slice(0, pairs);
        const cards = [...syms, ...syms].map((sym, i) => ({
            id: i, sym,
            color: COLORS[syms.indexOf(sym) % COLORS.length],
            flipped: false, matched: false,
            flipAnim: 0 // 0=face down, 1=face up
        }));
        // Shuffle
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        state = {
            levelIdx, lv, cards,
            first: null, second: null,
            lockBoard: false,
            moves: 0, matches: 0,
            startTime: Date.now(),
            phase: 'playing', // playing | won
            elapsed: 0,
            particles: []
        };
    }

    const W = 520, H = 480;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 35px rgba(191,0,255,0.25);cursor:pointer;';
    container.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;';

    // Level selector
    const lvBar = document.createElement('div');
    lvBar.style.cssText = 'display:flex;gap:8px;';
    LEVELS.forEach((lv, i) => {
        const btn = document.createElement('button');
        btn.textContent = lv.label;
        btn.style.cssText = `padding:6px 14px;border-radius:6px;font-family:'Outfit',Arial;font-weight:700;
            font-size:11px;letter-spacing:0.5px;cursor:pointer;transition:all 0.2s;
            border:1px solid #bf00ff;background:rgba(191,0,255,0.1);color:#bf00ff;`;
        btn.addEventListener('click', () => { initState(i); });
        lvBar.appendChild(btn);
    });
    container.appendChild(lvBar);
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    initState(0);

    function getCardRect(idx) {
        const { cols, rows } = state.lv;
        const padX = 20, padY = 60;
        const cellW = (W - padX * 2) / cols;
        const cellH = (H - padY - 20) / rows;
        const col = idx % cols, row = Math.floor(idx / cols);
        return {
            x: padX + col * cellW + 4,
            y: padY + row * cellH + 4,
            w: cellW - 8,
            h: cellH - 8
        };
    }

    canvas.addEventListener('click', (e) => {
        if (state.lockBoard || state.phase !== 'playing') return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (W / rect.width);
        const my = (e.clientY - rect.top) * (H / rect.height);

        for (let i = 0; i < state.cards.length; i++) {
            const card = state.cards[i];
            if (card.flipped || card.matched) continue;
            const r = getCardRect(i);
            if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
                flipCard(i);
                break;
            }
        }
    });

    function flipCard(idx) {
        const card = state.cards[idx];
        card.flipped = true;
        state.moves++;

        if (!state.first) {
            state.first = card;
            return;
        }
        state.second = card;
        state.lockBoard = true;

        if (state.first.sym === state.second.sym) {
            // Match!
            setTimeout(() => {
                state.first.matched = true;
                state.second.matched = true;
                state.matches++;
                spawnMatchParticles(idx);
                state.first = null; state.second = null;
                state.lockBoard = false;
                if (state.matches === state.lv.cols * state.lv.rows / 2) {
                    state.phase = 'won';
                    state.elapsed = Math.floor((Date.now() - state.startTime) / 1000);
                }
            }, 300);
        } else {
            // No match - flip back
            setTimeout(() => {
                state.first.flipped = false;
                state.second.flipped = false;
                state.first = null; state.second = null;
                state.lockBoard = false;
            }, 900);
        }
    }

    function spawnMatchParticles(idx) {
        const r = getCardRect(idx);
        const cx = r.x + r.w/2, cy = r.y + r.h/2;
        for (let i = 0; i < 12; i++) {
            state.particles.push({
                x: cx, y: cy,
                vx: (Math.random()-0.5)*10,
                vy: (Math.random()-0.5)*10,
                life: 1,
                color: COLORS[Math.floor(Math.random() * COLORS.length)]
            });
        }
    }

    function drawRR(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r);
        ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r);
        ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
    }

    let animFrame = 0;
    function draw() {
        animFrame++;
        ctx.fillStyle = '#070810';
        ctx.fillRect(0, 0, W, H);

        // Title
        ctx.save();
        ctx.fillStyle = '#bf00ff'; ctx.font = '700 18px Outfit,Arial';
        ctx.textAlign = 'center'; ctx.shadowBlur = 12; ctx.shadowColor = '#bf00ff';
        ctx.fillText('🃏 NEON MEMORY MATCH', W/2, 30);
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '400 12px Inter,Arial'; ctx.shadowBlur = 0;
        ctx.fillText(`Bước: ${state.moves}  |  Cặp: ${state.matches}/${state.lv.cols*state.lv.rows/2}`, W/2, 50);
        ctx.restore();

        // Cards
        state.cards.forEach((card, i) => {
            const r = getCardRect(i);
            const cx = r.x + r.w/2, cy = r.y + r.h/2;

            ctx.save();
            if (card.matched) {
                // Matched: glowing green
                ctx.shadowBlur = 14 + Math.sin(animFrame * 0.06) * 5;
                ctx.shadowColor = '#00ff88';
                drawRR(r.x, r.y, r.w, r.h, 8);
                ctx.fillStyle = 'rgba(0,255,136,0.15)'; ctx.fill();
                ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2; ctx.stroke();
                // Symbol
                ctx.font = `${Math.min(r.w, r.h) * 0.45}px Arial`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.shadowBlur = 0;
                ctx.fillText(card.sym, cx, cy);
            } else if (card.flipped) {
                // Flipped: show symbol with color glow
                ctx.shadowBlur = 12; ctx.shadowColor = card.color;
                drawRR(r.x, r.y, r.w, r.h, 8);
                ctx.fillStyle = `${card.color}22`; ctx.fill();
                ctx.strokeStyle = card.color; ctx.lineWidth = 2; ctx.stroke();
                ctx.font = `${Math.min(r.w, r.h) * 0.45}px Arial`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowBlur = 0;
                ctx.fillText(card.sym, cx, cy);
            } else {
                // Face down: dark with subtle neon border
                const hover = false;
                drawRR(r.x, r.y, r.w, r.h, 8);
                ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill();
                ctx.strokeStyle = 'rgba(191,0,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
                // Question mark pulsing
                ctx.fillStyle = `rgba(191,0,255,${0.3 + Math.sin(animFrame*0.05+i)*0.15})`;
                ctx.font = `${Math.min(r.w,r.h)*0.3}px Outfit,Arial`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('?', cx, cy);
            }
            ctx.restore();
        });

        // Particles
        state.particles.forEach(p => {
            ctx.save(); ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color; ctx.shadowBlur = 6; ctx.shadowColor = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI*2); ctx.fill();
            ctx.restore();
            p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= 0.05;
        });
        state.particles = state.particles.filter(p => p.life > 0);

        // Win overlay
        if (state.phase === 'won') {
            ctx.save();
            ctx.fillStyle = 'rgba(5,8,20,0.82)'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#ffe600'; ctx.font = '700 34px Outfit,Arial';
            ctx.textAlign = 'center'; ctx.shadowBlur = 18; ctx.shadowColor = '#ffe600';
            ctx.fillText('🏆 HOÀN THÀNH!', W/2, H/2 - 55);
            ctx.fillStyle = '#00f0ff'; ctx.font = '700 20px Outfit,Arial';
            ctx.shadowColor = '#00f0ff';
            ctx.fillText(`${state.moves} bước • ${state.elapsed}s`, W/2, H/2 - 10);
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '400 13px Inter,Arial'; ctx.shadowBlur = 0;
            ctx.fillText('Click để chơi lại', W/2, H/2 + 28);
            ctx.restore();
            canvas.onclick = (e) => {
                const r = canvas.getBoundingClientRect();
                initState(state.levelIdx);
                canvas.onclick = origClick;
            };
        }
    }

    const origClick = canvas.onclick;

    let animId;
    function loop() { draw(); animId = requestAnimationFrame(loop); }
    const old = container._gameCleanup;
    if (old) old();
    container._gameCleanup = () => cancelAnimationFrame(animId);
    loop();
}
