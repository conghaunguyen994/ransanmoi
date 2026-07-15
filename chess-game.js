// chess-game.js - Neon Chess Online (Cờ Vua Cyberpunk Trực tuyến)
(function() {
"use strict";

// --- PHẦN TỬ DOM ---
const chessCanvas = document.getElementById('chessCanvas');
const chessCtx = chessCanvas.getContext('2d');

// Lobby
const chessLobby = document.getElementById('chessLobby');
const chessNicknameInput = document.getElementById('chessNicknameInput');
const chessRoomCodeInput = document.getElementById('chessRoomCodeInput');
const btnChessCreateRoom = document.getElementById('btnChessCreateRoom');
const btnChessJoinRoom = document.getElementById('btnChessJoinRoom');
const chessLobbyMessage = document.getElementById('chessLobbyMessage');

// Game
const chessGame = document.getElementById('chessGame');
const chessDisplayRoomCode = document.getElementById('chessDisplayRoomCode');
const chessTurnEl = document.getElementById('chessTurn');
const chessStatusEl = document.getElementById('chessStatus');
const chessStatusText = document.getElementById('chessStatusText');
const btnResetChess = document.getElementById('btnResetChess');
const btnLeaveChess = document.getElementById('btnLeaveChess');

// Chat
const chessChatHistory = document.getElementById('chessChatHistory');
const chessChatInput = document.getElementById('chessChatInput');
const btnChessSendChat = document.getElementById('btnChessSendChat');

// --- HẰNG SỐ ---
const BOARD_SIZE = 8;
const CELL_SIZE = chessCanvas.width / BOARD_SIZE; // 50px
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];
const PIECE_SYMBOLS = { 'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟' };

// --- TRẠNG THÁI GAME ---
let chess = null;
if (typeof Chess !== 'undefined') {
    chess = new Chess();
}

const state = {
    status: 'LOBBY', // LOBBY | WAITING | PLAYING | ENDED
    nickname: '',
    roomCode: '',
    myColor: 'w', // 'w' hoặc 'b'
    opponentName: 'Đối thủ',
    selectedSquare: null,
    validMoves: [],
    // Supabase channels
    gameChannel: null,
    chatChannel: null
};

// --- TIỆN ÍCH ---
function genRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

function showLobbyMsg(msg, isError) {
    chessLobbyMessage.innerText = msg;
    chessLobbyMessage.style.color = isError ? '#ff3b30' : '#00f0ff';
}

function addChatMsg(text, type) {
    const div = document.createElement('div');
    div.classList.add('chat-msg', type);
    div.textContent = text;
    chessChatHistory.appendChild(div);
    chessChatHistory.scrollTop = chessChatHistory.scrollHeight;
}

// --- VẼ BÀN CỜ ---
function renderBoard() {
    if (!chess) return;
    chessCtx.fillStyle = '#07080c';
    chessCtx.fillRect(0, 0, chessCanvas.width, chessCanvas.height);

    const board = chess.board();
    const isCheck = chess.in_check();

    // 1. Ô lưới
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const isDark = (r + c) % 2 === 1;
            chessCtx.fillStyle = isDark ? '#161722' : '#2c2d3d';
            chessCtx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);

            // File/Rank labels
            if (c === 0) {
                chessCtx.fillStyle = '#8f92a1';
                chessCtx.font = '9px Outfit, sans-serif';
                chessCtx.fillText(RANKS[r], 4, r * CELL_SIZE + 12);
            }
            if (r === BOARD_SIZE - 1) {
                chessCtx.fillStyle = '#8f92a1';
                chessCtx.font = '9px Outfit, sans-serif';
                chessCtx.fillText(FILES[c], c * CELL_SIZE + CELL_SIZE - 10, chessCanvas.height - 4);
            }
        }
    }

    // 2. Viền đỏ Vua bị chiếu
    if (isCheck) {
        const turn = chess.turn();
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const piece = board[r][c];
                if (piece && piece.type === 'k' && piece.color === turn) {
                    chessCtx.save();
                    chessCtx.shadowBlur = 12;
                    chessCtx.shadowColor = '#ff3b30';
                    chessCtx.strokeStyle = '#ff3b30';
                    chessCtx.lineWidth = 3;
                    chessCtx.strokeRect(c * CELL_SIZE + 2, r * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
                    chessCtx.restore();
                }
            }
        }
    }

    // 3. Highlight ô đang chọn
    if (state.selectedSquare) {
        const col = FILES.indexOf(state.selectedSquare[0]);
        const row = RANKS.indexOf(state.selectedSquare[1]);
        chessCtx.save();
        chessCtx.shadowBlur = 10;
        chessCtx.shadowColor = '#ffe600';
        chessCtx.strokeStyle = '#ffe600';
        chessCtx.lineWidth = 2.5;
        chessCtx.strokeRect(col * CELL_SIZE + 2, row * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        chessCtx.restore();
    }

    // 4. Gợi ý nước đi hợp lệ
    state.validMoves.forEach(mv => {
        const col = FILES.indexOf(mv.to[0]);
        const row = RANKS.indexOf(mv.to[1]);
        const targetPiece = board[row][col];
        chessCtx.save();
        if (targetPiece) {
            chessCtx.shadowBlur = 8;
            chessCtx.shadowColor = '#ff7300';
            chessCtx.strokeStyle = '#ff7300';
            chessCtx.lineWidth = 2;
            chessCtx.strokeRect(col * CELL_SIZE + 4, row * CELL_SIZE + 4, CELL_SIZE - 8, CELL_SIZE - 8);
        } else {
            chessCtx.shadowBlur = 8;
            chessCtx.shadowColor = '#00f0ff';
            chessCtx.fillStyle = 'rgba(0, 240, 255, 0.6)';
            chessCtx.beginPath();
            chessCtx.arc(col * CELL_SIZE + CELL_SIZE / 2, row * CELL_SIZE + CELL_SIZE / 2, 6, 0, Math.PI * 2);
            chessCtx.fill();
        }
        chessCtx.restore();
    });

    // 5. Quân cờ
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const piece = board[r][c];
            if (piece) {
                chessCtx.save();
                chessCtx.font = '36px Arial';
                chessCtx.textAlign = 'center';
                chessCtx.textBaseline = 'middle';
                if (piece.color === 'w') {
                    chessCtx.shadowBlur = 8;
                    chessCtx.shadowColor = '#00f0ff';
                    chessCtx.fillStyle = '#00f0ff';
                } else {
                    chessCtx.shadowBlur = 8;
                    chessCtx.shadowColor = '#ff007f';
                    chessCtx.fillStyle = '#ff007f';
                }
                chessCtx.fillText(PIECE_SYMBOLS[piece.type] || '', c * CELL_SIZE + CELL_SIZE / 2, r * CELL_SIZE + CELL_SIZE / 2 + 2);
                chessCtx.restore();
            }
        }
    }
}

// --- CẬP NHẬT TRẠNG THÁI UI ---
function updateStatusUI() {
    if (!chess) return;
    const turn = chess.turn();
    chessTurnEl.innerText = turn === 'w' ? 'TRẮNG' : 'ĐEN';
    chessTurnEl.style.color = turn === 'w' ? '#00f0ff' : '#ff007f';
    chessTurnEl.style.textShadow = turn === 'w' ? '0 0 8px #00f0ff' : '0 0 8px #ff007f';

    if (chess.in_check()) {
        chessStatusEl.classList.remove('hidden');
    } else {
        chessStatusEl.classList.add('hidden');
    }

    const isMyTurn = turn === state.myColor;

    if (chess.in_checkmate()) {
        const winner = turn === 'w' ? 'ĐEN' : 'TRẮNG';
        chessStatusText.innerText = `CHIẾU BÍ! QUÂN ${winner} THẮNG!`;
        chessStatusText.style.color = '#ff3b30';
        state.status = 'ENDED';
        btnResetChess.classList.remove('hidden');
    } else if (chess.in_draw()) {
        chessStatusText.innerText = 'TRẬN ĐẤU HÒA!';
        chessStatusText.style.color = '#ffe600';
        state.status = 'ENDED';
        btnResetChess.classList.remove('hidden');
    } else if (state.status === 'PLAYING') {
        chessStatusText.innerText = isMyTurn ? '👉 LƯỢT CỦA BẠN - CLICK QUÂN CỜ' : '⏳ ĐỐI THỦ ĐANG SUY NGHĨ...';
        chessStatusText.style.color = '#ffe600';
    }
}

// --- SUPABASE CHANNELS ---
function setupChannels() {
    if (typeof window.supabaseClient === 'undefined' || !window.supabaseClient) {
        const sc = window.supabaseClient;
    }
    const client = window.supabaseClient;
    if (!client) {
        console.warn('Supabase not available. Chess online mode disabled.');
        return;
    }

    // Game channel — di chuyển, join, reset
    state.gameChannel = client.channel(`chess-${state.roomCode}`, {
        config: { broadcast: { self: false } }
    });

    state.gameChannel.on('broadcast', { event: 'player-joined' }, (payload) => {
        const data = payload.payload;
        state.opponentName = data.name || 'Đối thủ';
        state.status = 'PLAYING';
        chessStatusText.innerText = '👉 LƯỢT CỦA BẠN - CLICK QUÂN CỜ';
        addChatMsg(`Hệ thống: ${state.opponentName} ĐÃ THAM GIA. BẮT ĐẦU!`, 'system');
        renderBoard();
        updateStatusUI();
    });

    state.gameChannel.on('broadcast', { event: 'chess-move' }, (payload) => {
        const data = payload.payload;
        if (chess) {
            chess.move({ from: data.from, to: data.to, promotion: data.promotion || undefined });
            state.selectedSquare = null;
            state.validMoves = [];
            renderBoard();
            updateStatusUI();
        }
    });

    state.gameChannel.on('broadcast', { event: 'chess-reset' }, () => {
        chess.reset();
        state.selectedSquare = null;
        state.validMoves = [];
        state.status = 'PLAYING';
        btnResetChess.classList.add('hidden');
        addChatMsg('Hệ thống: ĐỐI THỦ ĐÃ BẮT ĐẦU VÁN MỚI!', 'system');
        renderBoard();
        updateStatusUI();
    });

    state.gameChannel.subscribe();

    // Chat channel
    state.chatChannel = client.channel(`chess-chat-${state.roomCode}`, {
        config: { broadcast: { self: false } }
    });

    state.chatChannel.on('broadcast', { event: 'chat-message' }, (payload) => {
        const data = payload.payload;
        const colorClass = data.color === 'w' ? 'x' : 'o';
        addChatMsg(`${data.name}: ${data.text}`, colorClass);
    });

    state.chatChannel.subscribe();
}

function cleanupChannels() {
    if (state.gameChannel) { state.gameChannel.unsubscribe(); state.gameChannel = null; }
    if (state.chatChannel) { state.chatChannel.unsubscribe(); state.chatChannel = null; }
}

// --- LOBBY ---
function enterGame() {
    chessLobby.classList.add('hidden');
    chessGame.classList.remove('hidden');
    chessDisplayRoomCode.innerText = state.roomCode;
    chess.reset();
    state.selectedSquare = null;
    state.validMoves = [];
    // Clear old chat
    chessChatHistory.innerHTML = '<div class="chat-msg system">KÊNH CHAT PHÒNG CỜ VUA</div>';
    renderBoard();
    updateStatusUI();
    setupChannels();
}

function leaveGame() {
    cleanupChannels();
    chessGame.classList.add('hidden');
    chessLobby.classList.remove('hidden');
    state.status = 'LOBBY';
    state.roomCode = '';
    btnResetChess.classList.add('hidden');
    showLobbyMsg('', false);
}

// Tạo phòng
btnChessCreateRoom.addEventListener('click', () => {
    const name = chessNicknameInput.value.trim();
    if (!name) { showLobbyMsg('VUI LÒNG NHẬP TÊN!', true); return; }

    state.nickname = name;
    state.roomCode = genRoomCode();
    state.myColor = 'w'; // Host chơi Trắng
    state.status = 'WAITING';

    showLobbyMsg(`ĐÃ TẠO PHÒNG: ${state.roomCode} — CHỜ ĐỐI THỦ...`, false);
    chessStatusText.innerText = `ĐANG CHỜ ĐỐI THỦ VÀO PHÒNG... MÃ: ${state.roomCode}`;
    enterGame();
});

// Vào phòng
btnChessJoinRoom.addEventListener('click', () => {
    const name = chessNicknameInput.value.trim();
    if (!name) { showLobbyMsg('VUI LÒNG NHẬP TÊN!', true); return; }

    const code = chessRoomCodeInput.value.trim().toUpperCase();
    if (code.length !== 4) { showLobbyMsg('MÃ PHÒNG PHẢI GỒM 4 KÝ TỰ!', true); return; }

    state.nickname = name;
    state.roomCode = code;
    state.myColor = 'b'; // Guest chơi Đen
    state.status = 'PLAYING';

    enterGame();
    addChatMsg(`Hệ thống: BẠN ĐÃ VÀO PHÒNG ${code}. BẮT ĐẦU TRẬN ĐẤU!`, 'system');

    // Thông báo cho host
    setTimeout(() => {
        if (state.gameChannel) {
            state.gameChannel.send({
                type: 'broadcast',
                event: 'player-joined',
                payload: { name: state.nickname }
            });
        }
    }, 500);
});

// Thoát phòng
btnLeaveChess.addEventListener('click', () => {
    leaveGame();
});

// Chơi lại
btnResetChess.addEventListener('click', () => {
    chess.reset();
    state.selectedSquare = null;
    state.validMoves = [];
    state.status = 'PLAYING';
    btnResetChess.classList.add('hidden');
    addChatMsg('Hệ thống: BẠN ĐÃ BẮT ĐẦU VÁN MỚI!', 'system');
    renderBoard();
    updateStatusUI();

    // Broadcast reset
    if (state.gameChannel) {
        state.gameChannel.send({
            type: 'broadcast',
            event: 'chess-reset',
            payload: {}
        });
    }
});

// --- CLICK BÀN CỜ ---
chessCanvas.addEventListener('click', (e) => {
    if (!chess) return;
    if (state.status !== 'PLAYING') return;
    if (chess.game_over()) return;

    // Chỉ cho phép đi khi đúng lượt
    if (chess.turn() !== state.myColor) return;

    const rect = chessCanvas.getBoundingClientRect();
    const scaleX = chessCanvas.width / rect.width;
    const scaleY = chessCanvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const col = Math.floor(clickX / CELL_SIZE);
    const row = Math.floor(clickY / CELL_SIZE);
    if (col < 0 || col >= 8 || row < 0 || row >= 8) return;

    const square = FILES[col] + RANKS[row];
    const piece = chess.get(square);
    const turn = chess.turn();

    if (!state.selectedSquare) {
        // Chọn quân của mình
        if (piece && piece.color === turn) {
            state.selectedSquare = square;
            state.validMoves = chess.moves({ square: square, verbose: true });
        }
    } else {
        const isMoveValid = state.validMoves.some(mv => mv.to === square);

        if (isMoveValid) {
            const sourcePiece = chess.get(state.selectedSquare);
            const isPromotion = sourcePiece && sourcePiece.type === 'p' && (square[1] === '8' || square[1] === '1');
            const moveData = {
                from: state.selectedSquare,
                to: square,
                promotion: isPromotion ? 'q' : undefined
            };

            chess.move(moveData);

            // Broadcast nước đi
            if (state.gameChannel) {
                state.gameChannel.send({
                    type: 'broadcast',
                    event: 'chess-move',
                    payload: moveData
                });
            }

            state.selectedSquare = null;
            state.validMoves = [];
            updateStatusUI();
        } else {
            if (piece && piece.color === turn) {
                state.selectedSquare = square;
                state.validMoves = chess.moves({ square: square, verbose: true });
            } else {
                state.selectedSquare = null;
                state.validMoves = [];
            }
        }
    }

    renderBoard();
});

// --- CHAT ---
function sendChessChat() {
    const text = chessChatInput.value.trim();
    if (!text) return;

    const colorClass = state.myColor === 'w' ? 'x' : 'o';
    addChatMsg(`${state.nickname}: ${text}`, colorClass);
    chessChatInput.value = '';

    if (state.chatChannel) {
        state.chatChannel.send({
            type: 'broadcast',
            event: 'chat-message',
            payload: { name: state.nickname, text: text, color: state.myColor }
        });
    }
}

btnChessSendChat.addEventListener('click', sendChessChat);
chessChatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChessChat();
});

// --- EXPORT & INIT ---
window.renderChessBoard = renderBoard;
console.log('Chess.js loaded:', typeof Chess !== 'undefined', '| chess instance:', chess !== null);
renderBoard();

})(); // Kết thúc IIFE
