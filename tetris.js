/**
 * tetris.js - Neon Tetris (Xếp Hình Cổ Điển & Đối Kháng Cyberpunk)
 */

(function () {
    // --- DOM Elements ---
    const tetrisLobby = document.getElementById('tetrisLobby');
    const tetrisGameArea = document.getElementById('tetrisGameArea');
    
    const btnStartTetrisSolo = document.getElementById('btnStartTetrisSolo');
    const btnTetrisCreateRoom = document.getElementById('btnTetrisCreateRoom');
    const btnTetrisJoinRoom = document.getElementById('btnTetrisJoinRoom');
    const tetrisNicknameInput = document.getElementById('tetrisNicknameInput');
    const tetrisRoomCodeInput = document.getElementById('tetrisRoomCodeInput');
    const tetrisLobbyMessage = document.getElementById('tetrisLobbyMessage');

    const tetrisRoomHeader = document.getElementById('tetrisRoomHeader');
    const tetrisDisplayRoomCode = document.getElementById('tetrisDisplayRoomCode');
    const labelScore = document.getElementById('tetrisScore');
    const labelLevel = document.getElementById('tetrisLevel');
    const labelLines = document.getElementById('tetrisLines');
    
    const tetrisCanvas = document.getElementById('tetrisCanvas');
    const ctx = tetrisCanvas.getContext('2d');
    
    const tetrisNextCanvas = document.getElementById('tetrisNextCanvas');
    const nextCtx = tetrisNextCanvas.getContext('2d');

    // UI Đối thủ & Chat
    const tetrisOpponentColumn = document.getElementById('tetrisOpponentColumn');
    const tetrisOpponentName = document.getElementById('tetrisOpponentName');
    const tetrisOpponentCanvas = document.getElementById('tetrisOpponentCanvas');
    const opponentCtx = tetrisOpponentCanvas.getContext('2d');

    const tetrisChatColumn = document.getElementById('tetrisChatColumn');
    const tetrisChatHistory = document.getElementById('tetrisChatHistory');
    const tetrisChatInput = document.getElementById('tetrisChatInput');
    const btnTetrisSendChat = document.getElementById('btnTetrisSendChat');

    const tetrisStatusText = document.getElementById('tetrisStatusText');
    const btnResetTetris = document.getElementById('btnResetTetris');
    const btnQuitTetris = document.getElementById('btnQuitTetris');

    // --- GAME CONFIGS ---
    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 24; 

    const COLORS = [
        null,
        '#00f0ff', // I (Cyan)
        '#ffd700', // O (Gold Yellow)
        '#b026ff', // T (Purple)
        '#39ff14', // S (Green)
        '#ff3b30', // Z (Red)
        '#0055ff', // J (Blue)
        '#ff7300'  // L (Orange)
    ];

    const SHAPES = [
        [],
        [[1, 1, 1, 1]], // I
        [[2, 2], [2, 2]], // O
        [[0, 3, 0], [3, 3, 3]], // T
        [[0, 4, 4], [4, 4, 0]], // S
        [[5, 5, 0], [0, 5, 5]], // Z
        [[6, 0, 0], [6, 6, 6]], // J
        [[0, 0, 7], [7, 7, 7]]  // L
    ];

    const state = {
        mode: 'SOLO', // SOLO | BATTLE
        status: 'LOBBY', // LOBBY | PLAYING | WAITING | ENDED
        nickname: '',
        roomCode: '',
        opponentName: 'Đối thủ',
        myColor: 'w', // Host 'w', Guest 'b'
        
        grid: Array(ROWS).fill().map(() => Array(COLS).fill(0)),
        opponentGrid: Array(ROWS).fill().map(() => Array(COLS).fill(0)),
        
        score: 0,
        level: 1,
        lines: 0,
        currentPiece: null, 
        nextPiece: null,
        gameOver: false,
        dropCounter: 0,
        dropInterval: 1000, 
        lastTime: 0,
        animationId: null,

        // Supabase channels
        gameChannel: null,
        chatChannel: null
    };

    // --- UTILITIES ---
    function genRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
        return code;
    }

    function showLobbyMsg(msg, isError) {
        tetrisLobbyMessage.innerText = msg;
        tetrisLobbyMessage.style.color = isError ? '#ff3b30' : '#00f0ff';
    }

    function addChatMsg(text, type) {
        const div = document.createElement('div');
        div.classList.add('chat-msg', type);
        div.textContent = text;
        tetrisChatHistory.appendChild(div);
        tetrisChatHistory.scrollTop = tetrisChatHistory.scrollHeight;
    }

    // --- GAME ENGINE ---

    function createPiece(type) {
        return {
            shape: SHAPES[type],
            colorId: type,
            x: Math.floor((COLS - SHAPES[type][0].length) / 2),
            y: 0
        };
    }

    function resetGame(fullReset = true) {
        state.grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));
        state.opponentGrid = Array(ROWS).fill().map(() => Array(COLS).fill(0));
        state.score = 0;
        state.level = 1;
        state.lines = 0;
        state.gameOver = false;
        state.dropInterval = 1000;
        state.dropCounter = 0;

        labelScore.innerText = '0';
        labelLevel.innerText = '1';
        labelLines.innerText = '0';
        tetrisStatusText.innerText = '';
        btnResetTetris.classList.add('hidden');

        state.nextPiece = createPiece(Math.floor(Math.random() * 7) + 1);
        spawnPiece();

        if (state.mode === 'BATTLE') {
            syncMyGridToOpponent();
        }
    }

    function spawnPiece() {
        state.currentPiece = state.nextPiece;
        state.nextPiece = createPiece(Math.floor(Math.random() * 7) + 1);

        if (checkCollision(state.currentPiece)) {
            handleGameOver();
        }

        drawNextPiece();
    }

    function handleGameOver() {
        state.gameOver = true;
        cancelAnimationFrame(state.animationId);

        if (state.mode === 'SOLO') {
            alert('GAME OVER! Điểm của bạn: ' + state.score);
            tetrisLobby.classList.remove('hidden');
            tetrisGameArea.classList.add('hidden');
        } else {
            // Chế độ đối kháng: Mình bị thua -> gửi thông báo cho đối thủ
            tetrisStatusText.innerText = 'BẠN ĐÃ THUA CUỘC!';
            tetrisStatusText.style.color = '#ff3b30';
            btnResetTetris.classList.remove('hidden');

            if (state.gameChannel) {
                state.gameChannel.send({
                    type: 'broadcast',
                    event: 'game_over',
                    payload: { loser: state.nickname }
                });
            }
        }
    }

    function checkCollision(piece, offsetX = 0, offsetY = 0, customShape = piece.shape) {
        for (let r = 0; r < customShape.length; r++) {
            for (let c = 0; c < customShape[r].length; c++) {
                if (customShape[r][c] !== 0) {
                    const targetX = piece.x + c + offsetX;
                    const targetY = piece.y + r + offsetY;

                    if (targetX < 0 || targetX >= COLS || targetY >= ROWS) {
                        return true;
                    }

                    if (targetY >= 0 && state.grid[targetY][targetX] !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function mergePiece() {
        const p = state.currentPiece;
        for (let r = 0; r < p.shape.length; r++) {
            for (let c = 0; c < p.shape[r].length; c++) {
                if (p.shape[r][c] !== 0) {
                    if (p.y + r >= 0) {
                        state.grid[p.y + r][p.x + c] = p.colorId;
                    }
                }
            }
        }
        if (state.mode === 'BATTLE') {
            syncMyGridToOpponent();
        }
    }

    // Tấn công: Nhận hàng rác từ đối thủ
    function receiveGarbageLines(count) {
        if (state.gameOver) return;

        // Đẩy toàn bộ các hàng hiện tại lên trên
        for (let i = 0; i < count; i++) {
            state.grid.shift(); // Xóa hàng trên cùng
            
            // Thêm hàng rác ở dưới đáy (chứa 1 ô trống ngẫu nhiên)
            const holeCol = Math.floor(Math.random() * COLS);
            const garbageRow = Array(COLS).fill(8); // Màu rác phát sáng cam
            garbageRow[holeCol] = 0; // Ô trống để xếp gạch chui qua
            state.grid.push(garbageRow);
        }

        // Kiểm tra nếu khối cờ đang rơi bị va chạm sau khi đẩy cờ lên
        if (state.currentPiece && checkCollision(state.currentPiece)) {
            // Đẩy khối cờ lên để tránh kẹt cờ nếu có thể
            while (state.currentPiece.y > 0 && checkCollision(state.currentPiece)) {
                state.currentPiece.y--;
            }
            if (checkCollision(state.currentPiece)) {
                handleGameOver();
            }
        }

        draw();
        if (state.mode === 'BATTLE') {
            syncMyGridToOpponent();
        }
    }

    // Tấn công: Gửi hàng rác sang đối thủ khi xóa hàng
    function sendGarbageAttack(linesCleared) {
        let attackCount = 0;
        if (linesCleared === 2) attackCount = 1;
        else if (linesCleared === 3) attackCount = 2;
        else if (linesCleared >= 4) attackCount = 4; // Tetris Attack!

        if (attackCount > 0 && state.gameChannel) {
            state.gameChannel.send({
                type: 'broadcast',
                event: 'garbage',
                payload: { count: attackCount }
            });
            tetrisStatusText.innerText = `TẤN CÔNG ĐỐI THỦ +${attackCount} HÀNG!`;
            tetrisStatusText.style.color = '#39ff14';
            setTimeout(() => {
                if (state.status === 'PLAYING' && !state.gameOver) {
                    tetrisStatusText.innerText = '';
                }
            }, 2000);
        }
    }

    function clearLines() {
        let linesCleared = 0;
        
        outer: for (let r = ROWS - 1; r >= 0; r--) {
            for (let c = 0; c < COLS; c++) {
                if (state.grid[r][c] === 0) {
                    continue outer;
                }
            }

            state.grid.splice(r, 1);
            state.grid.unshift(Array(COLS).fill(0));
            linesCleared++;
            r++; 
        }

        if (linesCleared > 0) {
            state.lines += linesCleared;
            const linePoints = [0, 100, 300, 500, 800];
            state.score += (linePoints[linesCleared] || 800) * state.level;

            state.level = Math.floor(state.lines / 10) + 1;
            state.dropInterval = Math.max(100, 1000 - (state.level - 1) * 120);

            labelScore.innerText = state.score;
            labelLevel.innerText = state.level;
            labelLines.innerText = state.lines;

            // Xử lý gửi dòng rác trong đối kháng
            if (state.mode === 'BATTLE') {
                sendGarbageAttack(linesCleared);
            }
        }
    }

    function dropPiece() {
        state.currentPiece.y++;
        if (checkCollision(state.currentPiece)) {
            state.currentPiece.y--;
            mergePiece();
            clearLines();
            spawnPiece();
        }
        state.dropCounter = 0;
    }

    function movePiece(dir) {
        state.currentPiece.x += dir;
        if (checkCollision(state.currentPiece)) {
            state.currentPiece.x -= dir;
        }
        if (state.mode === 'BATTLE') {
            syncMyGridToOpponent();
        }
    }

    function rotatePiece() {
        const shape = state.currentPiece.shape;
        const n = shape.length;
        const m = shape[0].length;
        
        const rotated = Array(m).fill().map(() => Array(n).fill(0));
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < m; c++) {
                rotated[c][n - 1 - r] = shape[r][c];
            }
        }

        const originalX = state.currentPiece.x;
        let success = false;
        
        const kicks = [0, -1, 1, -2, 2];
        for (const dx of kicks) {
            state.currentPiece.x += dx;
            if (!checkCollision(state.currentPiece, 0, 0, rotated)) {
                state.currentPiece.shape = rotated;
                success = true;
                break;
            }
            state.currentPiece.x = originalX;
        }
        if (success && state.mode === 'BATTLE') {
            syncMyGridToOpponent();
        }
    }

    function hardDropPiece() {
        while (!checkCollision(state.currentPiece, 0, 1)) {
            state.currentPiece.y++;
        }
        mergePiece();
        clearLines();
        spawnPiece();
    }

    // --- DRAWING GRAPHICS ---

    function drawGridBlock(context, x, y, colorId, size) {
        const color = COLORS[colorId] || '#7f8c8d'; // Màu mặc định cho hàng rác (màu xám nhạt)
        context.fillStyle = color;
        context.shadowBlur = 8;
        context.shadowColor = color;
        
        context.fillRect(x * size + 1.5, y * size + 1.5, size - 3, size - 3);
        context.strokeStyle = '#ffffffaa';
        context.lineWidth = 1;
        context.strokeRect(x * size + 3, y * size + 3, size - 6, size - 6);
        
        context.shadowBlur = 0; 
    }

    function draw() {
        // Xóa bảng chính của mình
        ctx.fillStyle = '#07080c';
        ctx.fillRect(0, 0, tetrisCanvas.width, tetrisCanvas.height);

        // Vẽ lưới mình
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const block = state.grid[r][c];
                if (block !== 0) {
                    drawGridBlock(ctx, c, r, block, BLOCK_SIZE);
                }
            }
        }

        // Vẽ khối đang rơi của mình
        const p = state.currentPiece;
        if (p) {
            for (let r = 0; r < p.shape.length; r++) {
                for (let c = 0; c < p.shape[r].length; c++) {
                    if (p.shape[r][c] !== 0) {
                        drawGridBlock(ctx, p.x + c, p.y + r, p.colorId, BLOCK_SIZE);
                    }
                }
            }
        }

        // Vẽ lưới của đối thủ (nếu chơi đối kháng)
        if (state.mode === 'BATTLE') {
            opponentCtx.fillStyle = '#07080c';
            opponentCtx.fillRect(0, 0, tetrisOpponentCanvas.width, tetrisOpponentCanvas.height);

            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const block = state.opponentGrid[r][c];
                    if (block !== 0) {
                        drawGridBlock(opponentCtx, c, r, block, BLOCK_SIZE);
                    }
                }
            }
        }
    }

    function drawNextPiece() {
        nextCtx.fillStyle = '#000000';
        nextCtx.fillRect(0, 0, tetrisNextCanvas.width, tetrisNextCanvas.height);

        const p = state.nextPiece;
        if (!p) return;

        const nextBlockSize = 16;
        const shapeW = p.shape[0].length * nextBlockSize;
        const shapeH = p.shape.length * nextBlockSize;

        const startX = (80 - shapeW) / 2;
        const startY = (80 - shapeH) / 2;

        nextCtx.shadowBlur = 8;
        nextCtx.shadowColor = COLORS[p.colorId];
        nextCtx.fillStyle = COLORS[p.colorId];

        for (let r = 0; r < p.shape.length; r++) {
            for (let c = 0; c < p.shape[r].length; c++) {
                if (p.shape[r][c] !== 0) {
                    nextCtx.fillRect(startX + c * nextBlockSize + 1, startY + r * nextBlockSize + 1, nextBlockSize - 2, nextBlockSize - 2);
                }
            }
        }
        nextCtx.shadowBlur = 0; 
    }

    // --- GAME LOOP ---
    function gameLoop(time = 0) {
        if (state.gameOver || state.status !== 'PLAYING') return;

        const deltaTime = time - state.lastTime;
        state.lastTime = time;

        state.dropCounter += deltaTime;
        if (state.dropCounter > state.dropInterval) {
            dropPiece();
        }

        draw();
        state.animationId = requestAnimationFrame(gameLoop);
    }

    // --- SUPABASE CONNECTIVITY ---

    // Gửi ma trận cờ hiện tại của mình cho đối thủ vẽ
    function syncMyGridToOpponent() {
        if (state.gameChannel) {
            // Đóng gói luôn cả khối cờ đang rơi vào ma trận đồng bộ ảo để đối thủ nhìn thấy chuyển động mượt hơn
            const gridToSend = JSON.parse(JSON.stringify(state.grid));
            const p = state.currentPiece;
            if (p) {
                for (let r = 0; r < p.shape.length; r++) {
                    for (let c = 0; c < p.shape[r].length; c++) {
                        if (p.shape[r][c] !== 0) {
                            if (p.y + r >= 0 && p.y + r < ROWS && p.x + c >= 0 && p.x + c < COLS) {
                                gridToSend[p.y + r][p.x + c] = p.colorId;
                            }
                        }
                    }
                }
            }

            state.gameChannel.send({
                type: 'broadcast',
                event: 'grid_sync',
                payload: { grid: gridToSend }
            });
        }
    }

    function initSupabaseRoom() {
        const client = window.supabaseClient;
        if (!client) {
            console.error('Supabase client is not initialized!');
            return;
        }

        // Kênh game đồng bộ
        state.gameChannel = client.channel(`tetris-${state.roomCode}`);
        state.gameChannel
            .on('broadcast', { event: 'join' }, payload => {
                if (state.myColor === 'w') {
                    state.opponentName = payload.payload.nickname;
                    tetrisOpponentName.innerText = state.opponentName;
                    addChatMsg(`[HỆ THỐNG] Đối thủ ${state.opponentName} đã vào phòng!`, 'system');
                    
                    state.gameChannel.send({
                        type: 'broadcast',
                        event: 'welcome',
                        payload: { nickname: state.nickname }
                    });

                    state.status = 'PLAYING';
                    resetGame();
                    state.lastTime = performance.now();
                    gameLoop();
                }
            })
            .on('broadcast', { event: 'welcome' }, payload => {
                if (state.myColor === 'b') {
                    state.opponentName = payload.payload.nickname;
                    tetrisOpponentName.innerText = state.opponentName;
                    addChatMsg(`[HỆ THỐNG] Kết nối tới Host: ${state.opponentName}`, 'system');
                    
                    state.status = 'PLAYING';
                    resetGame();
                    state.lastTime = performance.now();
                    gameLoop();
                }
            })
            .on('broadcast', { event: 'grid_sync' }, payload => {
                state.opponentGrid = payload.payload.grid;
                draw();
            })
            .on('broadcast', { event: 'garbage' }, payload => {
                receiveGarbageLines(payload.payload.count);
            })
            .on('broadcast', { event: 'game_over' }, () => {
                // Đối thủ thua cuộc -> Mình chiến thắng!
                state.gameOver = true;
                cancelAnimationFrame(state.animationId);
                
                tetrisStatusText.innerText = 'ĐỐI THỦ THUA CUỘC! BẠN ĐÃ GIÀNH CHIẾN THẮNG!';
                tetrisStatusText.style.color = '#39ff14';
                btnResetTetris.classList.remove('hidden');
            })
            .on('broadcast', { event: 'reset_req' }, () => {
                addChatMsg(`[HỆ THỐNG] Đối thủ yêu cầu đấu ván mới.`, 'system');
                resetGame();
                state.lastTime = performance.now();
                gameLoop();
            })
            .on('broadcast', { event: 'leave' }, () => {
                addChatMsg(`[HỆ THỐNG] Đối thủ đã rời phòng.`, 'system');
                state.status = 'WAITING';
                tetrisStatusText.innerText = 'ĐỐI THỦ ĐÃ RỜI PHÒNG. Đang chờ đối thủ mới...';
                tetrisStatusText.style.color = '#ff9500';
                btnResetTetris.classList.add('hidden');
                
                state.gameOver = true;
                cancelAnimationFrame(state.animationId);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    if (state.myColor === 'w') {
                        addChatMsg(`[HỆ THỐNG] Đã tạo phòng ${state.roomCode}. Chờ đối thủ...`, 'system');
                    } else {
                        state.gameChannel.send({
                            type: 'broadcast',
                            event: 'join',
                            payload: { nickname: state.nickname }
                        });
                    }
                }
            });

        // Kênh chat room
        state.chatChannel = client.channel(`tetris-chat-${state.roomCode}`);
        state.chatChannel
            .on('broadcast', { event: 'msg' }, payload => {
                addChatMsg(`${payload.payload.sender}: ${payload.payload.text}`, 'opponent');
            })
            .subscribe();
    }

    // --- BUTTON BINDINGS ---

    // Chơi Solo
    btnStartTetrisSolo.addEventListener('click', function () {
        state.mode = 'SOLO';
        state.status = 'PLAYING';

        tetrisLobby.classList.add('hidden');
        tetrisGameArea.classList.remove('hidden');

        // Ẩn các khu vực 2 người chơi
        tetrisRoomHeader.style.display = 'none';
        tetrisOpponentColumn.style.display = 'none';
        tetrisChatColumn.style.display = 'none';

        resetGame();
        state.lastTime = performance.now();
        gameLoop();
    });

    // Host tạo phòng Battle
    btnTetrisCreateRoom.addEventListener('click', function () {
        const nick = tetrisNicknameInput.value.trim().toUpperCase();
        if (!nick) {
            showLobbyMsg('Vui lòng nhập tên hiển thị trước!', true);
            return;
        }
        state.mode = 'BATTLE';
        state.status = 'WAITING';
        state.nickname = nick;
        state.roomCode = genRoomCode();
        state.myColor = 'w';
        state.opponentName = 'Đối thủ';

        tetrisLobby.classList.add('hidden');
        tetrisGameArea.classList.remove('hidden');

        // Hiện các khu vực đối kháng & chat
        tetrisRoomHeader.style.display = 'block';
        tetrisDisplayRoomCode.innerText = state.roomCode;
        tetrisOpponentColumn.style.display = 'flex';
        tetrisOpponentName.innerText = 'Chờ kết nối...';
        tetrisChatColumn.style.display = 'block';
        tetrisStatusText.innerText = 'ĐANG CHỜ ĐỐI THỦ VÀO PHÒNG...';
        tetrisStatusText.style.color = '#ff9500';

        initSupabaseRoom();
        resetGame();
    });

    // Guest vào phòng Battle
    btnTetrisJoinRoom.addEventListener('click', function () {
        const nick = tetrisNicknameInput.value.trim().toUpperCase();
        const code = tetrisRoomCodeInput.value.trim().toUpperCase();
        if (!nick) {
            showLobbyMsg('Vui lòng nhập tên hiển thị trước!', true);
            return;
        }
        if (code.length !== 4) {
            showLobbyMsg('Mã phòng phải gồm 4 ký tự!', true);
            return;
        }
        state.mode = 'BATTLE';
        state.status = 'WAITING';
        state.nickname = nick;
        state.roomCode = code;
        state.myColor = 'b';

        tetrisLobby.classList.add('hidden');
        tetrisGameArea.classList.remove('hidden');

        // Hiện các khu vực đối kháng & chat
        tetrisRoomHeader.style.display = 'block';
        tetrisDisplayRoomCode.innerText = state.roomCode;
        tetrisOpponentColumn.style.display = 'flex';
        tetrisChatColumn.style.display = 'block';
        tetrisStatusText.innerText = 'ĐANG KẾT NỐI TỚI PHÒNG ĐẤU...';
        tetrisStatusText.style.color = '#ff9500';

        initSupabaseRoom();
        resetGame();
    });

    // Rematch
    btnResetTetris.addEventListener('click', () => {
        resetGame();
        state.lastTime = performance.now();
        gameLoop();

        if (state.gameChannel) {
            state.gameChannel.send({
                type: 'broadcast',
                event: 'reset_req',
                payload: {}
            });
        }
        addChatMsg(`[HỆ THỐNG] Bạn đã yêu cầu bắt đầu ván mới.`, 'system');
    });

    // Thoát game
    function quitGame() {
        state.gameOver = true;
        cancelAnimationFrame(state.animationId);

        if (state.gameChannel) {
            state.gameChannel.send({
                type: 'broadcast',
                event: 'leave',
                payload: {}
            });
            state.gameChannel.unsubscribe();
        }
        if (state.chatChannel) {
            state.chatChannel.unsubscribe();
        }

        state.status = 'LOBBY';
        state.roomCode = '';
        
        tetrisLobby.classList.remove('hidden');
        tetrisGameArea.classList.add('hidden');
        tetrisChatHistory.innerHTML = '<div class="chat-msg system">KÊNH CHAT ĐỐI KHÁNG TETRIS</div>';
    }

    btnQuitTetris.addEventListener('click', quitGame);

    // Gửi chat
    function sendChat() {
        const text = tetrisChatInput.value.trim();
        if (!text) return;

        if (state.chatChannel) {
            state.chatChannel.send({
                type: 'broadcast',
                event: 'msg',
                payload: { sender: state.nickname, text }
            });
        }
        addChatMsg(`Tôi: ${text}`, 'self');
        tetrisChatInput.value = '';
    }

    btnTetrisSendChat.addEventListener('click', sendChat);
    tetrisChatInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') sendChat();
    });
})();
