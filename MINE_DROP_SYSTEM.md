# Hệ Thống Tỉ Lệ Drop Khoáng Sản Theo Tu Vi

## Tổng Quan
Lệnh `mine` đã được cập nhật với hệ thống tỉ lệ drop khoáng sản theo tu vi của người chơi. Hệ thống này đảm bảo rằng người chơi có tu vi cao hơn sẽ có cơ hội nhận được khoáng sản quý hiếm hơn.

## Bảng Tỉ Lệ Drop

| Tu Vi | Phàm (Common) | Huyền (Uncommon) | Địa (Rare) | Thiên (Epic) | Thần (Legendary) | Số Lượng Item |
|-------|----------------|------------------|------------|--------------|------------------|----------------|
| **Luyện Khí** | 80% | 20% | 0% | 0% | 0% | **3-5** |
| **Trúc Cơ** | 55% | 35% | 10% | 0% | 0% | **4-6** |
| **Kết Đan** | 35% | 35% | 25% | 5% | 0% | **5-7** |
| **Nguyên Anh** | 20% | 30% | 35% | 14% | 1% | **6-8** |

## Cách Hoạt Động

### 1. Xác Định Tu Vi
- Hệ thống sẽ kiểm tra `player.realm` và `player.realmLevel` của người chơi
- Áp dụng tỉ lệ drop tương ứng với tu vi hiện tại

### 2. Chọn Rarity
- Sử dụng thuật toán cumulative probability để chọn rarity
- Đảm bảo tỉ lệ drop chính xác theo bảng trên

### 3. Chọn Khoáng Sản
- Sau khi chọn rarity, hệ thống sẽ chọn ngẫu nhiên một khoáng sản từ danh sách tương ứng
- **Số lượng khoáng sản theo tu vi**:
  - **Luyện Khí**: 3-5 khoáng sản
  - **Trúc Cơ**: 4-6 khoáng sản  
  - **Kết Đan**: 5-7 khoáng sản
  - **Nguyên Anh**: 6-8 khoáng sản

### 4. Hệ Thống Số Lượng Item
- **Tu vi càng cao, càng nhận nhiều item** mỗi lần mine
- **Tạo cảm giác progression** rõ ràng khi tu vi tăng
- **Khuyến khích tu luyện** để có cơ hội nhận nhiều item hơn
- **Cân bằng game** - tu vi thấp không thể farm quá nhiều item

## Danh Sách Khoáng Sản Theo Rarity

### 🟢 Phàm Cấp (Common)
- 🪨 Thiết Tinh Thô
- 🪨 Kim Thiết Thường  
- 🪨 Thanh Mộc Tinh
- 💎 Thủy Tinh Thạch
- 🔥 Hỏa Thạch Nhiệt Tâm
- 🟡 Hoàng Thổ Kết

### 🔵 Huyền Cấp (Uncommon)
- 🟠 Đồng Tinh Luyện
- 💎 Ngọc Thạch Thanh Khiết
- 🩸 Huyết Viêm Tủy Kết
- 🛡️ Hộ Linh Tâm Kết
- 👻 Hư Ảnh Linh Kết
- 🟠 Kim Thiết Tinh
- 🟢 Thanh Mộc Linh
- 💎 Thủy Tinh Huyền
- 🔥 Hỏa Thạch Linh Tâm
- 🟡 Hoàng Thổ Tâm Kết

### 🟣 Địa Cấp (Rare)
- 🟣 Huyền Tinh Địa Tâm
- ❄️ Lam Thạch Băng Tâm
- 💫 Tinh Hồn Thạch
- 🔴 Hồng Ngọc Địa
- 🟢 Lục Ngọc Địa
- 🟡 Hoàng Thạch Địa
- 🔵 Lam Thạch Địa
- ⚡ Tinh Tốc Thạch Địa
- ⚫ Hắc Thạch Địa
- 🔮 Trận Văn Thạch
- 🟠 Huyền Kim Thiết
- 🟢 Huyền Thanh Mộc
- 💎 Huyền Thủy Tinh
- 🔥 Huyền Hỏa Thạch
- 🟡 Huyền Hoàng Thổ

### 🟠 Thiên Cấp (Epic)
- ✨ Ngân Tinh Thiên Khôi
- 🩸 Huyết Thạch Thiên Tâm
- 💎 Huyết Châu Linh
- 🔴 Hồng Ngọc Thánh
- 🟢 Lục Ngọc Thánh
- 🟡 Hoàng Thạch Thánh
- 🔵 Lam Thạch Thánh
- ⚡ Tinh Tốc Thạch Thánh
- ⚫ Hắc Thạch Thánh
- ☁️ Tinh Vân Thạch
- 🟠 Thánh Kim Thiết
- 🟢 Thánh Thanh Mộc
- 💎 Thánh Thủy Tinh
- 🔥 Thánh Hỏa Thạch
- 🟡 Thánh Hoàng Thổ

### 🔴 Thần Cấp (Legendary)
- 🌟 Thiên Tinh Thần Khí
- 💎 Thần Ngọc Tịnh Tâm
- 🌌 Hỗn Thạch Nguyên
- 💎 Ngọc Thánh Hồn
- 🔴 Hồng Ngọc Thần
- 🟢 Lục Ngọc Thần
- 🟡 Hoàng Thạch Thần
- 🔵 Lam Thạch Thần
- ⚡ Tinh Tốc Thạch Thần
- ⚫ Hắc Thạch Thần
- 💎 Thần Ngọc Tâm
- 🟠 Thần Kim Thiết
- 🟢 Thần Thanh Mộc
- 💎 Thần Thủy Tinh
- 🔥 Thần Hỏa Thạch
- 🟡 Thần Hoàng Thổ

## Lợi Ích Của Hệ Thống Mới

### 1. Cân Bằng Game
- Người chơi tu vi thấp không thể farm được item quý hiếm
- Khuyến khích người chơi tu luyện để mở khóa nội dung mới

### 2. Progression System
- Tạo cảm giác tiến bộ rõ ràng khi tu vi tăng
- Mỗi tu vi mới mở ra cơ hội nhận item quý hiếm hơn

### 3. Economy Balance
- Item quý hiếm sẽ có giá trị cao hơn do khó kiếm
- Tạo động lực cho người chơi giao dịch

## Sử Dụng

### Lệnh Cơ Bản
```
/mine
```

### Kết Quả
- **Linh khí**: 0 (mine không có linh khí)
- **Linh thạch**: 100-300
- **Khoáng sản**: 2-4 khoáng sản theo tỉ lệ tu vi

### Cooldown
- **Thời gian**: 1 giờ (3,600,000ms)
- **Lý do**: Đảm bảo cân bằng game và tránh spam

## Cập Nhật Tương Lai

### Có Thể Thêm
- Bonus drop rate cho người chơi VIP
- Event đặc biệt với tỉ lệ drop cao hơn
- Artifact tăng tỉ lệ drop
- Skill tree ảnh hưởng đến mining

### Cân Nhắc
- Tỉ lệ drop có thể điều chỉnh dựa trên feedback
- Thêm khoáng sản mới theo tu vi
- Hệ thống quality của khoáng sản

## Kết Luận

Hệ thống tỉ lệ drop mới đã được triển khai thành công, tạo ra một trải nghiệm chơi game cân bằng và thú vị hơn. Người chơi sẽ cảm thấy có động lực để tu luyện và khám phá các tu vi mới để mở khóa nội dung quý hiếm. 