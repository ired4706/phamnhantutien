# Tổng Hợp Tất Cả Các Loại Log Trong Combat

Tài liệu này liệt kê tất cả các loại log có thể xuất hiện trong hệ thống combat hiện tại.

## 📋 Mục Lục
1. [Log Khởi Động Combat](#log-khởi-động-combat)
2. [Log Initiative & Speed Advantage](#log-initiative--speed-advantage)
3. [Log Tấn Công](#log-tấn-công)
4. [Log Phòng Thủ](#log-phòng-thủ)
5. [Log Kỹ Năng Người Chơi](#log-kỹ-năng-người-chơi)
6. [Log Vũ Khí](#log-vũ-khí)
7. [Log Kỹ Năng Quái](#log-kỹ-năng-quái)
8. [Log Hiệu Ứng Trạng Thái (Buffs/Debuffs)](#log-hiệu-ứng-trạng-thái-buffsdebuffs)
9. [Log Status Effects](#log-status-effects)
10. [Log Chuyển Ải/Wave](#log-chuyển-ảiwave)
11. [Log Raid](#log-raid)
12. [Log Chạy Trốn](#log-chạy-trốn)
13. [Log UI Messages (Warning/Error)](#log-ui-messages-warningerror)

---

## Log Khởi Động Combat

### Solo Combat
- `📣 Bắt đầu ải 1/X: [Tên quái]` - Khi bắt đầu wave combat

### Raid Combat
- `📣 Bắt đầu RAID - Ải 1/X` - Khi bắt đầu raid combat

---

## Log Initiative & Speed Advantage

### Initiative
- `🎲 **Initiative**: Bạn đi trước!` - Người chơi đi trước
- `🎲 **Initiative**: [Tên quái] đi trước!` - Quái đi trước

### Speed Advantage
- `⚡ **Speed Advantage**: Bạn +X AP` - Bonus AP cho người chơi
- `⚡ **Speed Advantage**: [Tên quái] +X action` - Bonus action cho quái

### Slow Effect
- `🐌 [Tên] bị làm chậm → SPD: X → Y (AP bonus: Z)` - Khi bị slow, hiển thị speed giảm và AP bonus mới

---

## Log Tấn Công

### Tấn Công Thường (Normal Attack)
- `⚔️ [Tên] tấn công → **X** sát thương!` - Tấn công thành công
- `⚔️ [Tên] tấn công → **X** sát thương **CRIT**` - Tấn công critical
- `❌ [Tên] tấn công → **MISS**` - Tấn công miss

### Evade
- `💨 [Tên] né tránh hoàn toàn` - Khi có hiệu ứng evade_next

---

## Log Phòng Thủ

### Phòng Thủ
- `🛡️ [Tên] phòng thủ → DEF +50% (1 lượt)` - Phòng thủ thành công

---

## Log Kỹ Năng Người Chơi

### Kỹ Năng Tấn Công (Attack Skill)
- `✨ [Tên] thi triển **[Tên skill]** → **X** sát thương` - Skill tấn công đơn
- `✨ [Tên] thi triển **[Tên skill]** (AOE) → **X** sát thương mỗi mục tiêu` - Skill AoE

### Kỹ Năng Hồi Máu (Heal Skill)
- `✨ [Tên] thi triển **[Tên skill]** → Hồi **X HP**` - Hồi máu solo
- `✨ [Tên] thi triển **[Tên skill]** → Hồi **X HP**` - Hồi máu raid

### Kỹ Năng Buff/Debuff
- `✨ [Tên] thi triển **[Tên skill]** →` + [Log buff/debuff tương ứng] - Xem phần Buff/Debuff

### AoE Damage (Raid)
- `💥 **AOE**: [Log 1] | [Log 2] | ...` - Tổng hợp log AoE cho nhiều mục tiêu

---

## Log Vũ Khí

### Tấn Công Thường Với Vũ Khí
- `🗡️ [Tên] dùng **[Tên vũ khí]** → **X** sát thương` - Tấn công thành công
- `🗡️ [Tên] dùng **[Tên vũ khí]** → **X** sát thương **CRIT**` - Tấn công critical
- `🗡️ [Tên] dùng **[Tên vũ khí]** → **MISS**` - Tấn công miss

### Kỹ Năng Vũ Khí
- `🗡️ [Tên] thi triển **[Tên skill]** → **X** sát thương` - Skill vũ khí thành công

### Lỗi
- `❌ [Tên] hành động không hợp lệ` - Hành động không hợp lệ

---

## Log Kỹ Năng Quái

### Quái Sử Dụng Skill
- `✨ [Tên quái] dùng **[Tên skill]**` - Bắt đầu sử dụng skill
- `✨ [Tên quái] dùng **[Tên skill]** → **X** sát thương` - Skill gây damage thành công
- `✨ [Tên quái] dùng **[Tên skill]** → **X** sát thương **CRIT**!` - Skill critical
- `✨ [Tên quái] dùng **[Tên skill]** → **MISS**` - Skill miss
- `❌ [Tên quái] không đủ MP để dùng **[Tên skill]**` - Không đủ MP

### Quái Skill Effects (Từ applySkillEffect)
- ` Gây hiệu ứng: [Tên effect] (X lượt)` - DoT effect
- ` Tăng [Stat] **+X%** (Y lượt)` - Buff stat
- ` Giảm [Stat] **-X%** (Y lượt)` - Debuff stat
- ` Hồi **X HP**` - Heal
- ` Gây choáng (X lượt)` - Stun
- ` Kích hoạt phản đòn` - Counter attack
- ` Tấn công liên tiếp **X** lần` - Multi attack
- ` Sát thương lan sang mục tiêu khác` - Splash damage
- ` Đẩy lùi địch` - Knockback
- ` Xuyên giáp` - Armor penetration
- ` Làm chậm lượt đi của địch` - Turn delay
- ` Tăng sát thương **+X%**` - Damage boost
- ` Giảm sát thương **-X%**` - Damage reduction
- ` Tăng kháng hiệu ứng` - Status resistance
- ` Tăng CR` - Crit boost
- ` Có cơ hội tấn công 2 lần` - Double attack
- ` Có cơ hội né tránh hoàn toàn` - Perfect dodge
- ` Có cơ hội hồi sinh` - Revive

### Quái Tấn Công/Phòng Thủ
- Sử dụng cùng format như log tấn công/phòng thủ của người chơi

---

## Log Hiệu Ứng Trạng Thái (Buffs/Debuffs)

### Buffs (Tăng Chỉ Số)
- `🔺 [Tên] DEF **+X%** (Y lượt)` - Tăng defense
- `🔺 [Tên] ATK **+X%** (Y lượt)` - Tăng attack
- `🔺 [Tên] CRIT **+X%** (Y lượt)` - Tăng critical
- `🔺 [Tên] SPD **+X%** (Y lượt)` - Tăng speed
- `🔺 [Tên] REGEN **+X%** (Y lượt)` - Tăng regeneration
- `💨 [Tên] né đòn kế tiếp` - Evade next
- `🛡️ [Tên] miễn nhiễm hiệu ứng xấu kế tiếp` - Status immunity
- `🔰 [Tên] hồi **X HP**` - Instant heal từ buff
- `✨ [Tên] kích hoạt ATK (AOE) **X%** (Y lượt)` - Per-turn AoE
- `🛡️ [Tên] khiêu khích (X lượt)` - Taunt

### Debuffs (Giảm Chỉ Số)
- `🔻 [Tên] ATK **-X%** (Y lượt)` - Giảm attack
- `🔻 [Tên] SPD **-X%** (Y lượt)` - Giảm speed
- `🔻 [Tên] sát thương **-X%** (Y lượt)` - Giảm damage taken
- `🔻 Toàn đội giảm sát thương **-X%** (Y lượt)` - Team damage reduction

### Status Effects (Hiệu Ứng Đặc Biệt)
- `⛔ [Tên] bị choáng (X lượt)` - Stun
- `☠️ [Tên] bị độc (X lượt)` - Poison
- `🔥 [Tên] bị thiêu đốt (X lượt)` - Burn
- `🛡️ [Tên] miễn nhiễm hiệu ứng xấu` - Status immunity triggered
- `🛡️ [Tên] miễn nhiễm choáng` - Stun immunity
- `🛡️ [Tên] miễn nhiễm độc` - Poison immunity
- `🛡️ [Tên] miễn nhiễm thiêu đốt` - Burn immunity

### Team Effects (Raid)
- `🔰 Toàn đội hồi máu và tăng hồi phục` - Team heal/regen

---

## Log Status Effects

### Stun (Choáng)
- `⛔ [Tên] bị choáng và bỏ lượt` - Solo combat
- `⛔ [Tên] bị choáng và bỏ lượt` - Raid combat
- `⛔ ${defenderName} bị choáng (X lượt)` - Khi apply stun

### Slow (Làm Chậm)
- `🐌 [Tên] bị chậm → SPD: X → Y (AP bonus: Z)` - Khi bị slow

---

## Log Chuyển Ải/Wave

### Solo Combat
- `🚪 Sang ải **X/Y**: Quái: **[Tên quái]**` - Chuyển sang ải tiếp theo

### Raid Combat
- `🚪 Sang ải **X/Y**` - Chuyển sang ải tiếp theo trong raid

### Rewards
- `🎁 Hoàn thành ải X! Nhận EXP + vật phẩm.` - Hoàn thành ải

---

## Log Raid

### Raid Actions
- `👤 [Tên]: [Log hành động]` - Hành động của từng thành viên trong raid
- `🏃 [Tên] đã rời RAID` - Thành viên rời raid

### Raid Skill
- `✨ [Tên] thi triển **[Tên skill]** → **X** sát thương lên [Tên mục tiêu]` - Skill tấn công đơn mục tiêu
- `✨ [Tên] thi triển **[Tên skill]** (AOE)→ **X** sát thương` - Skill AoE

---

## Log Chạy Trốn

### Chạy Trốn Thành Công
- `🏃 Chạy trốn thành công!` - Chạy trốn thành công

### Chạy Trốn Thất Bại
- `❌ Chạy trốn thất bại!` - Chạy trốn thất bại

---

## Log UI Messages (Warning/Error)

### Combat State Errors
- `❌ Trận chiến không tồn tại hoặc đã kết thúc` - Combat không tồn tại
- `❌ Bạn không thuộc trận này` - Không phải người tham gia
- `❌ Không phải lượt của bạn` - Không phải lượt của bạn (Raid)

### Action Point Errors
- `⚠️ Hết AP` - Hết AP
- `❌ Không đủ AP để phòng thủ` - Không đủ AP để phòng thủ

### Action Lock Errors
- `⚠️ Đang xử lý hành động...` - Đang xử lý hành động khác
- `❌ Không thể dùng kỹ năng lúc này` - Không thể dùng skill (action lock)
- `❌ Không thể dùng vũ khí lúc này` - Không thể dùng vũ khí (action lock)

### Skill Errors
- `❌ Chưa có kỹ năng` - Chưa có skill
- `❌ Không đủ MP` - Không đủ MP để dùng skill
- `⏳ Kỹ năng đang hồi (X lượt)` - Skill đang cooldown
- `❌ Hành động không hợp lệ` - Không thể dùng skill của người khác (Raid)

### Weapon Errors
- `❌ Không tìm thấy kĩ năng vũ khí` - Không tìm thấy weapon skill
- `⏳ Kỹ năng vũ khí đang hồi (X lượt)` - Weapon skill đang cooldown

### Defend Errors
- `❌ Đã phòng thủ lượt này` - Đã phòng thủ rồi

### Item Errors
- `🧪 Sử dụng vật phẩm (đang phát triển)...` - Item system chưa hoàn thiện

### Empty Log
- `⚪ Chưa có hành động` - Chưa có log nào (hiển thị khi battleLog rỗng)

---

## 📝 Ghi Chú

1. **Format Log**: Tất cả log đều được format qua `formatLogEntry()` trong `CombatUI.js` để:
   - Thêm icon phù hợp (⚔️, ✨, 🛡, ⛔, 🔄, 🔥, 🐌, 🎲, etc.)
   - In đậm tên người chơi và quái
   - Format damage: `-> X sát thương`
   - In đậm tên skill: `dùng **"[Tên skill]"**`
   - Format CRITICAL: `**CRITICAL**`
   - Viết tắt stats: ATK, DEF, SPD, ACC, EVA, CRIT, PEN
   - Format hiệu ứng: `Tăng DEF +15% (2 lượt)`

2. **Log Duplicate Prevention**: 
   - Weapon system có cơ chế deduplicate: `if (last !== log) combat.battleLog.push(log)`

3. **Log Display**:
   - Solo combat: Hiển thị 6 log gần nhất
   - Raid combat: Hiển thị 8 log gần nhất

4. **Icon Mapping**:
   - 🎲 - Initiative
   - ⚔️ - Tấn công
   - ✨ - Kỹ năng
   - 🛡 - Phòng thủ
   - ⛔ - Choáng/Stun
   - 🔄 - Phản kích/Counter
   - 🔥 - Cháy/Burn
   - 🐌 - Chậm/Slow
   - 💨 - Né tránh/Evade
   - ⚡ - Speed advantage
   - 📣 - Khởi động combat
   - 🚪 - Chuyển ải
   - 🎁 - Rewards
   - 🏃 - Chạy trốn/Rời raid
   - 💥 - AoE damage
   - 👤 - Raid action
   - ⚠️ - Warning/Trượt
   - ❌ - Error/Miss/Fail
   - ⏳ - Cooldown/Waiting
   - 🧪 - Item
   - ⚪ - Empty/No action

---

## 🔄 Cập Nhật

Tài liệu này được cập nhật lần cuối: [Ngày hiện tại]
Nếu có thêm log mới, vui lòng cập nhật tài liệu này.
