# Source Code Documentation (`src/`)

## Table of Contents
- [1. Purpose](#1-purpose)
- [2. High-level Structure](#2-high-level-structure)
- [3. Folder Responsibilities](#3-folder-responsibilities)
- [4. Important Files](#4-important-files)
- [5. Data Flow](#5-data-flow)
- [6. Architecture and Patterns](#6-architecture-and-patterns)
- [7. Examples](#7-examples)
- [8. Unclear from Code](#8-unclear-from-code)
- [9. Maintenance Notes](#9-maintenance-notes)

## 1. Purpose
This `src/` folder implements a Discord RPG/cultivation game bot.  
It handles:
- command execution (combat, crafting, exploration, cultivation, quests, management, core),
- game state updates (player/combat/monster/guild),
- reward/stat/drop calculations,
- UI responses (embeds, buttons, interaction updates).

## 2. High-level Structure
```text
src/
  commands/
  systems/
    combat/
  services/
  container/
  utils/
    core/
    data/
    game/
```

## 3. Folder Responsibilities

### `src/commands`
Command handlers grouped by game domain:
- `core`: start/help/status/ping/test
- `combat`: hunt/challenge/domain/dungeon
- `cultivation`: meditate/breakthrough/spiritroot/...
- `crafting`: alchemy/craft/equipment/...
- `exploration`: pick/mine/explore
- `management`: inventory/item/wallet/skills/...
- `quests`: daily/weekly/guild

Each command typically exports metadata (`name`, `aliases`, `cooldown`) and `execute(interaction, args)`.

### `src/systems`
Core runtime systems (stateful managers + orchestration):
- player lifecycle and persistence,
- combat lifecycle,
- monster generation and scaling,
- raid lobby flow,
- guild management,
- EXP and level requirement rules.

### `src/systems/combat`
Modular combat engine internals:
- turn management,
- damage/status computations,
- skill and weapon logic,
- monster AI,
- combat UI rendering,
- raid-specific turn helpers.

### `src/services`
Service-style abstractions (`PlayerService`, `SpiritRootService`, `CombatService`) for structured business logic and storage access.

### `src/container`
Dependency container (`ServiceContainer`) for registering/retrieving service instances.

### `src/utils`
- `utils/core`: logger/retry/error/shared helpers
- `utils/data`: JSON file access, cache, item loader
- `utils/game`: calculators (drop/stats/cooldown/spirit stones/emoji)

## 4. Important Files

### Commands
- `src/commands/combat/hunt.js`  
  Starts solo combat by creating a monster from player realm/tier and delegating battle to `combatSystem`.
- `src/commands/combat/domain.js`  
  Handles multi-step raid command (tier selection, invite/accept/decline/start/status) and starts raid combat.
- `src/commands/combat/dungeon.js`  
  Creates wave-based dungeon combat with boss/endurance modifiers.
- `src/commands/combat/challenge.js`  
  Result-based duel command (win/lose roll), then updates EXP, spirit stones, reputation, karma.
- `src/commands/core/start.js`  
  Player start/onboarding flow with spirit root selection UI.
- `src/commands/core/status.js`  
  Displays player/cultivation/combat status, using stats calculation and loaded data.

### Systems
- `src/systems/player.js`  
  Main player manager: load/save players, inventory updates, spirit stones, EXP progression, breakthroughs, skill learning.
- `src/systems/combat.js`  
  Central combat orchestration: active sessions, turns, actions, UI updates, wave/raid progression, end-combat rewards.
- `src/systems/monster.js`  
  Loads monster datasets and generates monster instances with tier/variant/stat scaling.
- `src/systems/raid.js`  
  Raid lobby manager (host/party lifecycle, join/leave/start/cancel UI support).
- `src/systems/exp-calculator.js`  
  EXP formulas and per-command EXP wrappers.
- `src/systems/level-requirements.js`  
  Level requirement definitions and progression helpers.

### Combat modules
- `src/systems/combat/TurnManager.js`: turn/AP sequencing
- `src/systems/combat/DamageCalculator.js`: damage/hit/crit/element logic
- `src/systems/combat/SkillSystem.js`: active skill execution rules
- `src/systems/combat/WeaponSystem.js`: weapon action/skill logic
- `src/systems/combat/MonsterAI.js`: monster action decisions
- `src/systems/combat/CombatUI.js`: embed/components rendering

### Utils
- `src/utils/game/item-drop-calculator.js`  
  Drop quantity and rarity rules per command (`pick`, `mine`, `hunt`, `explore`, `challenge`, `domain`, `dungeon`, `daily`, `weekly`).
- `src/utils/game/stats-calculator.js`  
  Converts core stats and bonuses into combat stats.
- `src/utils/game/spirit-stones-calculator.js`  
  Spirit stone rewards and update helpers.
- `src/utils/game/cooldown.js`  
  Cooldown validation, remaining-time formatting, cooldown embed creation.
- `src/utils/data/item-loader.js`  
  Loads/merges item JSON files into in-memory catalog.
- `src/utils/data/file-manager.js`  
  Async JSON read/write helper.

## 5. Data Flow

### Command flow (input -> processing -> output)
1. Discord interaction triggers a command in `src/commands/**`.
2. Command validates user state (`hasStartedGame`, cooldown, command-specific conditions).
3. Command delegates domain logic to systems/calculators:
   - combat commands -> `monsterManager` + `combatSystem`
   - non-combat commands -> EXP/drop/spirit stone calculators
4. State is mutated in memory (player/combat/lobby maps/objects).
5. State is persisted to JSON (primarily via player/guild system writes).
6. User response is sent via embed/UI (`interaction.reply`, `editReply`, etc.).

### Combat flow (typical)
1. Initialize combat context (`startCombat` / `startWaveCombat` / `startRaidCombat`).
2. Render initial UI (`createCombatUI` or `createRaidUI`).
3. Handle player action -> compute effects/damage/status.
4. Advance turns (`TurnManager`), monster AI acts as needed.
5. Detect end condition -> award rewards -> persist player updates -> final UI.

## 6. Architecture and Patterns
- **Mixed architecture**:
  - direct singleton managers in `systems/*` (`module.exports = new ...`)
  - DI/service style via `container/ServiceContainer.js` + `services/*`
- **State management**:
  - in-memory runtime maps for active sessions (players/combat/lobbies/guilds)
  - periodic/explicit cleanup for expired combats
- **File-based persistence**:
  - JSON files in `data/` are the practical source of truth
- **Calculator-driven game logic**:
  - drop, cooldown, EXP, stats, spirit stone logic mostly centralized in `utils/game/*`
- **Interaction-centric UI**:
  - embeds + buttons/select menus; heavy use of message update flows for combat

## 7. Examples

### Example: `hunt`
```text
interaction -> hasStartedGame -> checkCooldown
-> generateRandomMonster (by realm/tier)
-> startCombat
-> createCombatUI + reply
-> turn loop
-> endCombat reward/persist/update UI
```

### Example: `explore`
```text
interaction -> hasStartedGame -> checkCooldown
-> calculateExploreExp + calculateExplore + calculateExploreItems
-> update player exp/spirit stones/timestamp
-> reply embed with summary + breakdown
```

## 8. Unclear from Code
- Global Discord event routing/dispatch entrypoint is unclear from `src/` alone (the top-level `interactionCreate` wiring is not clearly visible here).
- There are parallel paths (`systems/*` and `services/*`); exact production preference per command is mixed.
- Some API parity between service and system layers appears partial in usage patterns (certain calls guarded conditionally).

## 9. Maintenance Notes
- Keep command docs synced with calculator/system sources to avoid duplicated outdated rates/formulas.
- Prefer linking config/rate docs from command docs instead of duplicating tables.
- If expanding features, choose one architecture path consistently:
  - either service/container-first,
  - or direct systems-first.
- Add/update docs whenever modifying:
  - drop rate tables,
  - EXP formulas,
  - cooldown fields,
  - persistence schema.

