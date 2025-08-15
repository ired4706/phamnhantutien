# 🪙 Hệ Thống Linh Thạch Mới - Tỉ Lệ Drop Theo Lệnh

## 📋 Tổng Quan

Hệ thống linh thạch đã được cập nhật với tỉ lệ drop mới cho từng lệnh, tạo ra sự cân bằng và đa dạng trong việc kiếm tiền. Mỗi lệnh có tỉ lệ drop khác nhau cho các loại linh thạch.

## 🎯 Bảng Tỉ Lệ Drop Chi Tiết

| Command | Hạ Phẩm (Range) | Tỉ Lệ/SL Trung | Tỉ Lệ/SL Thượng | Tỉ Lệ/SL Cực |
|---------|------------------|----------------|------------------|---------------|
| **/pick** (5m, Thấp) | 2–6 | 2% → +1 | — | — |
| **/explore** (10m, Thấp) | 5–12 | 5% → +1 | — | — |
| **/hunt** (30s, Thấp) | 1–3 | 1% → +1 | — | — |
| **/meditate** (1h, Không) | 4–10 | — | — | — |
| **/mine** (1h, Cao) | 20–40 | 8% → +1 | 0.2% → +1 | — |
| **/challenge** (1h, Trung bình) | 30–60 | 10% → +1 | 0.5% → +1 | — |
| **/domain** (8h, Rất cao) | 120–240 | 30% → +1~2 | 3% → +1 | 0.2% → +1 |
| **/dungeon** (6h, Cao) | 90–180 | 25% → +1~2 | 2% → +1 | 0.15% → +1 |
| **/daily** (1d, Trung bình) | 200–300 (guarantee) | +1 Trung (guarantee) & 20% → +1 | 3% → +1 | — |
| **/weekly** (1w, Cao) | 1000–1500 (guarantee) | +5 Trung (guarantee) & 30% → +1~3 | 10% → +1 | 1% → +1 |

## 🔧 Cách Sử Dụng

### 1. Import Utility

```javascript
const SpiritStonesCalculator = require('../utils/spirit-stones-calculator.js');
```

### 2. Tính Toán Linh Thạch

```javascript
// Tính linh thạch cho lệnh pick
const spiritStones = SpiritStonesCalculator.calculatePick();

// Tính linh thạch cho lệnh hunt
const spiritStones = SpiritStonesCalculator.calculateHunt();

// Tính linh thạch cho lệnh mine
const spiritStones = SpiritStonesCalculator.calculateMine();
```

### 3. Cập Nhật Player

```javascript
// Cập nhật vào inventory
SpiritStonesCalculator.updatePlayerSpiritStones(player, spiritStones);

// Tạo object update
const updateData = SpiritStonesCalculator.createUpdateObject(spiritStones);
playerManager.updatePlayer(userId, updateData);
```

### 4. Hiển Thị

```javascript
// Format hiển thị
const displayText = SpiritStonesCalculator.formatSpiritStones(spiritStones);
// Kết quả: "🪙5 ✨1" hoặc "🪙3"
```

## 📊 Chi Tiết Từng Lệnh

### 🌿 **/pick** - Thu Thập Thảo Dược
- **Cooldown**: 5 phút
- **Hạ phẩm**: 2-6 (random)
- **Trung phẩm**: 2% cơ hội nhận +1
- **Thượng phẩm**: Không có
- **Cực phẩm**: Không có

### 🗺️ **/explore** - Khám Phá
- **Cooldown**: 10 phút
- **Hạ phẩm**: 5-12 (random)
- **Trung phẩm**: 5% cơ hội nhận +1
- **Thượng phẩm**: Không có
- **Cực phẩm**: Không có

### 🏹 **/hunt** - Săn Quái
- **Cooldown**: 30 giây
- **Hạ phẩm**: 1-3 (random)
- **Trung phẩm**: 1% cơ hội nhận +1
- **Thượng phẩm**: Không có
- **Cực phẩm**: Không có

### 🧘 **/meditate** - Thiền Định
- **Cooldown**: 1 giờ
- **Hạ phẩm**: 4-10 (random)
- **Trung phẩm**: Không có
- **Thượng phẩm**: Không có
- **Cực phẩm**: Không có

### ⛏️ **/mine** - Khai Thác
- **Cooldown**: 1 giờ
- **Hạ phẩm**: 20-40 (random)
- **Trung phẩm**: 8% cơ hội nhận +1
- **Thượng phẩm**: 0.2% cơ hội nhận +1
- **Cực phẩm**: Không có

### ⚔️ **/challenge** - Thách Đấu
- **Cooldown**: 1 giờ
- **Hạ phẩm**: 30-60 (random)
- **Trung phẩm**: 10% cơ hội nhận +1
- **Thượng phẩm**: 0.5% cơ hội nhận +1
- **Cực phẩm**: Không có

### 🏰 **/domain** - Lãnh Địa
- **Cooldown**: 8 giờ
- **Hạ phẩm**: 120-240 (random)
- **Trung phẩm**: 30% cơ hội nhận +1~2
- **Thượng phẩm**: 3% cơ hội nhận +1
- **Cực phẩm**: 0.2% cơ hội nhận +1

### 🐉 **/dungeon** - Hầm Ngục
- **Cooldown**: 6 giờ
- **Hạ phẩm**: 90-180 (random)
- **Trung phẩm**: 25% cơ hội nhận +1~2
- **Thượng phẩm**: 2% cơ hội nhận +1
- **Cực phẩm**: 0.15% cơ hội nhận +1

### 📅 **/daily** - Nhiệm Vụ Hàng Ngày
- **Cooldown**: 1 ngày
- **Hạ phẩm**: 200-300 (guarantee)
- **Trung phẩm**: +1 (guarantee) & 20% cơ hội nhận +1
- **Thượng phẩm**: 3% cơ hội nhận +1
- **Cực phẩm**: Không có

### 📆 **/weekly** - Nhiệm Vụ Hàng Tuần
- **Cooldown**: 1 tuần
- **Hạ phẩm**: 1000-1500 (guarantee)
- **Trung phẩm**: +5 (guarantee) & 30% cơ hội nhận +1~3
- **Thượng phẩm**: 10% cơ hội nhận +1
- **Cực phẩm**: 1% cơ hội nhận +1

## 🎲 Cơ Chế Random

### **Tỉ Lệ Phần Trăm**
```javascript
// Ví dụ: 2% cơ hội nhận trung phẩm
const trungPham = Math.random() < 0.02 ? 1 : 0;
```

### **Range Random**
```javascript
// Ví dụ: Hạ phẩm 2-6
const haPham = 2 + Math.floor(Math.random() * 5);
// 2 + (0,1,2,3,4) = 2,3,4,5,6
```

### **Random Nhiều Số**
```javascript
// Ví dụ: Trung phẩm +1~2
const trungPham = Math.random() < 0.30 ? (1 + Math.floor(Math.random() * 2)) : 0;
// 30% cơ hội nhận 1 hoặc 2
```

## 💡 Lợi Ích Của Hệ Thống Mới

### 1. **Cân Bằng Game**
- Lệnh cooldown thấp có thu nhập thấp
- Lệnh cooldown cao có thu nhập cao
- Tỉ lệ drop hợp lý cho từng lệnh

### 2. **Đa Dạng Thu Nhập**
- Không chỉ có hạ phẩm
- Cơ hội nhận trung phẩm, thượng phẩm, cực phẩm
- Tạo cảm giác may mắn và thú vị

### 3. **Chiến Lược Chơi**
- Người chơi có thể chọn lệnh phù hợp
- Cân bằng giữa thời gian và thu nhập
- Khuyến khích tham gia nhiều hoạt động

## 🔄 Migration

### **Từ Format Cũ**
```javascript
// Trước đây
player.inventory.spiritStones += 100; // Number
```

### **Sang Format Mới**
```javascript
// Bây giờ
player.inventory.spiritStones.ha_pham += 100;
player.inventory.spiritStones.trung_pham += 1;
```

## 📁 Cấu Trúc File

```
utils/
├── spirit-stones-calculator.js    # Utility tính toán linh thạch
commands/
├── pick.js                        # Lệnh pick với linh thạch mới
├── hunt.js                        # Lệnh hunt với linh thạch mới
├── mine.js                        # Lệnh mine với linh thạch mới
└── ...                           # Các lệnh khác
```

## ⚠️ Lưu Ý Quan Trọng

### 1. **Tỉ Lệ Drop**
- Tỉ lệ được tính toán chính xác theo bảng
- Sử dụng `Math.random()` để đảm bảo công bằng
- Không có bias hay cheat

### 2. **Performance**
- Tính toán được thực hiện tại thời điểm thực
- Không cache kết quả
- Đảm bảo mỗi lần thực hiện đều khác nhau

### 3. **Error Handling**
- Fallback về 0 nếu có lỗi
- Không làm crash game
- Log lỗi để debug

## 🚀 Tương Lai

### **Có Thể Thêm**
- Bonus linh thạch cho VIP
- Event đặc biệt với tỉ lệ cao hơn
- Artifact tăng tỉ lệ drop
- Skill tree ảnh hưởng đến linh thạch

### **Cải Tiến**
- Cache tỉ lệ drop
- Analytics và thống kê
- Dynamic balance adjustment
- A/B testing tỉ lệ

---

**🎯 Hệ thống linh thạch mới tạo ra trải nghiệm chơi game cân bằng và thú vị hơn!** 