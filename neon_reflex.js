// ===========================
// NEON REFLEX (Stroop Color Test)
// Trò chơi phản xạ nhận thức: chọn MÀU của chữ (không phải nghĩa).
// ===========================
function initNeonReflex(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const W = 460, H = 560;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:0;';
    container.appendChild(wrap);

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 40px rgba(255,115,0,0.35);background:#07080c;cursor:pointer;';
    wrap.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const COLORS = [
        { name: 'ĐỎ',    hex: '#ff3b30' },
        { name: 'XANH',  hex: '#00f0ff' },
        { name: 'LỤA',   hex: '#39ff14' },
        { name: 'VÀNG',  hex: '#ffe600' }
    ];
    const GAME_TIME = 30;

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
            g.gain.exponentialRampToValueAtTime(0.15, now + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
            o.start(now); o.stop(now + dur);
        } catch (e) {}
    }

    let state = {};
    let best = parseInt(localStorage.getItem('neon_reflex_best') || '0');
    let flash = null;

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function newRound() {
        const wordIdx = Math.floor(Math.random() * COLORS.length);
        let colorIdx;
        do { colorIdx = Math.floor(Math.random() * COLORS.length); }
        while (Math.random() < 0.7 && colorIdx === wordIdx);
        state.round = {
            word: COLORS[wordIdx].name,
            color: COLORS[colorIdx].hex,
            colorName: COLORS[colorIdx].name,
            options: shuffle([0,1,2,3])
        };
        state.roundStart = performance.now();
        state.lastReaction = 0;
    }

    function startGame() {
        state = {
            phase: 'playing',
            score: 0,
            correct: 0,
            wrong: 0,
            streak: 0,
            timeLeft: GAME_TIME,
            startTime: Date.now(),
            tickInterval: null,
            animId: 0
        };
        newRound();
        state.tickInterval = setInterval(() => {
            if (state.phase !== 'playing') { clearInterval(state.tickInterval); return; }
            state.timeLeft--;
            if (state.timeLeft <= 0) endGame();
        }, 1000);
    }

    function endGame() {
        state.phase = 'over';
        clearInterval(state.tickInterval);
        if (state.score > best) {
            best = state.score;
            localStorage.setItem('neon_reflex_best', best);
        }
    }

    function answerClicked(optionIdx, mx, my) {
        if (state.phase !== 'playing') return;
        const r = state.round;
        const react = performance.now() - state.roundStart;
        state.lastReaction = Math.round(react);
        if (optionIdx === r.colorName) {
            const bonus = Math.max(0, 800 - Math.round(react));
            const pts = 100 + Math.round(bonus / 8) + state.streak * 5;
            state.score += pts;
            state.correct++;
            state.streak++;
            flash = { ok: true, until: performance.now() + 250, x: mx, y: my };
            beep(660, 0.08, 'sine');
            newRound();
        } else {
            state.wrong++;
            state.streak = 0;
            state.score = Math.max(0, state.score - 40);
            flash = { ok: false, until: performance.now() + 300, x: mx, y: my };
            beep(140, 0.18, 'sawtooth');
            newRound();
        }
    }

    const BTN_TOP = 300;
    const BTN_W = 180, BTN_H = 64, BTN_GAP = 12;

    function btnRect(i) {
        const col = i % 2, row = Math.floor(i / 2);
        const x = (W - (BTN_W * 2 + BTN_GAP)) / 2 + col * (BTN_W + BTN_GAP);
        const y = BTN_TOP + row * (BTN_H + BTN_GAP);
        return { x, y, w: BTN_W, h: BTN_H };
    }

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (W / rect.width);
        const my = (e.clientY - rect.top) * (H / rect.height);
        if (state.phase === 'idle') { startGame(); return; }
        if (state.phase === 'over') { state.phase = 'idle'; return; }
        if (state.phase !== 'playing') return;
        for (let i = 0; i < 4; i++) {
            const b = btnRect(i);
            if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
                answerClicked(state.round.options[i], mx, my);
                return;
            }
        }
    });

    function onKey(e) {
        if (document.getElementById('reflexView') && document.getElementById('reflexView').classList.contains('hidden')) return;
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
        if (state.phase === 'idle' || state.phase === 'over') {
            if (e.key === ' ' || e.key === 'Enter') { if (state.phase === 'over') state.phase = 'idle'; else startGame(); }
            return;
        }
        if (['1','2','3','4'].includes(e.key)) {
            answerClicked(state.round.options[parseInt(e.key) - 1], W/2, H/2);
        }
    }
    window.addEventListener('keydown', onKey);

    function draw() {
        ctx.fillStyle = '#07080c';
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.fillStyle = 'rgba(255,115,0,0.85)';
        ctx.font = '700 15px Outfit,Arial,sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 8; ctx.shadowColor = '#ff7300';
        ctx.fillText('⚡ NEON REFLEX - STROOP', W/2, 28);
        ctx.restore();

        if (state.phase === 'playing') {
            ctx.save();
            ctx.fillStyle = '#39ff14';
            ctx.font = '700 18px Outfit,Arial,sans-serif';
            ctx.textAlign = 'left';
            ctx.shadowBlur = 6; ctx.shadowColor = '#39ff14';
            ctx.fillText('ĐIỂM: ' + state.score, 16, 70);
            ctx.fillStyle = state.streak >= 3 ? '#ffe600' : 'rgba(255,230,0,0.5)';
            ctx.shadowColor = '#ffe600';
            ctx.font = '600 12px Outfit,Arial,sans-serif';
            ctx.fillText('STREAK x' + state.streak, 16, 90);
            const tColor = state.timeLeft <= 10 ? '#ff4444' : '#00f0ff';
            ctx.fillStyle = tColor;
            ctx.font = '700 18px Outfit,Arial,sans-serif';
            ctx.textAlign = 'right';
            ctx.shadowColor = tColor; ctx.shadowBlur = 6;
            ctx.fillText('⏱ ' + state.timeLeft + 's', W - 16, 70);
            ctx.fillStyle = 'rgba(0,240,255,0.6)';
            ctx.font = '600 12px Outfit,Arial,sans-serif';
            ctx.fillText('BEST: ' + best, W - 16, 90);
            ctx.restore();

            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.beginPath(); ctx.roundRect(16, 104, W - 32, 6, 3); ctx.fill();
            ctx.fillStyle = tColor; ctx.shadowBlur = 6; ctx.shadowColor = tColor;
            ctx.beginPath(); ctx.roundRect(16, 104, (W - 32) * (state.timeLeft / GAME_TIME), 6, 3); ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = '600 13px Outfit,Arial,sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Chọn MÀU của chữ (không phải nghĩa):', W/2, 150);
            ctx.restore();

            ctx.save();
            ctx.fillStyle = state.round.color;
            ctx.font = '800 64px Outfit,Arial,sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.shadowBlur = 20; ctx.shadowColor = state.round.color;
            ctx.fillText(state.round.word, W/2, 220);
            ctx.restore();

            if (state.lastReaction > 0) {
                ctx.save();
                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                ctx.font = '400 11px Inter,Arial,sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Lần trước: ' + state.lastReaction + 'ms', W/2, 268);
                ctx.restore();
            }

            for (let i = 0; i < 4; i++) {
                const b = btnRect(i);
                const colorIdx = state.round.options[i];
                const c = COLORS[colorIdx];
                ctx.save();
                ctx.fillStyle = hexToRgba(c.hex, 0.18);
                ctx.strokeStyle = c.hex;
                ctx.lineWidth = 2;
                ctx.shadowBlur = 10; ctx.shadowColor = c.hex;
                ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 12);
                ctx.fill(); ctx.stroke();
                ctx.fillStyle = c.hex;
                ctx.font = '700 20px Outfit,Arial,sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.shadowBlur = 6;
                ctx.fillText(c.name, b.x + b.w/2 - 16, b.y + b.h/2);
                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                ctx.font = '600 11px Outfit,Arial,sans-serif';
                ctx.shadowBlur = 0;
                ctx.fillText('[' + (i+1) + ']', b.x + b.w - 18, b.y + 14);
                ctx.restore();
            }
        }

        if (flash && performance.now() < flash.until) {
            ctx.save();
            ctx.globalAlpha = (flash.until - performance.now()) / 250;
            ctx.fillStyle = flash.ok ? '#39ff14' : '#ff4444';
            ctx.font = '700 30px Outfit,Arial,sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 14; ctx.shadowColor = ctx.fillStyle;
            ctx.fillText(flash.ok ? '+ ĐÚNG' : 'SAI', W/2, 200);
            ctx.restore();
        } else if (flash && performance.now() >= flash.until) {
            flash = null;
        }

        if (state.phase === 'idle') {
            ctx.fillStyle = 'rgba(5,5,15,0.85)';
            ctx.fillRect(0, 0, W, H);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ff7300';
            ctx.font = '700 28px Outfit,Arial,sans-serif';
            ctx.shadowBlur = 16; ctx.shadowColor = '#ff7300';
            ctx.fillText('NEON REFLEX', W/2, H/2 - 90);
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            ctx.font = '400 14px Inter,Arial,sans-serif'; ctx.shadowBlur = 0;
            ctx.fillText('Chữ "ĐỎ" có thể đang tô màu XANH.', W/2, H/2 - 48);
            ctx.fillText('Hãy chọn MÀU của chữ, bỏ qua nghĩa.', W/2, H/2 - 26);
            ctx.fillStyle = 'rgba(0,240,255,0.8)';
            ctx.font = '600 14px Outfit,Arial,sans-serif';
            ctx.fillText('30 giây — Càng nhanh càng nhiều điểm!', W/2, H/2 + 20);
            ctx.fillStyle = 'rgba(57,255,20,0.85)';
            ctx.font = '700 16px Outfit,Arial,sans-serif';
            ctx.shadowBlur = 8; ctx.shadowColor = '#39ff14';
            ctx.fillText('Click / Space để bắt đầu', W/2, H/2 + 60);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '400 11px Inter,Arial,sans-serif'; ctx.shadowBlur = 0;
            ctx.fillText('BEST: ' + best + ' điểm', W/2, H/2 + 86);
        }

        if (state.phase === 'over') {
            ctx.fillStyle = 'rgba(5,5,15,0.88)';
            ctx.fillRect(0, 0, W, H);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ff7300';
            ctx.font = '700 30px Outfit,Arial,sans-serif';
            ctx.shadowBlur = 16; ctx.shadowColor = '#ff7300';
            ctx.fillText('HẾT GIỜ!', W/2, H/2 - 70);
            ctx.fillStyle = '#ffe600';
            ctx.font = '700 26px Outfit,Arial,sans-serif';
            ctx.shadowColor = '#ffe600';
            ctx.fillText('ĐIỂM: ' + state.score, W/2, H/2 - 20);
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.font = '400 13px Inter,Arial,sans-serif'; ctx.shadowBlur = 0;
            ctx.fillText('Đúng: ' + state.correct + '  •  Sai: ' + state.wrong, W/2, H/2 + 14);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillText('BEST: ' + best + ' điểm', W/2, H/2 + 38);
            ctx.fillStyle = 'rgba(0,240,255,0.85)';
            ctx.font = '600 13px Outfit,Arial,sans-serif';
            ctx.fillText('Click / Space để chơi lại', W/2, H/2 + 72);
        }
    }

    function hexToRgba(hex, a) {
        const v = hex.replace('#','');
        const n = parseInt(v, 16);
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }

    function loop() { draw(); state.animId = requestAnimationFrame(loop); }

    const oldCleanup = container._gameCleanup;
    if (oldCleanup) oldCleanup();
    container._gameCleanup = () => {
        cancelAnimationFrame(state.animId);
        clearInterval(state.tickInterval);
        window.removeEventListener('keydown', onKey);
        if (audioCtx) { try { audioCtx.close(); } catch(e){} audioCtx = null; }
    };

    state = { phase: 'idle', animId: 0 };
    loop();
}