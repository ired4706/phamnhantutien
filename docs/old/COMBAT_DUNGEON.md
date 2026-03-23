# Combat Command Doc - DUNGEON

## I, Summary
- Lệnh `dungeon` mở combat nhiều ải (wave) cho 1 người chơi.
- Có cơ chế quái endurance và boss cuối biến dị.

## II, Command & Aliases
- **Command**: `dungeon`
- **Aliases**: `dg`, `hamnguc`, `underground`
- **Source**: `src/commands/combat/dungeon.js`
- **Cooldown**: `21600000ms` (6 giờ)

## III, Core Flow (Step-by-step)
- **1) Cooldown check**: check start game + cooldown.
- **2) Prepare combat context**: xác định tier theo tu vi, generate 3 quái (ải cuối là boss).
- **3) Start combat**: khởi tạo wave combat.
- **4) Build first UI**: render combat UI và gửi message đầu tiên.
- **5) Auto monster turn**: nếu quái đi trước thì chạy turn quái sau 800ms.

## IV, Combat Configuration
- **Combat mode**: `wave` (3 ải mặc định).
- **Monster generation**: `generateDungeonMonster` dùng `monsterManager.generateRandomMonster`.
- **Difficulty rules**:
- Variant thường: `normal` 50%, `mutated` 40%, `super_mutated` 10%.
- Boss cuối: `mutated` 70%, `super_mutated` 30%.
- Endurance modifiers: HP ~1.3-1.5x, DEF ~1.10-1.15x.

## V, Rewards & Progression
- **Experience (Linh khí)**: không cộng trực tiếp trong command `execute`.
- **Spirit Stones**: không cộng trực tiếp trong command `execute`.
- **Items/Loot**: khi thắng combat, combat system thêm vật phẩm bằng `ItemDropCalculator.calculateHuntItems` (theo [RATE_HUNT.md](../10_misc/RATE_HUNT.md)); `getDungeonLoot()` hiện chỉ là helper text.
- **Other stats**: không update trực tiếp tại command level.

## VI, Data & Functions Used
- **Managers/Systems**: `playerManager`, `cooldownManager`, `monsterManager`, `combatSystem`
- **Calculators**: `expCalculator`, `SpiritStonesCalculator`
- **Function names**: `playerManager.hasStartedGame`, `playerManager.createNotStartedEmbed`, `playerManager.getPlayer`, `cooldownManager.checkCooldown`, `cooldownManager.createCooldownEmbed`, `monsterManager.getPlayerEquivalentTier`, `monsterManager.generateRandomMonster`, `combatSystem.startWaveCombat`, `combatSystem.createCombatUI`, `combatSystem.performMonsterTurn`, `interaction.reply`

## VII, UI
- **Primary response type**: interactive combat UI.
- **Main sections shown**: combat state theo wave, player vs quái.
- **Ephemeral/public behavior**: cooldown/not-start embed; không có nhánh `flags: 64` riêng trong `execute`.

## IX, Error Handling
- **Known fail paths**: chưa start game, cooldown.
- **Runtime catch**: không có `try/catch` bao ngoài toàn command; lỗi bubble theo runtime.
