// ===========================
// NEON SLIDE (15-Puzzle)
// ===========================
function initNeonSlide(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const N = 4;
    const TILE = 90;
    const GAP = 6;
    const BOARD = N * TILE + (N + 1) * GAP;
    const W = BOARD;
    const H = BOARD + 64;

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:0;';
    container.appendChild(wrap);

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;box-shadow:0 0 40px rgba(57,255,20,0.3);background:#07080c;cursor:pointer;';
    wrap.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const TILE_COLORS = ['#39ff14','#00f0ff','#ffe600','#ff7300','#ff007f','#b026ff'];

    let state = {};
    let best = parseInt(localStorage.getItem('neon_slide_best_moves') || '0');

    function idx(r, c) { return r * N + c; }
    function rc(i) { return [Math.floor(i / N), i % N]; }

    function isSolved(arr) {
        for (let i = 0; i < N * N - 1; i++) if (arr[i] !== i + 1) return false;
        return arr[N * N - 1] === 0;
    }

    function shuffleSolvable() {
        const arr = [];
        for (let i = 1; i < N * N; i++) arr.push(i);
        arr.push(0);
        let blank = N * N - 1;
        let prevDir = -1;
        const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
        for (let step = 0; step < 200; step++) {
            const [br, bc] = rc(blank);
            const candidates = [];
            dirs.forEach((d, di) => {
                if (di === (prevDir ^ 1)) return;
                const nr = br + d[0], nc = bc + d[1];
                if (nr >= 0 && nr < N && nc >= 0 && nc < N) candidates.push([di, nr * N + nc]);
            });
            const [di, ni] = candidates[Math.floor(Math.random() * candidates.length)];
            [arr[blank], arr[ni]] = [arr[ni], arr[blank]];
            blank = ni; prevDir = di;
        }
        if (isSolved(arr)) return shuffleSolvable();
        return arr;
    }

    function newPuzzle() {
        state = {
            phase: 'playing',
            tiles: shuffleSolvable(),
            blank: 0,
            moves: 0,
            startTime: Date.now(),
            anim: null,
            animId: 0
        };
        state.blank = state.tiles.indexOf(0);
    }

    function tryMove(tileIndex) {
        if (state.phase !== 'playing' || state.anim) return false;
        const [tr, tc] = rc(tileIndex);
        const [br, bc] = rc(state.blank);
        if (Math.abs(tr - br) + Math.abs(tc - bc) !== 1) return false;
        state.anim = {
            value: state.tiles[tileIndex],
            fromR: tr, fromC: tc, toR: br, toC: bc,
            t: 0, dur: 130, start: performance.now()
        };
        state.tiles[state.blank] = state.tiles[tileIndex];
        state.tiles[tileIndex] = 0;
        state.blank = tileIndex;
        state.moves++;
        if (isSolved(state.tiles)) {
            state.phase = 'won';
            state.elapsed = Math.floor((Date.now() - state.startTime) / 1000);
            if (best === 0 || state.moves < best) {
                best = state.moves;
                localStorage.setItem('neon_slide_best_moves', best);
            }
        }
        return true;
    }

    function clickCell(mx, my) {
        if (state.phase === 'won') { newPuzzle(); return; }
        if (state.anim) return;
        if (mx < GAP || my < GAP) return;
        const c = Math.floor((mx - GAP) / (TILE + GAP));
        const r = Math.floor((my - GAP) / (TILE + GAP));
        if (r < 0 || r >= N || c < 0 || c >= N) return;
        const borderX = GAP + c * (TILE + GAP);
        const borderY = GAP + r * (TILE + GAP);
        if (mx > borderX + TILE || my > borderY + TILE) return;
        tryMove(idx(r, c));
    }

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (W / rect.width);
        const my = (e.clientY - rect.top) * (H / rect.height);
        if (my < BOARD) clickCell(mx, my);
        else newPuzzle();
    });

    function onKey(e) {
        if (document.getElementById('slideView') && document.getElementById('slideView').classList.contains('hidden')) return;
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
        if (state.phase !== 'playing' || state.anim) return;
        const [br, bc] = rc(state.blank);
        let target = -1;
        if (e.key === 'ArrowLeft' && bc < N - 1) target = idx(br, bc + 1);
        else if (e.key === 'ArrowRight' && bc > 0) target = idx(br, bc - 1);
        else if (e.key === 'ArrowUp' && br < N - 1) target = idx(br + 1, bc);
        else if (e.key === 'ArrowDown' && br > 0) target = idx(br - 1, bc);
        if (target !== -1) { tryMove(target); e.preventDefault(); }
    }
    window.addEventListener('keydown', onKey);

    function fmtTime(s) {
        const m = Math.floor(s/60), ss = s % 60;
        return (m<10?'0':'')+m+':'+(ss<10?'0':'')+ss;
    }

    function draw() {
        ctx.fillStyle = '#07080c';
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.fillStyle = 'rgba(20,24,40,0.6)';
        ctx.strokeStyle = 'rgba(57,255,20,0.5)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10; ctx.shadowColor = '#39ff14';
        ctx.beginPath(); ctx.roundRect(2, 2, BOARD - 4, BOARD - 4, 10); ctx.fill(); ctx.stroke();
        ctx.restore();

        const [br, bc] = rc(state.blank);
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.strokeStyle = 'rgba(120,140,180,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(GAP + bc*(TILE+GAP), GAP + br*(TILE+GAP), TILE, TILE, 8); ctx.fill(); ctx.stroke();
        ctx.restore();

        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '700 34px Outfit,Arial,sans-serif';
        for (let i = 0; i < N * N; i++) {
            const v = state.tiles[i];
            if (!v) continue;
            if (state.anim && state.anim.value === v) continue;
            const [r, c] = rc(i);
            drawTile(v, GAP + c*(TILE+GAP), GAP + r*(TILE+GAP));
        }

        if (state.anim) {
            const a = state.anim;
            a.t = Math.min(1, (performance.now() - a.start) / a.dur);
            const fromX = GAP + a.fromC * (TILE + GAP);
            const fromY = GAP + a.fromR * (TILE + GAP);
            const toX = GAP + a.toC * (TILE + GAP);
            const toY = GAP + a.toR * (TILE + GAP);
            const ease = 1 - Math.pow(1 - a.t, 3);
            drawTile(a.value, fromX + (toX - fromX) * ease, fromY + (toY - fromY) * ease, true);
            if (a.t >= 1) state.anim = null;
        }

        const hudY = BOARD + 12;
        ctx.save();
        ctx.fillStyle = '#39ff14';
        ctx.font = '700 16px Outfit,Arial,sans-serif';
        ctx.textAlign = 'left';
        ctx.shadowBlur = 8; ctx.shadowColor = '#39ff14';
        const elapsed = state.phase === 'won' ? state.elapsed : Math.floor((Date.now() - state.startTime) / 1000);
        ctx.fillText('⏱ ' + fmtTime(elapsed), 8, hudY + 18);
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.fillText('🔁 ' + state.moves, 130, hudY + 18);
        const btnX = W - 92, btnW = 84;
        ctx.fillStyle = 'rgba(176,38,255,0.2)';
        ctx.strokeStyle = '#b026ff'; ctx.lineWidth = 1;
        ctx.shadowBlur = 8; ctx.shadowColor = '#b026ff';
        ctx.beginPath(); ctx.roundRect(btnX, hudY, btnW, 32, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#b026ff';
        ctx.font = '700 12px Outfit,Arial,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('XÁO LẠI', btnX + btnW/2, hudY + 17);
        ctx.fillStyle = 'rgba(255,230,0,0.5)';
        ctx.font = '600 10px Outfit,Arial,sans-serif';
        ctx.shadowBlur = 0;
        ctx.fillText('BEST: ' + (best || '--') + ' nước', W/2, hudY + 18);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = 'rgba(57,255,20,0.8)';
        ctx.font = '700 13px Outfit,Arial,sans-serif';
        ctx.textAlign = 'left';
        ctx.shadowBlur = 6; ctx.shadowColor = '#39ff14';
        ctx.fillText('🧩 NEON SLIDE', 6, 14);
        ctx.restore();

        if (state.phase === 'won') {
            ctx.fillStyle = 'rgba(5,5,15,0.86)';
            ctx.fillRect(0, 0, W, H);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#39ff14';
            ctx.font = '700 30px Outfit,Arial,sans-serif';
            ctx.shadowBlur = 16; ctx.shadowColor = '#39ff14';
            ctx.fillText('XẾP XONG!', W/2, H/2 - 30);
            ctx.fillStyle = '#ffe600';
            ctx.font = '700 20px Outfit,Arial,sans-serif';
            ctx.shadowColor = '#ffe600';
            ctx.fillText(state.moves + ' nước • ' + fmtTime(state.elapsed), W/2, H/2 + 8);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '400 12px Inter,Arial,sans-serif'; ctx.shadowBlur = 0;
            ctx.fillText('BEST: ' + (best || '--') + ' nước', W/2, H/2 + 34);
            ctx.fillStyle = 'rgba(0,240,255,0.8)';
            ctx.font = '400 13px Inter,Arial,sans-serif';
            ctx.fillText('Click để chơi bản mới', W/2, H/2 + 60);
        }
    }

    function drawTile(v, x, y, sliding) {
        const color = TILE_COLORS[(v - 1) % TILE_COLORS.length];
        ctx.save();
        const grad = ctx.createLinearGradient(x, y, x, y + TILE);
        grad.addColorStop(0, hexToRgba(color, 0.95));
        grad.addColorStop(1, hexToRgba(color, 0.55));
        ctx.fillStyle = grad;
        ctx.shadowBlur = sliding ? 22 : 10;
        ctx.shadowColor = color;
        ctx.beginPath(); ctx.roundRect(x, y, TILE, TILE, 10); ctx.fill();
        ctx.strokeStyle = hexToRgba('#ffffff', 0.5);
        ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.roundRect(x + 2, y + 2, TILE - 4, TILE - 4, 8); ctx.stroke();
        ctx.fillStyle = '#07080c';
        ctx.font = '700 34px Outfit,Arial,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(v.toString(), x + TILE/2, y + TILE/2 + 2);
        ctx.restore();
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
        window.removeEventListener('keydown', onKey);
    };

    newPuzzle();
    loop();
}