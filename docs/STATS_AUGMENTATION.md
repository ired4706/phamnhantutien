## Quy tắc cộng chỉ số (STR, INT, DEX, VIT, LUK) và combat stats

Tài liệu này tổng hợp cách cộng chỉ số đã thống nhất để đồng bộ giữa dữ liệu và code.

### 1) Thuật ngữ và pipeline tính chỉ số
- Core stats: STR, INT, DEX, VIT, LUK từ `spirit-roots.json`.
- Growth: `growth_rates` theo số tầng Luyện Khí đã qua.
- Multipliers: `stageMultiplier` (cảnh giới) × `tierMultiplier` (sơ/trung/hậu kỳ).
- Combat stats (quy đổi từ core): attack, defense, hp, mp, speed, critical, evasion, accuracy, penetration.

Pipeline chuẩn trong `stats-calculator.js`:
1. Lấy core + growth.
2. Áp multipliers để ra 5 core-stats đã nhân: STR', INT', DEX', VIT', LUK'.
3. Quy đổi sang combat stats thô.
4. Áp modifiers từ trang bị/buff/effects.

### 2) Cộng chỉ số vĩnh viễn (permanent)
- Dùng cho: đan dược vĩnh viễn, mốc thành tựu, đột phá đặc thù.
- Vị trí cộng: TRƯỚC multipliers (bước 1 → 2), coi như thay đổi "nền tảng" nhân vật.
- Lưu trữ đề xuất: `player.permanent_stats = { STR:+x, INT:+y, DEX:+z, VIT:+u, LUK:+v }`.
- Lý do: được hưởng scaling theo cảnh giới/tier, tự động tăng trưởng đúng kỳ vọng.

### 3) Trang bị (vũ khí, giáp, phụ kiện)
- Không cộng vào core trước multipliers để tránh nhân quá lớn.
- Hai lớp áp dụng:
  - corePostScale (sau multipliers, trước quy đổi combat): cộng trực tiếp vào STR', INT', DEX', VIT', LUK'.
  - combat modifiers: cộng/nhân trực tiếp vào combat stats sau quy đổi.

Đề xuất cấu trúc khi build stats cho player:
```
player.equipmentBonuses = {
  corePostScale: { STR: +x, INT: +y, DEX: +z, VIT: +u, LUK: +v },
  combatAdd: { attack:+a, defense:+b, hp:+c, mp:+d, speed:+e, penetration:+p, accuracy:+q, critical:+r, evasion:+s },
  combatMul: { attack:+0.10, defense:+0.05 },
  resist: { fire:0.10, wood:0.05, water:0, metal:0, earth:0, wind:0, lightning:0, void:0 }
}
```

### 4) Buff tạm thời (consumable dùng NGOÀI combat)
- Ví dụ: đan tăng STR 15 phút.
- Vị trí cộng: layer riêng `activeEffects` ở player, kiểm tra `expiresAt` theo thời gian thực.
- Áp dụng vào pipeline mỗi lần tính stats (lazy-check):
  - Nếu buff cộng STR/… → áp sau multipliers (như corePostScale) để tránh nhân hai lần ngoài ý muốn.
  - Nếu buff cộng trực tiếp combat stats (hp/attack/…) → áp ở combatAdd/combatMul.
- Gợi ý: thời lượng 10–30 phút (mặc định 15p), không stack cùng nhóm; dùng lại → refresh.

### 5) Buff/debuff trong combat (status effects)
- Áp dụng và tính DYNAMIC ngay khi nhận (không chụp tại đầu trận).
- Lưu tại `entity.statusEffects` và đọc mỗi lần:
  - Gây sát thương: `calculateDamage` đọc modifiers (attack_boost, defense_bonus, damage_reduction, penetration…).
  - Tick theo lượt: giảm `duration`, áp `dot/hot`, hồi `regen`, giảm `cooldown`.
- Chính sách stack: `stacking_policy` (replace | refresh | stack | extend) + `exclusive_group`.
- Nên quản lý data-driven tại `data/effects/status-effects.json`.

### 6) Kháng/miễn nhiễm/xuyên (elemental + mechanics)
- Kháng nguyên tố: áp ở bước tính damage (on_calc) trước khi tính sát thương cuối.
- Xuyên giáp/penetration: áp trong `calculateDamage` như hiện có.
- Miễn nhiễm CC: đọc hiệu ứng passive/proc trước khi áp cc.
- Nguồn dữ liệu: `data/effects/equipment-effects.json`, `data/effects/elemental-resistances.json`.

### 7) Gợi ý lưu trữ effect & tham chiếu
- Items (`elixirs.json`, `herbs.json`, `equipment.json`) chỉ tham chiếu `effects: ["effect_id"]`.
- Logic effect trong `data/effects/*.json` (không trộn vào item).
- Engine xử lý: `EffectEngine`/`EffectRegistry` (đọc triggers on_apply, on_tick, on_calc, on_hit, on_expire).

### 8) AP & Speed (liên quan combat flow)
- Base AP: 1 cho mọi tu vi; Speed advantage cộng tối đa +4 AP.
- Solo/Raid đều refill theo APMax cập nhật từ speed.
- (Không ảnh hưởng trực tiếp đến pipeline cộng chỉ số, nhưng ảnh hưởng lượt/tần suất tác dụng hiệu ứng.)

### 9) Tóm tắt quyết định chính
- Permanent: cộng TRƯỚC multipliers (pre-scale core) → scaling theo cảnh giới.
- Equipment: cộng SAU multipliers (post-scale core) hoặc thẳng combat stats.
- Consumable ngoài combat: thời gian thực (khuyên 15p), áp như equipment layer, refresh khi dùng lại.
- Status effects trong combat: dynamic, đọc mỗi lần tính toán; tick theo lượt.


