/**
 * xiangqi.js - Neon Chinese Chess (Cờ Tướng) Multiplayer với Supabase Broadcast
 * Tự viết hoàn toàn Engine Luật Cờ Tướng (7 loại quân, cản chân mã, cản mắt tượng, cung tướng sĩ, gánh pháo)
 */

(function () {
    // --- DOM Elements ---
    const xiangqiLobby = document.getElementById('xiangqiLobby');
    const xiangqiGame = document.getElementById('xiangqiGame');
    const xiangqiNicknameInput = document.getElementById('xiangqiNicknameInput');
    const btnXiangqiCreateRoom = document.getElementById('btnXiangqiCreateRoom');
    const xiangqiRoomCodeInput = document.getElementById('xiangqiRoomCodeInput');
    const btnXiangqiJoinRoom = document.getElementById('btnXiangqiJoinRoom');
    const xiangqiLobbyMessage = document.getElementById('xiangqiLobbyMessage');

    const xiangqiDisplayRoomCode = document.getElementById('xiangqiDisplayRoomCode');
    const xiangqiTurn = document.getElementById('xiangqiTurn');
    const xiangqiStatus = document.getElementById('xiangqiStatus');
    const xiangqiCanvas = document.getElementById('xiangqiCanvas');
    const xiangqiCtx = xiangqiCanvas.getContext('2d');
    const xiangqiStatusText = document.getElementById('xiangqiStatusText');
    const btnResetXiangqi = document.getElementById('btnResetXiangqi');
    const btnLeaveXiangqi = document.getElementById('btnLeaveXiangqi');

    const xiangqiChatHistory = document.getElementById('xiangqiChatHistory');
    const xiangqiChatInput = document.getElementById('xiangqiChatInput');
    const btnXiangqiSendChat = document.getElementById('btnXiangqiSendChat');

    // --- GAME STATE ---
    // Quân cờ đỏ viết hoa: R, G, A, B, H, C, P
    // Quân cờ đen viết thường: r, g, a, b, h, c, p
    // R/r: Xe (Rook/Chariot)
    // H/h: Mã (Horse/Knight)
    // B/b: Tượng (Bishop/Elephant)
    // A/a: Sĩ (Advisor/Guard)
    // G/g: Tướng (General/King)
    // C/c: Pháo (Cannon)
    // P/p: Tốt (Pawn/Soldier)
    // null: Ô trống
    const INITIAL_BOARD = [
        ['r', 'h', 'b', 'a', 'g', 'a', 'b', 'h', 'r'],
        [null, null, null, null, null, null, null, null, null],
        [null, 'c', null, null, null, null, null, 'c', null],
        ['p', null, 'p', null, 'p', null, 'p', null, 'p'],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        ['P', null, 'P', null, 'P', null, 'P', null, 'P'],
        [null, 'C', null, null, null, null, null, 'C', null],
        [null, null, null, null, null, null, null, null, null],
        ['R', 'H', 'B', 'A', 'G', 'A', 'B', 'H', 'R']
    ];

    const state = {
        status: 'LOBBY', // LOBBY | WAITING | PLAYING | ENDED
        board: JSON.parse(JSON.stringify(INITIAL_BOARD)),
        turn: 'w', // 'w' = Đỏ (Red - đi trước), 'b' = Đen (Black)
        nickname: '',
        roomCode: '',
        myColor: 'w', // 'w' (Host) hoặc 'b' (Guest)
        opponentName: 'Đối thủ',
        selectedPiece: null, // { r, c }
        validMoves: [], // [{ r, c }]
        // Supabase
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
        xiangqiLobbyMessage.innerText = msg;
        xiangqiLobbyMessage.style.color = isError ? '#ff3b30' : '#00f0ff';
    }

    function addChatMsg(text, type) {
        const div = document.createElement('div');
        div.classList.add('chat-msg', type);
        div.textContent = text;
        xiangqiChatHistory.appendChild(div);
        xiangqiChatHistory.scrollTop = xiangqiChatHistory.scrollHeight;
    }

    // --- GAME ENGINE RULES ---
    function isRed(piece) {
        return piece && piece === piece.toUpperCase();
    }

    function getPieceColor(piece) {
        if (!piece) return null;
        return isRed(piece) ? 'w' : 'b';
    }

    // Lấy tất cả nước đi hợp lệ của quân cờ tại vị trí (r, c)
    function getValidMoves(r, c, boardState = state.board) {
        const piece = boardState[r][c];
        if (!piece) return [];
        const color = getPieceColor(piece);
        const moves = [];

        // Hướng đi/Giới hạn cho từng loại quân
        switch (piece.toLowerCase()) {
            case 'g': { // Tướng: Đi trong cung 3x3, 1 bước dọc/ngang
                const colMin = 3, colMax = 5;
                const rowMin = color === 'w' ? 7 : 0;
                const rowMax = color === 'w' ? 9 : 2;
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                for (const [dr, dc] of dirs) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= rowMin && nr <= rowMax && nc >= colMin && nc <= colMax) {
                        const targetColor = getPieceColor(boardState[nr][nc]);
                        if (targetColor !== color) {
                            moves.push({ r: nr, c: nc });
                        }
                    }
                }
                break;
            }
            case 'a': { // Sĩ: Đi chéo 1 ô trong cung 3x3
                const colMin = 3, colMax = 5;
                const rowMin = color === 'w' ? 7 : 0;
                const rowMax = color === 'w' ? 9 : 2;
                const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
                for (const [dr, dc] of dirs) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= rowMin && nr <= rowMax && nc >= colMin && nc <= colMax) {
                        const targetColor = getPieceColor(boardState[nr][nc]);
                        if (targetColor !== color) {
                            moves.push({ r: nr, c: nc });
                        }
                    }
                }
                break;
            }
            case 'b': { // Tượng: Đi chéo 2 ô, không được qua sông, cản mắt tượng
                const dirs = [[-2, -2, -1, -1], [-2, 2, -1, 1], [2, -2, 1, -1], [2, 2, 1, 1]];
                const isRedSide = color === 'w';
                for (const [dr, dc, mr, mc] of dirs) {
                    const nr = r + dr, nc = c + dc;
                    const eyeR = r + mr, eyeC = c + mc;
                    if (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
                        // Kiểm tra không qua sông
                        if (isRedSide && nr < 5) continue;
                        if (!isRedSide && nr > 4) continue;
                        // Kiểm tra cản mắt tượng
                        if (boardState[eyeR][eyeC] === null) {
                            const targetColor = getPieceColor(boardState[nr][nc]);
                            if (targetColor !== color) {
                                moves.push({ r: nr, c: nc });
                            }
                        }
                    }
                }
                break;
            }
            case 'h': { // Mã: Đi hình chữ L (2x1), cản chân mã
                const movesOffsets = [
                    { dr: -2, dc: -1, cr: -1, cc: 0 },
                    { dr: -2, dc: 1, cr: -1, cc: 0 },
                    { dr: 2, dc: -1, cr: 1, cc: 0 },
                    { dr: 2, dc: 1, cr: 1, cc: 0 },
                    { dr: -1, dc: -2, cr: 0, cc: -1 },
                    { dr: 1, dc: -2, cr: 0, cc: -1 },
                    { dr: -1, dc: 2, cr: 0, cc: 1 },
                    { dr: 1, dc: 2, cr: 0, cc: 1 }
                ];
                for (const m of movesOffsets) {
                    const nr = r + m.dr, nc = c + m.dc;
                    const checkR = r + m.cr, checkC = c + m.cc;
                    if (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
                        // Kiểm tra chân mã
                        if (boardState[checkR][checkC] === null) {
                            const targetColor = getPieceColor(boardState[nr][nc]);
                            if (targetColor !== color) {
                                moves.push({ r: nr, c: nc });
                            }
                        }
                    }
                }
                break;
            }
            case 'r': { // Xe: Đi dọc/ngang không giới hạn cho tới khi gặp quân cản
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                for (const [dr, dc] of dirs) {
                    let nr = r + dr, nc = c + dc;
                    while (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
                        const targetColor = getPieceColor(boardState[nr][nc]);
                        if (boardState[nr][nc] === null) {
                            moves.push({ r: nr, c: nc });
                        } else {
                            if (targetColor !== color) {
                                moves.push({ r: nr, c: nc });
                            }
                            break; // Gặp cản
                        }
                        nr += dr;
                        nc += dc;
                    }
                }
                break;
            }
            case 'c': { // Pháo: Đi như xe, nhưng ăn quân cần nhảy qua đúng 1 quân cản
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                for (const [dr, dc] of dirs) {
                    let nr = r + dr, nc = c + dc;
                    let jumped = false;
                    while (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
                        const cell = boardState[nr][nc];
                        if (!jumped) {
                            if (cell === null) {
                                moves.push({ r: nr, c: nc });
                            } else {
                                jumped = true; // Gặp quân cản thứ nhất
                            }
                        } else {
                            if (cell !== null) {
                                const targetColor = getPieceColor(cell);
                                if (targetColor !== color) {
                                    moves.push({ r: nr, c: nc }); // Ăn quân
                                }
                                break; // Dừng lại sau khi gặp quân cản thứ hai
                            }
                        }
                        nr += dr;
                        nc += dc;
                    }
                }
                break;
            }
            case 'p': { // Tốt: Đi 1 ô dọc/ngang, tùy thuộc đã qua sông chưa
                const isRedSide = color === 'w';
                if (isRedSide) {
                    // Đỏ đi tiến lên (nr = r - 1)
                    if (r - 1 >= 0 && getPieceColor(boardState[r - 1][c]) !== 'w') {
                        moves.push({ r: r - 1, c });
                    }
                    // Nếu đã qua sông (r <= 4), được đi ngang
                    if (r <= 4) {
                        if (c - 1 >= 0 && getPieceColor(boardState[r][c - 1]) !== 'w') moves.push({ r, c: c - 1 });
                        if (c + 1 < 9 && getPieceColor(boardState[r][c + 1]) !== 'w') moves.push({ r, c: c + 1 });
                    }
                } else {
                    // Đen đi tiến xuống (nr = r + 1)
                    if (r + 1 < 10 && getPieceColor(boardState[r + 1][c]) !== 'b') {
                        moves.push({ r: r + 1, c });
                    }
                    // Nếu đã qua sông (r >= 5), được đi ngang
                    if (r >= 5) {
                        if (c - 1 >= 0 && getPieceColor(boardState[r][c - 1]) !== 'b') moves.push({ r, c: c - 1 });
                        if (c + 1 < 9 && getPieceColor(boardState[r][c + 1]) !== 'b') moves.push({ r, c: c + 1 });
                    }
                }
                break;
            }
        }

        // --- LUẬT BỔ SUNG: Không cho phép Lộ mặt Tướng ---
        // Lọc bỏ những nước đi dẫn tới việc 2 Tướng đối mặt trực tiếp không có quân cản
        return moves.filter(move => {
            // Thử nước đi ảo
            const origSource = boardState[r][c];
            const origDest = boardState[move.r][move.c];
            boardState[r][c] = null;
            boardState[move.r][move.c] = origSource;

            const safe = !isKingFacing(boardState);

            // Hoàn tác
            boardState[r][c] = origSource;
            boardState[move.r][move.c] = origDest;

            return safe;
        });
    }

    // Kiểm tra xem hai tướng có đối mặt nhau trực diện không
    function isKingFacing(boardState = state.board) {
        let redKing = null;
        let blackKing = null;
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                if (boardState[r][c] === 'G') redKing = { r, c };
                if (boardState[r][c] === 'g') blackKing = { r, c };
            }
        }
        if (!redKing || !blackKing) return false;
        if (redKing.c !== blackKing.c) return false; // Không chung cột

        // Kiểm tra xem ở giữa có quân cản nào không
        const col = redKing.c;
        const minRow = Math.min(redKing.r, blackKing.r);
        const maxRow = Math.max(redKing.r, blackKing.r);
        for (let r = minRow + 1; r < maxRow; r++) {
            if (boardState[r][col] !== null) return false; // Có cản
        }
        return true; // Hai tướng đối mặt trực diện
    }

    // Kiểm tra xem tướng của phe `color` có đang bị chiếu không
    function isKingInCheck(color, boardState = state.board) {
        let kingPos = null;
        const kingChar = color === 'w' ? 'G' : 'g';
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                if (boardState[r][c] === kingChar) {
                    kingPos = { r, c };
                    break;
                }
            }
            if (kingPos) break;
        }
        if (!kingPos) return false;

        // Quét toàn bộ quân của đối thủ xem có quân nào ăn được Tướng ở bước tiếp theo không
        const opponentColor = color === 'w' ? 'b' : 'w';
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = boardState[r][c];
                if (piece && getPieceColor(piece) === opponentColor) {
                    // Nhận nước đi thô, tạm bỏ lọc lộ mặt tướng để tránh đệ quy vô hạn
                    const rawMoves = getValidMovesRaw(r, c, boardState);
                    if (rawMoves.some(m => m.r === kingPos.r && m.c === kingPos.c)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Logic lấy nước đi thô (không lọc tránh lộ mặt tướng để phục vụ kiểm tra chiếu tướng)
    function getValidMovesRaw(r, c, boardState) {
        const piece = boardState[r][c];
        if (!piece) return [];
        const color = getPieceColor(piece);
        const moves = [];

        switch (piece.toLowerCase()) {
            case 'g': {
                const colMin = 3, colMax = 5;
                const rowMin = color === 'w' ? 7 : 0;
                const rowMax = color === 'w' ? 9 : 2;
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                for (const [dr, dc] of dirs) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= rowMin && nr <= rowMax && nc >= colMin && nc <= colMax) {
                        const targetColor = getPieceColor(boardState[nr][nc]);
                        if (targetColor !== color) moves.push({ r: nr, c: nc });
                    }
                }
                break;
            }
            case 'a': {
                const colMin = 3, colMax = 5;
                const rowMin = color === 'w' ? 7 : 0;
                const rowMax = color === 'w' ? 9 : 2;
                const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
                for (const [dr, dc] of dirs) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= rowMin && nr <= rowMax && nc >= colMin && nc <= colMax) {
                        const targetColor = getPieceColor(boardState[nr][nc]);
                        if (targetColor !== color) moves.push({ r: nr, c: nc });
                    }
                }
                break;
            }
            case 'b': {
                const dirs = [[-2, -2, -1, -1], [-2, 2, -1, 1], [2, -2, 1, -1], [2, 2, 1, 1]];
                const isRedSide = color === 'w';
                for (const [dr, dc, mr, mc] of dirs) {
                    const nr = r + dr, nc = c + dc;
                    const eyeR = r + mr, eyeC = c + mc;
                    if (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
                        if (isRedSide && nr < 5) continue;
                        if (!isRedSide && nr > 4) continue;
                        if (boardState[eyeR][eyeC] === null) {
                            const targetColor = getPieceColor(boardState[nr][nc]);
                            if (targetColor !== color) moves.push({ r: nr, c: nc });
                        }
                    }
                }
                break;
            }
            case 'h': {
                const movesOffsets = [
                    { dr: -2, dc: -1, cr: -1, cc: 0 },
                    { dr: -2, dc: 1, cr: -1, cc: 0 },
                    { dr: 2, dc: -1, cr: 1, cc: 0 },
                    { dr: 2, dc: 1, cr: 1, cc: 0 },
                    { dr: -1, dc: -2, cr: 0, cc: -1 },
                    { dr: 1, dc: -2, cr: 0, cc: -1 },
                    { dr: -1, dc: 2, cr: 0, cc: 1 },
                    { dr: 1, dc: 2, cr: 0, cc: 1 }
                ];
                for (const m of movesOffsets) {
                    const nr = r + m.dr, nc = c + m.dc;
                    const checkR = r + m.cr, checkC = c + m.cc;
                    if (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
                        if (boardState[checkR][checkC] === null) {
                            const targetColor = getPieceColor(boardState[nr][nc]);
                            if (targetColor !== color) moves.push({ r: nr, c: nc });
                        }
                    }
                }
                break;
            }
            case 'r': {
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                for (const [dr, dc] of dirs) {
                    let nr = r + dr, nc = c + dc;
                    while (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
                        const targetColor = getPieceColor(boardState[nr][nc]);
                        if (boardState[nr][nc] === null) {
                            moves.push({ r: nr, c: nc });
                        } else {
                            if (targetColor !== color) moves.push({ r: nr, c: nc });
                            break;
                        }
                        nr += dr;
                        nc += dc;
                    }
                }
                break;
            }
            case 'c': {
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                for (const [dr, dc] of dirs) {
                    let nr = r + dr, nc = c + dc;
                    let jumped = false;
                    while (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
                        const cell = boardState[nr][nc];
                        if (!jumped) {
                            if (cell === null) {
                                moves.push({ r: nr, c: nc });
                            } else {
                                jumped = true;
                            }
                        } else {
                            if (cell !== null) {
                                const targetColor = getPieceColor(cell);
                                if (targetColor !== color) moves.push({ r: nr, c: nc });
                                break;
                            }
                        }
                        nr += dr;
                        nc += dc;
                    }
                }
                break;
            }
            case 'p': {
                const isRedSide = color === 'w';
                if (isRedSide) {
                    if (r - 1 >= 0 && getPieceColor(boardState[r - 1][c]) !== 'w') moves.push({ r: r - 1, c });
                    if (r <= 4) {
                        if (c - 1 >= 0 && getPieceColor(boardState[r][c - 1]) !== 'w') moves.push({ r, c: c - 1 });
                        if (c + 1 < 9 && getPieceColor(boardState[r][c + 1]) !== 'w') moves.push({ r, c: c + 1 });
                    }
                } else {
                    if (r + 1 < 10 && getPieceColor(boardState[r + 1][c]) !== 'b') moves.push({ r: r + 1, c });
                    if (r >= 5) {
                        if (c - 1 >= 0 && getPieceColor(boardState[r][c - 1]) !== 'b') moves.push({ r, c: c - 1 });
                        if (c + 1 < 9 && getPieceColor(boardState[r][c + 1]) !== 'b') moves.push({ r, c: c + 1 });
                    }
                }
                break;
            }
        }
        return moves;
    }

    // Kiểm tra xem phe `color` có bất kỳ nước đi hợp lệ nào không. Nếu không → Chiếu bí / Thua cuộc
    function hasAnyValidMoves(color) {
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = state.board[r][c];
                if (piece && getPieceColor(piece) === color) {
                    const moves = getValidMoves(r, c);
                    if (moves.length > 0) return true;
                }
            }
        }
        return false;
    }

    // --- DRAWING CANVAS BOARD ---
    const CELL_SIZE = 46;
    const MARGIN_X = 41; // Căn lề để vẽ lưới chính xác 9x10 (450 x 500)
    const MARGIN_Y = 43;

    function drawXiangqiPiece(ctx, piece, r, c, x, y, isSelected) {
        const isSelectedSquare = isSelected;
        const color = getPieceColor(piece);

        // Tạo bóng tỏa neon Cyberpunk
        ctx.shadowBlur = isSelectedSquare ? 15 : 6;
        ctx.shadowColor = color === 'w' ? '#ff3b30' : '#00f0ff';

        // Vẽ thân quân cờ (nền tròn màu tối)
        ctx.fillStyle = '#07080c';
        ctx.strokeStyle = color === 'w' ? '#ff3b30' : '#00f0ff';
        ctx.lineWidth = 2.5;
        
        ctx.beginPath();
        ctx.arc(x, y, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Tắt shadow để vẽ nội dung chữ rõ nét
        ctx.shadowBlur = 0;

        // Vẽ vòng tròn trang trí đồng tâm bên trong quân cờ
        ctx.strokeStyle = color === 'w' ? '#ff3b3099' : '#00f0ff99';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.stroke();

        // Vẽ nhãn quân cờ tiếng Trung
        ctx.fillStyle = color === 'w' ? '#ff3b30' : '#00f0ff';
        ctx.font = 'bold 16px "Microsoft YaHei", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let label = '';
        if (color === 'w') {
            switch (piece) {
                case 'R': label = '俥'; break;
                case 'H': label = '傌'; break;
                case 'B': label = '相'; break;
                case 'A': label = '仕'; break;
                case 'G': label = '帥'; break;
                case 'C': label = '炮'; break;
                case 'P': label = '兵'; break;
            }
        } else {
            switch (piece) {
                case 'r': label = '車'; break;
                case 'h': label = '馬'; break;
                case 'b': label = '象'; break;
                case 'a': label = '士'; break;
                case 'g': label = '將'; break;
                case 'c': label = '砲'; break;
                case 'p': label = '卒'; break;
            }
        }
        ctx.fillText(label, x, y);
    }

    function renderBoard() {
        // Xóa bảng
        xiangqiCtx.fillStyle = '#07080c';
        xiangqiCtx.fillRect(0, 0, xiangqiCanvas.width, xiangqiCanvas.height);

        // Vẽ đường lưới bàn cờ (9 cột, 10 hàng)
        xiangqiCtx.strokeStyle = '#1f2d3d';
        xiangqiCtx.lineWidth = 1.5;

        // 1. Vẽ các đường ngang dọc cơ bản
        for (let r = 0; r < 10; r++) {
            const y = MARGIN_Y + r * CELL_SIZE;
            xiangqiCtx.beginPath();
            xiangqiCtx.moveTo(MARGIN_X, y);
            xiangqiCtx.lineTo(MARGIN_X + 8 * CELL_SIZE, y);
            xiangqiCtx.stroke();
        }

        // Vẽ đường dọc có ngắt ở dòng sông (Hàng 4 -> 5)
        for (let c = 0; c < 9; c++) {
            const x = MARGIN_X + c * CELL_SIZE;
            // Nửa trên bàn cờ
            xiangqiCtx.beginPath();
            xiangqiCtx.moveTo(x, MARGIN_Y);
            xiangqiCtx.lineTo(x, MARGIN_Y + 4 * CELL_SIZE);
            xiangqiCtx.stroke();
            // Nửa dưới bàn cờ
            xiangqiCtx.beginPath();
            xiangqiCtx.moveTo(x, MARGIN_Y + 5 * CELL_SIZE);
            xiangqiCtx.lineTo(x, MARGIN_Y + 9 * CELL_SIZE);
            xiangqiCtx.stroke();
        }

        // Vẽ viền ngoài cho bàn cờ
        xiangqiCtx.strokeStyle = '#00f0ff';
        xiangqiCtx.lineWidth = 2.5;
        xiangqiCtx.shadowBlur = 10;
        xiangqiCtx.shadowColor = '#00f0ff';
        xiangqiCtx.strokeRect(MARGIN_X - 4, MARGIN_Y - 4, 8 * CELL_SIZE + 8, 9 * CELL_SIZE + 8);
        xiangqiCtx.shadowBlur = 0; // reset

        // 2. Vẽ Cung (Palace) 3x3 (Cột 3,4,5 ở hai đầu)
        xiangqiCtx.strokeStyle = '#1f2d3d';
        xiangqiCtx.lineWidth = 1.5;
        // Cung trên
        xiangqiCtx.beginPath();
        xiangqiCtx.moveTo(MARGIN_X + 3 * CELL_SIZE, MARGIN_Y);
        xiangqiCtx.lineTo(MARGIN_X + 5 * CELL_SIZE, MARGIN_Y + 2 * CELL_SIZE);
        xiangqiCtx.moveTo(MARGIN_X + 5 * CELL_SIZE, MARGIN_Y);
        xiangqiCtx.lineTo(MARGIN_X + 3 * CELL_SIZE, MARGIN_Y + 2 * CELL_SIZE);
        xiangqiCtx.stroke();

        // Cung dưới
        xiangqiCtx.beginPath();
        xiangqiCtx.moveTo(MARGIN_X + 3 * CELL_SIZE, MARGIN_Y + 7 * CELL_SIZE);
        xiangqiCtx.lineTo(MARGIN_X + 5 * CELL_SIZE, MARGIN_Y + 9 * CELL_SIZE);
        xiangqiCtx.moveTo(MARGIN_X + 5 * CELL_SIZE, MARGIN_Y + 7 * CELL_SIZE);
        xiangqiCtx.lineTo(MARGIN_X + 3 * CELL_SIZE, MARGIN_Y + 9 * CELL_SIZE);
        xiangqiCtx.stroke();

        // 3. Vẽ Sông (River)
        xiangqiCtx.fillStyle = '#ff007f33';
        xiangqiCtx.fillRect(MARGIN_X, MARGIN_Y + 4 * CELL_SIZE, 8 * CELL_SIZE, CELL_SIZE);
        xiangqiCtx.fillStyle = '#ffffff1a';
        xiangqiCtx.font = 'italic 16px Arial';
        xiangqiCtx.textAlign = 'center';
        xiangqiCtx.textBaseline = 'middle';
        xiangqiCtx.fillText('楚 河', MARGIN_X + 2.5 * CELL_SIZE, MARGIN_Y + 4.5 * CELL_SIZE);
        xiangqiCtx.fillText('漢 界', MARGIN_X + 5.5 * CELL_SIZE, MARGIN_Y + 4.5 * CELL_SIZE);

        // 4. Vẽ các vị trí đặt Pháo và Tốt (dấu góc chéo nhỏ)
        const markerPositions = [
            { r: 2, c: 1 }, { r: 2, c: 7 }, // Pháo đen
            { r: 7, c: 1 }, { r: 7, c: 7 }, // Pháo đỏ
            { r: 3, c: 0 }, { r: 3, c: 2 }, { r: 3, c: 4 }, { r: 3, c: 6 }, { r: 3, c: 8 }, // Tốt đen
            { r: 6, c: 0 }, { r: 6, c: 2 }, { r: 6, c: 4 }, { r: 6, c: 6 }, { r: 6, c: 8 }  // Tốt đỏ
        ];

        function drawMarker(ctx, r, c) {
            const x = MARGIN_X + c * CELL_SIZE;
            const y = MARGIN_Y + r * CELL_SIZE;
            const size = 6;
            const gap = 3;
            ctx.strokeStyle = '#1f2d3d';
            ctx.lineWidth = 1;
            
            // Vẽ các góc xung quanh điểm giao lộ
            const drawAngle = (dx, dy) => {
                ctx.beginPath();
                ctx.moveTo(x + dx * gap, y + dy * (gap + size));
                ctx.lineTo(x + dx * gap, y + dy * gap);
                ctx.lineTo(x + dx * (gap + size), y + dy * gap);
                ctx.stroke();
            };

            if (c > 0) { drawAngle(-1, -1); drawAngle(-1, 1); }
            if (c < 8) { drawAngle(1, -1); drawAngle(1, 1); }
        }
        markerPositions.forEach(pos => drawMarker(xiangqiCtx, pos.r, pos.c));

        // 5. Vẽ gợi ý nước đi hợp lệ (Valid Move Indicators)
        state.validMoves.forEach(m => {
            const x = MARGIN_X + m.c * CELL_SIZE;
            const y = MARGIN_Y + m.r * CELL_SIZE;
            
            // Chấm tròn nhỏ phát sáng chỉ thị nước đi
            xiangqiCtx.fillStyle = '#39ff14';
            xiangqiCtx.shadowBlur = 8;
            xiangqiCtx.shadowColor = '#39ff14';
            xiangqiCtx.beginPath();
            xiangqiCtx.arc(x, y, 6, 0, Math.PI * 2);
            xiangqiCtx.fill();
            xiangqiCtx.shadowBlur = 0; // reset
        });

        // 6. Vẽ các quân cờ
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = state.board[r][c];
                if (piece) {
                    const x = MARGIN_X + c * CELL_SIZE;
                    const y = MARGIN_Y + r * CELL_SIZE;
                    const isSelected = state.selectedPiece && state.selectedPiece.r === r && state.selectedPiece.c === c;
                    
                    // Nếu là Đen và mình chơi bên Đen -> Đảo ngược bàn cờ (hoặc không, cờ tướng thường vẽ góc nhìn từ phía Đỏ dưới và lật tọa độ khi hiển thị)
                    // Để đơn giản và tối ưu: vẽ nguyên bản tọa độ, Host Đỏ ở dưới, Guest Đen ở trên
                    drawXiangqiPiece(xiangqiCtx, piece, r, c, x, y, isSelected);
                }
            }
        }
    }

    // --- GAME ACTIONS & STATE SYNCHRONIZATION ---
    function updateTurnIndicator() {
        xiangqiTurn.innerText = state.turn === 'w' ? 'ĐỎ' : 'ĐEN';
        xiangqiTurn.style.color = state.turn === 'w' ? '#ff3b30' : '#00f0ff';
        
        // Kiểm tra xem phe hiện tại có đang bị chiếu hay không
        const inCheck = isKingInCheck(state.turn);
        if (inCheck) {
            xiangqiStatus.classList.remove('hidden');
            xiangqiStatus.innerText = 'CHIẾU TƯỚNG!';
        } else {
            xiangqiStatus.classList.add('hidden');
        }

        // Cập nhật dòng trạng thái chân trang
        if (state.status === 'PLAYING') {
            const myTurn = (state.myColor === state.turn);
            if (myTurn) {
                xiangqiStatusText.innerText = 'LƯỢT CỦA BẠN. Hãy chọn quân cờ và di chuyển.';
                xiangqiStatusText.style.color = '#39ff14';
            } else {
                xiangqiStatusText.innerText = `Lượt của ${state.opponentName} (${state.turn === 'w' ? 'Đỏ' : 'Đen'})...`;
                xiangqiStatusText.style.color = '#ff9500';
            }
        }
    }

    function checkGameEnd() {
        // Kiểm tra xem phe hiện tại có mất Tướng hoặc không còn nước đi
        const inCheck = isKingInCheck(state.turn);
        const hasMoves = hasAnyValidMoves(state.turn);

        if (!hasMoves) {
            state.status = 'ENDED';
            const winner = state.turn === 'w' ? 'b' : 'w'; // Người chơi lượt này không còn nước đi hợp lệ -> bên kia thắng
            const winnerName = winner === state.myColor ? 'BẠN' : state.opponentName;
            
            xiangqiStatusText.innerText = `TRÒ CHƠI KẾT THÚC! ${winnerName} GIÀNH CHIẾN THẮNG.`;
            xiangqiStatusText.style.color = '#39ff14';
            
            btnResetXiangqi.classList.remove('hidden');
            return true;
        }
        return false;
    }

    // --- CANVAS INPUT CONTROLLERS ---
    xiangqiCanvas.addEventListener('mousedown', function (e) {
        if (state.status !== 'PLAYING') return;
        if (state.myColor !== state.turn) return; // Không phải lượt của mình

        const rect = xiangqiCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Tìm điểm giao lộ gần nhất trong bán kính ô
        let targetR = -1;
        let targetC = -1;
        let minDist = 25;

        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const px = MARGIN_X + c * CELL_SIZE;
                const py = MARGIN_Y + r * CELL_SIZE;
                const dist = Math.hypot(mouseX - px, mouseY - py);
                if (dist < minDist) {
                    minDist = dist;
                    targetR = r;
                    targetC = c;
                }
            }
        }

        if (targetR === -1 || targetC === -1) return;

        const piece = state.board[targetR][targetC];

        // Nếu đã chọn quân trước đó, và click vào ô nước đi hợp lệ -> Di chuyển
        const isClickValidMove = state.validMoves.some(m => m.r === targetR && m.c === targetC);
        if (state.selectedPiece && isClickValidMove) {
            makeMove(state.selectedPiece.r, state.selectedPiece.c, targetR, targetC);
            return;
        }

        // Chọn quân cờ cùng màu của mình
        if (piece && getPieceColor(piece) === state.myColor) {
            state.selectedPiece = { r: targetR, c: targetC };
            state.validMoves = getValidMoves(targetR, targetC);
            renderBoard();
        } else {
            // Click ô trống hoặc quân đối thủ không hợp lệ -> hủy chọn
            state.selectedPiece = null;
            state.validMoves = [];
            renderBoard();
        }
    });

    function makeMove(fromR, fromC, toR, toC) {
        const piece = state.board[fromR][fromC];
        state.board[toR][toC] = piece;
        state.board[fromR][fromC] = null;

        state.selectedPiece = null;
        state.validMoves = [];

        // Chuyển lượt
        state.turn = state.turn === 'w' ? 'b' : 'w';

        // Gửi nước đi sang bên kia
        if (state.gameChannel) {
            state.gameChannel.send({
                type: 'broadcast',
                event: 'move',
                payload: { fromR, fromC, toR, toC, turn: state.turn }
            });
        }

        renderBoard();
        updateTurnIndicator();
        checkGameEnd();
    }

    // --- SUPABASE CONNECTIVITY ---
    function initSupabaseRoom() {
        const client = window.supabaseClient;
        if (!client) {
            console.error('Supabase client is not initialized!');
            return;
        }

        // 1. Kênh đồng bộ Trạng thái phòng & Nước đi
        state.gameChannel = client.channel(`xiangqi-${state.roomCode}`);
        state.gameChannel
            .on('broadcast', { event: 'join' }, payload => {
                // Đối thủ thông báo tham gia
                if (state.myColor === 'w') {
                    state.opponentName = payload.payload.nickname;
                    addChatMsg(`[HỆ THỐNG] Đối thủ ${state.opponentName} đã vào phòng!`, 'system');
                    
                    // Trả lời lại tên cho khách biết
                    state.gameChannel.send({
                        type: 'broadcast',
                        event: 'welcome',
                        payload: { nickname: state.nickname }
                    });

                    state.status = 'PLAYING';
                    xiangqiStatusText.innerText = 'Trận đấu bắt đầu! Bạn đi trước (Đỏ).';
                    renderBoard();
                    updateTurnIndicator();
                }
            })
            .on('broadcast', { event: 'welcome' }, payload => {
                if (state.myColor === 'b') {
                    state.opponentName = payload.payload.nickname;
                    addChatMsg(`[HỆ THỐNG] Kết nối thành công tới Host: ${state.opponentName}`, 'system');
                    state.status = 'PLAYING';
                    xiangqiStatusText.innerText = `Trận đấu bắt đầu! Lượt đi trước thuộc về ${state.opponentName} (Đỏ).`;
                    renderBoard();
                    updateTurnIndicator();
                }
            })
            .on('broadcast', { event: 'move' }, payload => {
                // Nhận nước đi từ đối thủ
                const { fromR, fromC, toR, toC, turn } = payload.payload;
                const p = state.board[fromR][fromC];
                state.board[toR][toC] = p;
                state.board[fromR][fromC] = null;
                state.turn = turn;

                renderBoard();
                updateTurnIndicator();
                checkGameEnd();
            })
            .on('broadcast', { event: 'reset_req' }, () => {
                addChatMsg(`[HỆ THỐNG] Đối thủ yêu cầu chơi lại ván mới.`, 'system');
                resetBoardState();
            })
            .on('broadcast', { event: 'leave' }, () => {
                addChatMsg(`[HỆ THỐNG] Đối thủ đã thoát phòng.`, 'system');
                state.status = 'WAITING';
                xiangqiStatusText.innerText = 'ĐỐI THỦ ĐÃ THOÁT. Đang chờ người chơi mới...';
                btnResetXiangqi.classList.add('hidden');
                resetBoardState(false); // Không đổi turn, giữ nguyên vị trí cũ chờ
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Xiangqi game channel subscribed successfully.');
                    if (state.myColor === 'w') {
                        addChatMsg(`[HỆ THỐNG] Đã tạo phòng ${state.roomCode}. Đang chờ đối thủ...`, 'system');
                    } else {
                        // Gửi sự kiện Join báo với Host
                        state.gameChannel.send({
                            type: 'broadcast',
                            event: 'join',
                            payload: { nickname: state.nickname }
                        });
                    }
                }
            });

        // 2. Kênh Chat
        state.chatChannel = client.channel(`xiangqi-chat-${state.roomCode}`);
        state.chatChannel
            .on('broadcast', { event: 'msg' }, payload => {
                addChatMsg(`${payload.payload.sender}: ${payload.payload.text}`, 'opponent');
            })
            .subscribe();
    }

    function resetBoardState(notifyOpponent = true) {
        state.board = JSON.parse(JSON.stringify(INITIAL_BOARD));
        state.turn = 'w';
        state.selectedPiece = null;
        state.validMoves = [];
        state.status = state.opponentName !== 'Đối thủ' ? 'PLAYING' : 'WAITING';

        if (notifyOpponent && state.gameChannel) {
            state.gameChannel.send({
                type: 'broadcast',
                event: 'reset_req',
                payload: {}
            });
        }

        btnResetXiangqi.classList.add('hidden');
        renderBoard();
        updateTurnIndicator();
    }

    // --- VIEW TRIGGERS ---
    window.renderXiangqiBoard = function () {
        renderBoard();
        updateTurnIndicator();
    };

    // --- EVENT BINDINGS ---
    btnXiangqiCreateRoom.addEventListener('click', function () {
        const nick = xiangqiNicknameInput.value.trim().toUpperCase();
        if (!nick) {
            showLobbyMsg('Vui lòng nhập tên hiển thị!', true);
            return;
        }
        state.nickname = nick;
        state.roomCode = genRoomCode();
        state.myColor = 'w';
        state.opponentName = 'Đối thủ';

        // Giao diện
        xiangqiLobby.classList.add('hidden');
        xiangqiGame.classList.remove('hidden');
        xiangqiDisplayRoomCode.innerText = state.roomCode;
        xiangqiStatusText.innerText = 'ĐANG CHỜ ĐỐI THỦ VÀO PHÒNG...';
        btnResetXiangqi.classList.add('hidden');

        // Khởi tạo Supabase Channel
        initSupabaseRoom();
        resetBoardState(false);
    });

    btnXiangqiJoinRoom.addEventListener('click', function () {
        const nick = xiangqiNicknameInput.value.trim().toUpperCase();
        const code = xiangqiRoomCodeInput.value.trim().toUpperCase();
        if (!nick) {
            showLobbyMsg('Vui lòng nhập tên hiển thị!', true);
            return;
        }
        if (code.length !== 4) {
            showLobbyMsg('Mã phòng phải có đúng 4 ký tự!', true);
            return;
        }
        state.nickname = nick;
        state.roomCode = code;
        state.myColor = 'b';

        // Giao diện
        xiangqiLobby.classList.add('hidden');
        xiangqiGame.classList.remove('hidden');
        xiangqiDisplayRoomCode.innerText = state.roomCode;
        xiangqiStatusText.innerText = 'ĐANG KẾT NỐI TỚI PHÒNG CHƠI...';
        btnResetXiangqi.classList.add('hidden');

        // Khởi tạo Supabase Channel
        initSupabaseRoom();
        resetBoardState(false);
    });

    btnResetXiangqi.addEventListener('click', () => {
        resetBoardState(true);
        addChatMsg(`[HỆ THỐNG] Bạn đã yêu cầu bắt đầu lại ván cờ.`, 'system');
    });

    btnLeaveXiangqi.addEventListener('click', function () {
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
        state.selectedPiece = null;
        state.validMoves = [];

        xiangqiLobby.classList.remove('hidden');
        xiangqiGame.classList.add('hidden');
        xiangqiChatHistory.innerHTML = '<div class="chat-msg system">KÊNH CHAT PHÒNG CỜ TƯỚNG</div>';
    });

    // Chat
    function sendChat() {
        const text = xiangqiChatInput.value.trim();
        if (!text) return;

        if (state.chatChannel) {
            state.chatChannel.send({
                type: 'broadcast',
                event: 'msg',
                payload: { sender: state.nickname, text }
            });
        }
        addChatMsg(`Tôi: ${text}`, 'self');
        xiangqiChatInput.value = '';
    }

    btnXiangqiSendChat.addEventListener('click', sendChat);
    xiangqiChatInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') sendChat();
    });
})();
