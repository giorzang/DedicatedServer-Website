# giORZang's Dedicated Server

### Tính năng
- Login bằng tài khoản Steam.
- Admin có thể tạo Match mới, đặt tên, thể loại (`BO1`, `BO3` và `BO5`), mật khẩu (tùy chọn) và mô tả trận đấu.
  - Với mỗi `matches.id = i` ta có `teams.id = 2*i-1` và `teams.id = 2*i`.
  - Sau khi tạo Match, database tự tạo ra 2 teams với `teams.captain = NULL`.
- User có thể tham gia một Team nào đó trong Match nếu Match đó đang ở trạng thái `waiting` và Team đó chưa đủ 5 người.
  - Ta thêm vào database `players(user_id, team_id) = players(users.steamid64, teams.id)` nghĩa là User đã thành công tham gia Team.
  - Nếu User tham gia một Team nào đó trong Match có `teams.captain = NULL` thì User đó sẽ làm captain (`teams.captain = users.steamid64`)
  - Nếu User là captain của một Team nào đó trong Match mà User đó rời Match thì `teams.captain = NULL` và xóa dữ liệu`players(users.steamid64, teams.id)`
- Sau khi User tham gia Match sẽ có nút `Ready/Unready`.
- Admin có nút `Start` để bắt đầu khi tất cả User trong Match `Ready`.
