# `fhelp` — Hướng dẫn lệnh

## Summary
Hiển thị menu hướng dẫn dạng embed, có button để xem từng nhóm lệnh (khám phá/tu luyện/thu thập/thông tin game).

## Command & Aliases
- **Command**: `fhelp`
- **Aliases**: `h`, `trogiup`, `huongdan`
- **Source**: `src/commands/core/help.js`

## Cooldown
- **Cooldown**: không có (không dùng `CooldownManager`)

## Inputs
- Không có tham số.

## Outputs / UI
- 1 embed chính + 4 button:
  - `help_exploration`
  - `help_cultivation`
  - `help_collection`
  - `help_game_info`
- Khi bấm button: trả về embed chi tiết (ephemeral).

## Flow (high-level)
1. Tạo embed chính.
2. Reply message với embed + button row.
3. Tạo collector (10 phút) để xử lý button.
4. Với mỗi button: render embed tương ứng và reply ephemeral.

## Data & Calculators liên quan
- Không phụ thuộc data JSON trực tiếp (nội dung help đang hardcode text).

## Edge cases / Notes
- Collector timeout sau 10 phút.
- Vì help text hardcode nên nếu thêm command mới cần cập nhật nội dung trong file này để khớp.

