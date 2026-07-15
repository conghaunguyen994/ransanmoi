# Neon Snake Game - Brainstorming Autopilot Feature

Tài liệu này tổng hợp kết quả động não **(Brainstorming)** theo phương pháp **Sáu chiếc mũ tư duy (Six Thinking Hats)** cho tính năng **Autopilot (Tự động lái dành cho Admin)**.

---

## 🎩 Sáu Chiếc Mũ Tư Duy (Six Thinking Hats Analysis)

### 1. 🏳️ Mũ Trắng (White Hat - Sự thật & Dữ liệu)
*   **Trạng thái hiện tại**: Rắn di chuyển trên lưới 20x20 ô, di chuyển bằng cách cập nhật tọa độ đầu ở mỗi tick (150ms -> 50ms) dựa trên hướng đi (`direction`).
*   **Thông tin mồi**: Tọa độ mồi nằm ở `gameState.food` `{x, y}`.
*   **Thông tin vật cản**: Trong Challenge Mode, 5 vật cản cố định nằm ở `gameState.obstacles`.
*   **Yêu cầu**: Cần thuật toán tìm đường (Pathfinding) tính toán hướng đi tiếp theo tối ưu từ đầu rắn đến mồi, tránh đâm vào thân rắn hoặc vật cản. Tính năng này chỉ kích hoạt được bởi Admin.

### 2. 🟥 Mũ Đỏ (Red Hat - Cảm xúc & Trực giác)
*   **Cảm giác người chơi**: Chế độ Autopilot giống như một tính năng "hack/cheat" hoặc "screensaver" cực kỳ cuốn mắt (satisfying) khi nhìn con rắn tự luồn lách qua chướng ngại vật ăn mồi với tốc độ cao.
*   **Cảm giác sở hữu**: Admin cảm thấy có quyền lực đặc biệt (Easter Egg) khi sở hữu mã kích hoạt bí mật mà người chơi thông thường không biết.

### 3. ⬛ Mũ Đen (Black Hat - Rủi ro & Cảnh giác)
*   **Rủi ro thuật toán (Deadlock/Trap)**: Nếu dùng thuật toán tham lam (Greedy) chỉ đâm thẳng về phía mồi, rắn sẽ dễ tự bẫy mình vào ngõ cụt khi thân dài ra.
*   **Rủi ro hiệu năng**: Thuật toán tính toán đường đi chạy mỗi tick (50ms) trên trình duyệt có thể gây giật lag nếu không tối ưu.
*   **Rủi ro bảo mật/vô tình kích hoạt**: Phím kích hoạt quá đơn giản có thể khiến người chơi bình thường vô tình bật lên.

### 4. 🟨 Mũ Vàng (Yellow Hat - Lợi ích & Lạc quan)
*   **Lợi ích Debug**: Công cụ tuyệt vời để nhà phát triển (developer) kiểm thử hiệu ứng đổi màu ở các mốc điểm cao (100, 200, 300+) và tốc độ tối đa (50ms) mà không cần tự chơi.
*   **Lợi ích truyền thông**: Có thể quay video rắn tự động chạy đạt điểm số kỷ lục để giới thiệu game.

### 5. 🟩 Mũ Xanh Lá (Green Hat - Ý tưởng Sáng tạo & Giải pháp)
*   **Thuật toán tìm đường**:
    1.  *Giải pháp 1 (BFS - Breadth-First Search)*: Tìm đường đi ngắn nhất đến mồi trên lưới 20x20 ô (400 node). Cực kỳ nhanh (dưới 1ms) và tránh được vật cản tốt.
    2.  *Giải pháp 2 (A*)*: Tương tự BFS nhưng có heuristic khoảng cách Manhattan.
    3.  *Giải pháp 3 (Survival Fallback)*: Nếu BFS/A* báo không có đường đi đến mồi (bị thân rắn chắn mất), rắn sẽ tự động chọn ô trống an toàn nhất xung quanh để "sống sót" chờ đường mở ra.
*   **Cơ chế kích hoạt Admin**:
    *   *Option A*: Nhấn tổ hợp phím ẩn: `Ctrl + Shift + Alt + A`.
    *   *Option B (Thú vị hơn)*: Nhập mã cheat bằng cách gõ từ khóa `"admin"` hoặc `"autoplay"` từ bàn phím bất kỳ lúc nào. Khi kích hoạt thành công, trên màn hình sẽ có thông báo `"ADMIN AUTOPILOT: ON"` màu vàng neon nhấp nháy.

### 6. 🟦 Mũ Xanh Dương (Blue Hat - Kế hoạch triển khai)
*   **Bước 1**: Cập nhật PRD và tài liệu thiết kế.
*   **Bước 2**: Viết thuật toán BFS tìm đường ngắn nhất trên lưới 20x20 (có xử lý đi xuyên biên và né chướng ngại vật).
*   **Bước 3**: Viết cơ chế lắng nghe chuỗi ký tự bàn phím `"admin"` để bật/tắt Autopilot.
*   **Bước 4**: Tích hợp vào game loop: Nếu `gameState.autopilot === true`, ghi đè hướng đi bằng hướng tính toán từ thuật toán.
*   **Bước 5**: Thêm thông tin hiển thị `"ADMIN AUTO"` trên canvas khi kích hoạt.

---

## 📈 Kế hoạch tiếp theo (Next Steps)

1.  **Thiết lập mã kích hoạt**: Lắng nghe phím nhấn liên tiếp `"a" -> "d" -> "m" -> "i" -> "n"`.
2.  **Triển khai thuật toán BFS**:
    *   Hàng đợi BFS tìm đường đi từ đầu rắn `{x, y}` đến mồi `{food.x, food.y}`.
    *   Các ô bị chặn: Thân rắn và chướng ngại vật tĩnh (Challenge Mode).
    *   Hỗ trợ tọa độ Modulo 20 (xuyên biên).
3.  **Survival Fallback**: Khi không có đường đi trực tiếp, chọn hướng đi trống lân cận không gây chết lập tức.
