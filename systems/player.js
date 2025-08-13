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
      level: 1,
      experience: 0,
      experienceToNext: 100,
      realm: 'luyen_khi',
      realmLevel: 1,
      totalTiers: 0, // Tổng số tầng đã qua
      inventory: {
        spiritStones: 100,
        items: [],
        weapons: [],
        armors: []
      },
      cultivation: {
        lastCultivate: 0,
        cultivateCooldown: 300000, // 5 phút
        breakthroughAttempts: 0,
        lastBreakthrough: 0
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

    Object.assign(player, updates);
    player.lastActive = Date.now();

    this.savePlayers();
    return true;
  }

  addExperience(userId, exp) {
    const player = this.getPlayer(userId);
    if (!player) return false;

    player.experience += exp;

    // Kiểm tra level up
    while (player.experience >= player.experienceToNext) {
      player.experience -= player.experienceToNext;
      player.level += 1;
      player.experienceToNext = Math.floor(player.experienceToNext * 1.5);

      // Tính toán lại stats dựa trên level mới
      this.calculatePlayerStats(player);

      // Khôi phục HP/MP
      player.stats.hp = player.stats.maxHp;
      player.stats.mp = player.stats.maxMp;
    }

    this.savePlayers();
    return true;
  }

  getSpiritRootInfo(spiritRootType) {
    return this.spiritRoots[spiritRootType];
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
      level: player.level,
      realm: realmDisplayName,
      realmLevel: player.realmLevel,
      spiritRoot: spiritRoot ? `${spiritRoot.emoji} ${spiritRoot.name}` : 'Không xác định',
      experience: `${player.experience}/${player.experienceToNext}`,
      stats: player.stats
    };
  }
}

module.exports = new PlayerManager(); 