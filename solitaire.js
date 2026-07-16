/**
 * solitaire.js - Neon Klondike Solitaire
 */

(function () {
    // --- DOM Elements ---
    const solitaireLobby = document.getElementById('solitaireLobby');
    const solitaireGameArea = document.getElementById('solitaireGameArea');
    const btnStartSolitaire = document.getElementById('btnStartSolitaire');
    const btnSolitaireRestart = document.getElementById('btnSolitaireRestart');
    const btnQuitSolitaire = document.getElementById('btnQuitSolitaire');

    const labelScore = document.getElementById('solitaireScore');
    const labelTimer = document.getElementById('solitaireTimer');
    const labelMoves = document.getElementById('solitaireMoves');

    const solitaireCanvas = document.getElementById('solitaireCanvas');
    const ctx = solitaireCanvas.getContext('2d');

    // --- GAME CONFIGS ---
    const CARD_WIDTH = 75;
    const CARD_HEIGHT = 108;
    const CARD_RADIUS = 6;
    const CARD_SPACING_X = 100; // Khoảng cách giữa các cột bài (800 / 8 = 100)
    
    // Tọa độ các thành phần bài trên Canvas
    const DECK_X = 25;
    const DECK_Y = 25;

    const WASTE_X = 125;
    const WASTE_Y = 25;

    const FOUNDATION_START_X = 350;
    const FOUNDATION_Y = 25;

    const TABLEAU_START_X = 25;
    const TABLEAU_START_Y = 160;
    const TABLEAU_VERTICAL_GAP = 18; // Khoảng cách xếp đè các lá bài ngửa dọc xuống

    const SUITS = {
        HEARTS: { char: '♥️', color: '#ff007f', isRed: true },
        DIAMONDS: { char: '♦️', color: '#ff3b30', isRed: true },
        CLUBS: { char: '♣️', color: '#39ff14', isRed: false },
        SPADES: { char: '♠️', color: '#00f0ff', isRed: false }
    };

    const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    // Trạng thái Solitaire
    const state = {
        deck: [],        // Khay bài rút (bài sấp) [{ suit, val, faceUp }]
        waste: [],       // Khay bài đã rút ngửa ra [{ suit, val, faceUp }]
        foundations: Array(4).fill().map(() => []), // 4 khay bài đích kết thúc
        tableaus: Array(7).fill().map(() => []),    // 7 cột xếp bài chính
        
        score: 0,
        moves: 0,
        secondsElapsed: 0,
        gameActive: false,
        timerInterval: null,
        animationId: null,

        // Kéo thả bài
        dragState: null // { source: 'tableau'|'waste', colIdx, cardIdx, startX, startY, currX, currY, cards: [] }
    };

    // --- GAME UTILITIES ---

    function createDeck() {
        const deck = [];
        for (const suitKey in SUITS) {
            for (let v = 0; v < VALUES.length; v++) {
                deck.push({
                    suit: SUITS[suitKey],
                    val: VALUES[v],
                    valIdx: v,
                    faceUp: false
                });
            }
        }
        return deck;
    }

    function shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    function dealGame() {
        const newDeck = createDeck();
        shuffleDeck(newDeck);

        // Khởi tạo các ngăn rỗng
        state.waste = [];
        state.foundations = Array(4).fill().map(() => []);
        state.tableaus = Array(7).fill().map(() => []);

        // Chia bài vào 7 cột Tableau
        // Cột i có i+1 lá bài, lá trên cùng ngửa
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j <= i; j++) {
                const card = newDeck.pop();
                if (j === i) {
                    card.faceUp = true;
                }
                state.tableaus[i].push(card);
            }
        }

        // Số bài còn lại để vào khay bài rút (Deck)
        state.deck = newDeck;

        state.score = 0;
        state.moves = 0;
        state.secondsElapsed = 0;
        
        labelScore.innerText = '0';
        labelMoves.innerText = '0';
        labelTimer.innerText = '00:00';

        state.gameActive = true;
        startTimer();
    }

    function startTimer() {
        clearInterval(state.timerInterval);
        state.timerInterval = setInterval(() => {
            if (!state.gameActive) return;
            state.secondsElapsed++;
            const mins = Math.floor(state.secondsElapsed / 60).toString().padStart(2, '0');
            const secs = (state.secondsElapsed % 60).toString().padStart(2, '0');
            labelTimer.innerText = `${mins}:${secs}`;
        }, 1000);
    }

    // --- GAME LOGIC RULES ---

    // Kiểm tra lá bài có xếp đè lên cột Tableau được không (giảm dần, xen kẽ màu)
    function canPushToTableau(targetCol, card) {
        const col = state.tableaus[targetCol];
        if (col.length === 0) {
            // Cột trống chỉ được xếp Già (K) lên
            return card.val === 'K';
        }
        const topCard = col[col.length - 1];
        if (!topCard.faceUp) return false;
        
        // Phải khác màu (Đỏ đè Đen hoặc Đen đè Đỏ) và kém 1 bậc giá trị
        const colorsMatch = topCard.suit.isRed === card.suit.isRed;
        const valDiff = topCard.valIdx - card.valIdx;

        return !colorsMatch && valDiff === 1;
    }

    // Kiểm tra lá bài có xếp lên khay đích Foundation được không (tăng dần cùng chất từ A -> K)
    function canPushToFoundation(foundIdx, card) {
        const found = state.foundations[foundIdx];
        if (found.length === 0) {
            // Khay đích rỗng chỉ nhận Át (A)
            return card.val === 'A';
        }
        const topCard = found[found.length - 1];
        
        // Phải cùng chất và lớn hơn 1 bậc giá trị
        const sameSuit = topCard.suit.char === card.suit.char;
        const valDiff = card.valIdx - topCard.valIdx;

        return sameSuit && valDiff === 1;
    }

    // Rút bài từ khay Deck sang khay Waste
    function drawCardFromDeck() {
        if (state.deck.length === 0) {
            // Nếu hết bài rút: Lật ngược toàn bộ bài khay Waste về khay Deck
            if (state.waste.length === 0) return; // Không có bài nào
            state.deck = [...state.waste].reverse().map(c => {
                c.faceUp = false;
                return c;
            });
            state.waste = [];
            state.moves++;
            labelMoves.innerText = state.moves;
        } else {
            // Rút 1 lá bài và ngửa lên khay Waste
            const card = state.deck.pop();
            card.faceUp = true;
            state.waste.push(card);
            state.moves++;
            labelMoves.innerText = state.moves;
        }
        draw();
    }

    // Tự động lật ngửa lá bài trên cùng của Tableau nếu nó đang úp
    function autoRevealTableauTops() {
        let revealed = false;
        for (let i = 0; i < 7; i++) {
            const col = state.tableaus[i];
            if (col.length > 0) {
                const topCard = col[col.length - 1];
                if (!topCard.faceUp) {
                    topCard.faceUp = true;
                    state.score += 5; // Cộng 5 điểm khi lật bài mới
                    revealed = true;
                }
            }
        }
        if (revealed) {
            labelScore.innerText = state.score;
        }
    }

    // Kiểm tra chiến thắng (tất cả 4 cột Foundation đều gom đủ 13 lá bài)
    function checkWin() {
        for (let i = 0; i < 4; i++) {
            if (state.foundations[i].length !== 13) return false;
        }
        return true;
    }

    function handleWin() {
        state.gameActive = false;
        clearInterval(state.timerInterval);
        triggerWinAnimation();
    }

    // --- DRAWING CARDS GRAPHICS ---

    function drawCardShape(x, y, radius, color, isOutline = false) {
        ctx.beginPath();
        ctx.roundRect(x, y, CARD_WIDTH, CARD_HEIGHT, radius);
        if (isOutline) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        } else {
            ctx.fillStyle = color;
            ctx.fill();
        }
    }

    function drawCard(x, y, card) {
        if (!card.faceUp) {
            // Thẻ bài đang úp: Hoa văn Neon Cyberpunk phát sáng màu hồng tím
            drawCardShape(x, y, CARD_RADIUS, '#161722');
            drawCardShape(x, y, CARD_RADIUS, '#ff007f', true);
            
            // Vẽ hoa văn phát sáng ở giữa
            ctx.strokeStyle = 'rgba(255, 0, 127, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 10, y + 10, CARD_WIDTH - 20, CARD_HEIGHT - 20);
            
            ctx.fillStyle = 'rgba(255, 0, 127, 0.2)';
            ctx.beginPath();
            ctx.arc(x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2, 8, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Thẻ bài đang ngửa: Nền tối Glassmorphism phát sáng, viền theo màu của chất bài
            const suitColor = card.suit.color;
            drawCardShape(x, y, CARD_RADIUS, 'rgba(7, 8, 12, 0.95)');
            drawCardShape(x, y, CARD_RADIUS, suitColor, true);

            // In chữ số góc trái trên
            ctx.fillStyle = suitColor;
            ctx.font = '700 16px Outfit, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(card.val, x + 8, y + 8);

            // In ký hiệu chất ở góc phải trên
            ctx.font = '16px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(card.suit.char, x + CARD_WIDTH - 8, y + 8);

            // In biểu tượng lớn ở trung tâm
            ctx.font = '28px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(card.suit.char, x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2 + 5);
        }
    }

    function draw() {
        ctx.fillStyle = '#0d0e15';
        ctx.fillRect(0, 0, solitaireCanvas.width, solitaireCanvas.height);

        // 1. Vẽ khay bài rút (Deck)
        if (state.deck.length > 0) {
            drawCard(DECK_X, DECK_Y, { faceUp: false });
            // Vẽ bóng bài chồng đè nhẹ
            ctx.strokeStyle = '#ff007f';
            ctx.lineWidth = 1;
            ctx.strokeRect(DECK_X - 2, DECK_Y - 2, CARD_WIDTH, CARD_HEIGHT);
        } else {
            // Khay rỗng: biểu tượng reset xoay vòng phát sáng
            drawCardShape(DECK_X, DECK_Y, CARD_RADIUS, 'rgba(255, 0, 127, 0.15)');
            drawCardShape(DECK_X, DECK_Y, CARD_RADIUS, 'rgba(255, 0, 127, 0.3)', true);
            ctx.fillStyle = 'rgba(255, 0, 127, 0.5)';
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔄', DECK_X + CARD_WIDTH / 2, DECK_Y + CARD_HEIGHT / 2);
        }

        // 2. Vẽ khay bài Waste (Ngửa)
        if (state.waste.length > 0) {
            drawCard(WASTE_X, WASTE_Y, state.waste[state.waste.length - 1]);
        } else {
            drawCardShape(WASTE_X, WASTE_Y, CARD_RADIUS, 'rgba(255, 255, 255, 0.05)', true);
        }

        // 3. Vẽ 4 khay đích Foundation
        for (let i = 0; i < 4; i++) {
            const fX = FOUNDATION_START_X + i * CARD_SPACING_X;
            const f = state.foundations[i];
            if (f.length > 0) {
                drawCard(fX, FOUNDATION_Y, f[f.length - 1]);
            } else {
                // Vẽ ô rỗng phát sáng nhẹ
                drawCardShape(fX, FOUNDATION_Y, CARD_RADIUS, 'rgba(255, 255, 255, 0.03)');
                drawCardShape(fX, FOUNDATION_Y, CARD_RADIUS, 'rgba(255, 255, 255, 0.15)', true);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.font = '22px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('📥', fX + CARD_WIDTH / 2, FOUNDATION_Y + CARD_HEIGHT / 2);
            }
        }

        // 4. Vẽ 7 cột bài Tableau chính
        for (let colIdx = 0; colIdx < 7; colIdx++) {
            const colX = TABLEAU_START_X + colIdx * CARD_SPACING_X;
            const col = state.tableaus[colIdx];
            
            if (col.length === 0) {
                // Cột trống: vẽ viền mờ
                drawCardShape(colX, TABLEAU_START_Y, CARD_RADIUS, 'rgba(255, 255, 255, 0.05)', true);
            } else {
                for (let cardIdx = 0; cardIdx < col.length; cardIdx++) {
                    // Nếu cột này đang bị kéo bài đi, bỏ qua không vẽ phần bị kéo từ cardIdx trở đi
                    if (state.dragState && state.dragState.source === 'tableau' && 
                        state.dragState.colIdx === colIdx && cardIdx >= state.dragState.cardIdx) {
                        continue;
                    }
                    const cardY = TABLEAU_START_Y + cardIdx * TABLEAU_VERTICAL_GAP;
                    drawCard(colX, cardY, col[cardIdx]);
                }
            }
        }

        // 5. Vẽ lá bài hoặc nhóm bài đang bị Kéo thả (Drag)
        if (state.dragState) {
            const ds = state.dragState;
            const dragOffsetX = ds.currX - ds.startX;
            const dragOffsetY = ds.currY - ds.startY;

            for (let i = 0; i < ds.cards.length; i++) {
                const origCardY = (ds.source === 'tableau') 
                    ? TABLEAU_START_Y + (ds.cardIdx + i) * TABLEAU_VERTICAL_GAP
                    : WASTE_Y;
                const dragX = ds.cardStartX + dragOffsetX;
                const dragY = origCardY + dragOffsetY;

                ctx.shadowBlur = 10;
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                drawCard(dragX, dragY, ds.cards[i]);
                ctx.shadowBlur = 0;
            }
        }
    }

    // --- INTERACTION PRESS & DRAG EVENTS ---

    function getCardAtPosition(mx, my) {
        // 1. Nhấp khay bài rút (Deck)
        if (mx >= DECK_X && mx <= DECK_X + CARD_WIDTH && my >= DECK_Y && my <= DECK_Y + CARD_HEIGHT) {
            return { pile: 'deck' };
        }

        // 2. Nhấp khay bài ngửa (Waste)
        if (state.waste.length > 0 && mx >= WASTE_X && mx <= WASTE_X + CARD_WIDTH && my >= WASTE_Y && my <= WASTE_Y + CARD_HEIGHT) {
            return { pile: 'waste', card: state.waste[state.waste.length - 1] };
        }

        // 3. Nhấp 4 cột đích (Foundation)
        for (let i = 0; i < 4; i++) {
            const fX = FOUNDATION_START_X + i * CARD_SPACING_X;
            if (mx >= fX && mx <= fX + CARD_WIDTH && my >= FOUNDATION_Y && my <= FOUNDATION_Y + CARD_HEIGHT) {
                return { pile: 'foundation', colIdx: i };
            }
        }

        // 4. Nhấp 7 cột xếp bài chính (Tableau)
        // Duyệt từ cột cuối trở lại để tìm lá click trúng
        for (let colIdx = 0; colIdx < 7; colIdx++) {
            const colX = TABLEAU_START_X + colIdx * CARD_SPACING_X;
            const col = state.tableaus[colIdx];
            if (col.length === 0) {
                // Click vào cột trống
                if (mx >= colX && mx <= colX + CARD_WIDTH && my >= TABLEAU_START_Y && my <= TABLEAU_START_Y + CARD_HEIGHT) {
                    return { pile: 'tableau', colIdx, cardIdx: -1 };
                }
            } else {
                // Click từ lá bài dưới cùng ngửa lên trên
                for (let cardIdx = col.length - 1; cardIdx >= 0; cardIdx--) {
                    const cardY = TABLEAU_START_Y + cardIdx * TABLEAU_VERTICAL_GAP;
                    
                    // Lá bài trên cùng có vùng click trọn vẹn CARD_HEIGHT, các lá dưới bị đè chỉ click được khoảng hở TABLEAU_VERTICAL_GAP
                    const isTopCard = (cardIdx === col.length - 1);
                    const heightBound = isTopCard ? CARD_HEIGHT : TABLEAU_VERTICAL_GAP;

                    if (mx >= colX && mx <= colX + CARD_WIDTH && my >= cardY && my <= cardY + heightBound) {
                        return { pile: 'tableau', colIdx, cardIdx, card: col[cardIdx] };
                    }
                }
            }
        }

        return null;
    }

    solitaireCanvas.addEventListener('mousedown', function (e) {
        if (!state.gameActive) return;

        const rect = solitaireCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const clicked = getCardAtPosition(mx, my);
        if (!clicked) return;

        if (clicked.pile === 'deck') {
            drawCardFromDeck();
        } else if (clicked.pile === 'waste' && clicked.card) {
            // Kéo lá bài ngửa ra khay Waste (tính toán offset từ điểm chuột nhấp thật tới góc bài để tránh giật hình)
            state.dragState = {
                source: 'waste',
                cards: [clicked.card],
                startX: mx,
                startY: my,
                currX: mx,
                currY: my,
                cardStartX: WASTE_X - (mx - WASTE_X)
            };
        } else if (clicked.pile === 'tableau' && clicked.cardIdx !== -1) {
            const card = clicked.card;
            if (card && card.faceUp) {
                // Kéo nhóm bài ngửa từ Tableau cột colIdx từ vị trí cardIdx đổ xuống
                const cardsToDrag = state.tableaus[clicked.colIdx].slice(clicked.cardIdx);
                const colX = TABLEAU_START_X + clicked.colIdx * CARD_SPACING_X;

                state.dragState = {
                    source: 'tableau',
                    colIdx: clicked.colIdx,
                    cardIdx: clicked.cardIdx,
                    cards: cardsToDrag,
                    startX: mx,
                    startY: my,
                    currX: mx,
                    currY: my,
                    cardStartX: colX - (mx - colX)
                };
            }
        }
    });

    solitaireCanvas.addEventListener('mousemove', function (e) {
        if (!state.dragState) return;

        const rect = solitaireCanvas.getBoundingClientRect();
        state.dragState.currX = e.clientX - rect.left;
        state.dragState.currY = e.clientY - rect.top;
        draw();
    });

    solitaireCanvas.addEventListener('mouseup', function (e) {
        if (!state.dragState) return;

        const ds = state.dragState;
        const rect = solitaireCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Tìm vùng thả bài (Drop area)
        let dropped = false;

        // 1. Thả lên 7 cột Tableau chính
        for (let colIdx = 0; colIdx < 7; colIdx++) {
            const colX = TABLEAU_START_X + colIdx * CARD_SPACING_X;
            const col = state.tableaus[colIdx];
            
            // Vùng nhận diện thả bài
            const targetY = col.length === 0 ? TABLEAU_START_Y : TABLEAU_START_Y + (col.length - 1) * TABLEAU_VERTICAL_GAP;
            
            if (mx >= colX - 10 && mx <= colX + CARD_WIDTH + 10 && my >= targetY - 20 && my <= targetY + CARD_HEIGHT + 30) {
                const bottomCard = ds.cards[0];
                
                if (canPushToTableau(colIdx, bottomCard)) {
                    // Chuyển bài hợp lệ sang Tableau cột mới
                    if (ds.source === 'tableau') {
                        state.tableaus[ds.colIdx].splice(ds.cardIdx); // Xóa khỏi cột cũ
                    } else if (ds.source === 'waste') {
                        state.waste.pop(); // Xóa khỏi khay bài rút
                    }

                    // Đổ nhóm bài vào cột mới
                    state.tableaus[colIdx].push(...ds.cards);
                    state.moves++;
                    labelMoves.innerText = state.moves;
                    dropped = true;
                    break;
                }
            }
        }

        // 2. Thả lên 4 khay bài đích Foundation (chỉ thả được duy nhất 1 lá đầu tiên)
        if (!dropped && ds.cards.length === 1) {
            const card = ds.cards[0];
            for (let fIdx = 0; fIdx < 4; fIdx++) {
                const fX = FOUNDATION_START_X + fIdx * CARD_SPACING_X;
                if (mx >= fX - 10 && mx <= fX + CARD_WIDTH + 10 && my >= FOUNDATION_Y - 10 && my <= FOUNDATION_Y + CARD_HEIGHT + 10) {
                    if (canPushToFoundation(fIdx, card)) {
                        // Chuyển bài hợp lệ sang cột đích
                        if (ds.source === 'tableau') {
                            state.tableaus[ds.colIdx].pop();
                        } else if (ds.source === 'waste') {
                            state.waste.pop();
                        }

                        state.foundations[fIdx].push(card);
                        state.score += 10; // Tăng 10 điểm khi gom bài lên đích
                        labelScore.innerText = state.score;
                        state.moves++;
                        labelMoves.innerText = state.moves;
                        dropped = true;
                        break;
                    }
                }
            }
        }

        // Dọn dẹp trạng thái Drag, vẽ lại, lật bài Tableau mới tự động
        state.dragState = null;
        autoRevealTableauTops();
        draw();

        // Kiểm tra thắng cuộc
        if (checkWin()) {
            handleWin();
        }
    });

    // Hỗ trợ nhấp đúp chuột (Double click) để tự gom nhanh bài lên khay đích (Foundation)
    solitaireCanvas.addEventListener('dblclick', function (e) {
        if (!state.gameActive) return;

        const rect = solitaireCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const clicked = getCardAtPosition(mx, my);
        if (!clicked) return;

        let card = null;
        let sourceCol = -1;

        if (clicked.pile === 'waste' && state.waste.length > 0) {
            card = state.waste[state.waste.length - 1];
        } else if (clicked.pile === 'tableau' && clicked.cardIdx !== -1) {
            const col = state.tableaus[clicked.colIdx];
            if (clicked.cardIdx === col.length - 1) {
                // Chỉ nhấp đúp lá bài trên cùng của Tableau
                card = col[col.length - 1];
                sourceCol = clicked.colIdx;
            }
        }

        if (card && card.faceUp) {
            // Tìm kiếm khay đích phù hợp
            for (let fIdx = 0; fIdx < 4; fIdx++) {
                if (canPushToFoundation(fIdx, card)) {
                    // Di chuyển hợp lệ lên khay đích
                    if (sourceCol !== -1) {
                        state.tableaus[sourceCol].pop();
                    } else {
                        state.waste.pop();
                    }

                    state.foundations[fIdx].push(card);
                    state.score += 10;
                    labelScore.innerText = state.score;
                    state.moves++;
                    labelMoves.innerText = state.moves;

                    autoRevealTableauTops();
                    draw();

                    if (checkWin()) {
                        handleWin();
                    }
                    break;
                }
            }
        }
    });

    // --- WIN ANIMATION (Hiệu ứng bài nảy nhảy Card Bouncing lấp lánh cực đẹp) ---

    function triggerWinAnimation() {
        alert('CỰC KỲ XUẤT SẮC! BẠN ĐÃ HOÀN THÀNH XẾP BÀI SOLITAIRE!');
        
        // Khởi tạo các lá bài nảy nhảy (4 chất bài cùng chất phi từ khay đích ra)
        const bouncingCards = [];
        for (let i = 0; i < 4; i++) {
            const f = state.foundations[i];
            bouncingCards.push({
                cardsList: [...f],
                fIdx: i
            });
        }

        let currentBouncer = null;
        let currentCardIdx = 12; // Lá Già (K) đầu tiên đi ngược về Át (A)
        let activeBouncers = []; // { x, y, vx, vy, card }

        function runBouncingLoop() {
            // Tạo mới một quả bóng nảy bài nếu khay bouncer hiện tại hoạt động xong
            if (activeBouncers.length === 0) {
                if (currentCardIdx >= 0) {
                    // Đẩy cả 4 lá bài cùng bậc ở 4 khay đích bay ra cùng lúc
                    for (let i = 0; i < 4; i++) {
                        const card = bouncingCards[i].cardsList[currentCardIdx];
                        const startX = FOUNDATION_START_X + i * CARD_SPACING_X;
                        activeBouncers.push({
                            x: startX,
                            y: FOUNDATION_Y,
                            vx: (Math.random() - 0.5) * 6,
                            vy: -Math.random() * 4 - 3,
                            card: card
                        });
                    }
                    currentCardIdx--;
                } else {
                    // Hoàn thành toàn bộ hoạt ảnh
                    alert('Bạn đã chiến thắng xuất sắc!');
                    solitaireLobby.classList.remove('hidden');
                    solitaireGameArea.classList.add('hidden');
                    return;
                }
            }

            // Xóa mờ nhẹ bảng để tạo hiệu ứng bóng bài (motion blur)
            ctx.fillStyle = 'rgba(13, 14, 21, 0.15)';
            ctx.fillRect(0, 0, solitaireCanvas.width, solitaireCanvas.height);

            // Di chuyển và vẽ các quân bài nảy
            for (let i = activeBouncers.length - 1; i >= 0; i--) {
                const b = activeBouncers[i];
                b.vy += 0.35; // Trọng lực hút bài xuống
                b.x += b.vx;
                b.y += b.vy;

                // Nảy ngược lên khi chạm đáy Canvas
                if (b.y + CARD_HEIGHT >= solitaireCanvas.height) {
                    b.y = solitaireCanvas.height - CARD_HEIGHT;
                    b.vy = -b.vy * 0.85; // Mất lực nảy 15%
                }

                // Vẽ
                drawCard(b.x, b.y, b.card);

                // Loại bỏ nếu bài bay lệch hẳn ra ngoài biên ngang màn hình
                if (b.x + CARD_WIDTH < 0 || b.x > solitaireCanvas.width) {
                    activeBouncers.splice(i, 1);
                }
            }

            state.animationId = requestAnimationFrame(runBouncingLoop);
        }

        runBouncingLoop();
    }

    // --- BUTTON BINDINGS ---

    btnStartSolitaire.addEventListener('click', function () {
        solitaireLobby.classList.add('hidden');
        solitaireGameArea.classList.remove('hidden');

        dealGame();
        draw();
    });

    btnSolitaireRestart.addEventListener('click', function () {
        dealGame();
        draw();
    });

    btnQuitSolitaire.addEventListener('click', function () {
        state.gameActive = false;
        clearInterval(state.timerInterval);
        cancelAnimationFrame(state.animationId);

        solitaireLobby.classList.remove('hidden');
        solitaireGameArea.classList.add('hidden');
    });
})();
