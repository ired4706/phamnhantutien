# 🏹 **HUNT LOOT SYSTEM - HỆ THỐNG VẬT PHẨM SĂN THÚ**

## 🎯 **Tổng Quan**

Hệ thống Hunt Loot cung cấp các vật phẩm nguyên liệu từ lệnh `/hunt`, được tổ chức theo 5 rarity levels từ Phàm đến Thần. Mỗi item có thể được sử dụng để chế tạo trang bị và phụ kiện.

## 🔓 **Danh Sách Vật Phẩm Theo Rarity**

### **⚪ Phàm Cấp (Common)**

#### **🦊 Da Thú Thô**
- **ID**: `da_thu_tho`
- **Giá trị**: 50
- **Drop Rate**: 45%
- **Chỉ số**: DEF +5, HP +10
- **Công dụng**: Chế tạo áo giáp cơ bản, phụ kiện, trang bị cơ bản

#### **☁️ Thanh Vân Tơ**
- **ID**: `thanh_van_to`
- **Giá trị**: 60
- **Drop Rate**: 40%
- **Chỉ số**: SPD +8, EVASION +5
- **Công dụng**: Chế tạo đạo bào, phụ kiện, áo giáp nhẹ

### **🟢 Huyền Cấp (Uncommon)**

#### **🐺 Da Linh Thú**
- **ID**: `da_linh_thu`
- **Giá trị**: 300
- **Drop Rate**: 30%
- **Chỉ số**: DEF +15, HP +25, SPIRIT_RESISTANCE +10
- **Công dụng**: Chế tạo áo giáp linh khí, phụ kiện phép thuật, trang bị huyền

#### **🌙 Nguyệt Ảnh Tơ**
- **ID**: `nguyet_anh_to`
- **Giá trị**: 350
- **Drop Rate**: 25%
- **Chỉ số**: SPD +15, EVASION +12, MP +20
- **Công dụng**: Chế tạo đạo bào huyền bí, phụ kiện âm dương, trang bị huyền

### **🟡 Địa Cấp (Rare)**

#### **🦁 Da Địa Thú**
- **ID**: `da_dia_thu`
- **Giá trị**: 1,500
- **Drop Rate**: 15%
- **Chỉ số**: DEF +35, HP +60, SPIRIT_RESISTANCE +25, REP +15
- **Công dụng**: Chế tạo áo giáp địa khí, phụ kiện mặt đất, trang bị địa

#### **🏔️ Địa Hà Tơ**
- **ID**: `dia_ha_to`
- **Giá trị**: 1,800
- **Drop Rate**: 10%
- **Chỉ số**: SPD +25, EVASION +20, MP +40, DEF +20
- **Công dụng**: Chế tạo đạo bào núi non, phụ kiện địa, trang bị địa

### **🟠 Thiên Cấp (Epic)**

#### **🦅 Da Thiên Thú**
- **ID**: `da_thien_thu`
- **Giá trị**: 8,000
- **Drop Rate**: 5%
- **Chỉ số**: DEF +80, HP +120, SPIRIT_RESISTANCE +50, REP +30, KARMA +20
- **Công dụng**: Chế tạo áo giáp thiên khí, phụ kiện thiên thể, trang bị thiên

#### **⭐ Tinh Hà Tơ**
- **ID**: `tinh_ha_to`
- **Giá trị**: 10,000
- **Drop Rate**: 3%
- **Chỉ số**: SPD +45, EVASION +35, MP +80, DEF +40, REGEN +25
- **Công dụng**: Chế tạo đạo bào ngân hà, phụ kiện vũ trụ, trang bị thiên

### **🔴 Thần Cấp (Legendary)**

#### **🐉 Da Thần Thú**
- **ID**: `da_than_thu`
- **Giá trị**: 50,000
- **Drop Rate**: 1%
- **Chỉ số**: DEF +150, HP +250, SPIRIT_RESISTANCE +100, REP +60, KARMA +50, ALL_STATS +25
- **Công dụng**: Chế tạo áo giáp thần khí, phụ kiện thần thánh, trang bị thần

#### **🌈 Tiên Hà Vân Tơ**
- **ID**: `tien_ha_van_to`
- **Giá trị**: 75,000
- **Drop Rate**: 0.5%
- **Chỉ số**: SPD +80, EVASION +60, MP +150, DEF +80, REGEN +50, ALL_STATS +30
- **Công dụng**: Chế tạo đạo bào tiên giới, phụ kiện siêu việt, trang bị thần

## 📊 **Tỉ Lệ Drop Theo Tu Vi**

### **🌿 Luyện Khí Kỳ**
- **Phàm cấp**: 80%
- **Huyền cấp**: 20%
- **Địa cấp**: 0%
- **Thiên cấp**: 0%
- **Thần cấp**: 0%

### **🌱 Trúc Cơ Kỳ**
- **Phàm cấp**: 55%
- **Huyền cấp**: 35%
- **Địa cấp**: 10%
- **Thiên cấp**: 0%
- **Thần cấp**: 0%

### **🔮 Kết Đan Kỳ**
- **Phàm cấp**: 35%
- **Huyền cấp**: 35%
- **Địa cấp**: 25%
- **Thiên cấp**: 5%
- **Thần cấp**: 0%

### **🌟 Nguyên Anh Kỳ**
- **Phàm cấp**: 20%
- **Huyền cấp**: 30%
- **Địa cấp**: 35%
- **Thiên cấp**: 14%
- **Thần cấp**: 1%

## 🔨 **Hệ Thống Chế Tạo**

### **Áo Giáp Cơ Bản**
- **Nguyên liệu**: 3x Da Thú Thô + 2x Thanh Vân Tơ
- **Kết quả**: Áo giáp cơ bản với DEF +20, HP +40

### **Áo Giáp Linh Khí**
- **Nguyên liệu**: 2x Da Linh Thú + 1x Nguyệt Ảnh Tơ
- **Kết quả**: Áo giáp linh khí với DEF +35, HP +60, SPIRIT_RESISTANCE +15

### **Áo Giáp Địa Khí**
- **Nguyên liệu**: 2x Da Địa Thú + 1x Địa Hà Tơ
- **Kết quả**: Áo giáp địa khí với DEF +60, HP +100, SPIRIT_RESISTANCE +30

### **Áo Giáp Thiên Khí**
- **Nguyên liệu**: 2x Da Thiên Thú + 1x Tinh Hà Tơ
- **Kết quả**: Áo giáp thiên khí với DEF +120, HP +200, SPIRIT_RESISTANCE +60

### **Áo Giáp Thần Khí**
- **Nguyên liệu**: 2x Da Thần Thú + 1x Tiên Hà Vân Tơ
- **Kết quả**: Áo giáp thần khí với DEF +250, HP +400, SPIRIT_RESISTANCE +120

## 🎮 **Cơ Chế Hunt**

### **Thông Số Cơ Bản**
- **Cooldown**: 30 giây
- **Chi phí năng lượng**: Thấp
- **Tỷ lệ thành công**: 90%

### **Hiệu Ứng Đặc Biệt**
- **Lucky Hunt**: 5% cơ hội nhận thêm 1 item
- **Critical Hunt**: 2% cơ hội nhận item rarity cao hơn
- **Perfect Hunt**: 1% cơ hội nhận tất cả items cùng rarity

## 💡 **Lợi Ích Gameplay**

### **1. Hệ Thống Progression**
- Người chơi có thể thu thập nguyên liệu theo tu vi
- Tạo động lực để breakthrough để mở khóa rarity cao hơn
- Hỗ trợ crafting system cho trang bị

### **2. Kinh Tế Game**
- Cung cấp nguồn thu nhập ổn định
- Giá trị item tương xứng với rarity
- Hỗ trợ trading system giữa người chơi

### **3. Chiến Lược Chơi**
- Người chơi phải cân nhắc giữa hunt và các hoạt động khác
- Tạo sự đa dạng trong gameplay
- Hỗ trợ nhiều build khác nhau

## 🔧 **Tích Hợp Kỹ Thuật**

### **Files Đã Tạo**
1. **`data/items/hunt_loot.json`** - Cấu trúc dữ liệu hunt loot
2. **`HUNT_LOOT_SYSTEM.md`** - Tài liệu chi tiết hệ thống

### **Cấu Trúc Dữ Liệu**
```json
{
  "hunt_loot": {
    "rarity_level": {
      "items": {
        "item_id": {
          "name": "Tên Item",
          "emoji": "Emoji",
          "description": "Mô tả",
          "type": "material",
          "rarity": "rarity_level",
          "value": 1000,
          "stats": { "DEF": 50, "HP": 100 },
          "crafting_uses": ["armor", "accessories"],
          "drop_rate": 15
        }
      }
    }
  }
}
```

## 🚀 **Tương Lai**

### **Tính Năng Dự Kiến**
- **Advanced Crafting**: Chế tạo trang bị phức tạp hơn
- **Item Enhancement**: Nâng cấp vật phẩm hunt
- **Hunt Events**: Sự kiện săn thú đặc biệt
- **Pet System**: Thuần hóa thú săn được

### **Mở Rộng**
- **Seasonal Hunts**: Thú săn theo mùa
- **Rare Beasts**: Thú săn quý hiếm
- **Hunt Quests**: Nhiệm vụ săn thú
- **Hunt Rankings**: Bảng xếp hạng thợ săn

---

**🏹 Hunt Loot System - Thu thập nguyên liệu từ thiên nhiên hoang dã! 🚀** 