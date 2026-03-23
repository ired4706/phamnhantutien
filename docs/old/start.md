# `fstart` — Tạo nhân vật & chọn linh căn

## Summary
Khởi tạo người chơi mới. Nếu đã có nhân vật thì báo “đã bắt đầu”. Nếu chưa có, hiển thị embed + button để chọn linh căn.

## Command & Aliases
- **Command**: `fstart`
- **Aliases**: `batdau`, `begin`
- **Source**: `src/commands/core/start.js`

## Cooldown
- **Cooldown**: không có

## Inputs
- Không có tham số.

## Outputs / UI
- Embed “chọn linh căn” + 2 hàng button:
  - Row 1: `choose_kim`, `choose_moc`, `choose_thuy`
  - Row 2: `choose_hoa`, `choose_tho`

## Flow (high-level)
1. Lấy `playerService`/`spiritRootService` từ DI container.
2. Nếu user đã có `player.spiritRoot` → trả embed “đã bắt đầu”.
3. Nếu chưa: render embed lựa chọn và reply cùng button.
4. Việc xử lý khi bấm button (tạo player thật) được handle ở luồng interaction handler trung tâm (không nằm trong file command này).

## Data & Calculators liên quan
- `data/core/spirit-roots.json`: định nghĩa linh căn (qua `spiritRootService`).
- Player persistence: `data/core/players.json` (qua `playerService`).

## Edge cases / Notes
- Command này chỉ hiển thị UI; phần “bấm chọn” phụ thuộc router xử lý button.

