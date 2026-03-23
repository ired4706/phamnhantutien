# Combat Command Doc - DOMAIN

## I, Summary
- Lệnh `domain` là combat raid theo party, có nhiều subcommand để chọn tier, mời người chơi và bắt đầu ải.
- Trọng tâm là quản lý lobby + raid combat nhiều wave.

## II, Command & Aliases
- **Command**: `domain`
- **Aliases**: `dm`, `lanhdia`, `territory`
- **Source**: `src/commands/combat/domain.js`
- **Cooldown**: `28800000ms` (8 giờ)

## III, Core Flow (Step-by-step)
- **1) Cooldown check**: check start game + cooldown.
- **2) Prepare combat context**: parse subcommand (`lesser|greater|grand|supreme|invite|accept|decline|start|status`), chuẩn bị party/tier.
- **3) Start combat**: `start` sẽ tạo waves và khởi tạo raid combat.
- **4) Build first UI**: tạo raid UI và gửi message battle.
- **5) Auto monster turn**: theo raid combat loop (không xử lý trực tiếp tại command level như `hunt`).

## IV, Combat Configuration
- **Combat mode**: `raid`.
- **Monster generation**: generate theo tier bí cảnh + tu vi leader.
- **Difficulty rules**:
- 4 tier: `basic`, `intermediate`, `advanced`, `supreme`.
- Ải 1-2: mỗi ải 3 quái thường.
- Ải cuối: 1 boss + 2 quái phụ.
- Có check item yêu cầu theo tier cho toàn party.

## V, Rewards & Progression
- **Experience (Linh khí)**: có import `expCalculator`, reward chính do combat/raid flow xử lý.
- **Spirit Stones**: có import `SpiritStonesCalculator`, reward chính do combat/raid flow xử lý.
- **Items/Loot**: khi kết thúc ải trong raid, combat/raid reward dùng `ItemDropCalculator.calculateHuntItems` (theo [RATE_HUNT.md](../10_misc/RATE_HUNT.md)).
- **Other stats**: không update trực tiếp trong `execute`.

## VI, Data & Functions Used
- **Managers/Systems**: `playerManager`, `cooldownManager`, `monsterManager`, `combatSystem`, `raidManager`
- **Calculators**: `expCalculator`, `SpiritStonesCalculator`
- **Function names**: `playerManager.hasStartedGame`, `playerManager.createNotStartedEmbed`, `playerManager.getPlayer`, `cooldownManager.checkCooldown`, `cooldownManager.createCooldownEmbed`, `raidManager.getOrCreateLobbyByHost`, `raidManager.getLobbyByHost`, `raidManager.joinLobby`, `raidManager.destroyLobby`, `combatSystem.startRaidCombat`, `combatSystem.createRaidUI`, `monsterManager.generateRandomMonster`, `interaction.reply`

## VII, UI
- **Primary response type**: text response cho quản lý lobby + interactive raid UI khi `start`.
- **Main sections shown**: trạng thái party, tier đã chọn, hướng dẫn subcommand; raid UI khi vào combat.
- **Ephemeral/public behavior**: nhiều nhánh validation dùng `flags: 64`.

## IX, Error Handling
- **Known fail paths**: chưa start game, cooldown, thiếu target invite, tự mời bản thân, chưa có lobby, chưa chọn tier, party trống, thiếu item vào ải.
- **Runtime catch**: một số nhánh fallback nội bộ (đặc biệt load boss data) và trả thông báo lỗi theo context.
