# 🧪 **Hệ Thống Luyện Đan (Không cooldown)**

- Luyện đan không còn giới hạn theo thời gian. Bạn có thể chọn và luyện liên tục tùy theo nguyên liệu đang có.

## 📋 **Tổng Quan**
Command `/falchemy` cho phép người chơi luyện đan dược từ các nguyên liệu thu thập được trong game. Hệ thống này bao gồm:
- **Thông tin lò đan** với thống kê chi tiết
- **4 loại đan dược** theo type: heal, buff, breakthrough, special
- **Button tương tác** để xem danh sách và công thức
- **Level lò luyện** ảnh hưởng đến tỉ lệ thành công
- **Nguyên liệu** từ dược thảo và khoáng thạch
- **Crafting recipes** được định nghĩa trong `elixirs.json`
- **Hệ thống thành công/thất bại** với hậu quả tương ứng

## 🎮 **Cách Sử Dụng**

### **Xem Thông Tin Lò Đan**
```
falchemy
```
- Hiển thị thông tin lò đan hiện tại
- Thống kê luyện đan (tổng số, thành công, thất bại)
- 4 button chọn loại đan dược
- Button thông tin chi tiết lò đan

### **Luyện Đan Cụ Thể**
```
falchemy <id_dan>
```
Ví dụ:
```
falchemy dan_duong_the_so_cap
falchemy dan_bo_khi
falchemy tu_dan_dan
```

## 🏭 **Giao Diện Lò Đan**

### **Màn Hình Chính**
Khi sử dụng `falchemy`, bạn sẽ thấy:

#### **Thông Tin Lò Đan**
- 🔥 **Level Lò Đan**: Level hiện tại và tỉ lệ thành công
- 📊 **Thống Kê Luyện Đan**: Tổng số, thành công, thất bại
- 📈 **Tỉ Lệ Thành Công**: Phần trăm thành công hiện tại

#### **4 Button Chọn Loại Đan Dược**
- 💚 **Đan Hồi Phục** (heal): Đan dược hồi phục sức khỏe
- ⚔️ **Đan Hỗ Trợ** (buff): Đan dược tăng cường chỉ số
- 🌟 **Đan Cảnh Giới** (breakthrough): Đan dược hỗ trợ đột phá
- ✨ **Đan Đặc Biệt** (special): Đan dược có hiệu quả đặc biệt

#### **Button Thông Tin**
- 🏭 **Thông Tin Lò Đan**: Xem chi tiết về lò đan và hệ thống

### **Màn Hình Danh Sách Đan Dược**
Sau khi chọn loại đan dược, bạn sẽ thấy:
- Danh sách đan dược theo loại đã chọn
- Phân loại theo rarity (Common → Mythic)
- **Nguyên liệu cần thiết** với số lượng available hiện tại
- **Hiệu quả** của từng đan dược
- **Select Menu** để chọn đan dược cần luyện
- Button **Quay Lại** (đã lược bỏ button "Xem Công Thức")

#### **🎯 Select Menu Luyện Đan**
- **Chức năng**: Cho phép chọn đan dược cần luyện trực tiếp từ danh sách
- **Cách sử dụng**: Chọn đan dược từ dropdown menu và hệ thống sẽ tự động:
  - Kiểm tra nguyên liệu có đủ không
  - Tính toán tỉ lệ thành công dựa trên level lò luyện
  - Thực hiện luyện đan (thành công hoặc thất bại)
  - Cập nhật inventory và thống kê alchemy
  - Hiển thị kết quả chi tiết

#### **🔧 Sửa Lỗi Select Menu**
- **Vấn đề đã sửa**: Select menu options hiển thị `undefined` values
- **Nguyên nhân**: Cách tạo options không tương thích với Discord.js v14
- **Giải pháp**: Sử dụng `selectMenu.addOptions()` thay vì `addOptions(array)`
- **Kết quả**: Select menu hoạt động bình thường với đầy đủ thông tin

#### **📊 Kết Quả Luyện Đan**
- **Thành công**: 
  - Nhận đan dược vào inventory
  - Nguyên liệu được tiêu thụ
  - Thống kê thành công tăng
- **Thất bại**: 
  - Mất nguyên liệu
  - Thống kê thất bại tăng
  - Gợi ý nâng cấp lò luyện

#### **🎮 Ví Dụ Sử Dụng Select Menu**
```
💚 Đan Dược Đan Hỗ Trợ

⚪ **Đan Cường Thân Sơ Cấp** (ID: `dan_cuong_than_so_cap`)
└ **Nguyên liệu**: 🥕 **Ngũ Niên Sâm** x1 (còn: 2), 🍂 **Huyết Diệp Thảo** x1 (còn: 0)
└ **Hiệu quả**: DEF: +8, HP: +15, STR: +5

⚪ **Đan Bạo Kích Sơ Cấp** (ID: `dan_bao_kich_so_cap`)
└ **Nguyên liệu**: 🥕 **Ngũ Niên Sâm** x1 (còn: 2), 🍂 **Huyết Diệp Thảo** x1 (còn: 0)
└ **Hiệu quả**: ATK: +10, CRT: +3, FP: +5

[📋 Chọn đan dược để luyện...] ← Select Menu
[🔙 Quay Lại]
```

**Khi chọn đan dược từ Select Menu:**
1. **Hệ thống kiểm tra nguyên liệu**
2. **Tính toán tỉ lệ thành công** (dựa trên level lò)
3. **Thực hiện luyện đan** (random success/failure)
4. **Hiển thị kết quả** với embed chi tiết

#### **🎯 Ví Dụ Kết Quả Thành Công**
```
🧪 Luyện Đan Thành Công!

**Đan Cường Thân Sơ Cấp** đã được luyện thành công!

🎯 Tỉ lệ thành công: 65.0%
🔥 Level lò luyện: 2
📊 Thống kê: Tổng: 15 | Thành công: 12 | Thất bại: 3
```

#### **💥 Ví Dụ Kết Quả Thất Bại**
```
💥 Luyện Đan Thất Bại!

**Đan Cường Thân Sơ Cấp** luyện thất bại! Nguyên liệu đã bị mất.

🎯 Tỉ lệ thành công: 65.0%
🔥 Level lò luyện: 2
💡 Gợi ý: Nâng cấp lò luyện để tăng tỉ lệ thành công!
```

#### **Ví Dụ Hiển Thị Mới**
```
💚 Đan Dược Đan Hồi Phục

⚪ Thường (2 loại)

⚪ **Đan Dưỡng Thể Sơ Cấp** (ID: `dan_duong_the_so_cap`)
└ **Nguyên liệu**: 🥕 **Ngũ Niên Sâm** x1 (còn: 10), 🌿 **Thanh Diệp Thảo** x1 (còn: 5), 🫐 **Tiểu Long Lân Quả** x1 (còn: 8)
└ **Hiệu quả**: HP: +20, STA: +10, REG: +5

⚪ **Đan Bổ Khí** (ID: `dan_bo_khi`)
└ **Nguyên liệu**: 🥕 **Ngũ Niên Sâm** x1 (còn: 10), 🌿 **Thanh Diệp Thảo** x1 (còn: 5), 🫐 **Tiểu Long Lân Quả** x1 (còn: 8)
└ **Hiệu quả**: MP: +25, SP: +8, CS: +3

🟢 Hiếm (3 loại)

🟢 **Đan Dưỡng Thể Trung Cấp** (ID: `dan_duong_the_trung_cap`)
└ **Nguyên liệu**: 🥕 **Thập Niên Sâm** x2 (còn: 3), ☁️ **Từ Vân Thảo** x1 (còn: 2), 🫐 **Tiểu Long Lân Quả** x1 (còn: 8)
└ **Hiệu quả**: HP: +50, STA: +25, REG: +15

🟢 **Đan Bổ Khí Trung Cấp** (ID: `dan_bo_khi_trung_cap`)
└ **Nguyên liệu**: 🥕 **Thập Niên Sâm** x2 (còn: 3), ☁️ **Từ Vân Thảo** x1 (còn: 2), 🫐 **Tiểu Long Lân Quả** x1 (còn: 8)
└ **Hiệu quả**: MP: +80, SP: +30, CS: +20

[🔙 Quay Lại]
```

**Lưu ý**: 
- Button "Xem Công Thức" đã được lược bỏ
- Thông tin công thức và hiệu quả giờ đây được hiển thị trực tiếp trong màn hình danh sách đan dược
- **Icon rarity được thêm vào trước tên đan dược** thay vì hiển thị header riêng biệt
- Hiệu quả được hiển thị dưới dạng viết tắt để tiết kiệm không gian (HP, MP, ATK, DEF, SPD, v.v.)
- Mỗi field chỉ hiển thị tối đa 3 đan dược để đảm bảo không vượt quá giới hạn 1024 ký tự của Discord

#### **Bảng Giải Thích Viết Tắt Hiệu Quả**
| Viết Tắt | Ý Nghĩa Đầy Đủ |
|----------|-----------------|
| **HP** | Sinh Mệnh (Health Points) |
| **MP** | Linh Lực (Mana Points) |
| **ATK** | Công Kích (Attack) |
| **DEF** | Phòng Thủ (Defense) |
| **SPD** | Tốc Độ (Speed) |
| **CRT** | Chí Mạng (Critical) |
| **STA** | Thể Lực (Stamina) |
| **REG** | Hồi Phục (Recovery) |
| **SP** | Linh Khí (Spirit Power) |
| **CS** | Tốc Độ Tu Luyện (Cultivation Speed) |
| **STR** | Sức Mạnh (Strength) |
| **FP** | Hỏa Lực (Fire Power) |
| **AGI** | Nhanh Nhẹn (Agility) |
| **EVA** | Né Tránh (Evasion) |
| **RT** | Thời Gian Phản Ứng (Reaction Time) |
| **MC** | Tinh Thần (Mental Clarity) |
| **FOC** | Tập Trung (Focus) |
| **MB** | Thiền Định (Meditation Bonus) |
| **ENL** | Giác Ngộ (Enlightenment) |
| **AM** | Thuật Luyện Đan (Alchemy Mastery) |
| **EQ** | Chất Lượng Đan (Elixir Quality) |
| **SR** | Tỉ Lệ Thành Công (Success Rate) |
| **SC** | Kiểm Soát Linh Khí (Spirit Control) |
| **EA** | Tương Thích Ngũ Hành (Elemental Affinity) |

### **Màn Hình Công Thức**
~~Khi nhấn **Xem Công Thức**, bạn sẽ thấy:~~
~~- Công thức chi tiết của từng đan dược~~
~~- Nguyên liệu cần thiết và số lượng~~
~~- Hiệu quả của đan dược~~
~~- Giá trị linh thạch~~

**Lưu ý**: Button "Xem Công Thức" đã được lược bỏ. Thông tin công thức và hiệu quả giờ đây được hiển thị trực tiếp trong màn hình danh sách đan dược.

## 🔥 **Hệ Thống Level Lò Luyện**

### **Công Thức Tính Tỉ Lệ Thành Công**
```
Base Success Rate: 60%
Level Bonus: (furnaceLevel - 1) × 5%
Max Success Rate: 95%

Final Rate = min(60% + levelBonus, 95%)
```

### **Bảng Tỉ Lệ Theo Level**
| Level Lò | Tỉ Lệ Thành Công | Ghi Chú |
|----------|-------------------|---------|
| 1        | 60%               | Mặc định |
| 2        | 65%               | +5% |
| 3        | 70%               | +10% |
| 4        | 75%               | +15% |
| 5        | 80%               | +20% |
| 6        | 85%               | +25% |
| 7        | 90%               | +30% |
| 8+       | 95%               | Tối đa |

## 🧪 **4 Loại Đan Dược**

### **💚 Đan Hồi Phục (Heal)**
- **Mục đích**: Hồi phục sức khỏe, linh lực, thể lực
- **Ví dụ**: Đan Dưỡng Thể, Đan Bổ Khí
- **Nguyên liệu**: Chủ yếu từ dược thảo cơ bản
- **Rarity**: Common → Rare

### **⚔️ Đan Hỗ Trợ (Buff)**
- **Mục đích**: Tăng cường chỉ số chiến đấu
- **Ví dụ**: Đan Cường Thân, Đan Bạo Kích, Đan Tấn Công
- **Nguyên liệu**: Dược thảo và một số khoáng thạch
- **Rarity**: Common → Epic

### **🌟 Đan Cảnh Giới (Breakthrough)**
- **Mục đích**: Hỗ trợ đột phá cảnh giới tu luyện
- **Ví dụ**: Ngưng Cơ Đan, Hồng Trần Đan, Tụ Đan Đan
- **Nguyên liệu**: Dược thảo cao cấp và khoáng thạch quý
- **Rarity**: Rare → Legendary

### **✨ Đan Đặc Biệt (Special)**
- **Mục đích**: Có hiệu quả đặc biệt, độc đáo
- **Ví dụ**: Cửu Chuyển Đan, Tẩy Tủy Đan, Sinh Mệnh Đan
- **Nguyên liệu**: Dược thảo thần cấp và khoáng thạch hiếm
- **Rarity**: Epic → Mythic

## 📦 **Nguyên Liệu Crafting**

### **Dược Thảo (Herbs)**
Tất cả nguyên liệu dược thảo đều có sẵn trong `herbs.json`:

#### **Common Herbs**
- `ngu_nien_sam` - Ngũ Niên Sâm 🥕
- `thanh_diep_thao` - Thanh Diệp Thảo 🍃
- `tieu_long_lan_qua` - Tiểu Long Lân Quả 🍎

#### **Uncommon Herbs**
- `huyet_diep_thao` - Huyết Diệp Thảo 🍂
- `thach_can_thao` - Thạch Căn Thảo 🌱
- `liet_hoa_hoa` - Liệt Hỏa Hoa 🔥

#### **Rare Herbs**
- `