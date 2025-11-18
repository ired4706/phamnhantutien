const fs = require('fs');
const path = require('path');
const Logger = require('../utils/core/logger');
const ErrorHandler = require('../utils/core/error-handler');
const FileManager = require('../utils/data/file-manager');
const RetryHandler = require('../utils/core/retry-handler');
const CacheManager = require('../utils/data/cache-manager');
const CONSTANTS = require('../../config/constants');
const { getContainer } = require('../container/ServiceContainer');
const StatsCalculator = require('../utils/game/stats-calculator');

class MonsterManager {
  constructor() {
    this.monstersData = null;
    this.cache = new CacheManager();
    this.loadMonsters();
  }

  async loadMonsters() {
    const cacheKey = 'monsters_data';
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.monstersData = cached;
      return;
    }

    try {
      const result = await RetryHandler.executeWithRetry(async () => {
        const data = await FileManager.readJson(path.join(__dirname, '../../data/monsters/monsters.json'));
        return data;
      }, 3, 200);

      this.monstersData = result;
      this.cache.set(cacheKey, result, CONSTANTS.CACHE.MONSTERS_TTL_MS);
      Logger.info('Loaded monsters data', { tiers: Object.keys(result?.monster_tiers || {}).length });
    } catch (error) {
      ErrorHandler.handle(error, 'MonsterManager.loadMonsters');
      this.monstersData = {};
    }
  }

  // Lấy thông tin tier quái
  getMonsterTier(tierKey) {
    if (!this.monstersData || !this.monstersData.monster_tiers) {
      return null;
    }
    return this.monstersData.monster_tiers[tierKey] || null;
  }

  // Lấy danh sách template quái theo cấp
  getMonsterTemplates(tierKey) {
    if (!this.monstersData || !this.monstersData.monster_templates) {
      return [];
    }
    return this.monstersData.monster_templates[tierKey] || [];
  }

  // (Removed) Element affinity support has been dropped

  // Tính chỉ số quái dựa trên hệ và cấp bậc
  async calculateMonsterStats(player, template, tierInfo, variant = "normal") {
    // 1. Xác định hệ của quái (ngũ hành + phong + lôi + vô)
    // Map vo_he -> vo vì trong data file key là "vo"
    const elements = ['kim', 'moc', 'thuy', 'hoa', 'tho', 'phong', 'loi', 'vo'];
    const randomElement = elements[Math.floor(Math.random() * elements.length)];

    // 2. Xác định cấp bậc của quái dựa trên tier
    const tierToRealm = {
      'nhat_cap': { realm: 'luyen_khi', level: 1 },
      'nhi_cap': { realm: 'truc_co', level: 1 },
      'tam_cap': { realm: 'truc_co', level: 2 },
      'tu_cap': { realm: 'truc_co', level: 3 },
      'ngu_cap': { realm: 'ket_dan', level: 1 },
      'luc_cap': { realm: 'ket_dan', level: 2 },
      'that_cap': { realm: 'ket_dan', level: 3 },
      'bat_cap': { realm: 'nguyen_anh', level: 1 },
      'cuu_cap': { realm: 'nguyen_anh', level: 2 },
      'thap_cap': { realm: 'nguyen_anh', level: 3 }
    };

    const monsterRealm = tierToRealm[template.tier] || { realm: 'luyen_khi', level: 1 };

    // 3. Lấy chỉ số cơ bản của player hệ tương ứng
    const playerStats = await StatsCalculator.calculateMonsterBaseStats(randomElement, monsterRealm.realm, monsterRealm.level);
    console.log("=======================", monsterRealm, playerStats);

    // Validate playerStats to prevent NaN
    if (!playerStats || typeof playerStats.hp !== 'number' || isNaN(playerStats.hp)) {
      console.error('Invalid playerStats for monster generation:', { randomElement, monsterRealm, playerStats });
      // Fallback to basic stats
      const fallbackStats = {
        attack: 100, defense: 100, hp: 1000, mp: 500, speed: 50,
        critical: 10, regen: 5, evasion: 10, accuracy: 10, penetration: 5
      };
      return {
        stats: fallbackStats,
        element: randomElement
      };
    }

    // 4. Tính power multiplier dựa trên variant
    let powerMultiplier = 1.0;
    if (variant === "normal") {
      powerMultiplier = 0.7 + Math.random() * 0.2; // 70-90%
    } else if (variant === "mutated") {
      powerMultiplier = 1.0 + Math.random() * 0.2; // 100-120%
    } else if (variant === "super_mutated") {
      powerMultiplier = 1.3 + Math.random() * 0.2; // 130-150%
    }

    // 5. Áp dụng powerMultiplier cho các chỉ số chính (không nhân vào CRIT/EVA/ACC/PEN)
    const monsterAttack = (playerStats.attack || 0) * powerMultiplier;
    const monsterDefense = (playerStats.defense || 0) * powerMultiplier;
    const monsterHp = (playerStats.hp || 0) * powerMultiplier;
    const monsterMp = (playerStats.mp || 0) * powerMultiplier;
    const monsterSpeed = (playerStats.speed || 0) * powerMultiplier;
    const monsterRegen = (playerStats.regen || 0) * powerMultiplier;
    const monsterAccuracy = playerStats.accuracy || 0; // giữ nguyên theo công thức quy đổi
    const monsterPenetration = playerStats.penetration || 0; // giữ nguyên theo công thức quy đổi

    // 6. CRIT và EVA dùng rating thô (không %), giữ nguyên theo hệ mới

    // Làm tròn và validate để tránh NaN
    const round1 = (v) => {
      const val = parseFloat(v) || 0;
      return isNaN(val) ? 0 : Math.round(val * 10) / 10;
    };

    const stats = {
      attack: round1(monsterAttack),
      defense: round1(monsterDefense),
      hp: round1(monsterHp),
      maxHp: round1(monsterHp),
      mp: round1(monsterMp),
      maxMp: round1(monsterMp),
      speed: round1(monsterSpeed),
      critical: round1(playerStats.critical || 0),
      regen: round1(monsterRegen),
      evasion: round1(playerStats.evasion || 0),
      accuracy: round1(monsterAccuracy),
      penetration: round1(monsterPenetration)
    };

    return {
      stats: stats,
      element: randomElement
    };
  }


  // Lấy raw stats của người chơi (trước khi áp dụng Stage/Tier multiplier)
  async getPlayerRawStats(player) {
    const container = getContainer();
    const spiritRootService = container.get('spiritRootService');
    const spiritRoot = await spiritRootService.getSpiritRootInfo(player.spiritRoot);
    if (!spiritRoot) return null;

    const { basic_stats, growth_rates } = spiritRoot;

    // Tính số tầng luyện khí đã qua
    let luyenKhiTiers = 0;
    if (player.realm === 'luyen_khi') {
      luyenKhiTiers = player.realmLevel;
    } else {
      luyenKhiTiers = 13; // Đã hoàn thành 13 tầng luyện khí
    }

    // Tính raw stats (chỉ basic + growth, không có stage/tier multiplier)
    const rawAttack = basic_stats.attack + growth_rates.attack * luyenKhiTiers;
    const rawDefense = basic_stats.defense + growth_rates.defense * luyenKhiTiers;
    const rawHp = basic_stats.hp + growth_rates.hp * luyenKhiTiers;
    const rawMp = basic_stats.mana + growth_rates.mana * luyenKhiTiers;
    const rawSpeed = basic_stats.speed + growth_rates.speed * luyenKhiTiers;
    const rawRegen = basic_stats.regen + growth_rates.regen * luyenKhiTiers;
    const rawCritical = basic_stats.critical + growth_rates.critical * luyenKhiTiers;
    const rawEvasion = basic_stats.evasion + growth_rates.evasion * luyenKhiTiers;

    return {
      attack: rawAttack,
      defense: rawDefense,
      hp: rawHp,
      mp: rawMp,
      speed: rawSpeed,
      regen: rawRegen,
      critical: rawCritical,
      evasion: rawEvasion
    };
  }


  // Tạo quái ngẫu nhiên theo cấp độ
  async generateRandomMonster(tierKey, player) {
    const tierInfo = this.getMonsterTier(tierKey);
    if (!tierInfo) {
      throw new Error(`Invalid monster tier: ${tierKey}`);
    }

    const templates = this.getMonsterTemplates(tierKey);
    if (templates.length === 0) {
      throw new Error(`No monster templates found for tier: ${tierKey}`);
    }

    // Chọn template ngẫu nhiên
    const template = templates[Math.floor(Math.random() * templates.length)];
    template.tier = tierKey; // Thêm tier vào template

    // Chọn variant dựa trên tỉ lệ cố định
    const variant = this.selectVariant();

    // Tính chỉ số dựa trên hệ và cấp bậc
    const monsterData = await this.calculateMonsterStats(player, template, tierInfo, variant);

    // Tạo tên variant
    const variantNames = {
      "normal": "",
      "mutated": "Biến dị",
      "super_mutated": "Siêu biến dị"
    };

    const variantEmojis = {
      "normal": "✦",
      "mutated": "✧",
      "super_mutated": "✸"
    };

    // Tính loot multiplier dựa trên variant
    let lootMultiplier = 1.0;
    if (variant === "normal") {
      lootMultiplier = 0.75 + Math.random() * 0.15; // 75-90%
    } else if (variant === "mutated") {
      lootMultiplier = 1.0 + Math.random() * 0.2; // 100-120%
    } else if (variant === "super_mutated") {
      lootMultiplier = 2.0 + Math.random() * 1.0; // 200-300%
    }

    const monster = {
      id: `${template.id}_${variant}`,
      name: `${variantEmojis[variant]} ${template.name} ${variantNames[variant]}`.trim(),
      // Map vo -> vo_he để consistent với code khác (vo_he được dùng trong combat system)
      element: monsterData.element === 'vo' ? 'vo_he' : monsterData.element,
      emoji: template.emoji,
      description: template.description,
      tier: tierKey,
      variant: variant,
      stats: monsterData.stats,

      expReward: Math.floor(tierInfo.base_exp_reward * lootMultiplier),
      spiritStonesReward: Math.floor(tierInfo.base_spirit_stones * lootMultiplier)
    };

    return monster;
  }

  // Chọn variant dựa trên tỉ lệ cố định
  selectVariant() {
    const random = Math.random();
    // Tỉ lệ cố định cho hunt: Normal 82%, Mutated 15%, Super Mutated 3%
    if (random < 0.82) {
      return "normal";
    } else if (random < 0.97) {
      return "mutated";
    } else {
      return "super_mutated";
    }
  }

  // Lấy danh sách tất cả tier có sẵn
  getAllTiers() {
    if (!this.monstersData || !this.monstersData.monster_tiers) {
      return [];
    }
    return Object.keys(this.monstersData.monster_tiers);
  }

  // Lấy tier tương ứng với tu vi người chơi
  getPlayerEquivalentTier(playerRealm, playerRealmLevel) {
    const tierMapping = {
      'luyen_khi': {
        1: 'nhat_cap', 2: 'nhat_cap', 3: 'nhat_cap', 4: 'nhat_cap', 5: 'nhat_cap',
        6: 'nhat_cap', 7: 'nhat_cap', 8: 'nhat_cap', 9: 'nhat_cap', 10: 'nhat_cap',
        11: 'nhat_cap', 12: 'nhat_cap', 13: 'nhi_cap'
      },
      'truc_co': {
        1: 'nhi_cap', 2: 'tam_cap', 3: 'tu_cap'
      },
      'ket_dan': {
        1: 'ngu_cap', 2: 'luc_cap', 3: 'that_cap'
      },
      'nguyen_anh': {
        1: 'bat_cap', 2: 'cuu_cap', 3: 'thap_cap'
      }
    };

    return tierMapping[playerRealm]?.[playerRealmLevel] || 'nhat_cap';
  }

  // Tính toán damage và hit check (hệ chỉ số mới)
  calculateDamage(attacker, defender, isCritical = undefined) {
    const REALM_CONFIG = {
      luyen_khi: { Kcrit: 200, PEN_BASE: 150 },
      truc_co: { Kcrit: 800, PEN_BASE: 500 },
      ket_dan: { Kcrit: 2000, PEN_BASE: 1500 },
      nguyen_anh: { Kcrit: 3000, PEN_BASE: 3500 }
    };

    const realm = attacker.realm || 'luyen_khi';
    const cfg = REALM_CONFIG[realm] || REALM_CONFIG.luyen_khi;

    const attack = parseFloat(attacker.stats.attack) || 0;
    const defense = parseFloat(defender.stats.defense) || 0;
    const acc = parseFloat(attacker.stats.accuracy) || 0;
    const eva = parseFloat(defender.stats.evasion) || 0;
    const pen = parseFloat(attacker.stats.penetration) || 0;

    // Hit check ACC vs EVA
    const hitChance = Math.min(Math.max(0.05 + 0.95 * (acc / (acc + Math.max(1, eva))), 0.05), 0.95);
    if (Math.random() > hitChance) {
      return { hit: false, damage: 0, isCritical: false, elementMultiplier: 1 };
    }

    // Penetration reduces defender defense
    const penReduction = pen / (pen + cfg.PEN_BASE);
    const effectiveDEF = defense * (1 - penReduction);
    let finalDamage = Math.max(1, attack - effectiveDEF);

    // Crit using realm-specific Kcrit
    const critRating = parseFloat(attacker.stats.critical) || 0;
    const critChance = critRating / (critRating + cfg.Kcrit);
    const doCrit = (typeof isCritical === 'boolean') ? isCritical : (Math.random() < critChance);
    if (doCrit) {
      const CRIT_MIN = 1.4;
      const CRIT_MAX = 1.7;
      const critMultiplier = CRIT_MIN + Math.random() * (CRIT_MAX - CRIT_MIN);
      finalDamage *= critMultiplier;
    }

    // Áp dụng hệ số ngũ hành theo bảng tương sinh tương khắc (attacker vs defender)
    const attackerElement = attacker.element || 'vo_he';
    const defenderElement = defender.element || 'vo_he';
    const elementMultiplier = this.getElementDamageMultiplier(attackerElement, defenderElement);
    finalDamage *= elementMultiplier;

    return {
      hit: true,
      damage: Math.floor(finalDamage),
      isCritical: !!doCrit,
      elementMultiplier: elementMultiplier
    };
  }

  // Bảng hệ số sát thương ngũ hành (attacker -> defender)
  getElementDamageMultiplier(att, def) {
    const table = {
      kim: { kim: 1.0, moc: 1.25, thuy: 1.0, hoa: 0.80, tho: 1.0, phong: 1.0, loi: 1.0, vo_he: 1.0 },
      moc: { kim: 0.80, moc: 1.0, thuy: 1.0, hoa: 1.0, tho: 1.25, phong: 1.0, loi: 1.0, vo_he: 1.0 },
      thuy: { kim: 1.0, moc: 1.0, thuy: 1.0, hoa: 1.25, tho: 0.80, phong: 1.0, loi: 1.0, vo_he: 1.0 },
      hoa: { kim: 1.25, moc: 1.0, thuy: 0.80, hoa: 1.0, tho: 1.0, phong: 1.0, loi: 1.0, vo_he: 1.0 },
      tho: { kim: 1.0, moc: 0.80, thuy: 1.25, hoa: 1.0, tho: 1.0, phong: 1.0, loi: 1.0, vo_he: 1.0 },
      phong: { kim: 1.0, moc: 1.0, thuy: 1.0, hoa: 1.0, tho: 1.0, phong: 1.0, loi: 1.25, vo_he: 1.0 },
      loi: { kim: 1.0, moc: 1.0, thuy: 1.0, hoa: 1.0, tho: 1.0, phong: 1.25, loi: 1.0, vo_he: 1.0 },
      vo_he: { kim: 1.0, moc: 1.0, thuy: 1.0, hoa: 1.0, tho: 1.0, phong: 1.0, loi: 1.0, vo_he: 1.0 }
    };
    const a = (att in table) ? att : 'vo_he';
    const d = (def in table[a]) ? def : 'vo_he';
    return table[a][d];
  }

  // Kiểm tra critical hit
  checkCritical(attacker) {
    const REALM_CONFIG = {
      luyen_khi: { Kcrit: 200 },
      truc_co: { Kcrit: 800 },
      ket_dan: { Kcrit: 2000 },
      nguyen_anh: { Kcrit: 3000 }
    };
    const realm = attacker.realm || 'luyen_khi';
    const cfg = REALM_CONFIG[realm] || REALM_CONFIG.luyen_khi;
    const critRating = parseFloat(attacker.stats.critical) || 0;
    const critChance = critRating / (critRating + cfg.Kcrit);
    return Math.random() < critChance;
  }
}

module.exports = new MonsterManager();
