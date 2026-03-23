# `fping` — Kiểm tra độ trễ

## Summary
Trả embed “Pong!” và thời gian chênh lệch tính bằng ms.

## Command & Aliases
- **Command**: `fping`
- **Aliases**: `p`, `latency`
- **Source**: `src/commands/core/ping.js`

## Cooldown
- **Cooldown**: không có

## Inputs
- Không có tham số.

## Outputs / UI
- 1 embed với 2 field:
  - Bot Latency
  - API Latency (hiện hiển thị `N/A (prefix mode)`)

## Flow (high-level)
1. Check đã bắt đầu game chưa (`playerManager.hasStartedGame`).
2. Ghi lại `startTime`.
3. Reply embed với `Date.now() - startTime`.

## Data & Calculators liên quan
- `playerManager.hasStartedGame`: để chặn user chưa tạo nhân vật.

## Edge cases / Notes
- Không đo latency thật của Discord API, chỉ đo time xử lý đồng bộ trong command.

