| Users | Mô tả |
|-|-|
| id | Steamid64 của tài khoản |
| username | Tên của tài khoản "[A-Z][a-z][0-9]._" thỏa mãn 3-20 ký tự |
| is_admin | Tài khoản có phải là Admin không |
| avatar | Lấy Avatar Steam làm Avatar tài khoản |
| created_at | Thời gian tạo tài khoản |

| Teams | Mô tả |
|-|-|
| id (key) |
| teamname | Tên đội |
| captain -> Users.id | User ID của đội trưởng |

| Players | Mô tả |
|-|-|
| user_id -> Users.id | User ID thuộc Team ID |
| team_id -> Teams.id | Team ID chứa User ID |
| is_ready | Người chơi này sẵn sàng hay chưa |
| joined_at | Thời gian người chơi này tham gia đội |

| Matches | Mô tả |
|-|-|
| id (key) |
| match_name | Admin phải đặt tên trận đấu |
| num_maps | BO mode `1`, `3`, `5` |
| match_status | Trạng thái 'waiting', 'in_progress', 'finished' |
| match_password | 'NULL' là Public, ngược lại là Private |
| match_description | Người tạo trận trận đấu mô tả trận đấu |
| created_at | Thời gian tạo trận đấu |

| Maps | Mô tả |
|-|-|
| id (key) |
| match_id -> Matches.id | Map này thuộc trận đấu nào |
| map_name | Tên map được ban/pick |
| action_type | Map này được `ban` hay được `pick` |
| team_action | 'team1' là team1 ban/pick, 'team2' là team2 ban/pick, NULL là map decider |
| side_team | 'ct' là team_action chọn CT, 't' là team_action chọn T, NULL là roundknife |
| action_at | Thời điểm thực hiện, có thể dùng để sắp xếp thứ tự ban/pick |


