# Combat Command Doc - CHALLENGE

## I, Summary
- Lệnh `challenge` là combat mô phỏng (không mở UI turn-based), trả kết quả thắng/thua và reward ngay bằng embed.
- Có cập nhật Linh khí, linh thạch, danh tiếng và karma.

## II, Command & Aliases
- **Command**: `challenge`
- **Aliases**: `c`, `thachdau`, `duel`
- **Source**: `src/commands/combat/challenge.js`
- **Cooldown**: `3600000ms` (1 giờ)

## III, Core Flow (Step-by-step)
- **1) Cooldown check**: check start game + cooldown.
- **2) Prepare combat context**: tính EXP, roll kết quả thắng/thua.
- **3) Start combat**: không dùng combat engine; xử lý kết quả trực tiếp trong command.
- **4) Build first UI**: build kết quả bằng embed fields.
- **5) Auto monster turn**: không áp dụng.

## IV, Combat Configuration
- **Combat mode**: `result-based` (non-interactive).
- **Monster generation**: không dùng `monsterManager`.
- **Difficulty rules**: tỉ lệ thắng hiện tại `60%` (`Math.random() > 0.4`).

## V, Rewards & Progression
- **Experience (Linh khí)**: dùng `expCalculator.calculateChallengeExp`.
- **Spirit Stones**: dùng `SpiritStonesCalculator.calculateChallenge`.
- **Items/Loot**: không có item drop trong command này.
- **Other stats**: thắng +1 reputation, thua +1 karma.

## VI, Data & Functions Used
- **Managers/Systems**: `playerManager`, `cooldownManager`
- **Calculators**: `expCalculator`, `SpiritStonesCalculator`
- **Function names**: `playerManager.hasStartedGame`, `playerManager.createNotStartedEmbed`, `playerManager.getPlayer`, `cooldownManager.checkCooldown`, `cooldownManager.createCooldownEmbed`, `expCalculator.calculateChallengeExp`, `SpiritStonesCalculator.calculateChallenge`, `playerManager.addExperience`, `SpiritStonesCalculator.updatePlayerSpiritStones`, `cooldownManager.getLastCommandField`, `SpiritStonesCalculator.createUpdateObject`, `playerManager.updatePlayer`, `interaction.reply`

## VII, UI
- **Primary response type**: single result embed.
- **Main sections shown**: linh khí nhận, linh thạch nhận, kết quả thắng/thua, thay đổi reputation/karma, breakdown EXP.
- **Ephemeral/public behavior**: not-start/cooldown dùng embed thường; không có `flags: 64` trong nhánh chính thành công.

## IX, Error Handling
- **Known fail paths**: chưa start game, cooldown.
- **Runtime catch**: không có `try/catch` bao quanh toàn command; lỗi bubble theo runtime.
