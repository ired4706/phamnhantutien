# `fstatus` — Trạng thái tu luyện & chỉ số

## Summary
Hiển thị 3 embed: tổng quan tu luyện, chỉ số combat (kèm core stats + cộng từ trang bị), và thông tin linh căn chi tiết.

## Command & Aliases
- **Command**: `fstatus`
- **Aliases**: `s`, `trangthai`, `info`
- **Source**: `src/commands/core/status.js`

## Cooldown
- **Cooldown**: không có

## Inputs
- Không có tham số.

## Outputs / UI
- Embed 1: tổng quan (cảnh giới, linh khí, linh căn)
- Embed 2: combat stats (HP/MP/ATK/DEF/SPD/CRIT/EVA/ACC/PEN/REGEN/REP/KARMA) + set bonus nếu có
- Embed 3: spirit root details (core_stats, growth_rates, weakness/strength)

## Flow (high-level)
1. Lấy service từ DI container (`playerService`, `spiritRootService`).
2. Nếu user chưa bắt đầu → embed nhắc `fstart`.
3. Load player, realmInfo, spiritRootInfo.
4. Tính base core stats qua `StatsCalculator.calculateBaseStats(...)`.
5. Tính cộng core stats từ trang bị qua `getEquipmentCoreDelta`.
6. Render 3 embed và reply.

## Data & Calculators liên quan
- `data/core/realms.json`: thông tin cảnh giới (qua `playerService.getRealmInfo`)
- `data/core/spirit-roots.json`: core/growth/weakness/strength (qua `spiritRootService`)
- `src/utils/game/stats-calculator.js`: công thức core → combat stats
- Trang bị (equipment instances): `player.inventory.weapons`, `player.inventory.armors`, `player.equipment.*`

## Edge cases / Notes
- File có vài helper cũ/không dùng (`formatInventoryItems` tham chiếu `playerManager` nhưng file không import). Không ảnh hưởng flow hiện tại vì không được gọi.
- `player.stats.*` được kỳ vọng đã được tính ở pipeline khác (khi tạo player / addExperience / equip).

