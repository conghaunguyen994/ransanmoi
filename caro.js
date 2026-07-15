// caro.js - Neon Gomoku (Cờ Ca rô Online)

// Lấy tham chiếu các phần tử DOM
const caroCanvas = document.getElementById('caroCanvas');
const caroCtx = caroCanvas.getContext('2d');

const btnCreateRoom = document.getElementById('btnCreateRoom');
const btnJoinRoom = document.getElementById('btnJoinRoom');
const btnLeaveRoom = document.getElementById('btnLeaveRoom');
const nicknameInput = document.getElementById('nicknameInput');
const roomCodeInput = document.getElementById('roomCodeInput');
const lobbyMessage = document.getElementById('lobbyMessage');

const caroLobby = document.getElementById('caroLobby');
const caroGame = document.getElementById('caroGame');
const displayRoomCode = document.getElementById('displayRoomCode');
const displayTurn = document.getElementById('displayTurn');
const caroStatusText = document.getElementById('caroStatusText');

// Cấu hình bàn cờ
const BOARD_SIZE = 15; // Lưới 15x15 ô
const CARO_CELL_SIZE = caroCanvas.width / BOARD_SIZE; // 450 / 15 = 30px mỗi ô

// Trạng thái bàn cờ Caro
const caroState = {
    board: Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill('')), // '' | 'X' | 'O'
    status: 'LOBBY', // LOBBY | WAITING | PLAYING | ENDED
    
    // Thông tin phòng & Người chơi
    nickname: '',
    roomCode: '',
    mySymbol: 'X', // 'X' hoặc 'O'
    currentTurn: 'X', // 'X' đi trước
    isMyTurn: false,
    
    // Đối thủ
    opponentName: 'Đối thủ',
    
    // Kết quả
    winner: null, // null | 'X' | 'O' | 'DRAW'
    winningCoords: [], // Danh sách tọa độ 5 ô thắng để vẽ highlight
    
    // Trạng thái hover chuột
    hoverCell: { x: -1, y: -1 },
    
    // Supabase subscription references
    roomSubscription: null,
    movesSubscription: null
};

// --- LOGIC HÌNH ẢNH & RENDERING (CARO) ---

// Khởi tạo và vẽ bàn cờ trống ban đầu
function initCaroBoard() {
    caroState.board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(''));
    caroState.winner = null;
    caroState.winningCoords = [];
    caroState.hoverCell = { x: -1, y: -1 };
    renderCaro();
}

// Vẽ toàn bộ giao diện bàn cờ Caro
function renderCaro() {
    // 1. Nền canvas tối
    caroCtx.fillStyle = '#07080c';
    caroCtx.fillRect(0, 0, caroCanvas.width, caroCanvas.height);
    
    // 2. Vẽ lưới ô vuông bàn cờ
    caroCtx.strokeStyle = 'rgba(176, 38, 255, 0.2)'; // Màu tím neon nhạt
    caroCtx.lineWidth = 1;
    for (let i = 0; i <= BOARD_SIZE; i++) {
        // Đường dọc
        caroCtx.beginPath();
        caroCtx.moveTo(i * CARO_CELL_SIZE, 0);
        caroCtx.lineTo(i * CARO_CELL_SIZE, caroCanvas.height);
        caroCtx.stroke();
        
        // Đường ngang
        caroCtx.beginPath();
        caroCtx.moveTo(0, i * CARO_CELL_SIZE);
        caroCtx.lineTo(caroCanvas.width, i * CARO_CELL_SIZE);
        caroCtx.stroke();
    }
    
    // 3. Vẽ ô Hover chuột
    if (caroState.status === 'PLAYING' && caroState.isMyTurn && !caroState.winner) {
        const { x, y } = caroState.hoverCell;
        if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE && caroState.board[x][y] === '') {
            caroCtx.fillStyle = caroState.mySymbol === 'X' ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 0, 127, 0.1)';
            caroCtx.fillRect(x * CARO_CELL_SIZE + 1, y * CARO_CELL_SIZE + 1, CARO_CELL_SIZE - 2, CARO_CELL_SIZE - 2);
        }
    }
    
    // 4. Vẽ các quân cờ X và O đã đánh
    for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
            const piece = caroState.board[x][y];
            if (piece === 'X') {
                drawX(x, y);
            } else if (piece === 'O') {
                drawO(x, y);
            }
        }
    }
    
    // 5. Vẽ highlight đường thắng cuộc
    if (caroState.winner && caroState.winningCoords.length > 0) {
        drawWinLine();
    }
}

// Vẽ quân cờ X (Màu xanh dương neon phát sáng)
function drawX(x, y) {
    const pad = 6;
    const xPos = x * CARO_CELL_SIZE;
    const yPos = y * CARO_CELL_SIZE;
    
    caroCtx.save();
    caroCtx.strokeStyle = '#00f0ff';
    caroCtx.lineWidth = 3;
    caroCtx.shadowBlur = 8;
    caroCtx.shadowColor = '#00f0ff';
    
    caroCtx.beginPath();
    caroCtx.moveTo(xPos + pad, yPos + pad);
    caroCtx.lineTo(xPos + CARO_CELL_SIZE - pad, yPos + CARO_CELL_SIZE - pad);
    caroCtx.moveTo(xPos + CARO_CELL_SIZE - pad, yPos + pad);
    caroCtx.lineTo(xPos + pad, yPos + CARO_CELL_SIZE - pad);
    caroCtx.stroke();
    
    caroCtx.restore();
}

// Vẽ quân cờ O (Màu hồng neon phát sáng)
function drawO(x, y) {
    const pad = 6;
    const centerX = x * CARO_CELL_SIZE + CARO_CELL_SIZE / 2;
    const centerY = y * CARO_CELL_SIZE + CARO_CELL_SIZE / 2;
    const radius = CARO_CELL_SIZE / 2 - pad;
    
    caroCtx.save();
    caroCtx.strokeStyle = '#ff007f';
    caroCtx.lineWidth = 3;
    caroCtx.shadowBlur = 8;
    caroCtx.shadowColor = '#ff007f';
    
    caroCtx.beginPath();
    caroCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    caroCtx.stroke();
    
    caroCtx.restore();
}

// Vẽ đường gạch highlight các quân cờ chiến thắng
function drawWinLine() {
    if (caroState.winningCoords.length === 0) return;
    
    caroCtx.save();
    caroCtx.strokeStyle = '#ffe600'; // Viền vàng neon cực sáng
    caroCtx.lineWidth = 4;
    caroCtx.shadowBlur = 12;
    caroCtx.shadowColor = '#ffe600';
    
    const first = caroState.winningCoords[0];
    const last = caroState.winningCoords[caroState.winningCoords.length - 1];
    
    const x1 = first.x * CARO_CELL_SIZE + CARO_CELL_SIZE / 2;
    const y1 = first.y * CARO_CELL_SIZE + CARO_CELL_SIZE / 2;
    const x2 = last.x * CARO_CELL_SIZE + CARO_CELL_SIZE / 2;
    const y2 = last.y * CARO_CELL_SIZE + CARO_CELL_SIZE / 2;
    
    caroCtx.beginPath();
    caroCtx.moveTo(x1, y1);
    caroCtx.lineTo(x2, y2);
    caroCtx.stroke();
    
    caroCtx.restore();
}

// --- THUẬT TOÁN KIỂM TRA THẮNG THUA (5 TRONG HÀNG) ---

function checkWin(x, y, symbol) {
    const board = caroState.board;
    const dirs = [
        { dx: 1, dy: 0 },  // Ngang
        { dx: 0, dy: 1 },  // Dọc
        { dx: 1, dy: 1 },  // Chéo xuống phải
        { dx: 1, dy: -1 }  // Chéo lên phải
    ];
    
    for (let d of dirs) {
        let count = 1;
        let winningCoords = [{ x, y }];
        
        // Quét chiều dương
        let rx = x + d.dx;
        let ry = y + d.dy;
        while (rx >= 0 && rx < BOARD_SIZE && ry >= 0 && ry < BOARD_SIZE && board[rx][ry] === symbol) {
            count++;
            winningCoords.push({ x: rx, y: ry });
            rx += d.dx;
            ry += d.dy;
        }
        
        // Quét chiều âm
        rx = x - d.dx;
        ry = y - d.dy;
        while (rx >= 0 && rx < BOARD_SIZE && ry >= 0 && ry < BOARD_SIZE && board[rx][ry] === symbol) {
            count++;
            winningCoords.unshift({ x: rx, y: ry }); // Thêm vào đầu để giữ thứ tự tọa độ thẳng hàng
            rx -= d.dx;
            ry -= d.dy;
        }
        
        // Nếu đủ 5 nước liên tiếp trở lên
        if (count >= 5) {
            caroState.winningCoords = winningCoords;
            return true;
        }
    }
    return false;
}

// Kiểm tra xem bàn cờ đã đầy chưa (Hòa)
function checkDraw() {
    for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
            if (caroState.board[x][y] === '') return false;
        }
    }
    return true;
}

// --- LOGIC CHƠI OFFLINE (FALLBACK KHI KHÔNG CÓ SUPABASE) ---

// Click đánh cờ offline trên cùng 1 máy
function handleLocalClick(x, y) {
    if (caroState.board[x][y] !== '' || caroState.winner) return;
    
    // Đặt quân cờ
    const currentSymbol = caroState.currentTurn;
    caroState.board[x][y] = currentSymbol;
    
    // Kiểm tra kết quả
    if (checkWin(x, y, currentSymbol)) {
        caroState.winner = currentSymbol;
        caroState.status = 'ENDED';
        displayTurn.innerText = `NGƯỜI THẮNG: ${currentSymbol}`;
        caroStatusText.innerText = `TRÒ CHƠI KẾT THÚC! QUÂN ${currentSymbol} CHIẾN THẮNG!`;
    } else if (checkDraw()) {
        caroState.winner = 'DRAW';
        caroState.status = 'ENDED';
        displayTurn.innerText = 'HÒA CỜ!';
        caroStatusText.innerText = 'BÀN CỜ ĐÃ ĐẦY! TRẬN ĐẤU HÒA!';
    } else {
        // Đổi lượt đi
        caroState.currentTurn = currentSymbol === 'X' ? 'O' : 'X';
        caroState.mySymbol = caroState.currentTurn; // Cập nhật để vẽ hover đúng màu
        displayTurn.innerText = caroState.currentTurn;
        caroStatusText.innerText = `LƯỢT ĐÁNH CỦA QUÂN: ${caroState.currentTurn}`;
    }
    
    renderCaro();
}

// Kích hoạt sảnh chờ offline để chơi local
function startLocalOfflineGame() {
    caroState.status = 'PLAYING';
    caroState.mySymbol = 'X';
    caroState.currentTurn = 'X';
    caroState.isMyTurn = true; // Luôn cho phép click
    
    caroLobby.classList.add('hidden');
    caroGame.classList.remove('hidden');
    
    displayRoomCode.innerText = "LOCAL";
    displayTurn.innerText = "X";
    caroStatusText.innerText = "CHẾ ĐỘ CHƠI CỤC BỘ (SUPABASE CHƯA CONNECT)";
    
    initCaroBoard();
}

// --- SỰ KIỆN TƯƠNG TÁC CHUỘT TRÊN CANVAS ---

caroCanvas.addEventListener('mousemove', (e) => {
    if (caroState.status !== 'PLAYING' || caroState.winner) return;
    
    const rect = caroCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const cellX = Math.floor(mouseX / CARO_CELL_SIZE);
    const cellY = Math.floor(mouseY / CARO_CELL_SIZE);
    
    if (cellX !== caroState.hoverCell.x || cellY !== caroState.hoverCell.y) {
        caroState.hoverCell = { x: cellX, y: cellY };
        renderCaro();
    }
});

caroCanvas.addEventListener('mouseleave', () => {
    caroState.hoverCell = { x: -1, y: -1 };
    renderCaro();
});

caroCanvas.addEventListener('click', () => {
    if (caroState.status !== 'PLAYING' || caroState.winner) return;
    
    const { x, y } = caroState.hoverCell;
    if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
        if (supabaseClient === null) {
            // Chế độ Offline local
            handleLocalClick(x, y);
        } else {
            // Chế độ Online Realtime (sẽ viết tiếp ở Task 5)
            handleOnlineClick(x, y);
        }
    }
});

// Nút Thoát Phòng
btnLeaveRoom.addEventListener('click', () => {
    leaveCurrentRoom();
});

function leaveCurrentRoom() {
    // Ngắt kết nối realtime
    if (supabaseClient) {
        if (caroState.roomSubscription) supabaseClient.removeChannel(caroState.roomSubscription);
        if (caroState.movesSubscription) supabaseClient.removeChannel(caroState.movesSubscription);
    }
    
    caroState.status = 'LOBBY';
    caroGame.classList.add('hidden');
    caroLobby.classList.remove('hidden');
    lobbyMessage.innerText = "";
    
    console.log("Returned to lobby.");
}

// --- LOGIC CHƠI ONLINE (SUPABASE REALTIME SYNC) ---

// Hàm sinh mã phòng ngẫu nhiên 4 ký tự
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Lắng nghe nút TẠO PHÒNG MỚI
btnCreateRoom.addEventListener('click', async () => {
    const nick = nicknameInput.value.trim();
    if (!nick) {
        lobbyMessage.style.color = '#ff3b30';
        lobbyMessage.innerText = "VUI LÒNG NHẬP NICKNAME!";
        return;
    }
    
    caroState.nickname = nick;
    
    // Nếu chưa cấu hình Supabase, tự động chạy Offline local
    if (supabaseClient === null) {
        lobbyMessage.style.color = '#ffe600';
        lobbyMessage.innerText = "CHƯA KẾT NỐI SUPABASE. CHUYỂN SANG CHƠI CỤC BỘ...";
        setTimeout(() => {
            startLocalOfflineGame();
        }, 1500);
        return;
    }
    
    lobbyMessage.style.color = '#00f0ff';
    lobbyMessage.innerText = "ĐANG TẠO PHÒNG...";
    
    const code = generateRoomCode();
    
    try {
        const { data, error } = await supabaseClient
            .from('caro_rooms')
            .insert([
                { id: code, status: 'waiting', host_symbol: 'X', current_turn: 'X' }
            ]);
            
        if (error) throw error;
        
        // Thiết lập trạng thái ban đầu của Host
        caroState.roomCode = code;
        caroState.mySymbol = 'X';
        caroState.currentTurn = 'X';
        caroState.isMyTurn = true; // X đi trước nên host đi trước
        caroState.status = 'WAITING';
        
        // Cập nhật UI
        caroLobby.classList.add('hidden');
        caroGame.classList.remove('hidden');
        displayRoomCode.innerText = code;
        displayTurn.innerText = "X";
        caroStatusText.innerText = "ĐANG CHỜ NGƯỜI CHƠI THỨ 2 THAM GIA...";
        
        initCaroBoard();
        
        // Đăng ký lắng nghe Realtime
        subscribeToRoomUpdates(code);
        subscribeToMovesUpdates(code);
        
    } catch (err) {
        console.error(err);
        lobbyMessage.style.color = '#ff3b30';
        lobbyMessage.innerText = "LỖI KHI TẠO PHÒNG. THỬ LẠI!";
    }
});

// Lắng nghe nút VÀO PHÒNG
btnJoinRoom.addEventListener('click', async () => {
    const nick = nicknameInput.value.trim();
    const code = roomCodeInput.value.trim().toUpperCase();
    
    if (!nick) {
        lobbyMessage.style.color = '#ff3b30';
        lobbyMessage.innerText = "VUI LÒNG NHẬP NICKNAME!";
        return;
    }
    if (!code || code.length !== 4) {
        lobbyMessage.style.color = '#ff3b30';
        lobbyMessage.innerText = "MÃ PHÒNG PHẢI ĐỦ 4 KÝ TỰ!";
        return;
    }
    
    caroState.nickname = nick;
    
    if (supabaseClient === null) {
        startLocalOfflineGame();
        return;
    }
    
    lobbyMessage.style.color = '#00f0ff';
    lobbyMessage.innerText = "ĐANG TÌM PHÒNG...";
    
    try {
        // Tìm phòng hợp lệ
        const { data, error } = await supabaseClient
            .from('caro_rooms')
            .select('*')
            .eq('id', code)
            .single();
            
        if (error || !data) {
            lobbyMessage.style.color = '#ff3b30';
            lobbyMessage.innerText = "PHÒNG KHÔNG TỒN TẠI!";
            return;
        }
        
        if (data.status !== 'waiting') {
            lobbyMessage.style.color = '#ff3b30';
            lobbyMessage.innerText = "PHÒNG ĐÃ ĐẦY HOẶC ĐÃ KẾT THÚC!";
            return;
        }
        
        // Cập nhật trạng thái phòng thành 'playing'
        const { error: updateError } = await supabaseClient
            .from('caro_rooms')
            .update({ status: 'playing' })
            .eq('id', code);
            
        if (updateError) throw updateError;
        
        // Thiết lập trạng thái khách (Guest)
        caroState.roomCode = code;
        caroState.mySymbol = 'O'; // Host là X, khách là O
        caroState.currentTurn = 'X';
        caroState.isMyTurn = false; // Chờ lượt X đánh trước
        caroState.status = 'PLAYING';
        
        // Cập nhật UI
        caroLobby.classList.add('hidden');
        caroGame.classList.remove('hidden');
        displayRoomCode.innerText = code;
        displayTurn.innerText = "X (ĐỐI THỦ)";
        caroStatusText.innerText = "TRẬN ĐẤU BẮT ĐẦU! ĐỐI THỦ ĐI TRƯỚC.";
        
        initCaroBoard();
        
        // Đăng ký lắng nghe Realtime
        subscribeToRoomUpdates(code);
        subscribeToMovesUpdates(code);
        
    } catch (err) {
        console.error(err);
        lobbyMessage.style.color = '#ff3b30';
        lobbyMessage.innerText = "LỖI KHI KẾT NỐI PHÒNG!";
    }
});

// Lắng nghe thay đổi trạng thái phòng (caro_rooms)
function subscribeToRoomUpdates(code) {
    caroState.roomSubscription = supabaseClient
        .channel(`room-status-${code}`)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'caro_rooms', filter: `id=eq.${code}` },
            (payload) => {
                const updatedRoom = payload.new;
                
                // 1. Đối thủ tham gia -> bắt đầu game
                if (updatedRoom.status === 'playing' && caroState.status === 'WAITING') {
                    caroState.status = 'PLAYING';
                    caroStatusText.innerText = "ĐỐI THỦ ĐÃ VÀO PHÒNG! BẮT ĐẦU CHƠI.";
                }
                
                // 2. Phòng kết thúc
                if (updatedRoom.status === 'ended') {
                    caroState.winner = updatedRoom.winner;
                    caroState.status = 'ENDED';
                    
                    if (updatedRoom.winner === 'DRAW') {
                        caroStatusText.innerText = "HÒA CỜ! BÀN CỜ ĐÃ ĐẦY.";
                        displayTurn.innerText = "HÒA";
                    } else {
                        const winMsg = updatedRoom.winner === caroState.mySymbol ? "BẠN CHIẾN THẮNG!" : "ĐỐI THỦ CHIẾN THẮNG!";
                        caroStatusText.innerText = winMsg;
                        displayTurn.innerText = `THẮNG CUỘC: ${updatedRoom.winner}`;
                    }
                    renderCaro();
                }
            }
        )
        .subscribe();
}

// Lắng nghe các nước đi mới chèn vào database (caro_moves)
function subscribeToMovesUpdates(code) {
    caroState.movesSubscription = supabaseClient
        .channel(`room-moves-${code}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'caro_moves', filter: `room_id=eq.${code}` },
            (payload) => {
                const move = payload.new;
                
                // Cập nhật bàn cờ cục bộ
                caroState.board[move.x][move.y] = move.symbol;
                
                // Tính lượt đi kế tiếp
                const nextTurn = move.symbol === 'X' ? 'O' : 'X';
                caroState.currentTurn = nextTurn;
                
                // Xác định xem có phải lượt của mình không
                caroState.isMyTurn = (nextTurn === caroState.mySymbol);
                
                // Cập nhật UI
                displayTurn.innerText = caroState.isMyTurn ? `${nextTurn} (BẠN)` : `${nextTurn} (ĐỐI THỦ)`;
                caroStatusText.innerText = caroState.isMyTurn ? "ĐẾN LƯỢT BẠN ĐÁNH!" : "ĐANG CHỜ ĐỐI THỦ ĐÁNH...";
                
                // Kiểm tra điều kiện thắng cục bộ (cho người đánh)
                checkWin(move.x, move.y, move.symbol);
                
                renderCaro();
            }
        )
        .subscribe();
}

// Đánh cờ Online (gửi lên Supabase)
async function handleOnlineClick(x, y) {
    if (!caroState.isMyTurn || caroState.board[x][y] !== '' || caroState.winner) return;
    
    // Tạm thời khóa click chuột để tránh gửi nước đi đúp
    caroState.isMyTurn = false;
    caroStatusText.innerText = "ĐANG GỬI NƯỚC ĐI...";
    
    // Đếm số lượng nước đi hiện tại để lấy chỉ số move_index
    let moveCount = 0;
    for (let c = 0; c < BOARD_SIZE; c++) {
        for (let r = 0; r < BOARD_SIZE; r++) {
            if (caroState.board[c][r] !== '') moveCount++;
        }
    }
    
    try {
        // 1. Chèn nước đi vào caro_moves
        const { error: moveError } = await supabaseClient
            .from('caro_moves')
            .insert([
                { room_id: caroState.roomCode, move_index: moveCount, x: x, y: y, symbol: caroState.mySymbol }
            ]);
            
        if (moveError) throw moveError;
        
        // 2. Kiểm tra xem nước đi này có thắng không
        let hasWon = checkWin(x, y, caroState.mySymbol);
        let isDraw = !hasWon && checkDraw();
        
        if (hasWon) {
            await supabaseClient
                .from('caro_rooms')
                .update({ status: 'ended', winner: caroState.mySymbol })
                .eq('id', caroState.roomCode);
        } else if (isDraw) {
            await supabaseClient
                .from('caro_rooms')
                .update({ status: 'ended', winner: 'DRAW' })
                .eq('id', caroState.roomCode);
        } else {
            // Cập nhật lượt đi tiếp theo trên bàn cờ caro_rooms
            const nextSymbol = caroState.mySymbol === 'X' ? 'O' : 'X';
            await supabaseClient
                .from('caro_rooms')
                .update({ current_turn: nextSymbol })
                .eq('id', caroState.roomCode);
        }
        
    } catch (err) {
        console.error(err);
        caroStatusText.innerText = "LỖI KHI GỬI NƯỚC ĐI! HÃY THỬ LẠI.";
        caroState.isMyTurn = true; // Cho phép click lại nếu lỗi
    }
}

// Vẽ bàn cờ trống ban đầu khi vừa tải trang
window.addEventListener('DOMContentLoaded', () => {
    initCaroBoard();
});
