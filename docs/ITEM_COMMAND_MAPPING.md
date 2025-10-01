# 🗂️ **Mapping File Items Với Lệnh Tương Ứng**

## 📋 **Tổng Quan**

Tài liệu này mô tả mapping giữa các file item JSON và lệnh tương ứng trong game, cũng như cách sử dụng `ItemDropCalculator` để quản lý drop rate.

## 🎯 **Mapping Chính**

### 🏹 **Lệnh `/hunt` ↔ File `hunt_loot.json`**

#### **📁 File: `data/items/hunt_loot.json`**
- **Category**: `hunt_loot`
- **Mô tả**: Vật liệu săn được từ yêu thú
- **Cấu trúc**: Phân loại theo rarity (common, uncommon, rare, epic, legendary)

#### **🔧 Sử dụng trong code:**
```javascript
const ItemDropCalculator = require('../utils/item-drop-calculator.js');

// Tính toán items theo drop rate
const huntItems = ItemDropCalculator.calculateHuntItems(player);

// Thêm vào inventory
huntItems.forEach(item => {
  playerManager.addItemToInventory(player, item.id, 1);
});
```

#### **📊 Drop Rate Theo Tu Vi:**
```json
"drop_rates_by_realm": {
  "luyen_khi": { "common": 80, "uncommon": 20, "rare": 0, "epic": 0, "legendary": 0 },
  "truc_co": { "common": 60, "uncommon": 30, "rare": 10, "epic": 0, "legendary": 0 },
  "ket_dan": { "common": 40, "uncommon": 35, "rare": 20, "epic": 5, "legendary": 0 },
  "nguyen_anh": { "common": 25, "uncommon": 35, "rare": 30, "epic": 9, "legendary": 1 }
}
```

---

### 🌿 **Lệnh `/pick` ↔ File `herbs.json`**

#### **📁 File: `data/items/herbs.json`**
- **Category**: `herbs`
- **Mô tả**: Thảo dược có thể thu thập
- **Cấu trúc**: Mỗi item có `rarity` riêng biệt

#### **🔧 Sử dụng trong code:**
```javascript
const ItemDropCalculator = require('../utils/item-drop-calculator.js');

// Tính toán items theo drop rate
const herbs = ItemDropCalculator.calculatePickItems(player);

// Thêm vào inventory
herbs.forEach(herb => {
  playerManager.addItemToInventory(player, herb.id, 1);
});
```

#### **📊 Drop Rate Theo Weight:**
```javascript
const rarityWeights = {
  'common': 60,      // 60%
  'uncommon': 25,    // 25%
  'rare': 10,        // 10%
  'epic': 3,         // 3%
  'legendary': 1.5,  // 1.5%
  'mythic': 0.5      // 0.5%
};
```

---

### ⛏️ **Lệnh `/mine` ↔ File `minerals.json`**

#### **📁 File: `data/items/minerals.json`**
- **Category**: `minerals`
- **Mô tả**: Khoáng sản có thể khai thác
- **Cấu trúc**: Mỗi item có `rarity` riêng biệt

#### **🔧 Sử dụng trong code:**
```javascript
const ItemDropCalculator = require('../utils/item-drop-calculator.js');

// Tính toán items theo drop rate
const minerals = ItemDropCalculator.calculateMineItems(player);

// Thêm vào inventory
minerals.forEach(mineral => {
  playerManager.addItemToInventory(player, mineral.id, 1);
});
```

#### **📊 Drop Rate Theo Tu Vi:**
```json
"drop_rates_by_realm": {
  "luyen_khi": { "common": 80, "uncommon": 20, "rare": 0, "epic": 0, "legendary": 0 },
  "truc_co": { "common": 55, "uncommon": 35, "rare": 10, "epic": 0, "legendary": 0 },
  "ket_dan": { "common": 35, "uncommon": 35, "rare": 25, "epic": 5, "legendary": 0 },
  "nguyen_anh": { "common": 20, "uncommon": 30, "rare": 35, "epic": 14, "legendary": 1 }
}
```

---

## 🔄 **Các Lệnh Khác**

### 🗺️ **Lệnh `/explore`**
- **Items**: Không có items thực tế, chỉ có mô tả khám phá
- **Method**: `ItemDropCalculator.calculateExploreItems(player)`
- **Kết quả**: Array các string mô tả (🏔️ Núi cao, 🌊 Biển rộng, ...)

### ⚔️ **Lệnh `/challenge`**
- **Items**: Từ file `special_items.json`
- **Category**: `special_items`
- **Method**: `ItemDropCalculator.calculateChallengeItems(player)`

### 🏰 **Lệnh `/domain`**
- **Items**: Từ file `artifacts.json`
- **Category**: `artifacts`
- **Method**: `ItemDropCalculator.calculateDomainItems(player)`

### 🐉 **Lệnh `/dungeon`**
- **Items**: Từ tất cả categories
- **Method**: `ItemDropCalculator.calculateDungeonItems(player)`

### 📅 **Lệnh `/daily`**
- **Items**: Cố định + random từ tất cả categories
- **Method**: `ItemDropCalculator.calculateDailyItems(player)`

### 📆 **Lệnh `/weekly`**
- **Items**: Cố định + random từ tất cả categories
- **Method**: `ItemDropCalculator.calculateWeeklyItems(player)`

---

## 🛠️ **Cách Sử Dụng ItemDropCalculator**

### **1. Import Utility**
```javascript
const ItemDropCalculator = require('../utils/item-drop-calculator.js');
```

### **2. Tính Toán Items**
```javascript
// Lấy items theo drop rate và tu vi của player
const huntItems = ItemDropCalculator.calculateHuntItems(player);
const mineItems = ItemDropCalculator.calculateMineItems(player);
const pickItems = ItemDropCalculator.calculatePickItems(player);
```

### **3. Thêm Vào Inventory**
```javascript
// Thêm tất cả items vào inventory
huntItems.forEach(item => {
  playerManager.addItemToInventory(player, item.id, 1);
});
```

### **4. Hiển Thị**
```javascript
// Format hiển thị đẹp mắt với emoji và rarity
const displayText = ItemDropCalculator.formatItems(huntItems);
```

---

## 📊 **Cấu Trúc Item**

### **Format Chuẩn:**
```json
{
  "item_id": {
    "name": "Tên Item",
    "emoji": "🎯",
    "description": "Mô tả item",
    "rarity": "common|uncommon|rare|epic|legendary|mythic",
    "value": 100,
    "category": "herbs|minerals|hunt_loot|special_items|artifacts"
  }
}
```

### **Các Category Chính:**
- **`herbs`**: Thảo dược (lệnh `/pick`)
- **`minerals`**: Khoáng sản (lệnh `/mine`)
- **`hunt_loot`**: Vật liệu săn (lệnh `/hunt`)
- **`special_items`**: Vật phẩm đặc biệt
- **`artifacts`**: Pháp bảo
- **`elixirs`**: Đan dược
- **`equipment`**: Trang bị
- **`weapons`**: Vũ khí

---

## 🔧 **Lợi Ích Của Mapping**

### **✅ Tập Trung Hóa**
- Tất cả drop rate được quản lý ở `ItemDropCalculator`
- Dễ dàng điều chỉnh và cân bằng game

### **✅ Nhất Quán**
- Tất cả lệnh sử dụng cùng logic drop rate
- Không còn hardcode trong từng command

### **✅ Dễ Bảo Trì**
- Thay đổi drop rate chỉ cần sửa 1 file
- Có thể dễ dàng thêm lệnh mới

### **✅ Tương Thích**
- Sử dụng cùng format với `SpiritStonesCalculator`
- Tự động load items từ `itemLoader`

---

## 📝 **Ghi Chú Quan Trọng**

1. **Tất cả lệnh** đều sử dụng `ItemDropCalculator` để tính toán items
2. **Drop rate** được định nghĩa theo tu vi của player
3. **Items** được tự động thêm vào inventory sau khi thu thập
4. **Format hiển thị** được chuẩn hóa với emoji và rarity
5. **Crafting recipes** sử dụng ID từ các file item này 