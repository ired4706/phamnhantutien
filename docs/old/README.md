# 🌿 Tu Tiên Bot - Documentation

Tài liệu dự án được sắp theo **nhóm lệnh** (khớp `src/commands/`) và **nhóm kiến thức chung**.

👉 Điểm bắt đầu: `docs/INDEX.md`

## 🧭 Cấu trúc tài liệu (I → X)
- **I**: Dữ liệu nguyên liệu / item data (`I_materials/`)
- **II**: Lệnh combat (`II_combat_commands/`)
- **III**: Lệnh crafting (`III_crafting_commands/`)
- **IV**: Lệnh core (`IV_core_commands/`)
- **V**: Lệnh cultivation (`V_cultivation_commands/`)
- **VI**: Lệnh exploration (`VI_exploration_commands/`)
- **VII**: Lệnh management (`VII_management_commands/`)
- **VIII**: Lệnh quest (`VIII_quest_commands/`)
- **IX**: Công thức tính toán (`IX_formulas/`)
- **X**: Nội dung khác (`X_misc/`)

## 📋 Yêu cầu

- Node.js 16.9.0 trở lên
- Discord Bot Token
- Discord Application ID

## 🛠️ Cài đặt

### 1. Clone repository
```bash
git clone <repository-url>
cd tu-tien-bot
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình
1. Copy file `env-template.txt` thành `.env`
2. Điền thông tin vào file `.env`:
```env
BOT_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
GUILD_ID=your_discord_guild_id_here
```

**Lưu ý quan trọng:**
- `BOT_TOKEN`: Token bot Discord từ Discord Developer Portal
- `CLIENT_ID`: ID ứng dụng Discord của bạn
- `GUILD_ID`: ID server Discord (nếu muốn bot chỉ hoạt động trong 1 server)
- Các biến khác có thể để mặc định hoặc điều chỉnh theo ý muốn

### 4. Chạy bot
```bash
npm start
```

## 🎯 Nguyên tắc “đồng nhất nội dung” trong từng nhóm
Mỗi file command doc (II→VIII) sẽ có các mục giống nhau:
- **Summary**
- **Command & Aliases**
- **Cooldown**
- **Inputs**
- **Outputs/UI**
- **Flow**
- **Rewards/Costs**
- **Data & Calculators liên quan**
- **Edge cases / Notes**

## 🚀 Thêm tính năng mới

1. Tạo command trong thư mục `commands/`
2. Implement logic trong thư mục `systems/`
3. Thêm dữ liệu vào thư mục `data/`
4. Command sẽ tự động được load khi bot khởi động

## 📝 Lưu ý

- Bot sử dụng prefix `f` trực tiếp với tên command (ví dụ: `fhelp`, `fstatus`)
- Bot cần quyền `Send Messages`, `Read Message History`
- Hệ thống tu luyện có cooldown để cân bằng game
- Dữ liệu player được lưu tự động vào file JSON

## 🔧 Biến môi trường (.env)

### Biến bắt buộc:
- `BOT_TOKEN`: Token bot Discord (bắt buộc)
- `CLIENT_ID`: ID ứng dụng Discord
- `GUILD_ID`: ID server Discord

### Biến tùy chọn:
- `PREFIX`: Prefix lệnh (mặc định: `f`)
- `GAME_NAME`: Tên bot (mặc định: `Tu Tiên Bot`)
- `GAME_VERSION`: Phiên bản bot (mặc định: `1.0.0`)
- `ENABLE_ECONOMY`: Bật/tắt hệ thống kinh tế
- `ENABLE_LEVELING`: Bật/tắt hệ thống cấp độ
- `ENABLE_CULTIVATION`: Bật/tắt hệ thống tu luyện
- `ENABLE_SPIRIT_ROOTS`: Bật/tắt hệ thống linh căn
- `COMMAND_COOLDOWN`: Cooldown giữa các lệnh (ms)

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Hãy tạo issue hoặc pull request.

## 📄 License

MIT License - xem file LICENSE để biết thêm chi tiết. 