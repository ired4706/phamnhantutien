const fs = require('fs');
const path = require('path');
const itemLoader = require('../utils/data/item-loader.js');
const StatsCalculator = require('../utils/game/stats-calculator');

class PlayerManager {
  constructor() {
    this.players = new Map();
    this.dataPath = path.join(__dirname, '../../data/core/players.json');
    this.spiritRootsPath = path.join(__dirname, '../../data/core/spirit-roots.json');
    this.realmsPath = path.join(__dirname, '../../data/core/realms.json');
    this.loadPlayers();
    this.loadSpiritRoots();
    this.loadRealms();

    // Fix any existing spiritStones data issues
    this.fixAllSpiritStones();
  }

  loadSpiritRoots() {
    try {
      const data = fs.readFileSync(this.spiritRootsPath, 'utf8');
      const parsedData = JSON.parse(data);
      // Handle both old format (with spirit_roots wrapper) and new format (direct object)
      this.spiritRoots = parsedData.spirit_roots || parsedData;
    } catch (error) {
      console.error('Error loading spirit roots:', error);
      this.spiritRoots = {};
    }
  }

  loadRealms() {
    try {
      const data = fs.readFileSync(this.realmsPath, 'utf8');
      const parsedData = JSON.parse(data);
      // Handle both old format (with realms wrapper) and new format (direct object)
      this.realms = parsedData.realms || parsedData;
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
          // Migrate old spiritStones format
          if (playerData.inventory && playerData.inventory.spiritStones) {
            playerData.inventory.spiritStones = this.migrateSpiritStones(playerData.inventory.spiritStones);
          }

          this.players.set(userId, playerData);
        }
        console.log(`✅ Loaded ${this.players.size} players`);
      }
    } catch (error) {
      console.error('Error loading players:', error);
    }
  }

  // Migrate old spiritStones format to new format
  migrateSpiritStones(oldSpiritStones) {
    // If already in new format, return as is
    if (typeof oldSpiritStones === 'object' && oldSpiritStones.ha_pham !== undefined) {
      return oldSpiritStones;
    }

    // If it's a string like "[object Object]903", extract the number
    if (typeof oldSpiritStones === 'string') {
      const match = oldSpiritStones.match(/(\d+)$/);
      if (match) {
        const amount = parseInt(match[1]);
        return {
          ha_pham: amount,
          trung_pham: 0,
          thuong_pham: 0,
          cuc_pham: 0
        };
      }
    }

    // If it's a number, convert to new format
    if (typeof oldSpiritStones === 'number') {
      return {
        ha_pham: oldSpiritStones,
        trung_pham: 0,
        thuong_pham: 0,
        cuc_pham: 0
      };
    }

    // Default fallback
    return {
      ha_pham: 100,
      trung_pham: 0,
      thuong_pham: 0,
      cuc_pham: 0
    };
  }

  // Fix all existing players' spiritStones data
  fixAllSpiritStones() {
    console.log('🔧 Fixing spiritStones data for all players...');
    let fixedCount = 0;

    for (const [userId, player] of this.players.entries()) {
      if (player.inventory && player.inventory.spiritStones) {
        const oldFormat = player.inventory.spiritStones;
        const newFormat = this.migrateSpiritStones(oldFormat);

        if (JSON.stringify(oldFormat) !== JSON.stringify(newFormat)) {
          player.inventory.spiritStones = newFormat;
          fixedCount++;
          console.log(`✅ Fixed player ${player.username}: ${JSON.stringify(oldFormat)} → ${JSON.stringify(newFormat)}`);
        }
      }
    }

    if (fixedCount > 0) {
      this.savePlayers();
      console.log(`🎉 Fixed ${fixedCount} players' spiritStones data`);
    } else {
      console.log('✅ No players need fixing');
    }

    return fixedCount;
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

  async createPlayer(userId, username, chosenSpiritRoot = null) {
    if (this.players.has(userId)) {
      return this.players.get(userId);
    }

    // Sử dụng linh căn được chọn hoặc random nếu không có
    let spiritRoot;
    if (chosenSpiritRoot && this.getSpiritRootInfo(chosenSpiritRoot)) {
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
        spiritStones: {
          ha_pham: 100,
          trung_pham: 0,
          thuong_pham: 0,
          cuc_pham: 0
        },
        items: [
          // Khởi tạo với một số vật phẩm cơ bản
          { id: 'ngu_nien_sam', quantity: 3 },
          { id: 'thanh_diep_thao', quantity: 3 },
          { id: 'tieu_long_lan_qua', quantity: 3 }
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
      skills: {},
      // Hệ thống luyện đan
      alchemy: {
        furnaceLevel: 1, // Level lò luyện (mặc định 1)
        totalCrafted: 0, // Tổng số đan dược đã luyện
        successCount: 0, // Số lần luyện thành công
        failureCount: 0, // Số lần luyện thất bại
        lastAlchemy: 0 // Thời gian luyện đan cuối cùng
      },
      // Hệ thống rèn vũ khí
      forge: {
        forgeLevel: 1, // Level lò rèn (mặc định 1)
        totalCrafted: 0, // Tổng số vũ khí đã chế tạo
        successCount: 0, // Số lần chế tạo thành công
        failureCount: 0, // Số lần chế tạo thất bại
        lastForge: 0 // Thời gian chế tạo vũ khí cuối cùng
      },
      achievements: [],
      joinDate: Date.now(),
      lastActive: Date.now()
    };

    // Tính toán stats dựa trên công thức mới
    await this.calculatePlayerStats(player);

    this.players.set(userId, player);
    this.savePlayers();

    const spiritRootInfo = this.getSpiritRootInfo(spiritRoot);
    console.log(`🌿 Created new player: ${username} with ${spiritRootInfo.name}`);
    return player;
  }

  async chooseSpiritRoot(userId, username, spiritRootType) {
    // Kiểm tra linh căn hợp lệ
    if (!this.getSpiritRootInfo(spiritRootType)) {
      return { success: false, message: 'Linh căn không hợp lệ!' };
    }

    // Kiểm tra user đã có linh căn chưa
    const existingPlayer = this.getPlayer(userId);
    if (existingPlayer && existingPlayer.spiritRoot) {
      return { success: false, message: 'Bạn đã có linh căn rồi!' };
    }

    // Tạo player mới với linh căn được chọn
    const player = await this.createPlayer(userId, username, spiritRootType);

    return {
      success: true,
      player: player,
      spiritRoot: this.getSpiritRootInfo(spiritRootType)
    };
  }

  async calculatePlayerStats(player) {
    const spiritRoot = this.getSpiritRootInfo(player.spiritRoot);
    if (!spiritRoot) return;

    const { basic_stats, growth_rates } = spiritRoot;

    // Tính số tầng luyện khí đã qua (1-13)
    let luyenKhiTiers = 0;
    if (player.realm === 'luyen_khi') {
      luyenKhiTiers = player.realmLevel; // 1-13
    } else if (player.realm === 'truc_co') {
      luyenKhiTiers = 13; // Đã hoàn thành 13 tầng luyện khí
    } else if (player.realm === 'ket_dan') {
      luyenKhiTiers = 13; // Đã hoàn thành 13 tầng luyện khí
    } else if (player.realm === 'nguyen_anh') {
      luyenKhiTiers = 13; // Đã hoàn thành 13 tầng luyện khí
    }

    // Tính Stage multiplier
    let stageMultiplier = 1;
    if (player.realm === 'luyen_khi') {
      stageMultiplier = 1;
    } else if (player.realm === 'truc_co') {
      stageMultiplier = 5;
    } else if (player.realm === 'ket_dan') {
      stageMultiplier = 25;
    } else if (player.realm === 'nguyen_anh') {
      stageMultiplier = 125;
    }

    // Tính Tier multiplier
    let tierMultiplier = 1;
    if (player.realm === 'luyen_khi') {
      tierMultiplier = 1; // Luyện khí luôn là 1
    } else if (player.realm === 'truc_co') {
      if (player.realmLevel === 1) tierMultiplier = 1.0; // Sơ Kỳ
      else if (player.realmLevel === 2) tierMultiplier = 1.5; // Trung Kỳ
      else if (player.realmLevel === 3) tierMultiplier = 2.0; // Hậu Kỳ
    } else if (player.realm === 'ket_dan') {
      if (player.realmLevel === 1) tierMultiplier = 1.0; // Sơ Kỳ
      else if (player.realmLevel === 2) tierMultiplier = 1.5; // Trung Kỳ
      else if (player.realmLevel === 3) tierMultiplier = 2.0; // Hậu Kỳ
    } else if (player.realm === 'nguyen_anh') {
      if (player.realmLevel === 1) tierMultiplier = 1.0; // Sơ Kỳ
      else if (player.realmLevel === 2) tierMultiplier = 1.5; // Trung Kỳ
      else if (player.realmLevel === 3) tierMultiplier = 2.0; // Hậu Kỳ
    }

    // Sử dụng StatsCalculator để tính chỉ số cơ bản
    const baseStats = await StatsCalculator.calculateBaseStats(player.spiritRoot, player.realm, player.realmLevel);
    if (!baseStats) return;

    const rawAttack = baseStats.attack;
    const rawDefense = baseStats.defense;
    const rawHp = baseStats.hp;
    const rawMp = baseStats.mp;
    const rawSpeed = baseStats.speed;
    const rawRegen = baseStats.regen;
    // reputation và karma không còn phụ thuộc vào basic/growth; giữ nguyên hiện trạng hoặc mặc định 0
    const existingReputation = (player.stats && typeof player.stats.reputation === 'number') ? player.stats.reputation : 0;
    const existingKarma = (player.stats && typeof player.stats.karma === 'number') ? player.stats.karma : 0;

    // Áp dụng Affinities cho CRIT và EVA với công thức: Final% = (Raw × Affinity) / ((Raw × Affinity) + K)
    const K = 20;
    const critAffinityByRoot = { hoa: 1.6, thuy: 1.3, moc: 1.15, kim: 1.0, tho: 0.8 };
    const evaAffinityByRoot = { thuy: 1.65, hoa: 1.3, moc: 1.15, kim: 0.9, tho: 0.9 };

    const rawCritical = (basic_stats.critical + growth_rates.critical * luyenKhiTiers) * (stageMultiplier * tierMultiplier);
    const rawEvasion = (basic_stats.evasion + growth_rates.evasion * luyenKhiTiers) * (stageMultiplier * tierMultiplier);

    const critAffinity = critAffinityByRoot[player.spiritRoot] || 1.0;
    const evaAffinity = evaAffinityByRoot[player.spiritRoot] || 1.0;

    const critAdj = rawCritical * critAffinity;
    const evaAdj = rawEvasion * evaAffinity;

    // Chuyển đổi AdjRating về đơn vị phần trăm thô trước khi áp dụng hằng số K
    const critAdjPercent = critAdj / 100;
    const evaAdjPercent = evaAdj / 100;

    // Lưu dưới dạng phần trăm (0-100), để đồng bộ hiển thị hiện tại `${value}%`
    const finalCriticalPercent = (critAdjPercent / (critAdjPercent + K)) * 100;
    const finalEvasionPercent = (evaAdjPercent / (evaAdjPercent + K)) * 100;

    const round1 = (v) => Math.round(v * 10) / 10;
    const stats = {
      attack: round1(rawAttack),
      defense: round1(rawDefense),
      hp: round1(rawHp),
      maxHp: round1(rawHp),
      mp: round1(rawMp),
      maxMp: round1(rawMp),
      speed: round1(rawSpeed),
      critical: round1(finalCriticalPercent),
      regen: round1(rawRegen),
      evasion: round1(finalEvasionPercent),
      reputation: round1(existingReputation),
      karma: round1(existingKarma)
    };

    player.stats = stats;
    player.luyenKhiTiers = luyenKhiTiers;
    player.stageMultiplier = stageMultiplier;
    player.tierMultiplier = tierMultiplier;
  }

  getPlayer(userId) {
    return this.players.get(userId);
  }

  async getOrCreatePlayer(userId, username) {
    let player = this.getPlayer(userId);
    if (!player) {
      player = await this.createPlayer(userId, username);
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
    // Kiểm tra an toàn
    if (!realmKey || !this.realms || !this.realms[realmKey]) {
      // Fallback về Luyện Khí nếu không tìm thấy
      console.warn(`⚠️ Realm "${realmKey}" not found, falling back to "luyen_khi"`);
      return this.realms?.luyen_khi || {
        name: "Luyện Khí Kỳ",
        emoji: "💨",
        description: "Cảnh giới đầu tiên của tu tiên, luyện khí trong cơ thể",
        levels: ["Tầng 1", "Tầng 2", "Tầng 3", "Tầng 4", "Tầng 5", "Tầng 6", "Tầng 7", "Tầng 8", "Tầng 9", "Tầng 10", "Tầng 11", "Tầng 12", "Tầng 13"],
        maxLevel: 13,
        experienceMultiplier: 1.0
      };
    }
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

  async addExperience(userId, exp) {
    const player = this.getPlayer(userId);
    if (!player) return false;

    player.experience += exp;

    // Tính toán lại stats dựa trên EXP mới
    await this.calculatePlayerStats(player);

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
    // Kiểm tra an toàn
    if (!spiritRootType || !this.spiritRoots || !this.spiritRoots[spiritRootType]) {
      // Fallback về Kim Linh Căn nếu không tìm thấy
      console.warn(`⚠️ Spirit root type "${spiritRootType}" not found, falling back to "kim"`);
      return this.spiritRoots?.kim || {
        name: "Kim Linh Căn",
        emoji: "⚔️",
        description: "Linh căn kim thuộc tính mặc định",
        basic_stats: { attack: 12, defense: 15, hp: 120, mana: 50, speed: 8, critical: 5, regen: 2, evasion: 3, reputation: 0, karma: 0 },
        growth_rates: { attack: 1.8, defense: 2.0, hp: 15, mana: 5, speed: 0.2, critical: 0.3, regen: 0.1, evasion: 0.1, reputation: 0, karma: 0 },
        special_abilities: ["Kim Kiếm Vô Song", "Thép Thân Bất Hoại", "Phong Lôi Kiếm Pháp"],
        weakness: "hỏa",
        strength: "mộc"
      };
    }
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

    // Kiểm tra xem có thể đột phá không
    if (currentRealm === 'luyen_khi' && currentRealmLevel >= 13) {
      // Đã đạt tầng cuối Luyện Khí, cần đột phá lên Trúc Cơ
      const realmInfo = this.getRealmInfo('luyen_khi');
      const requiredItems = realmInfo.breakthroughRequirements['truc_co_so_ky'];
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
      const realmInfo = this.getRealmInfo('truc_co');
      const requiredItems = realmInfo.breakthroughRequirements['ket_dan_so_ky'];
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
      const realmInfo = this.getRealmInfo('ket_dan');
      const requiredItems = realmInfo.breakthroughRequirements['nguyen_anh_so_ky'];
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
        reason: 'Bạn đã đạt đến cảnh giới tối đa!',
        currentLinhKhi: player.experience
      };
    } else {
      // Đột phá trong cùng cảnh giới
      const nextLevel = currentRealmLevel + 1;
      const requiredExp = breakthroughExpTable[currentRealm][nextLevel];

      if (!requiredExp) {
        return {
          canBreakthrough: false,
          reason: 'Không thể xác định yêu cầu đột phá!',
          currentLinhKhi: player.experience
        };
      }

      // Lấy items cần thiết từ realms.json
      const realmInfo = this.getRealmInfo(currentRealm);
      let requiredItems = null;

      if (currentRealm === 'luyen_khi') {
        requiredItems = realmInfo.breakthroughRequirements[`tier_${nextLevel}`];
      } else if (currentRealm === 'truc_co') {
        const levelNames = ['so_ky', 'trung_ky', 'hau_ky'];
        requiredItems = realmInfo.breakthroughRequirements[levelNames[nextLevel - 1]];
      } else if (currentRealm === 'ket_dan') {
        const levelNames = ['so_ky', 'trung_ky', 'hau_ky'];
        requiredItems = realmInfo.breakthroughRequirements[levelNames[nextLevel - 1]];
      } else if (currentRealm === 'nguyen_anh') {
        const levelNames = ['so_ky', 'trung_ky', 'hau_ky'];
        requiredItems = realmInfo.breakthroughRequirements[levelNames[nextLevel - 1]];
      }

      return {
        canBreakthrough: true,
        nextRealm: currentRealm,
        nextRealmLevel: nextLevel,
        linhKhiRequired: requiredExp,
        linhKhiNeeded: Math.max(0, requiredExp - player.experience),
        currentLinhKhi: player.experience,
        progress: Math.min(100, (player.experience / requiredExp) * 100),
        requiredItems: requiredItems
      };
    }
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
  async checkBreakthroughItems(player, requiredItems) {
    const itemStatus = {};
    let allItemsReady = true;

    for (const [itemId, requiredQuantity] of Object.entries(requiredItems)) {
      // Lấy số lượng hiện tại từ inventory (mặc định 0 nếu chưa có)
      const currentQuantity = this.getItemQuantity(player, itemId);
      const hasEnough = currentQuantity >= requiredQuantity;

      itemStatus[itemId] = {
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
  getItemQuantity(player, itemId) {
    // Kiểm tra inventory của player
    if (!player.inventory || !player.inventory.items) {
      return 0;
    }

    // Tìm vật phẩm trong inventory
    const item = player.inventory.items.find(item => item.id === itemId);
    return item ? item.quantity : 0;
  }

  // Thêm vật phẩm vào inventory
  addItemToInventory(player, itemId, quantity = 1) {
    if (!player.inventory || !player.inventory.items) {
      player.inventory = { items: [], spiritStones: { ha_pham: 100 }, weapons: [], armors: [] };
    }

    const existingItem = player.inventory.items.find(item => item.id === itemId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      player.inventory.items.push({
        id: itemId,
        quantity: quantity
      });
    }

    this.savePlayers();
    return true;
  }

  // Xóa vật phẩm khỏi inventory (khi đột phá)
  removeItemFromInventory(player, itemId, quantity = 1) {
    if (!player.inventory || !player.inventory.items) {
      return false;
    }

    const existingItem = player.inventory.items.find(item => item.id === itemId);

    if (!existingItem || existingItem.quantity < quantity) {
      existingItem.quantity -= quantity;

      // Xóa item nếu số lượng = 0
      if (existingItem.quantity <= 0) {
        const index = player.inventory.items.findIndex(item => item.id === itemId);
        if (index > -1) {
          player.inventory.items.splice(index, 1);
        }
      }
    }

    this.savePlayers();
    return true;
  }

  // Thêm linh thạch vào inventory
  addSpiritStones(player, type, quantity = 1) {
    if (!player.inventory) {
      player.inventory = { items: [], spiritStones: { ha_pham: 0, trung_pham: 0, thuong_pham: 0, cuc_pham: 0 }, weapons: [], armors: [] };
    }

    if (!player.inventory.spiritStones) {
      player.inventory.spiritStones = { ha_pham: 0, trung_pham: 0, thuong_pham: 0, cuc_pham: 0 };
    }

    // Ensure spiritStones is in correct format
    if (typeof player.inventory.spiritStones === 'object' && player.inventory.spiritStones.ha_pham !== undefined) {
      if (player.inventory.spiritStones[type] !== undefined) {
        player.inventory.spiritStones[type] += quantity;
      }
    } else {
      // Fallback: convert to new format
      player.inventory.spiritStones = this.migrateSpiritStones(player.inventory.spiritStones);
      if (player.inventory.spiritStones[type] !== undefined) {
        player.inventory.spiritStones[type] += quantity;
      }
    }

    this.savePlayers();
    return true;
  }

  // Lấy số lượng linh thạch theo loại
  getSpiritStoneQuantity(player, type) {
    if (!player.inventory || !player.inventory.spiritStones) {
      return 0;
    }

    // Ensure spiritStones is in correct format
    if (typeof player.inventory.spiritStones === 'object' && player.inventory.spiritStones.ha_pham !== undefined) {
      return player.inventory.spiritStones[type] || 0;
    } else {
      // Fallback: convert to new format
      player.inventory.spiritStones = this.migrateSpiritStones(player.inventory.spiritStones);
      return player.inventory.spiritStones[type] || 0;
    }
  }

  // Sử dụng itemLoader để quản lý items
  async getItemInfo(itemId) {
    await itemLoader.loadAllItems();
    return itemLoader.getItemInfo(itemId);
  }

  async getItemName(itemId) {
    await itemLoader.loadAllItems();
    return itemLoader.getItemName(itemId);
  }

  async getItemEmoji(itemId) {
    await itemLoader.loadAllItems();
    return itemLoader.getItemEmoji(itemId);
  }

  async getItemType(itemId) {
    await itemLoader.loadAllItems();
    return itemLoader.getItemType(itemId);
  }

  // Lấy thông tin độ hiếm của item
  async getItemRarity(itemId) {
    await itemLoader.loadAllItems();
    return itemLoader.getItemRarity(itemId);
  }

  // Lấy màu sắc theo độ hiếm
  async getRarityColor(rarity) {
    await itemLoader.loadAllItems();
    const rarityInfo = itemLoader.rarityLevels[rarity];
    return rarityInfo ? rarityInfo.color : '#808080';
  }

  // Lấy emoji theo độ hiếm
  async getRarityEmoji(rarity) {
    await itemLoader.loadAllItems();
    const rarityInfo = itemLoader.rarityLevels[rarity];
    return rarityInfo ? rarityInfo.emoji : '❓';
  }

  // Lấy tên độ hiếm
  async getRarityName(rarity) {
    await itemLoader.loadAllItems();
    const rarityInfo = itemLoader.rarityLevels[rarity];
    return rarityInfo ? rarityInfo.name : 'Không xác định';
  }

  // ===== SKILL MANAGEMENT FUNCTIONS =====

  // Kiểm tra xem player có thể học skill không
  canLearnSkill(player, skillId) {
    const fs = require('fs');
    const path = require('path');

    try {
      const skillsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/core/skills.json'), 'utf8'));

      // Tìm skill trong tất cả các realm
      let skill = null;
      for (const spiritRoot of ['kim', 'hoa', 'tho', 'thuy', 'moc']) {
        for (const realm of ['luyen_khi', 'truc_co', 'ket_dan', 'nguyen_anh']) {
          const realmSkills = skillsData[`${spiritRoot}_skills`][realm];
          const foundSkill = realmSkills.find(s => s.id === skillId);
          if (foundSkill) {
            skill = foundSkill;
            break;
          }
        }
        if (skill) break;
      }

      if (!skill) return false;

      // Kiểm tra requirements
      if (skill.required_realm !== player.realm) return false;
      if (skill.required_level > player.realmLevel) return false;
      if (skill.required_spirit_root !== player.spiritRoot) return false;

      return true;
    } catch (error) {
      console.error('Error checking skill requirements:', error);
      return false;
    }
  }

  // Học skill mới
  learnSkill(player, skillId) {
    if (!player.skills) {
      player.skills = {};
    }

    if (player.skills[skillId]) {
      return { success: false, message: 'Bạn đã học kỹ năng này rồi!' };
    }

    if (!this.canLearnSkill(player, skillId)) {
      return { success: false, message: 'Bạn chưa đủ điều kiện để học kỹ năng này!' };
    }

    player.skills[skillId] = {
      learned_at: new Date().toISOString()
    };

    this.savePlayers();
    return { success: true, message: 'Học kỹ năng thành công!' };
  }


  // Lấy danh sách skill đã học
  getLearnedSkills(player) {
    if (!player.skills) return [];

    const fs = require('fs');
    const path = require('path');

    try {
      const skillsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/core/skills.json'), 'utf8'));
      const learnedSkills = [];

      Object.keys(player.skills).forEach(skillId => {
        // Tìm skill trong data
        let skill = null;
        for (const spiritRoot of ['kim', 'hoa', 'tho', 'thuy', 'moc']) {
          for (const realm of ['luyen_khi', 'truc_co', 'ket_dan', 'nguyen_anh']) {
            const realmSkills = skillsData[`${spiritRoot}_skills`][realm];
            const foundSkill = realmSkills.find(s => s.id === skillId);
            if (foundSkill) {
              skill = foundSkill;
              break;
            }
          }
          if (skill) break;
        }

        if (skill) {
          learnedSkills.push({
            ...skill,
            playerSkill: player.skills[skillId]
          });
        }
      });

      return learnedSkills;
    } catch (error) {
      console.error('Error getting learned skills:', error);
      return [];
    }
  }

  // Lấy skill info theo ID
  getSkillInfo(skillId) {
    const fs = require('fs');
    const path = require('path');

    try {
      const skillsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/core/skills.json'), 'utf8'));

      for (const spiritRoot of ['kim', 'hoa', 'tho', 'thuy', 'moc']) {
        for (const realm of ['luyen_khi', 'truc_co', 'ket_dan', 'nguyen_anh']) {
          const realmSkills = skillsData[`${spiritRoot}_skills`][realm];
          const skill = realmSkills.find(s => s.id === skillId);
          if (skill) return skill;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting skill info:', error);
      return null;
    }
  }
}

module.exports = new PlayerManager(); 