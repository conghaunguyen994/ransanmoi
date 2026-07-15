---
stepsCompleted: ["Step 1: Extract Requirements", "Step 2: Design Epic List", "Step 3: Create Stories", "Step 4: Final Validation"]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-game-2026-07-15/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-game-2026-07-15/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux/ux-game-2026-07-15/DESIGN.md
  - _bmad-output/planning-artifacts/ux/ux-game-2026-07-15/EXPERIENCE.md
---

# Rắn Săn Mồi Neon - Epic Breakdown

## Overview

Tài liệu này cung cấp bảng phân rã tính năng chi tiết (Epics & Stories) cho trò chơi Rắn Săn Mồi Neon, chuyển đổi các yêu cầu từ PRD, Hướng dẫn thiết kế UX và Khung kiến trúc kỹ thuật thành các Câu chuyện người dùng (User Stories) có thể triển khai trực tiếp.

## Requirements Inventory

### Functional Requirements

*   **FR-1**: Người chơi có thể sử dụng phím mũi tên Lên/Xuống hoặc phím `W`/`S` để chọn giữa "Classic Mode" và "Challenge Mode" trên Menu chính, và ấn phím `Enter` hoặc `Space` để xác nhận bắt đầu game.
*   **FR-2**: Hệ thống hiển thị Điểm cao của cả 2 chế độ chơi trên màn hình Menu chính (đọc từ LocalStorage, mặc định là 0 nếu trống).
*   **FR-3**: Người chơi điều khiển hướng đi của Rắn bằng các phím mũi tên hoặc `W`, `A`, `S`, `D`. Rắn không thể đi ngược hướng trực tiếp (ví dụ: đang đi Phải không thể bấm Trái để quay đầu ngay lập tức).
*   **FR-4**: Khi đầu Rắn di chuyển ra ngoài phạm vi biên của Lưới, nó sẽ xuất hiện ở cạnh đối diện tương ứng (Xuyên tường / Wrap Around).
*   **FR-5**: Rắn sẽ chết (Game Over) khi đầu của nó trùng tọa độ với bất kỳ đốt nào thuộc thân của nó.
*   **FR-6**: Mỗi khi Rắn ăn Mồi, điểm số tăng lên 10 điểm, độ dài tăng thêm 1 đốt và một viên Mồi mới được tạo ngẫu nhiên trên một ô Lưới còn trống.
*   **FR-7**: Khi bắt đầu Challenge Mode, hệ thống sinh ngẫu nhiên 5 ô Vật cản tĩnh trên Lưới. Rắn chạm vào Vật cản sẽ Game Over. Vật cản sinh ra cách đầu rắn tối thiểu 3 ô.
*   **FR-8**: Cứ mỗi 100 điểm tích lũy được trong một lượt chơi, màu sắc của Rắn, Mồi và khung viền sẽ chuyển dịch sang dải màu Neon tiếp theo.
*   **FR-9**: Khi Rắn ăn mồi, một vụ nổ nhỏ gồm 10 hạt bụi sáng phát ra từ tọa độ của viên mồi và nhạt dần rồi biến mất trong 0.5 giây. Đồng thời, rung màn hình nhẹ (screen shake) trong khoảng 100ms.
*   **FR-10**: Khi Game Over, nếu điểm mới cao hơn, hệ thống ghi đè dữ liệu mới vào `localStorage` cho chế độ đó.
*   **FR-11**: Người chơi có thể ấn phím `Escape` hoặc phím `P` để tạm dừng trò chơi, và ấn phím `R` để tải lại (Restart) màn chơi hiện tại bất kỳ lúc nào.

### NonFunctional Requirements

*   **NFR-1**: Trò chơi duy trì mức khung hình ổn định ở mức 60 FPS ± 2 FPS trên các trình duyệt hiện đại (Chrome, Firefox, Edge).
*   **NFR-2**: Dữ liệu điểm số cao được đồng bộ và duy trì chính xác trong `localStorage` qua các lần khởi động trình duyệt.

### Additional Requirements

*   **AD-1 (Stack & No-Build)**: Xây dựng hoàn toàn bằng HTML5, Vanilla CSS và Vanilla JavaScript chạy trực tiếp trên trình duyệt, không dùng build step hay bundler.
*   **AD-2 (Input Queue Buffer)**: Sử dụng mảng hàng đợi `inputQueue` để lưu các phím bấm và chỉ lấy ra 1 phím hợp lệ mỗi game tick nhằm tránh lỗi quay đầu nhanh.
*   **AD-3 (Grid Modulo)**: Logic hoạt động trên lưới nguyên 20x20. Tính toán xuyên biên bằng toán tử chia lấy dư: `(coord + gridSize) % gridSize`.
*   **AD-4 (Speed Curve)**: Tốc độ xuất phát 150ms/bước, mỗi lần ăn mồi giảm 5ms/bước di chuyển, giới hạn tốc độ tối đa là 50ms/bước.

### UX Design Requirements

*   **UX-DR-1**: Giao diện Neon Dark Mode với màu nền tối `#0d0e15` và màu nền hộp panel `#161722`.
*   **UX-DR-2**: Vòng lặp màu sắc neon đổi mượt mà sau mỗi 100 điểm: Xanh lá (`#39ff14`) -> Hồng (`#ff007f`) -> Xanh dương (`#00f0ff`) -> Cam (`#ff7300`) -> Tím (`#b026ff`).
*   **UX-DR-3**: Hạt bụi sáng khi ăn mồi phát ra 10 hạt màu vàng neon (`#ffe600`), mờ dần và biến mất trong 0.5 giây.
*   **UX-DR-4**: Trạng thái màn hình (Menu, Playing, Pause Overlay, Game Over Overlay) hiển thị khớp với EXPERIENCE.md.
*   **UX-DR-5**: Sử dụng phông chữ Outfit/Inter cho giao diện chung, và phông chữ Courier New (Monospace) cho Score Board.
*   **UX-DR-6**: Thiết kế bo góc nhẹ `{rounded.md}` (8px) cho các thành phần UI điều khiển, giữ nguyên góc vuông sắc cạnh cho rắn, mồi, vật cản trên canvas.

### FR Coverage Map

*   **FR-1 (Menu & Game Mode Selection)**: Epic 1 (Classic Mode) và Epic 3 (Challenge Mode).
*   **FR-2 (High Score Display on Menu)**: Epic 2 (Classic High Score) và Epic 3 (Challenge High Score).
*   **FR-3 (Snake Movement & Direction Lock)**: Epic 1.
*   **FR-4 (Boundary Wrap-Around)**: Epic 1.
*   **FR-5 (Self-Collision)**: Epic 1.
*   **FR-6 (Food Eating & Growing)**: Epic 2.
*   **FR-7 (Obstacle Generation & Collision)**: Epic 3.
*   **FR-8 (Dynamic Neon Theme Color Shifts)**: Epic 3.
*   **FR-9 (Eat Particles & Screen Shake)**: Epic 2 (Hạt bụi sáng) và Epic 3 (Rung màn hình).
*   **FR-10 (High Score Save to LocalStorage)**: Epic 2 (Classic Mode) và Epic 3 (Challenge Mode).
*   **FR-11 (Pause & Restart)**: Epic 1.

## Epic List

### Epic 1: Giao diện nền tảng & Cơ chế Rắn di chuyển (Classic Mode Core)
Thiết lập giao diện tối giản, vẽ lưới canvas game, cho phép người chơi điều khiển Rắn di chuyển, đi xuyên qua tường biên, tự cắn đuôi thì Game Over, và phím tắt Pause (Esc/P) / Restart (R).
*   **FRs covered:** FR-1 (Classic), FR-3, FR-4, FR-5, FR-11.
*   **Giá trị cho người dùng:** Người chơi có thể chơi thử nghiệm cơ chế di chuyển của rắn mà không lo về mồi hay vật cản.

### Epic 2: Vòng lặp ăn mồi, Điểm số & Lưu trữ điểm cao (Gameplay Loop & Persistence)
Xây dựng logic sinh mồi đỏ ngẫu nhiên trên ô trống, ăn mồi làm rắn dài ra, cộng điểm, tăng tốc độ game, hiển thị Game Over overlay và lưu điểm cao nhất vào LocalStorage.
*   **FRs covered:** FR-2 (Classic), FR-6, FR-9 (Eat particles), FR-10 (Classic).
*   **Giá trị cho người dùng:** Hoàn thiện game vòng lặp cốt lõi, người chơi có thể ăn mồi để tranh đua điểm số cao nhất của mình.

### Epic 3: Chế độ Thử thách & Hiệu ứng Neon động (Challenge Mode & Neon Aesthetics)
Bổ sung màn hình Menu chính để chọn chế độ chơi và xem điểm cao của cả 2 chế độ. Tích hợp chế độ chơi Challenge Mode có 5 chướng ngại vật tĩnh sinh ngẫu nhiên. Thêm hiệu ứng màu neon chuyển đổi màu chủ đạo sau mỗi 100 điểm và rung màn hình khi ăn mồi.
*   **FRs covered:** FR-1 (Challenge), FR-2 (Challenge), FR-7, FR-8, FR-9 (Screen shake), FR-10 (Challenge).
*   **Giá trị cho người dùng:** Tạo sự đa dạng với chế độ chơi khó hơn và nâng cấp hiệu ứng hình ảnh lôi cuốn, đẹp mắt.

---

## Epic 1: Giao diện nền tảng & Cơ chế Rắn di chuyển (Classic Mode Core)

Mục tiêu của Epic này là xây dựng toàn bộ cơ chế cốt lõi của game rắn ở chế độ Classic: thiết lập Canvas game, vẽ rắn, điều khiển rắn bằng bàn phím (Arrow/WASD) với hàng đợi di chuyển, cho phép đi xuyên tường biên, và xử lý va chạm đuôi (thất bại) cũng như tạm dừng (Pause)/Restart màn chơi.

### Story 1.1: Tạo khung giao diện và vẽ Canvas trống
As a player,
I want to see a clean, centered game screen with a glowing canvas and scoreboard,
So that I can experience the futuristic neon theme from the very start.
*   **Acceptance Criteria:**
    *   **Given** trang web được mở trên trình duyệt.
    *   **When** ứng dụng tải xong.
    *   **Then** hiển thị một phần tử `<canvas>` kích thước 400x400px căn giữa màn hình trên nền tối `#0d0e15`.
    *   **And** Canvas có viền phát sáng màu xanh lá neon `{colors.neon-green}` và bóng mờ.
    *   **And** hiển thị bảng điểm "Score: 0" và "Classic High: 0" sử dụng phông chữ Courier New phía trên Canvas.

### Story 1.2: Điều khiển Rắn di chuyển cơ bản
As a player,
I want to control a 4-cell snake moving at 150ms intervals using arrow keys or WASD,
So that I can guide it smoothly around the grid cells.
*   **Acceptance Criteria:**
    *   **Given** trò chơi đã bắt đầu và trạng thái là `PLAYING`.
    *   **When** không có phím nào được nhấn.
    *   **Then** rắn có độ dài 4 đốt di chuyển liên tục sang bên Phải với tốc độ 150ms một bước.
    *   **When** người chơi nhấn phím mũi tên Xuống hoặc phím `S`.
    *   **Then** rắn sẽ chuyển hướng đi xuống dưới ở bước tiếp theo.
    *   **And** phím bấm được đưa vào mảng hàng đợi `inputQueue` để ngăn chặn việc rắn tự quay đầu 180 độ tức thời gây lỗi tự cắn đuôi.

### Story 1.3: Cơ chế đi xuyên biên tường (Boundary Wrap-Around)
As a player,
I want the snake to wrap around to the opposite border when it goes off-screen,
So that I can keep playing without dying instantly at the boundaries.
*   **Acceptance Criteria:**
    *   **Given** đầu rắn đang nằm ở ô biên ngoài cùng bên phải (X = 19) và hướng di chuyển là sang Phải.
    *   **When** game tick tiếp theo xảy ra.
    *   **Then** đầu rắn sẽ xuất hiện ở ô biên ngoài cùng bên trái (X = 0) trên cùng hàng Y.
    *   **And** quy tắc chia dư (modulo) tương tự phải áp dụng cho cả 4 cạnh (Trái, Phải, Trên, Dưới).

### Story 1.4: Tự cắn đuôi (Self-Collision) và Game Over
As a player,
I want the game to end and show a Game Over overlay when the snake's head bites its body,
So that there is a clear penalty and challenge.
*   **Acceptance Criteria:**
    *   **Given** rắn đang di chuyển và có độ dài từ 5 đốt trở lên.
    *   **When** tọa độ đầu rắn trùng với tọa độ của bất kỳ đốt thân nào của nó.
    *   **Then** game loop dừng lại lập tức, đặt trạng thái game sang `GAME_OVER`.
    *   **And** hiển thị một lớp phủ màu đen bán trong suốt đè lên canvas với chữ "GAME OVER" màu đỏ nhấp nháy phát sáng ở giữa.

### Story 1.5: Trạng thái Pause và Restart
As a player,
I want to pause the game by pressing Esc/P and restart by pressing R,
So that I can control when to rest or start a new attempt.
*   **Acceptance Criteria:**
    *   **Given** trạng thái game là `PLAYING`.
    *   **When** người chơi nhấn phím `Escape` hoặc `P`.
    *   **Then** trò chơi tạm dừng di chuyển, hiển thị chữ "PAUSED" nhấp nháy trên canvas.
    *   **When** người chơi nhấn phím `R` bất kỳ lúc nào.
    *   **Then** trò chơi tải lại ngay lập tức (Rắn dài 4 đốt, vị trí giữa màn hình, hướng đi Phải, điểm số 0, trạng thái `PLAYING`).

---

## Epic 2: Vòng lặp ăn mồi, Điểm số & Lưu trữ điểm cao (Gameplay Loop & Persistence)

Mục tiêu của Epic này là hoàn thiện gameplay chính: sinh mồi ngẫu nhiên, ăn mồi dài rắn và cộng điểm, tăng tốc độ game, vẽ hiệu ứng nổ hạt bụi sáng khi ăn mồi và lưu điểm cao kỷ lục vào localStorage.

### Story 2.1: Sinh mồi ngẫu nhiên và Ăn mồi tăng điểm
As a player,
I want a food block to spawn on a random empty cell, and eating it should grow the snake and add score,
So that I have a clear gameplay loop and objective.
*   **Acceptance Criteria:**
    *   **Given** game đang chạy và không có mồi trên bảng chơi.
    *   **When** sinh mồi mới.
    *   **Then** tọa độ của mồi không được trùng với bất kỳ tọa độ ô nào của thân rắn.
    *   **When** đầu rắn đi qua ô chứa mồi.
    *   **Then** điểm số cộng thêm 10 điểm.
    *   **And** chiều dài rắn tăng thêm 1 đốt ở đuôi.
    *   **And** một viên mồi đỏ mới được sinh ngẫu nhiên trên một ô lưới trống khác.

### Story 2.2: Tăng tốc độ game khi ăn mồi
As a player,
I want the game speed to increase with every food eaten, down to a safe speed limit,
So that the game becomes increasingly challenging.
*   **Acceptance Criteria:**
    *   **Given** tốc độ khởi đầu là 150ms mỗi game tick.
    *   **When** rắn ăn được một viên mồi.
    *   **Then** khoảng thời gian giữa các game tick (`speed`) giảm đi 5ms.
    *   **And** tốc độ không bao giờ được giảm dưới mức tối thiểu là 50ms per tick (giới hạn tốc độ tối đa).

### Story 2.3: Hiệu ứng hạt bụi sáng khi ăn mồi (Eat Particles)
As a player,
I want to see a burst of glow particles when the snake eats food,
So that the action of eating feels visually satisfying.
*   **Acceptance Criteria:**
    *   **Given** rắn ăn mồi thành công.
    *   **When** khung hình tiếp theo cập nhật.
    *   **Then** hệ thống sinh ra 10 hạt bụi sáng màu vàng `{colors.neon-yellow}` xuất phát từ tọa độ của viên mồi và bay ra ngẫu nhiên rồi mờ dần biến mất hoàn toàn trong 0.5 giây.

### Story 2.4: Lưu trữ và hiển thị điểm cao (Classic High Score)
As a player,
I want my highest score in Classic mode to be saved and loaded automatically,
So that I can see and beat my records.
*   **Acceptance Criteria:**
    *   **Given** rắn chết và game chuyển sang `GAME_OVER`.
    *   **When** số điểm đạt được lớn hơn điểm cao nhất hiện tại của Classic Mode trong `localStorage`.
    *   **Then** hệ thống ghi điểm mới vào `localStorage.setItem('neon_snake_classic_high', score)`.
    *   **And** hiển thị bảng chữ "NEW HIGH SCORE!" nhấp nháy phát sáng trên màn hình kết thúc.

---

## Epic 3: Chế độ Thử thách & Hiệu ứng Neon động (Challenge Mode & Neon Aesthetics)

Mục tiêu của Epic này là mở rộng trải nghiệm: bổ sung giao diện Menu chính để chọn chế độ, thiết lập chế độ Challenge Mode với 5 vật cản tĩnh ngẫu nhiên, tạo hiệu ứng chuyển dải màu neon sau mỗi 100 điểm, và thêm hiệu ứng rung màn hình khi ăn mồi.

### Story 3.1: Menu chính chọn chế độ và hiển thị điểm cao
As a player,
I want a startup menu to select Classic or Challenge mode and view their respective high scores,
So that I can easily navigate the game.
*   **Acceptance Criteria:**
    *   **Given** game được khởi động và trạng thái là `MENU`.
    *   **When** màn hình hiển thị.
    *   **Then** giao diện hiển thị danh sách gồm "Classic Mode" và "Challenge Mode" với màu chữ phụ `{colors.text-secondary}`.
    *   **And** hiển thị điểm cao của cả 2 chế độ từ LocalStorage.
    *   **When** người chơi bấm mũi tên Lên/Xuống hoặc W/S.
    *   **Then** chế độ đang chọn sẽ sáng lên với viền phát sáng `{colors.neon-green}`.
    *   **When** người chơi nhấn Enter.
    *   **Then** game bắt đầu chơi ở chế độ đã chọn.

### Story 3.2: Sinh chướng ngại vật trong Challenge Mode
As a player,
I want 5 static obstacle blocks to spawn in Challenge Mode and touch them causes Game Over,
So that I have a harder, more tactical game mode.
*   **Acceptance Criteria:**
    *   **Given** chế độ chơi được chọn là Challenge Mode.
    *   **When** game bắt đầu chơi.
    *   **Then** sinh ra ngẫu nhiên 5 chướng ngại vật tĩnh (kích thước 1x1 ô) trên lưới.
    *   **And** các chướng ngại vật này không trùng nhau, không đè lên rắn và cách đầu rắn ban đầu ít nhất 3 ô lưới.
    *   **When** đầu rắn chạm vào bất kỳ chướng ngại vật nào.
    *   **Then** game kết thúc ngay lập tức (Game Over).

### Story 3.3: Hiệu ứng chuyển dải màu Neon theo điểm số và Rung màn hình
As a player,
I want the neon colors of the game to cycle to a new color theme every 100 points, and shake slightly on eat,
So that I get a strong, engaging sense of visual progression.
*   **Acceptance Criteria:**
    *   **Given** game đang trong trạng thái `PLAYING`.
    *   **When** điểm số hiện tại đạt mốc 100, 200, 300, v.v.
    *   **Then** màu sắc neon của rắn, viền canvas, và mồi chuyển dịch mượt mà sang màu tiếp theo trong chuỗi: Green -> Pink -> Blue -> Orange -> Purple -> Green.
    *   **When** rắn ăn mồi.
    *   **Then** game canvas dịch chuyển (offset) ngẫu nhiên 2-3px trong thời gian 100ms để tạo hiệu ứng rung nhẹ.

---

## Epic 4: Cờ Ca rô Online & Đồng bộ qua Supabase (Gomoku Online Sync)

Mục tiêu là xây dựng trò chơi cờ ca rô 15x15 ô chơi đối kháng trực tuyến thời gian thực giữa hai người chơi thông qua Supabase.

### Story 4.1: Bàn cờ Ca rô Neon và Chế độ chơi Cục bộ (Offline Fallback)
As a player,
I want to play Caro on a glowing 15x15 neon grid locally,
So that I can play with a friend on the same computer when network/Supabase is offline.
*   **Acceptance Criteria:**
    *   **Given** tab Gomoku được chọn.
    *   **When** người chơi nhập nickname và nhấn "Tạo phòng mới" (khi Supabase chưa kết nối).
    *   **Then** hệ thống tự khởi động chế độ chơi local (Offline Fallback).
    *   **And** hiển thị bàn cờ 15x15 với các quân X (Neon Cyan) và O (Neon Pink) thay phiên nhau đánh sau mỗi cú click chuột.
    *   **And** tự động quét và tìm ra 5 quân cờ liên tiếp để kẻ đường highlight màu vàng neon kết thúc game.

### Story 4.2: Kết nối và đồng bộ phòng chơi Online
As a player,
I want to create or join a private online room with a 4-character code,
So that I can connect with a remote friend online.
*   **Acceptance Criteria:**
    *   **Given** Supabase Client đã được cấu hình thành công.
    *   **When** người chơi 1 nhấn "Tạo phòng mới".
    *   **Then** hệ thống tạo mã phòng ngẫu nhiên 4 ký tự và chèn một dòng trạng thái 'waiting' vào bảng `caro_rooms`.
    *   **When** người chơi 2 nhập mã phòng và nhấn "Vào phòng".
    *   **Then** hệ thống chuyển trạng thái phòng thành 'playing' và bắt đầu đăng ký kênh Realtime đồng bộ nước đi của hai bên.

---

## Epic 5: Trò chuyện thời gian thực (Real-time Chat)

Mục tiêu là tích hợp khung chat thời gian thực ngay bên cạnh bàn cờ Caro khi đang chơi online để tăng tính tương tác xã hội giữa hai người chơi.

### Story 5.1: Giao diện Khung chat Neon
As a player in a Gomoku match,
I want to see a chat box next to the board canvas with scrolling messages,
So that I can easily type and read messages during the match.
*   **Acceptance Criteria:**
    *   **Given** người chơi đang trong giao diện trận đấu Caro (`#caroGame`).
    *   **When** hiển thị trên màn hình máy tính để bàn (Desktop).
    *   **Then** khung chat rộng khoảng 300px hiển thị song song bên phải bàn cờ canvas.
    *   **And** khung chat có khung hiển thị tin nhắn (Message history) cuộn tự động và một ô nhập văn bản kèm nút "GỬI".
    *   **And** khung chat có thiết kế màu neon đồng bộ, bo góc nhẹ 8px.

### Story 5.2: Truyền tin nhắn Realtime qua Supabase Broadcast
As a player in a Gomoku match,
I want my sent messages to appear instantly on my friend's screen,
So that we can talk in real-time without delay.
*   **Acceptance Criteria:**
    *   **Given** trận đấu Caro online đang hoạt động.
    *   **When** người chơi nhập tin nhắn và nhấn phím Enter (hoặc bấm nút "GỬI").
    *   **Then** tin nhắn được phát đi lập tức thông qua kênh **Supabase Realtime Broadcast** (không cần ghi vào Database để tối ưu tốc độ).
    *   **And** đối thủ nhận được tin nhắn và hiển thị nó trong khung chat tức thì.
    *   **And** các tin nhắn hiển thị tên người gửi và có màu sắc neon khác nhau đại diện cho quân cờ đang cầm (X màu Cyan, O màu Pink).

