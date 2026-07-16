// ===========================
// NEON WORDLE
// ===========================
function initWordle(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    // Word list (5-letter English words)
    const WORDS = [
        'CRANE','SLATE','TRACE','AUDIO','RAISE','ARISE','STARE','SNARE',
        'SHARE','SPARE','GLARE','FLARE','BLAZE','GRACE','PLACE','PLANE',
        'PLANT','PLANK','FLAME','FRAME','PRIME','PRICE','PRIDE','BRIDE',
        'BRINE','CRIME','GRIPE','TRIPE','TRIBE','TRIBE','DRIVE','GROVE',
        'PROVE','PROSE','THOSE','CLOSE','CLONE','CLONE','STONE','STORE',
        'SCORE','SHORE','SHONE','PHONE','THRONE','DRONE','PRONE','OZONE',
        'QUOTE','QUITE','QUIRE','QUAKE','BRAKE','BRAVE','CRAVE','GRAVE',
        'SLAVE','SHAVE','KNAVE','STAVE','LEAVE','HEAVE','WEAVE','CLEAVE',
        'PLUME','FLUME','FLUTE','BRUTE','CRUDE','PRUDE','EXUDE','ETUDE',
        'STUDY','BUNNY','FUNNY','SUNNY','MONEY','HONEY','DONKEY','TURKEY',
        'ANGLE','ANKLE','UNCLE','CYCLE','STYLE','WHILE','SMILE','STILE',
        'TIGER','LIVER','RIVER','GIVEN','RISEN','LINEN','ALIEN','RIVEN',
        'POWER','TOWER','LOWER','BOWER','MOWER','COWER','DOWEL','VOWEL',
        'LEVEL','NOVEL','HOTEL','MODEL','PIXEL','EXCEL','EXPEL','REPEL',
        'MAGIC','PANIC','MANIC','TONIC','SONIC','IRONIC','TOXIC','STOIC',
        'GHOST','ROAST','COAST','TOAST','BOAST','FEAST','BEAST','YEAST',
        'LIGHT','NIGHT','RIGHT','SIGHT','TIGHT','MIGHT','FIGHT','BIGHT',
        'CLOUD','PROUD','ALOUD','SOUND','BOUND','FOUND','MOUND','ROUND',
        'FLESH','FRESH','CRUSH','BRUSH','BLUSH','FLUSH','PLUSH','SLUSH',
        'CLOCK','BLOCK','FLOCK','KNOCK','SHOCK','STOCK','SMOCK','CROOK',
        'SWORD','SWORE','SWORE','SWARM','SWAMP','SWEPT','SWEET','SWEEP',
        'BLEND','BLOND','BLAND','BLANK','BLANK','BRAND','GRAND','GLAND',
        'DRINK','BRINK','SHRINK','THINK','BLINK','CLINK','SLINK','STINK',
        'FROST','TRUST','CRUST','FIRST','WORST','THIRST','BURST','DURST',
        'CHESS','PRESS','DRESS','TRESS','BLESS','BLESS','GUESS','DURESS',
        'PLANT','GIANT','GRANT','SLANT','CHANT','SCANT','RANT','FAINT',
        'CHAIR','CHAIN','BRAIN','TRAIN','GRAIN','PLAIN','STAIN','SPAIN',
        'YOUNG','AMONG','PRONG','WRONG','TONGS','SONGS','LONGS','GONGS',
        'EARTH','WORTH','NORTH','FORTH','MIRTH','BIRTH','GIRTH','BERTH',
        'CLEAR','CLEAN','CREEP','CREEK','CREED','CREEL','GREET','GREED',
        'STING','SWING','BRING','CLING','FLING','SLING','THING','WRING',
        'FLOOD','FLOOR','BLOOD','BLOOM','BROOM','BROOD','BROOK','CROOK',
        'PHASE','CHASE','ERASE','GRAZE','BLAZE','CRAZE','GLAZE','HAZE',
        'SLOPE','SCOPE','GROPE','TROPE','DOPE','LOPE','MOPE','ROPE',
        'SPEND','BLEND','TREND','AMEND','MEND','REND','SEND','TEND',
        'STUCK','PLUCK','CLUCK','TRUCK','CHUCK','DUCK','LUCK','MUCK',
        'CHILL','DRILL','GRILL','SKILL','SPILL','STILL','SWILL','THRILL',
        'CRISP','WISP','LISP','GRASP','CLASP','HASP','WASP','RASP',
        'FROWN','BROWN','CROWN','DROWN','GOWN','TOWN','DOWN','NOUN',
        'SPARK','STARK','DARK','MARK','PARK','BARK','HARK','LARK',
        'BIRTH','WORTH','EARTH','MIRTH','NORTH','GIRTH','BERTH','FORTH'
    ].filter(w => w.length === 5);

    const ANSWER = WORDS[Math.floor(Math.random() * WORDS.length)];
    const MAX_GUESSES = 6;
    const WORD_LEN = 5;

    let guesses = [];  // array of {letters, result}
    let currentGuess = '';
    let gameOver = false;
    let won = false;
    let flipQueue = []; // animation queue
    let shakeRow = -1, shakeTick = 0;
    let flipState = {}; // {row_col: progress 0..1}

    // Build UI
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
        display:flex; flex-direction:column; align-items:center; gap:16px;
        font-family:'Outfit',Arial,sans-serif; padding:20px 10px;
        min-width:320px; max-width:420px; margin:0 auto;
    `;

    // Title
    const title = document.createElement('div');
    title.style.cssText = `font-size:22px;font-weight:800;letter-spacing:3px;
        color:#00f0ff;text-shadow:0 0 12px #00f0ff;text-align:center;`;
    title.textContent = '🔤 NEON WORDLE';
    wrapper.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.style.cssText = `font-size:11px;color:rgba(143,146,161,0.7);
        letter-spacing:1px;text-align:center;margin-top:-8px;`;
    subtitle.textContent = 'ĐOÁN TỪ 5 CHỮ TRONG 6 LẦN';
    wrapper.appendChild(subtitle);

    // Grid
    const gridEl = document.createElement('div');
    gridEl.style.cssText = `display:grid;grid-template-rows:repeat(6,1fr);gap:6px;`;
    const cells = [];
    for (let r = 0; r < MAX_GUESSES; r++) {
        const row = document.createElement('div');
        row.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:6px;';
        const rowCells = [];
        for (let c = 0; c < WORD_LEN; c++) {
            const cell = document.createElement('div');
            cell.style.cssText = `
                width:56px; height:56px; border:2px solid rgba(255,255,255,0.12);
                border-radius:8px; display:flex; align-items:center; justify-content:center;
                font-size:22px; font-weight:800; color:#fff; letter-spacing:1px;
                background:rgba(255,255,255,0.03);
                transition:border-color 0.15s, transform 0.08s;
                position:relative; overflow:hidden;
                box-sizing:border-box;
            `;
            row.appendChild(cell);
            rowCells.push(cell);
        }
        cells.push(rowCells);
        gridEl.appendChild(row);
    }
    wrapper.appendChild(gridEl);

    // Message area
    const msgEl = document.createElement('div');
    msgEl.style.cssText = `min-height:24px;font-size:13px;font-weight:600;
        color:#ffe600;text-align:center;letter-spacing:1px;transition:opacity 0.3s;`;
    wrapper.appendChild(msgEl);

    function showMsg(text, color = '#ffe600', duration = 2000) {
        msgEl.style.color = color;
        msgEl.textContent = text;
        if (duration > 0) setTimeout(() => { msgEl.textContent = ''; }, duration);
    }

    // Keyboard
    const KB_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ENTERZ XCVBNM⌫'];
    const keyEls = {};
    const kbEl = document.createElement('div');
    kbEl.style.cssText = 'display:flex;flex-direction:column;gap:6px;align-items:center;width:100%;';

    KB_ROWS.forEach((rowStr, ri) => {
        const rowEl = document.createElement('div');
        rowEl.style.cssText = 'display:flex;gap:5px;';
        const keys = ri < 2 ? rowStr.split('') : ['ENTER', ...rowStr.replace('ENTER','').replace('⌫','').split('').filter(c=>c.trim()), '⌫'];
        keys.forEach(k => {
            const btn = document.createElement('button');
            const isWide = k === 'ENTER' || k === '⌫';
            btn.style.cssText = `
                background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12);
                border-radius:6px; color:#ffffff; font-family:'Outfit',Arial,sans-serif;
                font-size:${isWide ? '10px' : '13px'}; font-weight:700;
                padding:0; cursor:pointer;
                width:${isWide ? '52px' : '34px'}; height:42px;
                transition:all 0.15s; letter-spacing:0.5px;
                display:flex;align-items:center;justify-content:center;
            `;
            btn.textContent = k === ' ' ? '' : k;
            if (k.trim()) {
                btn.addEventListener('click', () => handleKey(k));
                if (k !== 'ENTER' && k !== '⌫') keyEls[k] = btn;
            }
            rowEl.appendChild(btn);
        });
        kbEl.appendChild(rowEl);
    });
    wrapper.appendChild(kbEl);

    // New game button
    const newBtn = document.createElement('button');
    newBtn.style.cssText = `
        display:none; padding:10px 28px; border:1px solid #00f0ff;
        border-radius:8px; background:rgba(0,240,255,0.1);
        color:#00f0ff; font-family:'Outfit',Arial,sans-serif;
        font-size:13px; font-weight:700; letter-spacing:1px;
        cursor:pointer; box-shadow:0 0 12px rgba(0,240,255,0.2);
        transition:all 0.2s;
    `;
    newBtn.textContent = 'CHƠI LẠI';
    newBtn.addEventListener('mouseenter', () => { newBtn.style.background = 'rgba(0,240,255,0.2)'; });
    newBtn.addEventListener('mouseleave', () => { newBtn.style.background = 'rgba(0,240,255,0.1)'; });
    newBtn.addEventListener('click', () => { initWordle(containerId); });
    wrapper.appendChild(newBtn);

    container.appendChild(wrapper);

    function updateGrid() {
        for (let r = 0; r < MAX_GUESSES; r++) {
            for (let c = 0; c < WORD_LEN; c++) {
                const cell = cells[r][c];
                if (r < guesses.length) {
                    // Submitted row
                    const g = guesses[r];
                    const letter = g.letters[c] || '';
                    const result = g.result[c]; // 'correct'|'present'|'absent'
                    cell.textContent = letter;
                    const colors = {
                        correct: { bg: 'rgba(0,220,100,0.25)', border: '#00dc64', shadow: '#00dc64' },
                        present: { bg: 'rgba(255,200,0,0.2)', border: '#ffc800', shadow: '#ffc800' },
                        absent: { bg: 'rgba(100,100,120,0.2)', border: 'rgba(100,100,120,0.4)', shadow: 'none' }
                    };
                    const cl = colors[result] || colors.absent;
                    cell.style.background = cl.bg;
                    cell.style.borderColor = cl.border;
                    cell.style.boxShadow = cl.shadow !== 'none' ? `0 0 10px ${cl.shadow}40, inset 0 0 6px ${cl.shadow}20` : 'none';
                    cell.style.color = '#ffffff';
                } else if (r === guesses.length && !gameOver) {
                    // Current input row
                    const letter = currentGuess[c] || '';
                    cell.textContent = letter;
                    cell.style.background = letter ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)';
                    cell.style.borderColor = letter ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)';
                    cell.style.boxShadow = 'none';
                    // Pop animation when letter added
                    if (letter) {
                        cell.style.transform = 'scale(1.08)';
                        setTimeout(() => { if (cell) cell.style.transform = 'scale(1)'; }, 80);
                    }
                } else {
                    cell.textContent = '';
                    cell.style.background = 'rgba(255,255,255,0.03)';
                    cell.style.borderColor = 'rgba(255,255,255,0.12)';
                    cell.style.boxShadow = 'none';
                }
            }
        }
    }

    function evaluateGuess(guess) {
        const result = Array(WORD_LEN).fill('absent');
        const answerArr = ANSWER.split('');
        const guessArr = guess.split('');
        // First pass: correct
        for (let i = 0; i < WORD_LEN; i++) {
            if (guessArr[i] === answerArr[i]) {
                result[i] = 'correct';
                answerArr[i] = null;
                guessArr[i] = null;
            }
        }
        // Second pass: present
        for (let i = 0; i < WORD_LEN; i++) {
            if (guessArr[i] !== null) {
                const idx = answerArr.indexOf(guessArr[i]);
                if (idx !== -1) {
                    result[i] = 'present';
                    answerArr[idx] = null;
                }
            }
        }
        return result;
    }

    function updateKeyboard(letters, result) {
        const priority = { correct: 3, present: 2, absent: 1 };
        letters.forEach((ltr, i) => {
            if (!ltr || !keyEls[ltr]) return;
            const btn = keyEls[ltr];
            const curState = btn.dataset.state;
            if (!curState || priority[result[i]] > priority[curState]) {
                btn.dataset.state = result[i];
                const clrs = {
                    correct: { bg: 'rgba(0,220,100,0.35)', border: '#00dc64', color: '#fff' },
                    present: { bg: 'rgba(255,200,0,0.3)', border: '#ffc800', color: '#fff' },
                    absent: { bg: 'rgba(60,60,80,0.5)', border: 'rgba(80,80,100,0.3)', color: 'rgba(255,255,255,0.4)' }
                };
                const cl = clrs[result[i]];
                btn.style.background = cl.bg;
                btn.style.borderColor = cl.border;
                btn.style.color = cl.color;
            }
        });
    }

    function shakeCurrentRow() {
        const row = guesses.length;
        for (let c = 0; c < WORD_LEN; c++) {
            const cell = cells[row][c];
            cell.style.animation = 'none';
            cell.style.transform = 'translateX(0)';
        }
        let t = 0;
        const shakes = [8, -8, 6, -6, 4, -4, 0];
        function doShake() {
            for (let c = 0; c < WORD_LEN; c++) {
                cells[guesses.length][c].style.transform = `translateX(${shakes[t]}px)`;
            }
            t++;
            if (t < shakes.length) setTimeout(doShake, 50);
        }
        doShake();
    }

    async function submitGuess() {
        if (currentGuess.length < WORD_LEN) {
            showMsg('Chưa đủ 5 chữ!', '#ff4444');
            shakeCurrentRow();
            return;
        }
        if (!WORDS.includes(currentGuess)) {
            showMsg('Từ không hợp lệ!', '#ff4444');
            shakeCurrentRow();
            return;
        }

        const result = evaluateGuess(currentGuess);
        const row = guesses.length;
        guesses.push({ letters: currentGuess.split(''), result });
        updateKeyboard(currentGuess.split(''), result);
        currentGuess = '';
        updateGrid();

        // Flip animation
        for (let c = 0; c < WORD_LEN; c++) {
            await new Promise(res => setTimeout(res, 60));
            const cell = cells[row][c];
            cell.style.transition = 'transform 0.25s ease';
            cell.style.transform = 'rotateX(90deg)';
            await new Promise(res => setTimeout(res, 250));
            cell.style.transform = 'rotateX(0deg)';
        }

        if (currentGuess === '' && result.every(r => r === 'correct')) {
            // Check from guesses
        }

        const lastGuess = guesses[guesses.length - 1];
        if (lastGuess.result.every(r => r === 'correct')) {
            won = true; gameOver = true;
            const msgs = ['🎉 XUẤT SẮC!', '🏆 TUYỆT VỜI!', '🌟 THIÊN TÀI!', '✨ HOÀN HẢO!'];
            showMsg(msgs[Math.min(guesses.length - 1, msgs.length - 1)], '#00dc64', 0);
            newBtn.style.display = 'block';
            // Win animation - bounce all correct cells
            for (let c = 0; c < WORD_LEN; c++) {
                setTimeout(() => {
                    const cell = cells[row][c];
                    cell.style.transition = 'transform 0.3s cubic-bezier(0.3,2,0.5,1)';
                    cell.style.transform = 'scale(1.2)';
                    setTimeout(() => { cell.style.transform = 'scale(1)'; }, 300);
                }, c * 80);
            }
        } else if (guesses.length >= MAX_GUESSES) {
            gameOver = true;
            showMsg('Đáp án: ' + ANSWER, '#ff007f', 0);
            newBtn.style.display = 'block';
        }

        updateGrid();
    }

    function handleKey(key) {
        if (gameOver) return;
        if (key === '⌫' || key === 'BACKSPACE') {
            if (currentGuess.length > 0) {
                currentGuess = currentGuess.slice(0, -1);
                updateGrid();
            }
        } else if (key === 'ENTER') {
            submitGuess();
        } else if (/^[A-Z]$/.test(key) && currentGuess.length < WORD_LEN) {
            currentGuess += key;
            updateGrid();
        }
    }

    document.addEventListener('keydown', function onKD(e) {
        if (!document.getElementById(containerId)) {
            document.removeEventListener('keydown', onKD);
            return;
        }
        const k = e.key.toUpperCase();
        if (k === 'BACKSPACE') handleKey('⌫');
        else if (k === 'ENTER') handleKey('ENTER');
        else if (/^[A-Z]$/.test(k)) handleKey(k);
    });

    updateGrid();
}
