# Game Balance Core Logic Documentation (`src/`)

## Table of Contents
- [ItemDropCalculator (`src/utils/game/item-drop-calculator.js`)](#itemdropcalculator-srcutilsgameitem-drop-calculatorjs)
- [SpiritStonesCalculator (`src/utils/game/spirit-stones-calculator.js`)](#spiritstonescalculator-srcutilsgamespirit-stones-calculatorjs)
- [ExpCalculator (`src/systems/exp-calculator.js`)](#expcalculator-srcsystemsexp-calculatorjs)
- [StatsCalculator (`src/utils/game/stats-calculator.js`)](#statscalculator-srcutilsgamestats-calculatorjs)
- [MonsterManager (`src/systems/monster.js`)](#monstermanager-srcsystemsmonsterjs)
- [DamageCalculator (`src/systems/combat/DamageCalculator.js`)](#damagecalculator-srcsystemscombatdamagecalculatorjs)
- [TurnManager + CombatHelpers (`src/systems/combat/TurnManager.js`, `CombatHelpers.js`)](#turnmanager--combathelpers-srcsystemscombatturnmanagerjs-combathelpersjs)
- [CooldownManager (`src/utils/game/cooldown.js`)](#cooldownmanager-srcutilsgamecooldownjs)
- [LevelRequirements (`src/systems/level-requirements.js`)](#levelrequirements-srcsystemslevel-requirementsjs)
- [Player Breakthrough Logic (`src/systems/player.js`)](#player-breakthrough-logic-srcsystemsplayerjs)
- [Combat Command Hardcoded Balance (`src/commands/combat/*.js`)](#combat-command-hardcoded-balance-srccommanưđidscombatjs)
- [Crafting/Alchemy Hardcoded Balance (`src/commands/crafting/*.js`)](#craftingalchemy-hardcoded-balance-srccommandscraftingjs)
- [Cross-module Hidden Assumptions](#cross-module-hidden-assumptions)

---

## ItemDropCalculator (`src/utils/game/item-drop-calculator.js`)

### Purpose
Tính item drop cho các command gameplay (`pick`, `mine`, `hunt`, `explore`, `challenge`, `domain`, `dungeon`, `daily`, `weekly`), bao gồm số lượng và xác suất rarity.

### Core Logic
- Load item catalog từ `itemLoader`.
- Chọn pool item theo category (hoặc all items).
- Tính `count` theo command/realm.
- Roll rarity (`selectRarityByDropRate` hoặc `selectRarityByWeight`).
- Chọn random item trong rarity đã roll.
- Tránh trùng id trong cùng lượt bằng mảng `selected`.

### Formulas / Rules
- Rarity roll theo drop-rate:
  - `random = Math.random() * 100`
  - cộng dồn `%` theo thứ tự object entries, rarity đầu tiên vượt ngưỡng sẽ được chọn
- Rarity roll theo weight:
  - `totalWeight = sum(weights)`
  - trừ dần weight cho đến khi `random <= 0`

### Configurable Parameters
| Name | Value | Meaning | Suggested Range |
|---|---:|---|---|
| Pick count | `2-4` | số herb/lượt | `1-5` |
| Pick weights | `60/25/10/3/1.5/0.5` | common..mythic | tổng ~100, mythic `0.1-1` |
| Mine count by realm | LK `3-5`, TC `4-6`, KD `5-7`, NA `6-8` | số khoáng/lượt | giữ chênh `+1/+1` mỗi realm |
| Hunt count by realm | LK `1-2`, TC `1-3`, KD `2-4`, NA `2-5` | số hunt loot/lượt | LK `1-3`, NA `3-6` |
| Explore discoveries count | `2-4` | số discovery text | `1-5` |
| Challenge count | `1-2` | số special_items/lượt | `1-3` |
| Domain count | `2-4` | số artifacts/lượt | `2-5` |
| Dungeon count | `3-6` | số items/lượt | `2-7` |
| Daily random count | `1-3` | random item thêm vào guaranteed | `0-4` |
| Weekly random count | `2-5` | random item thêm vào guaranteed | `1-6` |

### Exact Drop-rate Tables (by realm)
- **Mine**:
  - LK `80/20/0/0/0`
  - TC `55/35/10/0/0`
  - KD `35/35/25/5/0`
  - NA `20/30/35/14/1`
- **Hunt**:
  - LK `80/20/0/0/0`
  - TC `60/30/10/0/0`
  - KD `40/35/20/5/0`
  - NA `25/35/30/9/1`
- **Challenge**:
  - LK `70/25/5/0/0`
  - TC `50/35/12/3/0`
  - KD `30/40/25/4/1`
  - NA `20/35/35/9/1`
- **Domain**:
  - LK `60/30/10/0/0`
  - TC `40/40/18/2/0`
  - KD `25/45/25/4/1`
  - NA `15/40/35/9/1`
- **Dungeon**:
  - LK `65/30/5/0/0`
  - TC `45/40/13/2/0`
  - KD `30/45/22/3/0`
  - NA `20/40/32/7/1`
- **Daily**:
  - LK `70/25/5/0/0`
  - TC `50/35/12/3/0`
  - KD `35/40/20/4/1`
  - NA `25/40/25/9/1`
- **Weekly**:
  - LK `60/30/8/2/0`
  - TC `40/40/15/4/1`
  - KD `25/45/25/4/1`
  - NA `15/45/30/9/1`

### Notes
- `realmLevel` được truyền vào nhưng hầu như chưa dùng để nội suy rate.
- `explore` không trả item object, chỉ trả discovery text.
- `daily/weekly` có guaranteed items hardcoded trong code, không đọc từ config file ngoài.

---

## SpiritStonesCalculator (`src/utils/game/spirit-stones-calculator.js`)

### Purpose
Tính và format reward linh thạch theo command.

### Core Logic
- Mỗi command có hàm `calculateX()` riêng trả object:
  - `ha_pham`, `trung_pham`, `thuong_pham`, `cuc_pham`
- Một số tier guaranteed, một số tier roll theo xác suất độc lập.

### Formulas / Rules
- Ví dụ:
  - `ha_pham = base + floor(rand * span)`
  - `trung_pham = Math.random() < p ? n : 0`

### Configurable Parameters
| Name | Value | Meaning | Suggested Range |
|---|---:|---|---|
| Pick ha_pham | `2-6` | low-tier stones | `1-8` |
| Pick trung_pham chance | `2%` | +1 | `1-5%` |
| Explore ha_pham | `5-12` | low-tier stones | `3-15` |
| Explore trung_pham chance | `5%` | +1 | `2-8%` |
| Hunt ha_pham | `1-3` | low-tier stones | `1-5` |
| Hunt trung_pham chance | `1%` | +1 | `0.5-3%` |
| Mine ha_pham | `20-40` | economy source | `10-50` |
| Mine trung_pham chance | `8%` | +1 | `5-12%` |
| Mine thuong_pham chance | `0.2%` | +1 | `0.1-0.5%` |
| Challenge ha_pham | `30-60` | PvP-ish reward | `20-80` |
| Challenge trung_pham chance | `10%` | +1 | `5-15%` |
| Challenge thuong_pham chance | `0.5%` | +1 | `0.2-1%` |
| Domain ha_pham | `120-240` | high-tier content | `80-300` |
| Domain trung_pham | `30%` for `1-2` | mid-tier stones | `20-40%` |
| Domain thuong_pham chance | `3%` | +1 | `1-5%` |
| Domain cuc_pham chance | `0.2%` | +1 | `0.1-0.5%` |
| Dungeon ha_pham | `90-180` | high-tier content | `60-250` |
| Dungeon trung_pham | `25%` for `1-2` | mid-tier stones | `15-35%` |
| Dungeon thuong_pham chance | `2%` | +1 | `1-4%` |
| Dungeon cuc_pham chance | `0.15%` | +1 | `0.05-0.3%` |
| Daily ha_pham | `200-300` guaranteed | daily baseline | `150-400` |
| Daily trung_pham | `1 guaranteed + 20% +1` | daily mid-tier baseline | base `1-2` |
| Daily thuong_pham chance | `3%` | +1 | `1-5%` |
| Weekly ha_pham | `1000-1500` guaranteed | weekly baseline | `700-2000` |
| Weekly trung_pham | `5 guaranteed + 30% +1..3` | weekly mid-tier baseline | base `3-8` |
| Weekly thuong_pham chance | `10%` | +1 | `5-15%` |
| Weekly cuc_pham chance | `1%` | +1 | `0.5-2%` |

### Notes
- Không scale theo realm trong file này (scale theo command).
- `updatePlayerSpiritStones` giả định object path `player.inventory.spiritStones` đã tồn tại.

---

## ExpCalculator (`src/systems/exp-calculator.js`)

### Purpose
Tính Linh khí theo công thức tổng quát + wrapper per-command.

### Core Logic
- Công thức:
  - `finalExp = round(baseExp * realmScale * difficultyMultiplier * eventMultiplier * randomVariance)`
- `difficultyMultiplier` chỉ áp dụng cho domain keys.
- Các command khác mặc định difficulty = `1.0`.

### Formulas / Rules
- `realmScales`:
  - `luyen_khi 1.0`, `truc_co 1.5`, `ket_dan 2.0`, `nguyen_anh 2.5`
- `domainDifficulties`:
  - `domain 1.5`, `domain_easy 0.8`, `domain_hard 2.0`, `domain_boss 3.0`
- `randomVariance`:
  - min `0.9`, max `1.1`, `enabled=true`
- `pick` random baseExp: `40-50`
- `explore` random baseExp: `120-150`

### Configurable Parameters
| Name | Value | Meaning | Suggested Range |
|---|---:|---|---|
| meditate baseExp | `600` | tu luyện theo giờ | `400-900` |
| hunt baseExp | `30` | săn nhanh | `20-60` |
| challenge baseExp | `1200` | duel | `800-1800` |
| domain baseExp | `10000` | raid/high content | `7000-15000` |
| daily baseExp | `6000` | daily reward | `4000-10000` |
| weekly baseExp | `12000` | weekly reward | `9000-20000` |
| dungeon baseExp | `6000` | dungeon reward | `4000-12000` |
| mine baseExp | `0` | no EXP design | `0` |
| pick baseExp random | `40-50` | gathering EXP | `30-80` |
| explore baseExp random | `120-150` | exploration EXP | `80-220` |
| randomVariance | `0.9-1.1` | final random factor | `0.95-1.05` nếu muốn ổn định |

### Notes
- `realmLevel` không làm thay đổi `realmScale` (hàm hiện chỉ trả base realm scale).
- Nếu muốn level influence mạnh hơn, phải sửa `getRealmScale`.

---

## StatsCalculator (`src/utils/game/stats-calculator.js`)

### Purpose
Quy đổi linh căn + realm + realm level thành combat stats.

### Core Logic
1. Lấy `core_stats` + `growth_rates` từ spirit root.
2. Tính `luyenKhiTiers`:
   - `luyen_khi`: = `level`
   - realm khác: cố định `13`
3. Stage multiplier:
   - `luyen_khi 1`, `truc_co 4`, `ket_dan 16`, `nguyen_anh 64`
4. Tier multiplier:
   - cho `truc_co/ket_dan/nguyen_anh`: level `1/2/3` => `1.0/1.5/2.0`
5. Tính core STR/INT/DEX/VIT/LUK rồi convert sang stats chiến đấu.

### Formulas / Rules
- Core stat:
  - `STAT = (core.STAT + growth.STAT * luyenKhiTiers) * (stageMultiplier * tierMultiplier)`
- Combat conversion:
  - `attack = STR*1.8 + INT*0.6 + LUK*0.3`
  - `defense = VIT*2.0 + STR*0.5`
  - `hp = VIT*20 + STR*5`
  - `mp = INT*15 + LUK*3`
  - `speed = DEX*1.5 + LUK*0.5`
  - `regen = INT*0.4 + VIT*0.2`
  - `critical = LUK*0.4 + DEX*0.2`
  - `evasion = DEX*0.3 + LUK*0.3`
  - `accuracy = DEX*0.6`
  - `penetration = STR*0.4 + INT*0.2`

### Configurable Parameters
| Name | Value | Meaning | Suggested Range |
|---|---:|---|---|
| Stage multipliers | `1/4/16/64` | power jump by realm | giảm nếu thấy nhảy sức mạnh quá gắt |
| Tier multipliers | `1.0/1.5/2.0` | early/mid/late trong realm | `1.0/1.3/1.6` nếu muốn mượt hơn |
| Attack coefficients | `1.8, 0.6, 0.3` | STR/INT/LUK impact | tune theo meta |
| HP coefficients | `20, 5` | VIT/STR impact into HP | HP inflation control |

### Notes
- Có đoạn fallback linh căn về `kim` khi không tìm thấy root.

---

## MonsterManager (`src/systems/monster.js`)

### Purpose
Sinh quái theo tier/realm, roll variant, scale stats và reward.

### Core Logic
- Tier -> realm mapping:
  - `nhat_cap -> luyen_khi(1)`
  - `nhi/tam/tu -> truc_co(1/2/3)`
  - `ngu/luc/that -> ket_dan(1/2/3)`
  - `bat/cuu/thap -> nguyen_anh(1/2/3)`
- Element random từ 8 hệ: `kim,moc,thuy,hoa,tho,phong,loi,vo`.
- Variant power multiplier:
  - normal `0.7-0.9`
  - mutated `1.0-1.2`
  - super_mutated `1.3-1.5`
- Reward multiplier by variant:
  - normal `0.75-0.90`
  - mutated `1.0-1.2`
  - super_mutated `2.0-3.0`

### Formulas / Rules
- Hunt variant chance (`selectVariant`):
  - normal `82%`
  - mutated `15%`
  - super_mutated `3%`
- Reward:
  - `expReward = floor(base_exp_reward * lootMultiplier)`
  - `spiritStonesReward = floor(base_spirit_stones * lootMultiplier)`

### Configurable Parameters
| Name | Value | Meaning | Suggested Range |
|---|---:|---|---|
| Variant rate normal/mutated/super | `82/15/3` | hunt encounter rarity | `70-90 / 8-25 / 1-8` |
| Power multiplier normal | `0.7-0.9` | monster weaker than base | `0.8-1.0` |
| Power multiplier mutated | `1.0-1.2` | baseline stronger | `1.0-1.4` |
| Power multiplier super | `1.3-1.5` | elite stronger | `1.2-1.8` |
| Loot multiplier normal | `0.75-0.90` | lower reward | `0.8-1.0` |
| Loot multiplier super | `2.0-3.0` | big jackpot | `1.5-3.5` |
| Fallback stats | atk `100`, def `100`, hp `1000`, mp `500`, speed `50`, crit `10`, regen `5`, eva `10`, acc `10`, pen `5` | khi stat calc lỗi | tune để tránh exploit/farm |

### Hidden Assumptions
- `calculateMonsterStats` random element độc lập với template.
- `tierInfo` param truyền vào nhưng không dùng trực tiếp trong stat formula (ngoài reward base từ tier file).

---

## DamageCalculator (`src/systems/combat/DamageCalculator.js`)

### Purpose
Công thức sát thương chính của combat engine.

### Core Logic
1. Parse stat attacker/defender.
2. Áp status effects (`attack_boost`, `attack_debuff`, `defend`, `defense_bonus`).
3. Hit check dựa ACC/EVA.
4. Penetration giảm DEF hiệu dụng.
5. Crit roll theo `critRating/(critRating+Kcrit)`.
6. Crit multiplier random.
7. Áp reduction từ status effect.
8. Áp elemental multiplier.

### Formulas / Rules
- Hit chance:
  - `accEvaRatio = acc / (acc + eva + 10)`
  - `hitChance = clamp(0.70 + 0.25*accEvaRatio, 0.05, 0.95)`
- Pen:
  - `penReduction = pen / (pen + PEN_BASE)`
  - `effectiveDEF = finalDefense * (1 - penReduction)`
- Base damage:
  - `max(1, finalAttack - effectiveDEF)`
- Crit:
  - `critChance = critRating / (critRating + Kcrit)`
  - `critMultiplier random = 1.4..1.7`
- Element multiplier table:
  - tương khắc: `1.25`
  - bị khắc: `0.80`
  - còn lại: `1.0`

### Configurable Parameters
| Name | Value | Meaning | Suggested Range |
|---|---:|---|---|
| Hit base | `0.70` | baseline hit | `0.60-0.85` |
| Hit ratio coef | `0.25` | ACC/EVA impact | `0.15-0.40` |
| Hit clamp | `0.05..0.95` | min/max hit | `0.05..0.98` |
| Crit multiplier | `1.4..1.7` | crit bonus band | `1.2..2.0` |
| Element advantage | `1.25` | khắc hệ | `1.10..1.35` |
| Element disadvantage | `0.80` | bị khắc | `0.70..0.95` |

### Hidden Assumptions
- `statusEffects` được giả định luôn là array (không null guard trước `.forEach` ở đây).

---

## TurnManager + CombatHelpers (`src/systems/combat/TurnManager.js`, `CombatHelpers.js`)

### Purpose
Quản lý initiative, AP bonus theo speed, chuyển turn và xử lý stun/regen/status theo lượt.

### Core Logic
- Effective speed:
  - nếu có slow: `baseSpeed * (1 - slow.value)` (min 1)
- Speed ratio -> AP bonus player:
  - `>=2 -> +1`, `>=3 -> +2`, `>=4 -> +3`, `>=5 -> +4`
- Monster action bonus:
  - `>=2 -> +1`, `>=3 -> +2`, `>=4 -> +3`
- Base AP từ `getApForRealm` hiện cố định `1` cho mọi realm.

### Formulas / Rules
- `playerApMax = getApForRealm(realm) + apBonus`
- Tie-break initiative: player đi trước khi speed bằng nhau.
- Turn advance condition:
  - `apLeft <= 0` hoặc `(attacked && usedSkill)`

### Configurable Parameters
| Name | Value | Meaning | Suggested Range |
|---|---:|---|---|
| Base AP all realms | `1` | AP nền | `1-2` |
| AP bonus thresholds | `2/3/4/5` | speed breakpoints | tùy pacing trận |
| Player AP bonus cap | `+4` | max speed bonus | `+2..+5` |
| Monster action bonus cap | `+3` | max extra actions | `+1..+4` |

### Hidden Assumptions
- AP system hiện thiên về speed inflation, nhất là khi stat speed scale lớn.

---

## CooldownManager (`src/utils/game/cooldown.js`)

### Purpose
Chuẩn hóa kiểm tra cooldown và field lưu timestamp command.

### Core Logic
- Field đọc cooldown runtime: `player.cultivation.last<Command>`
- Field ghi update: `cultivation.last<Command>` (trừ `forge` -> `forge.lastForge`)

### Formulas / Rules
- `timeSinceLast < cooldownMs` => đang cooldown.
- `remainingText` format theo:
  - giờ/phút hoặc phút/giây hoặc giây.

### Configurable Parameters
| Name | Value | Meaning | Suggested Range |
|---|---:|---|---|
| Message mapping | hardcoded strings | UX cooldown text | n/a |
| Field path rule | `cultivation.lastX` | cooldown storage contract | n/a |

### Hidden Assumptions
- Dữ liệu player phải có object `cultivation`; nếu không có sẽ bypass cooldown (`isOnCooldown=false`).

---

## LevelRequirements (`src/systems/level-requirements.js`)

### Purpose
Bảng EXP requirement cố định cho level 1..22 và mapping realm/realmLevel.

### Core Logic
- `levelExpRequirements` hardcoded hoàn toàn.
- `canBreakthrough(player)` check bằng `currentExp >= nextLevel.expRequired`.

### Formulas / Rules
- Level EXP:
  - Luyện Khí 1..13: `200, 280, 392, 549, 769, 1077, 1508, 2111, 2955, 4137, 5792, 8109, 11353`
  - Trúc Cơ 14..16: `18165, 29064, 46502`
  - Kết Đan 17..19: `83703, 150667, 271201`
  - Nguyên Anh 20..22: `542402, 1084804, 2169608`
- Tổng exp ghi cứng: `4443348`.

### Configurable Parameters
| Name | Value | Meaning | Suggested Range |
|---|---:|---|---|
| Max level | `22` | level cap | theo roadmap |
| Total EXP to max | `4443348` | progression length | theo session length mục tiêu |

### Hidden Assumptions
- Bảng này có thể trùng/chồng logic với `player.getBreakthroughExpRequired` (2 nguồn requirement).

---

## Player Breakthrough Logic (`src/systems/player.js`)

### Purpose
Xác định điều kiện đột phá realm/level: EXP yêu cầu + required items.

### Core Logic
- Dùng `breakthroughExpTable` trong hàm.
- Case major realm transition:
  - LK13 -> TC1 cần `18165`
  - TC3 -> KD1 cần `83703`
  - KD3 -> NA1 cần `542402`
- Trong cùng realm: lookup `nextLevel` từ table.
- Item requirement đọc từ `realms.json` (`breakthroughRequirements`).

### Formulas / Rules
- `linhKhiNeeded = max(0, requiredExp - player.experience)`
- `progress = min(100, player.experience / requiredExp * 100)`

### Configurable Parameters
| Name | Value | Meaning | Suggested Range |
|---|---:|---|---|
| Breakthrough EXP table | như module level | gate progression | phải đồng bộ module level |
| Item gates | theo `realms.json` | progression sink | theo economy/item rarity |

### Hidden Assumptions / Risks
- **Potential bug** trong `removeItemFromInventory`:
  - điều kiện `if (!existingItem || existingItem.quantity < quantity)` nhưng bên trong lại trừ `existingItem.quantity`.
  - logic này ngược, dễ gây lỗi runtime hoặc không trừ item đúng.

---

## Combat Command Hardcoded Balance (`src/commands/combat/*.js`)

### Purpose
Các lệnh combat chứa thêm lớp hardcoded difficulty/reward behavior ngoài calculator.

### Core Logic + Exact Values
- `challenge.js`:
  - win chance: `Math.random() > 0.4` => **60% thắng**
  - thắng: `reputation +1`
  - thua: `karma +1`
- `dungeon.js`:
  - `waveCount = 3`
  - variant roll thường: normal `50%`, mutated `40%`, super `10%`
  - boss variant: mutated `70%`, super `30%`
  - endurance multiplier:
    - HP `1.3..1.5`
    - DEF `1.10..1.15`
    - ATK/SPD/REGEN/MP `1.0`
- `domain.js`:
  - tier realms: basic(LK10), intermediate(TC2), advanced(KD2), supreme(NA2)
  - non-boss variant: normal `40%`, mutated `50%`, super `10%`
  - waves:
    - 2 wave đầu: mỗi wave `3` quái
    - wave cuối: `1 boss + 2 add`
  - non-boss modifier:
    - HP `1.15..1.25`
    - DEF `1.05..1.10`
    - ATK `1.05..1.10`
  - boss modifier:
    - HP `x5..x7`
    - ATK `x1.5..x2`
    - DEF `x1.5..x2`

### Configurable Parameters
| Name | Value | Meaning | Suggested Range |
|---|---:|---|---|
| Challenge win chance | `60%` | expected success rate | `45-65%` |
| Dungeon wave count | `3` | run length | `2-5` |
| Domain boss HP mult | `5..7` | boss tankiness | `3..8` |

### Hidden Assumptions
- Domain/dungeon/hunt reward item trong `combat.js` đều gọi `calculateHuntItems` tại các nhánh reward => hành vi có thể khác kỳ vọng tên command.

---

## Crafting/Alchemy Hardcoded Balance (`src/commands/crafting/*.js`)

### Purpose
Các hàm craft/alchemy ảnh hưởng trực tiếp economy, power growth, item rarity progression.

### Core Logic (Exact Values)
- `alchemy.js`:
  - success rate: `55 + (furnaceLevel - 1) * 3` (%)
  - level 15 => `97%`
  - EXP requirement: `getAlchemyExpRequired(level) = floor(100 * 1.8^(level-1))`
  - material rarity EXP mapping (craft batch): common `5`, uncommon `10`, rare `20`, epic `40`, legendary `80`
- `craft.js` (forge):
  - success rate pattern lặp lại nhiều chỗ:
    - percent mode: `55 + (forgeLevel - 1) * 3`
    - decimal mode: `0.55 + (forgeLevel - 1) * 0.03`
    - level 15 => `97%`
  - forge EXP requirement: `getForgeExpRequired(level) = 50 * 2^(level-1)`
  - forge EXP gain:
    - success `+10`
    - failure `+5`
  - weapon stat random config by rarity:
    - common: lines `1`, substat `1-3`, main STR `3-5`
    - uncommon: lines `2`, substat `3-7`, main STR `15-25`
    - rare: lines `3`, substat `6-12`, main STR `40-60`
    - epic: lines `4`, substat `10-20`, main STR `70-95`
    - legendary: lines `5`, substat `16-30`, main STR `110-140`
  - passive logic:
    - epic/legendary có Thiên passive theo element
    - legendary thêm Thần passive theo element
    - một số passive có xác suất hardcoded: `15%`, `25%`, cooldown `2/4/5` turns...

### Configurable Parameters
| Name | Value | Meaning | Suggested Range |
|---|---:|---|---|
| Alchemy base success | `55%` | base craft chance | `45-65%` |
| Alchemy level gain | `+3%/level` | scaling chance | `+2..+4%` |
| Alchemy exp curve | `100 * 1.8^(L-1)` | upgrade steepness | base `80-150`, growth `1.5-2.0` |
| Forge base success | `55%` | base forge chance | `45-65%` |
| Forge level gain | `+3%/level` | scaling chance | `+2..+4%` |
| Forge exp curve | `50 * 2^(L-1)` | upgrade steepness | base `30-80`, growth `1.6-2.2` |
| Forge exp reward | `+10 / +5` | success/fail EXP | `+8..15 / +3..8` |

### Hidden Assumptions
- Trong `craft.js` có cả nhánh dùng percent (`0-100`) và decimal (`0-1`) cho success rate; nếu tái cấu trúc không cẩn thận dễ lệch logic.

---

## Cross-module Hidden Assumptions

### 1) Reward source mismatch
- Một số luồng combat reward (`domain`, `dungeon`) thực tế dùng `ItemDropCalculator.calculateHuntItems`.
- Tác động: bảng rate command-specific có thể không phản ánh hành vi runtime nếu chỉ đọc command file.

### 2) Duplicate progression source
- `level-requirements.js` và `player.js:getBreakthroughExpRequired` đều chứa bảng requirement tương tự.
- Tác động: dễ lệch số nếu update một nơi mà quên nơi còn lại.

### 3) Cooldown field convention coupling
- `checkCooldown` đọc `player.cultivation.lastX`, `getLastCommandField` ghi `cultivation.lastX` string-path.
- Tác động: schema đổi là có thể hỏng đồng bộ check/write.

### 4) Data dependency
- Nhiều logic giả định dữ liệu JSON tồn tại/hợp lệ (`monsters.json`, `domain-bosses.json`, `realms.json`, item files).
- Khi thiếu data, có fallback nhưng balance có thể đổi mạnh (ví dụ fallback stats monster).

### 5) Known risky logic
- `player.removeItemFromInventory` có điều kiện kiểm tra khả năng trừ item có dấu hiệu ngược.

---

## Editable Balancing Checklist
- [ ] Chuẩn hóa 1 nguồn duy nhất cho bảng EXP progression.
- [ ] Xác nhận reward routing cho domain/dungeon có đúng design hay cần `calculateDomainItems` / `calculateDungeonItems`.
- [ ] Quyết định chuẩn success-rate (percent vs decimal) và thống nhất trong toàn bộ crafting.
- [ ] Kiểm thử sensitivity cho:
  - AP bonus thresholds,
  - crit constants (`Kcrit`),
  - penetration baseline (`PEN_BASE`),
  - rarity distribution high tiers (`epic/legendary`).
- [ ] Sửa logic `removeItemFromInventory` trước khi cân bằng vật phẩm breakthrough.

