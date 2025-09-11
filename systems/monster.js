const fs = require('fs');
const path = require('path');

class MonsterManager {
  constructor() {
    this.monstersData = null;
    this.loadMonsters();
  }

  loadMonsters() {
    try {
      const data = fs.readFileSync(path.join(__dirname, '../data/monsters.json'), 'utf8');
      this.monstersData = JSON.parse(data);
    } catch (error) {
      console.error('Error loading monsters:', error);
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

  // Lấy thông tin element affinity
  getElementAffinity(element) {
    if (!this.monstersData || !this.monstersData.element_affinities) {
      return { crit_affinity: 1.0, eva_affinity: 1.0, weakness: "none", strength: "none" };
    }
    return this.monstersData.element_affinities[element] || { crit_affinity: 1.0, eva_affinity: 1.0, weakness: "none", strength: "none" };
  }

  // Tính chỉ số quái dựa trên raw stats của người chơi
  calculateMonsterStats(player, template, tierInfo, variant = "normal") {
    // Lấy raw stats của người chơi (trước khi áp dụng Stage/Tier multiplier)
    const playerRawStats = this.getPlayerRawStats(player);

    // Chọn element ngẫu nhiên
    const elements = ['kim', 'moc', 'thuy', 'hoa', 'tho', 'phong', 'loi', 'vo_he'];
    const randomElement = elements[Math.floor(Math.random() * elements.length)];

    // Tính power multiplier dựa trên variant
    let powerMultiplier = 1.0;
    if (variant === "normal") {
      powerMultiplier = 0.7 + Math.random() * 0.15; // 70-85%
    } else if (variant === "mutated") {
      powerMultiplier = 1.1 + Math.random() * 0.2; // 110-130%
    } else if (variant === "super_mutated") {
      powerMultiplier = 2.0 + Math.random() * 0.5; // 200-250%
    }

    // Tính chỉ số quái dựa trên raw stats của người chơi
    const monsterAttack = playerRawStats.attack * powerMultiplier;
    const monsterDefense = playerRawStats.defense * powerMultiplier;
    const monsterHp = playerRawStats.hp * powerMultiplier;
    const monsterMp = playerRawStats.mp * powerMultiplier;
    const monsterSpeed = playerRawStats.speed * powerMultiplier;
    const monsterRegen = playerRawStats.regen * powerMultiplier;

    // Tính CRIT và EVA với Affinity
    const elementAffinity = this.getElementAffinity(randomElement);
    const K = 20;

    const critAdj = playerRawStats.critical * powerMultiplier * elementAffinity.crit_affinity;
    const evaAdj = playerRawStats.evasion * powerMultiplier * elementAffinity.eva_affinity;

    const critAdjPercent = critAdj / 100;
    const evaAdjPercent = evaAdj / 100;

    const finalCriticalPercent = (critAdjPercent / (critAdjPercent + K)) * 100;
    const finalEvasionPercent = (evaAdjPercent / (evaAdjPercent + K)) * 100;

    // Làm tròn
    const round1 = (v) => Math.round(v * 10) / 10;

    const stats = {
      attack: round1(monsterAttack),
      defense: round1(monsterDefense),
      hp: round1(monsterHp),
      maxHp: round1(monsterHp),
      mp: round1(monsterMp),
      maxMp: round1(monsterMp),
      speed: round1(monsterSpeed),
      critical: round1(finalCriticalPercent),
      regen: round1(monsterRegen),
      evasion: round1(finalEvasionPercent)
    };

    return {
      stats: stats,
      element: randomElement,
      elementAffinity: elementAffinity
    };
  }

  // Lấy raw stats của người chơi (trước khi áp dụng Stage/Tier multiplier)
  getPlayerRawStats(player) {
    const spiritRoot = this.getSpiritRootInfo(player.spiritRoot);
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

  // Lấy thông tin linh căn (copy từ playerManager)
  getSpiritRootInfo(spiritRootType) {
    const fs = require('fs');
    const path = require('path');

    try {
      const data = fs.readFileSync(path.join(__dirname, '../data/spirit-roots.json'), 'utf8');
      const spiritRoots = JSON.parse(data);
      return spiritRoots[spiritRootType] || null;
    } catch (error) {
      console.error('Error loading spirit roots:', error);
      return null;
    }
  }

  // Tạo quái ngẫu nhiên theo cấp độ
  generateRandomMonster(tierKey, player) {
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

    // Chọn variant dựa trên tỉ lệ
    const variant = this.selectVariant(tierInfo.encounter_rates);

    // Tính chỉ số dựa trên raw stats của người chơi
    const monsterData = this.calculateMonsterStats(player, template, tierInfo, variant);

    // Tạo tên variant
    const variantNames = {
      "normal": "",
      "mutated": "Biến Dị",
      "super_mutated": "Siêu Biến Dị"
    };

    const variantEmojis = {
      "normal": "",
      "mutated": "🔴",
      "super_mutated": "💀"
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
      element: monsterData.element,
      emoji: template.emoji,
      description: template.description,
      tier: tierKey,
      variant: variant,
      stats: monsterData.stats,
      elementAffinity: monsterData.elementAffinity,
      expReward: Math.floor(tierInfo.base_exp_reward * lootMultiplier),
      spiritStonesReward: Math.floor(tierInfo.base_spirit_stones * lootMultiplier)
    };

    return monster;
  }

  // Chọn variant dựa trên tỉ lệ
  selectVariant(encounterRates) {
    const random = Math.random();
    let cumulative = 0;

    for (const [variant, rate] of Object.entries(encounterRates)) {
      cumulative += rate;
      if (random <= cumulative) {
        return variant;
      }
    }

    return "normal"; // Fallback
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

  // Tính toán damage và hit check
  calculateDamage(attacker, defender, isCritical = false) {
    // Hit check
    const hitRoll = Math.random() * 100;
    if (hitRoll < defender.stats.evasion) {
      return { hit: false, damage: 0, isCritical: false };
    }

    // Base damage calculation
    const baseDamage = Math.max(5, attacker.stats.attack - defender.stats.defense * 0.5);

    // Critical damage
    let finalDamage = baseDamage;
    if (isCritical) {
      finalDamage *= 1.8; // 80% bonus damage on crit
    }

    // Element affinity bonus/penalty
    const attackerElement = attacker.element || 'vo_he';
    const defenderElement = defender.element || 'vo_he';

    let elementMultiplier = 1.0;
    if (attackerElement !== 'vo_he' && defenderElement !== 'vo_he') {
      const attackerAffinity = this.getElementAffinity(attackerElement);
      if (attackerAffinity.strength === defenderElement) {
        elementMultiplier = 1.15; // +15% damage
      } else if (attackerAffinity.weakness === defenderElement) {
        elementMultiplier = 0.85; // -15% damage
      }
    }

    finalDamage *= elementMultiplier;

    return {
      hit: true,
      damage: Math.floor(finalDamage),
      isCritical: isCritical,
      elementMultiplier: elementMultiplier
    };
  }

  // Kiểm tra critical hit
  checkCritical(attacker) {
    const critRoll = Math.random() * 100;
    return critRoll < attacker.stats.critical;
  }
}

module.exports = new MonsterManager();
