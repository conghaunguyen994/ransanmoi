---
name: neon-snake-design
description: Neon Dark Mode style system for the Neon Snake game
status: final
created: 2026-07-15
updated: 2026-07-15
colors:
  bg-base: "#0d0e15"
  bg-surface: "#161722"
  neon-green: "#39ff14"
  neon-pink: "#ff007f"
  neon-blue: "#00f0ff"
  neon-orange: "#ff7300"
  neon-purple: "#b026ff"
  neon-yellow: "#ffe600"
  text-primary: "#ffffff"
  text-secondary: "#8f92a1"
  border-dim: "#222436"
typography:
  title:
    fontFamily: "'Outfit', 'Inter', sans-serif"
    fontSize: "32px"
    fontWeight: "700"
  subtitle:
    fontFamily: "'Outfit', 'Inter', sans-serif"
    fontSize: "18px"
    fontWeight: "500"
  body:
    fontFamily: "'Inter', sans-serif"
    fontSize: "14px"
    fontWeight: "400"
  score:
    fontFamily: "'Courier New', monospace"
    fontSize: "24px"
    fontWeight: "700"
rounded:
  sm: "4px"
  md: "8px"
  lg: "16px"
  full: "9999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "24px"
  6: "32px"
components:
  screen-container:
    background: "{colors.bg-base}"
    color: "{colors.text-primary}"
    padding: "{spacing.5}"
  game-canvas:
    background: "#07080c"
    border: "2px solid {colors.neon-green}"
    box-shadow: "0 0 15px {colors.neon-green}"
  menu-item:
    color: "{colors.text-secondary}"
    padding: "{spacing.3}"
    border-radius: "{rounded.md}"
  menu-item-selected:
    color: "{colors.text-primary}"
    border: "1px solid {colors.neon-green}"
    box-shadow: "0 0 10px {colors.neon-green}"
  score-board:
    font-family: "{typography.score.fontFamily}"
    color: "{colors.text-primary}"
---

# DESIGN.md - Neon Snake Game

Tài liệu này xác định ngôn ngữ thiết kế, mã màu, kiểu chữ và các thành phần giao diện của game Rắn Săn Mồi Neon.

## 1. Brand & Style
*   **Phong cách**: Cyberpunk Retro-Arcade, năng lượng cao, tương phản mạnh.
*   **Bối cảnh**: Không gian tối sâu thẳm kết hợp với các đường viền phát sáng (Glow border) của đèn LED neon để tạo chiều sâu và kích thích thị giác.
*   **Nhịp độ**: Cảm giác mượt mà 60 FPS, chuyển tiếp màu sắc linh động và mềm mại.

## 2. Colors
*   `{colors.bg-base}`: Màu nền tối chủ đạo của toàn bộ ứng dụng, tạo độ tương phản tối đa cho hiệu ứng neon.
*   `{colors.bg-surface}`: Màu nền của các panel hoặc hộp điều khiển nổi trên màn hình.
*   **Các màu Neon (Green, Pink, Blue, Orange, Purple)**: Màu sắc chủ đạo của game. Ban đầu sử dụng `{colors.neon-green}`. Khi điểm số tăng thêm mỗi 100 điểm, màu neon chủ đạo của game sẽ chuyển dịch lần lượt qua các màu khác.
*   `{colors.neon-yellow}`: Dành riêng cho hiệu ứng nổ hạt bụi sáng (particle) khi ăn mồi hoặc các mốc điểm cao mới.

## 3. Typography
*   **Outfit/Inter**: Dùng cho tiêu đề, nút bấm menu, văn bản hướng dẫn chung.
*   **Courier New (Monospace)**: Dành riêng cho bảng điểm số (Score Board) và các con số để giữ đúng phong cách arcade hoài cổ và không bị co giãn chữ khi số điểm thay đổi.

## 4. Layout & Spacing
*   **Canvas Game**: Đặt ở trung tâm màn hình, bao quanh bởi một dải viền Neon tương thích với màu chủ đạo hiện tại. Kích thước 400x400 pixel cố định để đảm bảo căn lưới di chuyển 20x20 ô chính xác.
*   **Spacers**: Sử dụng `{spacing.4}` cho khoảng cách giữa canvas và tiêu đề, `{spacing.3}` cho khoảng cách giữa các phần tử nhỏ hơn.

## 5. Elevation & Depth
*   Sử dụng bóng mờ phát sáng (glow shadows) thay cho đổ bóng truyền thống.
    *   Ví dụ: Rắn và Mồi được vẽ trên Canvas kèm hiệu ứng `shadowBlur` và `shadowColor` tương đương với dải màu neon hiện tại.

## 6. Shapes
*   **Giao diện bên ngoài (UI)**: Sử dụng các góc bo tròn nhẹ `{rounded.md}` cho menu và các nút bấm để tạo cảm giác hiện đại.
*   **Bàn chơi bên trong (Canvas)**: Giữ nguyên các góc vuông sắc cạnh (0 bo góc) cho rắn, mồi và vật cản để đảm bảo hiển thị đúng cấu trúc lưới ô vuông và giữ tính chất retro.

## 7. Components
*   `screen-container`: Căn giữa, lấp đầy chiều cao màn hình trình duyệt.
*   `game-canvas`: Viền phát sáng 2px đổi màu theo điểm số.
*   `menu-item-selected`: Khi người dùng di chuyển phím Lên/Xuống ở Menu, nút đang chọn sẽ có viền neon phát sáng.

## 8. Do's and Don'ts
*   **Do**: Luôn áp dụng hiệu ứng mờ phát sáng (glow shadow) cho các khối vẽ trên canvas.
*   **Don't**: Không sử dụng bất kỳ màu nền sáng nào ngoài màu tối `#0d0e15`. Không dùng các đường viền cứng không phát sáng cho các thành phần neon.
