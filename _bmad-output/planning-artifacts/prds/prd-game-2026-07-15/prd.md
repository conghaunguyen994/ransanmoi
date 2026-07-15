---
title: Rắn Săn Mồi Neon (Neon Snake Game)
status: final
created: 2026-07-15
updated: 2026-07-15
---

# PRD: Rắn Săn Mồi Neon (Neon Snake Game)

## 0. Document Purpose

Tài liệu yêu cầu sản phẩm (PRD) này xác định các tính năng, hành trình trải nghiệm người dùng, ràng buộc kỹ thuật và chỉ số thành công cho game Rắn Săn Mồi Neon. Tài liệu này đóng vai trò là hợp đồng kỹ thuật cho các kỹ sư phát triển phần mềm (Amelia) và kiến trúc sư hệ thống (Winston) để tiến hành triển khai. 

Tài liệu được xây dựng trực tiếp dựa trên kết quả của buổi động não [brainstorming_session.md](file:///c:/Users/nconghau/Desktop/new%20fe/game/_bmad-output/planning-artifacts/brainstorming_session.md).

---

## 1. Vision

**Rắn Săn Mồi Neon** là một phiên bản nâng cấp hiện đại của trò chơi rắn săn mồi cổ điển trên hệ máy Nokia cũ. Với thiết kế theo phong cách Neon Dark Mode và hiệu ứng màu sắc động thay đổi theo điểm số, trò chơi mang lại trải nghiệm thị giác sống động và cảm giác thỏa mãn tối đa cho người chơi trong các phiên chơi ngắn. 

Game hướng tới sự mượt mà về mặt hiệu năng (chạy ổn định ở 60 FPS) và tính thử thách cao thông qua hai chế độ chơi riêng biệt: **Cổ điển (Classic)** và **Thử thách (Challenge)** với các vật cản thay đổi.

---

## 2. Target User

### 2.1 Jobs To Be Done (JTBD)
*   **Giải trí nhanh (Functional/Contextual)**: Người chơi muốn có một trò chơi nhanh, khởi động tức thì trên trình duyệt máy tính để giải tỏa căng thẳng trong giờ nghỉ ngắn.
*   **Hồi ức hoài cổ (Emotional)**: Người chơi muốn tìm lại cảm giác chơi game rắn săn mồi kinh điển nhưng với một diện mạo mới mẻ, hiện đại và kích thích hơn.
*   **Vượt qua giới hạn cá nhân (Emotional/Social)**: Người chơi muốn liên tục phá kỷ lục điểm số của chính mình thông qua tính năng lưu trữ điểm cao nhất.

### 2.2 Non-Users (v1)
*   **Người chơi trên thiết bị di động**: Phiên bản đầu tiên (v1) tập trung hoàn toàn vào tối ưu điều khiển bằng bàn phím máy tính, không tối ưu cho màn hình cảm ứng hoặc thiết bị di động.

### 2.3 Key User Journeys

*   **UJ-1: Người chơi làm quen và thư giãn với Classic Mode**
    *   **Protagonist**: Huy, một lập trình viên đang muốn nghỉ ngơi 5 phút giữa giờ làm việc.
    *   **Entry state**: Đã mở trình duyệt, truy cập trực tiếp vào trang web của game.
    *   **Path**: Huy chọn nút "Classic Mode" trên màn hình chính bằng bàn phím, game bắt đầu. Huy điều khiển rắn bằng các phím mũi tên. Rắn di chuyển xuyên qua tường và xuất hiện lại ở cạnh đối diện. Huy ăn mồi đỏ liên tục, rắn dài ra và tốc độ tăng dần. Cứ mỗi 100 điểm, toàn bộ màu neon của màn hình chuyển đổi mượt mà.
    *   **Climax**: Rắn dài ra rất nhiều, Huy ăn mồi đạt 250 điểm, vượt qua kỷ lục cũ là 220 điểm.
    *   **Resolution**: Rắn tự đâm vào đuôi của mình. Game kết thúc và hiển thị màn hình Game Over kèm thông báo "NEW HIGH SCORE!". Huy lưu lại điểm số cao mới trên máy và tắt game để quay lại làm việc.

*   **UJ-2: Người chơi tìm thử thách cao hơn với Challenge Mode**
    *   **Protagonist**: Huy, sau khi đã thành thạo Classic Mode, muốn thử thách độ khéo léo của mình.
    *   **Entry state**: Màn hình chính của game.
    *   **Path**: Huy chọn "Challenge Mode" và bấm Start. Game hiển thị một bản đồ với 5 khối vật cản neon xuất hiện ngẫu nhiên [ASSUMPTION: Obstacles do not spawn on the snake or the initial food]. Huy phải tính toán đường đi khéo léo để vừa tránh đuôi rắn, vừa không đâm vào vật cản khi đi xuyên qua tường.
    *   **Climax**: Rắn đi xuyên qua tường bên phải để ăn mồi ở góc trái nhưng suýt đâm vào vật cản neon ngay sát tường biên. Huy phản xạ kịp thời bấm phím `W` để né chướng ngại vật trong gang tấc.
    *   **Resolution**: Huy đâm vào vật cản ở điểm số 80. Game kết thúc, Huy bấm phím `R` để bắt đầu lại lượt chơi mới ngay lập tức.

---

## 3. Glossary

Các thuật ngữ dưới đây bắt buộc phải được sử dụng chính xác và nhất quán trong toàn bộ mã nguồn và tài liệu hệ thống:
*   **Rắn (Snake)**: Nhân vật do người chơi điều khiển, là một chuỗi các đốt liên kết với nhau di chuyển trên lưới.
*   **Mồi (Food)**: Vật phẩm xuất hiện ngẫu nhiên trên lưới để Rắn ăn. Ăn Mồi làm tăng chiều dài Rắn và điểm số.
*   **Vật cản (Obstacle)**: Các khối tĩnh trên lưới trong chế độ Challenge mà Rắn không được phép chạm vào. Chạm vào Vật cản sẽ kết thúc trò chơi.
*   **Lưới (Grid)**: Bàn chơi được chia thành các ô vuông bằng nhau [ASSUMPTION: Grid size is 20x20 cells, where each cell is 20x20 pixels].
*   **Classic Mode**: Chế độ chơi không có Vật cản, chỉ chết khi Rắn tự cắn đuôi mình.
*   **Challenge Mode**: Chế độ chơi có chứa các Vật cản tĩnh trên Lưới.
*   **Điểm cao (High Score)**: Điểm số kỷ lục lớn nhất từng đạt được trên thiết bị đó, lưu riêng cho từng chế độ chơi.

---

## 4. Features

### 4.1 Game Modes & Layout Selection
**Description:** Màn hình khởi động cho phép người chơi lựa chọn giữa hai chế độ chơi chính (Classic Mode và Challenge Mode) và xem Điểm cao hiện tại của mỗi chế độ. Realizes UJ-1, UJ-2.

**Functional Requirements:**
#### FR-1: Lựa chọn chế độ chơi
Người chơi có thể sử dụng phím mũi tên Lên/Xuống hoặc phím `W`/`S` để chọn giữa "Classic Mode" và "Challenge Mode", và ấn phím `Enter` hoặc `Space` để xác nhận bắt đầu game.
*   **Consequences (testable)**:
    *   Nhấn `Enter` khi đang chọn "Classic Mode" sẽ chuyển sang màn chơi không có chướng ngại vật.
    *   Nhấn `Enter` khi đang chọn "Challenge Mode" sẽ chuyển sang màn chơi có 5 chướng ngại vật ngẫu nhiên.

#### FR-2: Hiển thị Điểm cao (High Score)
Hệ thống hiển thị Điểm cao của cả 2 chế độ chơi trên màn hình Menu chính.
*   **Consequences (testable)**:
    *   Dữ liệu Điểm cao được đọc từ `localStorage` khi khởi chạy game. Nếu chưa có dữ liệu, hiển thị giá trị `0`.

---

### 4.2 Snake Logic & Movement Control
**Description:** Logic chuyển động của Rắn trên Lưới, kiểm soát tốc độ và cơ chế đi xuyên tường biên.

**Functional Requirements:**
#### FR-3: Điều khiển chuyển động
Người chơi điều khiển hướng đi của Rắn bằng các phím mũi tên hoặc `W`, `A`, `S`, `D`. Rắn không thể đi ngược hướng trực tiếp (ví dụ: đang đi Phải không thể bấm Trái để quay đầu ngay lập tức).
*   **Consequences (testable)**:
    *   Hệ thống khóa phím bấm (Direction lock per game tick) [ASSUMPTION: Input queue handles only the first valid keystroke per frame update] để tránh việc nhấn 2 phím quá nhanh gây tự cắn đuôi lỗi.

#### FR-4: Cơ chế đi xuyên tường (Wrap Around)
Khi đầu Rắn di chuyển ra ngoài phạm vi biên của Lưới, nó sẽ xuất hiện ở cạnh đối diện tương ứng.
*   **Consequences (testable)**:
    *   Đầu Rắn di chuyển quá ô biên bên phải ở tọa độ X = 20 sẽ chuyển sang tọa độ X = 0 ở khung hình kế tiếp.

#### FR-5: Va chạm đuôi (Self-Collision)
Rắn sẽ chết khi đầu của nó trùng tọa độ với bất kỳ đốt nào thuộc thân của nó.
*   **Consequences (testable)**:
    *   Trò chơi chuyển ngay sang trạng thái Game Over khi xảy ra va chạm đuôi.

---

### 4.3 Food & Obstacle Generation
**Description:** Cách thức tạo Mồi và Vật cản trên lưới sao cho không đè lên Rắn hoặc đè lên nhau.

**Functional Requirements:**
#### FR-6: Tạo Mồi ngẫu nhiên
Mỗi khi Rắn ăn Mồi, điểm số tăng lên 10 điểm, độ dài tăng thêm 1 đốt và một viên Mồi mới được tạo ngẫu nhiên trên một ô Lưới còn trống.
*   **Consequences (testable)**:
    *   Tọa độ của Mồi không bao giờ được trùng với các ô hiện tại của Rắn hoặc Vật cản [ASSUMPTION: System retries coordinate generation until a free grid cell is found].

#### FR-7: Tạo Vật cản (Chỉ áp dụng trong Challenge Mode)
Khi bắt đầu lượt chơi Challenge Mode, hệ thống sinh ra ngẫu nhiên 5 ô Vật cản tĩnh trên Lưới [ASSUMPTION: Obstacles are single-cell entities and do not change positions during the game].
*   **Consequences (testable)**:
    *   Rắn chạm vào bất kỳ Vật cản nào sẽ kích hoạt Game Over lập tức.
    *   Vật cản không được sinh ra trên đường đi xuất phát của Rắn (ít nhất cách đầu Rắn 3 ô).

---

### 4.4 Aesthetics & Rendering (Neon Dark Theme)
**Description:** Thiết kế thẩm mỹ và hiệu ứng hạt động để đem lại trải nghiệm lôi cuốn, thỏa mãn thị giác.

**Functional Requirements:**
#### FR-8: Hiệu ứng chuyển tông màu Neon theo điểm số (Theme Shift)
Cứ mỗi 100 điểm người chơi tích lũy được trong một lượt chơi, màu sắc của Rắn, Mồi và khung viền sẽ chuyển dịch sang dải màu Neon tiếp theo.
*   **Consequences (testable)**:
    *   Dải màu chuyển động theo vòng lặp: Xanh lá neon (`#39ff14`) -> Hồng neon (`#ff007f`) -> Xanh dương neon (`#00f0ff`) -> Cam neon (`#ff7300`) -> Tím neon (`#b026ff`).
    *   Quá trình chuyển màu diễn ra mượt mà thông qua CSS transition hoặc Canvas gradient interpolation.

#### FR-9: Hiệu ứng hạt bụi sáng (Eat Particles)
Khi Rắn ăn mồi, một vụ nổ nhỏ gồm 10 hạt bụi sáng phát ra từ tọa độ của viên mồi và nhạt dần rồi biến mất trong 0.5 giây.
*   **Consequences (testable)**:
    *   Có hiệu ứng rung màn hình nhẹ (Canvas translation offsets) trong khoảng 100ms khi Rắn ăn mồi.

---

### 4.5 Data Persistence & Game Flow Controls
**Description:** Lưu trữ điểm cao và kiểm soát các trạng thái Pause, Restart game.

**Functional Requirements:**
#### FR-10: Lưu điểm cao tự động
Khi Game Over, hệ thống so sánh điểm số lượt chơi vừa kết thúc với Điểm cao đã lưu của chế độ đó. Nếu điểm mới cao hơn, hệ thống ghi đè dữ liệu mới vào `localStorage`.
*   **Consequences (testable)**:
    *   Chìa khóa lưu trữ: `neon_snake_classic_high` và `neon_snake_challenge_high` [ASSUMPTION: Storage values are stored as integers].

#### FR-11: Trạng thái Pause và Restart
Người chơi có thể ấn phím `Escape` hoặc phím `P` để tạm dừng trò chơi, và ấn phím `R` để tải lại (Restart) màn chơi hiện tại bất kỳ lúc nào.
*   **Consequences (testable)**:
    *   Màn hình Pause hiển thị chữ "PAUSED" nhấp nháy neon ở trung tâm.

---

## 5. Non-Goals (Explicit)

*   **Không xây dựng API Backend**: Toàn bộ dữ liệu điểm số chỉ được quản lý cục bộ ở phía máy khách (client-side LocalStorage).
*   **Không hỗ trợ tay cầm chơi game (Gamepad) hoặc Touch**: Chỉ hỗ trợ các phím sự kiện chuẩn của Bàn phím (`keyup` / `keydown`).
*   **Không tạo chế độ tự chơi (AI Auto-play)**: Game tập trung 100% vào trải nghiệm tương tác thực của người dùng.

---

## 6. MVP Scope

### 6.1 In Scope
*   Màn hình Menu chính cho phép lựa chọn 2 chế độ chơi: Classic và Challenge.
*   Bàn chơi Canvas 60 FPS hỗ trợ Rắn xuyên tường biên.
*   Chế độ Challenge chứa 5 khối vật cản tĩnh tạo ngẫu nhiên.
*   Hiệu ứng chuyển đổi tông màu neon động sau mỗi 100 điểm.
*   Hiệu ứng bụi hạt sáng và rung màn hình nhẹ khi ăn mồi.
*   Lưu trữ High Score riêng cho mỗi chế độ chơi qua `localStorage`.
*   Phím tắt `P` để tạm dừng và `R` để Restart màn chơi.

### 6.2 Out of Scope for MVP
*   Bản đồ có tường phức tạp (mê cung) ngoài 5 khối vật cản đơn lẻ.
*   Hệ thống âm thanh/nhạc nền (Audio) [NOTE FOR PM: Hoàn toàn có thể cân nhắc tích hợp âm thanh retro 8-bit ở các phiên bản sau nếu cần].

---

## 7. Success Metrics

### Primary
*   **SM-1**: Game duy trì mức khung hình ổn định ở mức 60 FPS ± 2 FPS trên các trình duyệt hiện đại (Chrome, Firefox, Edge) trong suốt quá trình chơi, kể cả khi chiều dài rắn đạt trên 100 đốt và hiển thị hiệu ứng hạt bụi sáng. Validates FR-8, FR-9.

### Secondary
*   **SM-2**: Sự tương thích hoàn toàn của hệ thống lưu trữ `localStorage`, đảm bảo điểm cao không bị mất sau khi người chơi tắt trình duyệt và mở lại. Validates FR-10.

---

## 8. Open Questions

1.  **Vấn đề kích thước chướng ngại vật**: Trong Challenge Mode, chướng ngại vật nên là 1 ô lưới duy nhất (1x1) hay có thể là các khối lớn hơn (2x2)? [NOTE FOR PM: Để đơn giản hóa và đảm bảo không chặn đứng lối đi khi rắn dài ra, MVP sẽ dùng vật cản kích thước 1x1 ô].
2.  **Cách thức sinh chướng ngại vật**: Có nên để chướng ngại vật xuất hiện ngẫu nhiên ở mỗi lượt chơi mới, hay xây dựng các bản đồ chướng ngại vật cố định trước (Pre-defined Maps)? [NOTE FOR PM: MVP sẽ tạo ngẫu nhiên 5 chướng ngại vật mỗi khi Start để giảm độ phức tạp thiết kế màn chơi].

---

## 9. Assumptions Index

*   **[ASSUMPTION 9.1]**: Kích thước Lưới chuẩn là 20x20 ô, mỗi ô có kích thước 20x20 pixel (tổng thể Canvas game là 400x400 pixel). Lưới này sẽ tự động căn giữa màn hình thiết bị hiển thị.
*   **[ASSUMPTION 9.2]**: Chiều dài ban đầu của Rắn là 4 đốt, xuất phát ở chính giữa Lưới và di chuyển theo hướng bên Phải với tốc độ ban đầu là 150ms/bước di chuyển.
*   **[ASSUMPTION 9.3]**: Hướng di chuyển phím bấm được xử lý thông qua hàng đợi (input queue) và chỉ lấy phím hợp lệ đầu tiên được nhấn trong mỗi chu kỳ lặp (game tick) để chặn tuyệt đối hành vi lặp phím gây quay đầu tự cắn.
*   **[ASSUMPTION 9.4]**: Vật cản trong Challenge Mode là các ô đơn lẻ (kích thước 1x1 ô) và không thay đổi vị trí trong suốt lượt chơi. Điểm sinh vật cản phải cách đầu rắn ít nhất 3 ô.
*   **[ASSUMPTION 9.5]**: Khóa lưu trữ trong `localStorage` sử dụng kiểu dữ liệu nguyên (integer) tương ứng với tên khóa `neon_snake_classic_high` và `neon_snake_challenge_high`.
*   **[ASSUMPTION 9.6]**: Tốc độ rắn tăng thêm khi ăn mồi là tăng 5ms mỗi lần ăn, tốc độ tối đa giới hạn ở mức 50ms/bước di chuyển.
