# 🏗️ **Kế Hoạch Tái Cấu Trúc Thư Mục**

## 📁 **Cấu Trúc Mới Đề Xuất**

```
pntt/
├── 📁 src/                          # Source code chính
│   ├── 📁 commands/                 # Commands được phân loại
│   │   ├── 📁 core/                # Core commands
│   │   │   ├── start.js
│   │   │   ├── status.js
│   │   │   ├── help.js
│   │   │   └── ping.js
│   │   ├── 📁 cultivation/         # Tu luyện
│   │   │   ├── cultivation.js
│   │   │   ├── breakthrough.js
│   │   │   ├── meditate.js
│   │   │   └── spiritroot.js
│   │   ├── 📁 combat/              # Chiến đấu
│   │   │   ├── hunt.js
│   │   │   ├── challenge.js
│   │   │   ├── dungeon.js
│   │   │   └── domain.js
│   │   ├── 📁 crafting/            # Chế tạo
│   │   │   ├── alchemy.js
│   │   │   ├── forge.js
│   │   │   ├── craft.js
│   │   │   └── equipment.js
│   │   ├── 📁 exploration/         # Khám phá
│   │   │   ├── explore.js
│   │   │   ├── mine.js
│   │   │   ├── pick.js
│   │   ├── 📁 management/          # Quản lý
│   │   │   ├── inventory.js
│   │   │   ├── skills.js
│   │   │   ├── wallet.js
│   │   │   └── item.js
│   │   └── 📁 quests/              # Nhiệm vụ
│   │       ├── daily.js
│   │       ├── weekly.js
│   │       └── guild.js
│   ├── 📁 services/                # Business logic
│   │   ├── BaseService.js
│   │   ├── PlayerService.js
│   │   ├── CombatService.js
│   │   ├── SpiritRootService.js
│   │   ├── AlchemyService.js
│   │   ├── ForgeService.js
│   │   └── InventoryService.js
│   ├── 📁 systems/                 # Game systems
│   │   ├── combat.js
│   │   ├── monster.js
│   │   ├── player.js
│   │   ├── exp-calculator.js
│   │   ├── level-requirements.js
│   │   └── guilds.js
│   ├── 📁 utils/                   # Utilities
│   │   ├── 📁 core/               # Core utilities
│   │   │   ├── logger.js
│   │   │   ├── error-handler.js
│   │   │   ├── retry-handler.js
│   │   │   └── shared-utils.js
│   │   ├── 📁 data/               # Data utilities
│   │   │   ├── file-manager.js
│   │   │   ├── cache-manager.js
│   │   │   └── item-loader.js
│   │   ├── 📁 game/               # Game utilities
│   │   │   ├── cooldown.js
│   │   │   ├── item-drop-calculator.js
│   │   │   ├── spirit-stones-calculator.js
│   │   │   └── emoji-loader.js
│   └── 📁 container/              # DI Container
│       └── ServiceContainer.js
├── 📁 config/                     # Configuration
│   ├── constants.js
│   ├── discord-emojis.json
│   └── env.example
├── 📁 data/                       # Game data
│   ├── 📁 core/                  # Core data
│   │   ├── players.json
│   │   ├── realms.json
│   │   ├── spirit-roots.json
│   │   └── skills.json
│   ├── 📁 items/                 # Items data
│   │   ├── artifacts.json
│   │   ├── currency.json
│   │   ├── elixirs.json
│   │   ├── equipment.json
│   │   ├── herbs.json
│   │   ├── hunt_loot.json
│   │   ├── index.json
│   │   ├── minerals.json
│   │   ├── rarity_levels.json
│   │   ├── special_items.json
│   │   └── weapons.json
│   ├── 📁 monsters/              # Monsters data
│   │   └── monsters.json
│   └── 📁 guilds/                # Guilds data
│       └── guilds.json
├── 📁 docs/                      # Documentation
│   ├── README.md
│   ├── ALCHEMY_SYSTEM.md
│   ├── DISCORD_EMOJI_INTEGRATION.md
│   ├── EQUIPMENT_CRAFTING_UPDATE.md
│   ├── GAME_BALANCE_UPDATE.md
│   ├── HUNT_LOOT_SYSTEM.md
│   ├── ITEM_COMMAND_MAPPING.md
│   ├── MINE_DROP_SYSTEM.md
│   ├── NEW_MINERALS_UPDATE.md
│   ├── NEW_SPECIAL_ITEMS_UPDATE.md
│   ├── QUICK_ITEM_MAPPING.md
│   └── SPIRIT_STONES_SYSTEM.md
├── 📁 tests/                     # Test files
│   ├── 📁 unit/                  # Unit tests
│   ├── 📁 integration/           # Integration tests
│   └── 📁 fixtures/              # Test data
├── 📁 scripts/                   # Build/Deploy scripts
│   ├── migrate.js
│   ├── backup.js
│   └── deploy.js
├── index.js                      # Entry point
├── package.json
└── package-lock.json
```

## 🎯 **Lợi Ích Của Cấu Trúc Mới**

### **1. Commands được phân loại rõ ràng**
- **Core**: Commands cơ bản (start, status, help)
- **Cultivation**: Tu luyện (cultivation, breakthrough, meditate)
- **Combat**: Chiến đấu (hunt, challenge, dungeon)
- **Crafting**: Chế tạo (alchemy, forge, craft)
- **Exploration**: Khám phá (explore, mine, pick, domain)
- **Management**: Quản lý (inventory, skills, wallet)
- **Quests**: Nhiệm vụ (daily, weekly, guild)

### **2. Services được tách biệt rõ ràng**
- **Business logic** trong services/
- **Game systems** trong systems/
- **Utilities** được phân loại theo chức năng

### **3. Data được tổ chức tốt hơn**
- **Core data**: Players, realms, spirit roots, skills
- **Items data**: Tất cả items trong 1 thư mục
- **Monsters data**: Monster data riêng biệt
- **Guilds data**: Guild data riêng biệt

### **4. Documentation được tập trung**
- Tất cả .md files trong docs/
- Dễ tìm và maintain

### **5. Test structure sẵn sàng**
- Unit tests, integration tests
- Test fixtures riêng biệt

## 🚀 **Migration Plan**

### **Phase 1: Tạo cấu trúc mới**
1. Tạo các thư mục mới
2. Di chuyển files theo cấu trúc mới
3. Cập nhật import paths

### **Phase 2: Refactor imports**
1. Cập nhật tất cả require() statements
2. Test để đảm bảo không có lỗi
3. Cập nhật documentation

### **Phase 3: Cleanup**
1. Xóa files cũ
2. Cập nhật scripts
3. Final testing

## 📝 **Lưu Ý**

- **Backward compatibility**: Đảm bảo bot vẫn hoạt động trong quá trình migration
- **Gradual migration**: Có thể migrate từng phần một
- **Testing**: Test kỹ sau mỗi bước migration
- **Documentation**: Cập nhật README và docs
