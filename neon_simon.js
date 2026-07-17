// ===========================
// NEON SIMON (Memory Sequencer)
// ===========================
function initNeonSimon(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const W = 420, H = 520;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:0;';
    container.appendChild(wrap);

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 40px rgba(0,240,255,0.3);background:#07080c;cursor:pointer;';
    wrap.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const CX = W / 2, CY = H / 2 + 20;
    const R_OUT = 160, R_IN = 78;

    // 4 pad: trên(trái), trên(phải), dưới(fải), dưới(trái)
    const PADS = [
        { id: 0, color: '#39ff14', a0: Math.PI * 1.0, a1: Math.PI * 1.5 }, // top-left green
        { id: 1, color: '#ff007f', a0: Math.PI * 1.5, a1: Math.PI * 2.0 }, // top-right pink
        { id: 2, color: '#00f0ff', a0: Math.PI * 0.0, a1: Math.PI * 0.5 }, // bottom-right cyan
        { id: 3, color: '#ffe600', a0: Math.PI * 0.5, a1: Math.PI * 1.0 }  // bottom-left yellow
    ];
    const TONES = [330, 440, 550, 660]; // tần số cho từng pad
    let audioCtx = null;
    function beep(freq, dur) {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = 'sine'; o.frequency.value = freq;
            g.gain.value = 0.0001;
            o.connect(g); g.connect(audioCtx.destination);
            const now = audioCtx.currentTime;
            g.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
            o.start(now); o.stop(now + dur);
        } catch (e) {}
    }

    let state = {};
    let best = parseInt(localStorage.getItem('neon_simon_best') || '0');

    function reset() {
        state = {
            phase: 'idle', // idle | showing | input | over
            sequence: [],
            inputIndex: 0,
            activePad: -1,
            activeUntil: 0,
            showIndex: 0,
            nextStepAt: 0,
            level: 0,
            flashBad: -1,
            flashBadUntil: 0,
            animId: 0
        };
    }
    reset();

    function nextRound() {
        state.sequence.push(Math.floor(Math.random() * 4));
        state.level = state.sequence.length;
        state.inputIndex = 0;
        state.showIndex = 0;
        state.phase = 'showing';
        state.nextStepAt = performance.now() + 600;
    }

    function startGame() {
        reset();
        nextRound();
    }

    function flashPad(id, dur) {
        state.activePad = id;
        state.activeUntil = performance.now() + dur;
        beep(TONES[id], dur / 1000);
    }

    function handleClick(mx, my) {
        if (state.phase === 'idle') { startGame(); return; }
        if (state.phase === 'over') { reset(); return; }
        if (state.phase !== 'input') return;
        const pad = padAt(mx, my);
        if (pad === -1) return;
        flashPad(pad, 220);
        const expected = state.sequence[state.inputIndex];
        if (pad !== expected) {
            // sai
            state.phase = 'over';
            state.flashBad = pad;
            state.flashBadUntil = performance.now() + 900;
            beep(110, 0.6);
            if (state.level - 1 > best) {
                best = state.level - 1;
                localStorage.setItem('neon_simon_best', best);
            }
            return;
        }
        state.inputIndex++;
        if (state.inputIndex >= state.sequence.length) {
            // qua vòng, sau khoảng nghỉ -> thêm bước mới
            state.phase = 'between';
            state.nextStepAt = performance.now() + 800;
        }
    }

    function padAt(mx, my) {
        const dx = mx - CX, dy = my - CY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < R_IN || dist > R_OUT) return -1;
        let ang = Math.atan2(dy, dx);
        if (ang < 0) ang += Math.PI * 2;
        for (const p of PADS) {
            let a0 = p.a0 < 0 ? p.a0 + Math.PI*2 : p.a0;
            let a1 = p.a1 < 0 ? p.a1 + Math.PI*2 : p.a1;
            if (a0 <= a1) {
                if (ang >= a0 && ang < a1) return p.id;
            } else {
                if (ang >= a0 || ang < a1) return p.id;
            }
        }
        return -1;
    }

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (W / rect.width);
        const my = (e.clientY - rect.top) * (H / rect.height);
        handleClick(mx, my);
    });

    // bàn phím 1/2/3/4 -> pad tương ứng (1=Xanh, 2=Hồng, 3=Vàng, 4=Lam)
    const KEY_REMAP = [0, 1, 3, 2];
    function onKey(e) {
        if (document.getElementById('simonView') && document.getElementById('simonView').classList.contains('hidden')) return;
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
        if (!['1','2','3','4'].includes(e.key)) return;
        handleKeyPad(KEY_REMAP[parseInt(e.key) - 1]);
    }
    function handleKeyPad(id) {
        if (state.phase === 'idle') { startGame(); return; }
        if (state.phase === 'over') { reset(); return; }
        if (state.phase !== 'input') return;
        flashPad(id, 220);
        const expected = state.sequence[state.inputIndex];
        if (id !== expected) {
            state.phase = 'over';
            state.flashBad = id;
            state.flashBadUntil = performance.now() + 900;
            beep(110, 0.6);
            if (state.level - 1 > best) { best = state.level - 1; localStorage.setItem('neon_simon_best', best); }
            return;
        }
        state.inputIndex++;
        if (state.inputIndex >= state.sequence.length) { state.phase = 'between'; state.nextStepAt = performance.now() + 800; }
    }
    window.addEventListener('keydown', onKey);

    function update(now) {
        if (state.phase === 'showing') {
            if (now >= state.nextStepAt) {
                if (state.showIndex < state.sequence.length) {
                    flashPad(state.sequence[state.showIndex], 450);
                    state.showIndex++;
                    state.nextStepAt = now + 600;
                } else {
                    state.phase = 'input';
                }
            }
        } else if (state.phase === 'between') {
            if (now >= state.nextStepAt) nextRound();
        }
        if (state.activePad !== -1 && now >= state.activeUntil) state.activePad = -1;
    }

    function draw() {
        ctx.fillStyle = '#07080c';
        ctx.fillRect(0, 0, W, H);

        // glow center
        ctx.save();
        ctx.shadowBlur = 20; ctx.shadowColor = '#b026ff';
        ctx.strokeStyle = 'rgba(176,38,255,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(CX, CY, R_IN, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        PADS.forEach(p => {
            const active = state.activePad === p.id;
            const bad = state.flashBad === p.id && performance.now() < state.flashBadUntil;
            ctx.save();
            ctx.beginPath();
            ctx.arc(CX, CY, R_OUT, p.a0, p.a1);
            ctx.arc(CX, CY, R_IN, p.a1, p.a0, true);
            ctx.closePath();
            if (bad) {
                ctx.fillStyle = '#ff2222';
                ctx.shadowBlur = 30; ctx.shadowColor = '#ff2222';
            } else if (active) {
                ctx.fillStyle = p.color;
                ctx.shadowBlur = 28; ctx.shadowColor = p.color;
            } else {
                ctx.fillStyle = hexToRgba(p.color, 0.28);
                ctx.shadowBlur = 8; ctx.shadowColor = p.color;
            }
            ctx.fill();
            ctx.restore();
        });

        // viền phân cách
        ctx.save();
        ctx.strokeStyle = '#07080c';
        ctx.lineWidth = 4;
        for (const p of PADS) {
            ctx.beginPath(); ctx.moveTo(CX, CY);
            ctx.lineTo(CX + Math.cos(p.a0) * R_OUT, CY + Math.sin(p.a0) * R_OUT);
            ctx.stroke();
        }
        ctx.restore();

        // tâm: hiện level
        ctx.save();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 30px Outfit,Arial,sans-serif';
        ctx.shadowBlur = 10; ctx.shadowColor = '#00f0ff';
        const txt = state.phase === 'idle' ? 'SIMON' : (state.level || 0).toString();
        ctx.fillText(txt, CX, CY - 6);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '600 11px Outfit,Arial,sans-serif';
        ctx.shadowBlur = 0;
        ctx.fillText(state.phase === 'input' ? 'LƯỢT CỦA BẠN' : (state.phase === 'showing' ? 'ĐANG CHƠI...' : 'LEVEL'), CX, CY + 18);
        ctx.restore();

        // HUD
        ctx.save();
        ctx.fillStyle = 'rgba(0,240,255,0.8)';
        ctx.font = '700 15px Outfit,Arial,sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 8; ctx.shadowColor = '#00f0ff';
        ctx.fillText('🎡 NEON SIMON', W/2, 30);
        ctx.fillStyle = 'rgba(255,230,0,0.5)';
        ctx.font = '600 11px Outfit,Arial,sans-serif'; ctx.shadowBlur = 0;
        ctx.fillText('BEST: ' + best, W/2, 52);
        ctx.restore();

        // Overlays
        if (state.phase === 'idle') {
            ctx.fillStyle = 'rgba(5,5,15,0.82)';
            ctx.fillRect(0, 0, W, H);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#00f0ff';
            ctx.font = '700 26px Outfit,Arial,sans-serif';
            ctx.shadowBlur = 14; ctx.shadowColor = '#00f0ff';
            ctx.fillText('NEON SIMON', W/2, H/2 - 80);
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '400 13px Inter,Arial,sans-serif'; ctx.shadowBlur = 0;
            ctx.fillText('Nhớ thứ tự đèn sáng rồi lặp lại.', W/2, H/2 - 40);
            ctx.fillText('Mỗi vòng thêm 1 bước mới.', W/2, H/2 - 18);
            ctx.fillStyle = 'rgba(0,255,136,0.8)';
            ctx.font = '600 14px Outfit,Arial,sans-serif';
            ctx.fillText('Click hoặc nhấn 1/2/3/4 để bắt đầu', W/2, H/2 + 40);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '400 11px Inter,Arial,sans-serif';
            ctx.fillText('Tương ứng: Xanh - Hồng - Vàng - Lam', W/2, H/2 + 64);
        }
        if (state.phase === 'over') {
            ctx.fillStyle = 'rgba(5,5,15,0.85)';
            ctx.fillRect(0, 0, W, H);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ff007f';
            ctx.font = '700 30px Outfit,Arial,sans-serif';
            ctx.shadowBlur = 16; ctx.shadowColor = '#ff007f';
            ctx.fillText('SAI RỒI!', W/2, H/2 - 50);
            ctx.fillStyle = '#ffe600';
            ctx.font = '700 24px Outfit,Arial,sans-serif';
            ctx.shadowColor = '#ffe600';
            ctx.fillText('Độ dài: ' + state.level, W/2, H/2);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '400 12px Inter,Arial,sans-serif'; ctx.shadowBlur = 0;
            ctx.fillText('BEST: ' + best, W/2, H/2 + 28);
            ctx.fillStyle = 'rgba(0,240,255,0.8)';
            ctx.font = '400 13px Inter,Arial,sans-serif';
            ctx.fillText('Click để chơi lại', W/2, H/2 + 56);
        }
    }

    function hexToRgba(hex, a) {
        const v = hex.replace('#','');
        const n = parseInt(v, 16);
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }

    function loop() { update(performance.now()); draw(); state.animId = requestAnimationFrame(loop); }

    const oldCleanup = container._gameCleanup;
    if (oldCleanup) oldCleanup();
    container._gameCleanup = () => {
        cancelAnimationFrame(state.animId);
        window.removeEventListener('keydown', onKey);
        if (audioCtx) { try { audioCtx.close(); } catch(e){} audioCtx = null; }
    };
    loop();
}