| Users | Mô tả |
|-|-|
| id (key) |
| username | Tên đăng nhập |
| passwd | Mật khẩu đăng nhập |
| profile_name | Tên hiển thị trong trận "[A-Z][a-z][0-9]._" thỏa mãn 3-20 ký tự |
| real_name | Tên thật để dễ nhận biết |
| email | email khôi phục tài khoản |
| steamid64 | Tài khoản Steam được liên kết |
| avatar | Lấy Avatar Steam làm Avatar tài khoản |
| is_admin | Có phải tài khoản Admin không |
| created_at | Thời gian tạo tài khoản |

| Teams | Mô tả |
|-|-|
| id (key) |
| teamname | Tên đội |
| captain_id -> Users.id | User ID của đội trưởng |

| Players | Mô tả |
|-|-|
| user_id -> Users.id | User ID thuộc Team ID
| team_id -> Teams.id | Team ID chứa User ID

| Matches | Mô tả |
|-|-|
| id (key) |
| created_by -> User.id | Người tạo trận đấu |
| match_name | Người tạo trận đấu phải đặt tên trận đấu |
| team1_id -> Teams.id | ID của team 1 |
| team2_id -> Teams.id | ID của team 2 |
| bo_mode | Hỗ trợ 'bo1', 'bo3', 'bo5' |
| stt | Trạng thái 'waiting', 'in_progress', 'finished' |
| winner_team_id -> Teams.id | ID của team chiến thắng |
| password | 'NULL' là Public, ngược lại là Private |
| description | Người tạo trận trận đấu mô tả trận đấu |
| created_at | Thời gian tạo trận đấu |

| Maps | Mô tả |
|-|-|
| id (key) |
| match_id -> Matches.id | Map này thuộc trận đấu nào |
| map_name | Tên map được ban/pick |
| action_type | Map này được ban hay được pick |
| team_action | 'team1' là team1 ban/pick, 'team2' là team2 ban/pick, NULL là map decider |
| side_team | 'ct' là team_action chọn CT, 't' là team_action chọn T, NULL là roundknife |
| action_time | Thời điểm thực hiện, có thể dùng để sắp xếp thứ tự ban/pick |

