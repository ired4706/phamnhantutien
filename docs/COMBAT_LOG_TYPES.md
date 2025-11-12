# Tóm Tắt Các Loại Log Trong Combat

## 1. Log Khởi Đầu Combat

### Solo Combat (Wave)
- `📣 Bắt đầu ải 1/X: [Tên quái]`

### Raid Combat
- `📣 Bắt đầu RAID - Ải 1/X`

---

## 2. Log Initiative & Speed Advantage

### Initiative
- `🎲 **Initiative**: [Bạn/Tên quái] đi trước!`

### Speed Advantage
- `⚡ **Speed Advantage**: Bạn được +X AP do tốc độ vượt trội!`
- `⚡ **Speed Advantage**: [Tên quái] được +X action do tốc độ vượt trội!`

---

## 3. Log Tấn Công Thường (Normal Attack)

### Tấn công thành công
- `⚔️ [Tên] tấn công gây **X.X** sát thương!`
- `⚔️ [Tên] tấn công gây **X.X** sát thương **CRITICAL!**`

### Tấn công miss
- `❌ [Tên] tấn công nhưng **MISS!**`

### Né tránh
- `💨 [Tên] né tránh hoàn toàn đòn đánh!`

---

## 4. Log Phòng Thủ (Defend)

- `🛡️ [Tên] đã phòng thủ! Defense tăng 50% cho lượt tiếp theo.`

---

## 5. Log Chạy Trốn (Flee)

### Thành công
- `🏃 Bạn đã chạy trốn thành công!`

### Thất bại
- `❌ Chạy trốn thất bại!`

---

## 6. Log Kỹ Năng Người Chơi (Player Skill)

### Solo Combat
- `✨ [Tên] dùng [Tên skill]!`
  - ` Gây **X.X** sát thương AoE!` (nếu AoE)
  - ` Gây X.X sát thương!` (nếu single target)
  - ` Hồi X.X HP!` (nếu heal)
  - ` [Buff/Debuff messages]` (nếu có hiệu ứng)

### Raid Combat
- `✨ [Tên] dùng [Tên skill]!`
  - ` Gây **X.X** sát thương AoE!`
  - ` Gây **X.X** sát thương cho [Tên mục tiêu]!`
  - ` Hồi phục **X.X** HP!`
  - ` Toàn đội hồi máu và tăng hồi phục!` (support skill)

---

## 7. Log Kỹ Năng Vũ Khí (Weapon Skill)

### Tấn công thường bằng vũ khí
- `**[Tên]** dùng vũ khí [Tên vũ khí] → **X.X** sát thương`
- `**[Tên]** dùng vũ khí [Tên vũ khí] → **X.X** sát thương **CRITICAL**`
- `**[Tên]** dùng vũ khí [Tên vũ khí] **MISS**`

### Kỹ năng vũ khí
- `**[Tên]** dùng **"[Tên skill]"** → **X.X** sát thương`
- `**[Tên]** hành động không hợp lệ` (nếu lỗi)

---

## 8. Log Kỹ Năng Quái (Monster Skill)

### Quái sử dụng skill
- `✨ [Tên quái] sử dụng **[Tên skill]**!`
  - ` ⚠️ Đòn đánh trượt!` (nếu miss)
  - ` Gây **X.X** sát thương**CRIT**!` (nếu crit)
  - ` Gây **X.X** sát thương!` (nếu hit)
  - ` [Hiệu ứng khác]`

---

## 9. Log Buff (Tăng Chỉ Số)

### Buff từ skill
- `**[Tên]** tăng DEF +X% (Y lượt)`
- `**[Tên]** tăng ATK +X% (Y lượt)`
- `**[Tên]** tăng CRIT +X% (Y lượt)`
- `**[Tên]** tăng SPD +X% (Y lượt)`
- `**[Tên]** tăng Regen +X% (Y lượt)`
- `**[Tên]** sẽ né đòn kế tiếp`
- `**[Tên]** miễn nhiễm hiệu ứng xấu kế tiếp`
- `**[Tên]** hồi **X.X** HP` (instant heal)
- `**[Tên]** kích hoạt AoE X% ATK (Y lượt)`
- `**[Tên]** khiêu khích (Y lượt)`

---

## 10. Log Debuff (Giảm Chỉ Số)

### Debuff từ skill
- `**[Tên]** giảm ATK -X% (Y lượt)`
- `**[Tên]** giảm SPD -X% (Y lượt)`
- `**[Tên]** giảm sát thương -X% (Y lượt)`
- `Toàn đội giảm sát thương -X% (Y lượt)` (raid)

### Miễn nhiễm
- `**[Tên]** miễn nhiễm hiệu ứng xấu`
- `**[Tên]** miễn nhiễm choáng`
- `**[Tên]** miễn nhiễm độc`
- `**[Tên]** miễn nhiễm thiêu đốt`

---

## 11. Log Status Effects (Hiệu Ứng Trạng Thái)

### Stun (Choáng)
- `**[Tên]** bị choáng (X lượt)` (khi apply)
- `**[Tên]** bị choáng và bỏ lượt` (khi skip turn)

### Slow (Làm Chậm)
- `🐌 [Tên] bị làm chậm! Speed: X → Y (AP bonus: Z)`

### Poison (Độc)
- `**[Tên]** bị độc (X lượt)`

### Burn (Thiêu Đốt)
- `**[Tên]** bị thiêu đốt (X lượt)`

---

## 12. Log AoE Damage

- `💥 **AoE**: → [Tên mục tiêu 1]: X.X sát thương | → [Tên mục tiêu 2]: Y.Y sát thương`

---

## 13. Log Chuyển Wave/Ải

### Solo Combat
- `🚪 Sang ải X/Y`
- `🚪 Sang ải X/Y: [Tên quái]`

### Raid Combat
- `🚪 Sang ải X/Y`

---

## 14. Log Hoàn Thành Wave

- `🎁 Hoàn thành ải X! Nhận được EXP và vật phẩm.`

---

## 15. Log Raid Specific

### Rời raid
- `🏃 [Tên] đã rời RAID!`

---

## 16. Format Log Sau Khi Xử Lý (formatLogEntry)

Sau khi log được thêm vào `battleLog`, chúng được format qua hàm `formatLogEntry`:

### Format chung:
- Tên người chơi/quái được **in đậm**
- Icon độ hiếm của quái đặt **sau tên**: `**Tên quái** ✦`
- Tên kỹ năng được **in đậm** trong dấu ngoặc kép: `**"Tên skill"**`
- Sát thương format: `-> X.X sát thương` (không in đậm)
- Critical: `**CRITICAL**` hoặc `CRIT` (in đậm + caps)
- "sử dụng" → "dùng"

### Format hiệu ứng:
- Thêm `+` trước %: `Tăng DEF +15%`
- Đổi "trong X lượt" → "(X lượt)": `(2 lượt)`
- Nếu có nhiều hiệu ứng, tách thành nhiều dòng với indent 4 spaces:
  ```
  ✨ [Tên] dùng "Skill"
      -> Tăng DEF +15% (2 lượt)
  ```

### Ví dụ sau format:
- `🎲 **Không tưởng chi long** ✸ đi trước`
- `⚔️ **Không tưởng chi long** ✸ tấn công -> 17814.6 sát thương CRIT`
- `✨ **ired0806** dùng **"Liệt diễm trảm"** -> 18730.5 sát thương`
- `✨ **Không tưởng chi long** ✸ dùng **"Hỏa Cầu"** -> 15030.3 sát thương`
- `✨ **Hỗn nguyên thú** ✦ dùng **"Cứng Cáp"**`
    `    -> Tăng DEF +15% (2 lượt)`

---

## Lưu Ý

1. Tất cả log được lưu vào `combat.battleLog` array
2. Log được format qua `formatLogEntry` trước khi hiển thị trong UI
3. Log được hiển thị 6 dòng gần nhất trong combat UI
4. Một số log có thể bị deduplicate (loại bỏ trùng lặp liên tiếp)
5. Log có thể được tách thành nhiều dòng nếu có nhiều hiệu ứng

