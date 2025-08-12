# 🌿 Tu Tiên Bot - Discord RPG Bot

Bot Discord RPG với phong cách phàm nhân tu tiên được viết bằng Discord.js v14.

## 🚀 Tính năng

- **Hệ thống tu luyện**: Cảnh giới, tu vi, đột phá, linh căn
- **Hệ thống chiến đấu**: Săn yêu thú, đấu tu sĩ, bí cảnh
- **Hệ thống inventory**: Pháp bảo, đan dược, linh thạch, công pháp
- **Hệ thống nhiệm vụ**: Daily quests, bounty hunting
- **Hệ thống sơn môn**: Tham gia các môn phái tu tiên

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
1. Copy file `env.example` thành `.env`
2. Điền thông tin vào file `.env`:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
```

### 4. Chạy bot
```bash
npm start
```

## 🎯 Cách sử dụng

### Commands có sẵn:
- `fhelp` - Hiển thị hướng dẫn tu luyện
- `fping` - Kiểm tra độ trễ bot
- `fstatus` - Xem trạng thái tu luyện
- `fspiritroot` - Xem thông tin linh căn
- `fcultivate` - Tu luyện để tăng tu vi
- `fbreakthrough` - Đột phá cảnh giới
- `fhunt` - Săn yêu thú lấy tài nguyên

### Hệ thống tu luyện:
1. Sử dụng `fcultivate` để tu luyện
2. Khi đủ tu vi, dùng `fbreakthrough` để đột phá
3. Cảnh giới: Luyện khí → Trúc cơ → Kim đan → Nguyên anh → Hóa thần → Phản hư → Hợp đạo

### Hệ thống linh căn:
- Mỗi player có 1 linh căn ngẫu nhiên trong 5 loại: Kim ⚔️, Mộc 🌳, Thủy 💧, Hỏa 🔥, Thổ 🏔️
- Linh căn ảnh hưởng đến stats và có hệ thống tương khắc
- Sử dụng `fstatus` để xem linh căn của mình

## 🔧 Cấu trúc dự án

```
tu-tien-bot/
├── commands/          # Prefix commands
│   ├── help.js
│   ├── ping.js
│   ├── status.js
│   └── spiritroot.js
├── systems/           # Hệ thống game
│   └── player.js      # Quản lý người chơi
├── data/              # Dữ liệu game
│   └── spirit-roots.json # Thông tin linh căn
├── index.js           # File chính của bot
├── package.json
└── README.md
```

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

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Hãy tạo issue hoặc pull request.

## 📄 License

MIT License - xem file LICENSE để biết thêm chi tiết. 