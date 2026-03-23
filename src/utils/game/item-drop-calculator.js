/**
 * Utility để tính toán drop rate của items theo tỉ lệ mới
 * Dựa trên bảng tỉ lệ được cung cấp cho từng lệnh
 */

const itemLoader = require('../data/item-loader.js');

class ItemDropCalculator {
  /**
   * Tính toán items cho lệnh /pick (thảo dược)
   * @param {Object} player - Player object
   * @returns {Array} Danh sách thảo dược thu được
   */
  static calculatePickItems(player) {
    // Load items nếu chưa load
    itemLoader.loadAllItems();

    const herbs = Object.values(itemLoader.items).filter(item => item.category === 'herbs');

    // Tỷ lệ thu thập theo rarity
    const rarityWeights = {
      'common': 60,      // 60%
      'uncommon': 25,    // 25%
      'rare': 10,        // 10%
      'epic': 3,         // 3%
      'legendary': 1.5,  // 1.5%
      'mythic': 0.5      // 0.5%
    };

    const count = Math.floor(Math.random() * 3) + 2; // 2-4 thảo dược
    const selected = [];

    for (let i = 0; i < count; i++) {
      // Chọn rarity dựa trên tỷ lệ
      const rarity = this.selectRarityByWeight(rarityWeights);

      // Lọc thảo dược theo rarity đã chọn
      const availableHerbs = herbs.filter(herb => herb.rarity === rarity);

      if (availableHerbs.length > 0) {
        const randomHerb = availableHerbs[Math.floor(Math.random() * availableHerbs.length)];

        // Tìm id (key) của herb trong itemLoader.items
        const herbId = Object.keys(itemLoader.items).find(key =>
          itemLoader.items[key] === randomHerb
        );

        // Kiểm tra xem thảo dược đã được chọn chưa
        if (!selected.find(h => h.id === herbId)) {
          selected.push({
            id: herbId, // Use actual id (key) instead of name
            name: randomHerb.name,
            emoji: randomHerb.emoji,
            rarity: randomHerb.rarity,
            value: randomHerb.value,
            description: randomHerb.description
          });
        }
      }
    }

    return selected;
  }

  /**
   * Tính toán items cho lệnh /mine (khoáng sản)
   * @param {Object} player - Player object
   * @returns {Array} Danh sách khoáng sản thu được
   */
  static  calculateMineItems(player) {
    // Load items nếu chưa load
    itemLoader.loadAllItems();

    const minerals = Object.values(itemLoader.items).filter(item => item.category === 'minerals');

    // Tỉ lệ drop theo tu vi
    const dropRates = this.getMineDropRatesByRealm(player.realm, player.realmLevel);

    // Số lượng item theo tu vi
    const itemCountByRealm = {
      'luyen_khi': { min: 3, max: 5 },    // Luyện Khí: 3-5 item
      'truc_co': { min: 4, max: 6 },      // Trúc Cơ: 4-6 item
      'ket_dan': { min: 5, max: 7 },      // Kết Đan: 5-7 item
      'nguyen_anh': { min: 6, max: 8 }    // Nguyên Anh: 6-8 item
    };

    const realmConfig = itemCountByRealm[player.realm] || itemCountByRealm['luyen_khi'];
    const count = Math.floor(Math.random() * (realmConfig.max - realmConfig.min + 1)) + realmConfig.min;

    const selectedMinerals = [];

    for (let i = 0; i < count; i++) {
      const rarity = this.selectRarityByDropRate(dropRates);
      const mineralsByRarity = minerals.filter(mineral => mineral.rarity === rarity);

      if (mineralsByRarity.length > 0) {
        const randomMineral = mineralsByRarity[Math.floor(Math.random() * mineralsByRarity.length)];

        // Tìm id (key) của mineral trong itemLoader.items
        const mineralId = Object.keys(itemLoader.items).find(key =>
          itemLoader.items[key] === randomMineral
        );

        if (!selectedMinerals.find(m => m.id === mineralId)) {
          selectedMinerals.push({
            id: mineralId, // Use actual id (key) instead of name
            name: randomMineral.name,
            emoji: randomMineral.emoji,
            rarity: randomMineral.rarity,
            value: randomMineral.value,
            description: randomMineral.description
          });
        }
      }
    }

    return selectedMinerals;
  }

  /**
   * Tính toán items cho lệnh /hunt (săn yêu thú)
   * @param {Object} player - Player object
   * @returns {Array} Danh sách vật liệu săn được
   */
  static calculateHuntItems(player) {
    // Load items nếu chưa load
    itemLoader.loadAllItems();

    const huntItems = Object.values(itemLoader.items).filter(item => item.category === 'hunt_loot');

    // Tỉ lệ drop theo tu vi
    const dropRates = this.getHuntDropRatesByRealm(player.realm, player.realmLevel);

    // Số lượng item theo tu vi
    const itemCountByRealm = {
      'luyen_khi': { min: 1, max: 2 },    // Luyện Khí: 1-2 item
      'truc_co': { min: 1, max: 3 },      // Trúc Cơ: 1-3 item
      'ket_dan': { min: 2, max: 4 },      // Kết Đan: 2-4 item
      'nguyen_anh': { min: 2, max: 5 }    // Nguyên Anh: 2-5 item
    };

    const realmConfig = itemCountByRealm[player.realm] || itemCountByRealm['luyen_khi'];
    const count = Math.floor(Math.random() * (realmConfig.max - realmConfig.min + 1)) + realmConfig.min;

    const selectedItems = [];

    for (let i = 0; i < count; i++) {
      const rarity = this.selectRarityByDropRate(dropRates);
      const itemsByRarity = huntItems.filter(item => item.rarity === rarity);

      if (itemsByRarity.length > 0) {
        const randomItem = itemsByRarity[Math.floor(Math.random() * itemsByRarity.length)];

        // Tìm id (key) của item trong itemLoader.items
        const itemId = Object.keys(itemLoader.items).find(key =>
          itemLoader.items[key] === randomItem
        );

        if (!selectedItems.find(item => item.id === itemId)) {
          selectedItems.push({
            id: itemId, // Use actual id (key) instead of name
            name: randomItem.name,
            emoji: randomItem.emoji,
            rarity: randomItem.rarity,
            value: randomItem.value,
            description: randomItem.description
          });
        }
      }
    }

    return selectedItems;
  }

  /**
   * Tính toán items cho lệnh /explore (khám phá)
   * @param {Object} player - Player object
   * @returns {Array} Danh sách khám phá
   */
  static calculateExploreItems(player) {
    // Khám phá không có items thực tế, chỉ có mô tả
    const discoveries = [
      '🏔️ Núi cao', '🌊 Biển rộng', '🌲 Rừng rậm',
      '🏜️ Sa mạc', '🏞️ Thung lũng', '🌋 Núi lửa',
      '🏰 Lâu đài cổ', '🗿 Tượng đá', '🏛️ Đền thờ',
      '🌅 Bình minh', '🌄 Hoàng hôn', '🌌 Bầu trời đêm'
    ];

    const count = Math.floor(Math.random() * 3) + 2; // 2-4 khám phá
    const selected = [];

    for (let i = 0; i < count; i++) {
      const discovery = discoveries[Math.floor(Math.random() * discoveries.length)];
      if (!selected.includes(discovery)) {
        selected.push(discovery);
      }
    }

    return selected;
  }

  /**
   * Tính toán items cho lệnh /challenge (thách đấu)
   * @param {Object} player - Player object
   * @returns {Array} Danh sách phần thưởng thách đấu
   */
  static calculateChallengeItems(player) {
    // Load items nếu chưa load
    itemLoader.loadAllItems();

    const specialItems = Object.values(itemLoader.items).filter(item => item.category === 'special_items');

    // Tỉ lệ drop theo tu vi
    const dropRates = this.getChallengeDropRatesByRealm(player.realm, player.realmLevel);

    const count = Math.floor(Math.random() * 2) + 1; // 1-2 item
    const selected = [];

    for (let i = 0; i < count; i++) {
      const rarity = this.selectRarityByDropRate(dropRates);
      const itemsByRarity = specialItems.filter(item => item.rarity === rarity);

      if (itemsByRarity.length > 0) {
        const randomItem = itemsByRarity[Math.floor(Math.random() * itemsByRarity.length)];

        // Tìm id (key) của item trong itemLoader.items
        const itemId = Object.keys(itemLoader.items).find(key =>
          itemLoader.items[key] === randomItem
        );

        if (!selected.find(item => item.id === itemId)) {
          selected.push({
            id: itemId, // Use actual id (key) instead of name
            name: randomItem.name,
            emoji: randomItem.emoji,
            rarity: randomItem.rarity,
            value: randomItem.value,
            description: randomItem.description
          });
        }
      }
    }

    return selected;
  }

  /**
   * Tính toán items cho lệnh /domain (lãnh địa)
   * @param {Object} player - Player object
   * @returns {Array} Danh sách bảo vật lãnh địa
   */
  static calculateDomainItems(player) {
    // Load items nếu chưa load
    itemLoader.loadAllItems();

    const artifacts = Object.values(itemLoader.items).filter(item => item.category === 'artifacts');

    // Tỉ lệ drop theo tu vi
    const dropRates = this.getDomainDropRatesByRealm(player.realm, player.realmLevel);

    const count = Math.floor(Math.random() * 3) + 2; // 2-4 item
    const selected = [];

    for (let i = 0; i < count; i++) {
      const rarity = this.selectRarityByDropRate(dropRates);
      const itemsByRarity = artifacts.filter(item => item.rarity === rarity);

      if (itemsByRarity.length > 0) {
        const randomItem = itemsByRarity[Math.floor(Math.random() * itemsByRarity.length)];

        // Tìm id (key) của item trong itemLoader.items
        const itemId = Object.keys(itemLoader.items).find(key =>
          itemLoader.items[key] === randomItem
        );

        if (!selected.find(item => item.id === itemId)) {
          selected.push({
            id: itemId, // Use actual id (key) instead of name
            name: randomItem.name,
            emoji: randomItem.emoji,
            rarity: randomItem.rarity,
            value: randomItem.value,
            description: randomItem.description
          });
        }
      }
    }

    return selected;
  }

  /**
   * Tính toán items cho lệnh /dungeon (hầm ngục)
   * @param {Object} player - Player object
   * @returns {Array} Danh sách loot hầm ngục
   */
  static calculateDungeonItems(player) {
    // Load items nếu chưa load
    itemLoader.loadAllItems();

    const allItems = Object.values(itemLoader.items);

    // Tỉ lệ drop theo tu vi
    const dropRates = this.getDungeonDropRatesByRealm(player.realm, player.realmLevel);

    const count = Math.floor(Math.random() * 4) + 3; // 3-6 item
    const selected = [];

    for (let i = 0; i < count; i++) {
      const rarity = this.selectRarityByDropRate(dropRates);
      const itemsByRarity = allItems.filter(item => item.rarity === rarity);

      if (itemsByRarity.length > 0) {
        const randomItem = itemsByRarity[Math.floor(Math.random() * itemsByRarity.length)];
        if (!selected.find(item => item.id === randomItem.id)) {
          selected.push({
            id: randomItem.id,
            name: randomItem.name,
            emoji: randomItem.emoji,
            rarity: randomItem.rarity,
            value: randomItem.value,
            description: randomItem.description
          });
        }
      }
    }

    return selected;
  }

  /**
   * Tính toán items cho lệnh /daily (nhiệm vụ hàng ngày)
   * @param {Object} player - Player object
   * @returns {Array} Danh sách phần thưởng daily
   */
  static calculateDailyItems(player) {
    // Load items nếu chưa load
    itemLoader.loadAllItems();

    const allItems = Object.values(itemLoader.items);

    // Daily có phần thưởng cố định + random
    const guaranteedItems = [
      { id: 'elixir_co_ban', name: 'Đan Dược Cơ Bản', emoji: '💊', rarity: 'common', value: 100, description: 'Đan dược cơ bản' },
      { id: 'herb_co_ban', name: 'Thảo Dược Cơ Bản', emoji: '🌿', rarity: 'common', value: 50, description: 'Thảo dược cơ bản' }
    ];

    // Random thêm 1-3 items theo rarity
    const dropRates = this.getDailyDropRatesByRealm(player.realm, player.realmLevel);
    const randomCount = Math.floor(Math.random() * 3) + 1;
    const randomItems = [];

    for (let i = 0; i < randomCount; i++) {
      const rarity = this.selectRarityByDropRate(dropRates);
      const itemsByRarity = allItems.filter(item => item.rarity === rarity);

      if (itemsByRarity.length > 0) {
        const randomItem = itemsByRarity[Math.floor(Math.random() * itemsByRarity.length)];

        // Tìm id (key) của item trong itemLoader.items
        const itemId = Object.keys(itemLoader.items).find(key =>
          itemLoader.items[key] === randomItem
        );

        if (!randomItems.find(item => item.id === itemId)) {
          randomItems.push({
            id: itemId, // Use actual id (key) instead of name
            name: randomItem.name,
            emoji: randomItem.emoji,
            rarity: randomItem.rarity,
            value: randomItem.value,
            description: randomItem.description
          });
        }
      }
    }

    return [...guaranteedItems, ...randomItems];
  }

  /**
   * Tính toán items cho lệnh /weekly (nhiệm vụ hàng tuần)
   * @param {Object} player - Player object
   * @returns {Array} Danh sách phần thưởng weekly
   */
  static calculateWeeklyItems(player) {
    // Load items nếu chưa load
    itemLoader.loadAllItems();

    const allItems = Object.values(itemLoader.items);

    // Weekly có phần thưởng cố định + random
    const guaranteedItems = [
      { id: 'elixir_trung_cap', name: 'Đan Dược Trung Cấp', emoji: '💊', rarity: 'uncommon', value: 500, description: 'Đan dược trung cấp' },
      { id: 'herb_trung_cap', name: 'Thảo Dược Trung Cấp', emoji: '🌿', rarity: 'uncommon', value: 300, description: 'Thảo dược trung cấp' },
      { id: 'artifact_co_ban', name: 'Pháp Bảo Cơ Bản', emoji: '🔮', rarity: 'rare', value: 1000, description: 'Pháp bảo cơ bản' }
    ];

    // Random thêm 2-5 items theo rarity
    const dropRates = this.getWeeklyDropRatesByRealm(player.realm, player.realmLevel);
    const randomCount = Math.floor(Math.random() * 4) + 2;
    const randomItems = [];

    for (let i = 0; i < randomCount; i++) {
      const rarity = this.selectRarityByDropRate(dropRates);
      const itemsByRarity = allItems.filter(item => item.rarity === rarity);

      if (itemsByRarity.length > 0) {
        const randomItem = itemsByRarity[Math.floor(Math.random() * itemsByRarity.length)];

        // Tìm id (key) của item trong itemLoader.items
        const itemId = Object.keys(itemLoader.items).find(key =>
          itemLoader.items[key] === randomItem
        );

        if (!randomItems.find(item => item.id === itemId)) {
          randomItems.push({
            id: itemId, // Use actual id (key) instead of name
            name: randomItem.name,
            emoji: randomItem.emoji,
            rarity: randomItem.rarity,
            value: randomItem.value,
            description: randomItem.description
          });
        }
      }
    }

    return [...guaranteedItems, ...randomItems];
  }

  // ===== CÁC METHOD HỖ TRỢ =====

  /**
   * Lấy tỉ lệ drop theo tu vi cho lệnh mine
   */
  static getMineDropRatesByRealm(realm, realmLevel) {
    const realmDropRates = {
      'luyen_khi': { common: 80, uncommon: 20, rare: 0, epic: 0, legendary: 0 },
      'truc_co': { common: 55, uncommon: 35, rare: 10, epic: 0, legendary: 0 },
      'ket_dan': { common: 35, uncommon: 35, rare: 25, epic: 5, legendary: 0 },
      'nguyen_anh': { common: 20, uncommon: 30, rare: 35, epic: 14, legendary: 1 }
    };
    return realmDropRates[realm] || realmDropRates['luyen_khi'];
  }

  /**
   * Lấy tỉ lệ drop theo tu vi cho lệnh hunt
   */
  static getHuntDropRatesByRealm(realm, realmLevel) {
    const realmDropRates = {
      'luyen_khi': { common: 80, uncommon: 20, rare: 0, epic: 0, legendary: 0 },
      'truc_co': { common: 60, uncommon: 30, rare: 10, epic: 0, legendary: 0 },
      'ket_dan': { common: 40, uncommon: 35, rare: 20, epic: 5, legendary: 0 },
      'nguyen_anh': { common: 25, uncommon: 35, rare: 30, epic: 9, legendary: 1 }
    };
    return realmDropRates[realm] || realmDropRates['luyen_khi'];
  }

  /**
   * Lấy tỉ lệ drop theo tu vi cho lệnh challenge
   */
  static getChallengeDropRatesByRealm(realm, realmLevel) {
    const realmDropRates = {
      'luyen_khi': { common: 70, uncommon: 25, rare: 5, epic: 0, legendary: 0 },
      'truc_co': { common: 50, uncommon: 35, rare: 12, epic: 3, legendary: 0 },
      'ket_dan': { common: 30, uncommon: 40, rare: 25, epic: 4, legendary: 1 },
      'nguyen_anh': { common: 20, uncommon: 35, rare: 35, epic: 9, legendary: 1 }
    };
    return realmDropRates[realm] || realmDropRates['luyen_khi'];
  }

  /**
   * Lấy tỉ lệ drop theo tu vi cho lệnh domain
   */
  static getDomainDropRatesByRealm(realm, realmLevel) {
    const realmDropRates = {
      'luyen_khi': { common: 60, uncommon: 30, rare: 10, epic: 0, legendary: 0 },
      'truc_co': { common: 40, uncommon: 40, rare: 18, epic: 2, legendary: 0 },
      'ket_dan': { common: 25, uncommon: 45, rare: 25, epic: 4, legendary: 1 },
      'nguyen_anh': { common: 15, uncommon: 40, rare: 35, epic: 9, legendary: 1 }
    };
    return realmDropRates[realm] || realmDropRates['luyen_khi'];
  }

  /**
   * Lấy tỉ lệ drop theo tu vi cho lệnh dungeon
   */
  static getDungeonDropRatesByRealm(realm, realmLevel) {
    const realmDropRates = {
      'luyen_khi': { common: 65, uncommon: 30, rare: 5, epic: 0, legendary: 0 },
      'truc_co': { common: 45, uncommon: 40, rare: 13, epic: 2, legendary: 0 },
      'ket_dan': { common: 30, uncommon: 45, rare: 22, epic: 3, legendary: 0 },
      'nguyen_anh': { common: 20, uncommon: 40, rare: 32, epic: 7, legendary: 1 }
    };
    return realmDropRates[realm] || realmDropRates['luyen_khi'];
  }

  /**
   * Lấy tỉ lệ drop theo tu vi cho lệnh daily
   */
  static getDailyDropRatesByRealm(realm, realmLevel) {
    const realmDropRates = {
      'luyen_khi': { common: 70, uncommon: 25, rare: 5, epic: 0, legendary: 0 },
      'truc_co': { common: 50, uncommon: 35, rare: 12, epic: 3, legendary: 0 },
      'ket_dan': { common: 35, uncommon: 40, rare: 20, epic: 4, legendary: 1 },
      'nguyen_anh': { common: 25, uncommon: 40, rare: 25, epic: 9, legendary: 1 }
    };
    return realmDropRates[realm] || realmDropRates['luyen_khi'];
  }

  /**
   * Lấy tỉ lệ drop theo tu vi cho lệnh weekly
   */
  static getWeeklyDropRatesByRealm(realm, realmLevel) {
    const realmDropRates = {
      'luyen_khi': { common: 60, uncommon: 30, rare: 8, epic: 2, legendary: 0 },
      'truc_co': { common: 40, uncommon: 40, rare: 15, epic: 4, legendary: 1 },
      'ket_dan': { common: 25, uncommon: 45, rare: 25, epic: 4, legendary: 1 },
      'nguyen_anh': { common: 15, uncommon: 45, rare: 30, epic: 9, legendary: 1 }
    };
    return realmDropRates[realm] || realmDropRates['luyen_khi'];
  }

  /**
   * Chọn rarity dựa trên tỉ lệ drop
   */
  static selectRarityByDropRate(dropRates) {
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const [rarity, rate] of Object.entries(dropRates)) {
      cumulative += rate;
      if (random <= cumulative) {
        return rarity;
      }
    }

    return 'common'; // Fallback
  }

  /**
   * Chọn rarity dựa trên tỷ lệ weight
   */
  static selectRarityByWeight(weights) {
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (const [rarity, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        return rarity;
      }
    }

    return 'common'; // Fallback
  }

  /**
   * Format hiển thị items
   */
  static formatItems(items) {
    if (!items || items.length === 0) {
      return 'Không có items nào';
    }

    return items.map(item => {
      if (typeof item === 'string') {
        // Nếu là string (như khám phá)
        return item;
      } else {
        // Nếu là object item
        const rarityEmojis = {
          'common': '⚪',
          'uncommon': '🟢',
          'rare': '🔵',
          'epic': '🟣',
          'legendary': '🟠',
          'mythic': '🔴'
        };
        const rarityEmoji = rarityEmojis[item.rarity] || '';
        return `${item.emoji} **${item.name}** ${rarityEmoji}`;
      }
    }).join('\n');
  }
}

module.exports = ItemDropCalculator; 