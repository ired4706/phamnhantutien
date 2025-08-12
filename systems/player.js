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
      stats: {
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        attack: 10,
        defense: 5,
        speed: 8,
        magic: 6
      },
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

    // Áp dụng bonus từ linh căn
    this.applySpiritRootBonus(player);

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

  applySpiritRootBonus(player) {
    const spiritRoot = this.spiritRoots[player.spiritRoot];
    if (!spiritRoot) return;

    const { attack_bonus, defense_bonus, speed_bonus, magic_bonus } = spiritRoot.attributes;

    player.stats.attack = Math.floor(player.stats.attack * attack_bonus);
    player.stats.defense = Math.floor(player.stats.defense * defense_bonus);
    player.stats.speed = Math.floor(player.stats.speed * speed_bonus);
    player.stats.magic = Math.floor(player.stats.magic * magic_bonus);
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

      // Tăng stats khi level up
      player.stats.maxHp += 20;
      player.stats.maxMp += 10;
      player.stats.attack += 2;
      player.stats.defense += 1;
      player.stats.speed += 1;
      player.stats.magic += 1;

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