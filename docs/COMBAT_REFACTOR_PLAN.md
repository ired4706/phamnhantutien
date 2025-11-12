# Kế Hoạch Refactor Combat System

## Mục tiêu
Chia nhỏ file `combat.js` (3721 dòng) thành các module nhỏ hơn, dễ đọc và bảo trì.

## Cấu trúc đề xuất

```
src/systems/combat/
├── CombatSystem.js          # Main class - orchestration
├── CombatUI.js               # UI creation & formatting
├── CombatActions.js          # Player actions (attack, defend, flee)
├── MonsterAI.js              # Monster AI & actions
├── SkillSystem.js            # Player & raid skills
├── WeaponSystem.js           # Weapon skills & actions
├── DamageCalculator.js       # Damage calculation logic
├── StatusEffects.js          # Buffs, debuffs, status effects
├── RaidSystem.js             # Raid-specific logic
├── TurnManager.js            # Turn management & initiative
├── CombatHelpers.js          # Utility functions
└── index.js                  # Export main CombatSystem
```

## Chi tiết từng module

### 1. CombatSystem.js (~300 dòng)
**Trách nhiệm:**
- Main class orchestration
- Combat creation (startCombat, startWaveCombat, startRaidCombat)
- Combat state management
- Cleanup expired combats
- Route actions to appropriate handlers

**Dependencies:**
- CombatUI, CombatActions, MonsterAI, RaidSystem, TurnManager

### 2. CombatUI.js (~500 dòng)
**Trách nhiệm:**
- createCombatUI()
- createRaidUI()
- updateCombatUI()
- formatLogEntry()
- UI formatting helpers

**Dependencies:**
- CombatHelpers (getStatIcons, renderTextBar, etc.)

### 3. CombatActions.js (~200 dòng)
**Trách nhiệm:**
- handlePlayerAction()
- performAttack()
- performDefend()
- performFlee()
- showItemMenu()

**Dependencies:**
- DamageCalculator, StatusEffects

### 4. MonsterAI.js (~400 dòng)
**Trách nhiệm:**
- performMonsterTurn()
- performMonsterAction()
- performMonsterGroupTurn()
- performSmartMonsterSkill()
- getAvailableMonsterSkills()
- calculateSkillChance()
- getMonsterTier()
- getMonsterSkills()
- executeSkill()
- applySkillEffect()

**Dependencies:**
- DamageCalculator, StatusEffects, CombatHelpers

### 5. SkillSystem.js (~300 dòng)
**Trách nhiệm:**
- showSkillMenu()
- showRaidSkillMenu()
- usePlayerSkill()
- useRaidSkill()
- findSkillById()
- computeAndApplySkillDamage()
- applyAoEDamageToMonsters()

**Dependencies:**
- DamageCalculator, StatusEffects

### 6. WeaponSystem.js (~250 dòng)
**Trách nhiệm:**
- showWeaponMenu()
- useWeaponAction()
- buildWeaponSkillDescription()
- getWeaponSkill()
- getTierMultiplier()
- getAffinityMultiplier()
- calculateWeaponSkillDamage()

**Dependencies:**
- DamageCalculator, StatusEffects

### 7. DamageCalculator.js (~200 dòng)
**Trách nhiệm:**
- calculateDamage()
- calculateWeaponSkillDamage()
- getElementDamageMultiplier()
- checkCritical()
- calculateHitChance()

**Dependencies:**
- CombatHelpers (REALM_CONFIG)

### 8. StatusEffects.js (~400 dòng)
**Trách nhiệm:**
- applyBuffsFromSkill()
- applyDebuffsFromSkill()
- applyOnHitStatus()
- updateStatusEffects()
- applyRegeneration()

**Dependencies:**
- None (pure functions)

### 9. RaidSystem.js (~500 dòng)
**Trách nhiệm:**
- nextRaidActor()
- nextRaidRound()
- buildRaidInitiative()
- setRaidActorFromInitiative()
- advanceRaidInitiative()
- checkRaidEnd()
- getSymmetricTarget()
- getSymmetricTargetForMonster()

**Dependencies:**
- TurnManager, CombatHelpers

### 10. TurnManager.js (~300 dòng)
**Trách nhiệm:**
- nextTurn()
- maybeAdvanceTurn()
- processTurnStartEffects()
- calculateInitiative()
- getEffectiveSpeed()

**Dependencies:**
- StatusEffects

### 11. CombatHelpers.js (~200 dòng)
**Trách nhiệm:**
- getStatIcons()
- renderTextBar()
- getElementViName()
- getElementViNameOrNone()
- getApForRealm()
- getVariantName()
- getDifficultyStars()
- REALM_CONFIG constant

**Dependencies:**
- None (pure utilities)

### 12. index.js (~50 dòng)
**Trách nhiệm:**
- Export CombatSystem instance
- Re-export các module nếu cần

## Lợi ích

1. **Dễ đọc**: Mỗi file tập trung vào một chức năng cụ thể
2. **Dễ bảo trì**: Tìm và sửa lỗi nhanh hơn
3. **Dễ test**: Có thể test từng module riêng biệt
4. **Dễ mở rộng**: Thêm tính năng mới không ảnh hưởng code cũ
5. **Tái sử dụng**: Các module có thể được dùng ở nơi khác

## Lưu ý khi refactor

1. **Tránh circular dependencies**: 
   - CombatSystem import các module khác
   - Các module không import lẫn nhau
   - Helpers không import gì

2. **Giữ nguyên interface public**:
   - Các method được gọi từ bên ngoài giữ nguyên tên
   - Chỉ thay đổi internal structure

3. **Shared state**:
   - Combat object vẫn được truyền qua các method
   - Không tạo global state

4. **Testing**:
   - Test từng module sau khi refactor
   - Đảm bảo không có regression

## Thứ tự refactor đề xuất

1. **Bước 1**: Tạo CombatHelpers.js (dễ nhất, không dependencies)
2. **Bước 2**: Tạo DamageCalculator.js
3. **Bước 3**: Tạo StatusEffects.js
4. **Bước 4**: Tạo TurnManager.js
5. **Bước 5**: Tạo CombatActions.js
6. **Bước 6**: Tạo SkillSystem.js
7. **Bước 7**: Tạo WeaponSystem.js
8. **Bước 8**: Tạo MonsterAI.js
9. **Bước 9**: Tạo RaidSystem.js
10. **Bước 10**: Tạo CombatUI.js
11. **Bước 11**: Refactor CombatSystem.js (main class)
12. **Bước 12**: Tạo index.js và test toàn bộ

## Migration Strategy

1. Tạo các file mới song song với file cũ
2. Copy code sang các module mới
3. Update imports trong CombatSystem
4. Test từng bước
5. Xóa code cũ sau khi đã test xong

