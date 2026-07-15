// chess-game.js - Neon Chess (Cờ Vua Cyberpunk)

const chessCanvas = document.getElementById('chessCanvas');
const chessCtx = chessCanvas.getContext('2d');

const chessTurn = document.getElementById('chessTurn');
const chessStatus = document.getElementById('chessStatus');
const chessStatusText = document.getElementById('chessStatusText');
const btnResetChess = document.getElementById('btnResetChess');

const BOARD_SIZE = 8;
const CHESS_CELL_SIZE = chessCanvas.width / BOARD_SIZE; // 400 / 8 = 50px mỗi ô

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const PIECE_SYMBOLS = {
    'k': '♚',
    'q': '♛',
    'r': '♜',
    'b': '♝',
    'n': '♞',
    'p': '♟'
};

// Khởi tạo Chess.js engine
let chess = null;
if (typeof Chess !== 'undefined') {
    chess = new Chess();
} else {
    console.error("Chess.js CDN failed to load!");
}

const chessState = {
    selectedSquare: null, // e.g. 'e2'
    validMoves: [] // Danh sách các nước đi hợp lệ dưới dạng verbose objects từ chess.js
};

// --- LOGIC HÌNH ẢNH & RENDERING ---

function renderChessBoard() {
    if (!chess) return;
    
    // Clear canvas
    chessCtx.fillStyle = '#07080c';
    chessCtx.fillRect(0, 0, chessCanvas.width, chessCanvas.height);
    
    const board = chess.board();
    const isCheck = chess.in_check();
    
    // 1. Vẽ các ô cờ
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const isDark = (r + c) % 2 === 1;
            chessCtx.fillStyle = isDark ? '#161722' : '#2c2d3d';
            chessCtx.fillRect(c * CHESS_CELL_SIZE, r * CHESS_CELL_SIZE, CHESS_CELL_SIZE, CHESS_CELL_SIZE);
            
            // Vẽ số hiệu hàng/cột mờ nhạt (files & ranks)
            if (c === 0) {
                chessCtx.fillStyle = '#8f92a1';
                chessCtx.font = '9px Outfit, sans-serif';
                chessCtx.fillText(RANKS[r], 4, r * CHESS_CELL_SIZE + 12);
            }
            if (r === BOARD_SIZE - 1) {
                chessCtx.fillStyle = '#8f92a1';
                chessCtx.font = '9px Outfit, sans-serif';
                chessCtx.fillText(FILES[c], c * CHESS_CELL_SIZE + CHESS_CELL_SIZE - 10, chessCanvas.height - 4);
            }
        }
    }
    
    // 2. Vẽ viền chiếu tướng đỏ cho Vua
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
                    chessCtx.strokeRect(c * CHESS_CELL_SIZE + 2, r * CHESS_CELL_SIZE + 2, CHESS_CELL_SIZE - 4, CHESS_CELL_SIZE - 4);
                    chessCtx.restore();
                }
            }
        }
    }
    
    // 3. Highlight ô cờ đang chọn (Neon Yellow)
    if (chessState.selectedSquare) {
        const col = FILES.indexOf(chessState.selectedSquare[0]);
        const row = RANKS.indexOf(chessState.selectedSquare[1]);
        
        chessCtx.save();
        chessCtx.shadowBlur = 10;
        chessCtx.shadowColor = '#ffe600';
        chessCtx.strokeStyle = '#ffe600';
        chessCtx.lineWidth = 2.5;
        chessCtx.strokeRect(col * CHESS_CELL_SIZE + 2, row * CHESS_CELL_SIZE + 2, CHESS_CELL_SIZE - 4, CHESS_CELL_SIZE - 4);
        chessCtx.restore();
    }
    
    // 4. Vẽ gợi ý nước đi hợp lệ
    chessState.validMoves.forEach(mv => {
        const col = FILES.indexOf(mv.to[0]);
        const row = RANKS.indexOf(mv.to[1]);
        const targetPiece = board[row][col];
        
        chessCtx.save();
        if (targetPiece) {
            // Nếu ô đích có quân đối thủ -> vẽ viền đỏ/xanh cảnh báo ăn quân
            chessCtx.shadowBlur = 8;
            chessCtx.shadowColor = '#ff7300';
            chessCtx.strokeStyle = '#ff7300';
            chessCtx.lineWidth = 2;
            chessCtx.strokeRect(col * CHESS_CELL_SIZE + 4, row * CHESS_CELL_SIZE + 4, CHESS_CELL_SIZE - 8, CHESS_CELL_SIZE - 8);
        } else {
            // Ô trống -> vẽ chấm tròn cyan phát sáng
            chessCtx.shadowBlur = 8;
            chessCtx.shadowColor = '#00f0ff';
            chessCtx.fillStyle = 'rgba(0, 240, 255, 0.6)';
            chessCtx.beginPath();
            chessCtx.arc(col * CHESS_CELL_SIZE + CHESS_CELL_SIZE / 2, row * CHESS_CELL_SIZE + CHESS_CELL_SIZE / 2, 6, 0, Math.PI * 2);
            chessCtx.fill();
        }
        chessCtx.restore();
    });
    
    // 5. Vẽ các quân cờ
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const piece = board[r][c];
            if (piece) {
                chessCtx.save();
                chessCtx.font = '36px Arial';
                chessCtx.textAlign = 'center';
                chessCtx.textBaseline = 'middle';
                
                // Thiết lập phát sáng neon theo màu quân cờ
                if (piece.color === 'w') {
                    // Quân trắng: Neon Cyan
                    chessCtx.shadowBlur = 8;
                    chessCtx.shadowColor = '#00f0ff';
                    chessCtx.fillStyle = '#00f0ff';
                } else {
                    // Quân đen: Neon Pink
                    chessCtx.shadowBlur = 8;
                    chessCtx.shadowColor = '#ff007f';
                    chessCtx.fillStyle = '#ff007f';
                }
                
                const symbol = PIECE_SYMBOLS[piece.type] || '';
                chessCtx.fillText(symbol, c * CHESS_CELL_SIZE + CHESS_CELL_SIZE / 2, r * CHESS_CELL_SIZE + CHESS_CELL_SIZE / 2 + 2);
                chessCtx.restore();
            }
        }
    }
}

// Cập nhật trạng thái trận đấu lên màn hình
function updateChessStatus() {
    if (!chess) return;
    
    // Cập nhật lượt đi
    const turn = chess.turn();
    chessTurn.innerText = turn === 'w' ? 'TRẮNG' : 'ĐEN';
    chessTurn.style.color = turn === 'w' ? '#00f0ff' : '#ff007f';
    chessTurn.style.textShadow = turn === 'w' ? '0 0 8px #00f0ff' : '0 0 8px #ff007f';
    
    // Trạng thái Chiếu tướng
    if (chess.in_check()) {
        chessStatus.classList.remove('hidden');
    } else {
        chessStatus.classList.add('hidden');
    }
    
    // Trạng thái kết thúc game
    if (chess.in_checkmate()) {
        const winner = turn === 'w' ? 'ĐEN' : 'TRẮNG';
        chessStatusText.innerText = `CHIẾU BÍ! QUÂN ${winner} THẮNG CUỘC.`;
        chessStatusText.style.color = '#ff3b30';
    } else if (chess.in_draw()) {
        chessStatusText.innerText = "TRẬN ĐẤU HÒA (HÒA CỜ / STALEMATE)!";
        chessStatusText.style.color = '#ffe600';
    } else {
        chessStatusText.innerText = "CLICK QUÂN CỜ ĐỂ DI CHUYỂN";
        chessStatusText.style.color = '#ffe600';
    }
}

// Reset lại ván cờ
function resetChessGame() {
    if (!chess) return;
    chess.reset();
    chessState.selectedSquare = null;
    chessState.validMoves = [];
    renderChessBoard();
    updateChessStatus();
}

// --- XỬ LÝ CLICK CHUỘT ---

chessCanvas.addEventListener('click', (e) => {
    if (!chess) return;
    if (chess.game_over()) return; // Ván cờ đã kết thúc
    
    // Tọa độ click chuột trên canvas
    const rect = chessCanvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Ô cờ tương ứng
    const col = Math.floor(clickX / CHESS_CELL_SIZE);
    const row = Math.floor(clickY / CHESS_CELL_SIZE);
    
    const square = FILES[col] + RANKS[row];
    const piece = chess.get(square);
    const turn = chess.turn();
    
    // 1. Nếu chưa chọn quân cờ nào
    if (!chessState.selectedSquare) {
        if (piece && piece.color === turn) {
            // Chọn quân của mình
            chessState.selectedSquare = square;
            chessState.validMoves = chess.moves({ square: square, verbose: true });
        }
    } else {
        // 2. Đang chọn quân cờ
        // Kiểm tra xem click vào ô đi hợp lệ không
        const isMoveValid = chessState.validMoves.some(mv => mv.to === square);
        
        if (isMoveValid) {
            // Thực hiện di chuyển nước đi cờ
            // Hỗ trợ tự động phong cấp Tốt thành Hậu (Promotion to Queen)
            const sourcePiece = chess.get(chessState.selectedSquare);
            const isPromotion = sourcePiece && sourcePiece.type === 'p' && (square[1] === '8' || square[1] === '1');
            
            chess.move({
                from: chessState.selectedSquare,
                to: square,
                promotion: isPromotion ? 'q' : undefined
            });
            
            // Xóa vùng chọn
            chessState.selectedSquare = null;
            chessState.validMoves = [];
            
            // Cập nhật trạng thái
            updateChessStatus();
        } else {
            // Nếu click sang quân khác cùng màu
            if (piece && piece.color === turn) {
                chessState.selectedSquare = square;
                chessState.validMoves = chess.moves({ square: square, verbose: true });
            } else {
                // Click ra ô ngoài không hợp lệ -> hủy chọn
                chessState.selectedSquare = null;
                chessState.validMoves = [];
            }
        }
    }
    
    renderChessBoard();
});

// Nút chơi lại
if (btnResetChess) {
    btnResetChess.addEventListener('click', () => {
        resetChessGame();
    });
}

// Tự động khởi chạy lần đầu
window.addEventListener('DOMContentLoaded', () => {
    resetChessGame();
});
