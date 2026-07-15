# Story 1.1: Tạo khung giao diện và vẽ Canvas trống

Status: ready-for-dev

## Story

As a player,
I want to see a clean, centered game screen with a glowing canvas and scoreboard,
so that I can experience the futuristic neon theme from the very start.

## Acceptance Criteria

1. **Given** trang web được mở trên trình duyệt.
2. **When** ứng dụng tải xong.
3. **Then** hiển thị một phần tử `<canvas>` kích thước 400x400px căn giữa màn hình trên nền tối `#0d0e15`.
4. **And** Canvas có viền phát sáng màu xanh lá neon `#39ff14` và bóng mờ.
5. **And** hiển thị bảng điểm "Score: 0" và "Classic High: 0" sử dụng phông chữ Courier New phía trên Canvas.

## Tasks / Subtasks

- [ ] Thiết lập tệp HTML cơ bản (`index.html`) (AC: 1, 3, 5)
  - [ ] Khai báo cấu trúc HTML5 chuẩn.
  - [ ] Thêm thẻ `<div class="game-container">` để bọc phần giao diện.
  - [ ] Thêm thẻ chứa Score Board hiển thị điểm hiện tại và điểm cao nhất.
  - [ ] Thêm thẻ `<canvas id="gameCanvas" width="400" height="400">`.
  - [ ] Nhúng tệp `style.css` và `game.js`.
- [ ] Thiết lập CSS Neon Dark Mode (`style.css`) (AC: 3, 4, 5)
  - [ ] Đặt màu nền body là `#0d0e15`.
  - [ ] Căn giữa thẻ `.game-container` theo cả chiều dọc và chiều ngang.
  - [ ] Thiết lập kiểu chữ: Outfit hoặc Inter cho UI, và Courier New (Monospace) cho điểm số.
  - [ ] Áp dụng thuộc tính viền phát sáng cho Canvas: `border: 2px solid #39ff14; box-shadow: 0 0 15px #39ff14;`.
- [ ] Khởi tạo tệp logic JavaScript (`game.js`) (AC: 3)
  - [ ] Lấy đối tượng Canvas (`#gameCanvas`) và context 2d.
  - [ ] Khai báo đối tượng trạng thái game `gameState` chứa trạng thái hiện tại (mặc định ban đầu).
  - [ ] Viết hàm vẽ nền Canvas đơn giản để xác nhận Canvas hoạt động tốt.

## Dev Notes

- **Quyết định kiến trúc (AD-1)**: Sử dụng HTML, Vanilla CSS và JS thuần. Không dùng công cụ build.
- **Phông chữ**: Nhúng Google Font 'Outfit' hoặc 'Inter' để giao diện trông premium và hiện đại.
- **Màu sắc neon**: Sử dụng màu xanh lá neon mặc định `#39ff14` làm viền ban đầu.

### Project Structure Notes

- Cấu trúc thư mục tối giản ở cấp thư mục gốc của dự án:
  - `index.html`
  - `style.css`
  - `game.js`

### References

- [PRD.md: Section 4.4](file:///c:/Users/nconghau/Desktop/new%20fe/game/_bmad-output/planning-artifacts/prds/prd-game-2026-07-15/prd.md)
- [DESIGN.md: Section 2 & 3](file:///c:/Users/nconghau/Desktop/new%20fe/game/_bmad-output/planning-artifacts/ux/ux-game-2026-07-15/DESIGN.md)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash

### Debug Log References

### Completion Notes List

### File List
