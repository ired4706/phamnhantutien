# Combat Command Doc - HUNT

## I, Summary
- Lệnh `hunt` mở trận combat solo với 1 quái theo tu vi người chơi.
- Trọng tâm là bắt đầu trận đánh real-time UI; reward chính được xử lý trong luồng combat system.

## II, Command & Aliases
- **Command**: `hunt`
- **Aliases**: `h`, `sanyeu`, `hunting`
- **Source**: `src/commands/combat/hunt.js`
- **Cooldown**: `30000ms` (30 giây)

## III, Core Flow (Step-by-step)
- **1) Cooldown check**: kiểm tra đã start game, lấy player, check cooldown.
- **2) Prepare combat context**: lấy tier theo tu vi, generate random monster.
- **3) Start combat**: khởi tạo combat solo.
- **4) Build first UI**: render combat UI và reply message đầu tiên.
- **5) Auto monster turn**: nếu quái đi trước thì trigger turn quái sau 800ms.

## IV, Combat Configuration
- **Combat mode**: `solo`.
- **Monster generation**: theo `realm`, `realmLevel` của player.
- **Difficulty rules**: không có sub-tier riêng trong command; phụ thuộc tier monster generator.

## V, Rewards & Progression
- **Experience (Linh khí)**: không cộng trực tiếp trong file command; xử lý trong combat flow.
- **Spirit Stones**: không cộng trực tiếp trong file command; xử lý trong combat flow.
- **Items/Loot**: vật phẩm được combat system thêm bằng `ItemDropCalculator.calculateHuntItems` (theo [RATE_HUNT.md](../10_misc/RATE_HUNT.md)).
- **Other stats**: không update trực tiếp trong command.

## VI, Data & Functions Used
- **Managers/Systems**: `playerManager`, `cooldownManager`, `monsterManager`, `combatSystem`
- **Calculators**: `expCalculator`, `SpiritStonesCalculator`, `ItemDropCalculator`
- **Function names**: `playerManager.hasStartedGame`, `playerManager.createNotStartedEmbed`, `playerManager.getPlayer`, `cooldownManager.checkCooldown`, `cooldownManager.createCooldownEmbed`, `monsterManager.getPlayerEquivalentTier`, `monsterManager.generateRandomMonster`, `combatSystem.startCombat`, `combatSystem.createCombatUI`, `combatSystem.performMonsterTurn`, `interaction.reply`

## VII, UI
- **Primary response type**: interactive combat UI.
- **Main sections shown**: payload từ `combatSystem.createCombatUI`.
- **Ephemeral/public behavior**: lỗi runtime gửi `flags: 64`, còn lại là reply public.

## IX, Error Handling
- **Known fail paths**: chưa start game, đang cooldown.
- **Runtime catch**: fallback text `❌ Có lỗi xảy ra khi săn yêu thú!`.
