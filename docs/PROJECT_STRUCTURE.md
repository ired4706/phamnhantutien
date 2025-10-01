# 🏗️ **Cấu Trúc Dự Án Tu Tiên Bot**

## 📁 **Tổng Quan Cấu Trúc**

```
pntt/
├── 📁 src/                          # Source code chính
│   ├── 📁 commands/                 # Discord commands được phân loại
│   │   ├── 📁 core/                # Core commands
│   │   │   ├── start.js            # Bắt đầu game, chọn linh căn
│   │   │   ├── status.js           # Xem trạng thái tu luyện
│   │   │   ├── help.js             # Hướng dẫn sử dụng
│   │   │   ├── ping.js             # Kiểm tra bot
│   │   │   └── test.js             # Test commands
│   │   ├── 📁 cultivation/         # Tu luyện
│   │   │   ├── cultivation.js      # Tu luyện cơ bản
│   │   │   ├── breakthrough.js     # Đột phá cảnh giới
│   │   │   ├── meditate.js         # Thiền định
│   │   │   └── spiritroot.js       # Thông tin linh căn
│   │   ├── 📁 combat/              # Chiến đấu
│   │   │   ├── hunt.js             # Săn yêu thú
│   │   │   ├── challenge.js        # Thách đấu
│   │   │   └── dungeon.js          # Thí luyện
│   │   ├── 📁 crafting/            # Chế tạo
│   │   │   ├── alchemy.js          # Luyện đan
│   │   │   ├── forge.js            # Rèn vũ khí
│   │   │   ├── craft.js            # Chế tạo trang bị
│   │   │   └── equipment.js        # Quản lý trang bị
│   │   ├── 📁 exploration/         # Khám phá
│   │   │   ├── explore.js          # Khám phá
│   │   │   ├── mine.js             # Khai thác
│   │   │   ├── pick.js             # Thu thập thảo dược
│   │   │   └── domain.js           # Khám phá lãnh địa
│   │   ├── 📁 management/          # Quản lý
│   │   │   ├── inventory.js        # Quản lý kho đồ
│   │   │   ├── skills.js           # Quản lý kỹ năng
│   │   │   ├── wallet.js           # Quản lý tiền tệ
│   │   │   ├── item.js             # Thông tin vật phẩm
│   │   │   └── rarity.js           # Thông tin độ hiếm
│   │   └── 📁 quests/              # Nhiệm vụ
│   │       ├── daily.js            # Nhiệm vụ hàng ngày
│   │       ├── weekly.js           # Nhiệm vụ tuần
│   │       └── guild.js            # Quản lý sơn môn
│   ├── 📁 services/                # Business logic layer
│   │   ├── BaseService.js          # Base service class
│   │   ├── PlayerService.js        # Quản lý người chơi
│   │   ├── CombatService.js        # Quản lý chiến đấu
│   │   ├── SpiritRootService.js    # Quản lý linh căn
│   │   ├── AlchemyService.js       # Quản lý luyện đan
│   │   ├── ForgeService.js         # Quản lý rèn vũ khí
│   │   └── InventoryService.js     # Quản lý kho đồ
│   ├── 📁 systems/                 # Game systems
│   │   ├── combat.js               # Hệ thống chiến đấu
│   │   ├── monster.js              # Hệ thống quái vật
│   │   ├── player.js               # Hệ thống người chơi
│   │   ├── exp-calculator.js       # Tính toán kinh nghiệm
│   │   ├── level-requirements.js   # Yêu cầu cấp độ
│   │   └── guilds.js               # Hệ thống sơn môn
│   ├── 📁 utils/                   # Utilities được phân loại
│   │   ├── 📁 core/               # Core utilities
│   │   │   ├── logger.js          # Logging system
│   │   │   ├── error-handler.js   # Error handling
│   │   │   ├── retry-handler.js   # Retry mechanism
│   │   │   └── shared-utils.js    # Shared utilities
│   │   ├── 📁 data/               # Data utilities
│   │   │   ├── file-manager.js    # File operations
│   │   │   ├── cache-manager.js   # Caching system
│   │   │   └── item-loader.js     # Item data loader
│   │   └── 📁 game/               # Game utilities
│   │       ├── cooldown.js        # Cooldown management
│   │       ├── item-drop-calculator.js # Item drop calculation
│   │       ├── spirit-stones-calculator.js # Spirit stones calculation
│   │       └── emoji-loader.js    # Emoji management
│   └── 📁 container/              # Dependency Injection
│       └── ServiceContainer.js    # Service container
├── 📁 config/                     # Configuration files
│   ├── constants.js               # Game constants
│   ├── discord-emojis.json       # Discord emoji mapping
│   └── env.example               # Environment variables example
├── 📁 data/                       # Game data files
│   ├── 📁 core/                  # Core game data
│   │   ├── players.json          # Player data
│   │   ├── realms.json           # Realm definitions
│   │   ├── spirit-roots.json     # Spirit root definitions
│   │   └── skills.json           # Skills definitions
│   ├── 📁 items/                 # Items data
│   │   ├── artifacts.json        # Artifacts
│   │   ├── currency.json         # Currency items
│   │   ├── elixirs.json          # Elixirs
│   │   ├── equipment.json        # Equipment
│   │   ├── herbs.json            # Herbs
│   │   ├── hunt_loot.json        # Hunt loot
│   │   ├── index.json            # Items index
│   │   ├── minerals.json         # Minerals
│   │   ├── rarity_levels.json    # Rarity levels
│   │   ├── special_items.json    # Special items
│   │   └── weapons.json          # Weapons
│   ├── 📁 monsters/              # Monsters data
│   │   └── monsters.json         # Monster definitions
│   └── 📁 guilds/                # Guilds data
│       └── guilds.json           # Guild definitions
├── 📁 docs/                      # Documentation
│   ├── README.md                 # Main documentation
│   ├── PROJECT_STRUCTURE.md      # This file
│   ├── ALCHEMY_SYSTEM.md         # Alchemy system docs
│   ├── DISCORD_EMOJI_INTEGRATION.md # Emoji integration docs
│   ├── EQUIPMENT_CRAFTING_UPDATE.md # Equipment crafting docs
│   ├── GAME_BALANCE_UPDATE.md    # Game balance docs
│   ├── HUNT_LOOT_SYSTEM.md       # Hunt loot system docs
│   ├── ITEM_COMMAND_MAPPING.md   # Item command mapping
│   ├── MINE_DROP_SYSTEM.md       # Mine drop system docs
│   ├── NEW_MINERALS_UPDATE.md    # New minerals docs
│   ├── NEW_SPECIAL_ITEMS_UPDATE.md # New special items docs
│   ├── QUICK_ITEM_MAPPING.md     # Quick item mapping
│   └── SPIRIT_STONES_SYSTEM.md   # Spirit stones system docs
├── 📁 tests/                     # Test files (future)
│   ├── 📁 unit/                  # Unit tests
│   ├── 📁 integration/           # Integration tests
│   └── 📁 fixtures/              # Test data
├── 📁 scripts/                   # Build/Deploy scripts
│   ├── update-imports.js         # Import path updater
│   ├── migrate.js                # Data migration script
│   ├── backup.js                 # Backup script
│   └── deploy.js                 # Deploy script
├── index.js                      # Entry point
├── package.json                  # Dependencies
└── package-lock.json            # Lock file
```

## 🎯 **Lợi Ích Của Cấu Trúc Mới**

### **1. Commands được phân loại rõ ràng**
- **Core**: Commands cơ bản và quan trọng nhất
- **Cultivation**: Tất cả commands liên quan đến tu luyện
- **Combat**: Commands chiến đấu và PvP
- **Crafting**: Commands chế tạo và crafting
- **Exploration**: Commands khám phá và thu thập
- **Management**: Commands quản lý inventory và stats
- **Quests**: Commands nhiệm vụ và guild

### **2. Services Layer Architecture**
- **Separation of Concerns**: Business logic tách biệt khỏi commands
- **Dependency Injection**: Dễ dàng test và maintain
- **Reusability**: Services có thể được sử dụng bởi nhiều commands

### **3. Utils được phân loại theo chức năng**
- **Core**: Utilities cơ bản (logging, error handling, etc.)
- **Data**: Utilities xử lý dữ liệu (file, cache, loader)
- **Game**: Utilities game-specific (cooldown, calculations)

### **4. Data được tổ chức tốt hơn**
- **Core**: Dữ liệu cốt lõi của game
- **Items**: Tất cả items trong một thư mục
- **Monsters**: Dữ liệu quái vật riêng biệt
- **Guilds**: Dữ liệu guild riêng biệt

### **5. Documentation tập trung**
- Tất cả documentation trong `docs/`
- Dễ tìm kiếm và maintain
- Có thể generate documentation tự động

## 🚀 **Cách Sử Dụng**

### **Thêm Command mới:**
1. Chọn category phù hợp trong `src/commands/`
2. Tạo file command mới
3. Sử dụng DI container để inject services
4. Command sẽ tự động được load

### **Thêm Service mới:**
1. Tạo service trong `src/services/`
2. Extend từ `BaseService`
3. Register trong `ServiceContainer`
4. Inject vào commands cần thiết

### **Thêm Utility mới:**
1. Chọn category phù hợp trong `src/utils/`
2. Tạo utility file
3. Export functions/classes cần thiết
4. Import vào files cần sử dụng

## 📝 **Lưu Ý**

- **Import paths**: Sử dụng relative paths từ vị trí file
- **Naming convention**: camelCase cho files, PascalCase cho classes
- **Error handling**: Luôn sử dụng ErrorHandler và Logger
- **Testing**: Chuẩn bị structure cho unit tests và integration tests
- **Documentation**: Cập nhật docs khi thay đổi structure
