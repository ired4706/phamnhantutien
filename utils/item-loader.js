const fs = require('fs');
const path = require('path');

class ItemLoader {
  constructor() {
    this.items = {};
    this.rarityLevels = {};
    this.categories = {};
    this.loaded = false;
  }

  // Load tất cả items từ các file
  async loadAllItems() {
    try {
      if (this.loaded) return this.items;

      const itemsDir = path.join(__dirname, '../data/items');
      const indexPath = path.join(itemsDir, 'index.json');

      // Load file index để biết cấu trúc
      if (fs.existsSync(indexPath)) {
        const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        this.categories = indexData.categories;

        // Load từng file items
        for (const fileName of indexData.item_files) {
          const filePath = path.join(itemsDir, fileName);
          if (fs.existsSync(filePath)) {
            const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            this.mergeItems(fileData, fileName);
          }
        }

        // Load weapons.json riêng vì không có trong index
        const weaponsPath = path.join(itemsDir, 'weapons.json');
        if (fs.existsSync(weaponsPath)) {
          const weaponsData = JSON.parse(fs.readFileSync(weaponsPath, 'utf8'));
          this.mergeItems(weaponsData, 'weapons.json');
        }

        // Load hunt_loot.json riêng vì không có trong index
        const huntLootPath = path.join(itemsDir, 'hunt_loot.json');
        if (fs.existsSync(huntLootPath)) {
          const huntLootData = JSON.parse(fs.readFileSync(huntLootPath, 'utf8'));
          this.mergeItems(huntLootData, 'hunt_loot.json');
        }
      } else {
        // Fallback: load file items.json cũ nếu có
        const oldItemsPath = path.join(__dirname, '../data/items.json');
        if (fs.existsSync(oldItemsPath)) {
          const oldData = JSON.parse(fs.readFileSync(oldItemsPath, 'utf8'));
          this.mergeItems(oldData, 'legacy');
        }
      }

      this.loaded = true;
      console.log(`✅ Loaded ${Object.keys(this.items).length} items from ${Object.keys(this.categories).length} categories`);
      return this.items;
    } catch (error) {
      console.error('❌ Error loading items:', error);
      return {};
    }
  }

  // Merge items từ các file khác nhau
  mergeItems(fileData, fileName) {
    // Merge rarity levels - file rarity_levels.json có cấu trúc trực tiếp
    if (fileName === 'rarity_levels.json') {
      this.rarityLevels = { ...this.rarityLevels, ...fileData };
    } else if (fileData.rarity_levels) {
      // Fallback cho cấu trúc cũ
      this.rarityLevels = { ...this.rarityLevels, ...fileData.rarity_levels };
    }

    // Xác định category từ tên file
    let category = this.determineCategoryFromFileName(fileName);

    // Merge tất cả items
    Object.keys(fileData).forEach(key => {
      if (key !== 'rarity_levels' && key !== 'drop_rates_by_realm' && key !== 'crafting_recipes' && key !== 'hunt_mechanics') {
        if (fileData[key] && typeof fileData[key] === 'object') {
          // Nếu là object chứa items (như herbs.json, minerals.json)
          if (fileData[key].name && fileData[key].emoji) {
            // Đây là item, thêm vào với category đã xác định
            this.items[key] = {
              ...fileData[key],
              category: category
            };
          } else {
            // Có thể là category con, kiểm tra từng item
            Object.keys(fileData[key]).forEach(itemId => {
              if (fileData[key][itemId] && fileData[key][itemId].name) {
                this.items[itemId] = {
                  ...fileData[key][itemId],
                  category: category
                };
              }
            });
          }
        }
      }
    });
  }

  // Xác định category từ tên file
  determineCategoryFromFileName(fileName) {
    const fileNameWithoutExt = fileName.replace('.json', '');

    switch (fileNameWithoutExt) {
      case 'herbs':
        return 'herbs';
      case 'minerals':
        return 'minerals';
      case 'hunt_loot':
        return 'hunt_loot';
      case 'special_items':
        return 'special_items';
      case 'artifacts':
        return 'artifacts';
      case 'elixirs':
        return 'elixirs';
      case 'weapons':
        return 'weapons';
      case 'equipment':
        return 'equipment';
      case 'currency':
        return 'currency';
      default:
        return fileNameWithoutExt;
    }
  }

  // Lấy thông tin item theo ID
  getItemInfo(itemId) {
    return this.items[itemId] || null;
  }

  // Lấy tên item
  getItemName(itemId) {
    const item = this.items[itemId];
    return item ? item.name : itemId;
  }

  // Lấy emoji item
  getItemEmoji(itemId) {
    const item = this.items[itemId];
    return item ? item.emoji : '📦';
  }

  // Lấy rarity của item
  getItemRarity(itemId) {
    const item = this.items[itemId];
    if (!item || !item.rarity) return null;

    return this.rarityLevels[item.rarity] || null;
  }

  // Lấy tên rarity
  getRarityName(itemId) {
    const rarity = this.getItemRarity(itemId);
    return rarity ? rarity.name : 'Không xác định';
  }

  // Lấy màu rarity
  getRarityColor(itemId) {
    const rarity = this.getItemRarity(itemId);
    return rarity ? rarity.color : '#808080';
  }

  // Lấy emoji rarity
  getRarityEmoji(itemId) {
    const rarity = this.getItemRarity(itemId);
    return rarity ? rarity.emoji : '⚪';
  }

  // Lấy items theo category
  getItemsByCategory(category) {
    return Object.values(this.items).filter(item => item.category === category);
  }

  // Lấy items theo rarity
  getItemsByRarity(rarity) {
    return Object.values(this.items).filter(item => item.rarity === rarity);
  }

  // Tìm kiếm items theo tên
  searchItems(query) {
    const searchTerm = query.toLowerCase();
    return Object.values(this.items).filter(item =>
      item.name.toLowerCase().includes(searchTerm) ||
      (item.description && item.description.toLowerCase().includes(searchTerm))
    );
  }

  // Lấy tất cả categories có sẵn
  getAvailableCategories() {
    const categories = new Set();
    Object.values(this.items).forEach(item => {
      if (item.category) {
        categories.add(item.category);
      }
    });
    return Array.from(categories);
  }

  // Lấy items theo category và rarity
  getItemsByCategoryAndRarity(category, rarity) {
    return Object.values(this.items).filter(item =>
      item.category === category && item.rarity === rarity
    );
  }

  // Lấy random item theo category và rarity
  getRandomItemByCategoryAndRarity(category, rarity) {
    const items = this.getItemsByCategoryAndRarity(category, rarity);
    if (items.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * items.length);
    return items[randomIndex];
  }

  // Reload items (hữu ích khi có thay đổi)
  async reload() {
    this.loaded = false;
    this.items = {};
    this.rarityLevels = {};
    return await this.loadAllItems();
  }
}

// Export singleton instance
const itemLoader = new ItemLoader();
module.exports = itemLoader; 