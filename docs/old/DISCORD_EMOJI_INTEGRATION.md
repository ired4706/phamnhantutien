# 🎨 Tích Hợp Emoji Discord Vào Project

## 📋 Tổng Quan

Project này đã được tích hợp với hệ thống emoji Discord, cho phép sử dụng emoji tùy chỉnh từ Discord server của bạn thay vì chỉ dùng emoji Unicode mặc định.

## 🚀 Cách Thêm Emoji Discord

### 1. Upload Emoji Vào Discord Server

1. **Vào Discord Server** của bạn
2. **Server Settings** → **Emojis**
3. **Upload Emoji** với các yêu cầu:
   - **File Type**: JPEG, PNG, GIF, WEBP, AVIF
   - **Max file size**: 256 KB
   - **Recommended dimensions**: 128 x 128
   - **Naming**: Chỉ chứa chữ cái, số và dấu gạch dưới

### 2. Lấy Emoji ID

1. **Vào Discord Developer Portal** (như trong hình)
2. **Chọn Application** của bạn
3. **Emojis** tab
4. **Copy Emoji ID** từ cột "EMOJI ID"

### 3. Cập Nhật File Cấu Hình

Chỉnh sửa file `config/discord-emojis.json`:

Lưu ý theo code hiện tại: `src/utils/game/emoji-loader.js` đang tìm cấu hình tại `src/utils/config/discord-emojis.json`. Nếu bạn chỉ có file ở `config/discord-emojis.json` (tại root) và thấy emoji Discord không load được, hãy copy/move file sang đúng đường dẫn hoặc sửa lại logic tìm file trong `emoji-loader`.

```json
{
  "discord_emojis": {
    "rarity": {
      "common": "<:pham_cap:1404686744149823498>",
      "uncommon": "<:huyen_cap:YOUR_EMOJI_ID_HERE>",
      "rare": "<:dia_cap:YOUR_EMOJI_ID_HERE>",
      "epic": "<:thien_cap:YOUR_EMOJI_ID_HERE>",
      "legendary": "<:than_cap:YOUR_EMOJI_ID_HERE>"
    }
  }
}
```

## 🔧 Cách Sử Dụng Trong Code

### 1. Import Emoji Loader

```javascript
const emojiLoader = require('../src/utils/game/emoji-loader.js');
```

### 2. Sử Dụng Emoji

```javascript
// Lấy emoji rarity
const commonEmoji = emojiLoader.getRarityEmoji('common');

// Lấy emoji currency
const haPhamEmoji = emojiLoader.getCurrencyEmoji('ha_pham');

// Lấy emoji item
const herbsEmoji = emojiLoader.getItemEmoji('herbs');

// Lấy emoji action
const huntEmoji = emojiLoader.getActionEmoji('hunt');

// Lấy emoji status
const healthEmoji = emojiLoader.getStatusEmoji('health');
```

### 3. Sử Dụng Trong Embed

```javascript
const embed = new EmbedBuilder()
  .setTitle(`${emojiLoader.getActionEmoji('hunt')} Săn Quái Vật`)
  .setDescription(`Bạn đã nhận được ${emojiLoader.getItemEmoji('herbs')} thảo dược!`);
```

### 4. Sử Dụng Placeholder

```javascript
// Trong text, sử dụng placeholder
const text = "Bạn có {currency:ha_pham} 100 linh thạch hạ phẩm";

// Xử lý với emoji
const processedText = emojiLoader.processTextWithEmojis(text);
// Kết quả: "Bạn có 🪙 100 linh thạch hạ phẩm"
```

## 📁 Cấu Trúc File

```
config/
├── discord-emojis.json          # Cấu hình emoji Discord (hiện có trong repo)
src/utils/game/
├── emoji-loader.js              # Utility load và sử dụng emoji (được require trong code)
src/utils/config/
├── discord-emojis.json          # (đường dẫn mà emoji-loader đang tìm theo code)
```

## 🎯 Danh Mục Emoji Hỗ Trợ

### Rarity (Độ Hiếm)
- `common` - Phàm cấp
- `uncommon` - Huyền cấp  
- `rare` - Địa cấp
- `epic` - Thiên cấp
- `legendary` - Thần cấp

### Currency (Tiền Tệ)
- `ha_pham` - Hạ phẩm
- `trung_pham` - Trung phẩm
- `thuong_pham` - Thượng phẩm
- `cuc_pham` - Cực phẩm

### Items (Vật Phẩm)
- `herbs` - Thảo dược
- `minerals` - Khoáng sản
- `equipment` - Trang bị
- `artifacts` - Bảo vật

### Actions (Hành Động)
- `hunt` - Săn quái
- `mine` - Khai thác
- `cultivate` - Tu luyện
- `meditate` - Thiền định
- `breakthrough` - Đột phá

### Status (Trạng Thái)
- `health` - Sinh lực
- `mana` - Pháp lực
- `experience` - Kinh nghiệm
- `level` - Cấp độ

## 🔄 Fallback System

Hệ thống có **fallback tự động**:
1. **Ưu tiên**: Emoji Discord từ file cấu hình
2. **Fallback**: Emoji Unicode mặc định
3. **Cuối cùng**: ❓ nếu không tìm thấy

### Ví Dụ Fallback

```javascript
// Nếu không có emoji Discord
emojiLoader.getRarityEmoji('common'); // Trả về ⚪

// Nếu có emoji Discord
emojiLoader.getRarityEmoji('common'); // Trả về <:pham_cap:1404686744149823498>
```

## 🛠️ API Methods

### Core Methods

```javascript
// Lấy emoji theo category và type
emojiLoader.getEmoji(category, type)

// Kiểm tra có phải Discord emoji không
emojiLoader.isDiscordEmoji(emoji)

// Reload emoji từ file cấu hình
emojiLoader.reloadEmojis()
```

### Category Methods

```javascript
emojiLoader.getRarityEmoji(rarity)
emojiLoader.getCurrencyEmoji(currencyType)
emojiLoader.getItemEmoji(itemType)
emojiLoader.getActionEmoji(actionType)
emojiLoader.getStatusEmoji(statusType)
```

### Utility Methods

```javascript
// Xử lý text với placeholder
emojiLoader.processTextWithEmojis(text)

// Xử lý embed
emojiLoader.processEmbedWithEmojis(embedData)

// Lấy tất cả emoji
emojiLoader.getAllDiscordEmojis()
emojiLoader.getAllFallbackEmojis()
```

## 📝 Ví Dụ Thực Tế

### 1. Lệnh Wallet

```javascript
// Trước đây
stoneDetails.push(`💎 **Cực Phẩm**: ${amount}`);

// Bây giờ
stoneDetails.push(`${emojiLoader.getCurrencyEmoji('cuc_pham')} **Cực Phẩm**: ${amount}`);
```

### 2. Lệnh Status

```javascript
// Trước đây
.setTitle('⚔️ Trạng Thái Tu Luyện')

// Bây giờ
.setTitle(`${emojiLoader.getStatusEmoji('level')} Trạng Thái Tu Luyện`)
```

### 3. Lệnh Hunt

```javascript
// Trước đây
value: '🏹 Bạn đã săn được quái vật!'

// Bây giờ
value: `${emojiLoader.getActionEmoji('hunt')} Bạn đã săn được quái vật!`
```

## ⚠️ Lưu Ý Quan Trọng

### 1. Quyền Truy Cập
- **Bot phải có quyền** truy cập vào server chứa emoji
- **Emoji phải public** hoặc bot phải là member của server

### 2. Format Emoji
- **Đúng format**: `<:emoji_name:emoji_id>`
- **Ví dụ**: `<:pham_cap:1404686744149823498>`

### 3. Performance
- Emoji được load một lần khi khởi động
- Sử dụng `reloadEmojis()` nếu cần cập nhật

### 4. Error Handling
- Hệ thống tự động fallback về emoji Unicode
- Không làm crash game nếu emoji Discord lỗi

## 🔮 Tương Lai

### Có Thể Thêm
- Hệ thống cache emoji
- Auto-download emoji từ Discord API
- Emoji animation (GIF)
- Custom emoji packs

### Cải Tiến
- Hot-reload emoji config
- Emoji validation
- Performance optimization
- Better error handling

## 📞 Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra file cấu hình `discord-emojis.json`
2. Đảm bảo emoji ID đúng
3. Kiểm tra quyền bot trong Discord server
4. Xem console log để debug

---

**🎨 Hãy tạo emoji đẹp và tích hợp vào game để tăng trải nghiệm người chơi!** 