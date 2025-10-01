const BaseService = require('./BaseService');
const FileManager = require('../utils/data/file-manager');
const RetryHandler = require('../utils/core/retry-handler');
const CacheManager = require('../utils/data/cache-manager');
const CONSTANTS = require('../../config/constants');
const path = require('path');
const fs = require('fs');

class PlayerService extends BaseService {
  constructor(spiritRootService) {
    super();
    this.cache = new CacheManager();
    this.spiritRootService = spiritRootService;
    this.players = new Map();
    this.realms = null;
    this.dataPath = path.join(__dirname, '../../data/core/players.json');
    this.loadingPromise = Promise.all([
      this.loadPlayers(),
      this.loadRealms()
    ]);
  }

  async loadPlayers() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = await FileManager.readJson(this.dataPath);

        for (const [userId, playerData] of Object.entries(data)) {
          // Migrate old spiritStones format if needed
          if (playerData.inventory && playerData.inventory.spiritStones) {
            playerData.inventory.spiritStones = this.migrateSpiritStones(playerData.inventory.spiritStones);
          }
          this.players.set(userId, playerData);
        }
        this.info('Players loaded', { count: this.players.size });
      }
    } catch (error) {
      this.handleError(error, 'PlayerService.loadPlayers');
    }
  }

  async loadRealms() {
    try {
      const realmsPath = path.join(__dirname, '../../data/core/realms.json');
      if (fs.existsSync(realmsPath)) {
        this.realms = await FileManager.readJson(realmsPath);
        this.info('Realms loaded', { count: Object.keys(this.realms).length });
      } else {
        this.warn('Realms file not found', { path: realmsPath });
        this.realms = {};
      }
    } catch (error) {
      this.handleError(error, 'PlayerService.loadRealms');
      this.realms = {};
    }
  }

  async savePlayers() {
    try {
      const playersData = {};
      for (const [userId, playerData] of this.players.entries()) {
        playersData[userId] = playerData;
      }
      await FileManager.writeJson(this.dataPath, playersData);
    } catch (error) {
      this.handleError(error, 'PlayerService.savePlayers');
    }
  }

  async getPlayer(userId) {
    await this.loadingPromise;
    return this.players.get(userId);
  }

  async getOrCreatePlayer(userId, username) {
    let player = await this.getPlayer(userId);
    if (!player) {
      player = await this.createPlayer(userId, username);
    }
    return player;
  }

  async createPlayer(userId, username, chosenSpiritRoot = null) {
    if (this.players.has(userId)) {
      return this.players.get(userId);
    }

    // Get spirit root info
    const spiritRoots = await this.spiritRootService.getAllSpiritRoots();
    let spiritRoot;
    if (chosenSpiritRoot && spiritRoots[chosenSpiritRoot]) {
      spiritRoot = chosenSpiritRoot;
    } else {
      const spiritRootTypes = Object.keys(spiritRoots);
      spiritRoot = spiritRootTypes[Math.floor(Math.random() * spiritRootTypes.length)];
    }

    const player = {
      userId: userId,
      username: username,
      spiritRoot: spiritRoot,
      experience: 0,
      realm: 'luyen_khi',
      realmLevel: 1,
      totalTiers: 0,
      inventory: {
        spiritStones: {
          ha_pham: 100,
          trung_pham: 0,
          thuong_pham: 0,
          cuc_pham: 0
        },
        items: [
          { id: 'ngu_nien_sam', quantity: 3 },
          { id: 'thanh_diep_thao', quantity: 3 },
          { id: 'tieu_long_lan_qua', quantity: 3 }
        ],
        weapons: [],
        armors: []
      },
      cultivation: {
        lastCultivate: 0,
        cultivateCooldown: 300000,
        breakthroughAttempts: 0,
        lastBreakthrough: 0,
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
      alchemy: {
        furnaceLevel: 1,
        totalCrafted: 0,
        successCount: 0,
        failureCount: 0,
        lastAlchemy: 0
      },
      forge: {
        forgeLevel: 1,
        totalCrafted: 0,
        successCount: 0,
        failureCount: 0,
        lastForge: 0
      },
      achievements: [],
      joinDate: Date.now(),
      lastActive: Date.now()
    };

    // Calculate stats
    await this.calculatePlayerStats(player);

    this.players.set(userId, player);
    await this.savePlayers();

    const spiritRootInfo = await this.spiritRootService.getSpiritRootInfo(spiritRoot);
    this.info('Player created', {
      userId,
      username,
      spiritRoot: spiritRootInfo?.name || spiritRoot
    });

    return player;
  }

  async calculatePlayerStats(player) {
    const spiritRoot = await this.spiritRootService.getSpiritRootInfo(player.spiritRoot);
    if (!spiritRoot) return;

    const { basic_stats, growth_rates } = spiritRoot;

    // Calculate luyen khi tiers
    let luyenKhiTiers = 0;
    if (player.realm === 'luyen_khi') {
      luyenKhiTiers = player.realmLevel;
    } else {
      luyenKhiTiers = 13; // Completed 13 tiers
    }

    // Calculate stage multiplier
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

    // Calculate tier multiplier
    let tierMultiplier = 1;
    if (player.realm === 'luyen_khi') {
      tierMultiplier = 1;
    } else if (player.realm === 'truc_co') {
      if (player.realmLevel === 1) tierMultiplier = 1.0;
      else if (player.realmLevel === 2) tierMultiplier = 1.5;
      else if (player.realmLevel === 3) tierMultiplier = 2.0;
    } else if (player.realm === 'ket_dan') {
      if (player.realmLevel === 1) tierMultiplier = 1.0;
      else if (player.realmLevel === 2) tierMultiplier = 1.5;
      else if (player.realmLevel === 3) tierMultiplier = 2.0;
    } else if (player.realm === 'nguyen_anh') {
      if (player.realmLevel === 1) tierMultiplier = 1.0;
      else if (player.realmLevel === 2) tierMultiplier = 1.5;
      else if (player.realmLevel === 3) tierMultiplier = 2.0;
    }

    // Calculate raw stats
    const rawAttack = (basic_stats.attack + growth_rates.attack * luyenKhiTiers) * (stageMultiplier * tierMultiplier);
    const rawDefense = (basic_stats.defense + growth_rates.defense * luyenKhiTiers) * (stageMultiplier * tierMultiplier);
    const rawHp = (basic_stats.hp + growth_rates.hp * luyenKhiTiers) * (stageMultiplier * tierMultiplier);
    const rawMp = (basic_stats.mana + growth_rates.mana * luyenKhiTiers) * (stageMultiplier * tierMultiplier);
    const rawSpeed = (basic_stats.speed + growth_rates.speed * luyenKhiTiers) * (stageMultiplier * tierMultiplier);
    const rawRegen = (basic_stats.regen + growth_rates.regen * luyenKhiTiers) * (stageMultiplier * tierMultiplier);

    // Calculate CRIT and EVA with Affinity
    const K = 20;
    const critAffinityByRoot = { hoa: 1.6, thuy: 1.3, moc: 1.15, kim: 1.0, tho: 0.8 };
    const evaAffinityByRoot = { thuy: 1.65, hoa: 1.3, moc: 1.15, kim: 0.9, tho: 0.9 };

    const rawCritical = (basic_stats.critical + growth_rates.critical * luyenKhiTiers) * (stageMultiplier * tierMultiplier);
    const rawEvasion = (basic_stats.evasion + growth_rates.evasion * luyenKhiTiers) * (stageMultiplier * tierMultiplier);

    const critAffinity = critAffinityByRoot[player.spiritRoot] || 1.0;
    const evaAffinity = evaAffinityByRoot[player.spiritRoot] || 1.0;

    const critAdj = rawCritical * critAffinity;
    const evaAdj = rawEvasion * evaAffinity;

    const critAdjPercent = critAdj / 100;
    const evaAdjPercent = evaAdj / 100;

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
      reputation: 0,
      karma: 0
    };

    player.stats = stats;
    player.luyenKhiTiers = luyenKhiTiers;
    player.stageMultiplier = stageMultiplier;
    player.tierMultiplier = tierMultiplier;
  }

  async hasStartedGame(userId) {
    const player = await this.getPlayer(userId);
    return player && player.spiritRoot;
  }

  getRealmInfo(realmKey) {
    // Kiểm tra an toàn
    if (!realmKey || !this.realms || !this.realms[realmKey]) {
      // Fallback về Luyện Khí nếu không tìm thấy
      this.warn(`Realm "${realmKey}" not found, falling back to "luyen_khi"`);
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

  async updatePlayer(userId, updates) {
    const player = await this.getPlayer(userId);
    if (!player) return false;

    // Update nested fields
    const updateNestedFields = (obj, updates) => {
      for (const [key, value] of Object.entries(updates)) {
        if (key.includes('.')) {
          const keys = key.split('.');
          let current = obj;

          for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
              current[keys[i]] = {};
            }
            current = current[keys[i]];
          }

          current[keys[keys.length - 1]] = value;
        } else {
          obj[key] = value;
        }
      }
    };

    updateNestedFields(player, updates);
    player.lastActive = Date.now();

    await this.savePlayers();
    return true;
  }

  // Migrate old spiritStones format
  migrateSpiritStones(oldSpiritStones) {
    if (typeof oldSpiritStones === 'object' && oldSpiritStones.ha_pham !== undefined) {
      return oldSpiritStones;
    }

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

    if (typeof oldSpiritStones === 'number') {
      return {
        ha_pham: oldSpiritStones,
        trung_pham: 0,
        thuong_pham: 0,
        cuc_pham: 0
      };
    }

    return {
      ha_pham: 100,
      trung_pham: 0,
      thuong_pham: 0,
      cuc_pham: 0
    };
  }
}

module.exports = PlayerService;
