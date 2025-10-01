# 🎯 **Quick Item Mapping - Tóm Tắt Nhanh**

## 📋 **Mapping Chính**

| 🎮 **Lệnh** | 📁 **File Item** | 🏷️ **Category** | 📊 **Drop Rate** |
|-------------|------------------|------------------|------------------|
| **`/hunt`** | `hunt_loot.json` | `hunt_loot` | Theo tu vi |
| **`/pick`** | `herbs.json` | `herbs` | Theo weight |
| **`/mine`** | `minerals.json` | `minerals` | Theo tu vi |

## 🔧 **Cách Sử Dụng**

### **Import Utility**
```javascript
const ItemDropCalculator = require('../utils/item-drop-calculator.js');
```

### **Tính Toán Items**
```javascript
// Hunt - Vật liệu săn
const huntItems = ItemDropCalculator.calculateHuntItems(player);

// Pick - Thảo dược  
const herbs = ItemDropCalculator.calculatePickItems(player);

// Mine - Khoáng sản
const minerals = ItemDropCalculator.calculateMineItems(player);
```

### **Thêm Vào Inventory**
```javascript
// Thêm tất cả items vào inventory
huntItems.forEach(item => {
  playerManager.addItemToInventory(player, item.id, 1);
});
```

## 📊 **Drop Rate Logic**

### **🏹 Hunt & Mine: Theo Tu Vi**
- **Luyện Khí**: 80% Common, 20% Uncommon
- **Trúc Cơ**: 55% Common, 35% Uncommon, 10% Rare  
- **Kết Đan**: 35% Common, 35% Uncommon, 25% Rare, 5% Epic
- **Nguyên Anh**: 20% Common, 30% Uncommon, 35% Rare, 14% Epic, 1% Legendary

### **🌿 Pick: Theo Weight**
- **Common**: 60%
- **Uncommon**: 25%
- **Rare**: 10%
- **Epic**: 3%
- **Legendary**: 1.5%
- **Mythic**: 0.5%

## 🎯 **Kết Quả**

✅ **Tập trung hóa** drop rate vào `ItemDropCalculator`  
✅ **Nhất quán** logic giữa các lệnh  
✅ **Dễ bảo trì** và điều chỉnh  
✅ **Tự động** thêm items vào inventory  
✅ **Format hiển thị** đẹp mắt với emoji và rarity 