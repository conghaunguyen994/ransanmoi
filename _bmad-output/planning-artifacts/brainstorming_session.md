# Neon Snake Game - Brainstorming Session

Tài liệu này tổng hợp toàn bộ kết quả của buổi làm việc **Động não (Brainstorming)** theo phương pháp **Sáu chiếc mũ tư duy (Six Thinking Hats)** cho dự án Game Rắn Săn Mồi Đơn Giản.

---

## 🎯 Mục tiêu & Phạm vi (Goals & Non-Goals)

### Mục tiêu (Goals)
*   Xây dựng một trò chơi Rắn săn mồi cổ điển nhưng được nâng cấp bằng giao diện **Neon/Cyberpunk Dark Mode** bắt mắt.
*   Cung cấp hai chế độ chơi chính:
    1.  **Classic Mode**: Bản đồ trống hoàn toàn, rắn tự do di chuyển.
    2.  **Challenge Mode**: Bản đồ xuất hiện các chướng ngại vật ngẫu nhiên hoặc tăng dần độ khó.
*   Tích hợp hệ thống tính điểm và lưu điểm cao nhất (**High Score**) riêng biệt cho từng chế độ chơi vào trình duyệt (`localStorage`).
*   Tạo cảm giác mượt mà và thỏa mãn (satisfying) cho người chơi qua hiệu ứng hạt bụi sáng (particle effects) khi ăn mồi và hiệu ứng chuyển màu neon chủ đạo của game mỗi khi đạt thêm 100 điểm.

### Phạm vi loại trừ (Non-Goals)
*   Không hỗ trợ điều khiển trên thiết bị di động/màn hình cảm ứng (chỉ tập trung tối ưu hóa cho bàn phím).
*   Không bổ sung các loại mồi đặc biệt (chỉ có duy nhất một loại mồi chuẩn để giữ lối chơi thuần túy).
*   Không có chế độ chơi nhiều người (Multiplayer) hoặc kết nối máy chủ để lưu điểm trực tuyến.

---

## 🛠️ Yêu cầu kỹ thuật & Ràng buộc (Technical Requirements & Constraints)

*   **Công nghệ**: Sử dụng HTML, Vanilla CSS cho giao diện, và Javascript thuần (Vanilla JS) vẽ trên thẻ `<canvas>` để đạt hiệu suất 60fps mượt mượt nhất.
*   **Điều khiển**: Hoàn toàn bằng bàn phím máy tính qua các phím mũi tên hoặc phím `W`, `A`, `S`, `D`.
*   **Cơ chế di chuyển**: Cho phép rắn đi xuyên tường biên (wrap around) và xuất hiện ở phía đối diện.

---

## ⚠️ Rủi ro & Giải pháp (Risks & Mitigations)

| Rủi ro | Giải pháp giảm thiểu |
| :--- | :--- |
| **Lỗi quay đầu tự cắn (Keyboard Buffering)**: Khi người chơi bấm đổi hướng cực nhanh (ví dụ: đang đi Phải, ấn Lên rồi Trái ngay lập tức trước khi bước đi tiếp theo diễn ra) khiến rắn tự cắn đuôi mình. | Khóa hướng đi trong mỗi chu kỳ lặp (game tick) hoặc tạo hàng đợi phím bấm chỉ cho phép một hành động xoay hướng hợp lệ được xử lý trong một tick di chuyển. |
| **Mất cân bằng tốc độ**: Rắn quá nhanh hoặc quá chậm làm game mất đi tính thử thách hoặc quá khó. | Thiết kế công thức tăng tốc độ hợp lý theo số điểm đạt được (ví dụ: tốc độ cơ bản bắt đầu giảm 5ms mỗi lần ăn mồi, giới hạn ở mức tối đa an toàn). |

---

## 🎨 Giao diện & Hiệu ứng (UI & Aesthetics)

*   **Chủ đề**: Neon Dark Mode với màu nền xám siêu tối/đen `#0d0e15`.
*   **Hiệu ứng ăn mồi**: Rung màn hình nhẹ (screen shake) và bắn ra các mảnh hạt sáng nhỏ biến mất dần.
*   **Đổi màu chủ đạo**: Khi người chơi đạt mốc 100, 200, 300 điểm... tông màu neon của rắn, mồi, và viền màn hình sẽ chuyển đổi mượt mà (xanh lá -> hồng -> xanh dương -> cam -> tím).

---

## 📈 Kế hoạch tiếp theo (Next Steps)

1.  **Tạo PRD (Product Requirements Document)**: Xác định rõ ràng các tham số kỹ thuật, cấu trúc mã nguồn.
2.  **Thiết kế cấu trúc mã nguồn & Giao diện**: Chuẩn bị cấu trúc thư mục, tệp HTML, CSS và Logic JavaScript.
3.  **Triển khai & Kiểm thử**: Viết code, tối ưu chuyển động và va chạm, thử nghiệm thực tế trên trình duyệt.
