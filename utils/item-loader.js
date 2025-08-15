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
            this.mergeItems(fileData);
          }
        }
      } else {
        // Fallback: load file items.json cũ nếu có
        const oldItemsPath = path.join(__dirname, '../data/items.json');
        if (fs.existsSync(oldItemsPath)) {
          const oldData = JSON.parse(fs.readFileSync(oldItemsPath, 'utf8'));
          this.mergeItems(oldData);
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
  mergeItems(fileData) {
    // Merge rarity levels
    if (fileData.rarity_levels) {
      this.rarityLevels = { ...this.rarityLevels, ...fileData.rarity_levels };
    }

    // Merge tất cả items
    Object.keys(fileData).forEach(category => {
      if (category !== 'rarity_levels') {
        if (fileData[category] && typeof fileData[category] === 'object') {
          Object.keys(fileData[category]).forEach(itemId => {
            this.items[itemId] = {
              ...fileData[category][itemId],
              category: category
            };
          });
        }
      }
    });
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

  // Lấy loại item
  getItemType(itemId) {
    const item = this.items[itemId];
    return item ? item.type : 'unknown';
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
      item.description.toLowerCase().includes(searchTerm)
    );
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