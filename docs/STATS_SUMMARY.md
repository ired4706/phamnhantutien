# BẢNG CHỈ SỐ NGŨ HÀNH HỆ - TU TIÊN GAME

## 📊 CHỈ SỐ CƠ BẢN THEO NGŨ HÀNH (Cấu trúc mới)

### ⚔️ KIM LINH CĂN (Kim)
- **Chuyên môn**: Công kích sắc bén, phòng thủ cứng cáp
- **Core stats**: STR/INT/DEX/VIT/LUK theo `data/core/spirit-roots.json`
- **Growth**: tăng theo `growth_rates` (STR/INT/DEX/VIT/LUK)
- **Ưu điểm**: Tấn công cao, phòng thủ tốt
- **Nhược điểm**: Yếu với Hỏa, mạnh với Mộc

### 🌳 MỘC LINH CĂN (Mộc)
- **Chuyên môn**: Hồi phục và sinh trưởng
- **Core stats**: STR/INT/DEX/VIT/LUK theo file data
- **Growth**: theo `growth_rates`
- **Ưu điểm**: Hồi phục tốt, né tránh cao
- **Nhược điểm**: Yếu với Kim, mạnh với Thổ

### 💧 THỦY LINH CĂN (Thủy)
- **Chuyên môn**: Tốc độ và pháp lực
- **Core/Growth**: theo file data
- **Ưu điểm**: Tốc độ cao nhất, né tránh tốt
- **Nhược điểm**: Yếu với Thổ, mạnh với Hỏa

### 🔥 HỎA LINH CĂN (Hỏa)
- **Chuyên môn**: Công kích và chí mạng
- **Core/Growth**: theo file data
- **Ưu điểm**: Tấn công cao nhất, chí mạng cao
- **Nhược điểm**: Yếu với Thủy, mạnh với Kim

### 🏔️ THỔ LINH CĂN (Thổ)
- **Chuyên môn**: Phòng thủ và thể lực
- **Core/Growth**: theo file data
- **Ưu điểm**: HP cao nhất, phòng thủ tốt
- **Nhược điểm**: Yếu với Mộc, mạnh với Thủy

---

## 🚀 CHỈ SỐ THEO CẤP ĐỘ

### 💨 LUYỆN KHÍ KỲ (Cảnh giới 1)
**Stage Multiplier**: 1x | **Tier Multiplier**: 1x

| Tầng | Số tầng đã qua | Hệ số nhân | Ví dụ Kim Linh Căn ATK |
|------|----------------|-------------|------------------------|
| 1    | 1              | 1.0x        | (12 + 1.8×1) × 1×1 = 14 |
| 5    | 5              | 1.0x        | (12 + 1.8×5) × 1×1 = 21 |
| 10   | 10             | 1.0x        | (12 + 1.8×10) × 1×1 = 30 |
| 13   | 13             | 1.0x        | (12 + 1.8×13) × 1×1 = 35 |

### 🌱 TRÚC CƠ KỲ (Cảnh giới 2)
**Stage Multiplier**: 5x | **Tier Multiplier**: Sơ 1.0x, Trung 1.5x, Hậu 2.0x

| Cấp độ | Số tầng đã qua | Hệ số nhân | Ví dụ Kim Linh Căn ATK |
|---------|----------------|-------------|------------------------|
| Sơ Kỳ   | 13             | 5.0x        | (12 + 1.8×13) × 5×1.0 = 175 |
| Trung Kỳ| 13             | 7.5x        | (12 + 1.8×13) × 5×1.5 = 263 |
| Hậu Kỳ  | 13             | 10.0x       | (12 + 1.8×13) × 5×2.0 = 350 |

### 🔮 KẾT ĐAN KỲ (Cảnh giới 3)
**Stage Multiplier**: 25x | **Tier Multiplier**: Sơ 1.0x, Trung 1.5x, Hậu 2.0x

| Cấp độ | Số tầng đã qua | Hệ số nhân | Ví dụ Kim Linh Căn ATK |
|---------|----------------|-------------|------------------------|
| Sơ Kỳ   | 13             | 25.0x       | (12 + 1.8×13) × 25×1.0 = 875 |
| Trung Kỳ| 13             | 37.5x       | (12 + 1.8×13) × 25×1.5 = 1313 |
| Hậu Kỳ  | 13             | 50.0x       | (12 + 1.8×13) × 25×2.0 = 1750 |

### 👶 NGUYÊN ANH KỲ (Cảnh giới 4)
**Stage Multiplier**: 125x | **Tier Multiplier**: Sơ 1.0x, Trung 1.5x, Hậu 2.0x

| Cấp độ | Số tầng đã qua | Hệ số nhân | Ví dụ Kim Linh Căn ATK |
|---------|----------------|-------------|------------------------|
| Sơ Kỳ   | 13             | 125.0x      | (12 + 1.8×13) × 125×1.0 = 4375 |
| Trung Kỳ| 13             | 187.5x      | (12 + 1.8×13) × 125×1.5 = 6563 |
| Hậu Kỳ  | 13             | 250.0x      | (12 + 1.8×13) × 125×2.0 = 8750 |

---

## 🧮 CÔNG THỨC TÍNH CHỈ SỐ (Cập nhật STR/INT/DEX/VIT/LUK)

### Bước 1: Tính 5 chỉ số chính
```
STR = (base.STR + growth.STR × luyenKhiTiers) × (Stage × Tier)
INT = (base.INT + growth.INT × luyenKhiTiers) × (Stage × Tier)
DEX = (base.DEX + growth.DEX × luyenKhiTiers) × (Stage × Tier)
VIT = (base.VIT + growth.VIT × luyenKhiTiers) × (Stage × Tier)
LUK = (base.LUK + growth.LUK × luyenKhiTiers) × (Stage × Tier)
```

### Bước 2: Quy đổi sang combat stats
```
ATK = STR × 1.8 + INT × 0.6 + LUK × 0.3
DEF = VIT × 2.0 + STR × 0.5
HP  = VIT × 20  + STR × 5
MP  = INT × 15  + LUK × 3
SPD = DEX × 1.5 + LUK × 0.5
REGEN = INT × 0.4 + VIT × 0.2
CRIT  = LUK × 0.4 + DEX × 0.2
EVA   = DEX × 0.3 + LUK × 0.3
ACC   = DEX × 0.6
PEN   = STR × 0.4 + INT × 0.2
```

### Tham số:
- Số tầng luyện khí (luyenKhiTiers): 1-13 (Luyện Khí dùng level hiện tại; các cảnh giới trên mặc định 13)
- Stage multiplier: Luyện Khí 1, Trúc Cơ 5, Kết Đan 25, Nguyên Anh 125
- Tier multiplier: Luyện Khí 1; Sơ 1.0, Trung 1.5, Hậu 2.0

### Ví dụ nhanh (mô phỏng):
- Cho sẵn STR/INT/DEX/VIT/LUK từ file data và growth tương ứng, áp dụng công thức trên để ra ATK/DEF/HP/MP/SPD/REGEN/CRIT/EVA/ACC/PEN.

---

## ⚡ KHẢ NĂNG ĐẶC BIỆT

### Kim Linh Căn
- **Kim Kiếm Vô Song**: Tăng 20% tấn công khi dùng kiếm
- **Thép Thân Bất Hoại**: Tăng 25% phòng thủ khi HP < 50%
- **Phong Lôi Kiếm Pháp**: 15% cơ hội gây thêm 50% sát thương

### Mộc Linh Căn
- **Mộc Linh Hồi Phục**: Tăng 30% hồi phục HP và MP
- **Thảo Mộc Trường Sinh**: Tự động hồi phục 5% HP mỗi lượt
- **Thiên Mộc Vạn Thọ**: Tăng 20% HP tối đa

### Thủy Linh Căn
- **Thủy Nguyệt Vô Biên**: Tăng 25% tốc độ và né tránh
- **Hải Triều Bất Tận**: Tăng 20% MP và hồi phục MP
- **Băng Sương Thiên Hạ**: 20% cơ hội làm chậm kẻ địch

### Hỏa Linh Căn
- **Hỏa Long Phá Thiên**: Tăng 30% tấn công và chí mạng
- **Thiên Hỏa Vạn Trượng**: 25% cơ hội gây thêm 100% sát thương
- **Hỏa Phượng Tái Sinh**: Hồi phục 20% HP khi gây chí mạng

### Thổ Linh Căn
- **Thổ Địa Bất Động**: Tăng 35% phòng thủ và HP
- **Sơn Nhạc Vạn Cổ**: Giảm 20% sát thương nhận vào
- **Đại Địa Vô Biên**: Tăng 25% hồi phục và sức chịu đựng

---

## 🎯 LỜI KHUYÊN CHỌN NGŨ HÀNH

- **Muốn tấn công mạnh**: Chọn **Hỏa** hoặc **Kim**
- **Muốn phòng thủ tốt**: Chọn **Thổ** hoặc **Kim**
- **Muốn hồi phục nhanh**: Chọn **Mộc** hoặc **Thổ**
- **Muốn tốc độ cao**: Chọn **Thủy** hoặc **Hỏa**
- **Muốn cân bằng**: Chọn **Kim** (cân bằng tốt nhất)

---

*Bảng chỉ số này được thiết kế để cân bằng và công bằng cho tất cả người chơi, mỗi ngũ hành đều có ưu điểm và nhược điểm riêng.*


