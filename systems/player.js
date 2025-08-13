const fs = require('fs');
const path = require('path');

class PlayerManager {
  constructor() {
    this.players = new Map();
    this.dataPath = path.join(__dirname, '../data/players.json');
    this.spiritRootsPath = path.join(__dirname, '../data/spirit-roots.json');
    this.realmsPath = path.join(__dirname, '../data/realms.json');
    this.loadPlayers();
    this.loadSpiritRoots();
    this.loadRealms();
  }

  loadSpiritRoots() {
    try {
      const data = fs.readFileSync(this.spiritRootsPath, 'utf8');
      this.spiritRoots = JSON.parse(data).spirit_roots;
    } catch (error) {
      console.error('Error loading spirit roots:', error);
      this.spiritRoots = {};
    }
  }

  loadRealms() {
    try {
      const data = fs.readFileSync(this.realmsPath, 'utf8');
      this.realms = JSON.parse(data).realms;
    } catch (error) {
      console.error('Error loading realms:', error);
      this.realms = {};
    }
  }

  loadPlayers() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = fs.readFileSync(this.dataPath, 'utf8');
        const playersData = JSON.parse(data);

        for (const [userId, playerData] of Object.entries(playersData)) {
          this.players.set(userId, playerData);
        }
        console.log(`✅ Loaded ${this.players.size} players`);
      }
    } catch (error) {
      console.error('Error loading players:', error);
    }
  }

  savePlayers() {
    try {
      const playersData = {};
      for (const [userId, playerData] of this.players.entries()) {
        playersData[userId] = playerData;
      }

      fs.writeFileSync(this.dataPath, JSON.stringify(playersData, null, 2));
    } catch (error) {
      console.error('Error saving players:', error);
    }
  }

  createPlayer(userId, username, chosenSpiritRoot = null) {
    if (this.players.has(userId)) {
      return this.players.get(userId);
    }

    // Sử dụng linh căn được chọn hoặc random nếu không có
    let spiritRoot;
    if (chosenSpiritRoot && this.spiritRoots[chosenSpiritRoot]) {
      spiritRoot = chosenSpiritRoot;
    } else {
      const spiritRootTypes = Object.keys(this.spiritRoots);
      spiritRoot = spiritRootTypes[Math.floor(Math.random() * spiritRootTypes.length)];
    }

    const player = {
      userId: userId,
      username: username,
      spiritRoot: spiritRoot,
      experience: 0,
      realm: 'luyen_khi',
      realmLevel: 1,
      totalTiers: 0, // Tổng số tầng đã qua
      inventory: {
        spiritStones: 100,
        items: [
          // Khởi tạo với một số vật phẩm cơ bản để test
          { name: 'Linh Thạch Hạ Phẩm', quantity: 50, type: 'material' },
          { name: 'Thảo Dược Cơ Bản', quantity: 20, type: 'herb' }
        ],
        weapons: [],
        armors: []
      },
      cultivation: {
        lastCultivate: 0,
        cultivateCooldown: 300000, // 5 phút
        breakthroughAttempts: 0,
        lastBreakthrough: 0,
        // Thêm các field cooldown mới
        lastMeditate: 0,
        lastHunt: 0,
        lastChallenge: 0,
        lastDomain: 0,
        lastDailyQuest: 0,
        lastWeeklyQuest: 0,
        lastDungeon: 0,
        lastMine: 0,
        lastPick: 0,
        lastExplore: 0
      },
      achievements: [],
      joinDate: Date.now(),
      lastActive: Date.now()
    };

    // Tính toán stats dựa trên công thức mới
    this.calculatePlayerStats(player);

    this.players.set(userId, player);
    this.savePlayers();

    const spiritRootInfo = this.spiritRoots[spiritRoot];
    console.log(`🌿 Created new player: ${username} with ${spiritRootInfo.name}`);
    return player;
  }

  chooseSpiritRoot(userId, username, spiritRootType) {
    // Kiểm tra linh căn hợp lệ
    if (!this.spiritRoots[spiritRootType]) {
      return { success: false, message: 'Linh căn không hợp lệ!' };
    }

    // Kiểm tra user đã có linh căn chưa
    const existingPlayer = this.getPlayer(userId);
    if (existingPlayer && existingPlayer.spiritRoot) {
      return { success: false, message: 'Bạn đã có linh căn rồi!' };
    }

    // Tạo player mới với linh căn được chọn
    const player = this.createPlayer(userId, username, spiritRootType);

    return {
      success: true,
      player: player,
      spiritRoot: this.spiritRoots[spiritRootType]
    };
  }

  calculatePlayerStats(player) {
    const spiritRoot = this.spiritRoots[player.spiritRoot];
    if (!spiritRoot) return;

    const { basic_stats, growth_rates } = spiritRoot;

    // Tính tổng số tầng đã qua
    let totalTiers = 0;
    if (player.realm === 'luyen_khi') {
      totalTiers = player.realmLevel - 1; // Từ 0 đến 12
    } else if (player.realm === 'truc_co') {
      totalTiers = 13 + (player.realmLevel - 1); // 13 + (0,1,2)
    } else if (player.realm === 'ket_dan') {
      totalTiers = 16 + (player.realmLevel - 1); // 16 + (0,1,2)
    } else if (player.realm === 'nguyen_anh') {
      totalTiers = 19 + (player.realmLevel - 1); // 19 + (0,1,2)
    }

    // Tính bonus mốc tu vi
    let realmBonus = 0;
    if (player.realm === 'truc_co') {
      const realmInfo = this.realms[player.realm];
      if (player.realmLevel === 1) realmBonus = realmInfo.realmBonus.so_ky;
      else if (player.realmLevel === 2) realmBonus = realmInfo.realmBonus.trung_ky;
      else if (player.realmLevel === 3) realmBonus = realmInfo.realmBonus.hau_ky;
    } else if (player.realm === 'ket_dan') {
      const realmInfo = this.realms[player.realm];
      if (player.realmLevel === 1) realmBonus = realmInfo.realmBonus.so_ky;
      else if (player.realmLevel === 2) realmBonus = realmInfo.realmBonus.trung_ky;
      else if (player.realmLevel === 3) realmBonus = realmInfo.realmBonus.hau_ky;
    } else if (player.realm === 'nguyen_anh') {
      const realmInfo = this.realms[player.realm];
      if (player.realmLevel === 1) realmBonus = realmInfo.realmBonus.so_ky;
      else if (player.realmLevel === 2) realmBonus = realmInfo.realmBonus.trung_ky;
      else if (player.realmLevel === 3) realmBonus = realmInfo.realmBonus.hau_ky;
    }

    // Công thức: Stat = (Basic + Growth × Tiers) × (1 + Realm Bonus)
    const stats = {
      attack: Math.floor((basic_stats.attack + growth_rates.attack * totalTiers) * (1 + realmBonus)),
      defense: Math.floor((basic_stats.defense + growth_rates.defense * totalTiers) * (1 + realmBonus)),
      hp: Math.floor((basic_stats.hp + growth_rates.hp * totalTiers) * (1 + realmBonus)),
      maxHp: Math.floor((basic_stats.hp + growth_rates.hp * totalTiers) * (1 + realmBonus)),
      mp: Math.floor((basic_stats.mana + growth_rates.mana * totalTiers) * (1 + realmBonus)),
      maxMp: Math.floor((basic_stats.mana + growth_rates.mana * totalTiers) * (1 + realmBonus)),
      speed: Math.floor((basic_stats.speed + growth_rates.speed * totalTiers) * (1 + realmBonus)),
      critical: Math.floor((basic_stats.critical + growth_rates.critical * totalTiers) * (1 + realmBonus)),
      regen: Math.floor((basic_stats.regen + growth_rates.regen * totalTiers) * (1 + realmBonus)),
      evasion: Math.floor((basic_stats.evasion + growth_rates.evasion * totalTiers) * (1 + realmBonus)),
      reputation: Math.floor((basic_stats.reputation + growth_rates.reputation * totalTiers) * (1 + realmBonus)),
      karma: Math.floor((basic_stats.karma + growth_rates.karma * totalTiers) * (1 + realmBonus))
    };

    player.stats = stats;
    player.totalTiers = totalTiers;
  }

  getPlayer(userId) {
    return this.players.get(userId);
  }

  getOrCreatePlayer(userId, username) {
    let player = this.getPlayer(userId);
    if (!player) {
      player = this.createPlayer(userId, username);
    }
    return player;
  }

  hasStartedGame(userId) {
    const player = this.getPlayer(userId);
    return player && player.spiritRoot;
  }

  // Tạo embed thông báo chưa bắt đầu game
  createNotStartedEmbed() {
    const { EmbedBuilder } = require('discord.js');

    return new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('❌ Bạn chưa bắt đầu hành trình tu tiên!')
      .setDescription('Bạn cần chọn linh căn trước khi có thể sử dụng lệnh này.')
      .addFields({
        name: '💡 Hướng dẫn',
        value: 'Sử dụng `fstart` để bắt đầu và chọn linh căn cho mình!',
        inline: false
      });
  }

  // Lấy thông tin cảnh giới
  getRealmInfo(realmKey) {
    return this.realms[realmKey];
  }

  // Lấy tên cảnh giới hiển thị
  getRealmDisplayName(realmKey, realmLevel) {
    const realm = this.getRealmInfo(realmKey);
    if (!realm) return 'Không xác định';

    if (realmKey === 'luyen_khi') {
      return `${realm.emoji} ${realm.name} - ${realm.levels[realmLevel - 1]}`;
    } else {
      return `${realm.emoji} ${realm.name} - ${realm.levels[realmLevel - 1]}`;
    }
  }

  // Kiểm tra có thể đột phá không
  canBreakthrough(player) {
    const realm = this.getRealmInfo(player.realm);
    if (!realm) return false;

    return player.realmLevel < realm.maxLevel;
  }

  // Lấy cảnh giới tiếp theo
  getNextRealm(currentRealm) {
    const realmOrder = ['luyen_khi', 'truc_co', 'ket_dan', 'nguyen_anh'];
    const currentIndex = realmOrder.indexOf(currentRealm);

    if (currentIndex === -1 || currentIndex === realmOrder.length - 1) {
      return null; // Đã ở cảnh giới cao nhất
    }

    return realmOrder[currentIndex + 1];
  }

  updatePlayer(userId, updates) {
    const player = this.getPlayer(userId);
    if (!player) return false;

    // Hàm helper để update nested fields
    const updateNestedFields = (obj, updates) => {
      for (const [key, value] of Object.entries(updates)) {
        if (key.includes('.')) {
          // Nested field như 'cultivation.lastMeditate'
          const keys = key.split('.');
          let current = obj;

          // Navigate to the parent object
          for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
              current[keys[i]] = {};
            }
            current = current[keys[i]];
          }

          // Set the final value
          current[keys[keys.length - 1]] = value;
        } else {
          // Regular field
          obj[key] = value;
        }
      }
    };

    updateNestedFields(player, updates);
    player.lastActive = Date.now();

    this.savePlayers();
    return true;
  }

  addExperience(userId, exp) {
    const player = this.getPlayer(userId);
    if (!player) return false;

    player.experience += exp;

    // Tính toán lại stats dựa trên EXP mới
    this.calculatePlayerStats(player);

    // Khôi phục HP/MP nếu cần
    if (player.stats.hp < player.stats.maxHp) {
      player.stats.hp = Math.min(player.stats.hp + Math.floor(exp * 0.1), player.stats.maxHp);
    }
    if (player.stats.mp < player.stats.maxMp) {
      player.stats.mp = Math.min(player.stats.mp + Math.floor(exp * 0.1), player.stats.maxMp);
    }

    this.savePlayers();
    return true;
  }

  getSpiritRootInfo(spiritRootType) {
    return this.spiritRoots[spiritRootType];
  }

  // Lấy Linh khí và item cần thiết để đột phá cảnh giới
  getBreakthroughExpRequired(player) {
    const currentRealm = player.realm;
    const currentRealmLevel = player.realmLevel;
    
    // Bảng Linh khí cần thiết cho từng cảnh giới
    const breakthroughExpTable = {
      'luyen_khi': {
        1: 200, 2: 280, 3: 392, 4: 549, 5: 769, 6: 1077, 7: 1508,
        8: 2111, 9: 2955, 10: 4137, 11: 5792, 12: 8109, 13: 11353
      },
      'truc_co': {
        1: 18165, 2: 29064, 3: 46502
      },
      'ket_dan': {
        1: 83703, 2: 150667, 3: 271201
      },
      'nguyen_anh': {
        1: 542402, 2: 1084804, 3: 2169608
      }
    };

    // Bảng item cần thiết để đột phá
    const breakthroughItemsTable = {
      'luyen_khi': {
        1: { 'Linh Thạch Hạ Phẩm': 50, 'Thảo Dược Cơ Bản': 10 },
        2: { 'Linh Thạch Hạ Phẩm': 75, 'Thảo Dược Cơ Bản': 15 },
        3: { 'Linh Thạch Hạ Phẩm': 100, 'Thảo Dược Cơ Bản': 20 },
        4: { 'Linh Thạch Hạ Phẩm': 150, 'Thảo Dược Cơ Bản': 25 },
        5: { 'Linh Thạch Hạ Phẩm': 200, 'Thảo Dược Cơ Bản': 30 },
        6: { 'Linh Thạch Hạ Phẩm': 300, 'Thảo Dược Cơ Bản': 40 },
        7: { 'Linh Thạch Hạ Phẩm': 400, 'Thảo Dược Cơ Bản': 50 },
        8: { 'Linh Thạch Hạ Phẩm': 500, 'Thảo Dược Cơ Bản': 60 },
        9: { 'Linh Thạch Hạ Phẩm': 600, 'Thảo Dược Cơ Bản': 70 },
        10: { 'Linh Thạch Hạ Phẩm': 750, 'Thảo Dược Cơ Bản': 80 },
        11: { 'Linh Thạch Hạ Phẩm': 900, 'Thảo Dược Cơ Bản': 90 },
        12: { 'Linh Thạch Hạ Phẩm': 1100, 'Thảo Dược Cơ Bản': 100 },
        13: { 'Linh Thạch Trung Phẩm': 100, 'Thảo Dược Trung Cấp': 20, 'Đan Dược Đột Phá': 1 }
      },
      'truc_co': {
        1: { 'Linh Thạch Trung Phẩm': 200, 'Thảo Dược Trung Cấp': 30, 'Đan Dược Đột Phá': 2 },
        2: { 'Linh Thạch Trung Phẩm': 300, 'Thảo Dược Trung Cấp': 40, 'Đan Dược Đột Phá': 3 },
        3: { 'Linh Thạch Trung Phẩm': 500, 'Thảo Dược Trung Cấp': 50, 'Đan Dược Đột Phá': 5, 'Pháp Bảo Hộ Thân': 1 }
      },
      'ket_dan': {
        1: { 'Linh Thạch Thượng Phẩm': 1000, 'Thảo Dược Thượng Cấp': 100, 'Đan Dược Đột Phá': 10, 'Pháp Bảo Hộ Thân': 2 },
        2: { 'Linh Thạch Thượng Phẩm': 1500, 'Thảo Dược Thượng Cấp': 150, 'Đan Dược Đột Phá': 15, 'Pháp Bảo Hộ Thân': 3 },
        3: { 'Linh Thạch Thượng Phẩm': 2500, 'Thảo Dược Thượng Cấp': 200, 'Đan Dược Đột Phá': 25, 'Pháp Bảo Hộ Thân': 5, 'Linh Khí Tinh Hoa': 1 }
      },
      'nguyen_anh': {
        1: { 'Linh Thạch Cực Phẩm': 5000, 'Thảo Dược Cực Cấp': 500, 'Đan Dược Đột Phá': 50, 'Pháp Bảo Hộ Thân': 10, 'Linh Khí Tinh Hoa': 3 },
        2: { 'Linh Thạch Cực Phẩm': 7500, 'Thảo Dược Cực Cấp': 750, 'Đan Dược Đột Phá': 75, 'Pháp Bảo Hộ Thân': 15, 'Linh Khí Tinh Hoa': 5 },
        3: { 'Linh Thạch Cực Phẩm': 10000, 'Thảo Dược Cực Cấp': 1000, 'Đan Dược Đột Phá': 100, 'Pháp Bảo Hộ Thân': 20, 'Linh Khí Tinh Hoa': 10, 'Thiên Đạo Chứng Minh': 1 }
      }
    };

    // Kiểm tra xem có thể đột phá không
    if (currentRealm === 'luyen_khi' && currentRealmLevel >= 13) {
      // Đã đạt tầng cuối Luyện Khí, cần đột phá lên Trúc Cơ
      const requiredItems = breakthroughItemsTable['truc_co'][1];
      return {
        canBreakthrough: true,
        nextRealm: 'truc_co',
        nextRealmLevel: 1,
        linhKhiRequired: 18165,
        linhKhiNeeded: Math.max(0, 18165 - player.experience),
        currentLinhKhi: player.experience,
        progress: Math.min(100, (player.experience / 18165) * 100),
        requiredItems: requiredItems
      };
    } else if (currentRealm === 'truc_co' && currentRealmLevel >= 3) {
      // Đã đạt tầng cuối Trúc Cơ, cần đột phá lên Kết Đan
      const requiredItems = breakthroughItemsTable['ket_dan'][1];
      return {
        canBreakthrough: true,
        nextRealm: 'ket_dan',
        nextRealmLevel: 1,
        linhKhiRequired: 83703,
        linhKhiNeeded: Math.max(0, 83703 - player.experience),
        currentLinhKhi: player.experience,
        progress: Math.min(100, (player.experience / 83703) * 100),
        requiredItems: requiredItems
      };
    } else if (currentRealm === 'ket_dan' && currentRealmLevel >= 3) {
      // Đã đạt tầng cuối Kết Đan, cần đột phá lên Nguyên Anh
      const requiredItems = breakthroughItemsTable['nguyen_anh'][1];
      return {
        canBreakthrough: true,
        nextRealm: 'nguyen_anh',
        nextRealmLevel: 1,
        linhKhiRequired: 542402,
        linhKhiNeeded: Math.max(0, 542402 - player.experience),
        currentLinhKhi: player.experience,
        progress: Math.min(100, (player.experience / 542402) * 100),
        requiredItems: requiredItems
      };
    } else if (currentRealm === 'nguyen_anh' && currentRealmLevel >= 3) {
      // Đã đạt tầng cuối Nguyên Anh
      return {
        canBreakthrough: false,
        reason: 'Đã đạt cảnh giới tối đa',
        currentLinhKhi: player.experience,
        progress: 100
      };
    } else {
      // Có thể đột phá trong cùng cảnh giới
      const currentExpTable = breakthroughExpTable[currentRealm];
      if (currentExpTable && currentExpTable[currentRealmLevel + 1]) {
        const linhKhiRequired = currentExpTable[currentRealmLevel + 1];
        const requiredItems = breakthroughItemsTable[currentRealm][currentRealmLevel + 1];
        return {
          canBreakthrough: true,
          nextRealm: currentRealm,
          nextRealmLevel: currentRealmLevel + 1,
          linhKhiRequired: linhKhiRequired,
          linhKhiNeeded: Math.max(0, linhKhiRequired - player.experience),
          currentLinhKhi: player.experience,
          progress: Math.min(100, (player.experience / linhKhiRequired) * 100),
          requiredItems: requiredItems
        };
      }
    }

    return {
      canBreakthrough: false,
      reason: 'Không thể xác định yêu cầu đột phá',
      currentLinhKhi: player.experience
    };
  }

  getAllSpiritRoots() {
    return this.spiritRoots;
  }

  getPlayerStats(userId) {
    const player = this.getPlayer(userId);
    if (!player) return null;

    const spiritRoot = this.getSpiritRootInfo(player.spiritRoot);

    return {
      ...player,
      spiritRootInfo: spiritRoot
    };
  }

  // Hàm tiện ích để format thông tin player
  formatPlayerInfo(player) {
    const spiritRoot = this.getSpiritRootInfo(player.spiritRoot);
    const realmDisplayName = this.getRealmDisplayName(player.realm, player.realmLevel);

    return {
      username: player.username,
      realm: realmDisplayName,
      realmLevel: player.realmLevel,
      spiritRoot: spiritRoot ? `${spiritRoot.emoji} ${spiritRoot.name}` : 'Không xác định',
      experience: player.experience,
      stats: player.stats
    };
  }

  // Kiểm tra vật phẩm cần thiết cho đột phá
  checkBreakthroughItems(player, requiredItems) {
    if (!requiredItems) return null;

    const itemStatus = {};
    let allItemsReady = true;

    for (const [itemName, requiredQuantity] of Object.entries(requiredItems)) {
      // Lấy số lượng hiện tại từ inventory (mặc định 0 nếu chưa có)
      const currentQuantity = this.getItemQuantity(player, itemName);
      const hasEnough = currentQuantity >= requiredQuantity;
      
      itemStatus[itemName] = {
        required: requiredQuantity,
        current: currentQuantity,
        hasEnough: hasEnough,
        status: hasEnough ? '✅' : '❌'
      };

      if (!hasEnough) {
        allItemsReady = false;
      }
    }

    return {
      items: itemStatus,
      allReady: allItemsReady
    };
  }

  // Lấy số lượng vật phẩm từ inventory
  getItemQuantity(player, itemName) {
    // Kiểm tra inventory của player
    if (!player.inventory || !player.inventory.items) {
      return 0;
    }

    // Tìm vật phẩm trong inventory
    const item = player.inventory.items.find(item => item.name === itemName);
    return item ? item.quantity : 0;
  }

  // Thêm vật phẩm vào inventory
  addItemToInventory(player, itemName, quantity = 1) {
    if (!player.inventory || !player.inventory.items) {
      player.inventory = { items: [], spiritStones: 100, weapons: [], armors: [] };
    }

    const existingItem = player.inventory.items.find(item => item.name === itemName);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      player.inventory.items.push({
        name: itemName,
        quantity: quantity,
        type: this.getItemType(itemName)
      });
    }

    this.savePlayers();
    return true;
  }

  // Xóa vật phẩm khỏi inventory (khi đột phá)
  removeItemFromInventory(player, itemName, quantity = 1) {
    if (!player.inventory || !player.inventory.items) {
      return false;
    }

    const existingItem = player.inventory.items.find(item => item.name === itemName);
    
    if (!existingItem || existingItem.quantity < quantity) {
      return false;
    }

    existingItem.quantity -= quantity;
    
    // Xóa item nếu số lượng = 0
    if (existingItem.quantity <= 0) {
      const index = player.inventory.items.findIndex(item => item.name === itemName);
      if (index > -1) {
        player.inventory.items.splice(index, 1);
      }
    }

    this.savePlayers();
    return true;
  }

  // Xác định loại vật phẩm
  getItemType(itemName) {
    if (itemName.includes('Linh Thạch')) return 'material';
    if (itemName.includes('Thảo Dược')) return 'herb';
    if (itemName.includes('Đan Dược')) return 'potion';
    if (itemName.includes('Pháp Bảo')) return 'artifact';
    if (itemName.includes('Linh Khí Tinh Hoa')) return 'essence';
    if (itemName.includes('Thiên Đạo Chứng Minh')) return 'legendary';
    return 'misc';
  }
}

module.exports = new PlayerManager(); 