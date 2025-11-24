const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const playerManager = require('../../systems/player.js');
const itemLoader = require('../../utils/data/item-loader.js');

const cooldownManager = require('../../utils/game/cooldown.js');

module.exports = {
  name: 'craft',
  aliases: ['fcraft', 'che_tao_tb', 'trangbi'],
  description: 'Chế tạo trang bị và vũ khí từ nguyên liệu trong kho',

  // Tạo separator đẹp mắt
  createSeparator() {
    return '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  },

  // Lấy màu theo rarity
  getRarityColor(rarity) {
    const colors = {
      'common': '#9B9B9B',
      'uncommon': '#4CAF50',
      'rare': '#2196F3',
      'epic': '#9C27B0',
      'legendary': '#FF9800'
    };
    return colors[rarity] || '#9B9B9B';
  },

  // Lấy emoji rarity
  getRarityEmoji(rarity) {
    const emojis = {
      'common': '⚪',
      'uncommon': '🟢',
      'rare': '🔵',
      'epic': '🟣',
      'legendary': '🟠'
    };
    return emojis[rarity] || '⚪';
  },

  // Utility random int inclusive
  randBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Get unlocked skill tiers array (cumulative: higher rarity includes lower tiers)
  getUnlockedSkillTiers(rarity) {
    const tierMap = {
      'common': [1],           // Phàm: tier 1
      'uncommon': [1, 2],      // Huyền: tier 1 + 2
      'rare': [1, 2, 3],       // Địa: tier 1 + 2 + 3
      'epic': [1, 2, 3],       // Thiên: tier 1 + 2 + 3 (same as Địa for skills)
      'legendary': [1, 2, 3]   // Thần: tier 1 + 2 + 3 (same as Địa for skills)
    };
    return tierMap[rarity] || [1];
  },

  // Build passives for Epic (Thiên) and Legendary (Thần)
  buildWeaponPassives(rarity, element) {
    const passives = [];

    // Epic (Thiên): includes Thiên passive
    if (rarity === 'epic' || rarity === 'legendary') {
      const thienMap = {
        kim: {
          id: 'passive_thien_kim_kim_tram',
          name: 'Kim Trảm',
          description: 'Sát thương vũ khí có luôn xuyên 6% DEF, 15% xuyên thêm 3% DEF trong lượt',
          type: 'weapon_damage_always_pen_pct',
          always_pen_pct: 0.06,
          chance_extra_pen_pct: 0.15,
          extra_pen_pct: 0.03
        },
        moc: {
          id: 'passive_thien_moc_lac_diep',
          name: 'Lạc Diệp',
          description: 'Mỗi 3 lượt gây sát thương 6% sát thương vũ khí',
          type: 'weapon_damage_every_n_turns_pct',
          every: 3,
          value: 0.06
        },
        thuy: {
          id: 'passive_thien_thuy_luu_anh',
          name: 'Lưu Ảnh',
          description: 'Sát thương vũ khí có 12% giảm 10% SPD địch trong lượt kế tiếp',
          type: 'weapon_damage_chance_slow_pct',
          chance: 0.12,
          slow_pct: 0.10
        },
        hoa: {
          id: 'passive_thien_hoa_huyet_viem',
          name: 'Huyết Viêm',
          description: 'Khi tấn công bằng vũ khí, gây thêm 4% sát thương dưới dạng đốt trong 2 lượt',
          type: 'weapon_damage_add_burn_pct',
          value: 0.04,
          duration: 2,
          cooldown: 2
        },
        tho: {
          id: 'passive_thien_tho_son_tram',
          name: 'Sơn Trấn',
          description: 'Mỗi 4 lượt sát thương vũ khí có 25% giảm 8% DEF địch trong 2 lượt',
          type: 'weapon_damage_every_n_turns_chance_def_reduction',
          every: 4,
          chance: 0.25,
          def_reduction_pct: 0.08,
          duration: 2
        }
      };
      const thienPassive = thienMap[element];
      if (thienPassive) passives.push(thienPassive);
    }

    // Legendary (Thần): includes both Thiên + Thần passives
    if (rarity === 'legendary') {
      const thanMap = {
        kim: {
          id: 'passive_than_kim_kim_hon_doan_sat',
          name: 'Kim Hồn Đoạn Sát',
          description: 'Bắt đầu sẽ cd 5 lượt; khi đủ, bảo đảm lần tấn công vũ khí tiếp theo là guaranteed crit and deals +40% Crit Damage',
          type: 'guaranteed_crit_next_weapon',
          crit_damage_bonus_pct: 0.40,
          cooldown: 5
        },
        moc: {
          id: 'passive_than_moc_van_diep_hoa_chuyen',
          name: 'Vạn Diệp Hóa Chuyển',
          description: 'Khi tấn công bằng vũ khí mục tiêu trên 70% HP, gây thêm sát thương bằng 6% sát thương vũ khí + 2% HP mục tiêu',
          type: 'weapon_damage_bonus_vs_high_hp',
          hp_threshold: 0.70,
          weapon_dmg_bonus_pct: 0.06,
          target_hp_bonus_pct: 0.02,
          cooldown: 4
        },
        thuy: {
          id: 'passive_than_thuy_thuy_anh_song_than',
          name: 'Thủy Ảnh Song Thân',
          description: '15% gây thêm 35% sát thương vũ khí',
          type: 'weapon_damage_chance_bonus_pct',
          chance: 0.15,
          damage_bonus_pct: 0.35,
          cooldown: 2
        },
        hoa: {
          id: 'passive_than_hoa_liet_tam_huyet_tram',
          name: 'Liệt Tâm Huyết Trảm',
          description: 'Khi tấn công bằng vũ khí, gây 6% sát thương vũ khí dưới dạng đốt trong 2 lượt',
          type: 'weapon_damage_add_burn_pct',
          value: 0.06,
          duration: 2,
          cooldown: 2
        },
        tho: {
          id: 'passive_than_tho_cuu_thach_chan_uy',
          name: 'Cửu Thạch Chấn Uy',
          description: 'Mỗi 5 lượt, đòn đánh vũ khí kế tiếp gây thêm 15% sát thương và 25% stun 1 lượt',
          type: 'weapon_damage_every_n_turns_next_bonus',
          every: 5,
          damage_bonus_pct: 0.15,
          stun_chance: 0.25,
          stun_duration: 1
        }
      };
      const thanPassive = thanMap[element];
      if (thanPassive) passives.push(thanPassive);
    }

    return passives;
  },

  // Randomize weapon stats based on rarity
  randomizeWeaponStats(rarity, weaponName, weaponElement) {
    const stats = {};
    const coreStatPool = ['STR', 'INT', 'DEX', 'VIT', 'LUK'];
    const rarityConfig = {
      'common': { lines: 1, minValue: 1, maxValue: 3, mainStrMin: 3, mainStrMax: 5, tier: 1 },
      'uncommon': { lines: 2, minValue: 3, maxValue: 7, mainStrMin: 15, mainStrMax: 25, tier: 2 },
      'rare': { lines: 3, minValue: 6, maxValue: 12, mainStrMin: 40, mainStrMax: 60, tier: 3 },
      'epic': { lines: 4, minValue: 10, maxValue: 20, mainStrMin: 70, mainStrMax: 95, tier: 3 },
      'legendary': { lines: 5, minValue: 16, maxValue: 30, mainStrMin: 110, mainStrMax: 140, tier: 3 }
    };

    const cfg = rarityConfig[rarity] || rarityConfig['common'];
    const mainSTR = this.randBetween(cfg.mainStrMin, cfg.mainStrMax);
    stats['__main_stats'] = { STR: mainSTR };

    const shuffled = [...coreStatPool].sort(() => Math.random() - 0.5);
    const pickCount = Math.min(cfg.lines, shuffled.length);
    for (let i = 0; i < pickCount; i++) {
      const key = shuffled[i];
      const val = this.randBetween(cfg.minValue, cfg.maxValue);
      stats[key] = (stats[key] || 0) + val;
    }

    const passives = this.buildWeaponPassives(rarity, weaponElement);
    if (passives.length > 0) {
      stats['__passives'] = passives;
    }

    stats['__weapon_skill_tier'] = cfg.tier;
    stats['__unlocked_skill_tiers'] = this.getUnlockedSkillTiers(rarity);

    return stats;
  },

  // Lấy emoji theo ngũ hành
  getElementEmoji(element) {
    const elementEmojis = {
      'kim': '⚔️',
      'moc': '🌳',
      'thuy': '💧',
      'hoa': '🔥',
      'tho': '🏔️'
    };
    return elementEmojis[element] || '❓';
  },

  // Lấy tên hiển thị cho ngũ hành
  getElementDisplayName(element) {
    const elementNames = {
      'kim': 'Kim (Kim Loại)',
      'moc': 'Mộc (Gỗ)',
      'thuy': 'Thủy (Nước)',
      'hoa': 'Hỏa (Lửa)',
      'tho': 'Thổ (Đất)'
    };
    return elementNames[element] || element;
  },

  // Lấy tên hiển thị cho loại vũ khí
  getWeaponTypeDisplayName(type) {
    const typeNames = {
      'sword': 'Kiếm',
      'spear': 'Thương',
      'staff': 'Trượng',
      'fan': 'Quạt',
      'bow': 'Cung',
      'dagger': 'Dao',
      'axe': 'Rìu',
      'hammer': 'Búa',
      'whip': 'Roi',
      'glove': 'Quyền'
    };
    return typeNames[type] || type;
  },

  // Lấy tên hiển thị cho rarity
  getRarityDisplayName(rarity) {
    const displayNames = {
      'common': 'Thường',
      'uncommon': 'Hiếm',
      'rare': 'Quý Hiếm',
      'epic': 'Cực Quý',
      'legendary': 'Huyền Thoại'
    };
    return displayNames[rarity] || rarity;
  },

  // Tạo bảng tỉ lệ theo level lò rèn
  createForgeLevelTable() {
    let table = '```\n';
    table += 'Level | Tỉ Lệ | Ghi Chú\n';
    table += '------|--------|---------\n';

    for (let level = 1; level <= 15; level++) {
      const baseRate = 55;
      const bonus = (level - 1) * 3;
      const totalRate = baseRate + bonus; // Level 15 = 55 + 42 = 97%
      const note = level === 1 ? 'Mặc định' : `+${bonus}%`;
      table += `${level.toString().padStart(4)} | ${totalRate.toString().padStart(6)}% | ${note}\n`;
    }

    table += '```';
    return table;
  },

  // Get main stat for equipment based on name and type
  getMainStat(equipmentName, equipmentType) {
    const mainStatMap = {
      // Giáp (Armor) - thiên về thủ/sinh tồn
      'Giáp Da Thô': 'hp',
      'Giáp Vải Gai': 'defense',
      'Giáp Hắc Thiết': 'hp',
      'Giáp Uẩn Linh': 'defense',
      'Giáp Bạch Ngọc': 'hp',
      'Giáp Thiên Lam': 'defense',
      'Thần Giáp Kim Cang': 'hp',
      'Thần Giáp Huyền Thiên': 'defense',

      // Giày (Shoes) - thiên về tốc/né
      'Giày Da Thường': 'speed',
      'Giày Luyện Thể': 'evasion',
      'Giày Vân Hành': 'speed',
      'Giày Thanh Ảnh': 'evasion',
      'Giày Ảnh Ẩn': 'speed',
      'Giày Thủy Ảnh': 'evasion',
      'Giày Phi Vân': 'speed',
      'Giày Hỏa Vũ': 'evasion',
      'Thân Khởi Lôi Bộ': 'speed',
      'Thần Vân Ảnh Bộ': 'evasion',

      // Trang sức (Accessories) - thiên về công/năng lượng
      'Nhẫn Bạch Ngân': 'critical',
      'Ngọc Bội Thanh Liễu': 'regen',
      'Hoa Tai Thanh Vân': 'mana',
      'Nhẫn Huyền Ngọc': 'critical',
      'Ngọc Bội Hắc Thủy': 'regen',
      'Hoa Tai Hồng Vũ': 'mana',
      'Nhẫn Tinh Quang': 'critical',
      'Ngọc Bội Minh Nguyệt': 'regen',
      'Hoa Tai Tinh Hà': 'mana',
      'Nhẫn Vĩnh Hằng': 'critical',
      'Ngọc Bội Thần Quang': 'regen',
      'Hoa Tai Thái Hư': 'mana'
    };

    return mainStatMap[equipmentName] || null;
  },

  // Get main stat bonus value based on rarity and main stat type
  getMainStatBonus(rarity, mainStat, equipmentType) {
    const bonusConfig = {
      'rare': { // Địa
        'hp': 200,
        'defense': 20,
        'speed': 10,
        'evasion': 5, // 5%
        'critical': 5, // 5% CRIT DMG
        'regen': 3,
        'mana': 50
      },
      'epic': { // Thiên
        'hp': 500,
        'defense': 50,
        'speed': 15,
        'evasion': 10, // 10%
        'critical': 10, // 10% CRIT DMG
        'regen': 5,
        'mana': 100
      },
      'legendary': { // Thần
        'hp': 800,
        'defense': 80,
        'speed': 20,
        'evasion': 15, // 15%
        'critical': 15, // 15% CRIT DMG
        'regen': 8,
        'mana': 150
      }
    };

    return bonusConfig[rarity]?.[mainStat] || 0;
  },

  // Helper: random between min and max (inclusive)
  randBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Determine set type (VIT or DEX) based on set_id
  getSetType(setId) {
    // Set VIT: thanh_moc, tran_nguyet, huyen_tho, tran_son, huyen_thien
    const vitSets = ['thanh_moc', 'tran_nguyet', 'huyen_tho', 'tran_son', 'huyen_thien'];
    // Set DEX: du_phong, phi_anh, anh_van, van_hanh, thai_hu
    const dexSets = ['du_phong', 'phi_anh', 'anh_van', 'van_hanh', 'thai_hu'];

    if (vitSets.includes(setId)) return 'VIT';
    if (dexSets.includes(setId)) return 'DEX';
    return null;
  },

  // Build equipment passives based on equipment type and rarity
  buildEquipmentPassives(rarity, equipmentType) {
    // Only rare+ equipment have passives
    if (!['rare', 'epic', 'legendary'].includes(rarity)) {
      return [];
    }

    // Number of passives based on rarity and equipment type
    let passiveCount;
    if (equipmentType === 'ring' || equipmentType === 'pendant') {
      // Trang sức: Địa 1, Thiên 1-2, Thần 2
      if (rarity === 'rare') {
        passiveCount = 1; // Địa: 1 passive
      } else if (rarity === 'epic') {
        passiveCount = Math.random() < 0.5 ? 1 : 2; // Thiên: 1-2 passive (random)
      } else if (rarity === 'legendary') {
        passiveCount = 2; // Thần: 2 passives (chắc chắn)
      } else {
        passiveCount = 0;
      }
    } else {
      // Armor/Pants/Shoes: Địa 1, Thiên 2, Thần 3
      passiveCount = {
        'rare': 1,    // Địa: 1 passive
        'epic': 2,    // Thiên: 2 passives
        'legendary': 3 // Thần: 3 passives
      }[rarity] || 0;
    }

    if (passiveCount === 0) return [];

    // Passive pools for each equipment type
    const armorPassives = [
      {
        id: 'sinh_khi',
        name: 'Sinh Khí',
        description: `+${rarity === 'rare' ? 4 : rarity === 'epic' ? 6 : 8}% HP`,
        type: 'passive',
        effect: 'hp_bonus_pct',
        value: rarity === 'rare' ? 4 : rarity === 'epic' ? 6 : 8
      },
      {
        id: 'tam_giap',
        name: 'Tâm Giáp',
        description: `+${rarity === 'rare' ? 3 : rarity === 'epic' ? 4 : 6}% DEF`,
        type: 'passive',
        effect: 'def_bonus_pct',
        value: rarity === 'rare' ? 3 : rarity === 'epic' ? 4 : 6
      },
      {
        id: 'kien_the',
        name: 'Kiên Thể',
        description: `Giảm ${rarity === 'rare' ? 2 : rarity === 'epic' ? 3 : 5}% sát thương`,
        type: 'passive',
        effect: 'damage_reduction_pct',
        value: rarity === 'rare' ? 2 : rarity === 'epic' ? 3 : 5
      },
      {
        id: 'ho_thuan',
        name: 'Hộ Thuẫn',
        description: `${rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3}% Shield/turn`,
        type: 'passive',
        effect: 'shield_per_turn_pct',
        value: rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3
      },
      {
        id: 'kim_khang',
        name: 'Kim Kháng',
        description: `Giảm ${rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3}% sát thương kim`,
        type: 'passive',
        effect: 'metal_resistance_pct',
        value: rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3
      },
      {
        id: 'moc_khang',
        name: 'Mộc Kháng',
        description: `Giảm ${rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3}% sát thương mộc`,
        type: 'passive',
        effect: 'wood_resistance_pct',
        value: rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3
      },
      {
        id: 'tho_khang',
        name: 'Thổ Kháng',
        description: `Giảm ${rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3}% sát thương thổ`,
        type: 'passive',
        effect: 'earth_resistance_pct',
        value: rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3
      },
      {
        id: 'thuy_khang',
        name: 'Thủy Kháng',
        description: `Giảm ${rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3}% sát thương thủy`,
        type: 'passive',
        effect: 'water_resistance_pct',
        value: rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3
      },
      {
        id: 'hoa_khang',
        name: 'Hỏa Kháng',
        description: `Giảm ${rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3}% sát thương hỏa`,
        type: 'passive',
        effect: 'fire_resistance_pct',
        value: rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3
      }
    ];

    const pantsPassives = [
      {
        id: 'tran_mach',
        name: 'Trấn Mạch',
        description: `Hồi ${rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3}% MP/turn`,
        type: 'passive',
        effect: 'mp_regen_per_turn_pct',
        value: rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3
      },
      {
        id: 'dia_can',
        name: 'Địa Căn',
        description: `+${rarity === 'rare' ? 2 : rarity === 'epic' ? 3 : 5}% DEF`,
        type: 'passive',
        effect: 'def_bonus_pct',
        value: rarity === 'rare' ? 2 : rarity === 'epic' ? 3 : 5
      },
      {
        id: 'tinh_the',
        name: 'Tĩnh Thể',
        description: `+${rarity === 'rare' ? 3 : rarity === 'epic' ? 5 : 7}% HP`,
        type: 'passive',
        effect: 'hp_bonus_pct',
        value: rarity === 'rare' ? 3 : rarity === 'epic' ? 5 : 7
      },
      {
        id: 'huyet_duong',
        name: 'Huyết Dưỡng',
        description: `Hồi ${rarity === 'rare' ? 0.8 : rarity === 'epic' ? 1.5 : 2.5}% HP/turn`,
        type: 'passive',
        effect: 'hp_regen_per_turn_pct',
        value: rarity === 'rare' ? 0.8 : rarity === 'epic' ? 1.5 : 2.5
      },
      {
        id: 'kim_khang',
        name: 'Kim Kháng',
        description: `Giảm ${rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3}% sát thương kim`,
        type: 'passive',
        effect: 'metal_resistance_pct',
        value: rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3
      },
      {
        id: 'moc_khang',
        name: 'Mộc Kháng',
        description: `Giảm ${rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3}% sát thương mộc`,
        type: 'passive',
        effect: 'wood_resistance_pct',
        value: rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3
      },
      {
        id: 'tho_khang',
        name: 'Thổ Kháng',
        description: `Giảm ${rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3}% sát thương thổ`,
        type: 'passive',
        effect: 'earth_resistance_pct',
        value: rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3
      },
      {
        id: 'thuy_khang',
        name: 'Thủy Kháng',
        description: `Giảm ${rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3}% sát thương thủy`,
        type: 'passive',
        effect: 'water_resistance_pct',
        value: rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3
      },
      {
        id: 'hoa_khang',
        name: 'Hỏa Kháng',
        description: `Giảm ${rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3}% sát thương hỏa`,
        type: 'passive',
        effect: 'fire_resistance_pct',
        value: rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3
      }
    ];

    const shoesPassives = [
      {
        id: 'anh_bo',
        name: 'Ảnh Bộ',
        description: `+${rarity === 'rare' ? 2 : rarity === 'epic' ? 3 : 5}% EVA`,
        type: 'passive',
        effect: 'evasion_bonus_pct',
        value: rarity === 'rare' ? 2 : rarity === 'epic' ? 3 : 5
      },
      {
        id: 'phong_tuc',
        name: 'Phong Tức',
        description: `+${rarity === 'rare' ? 3 : rarity === 'epic' ? 5 : 7}% SPD`,
        type: 'passive',
        effect: 'speed_bonus_pct',
        value: rarity === 'rare' ? 3 : rarity === 'epic' ? 5 : 7
      },
      {
        id: 'luu_anh',
        name: 'Lưu Ảnh',
        description: `+${rarity === 'rare' ? 2 : rarity === 'epic' ? 3 : 5}% ACC`,
        type: 'passive',
        effect: 'accuracy_bonus_pct',
        value: rarity === 'rare' ? 2 : rarity === 'epic' ? 3 : 5
      },
      {
        id: 'khi_thuan',
        name: 'Khí Thuẫn',
        description: `Giảm ${rarity === 'rare' ? 20 : rarity === 'epic' ? 30 : 50}% DoT damage`,
        type: 'passive',
        effect: 'dot_damage_reduction_pct',
        value: rarity === 'rare' ? 20 : rarity === 'epic' ? 30 : 50
      },
      {
        id: 'kim_khang',
        name: 'Kim Kháng',
        description: `Giảm ${rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3}% sát thương kim`,
        type: 'passive',
        effect: 'metal_resistance_pct',
        value: rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3
      },
      {
        id: 'moc_khang',
        name: 'Mộc Kháng',
        description: `Giảm ${rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3}% sát thương mộc`,
        type: 'passive',
        effect: 'wood_resistance_pct',
        value: rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3
      },
      {
        id: 'tho_khang',
        name: 'Thổ Kháng',
        description: `Giảm ${rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3}% sát thương thổ`,
        type: 'passive',
        effect: 'earth_resistance_pct',
        value: rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3
      },
      {
        id: 'thuy_khang',
        name: 'Thủy Kháng',
        description: `Giảm ${rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3}% sát thương thủy`,
        type: 'passive',
        effect: 'water_resistance_pct',
        value: rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3
      },
      {
        id: 'hoa_khang',
        name: 'Hỏa Kháng',
        description: `Giảm ${rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3}% sát thương hỏa`,
        type: 'passive',
        effect: 'fire_resistance_pct',
        value: rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3
      }
    ];

    // Ring passives
    const ringPassives = [
      {
        id: 'tinh_thuc',
        name: 'Tinh Thức',
        description: `+${rarity === 'rare' ? 3 : rarity === 'epic' ? 6 : 9}% skill damage`,
        type: 'passive',
        effect: 'skill_damage_bonus_pct',
        value: rarity === 'rare' ? 3 : rarity === 'epic' ? 6 : 9
      },
      {
        id: 'minh_tam',
        name: 'Minh Tâm',
        description: `+${rarity === 'rare' ? 2 : rarity === 'epic' ? 5 : 8}% MP`,
        type: 'passive',
        effect: 'mp_bonus_pct',
        value: rarity === 'rare' ? 2 : rarity === 'epic' ? 5 : 8
      },
      {
        id: 'linh_van',
        name: 'Linh Vận',
        description: `+${rarity === 'rare' ? 1.5 : rarity === 'epic' ? 3 : 4.5}% CR`,
        type: 'passive',
        effect: 'critical_bonus_pct',
        value: rarity === 'rare' ? 1.5 : rarity === 'epic' ? 3 : 4.5
      },
      {
        id: 'kim_van',
        name: 'Kim Vận',
        description: `+${rarity === 'rare' ? 2 : rarity === 'epic' ? 4 : 6}% sát thương kim`,
        type: 'passive',
        effect: 'metal_damage_bonus_pct',
        value: rarity === 'rare' ? 2 : rarity === 'epic' ? 4 : 6
      },
      {
        id: 'moc_van',
        name: 'Mộc Vận',
        description: `+${rarity === 'rare' ? 2 : rarity === 'epic' ? 4 : 6}% sát thương mộc`,
        type: 'passive',
        effect: 'wood_damage_bonus_pct',
        value: rarity === 'rare' ? 2 : rarity === 'epic' ? 4 : 6
      },
      {
        id: 'tho_van',
        name: 'Thổ Vận',
        description: `+${rarity === 'rare' ? 2 : rarity === 'epic' ? 4 : 6}% sát thương thổ`,
        type: 'passive',
        effect: 'earth_damage_bonus_pct',
        value: rarity === 'rare' ? 2 : rarity === 'epic' ? 4 : 6
      },
      {
        id: 'thuy_van',
        name: 'Thủy Vận',
        description: `+${rarity === 'rare' ? 2 : rarity === 'epic' ? 4 : 6}% sát thương thủy`,
        type: 'passive',
        effect: 'water_damage_bonus_pct',
        value: rarity === 'rare' ? 2 : rarity === 'epic' ? 4 : 6
      },
      {
        id: 'hoa_van',
        name: 'Hỏa Vận',
        description: `+${rarity === 'rare' ? 2 : rarity === 'epic' ? 4 : 6}% sát thương hỏa`,
        type: 'passive',
        effect: 'fire_damage_bonus_pct',
        value: rarity === 'rare' ? 2 : rarity === 'epic' ? 4 : 6
      }
    ];

    // Pendant passives
    const pendantPassives = [
      {
        id: 'nhan_gian',
        name: 'Nhan Giản',
        description: `+${rarity === 'rare' ? 1.5 : rarity === 'epic' ? 3 : 4.5}% SPD`,
        type: 'passive',
        effect: 'speed_bonus_pct',
        value: rarity === 'rare' ? 1.5 : rarity === 'epic' ? 3 : 4.5
      },
      {
        id: 'minh_tam',
        name: 'Minh Tâm',
        description: `+${rarity === 'rare' ? 3 : rarity === 'epic' ? 6 : 9}% MP`,
        type: 'passive',
        effect: 'mp_bonus_pct',
        value: rarity === 'rare' ? 3 : rarity === 'epic' ? 6 : 9
      },
      {
        id: 'kim_van',
        name: 'Kim Vận',
        description: `+${rarity === 'rare' ? 2 : rarity === 'epic' ? 4 : 6}% sát thương kim`,
        type: 'passive',
        effect: 'metal_damage_bonus_pct',
        value: rarity === 'rare' ? 2 : rarity === 'epic' ? 4 : 6
      },
      {
        id: 'moc_van',
        name: 'Mộc Vận',
        description: `+${rarity === 'rare' ? 2 : rarity === 'epic' ? 4 : 6}% sát thương mộc`,
        type: 'passive',
        effect: 'wood_damage_bonus_pct',
        value: rarity === 'rare' ? 2 : rarity === 'epic' ? 4 : 6
      },
      {
        id: 'tho_van',
        name: 'Thổ Vận',
        description: `+${rarity === 'rare' ? 2 : rarity === 'epic' ? 4 : 6}% sát thương thổ`,
        type: 'passive',
        effect: 'earth_damage_bonus_pct',
        value: rarity === 'rare' ? 2 : rarity === 'epic' ? 4 : 6
      },
      {
        id: 'thuy_van',
        name: 'Thủy Vận',
        description: `+${rarity === 'rare' ? 2 : rarity === 'epic' ? 4 : 6}% sát thương thủy`,
        type: 'passive',
        effect: 'water_damage_bonus_pct',
        value: rarity === 'rare' ? 2 : rarity === 'epic' ? 4 : 6
      },
      {
        id: 'hoa_van',
        name: 'Hỏa Vận',
        description: `+${rarity === 'rare' ? 2 : rarity === 'epic' ? 4 : 6}% sát thương hỏa`,
        type: 'passive',
        effect: 'fire_damage_bonus_pct',
        value: rarity === 'rare' ? 2 : rarity === 'epic' ? 4 : 6
      }
    ];

    // Get the appropriate passive pool based on equipment type
    let passivePool = [];
    if (equipmentType === 'armor') {
      passivePool = armorPassives;
    } else if (equipmentType === 'pants') {
      passivePool = pantsPassives;
    } else if (equipmentType === 'shoes' || equipmentType === 'boots') {
      passivePool = shoesPassives;
    } else if (equipmentType === 'ring') {
      passivePool = ringPassives;
    } else if (equipmentType === 'pendant') {
      passivePool = pendantPassives;
    } else {
      return []; // Other equipment types don't have passives
    }

    // Randomly select passives (no duplicates)
    const shuffled = [...passivePool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, passiveCount);

    return selected;
  },

  // Get set bonus configuration based on set type and rarity
  getSetBonusConfig(setType, rarity) {
    if (setType === 'VIT') {
      const vitBonus = {
        'common': {
          type: 'set_bonus',
          stat: 'VIT',
          value: 15,
          description: 'Tăng 15 VIT'
        },
        'uncommon': {
          type: 'set_bonus',
          stat: 'VIT',
          value: 35,
          description: 'Tăng 35 VIT'
        },
        'rare': {
          type: 'set_bonus',
          stat: 'VIT',
          value: 60,
          description: 'Tăng 60 VIT + giảm 3% sát thương',
          effects: {
            damage_reduction_pct: 3
          }
        },
        'epic': {
          type: 'set_bonus',
          stat: 'VIT',
          value: 90,
          description: 'Tăng 90 VIT + giảm 5% sát thương nhận, nếu hp > 70%, tăng 5% def',
          effects: {
            damage_reduction_pct: 5,
            conditional_def_buff_pct: 5,
            conditional_hp_threshold: 0.7
          }
        },
        'legendary': {
          type: 'set_bonus',
          stat: 'VIT',
          value: 140,
          description: 'Tăng 140 VIT + giảm 7% sát thương nhận, nếu hp > 70%, tăng 10% def, hồi 1% hp mp mỗi lượt',
          effects: {
            damage_reduction_pct: 7,
            conditional_def_buff_pct: 10,
            conditional_hp_threshold: 0.7,
            per_turn_regen_hp_pct: 1,
            per_turn_regen_mp_pct: 1
          }
        }
      };
      return vitBonus[rarity] || null;
    } else if (setType === 'DEX') {
      const dexBonus = {
        'common': {
          type: 'set_bonus',
          stat: 'DEX',
          value: 20,
          description: 'Tăng 20 DEX'
        },
        'uncommon': {
          type: 'set_bonus',
          stat: 'DEX',
          value: 45,
          description: 'Tăng 45 DEX'
        },
        'rare': {
          type: 'set_bonus',
          stat: 'DEX',
          value: 75,
          description: 'Tăng 75 DEX + 2% eva',
          effects: {
            evasion_bonus_pct: 2
          }
        },
        'epic': {
          type: 'set_bonus',
          stat: 'DEX',
          value: 110,
          description: 'Tăng 110 DEX + 5% Eva + 5% speed',
          effects: {
            evasion_bonus_pct: 5,
            speed_bonus_pct: 5
          }
        },
        'legendary': {
          type: 'set_bonus',
          stat: 'DEX',
          value: 160,
          description: 'Tăng 160 DEX + 10% Eva + 7% speed + né thành công phản lại 10% sát thương',
          effects: {
            evasion_bonus_pct: 10,
            speed_bonus_pct: 7,
            counter_attack_on_evade_pct: 10
          }
        }
      };
      return dexBonus[rarity] || null;
    }

    return null;
  },

  // Randomize equipment stats based on rarity
  randomizeEquipmentStats(rarity, equipmentName, equipmentType, setId) {
    const stats = {};

    // New stat pool: only core base stats (like weapons)
    const coreStatPool = ['STR', 'INT', 'DEX', 'VIT', 'LUK'];

    // Rarity config: sub-stat lines and min-max values (different for ring/pendant)
    let rarityConfig;
    if (equipmentType === 'ring') {
      // Ring config: starts from uncommon
      rarityConfig = {
        'uncommon': { lines: 2, minValue: 3, maxValue: 7, mainIntMin: 20, mainIntMax: 20 },
        'rare': { lines: 3, minValue: 6, maxValue: 12, mainIntMin: 50, mainIntMax: 50 },
        'epic': { lines: 4, minValue: 10, maxValue: 18, mainIntMin: 85, mainIntMax: 85 },
        'legendary': { lines: 5, minValue: 16, maxValue: 28, mainIntMin: 125, mainIntMax: 125 }
      };
    } else if (equipmentType === 'pendant') {
      // Pendant config: starts from uncommon (main stat is LUK)
      rarityConfig = {
        'uncommon': { lines: 2, minValue: 3, maxValue: 7, mainLukMin: 18, mainLukMax: 18 },
        'rare': { lines: 3, minValue: 6, maxValue: 12, mainLukMin: 40, mainLukMax: 40 },
        'epic': { lines: 4, minValue: 10, maxValue: 18, mainLukMin: 65, mainLukMax: 65 },
        'legendary': { lines: 5, minValue: 16, maxValue: 28, mainLukMin: 110, mainLukMax: 110 }
      };
    } else {
      // Armor/pants/shoes config
      rarityConfig = {
        'common': { lines: 2, minValue: 1, maxValue: 3 },
        'uncommon': { lines: 2, minValue: 3, maxValue: 7 },
        'rare': { lines: 3, minValue: 6, maxValue: 12 },
        'epic': { lines: 4, minValue: 10, maxValue: 18 },
        'legendary': { lines: 5, minValue: 16, maxValue: 28 }
      };
    }

    const config = rarityConfig[rarity];
    if (!config) {
      // Fallback for common rarity ring/pendant (shouldn't happen, but just in case)
      return stats;
    }

    // Roll main INT for ring, main LUK for pendant (similar to main STR for weapons)
    if (equipmentType === 'ring' && config.mainIntMin !== undefined) {
      const mainINT = this.randBetween(config.mainIntMin, config.mainIntMax);
      stats['__main_stats'] = { INT: mainINT };
    } else if (equipmentType === 'pendant' && config.mainLukMin !== undefined) {
      const mainLUK = this.randBetween(config.mainLukMin, config.mainLukMax);
      stats['__main_stats'] = { LUK: mainLUK };
    }

    // Roll sub-stats from core stat pool
    const shuffled = [...coreStatPool].sort(() => Math.random() - 0.5);
    const pickCount = Math.min(config.lines, shuffled.length);
    for (let i = 0; i < pickCount; i++) {
      const key = shuffled[i];
      const val = this.randBetween(config.minValue, config.maxValue);
      stats[key] = (stats[key] || 0) + val;
    }

    // Store set_id and set_type for set bonus checking (not applied here, only when 3 items equipped)
    if (setId) {
      const setType = this.getSetType(setId);
      if (setType) {
        stats['__set_id'] = setId;
        stats['__set_type'] = setType;
      }
    }

    // Add passives for rare+ equipment (Địa/Thiên/Thần)
    if (['rare', 'epic', 'legendary'].includes(rarity)) {
      const passives = this.buildEquipmentPassives(rarity, equipmentType);
      if (passives.length > 0) {
        stats['__passives'] = passives;
      }
    }

    return stats;
  },

  // Map hiển thị loại trang bị
  getEquipTypeDisplayName(type) {
    const map = {
      'armor': 'Áo Giáp',
      'pants': 'Quần',
      'boots': 'Giày',
      'ring': 'Nhẫn',
      'pendant': 'Ngọc Bội',
      'earrings': 'Hoa Tai'
    };
    return map[type] || type;
  },

  async execute(interaction, args) {
    try {
      const userId = interaction.user.id;
      const username = interaction.user.username;

      if (!(await playerManager.hasStartedGame(userId))) {
        const notStartedEmbed = playerManager.createNotStartedEmbed();
        await interaction.reply({ embeds: [notStartedEmbed] });
        return;
      }

      // Reload items to ensure fresh data
      await itemLoader.reload();

      // Không có args: mở menu chính
      if (!args || args.length === 0) {
        await this.showMainMenu(interaction, userId);
        return;
      }

      // Có args: chế tạo trực tiếp theo ID
      const itemId = args[0];
      await itemLoader.loadAllItems();
      const item = itemLoader.getItemInfo(itemId);

      if (!item) {
        await interaction.reply({ content: '❌ Không tìm thấy vật phẩm với ID này!', ephemeral: true });
        return;
      }

      // Phân biệt weapon và equipment
      if (item.type && ['sword', 'spear', 'staff', 'fan', 'bow', 'dagger', 'axe', 'hammer', 'whip', 'glove'].includes(item.type)) {
        // Là vũ khí
        await this.craftWeapon(interaction, userId, username, itemId);
      } else if (item.category === 'equipment') {
        // Là trang bị
        await this.craftEquipment(interaction, userId, username, itemId);
      } else {
        await interaction.reply({ content: '❌ Vật phẩm này không thể chế tạo!', ephemeral: true });
      }
    } catch (error) {
      console.error('Error in craft execute:', error);
      await interaction.reply({ content: '❌ Có lỗi xảy ra khi hiển thị thông tin!', ephemeral: true });
    }
  },

  // Tính EXP cần để nâng cấp lò rèn
  getForgeExpRequired(level) {
    // Level 1->2: 50 exp, Level 2->3: 100 exp, Level 3->4: 200 exp, ...
    return 50 * Math.pow(2, level - 1);
  },

  // Menu chính - chỉ 3 button
  async showMainMenu(interaction, userId) {
    const embed = new EmbedBuilder()
      .setColor('#8B4513')
      .setTitle('🧰 Chế Tạo')
      .setDescription(`${this.createSeparator()}\nChọn loại vật phẩm bạn muốn chế tạo hoặc xem thông tin lò rèn.`)
      .setTimestamp();

    // Chỉ 3 button chính
    const weaponButton = new ButtonBuilder()
      .setCustomId('craft_tab_weapon')
      .setLabel('⚔️ Vũ Khí')
      .setStyle(ButtonStyle.Primary);

    const equipmentButton = new ButtonBuilder()
      .setCustomId('craft_tab_equipment')
      .setLabel('🛡️ Trang Bị')
      .setStyle(ButtonStyle.Primary);

    const forgeButton = new ButtonBuilder()
      .setCustomId('craft_tab_forge')
      .setLabel('⚒️ Lò Rèn')
      .setStyle(ButtonStyle.Secondary);

    const mainRow = new ActionRowBuilder().addComponents([weaponButton, equipmentButton, forgeButton]);

    await interaction.reply({ embeds: [embed], components: [mainRow] });
  },

  // Menu vũ khí (sau khi chọn tab Vũ Khí)
  async showWeaponMenu(interaction, userId) {
    const player = await playerManager.getPlayer(userId);
    const forgeLevel = player.forge?.forgeLevel || 1;
    const totalCrafted = player.forge?.totalCrafted || 0;
    const successCount = player.forge?.successCount || 0;
    const failureCount = player.forge?.failureCount || 0;
    const successRate = totalCrafted > 0 ? Math.round((successCount / totalCrafted) * 100) : 0;

    const embed = new EmbedBuilder()
      .setColor('#8B4513')
      .setTitle('⚔️ Chế Tạo Vũ Khí')
      .setDescription(`${this.createSeparator()}\n**Thông tin lò rèn và chế tạo vũ khí**`)
      .addFields(
        {
          name: '🔥 **Level Lò Rèn**',
          value: `**${forgeLevel}** (Tỉ lệ thành công: **${55 + (forgeLevel - 1) * 3}%**)`,
          inline: true
        },
        {
          name: '📊 **Thống Kê**',
          value: `**Tổng**: ${totalCrafted} | **Thành công**: ${successCount} | **Thất bại**: ${failureCount}`,
          inline: true
        },
        {
          name: '📈 **Tỉ Lệ**',
          value: `**${successRate}%**`,
          inline: true
        },
        {
          name: '⚔️ **Chọn Ngũ Hành Vũ Khí**',
          value: 'Nhấn vào các button bên dưới để xem danh sách vũ khí theo ngũ hành',
          inline: false
        }
      )
      .setFooter({ text: 'Sử dụng fcraft <id_vu_khi> để chế tạo vũ khí cụ thể' });

    const elementButtons = [
      new ButtonBuilder().setCustomId('craft_element_kim').setLabel('⚔️ Kim').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('craft_element_moc').setLabel('🌳 Mộc').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('craft_element_thuy').setLabel('💧 Thủy').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('craft_element_hoa').setLabel('🔥 Hỏa').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('craft_element_tho').setLabel('🏔️ Thổ').setStyle(ButtonStyle.Secondary)
    ];

    const elementRow1 = new ActionRowBuilder().addComponents(elementButtons.slice(0, 3));
    const elementRow2 = new ActionRowBuilder().addComponents(elementButtons.slice(3, 5));
    const backButton = new ButtonBuilder()
      .setCustomId('craft_back_main')
      .setLabel('🔙 Quay Lại')
      .setStyle(ButtonStyle.Secondary);
    const backRow = new ActionRowBuilder().addComponents(backButton);

    await interaction.update({ embeds: [embed], components: [elementRow1, elementRow2, backRow] });
  },

  // Menu trang bị (sau khi chọn tab Trang Bị)
  async showEquipmentMenu(interaction, userId) {
    const player = await playerManager.getPlayer(userId);
    const forgeLevel = player.forge?.forgeLevel || 1;
    const totalCrafted = player.forge?.totalCrafted || 0;
    const successCount = player.forge?.successCount || 0;
    const failureCount = player.forge?.failureCount || 0;
    const successRate = totalCrafted > 0 ? Math.round((successCount / totalCrafted) * 100) : 0;

    const embed = new EmbedBuilder()
      .setColor('#8B4513')
      .setTitle('🛡️ Chế Tạo Trang Bị')
      .setDescription(`${this.createSeparator()}\n**Thông tin lò rèn và chế tạo trang bị**`)
      .addFields(
        {
          name: '🔥 **Level Lò Rèn**',
          value: `**${forgeLevel}** (Tỉ lệ thành công: **${55 + (forgeLevel - 1) * 3}%**)`,
          inline: true
        },
        {
          name: '📊 **Thống Kê**',
          value: `**Tổng**: ${totalCrafted} | **Thành công**: ${successCount} | **Thất bại**: ${failureCount}`,
          inline: true
        },
        {
          name: '📈 **Tỉ Lệ**',
          value: `**${successRate}%**`,
          inline: true
        },
        {
          name: '🛡️ **Chọn Loại Trang Bị**',
          value: 'Nhấn vào các button bên dưới để xem danh sách trang bị theo loại',
          inline: false
        }
      )
      .setFooter({ text: 'Sử dụng fcraft <id_trang_bi> để chế tạo nhanh' });

    const typeButtons = [
      new ButtonBuilder().setCustomId('craft_type_armor').setLabel('🛡️ Áo Giáp').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('craft_type_pants').setLabel('👖 Quần').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('craft_type_boots').setLabel('👟 Giày').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('craft_type_ring').setLabel('💍 Nhẫn').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('craft_type_pendant').setLabel('🔮 Ngọc Bội').setStyle(ButtonStyle.Secondary)
    ];

    const row1 = new ActionRowBuilder().addComponents(typeButtons.slice(0, 3));
    const row2 = new ActionRowBuilder().addComponents(typeButtons.slice(3, 5));
    const backButton = new ButtonBuilder()
      .setCustomId('craft_back_main')
      .setLabel('🔙 Quay Lại')
      .setStyle(ButtonStyle.Secondary);
    const backRow = new ActionRowBuilder().addComponents(backButton);

    await interaction.update({ embeds: [embed], components: [row1, row2, backRow] });
  },

  // UI riêng cho Lò Rèn
  async showForgeMenu(interaction, userId) {
    const player = await playerManager.getPlayer(userId);
    const forgeLevel = player.forge?.forgeLevel || 1;
    const forgeExp = player.forge?.forgeExp || 0;
    const totalCrafted = player.forge?.totalCrafted || 0;
    const successCount = player.forge?.successCount || 0;
    const failureCount = player.forge?.failureCount || 0;
    const successRate = totalCrafted > 0 ? Math.round((successCount / totalCrafted) * 100) : 0;

    const baseSuccessRate = 55;
    const levelBonus = (forgeLevel - 1) * 3;
    const currentSuccessRate = baseSuccessRate + levelBonus; // Level 15 = 55 + 42 = 97%

    // Tính EXP cần để nâng cấp
    const expRequired = this.getForgeExpRequired(forgeLevel);
    const expProgress = Math.min((forgeExp / expRequired) * 100, 100);
    const canUpgrade = forgeExp >= expRequired;

    // Tạo progress bar
    const progressBarLength = 20;
    const filled = Math.floor((expProgress / 100) * progressBarLength);
    const empty = progressBarLength - filled;
    const progressBar = '█'.repeat(filled) + '░'.repeat(empty);

    const embed = new EmbedBuilder()
      .setColor('#FF8C00')
      .setTitle('⚒️ **Lò Rèn**')
      .setDescription(`${this.createSeparator()}\n**Thông tin chi tiết về lò rèn và hệ thống chế tạo**`)
      .addFields(
        {
          name: '🔥 **Thông Số Lò Rèn**',
          value: `**Level hiện tại**: ${forgeLevel}\n**Tỉ lệ cơ bản**: ${baseSuccessRate}%\n**Bonus level**: +${levelBonus}%\n**Tỉ lệ hiện tại**: **${currentSuccessRate}%**`,
          inline: false
        },
        {
          name: '📊 **Thống Kê Chi Tiết**',
          value: `**Tổng số lần chế tạo**: ${totalCrafted}\n**Thành công**: ${successCount} (${successRate}%)\n**Thất bại**: ${failureCount} (${100 - successRate}%)\n**Lần chế tạo gần nhất**: ${totalCrafted > 0 ? 'Đã chế tạo' : 'Chưa chế tạo'}`,
          inline: false
        },
        {
          name: '⚡ **EXP Rèn**',
          value: `**EXP hiện tại**: ${forgeExp} / ${expRequired}\n**Tiến độ**: ${expProgress.toFixed(1)}%\n\`${progressBar}\`\n${canUpgrade ? '✅ **Có thể nâng cấp!**' : `Cần thêm **${expRequired - forgeExp}** EXP để nâng cấp`}`,
          inline: false
        },
        {
          name: '📈 **Bảng Tỉ Lệ Theo Level**',
          value: this.createForgeLevelTable(),
          inline: false
        },
        {
          name: '💡 **Cách Tăng EXP Rèn**',
          value: '• Chế tạo thành công: +10 EXP\n• Chế tạo thất bại: +5 EXP\n• Nâng cấp lò rèn để tăng tỉ lệ thành công!',
          inline: false
        }
      )
      .setFooter({ text: 'Sử dụng fcraft để quay lại menu chính' })
      .setTimestamp();

    const upgradeButton = new ButtonBuilder()
      .setCustomId('craft_forge_upgrade')
      .setLabel(canUpgrade ? '⬆️ Nâng Cấp Lò Rèn' : '🔒 Chưa Đủ EXP')
      .setStyle(canUpgrade ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!canUpgrade);

    const backButton = new ButtonBuilder()
      .setCustomId('craft_back_main')
      .setLabel('🔙 Quay Lại')
      .setStyle(ButtonStyle.Secondary);

    const buttonRow = new ActionRowBuilder().addComponents([upgradeButton, backButton]);

    await interaction.update({ embeds: [embed], components: [buttonRow] });
  },

  // Giữ lại hàm cũ để backward compatibility
  async showCraftMenu(interaction, userId) {
    await this.showMainMenu(interaction, userId, 'equipment');
  },

  // Hiển thị vũ khí theo ngũ hành
  async showWeaponsByElement(interaction, element, userId) {
    await itemLoader.loadAllItems();
    const weapons = Object.values(itemLoader.items).filter(item =>
      item.type && item.element === element && item.crafting
    );

    if (weapons.length === 0) {
      const noWeaponsEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ **Không Có Vũ Khí**')
        .setDescription(`Không tìm thấy vũ khí ngũ hành **${this.getElementDisplayName(element)}**!`)
        .setFooter({ text: 'Quay lại menu chính' })
        .setTimestamp();

      const backButton = new ButtonBuilder()
        .setCustomId('craft_back_main')
        .setLabel('🔙 Quay Lại')
        .setStyle(ButtonStyle.Secondary);

      const backRow = new ActionRowBuilder().addComponents(backButton);
      await interaction.update({ embeds: [noWeaponsEmbed], components: [backRow] });
      return;
    }

    const player = await playerManager.getPlayer(userId);
    const weaponsByRarity = {};
    weapons.forEach(weapon => {
      const rarity = weapon.rarity || 'common';
      if (!weaponsByRarity[rarity]) weaponsByRarity[rarity] = [];
      weaponsByRarity[rarity].push(weapon);
    });

    const elementEmoji = this.getElementEmoji(element);
    const elementName = this.getElementDisplayName(element);

    const embed = new EmbedBuilder()
      .setColor(this.getRarityColor(element === 'kim' ? 'rare' : 'epic'))
      .setTitle(`${elementEmoji} **Vũ Khí ${elementName}**`)
      .setDescription(`${this.createSeparator()}\n**Danh sách vũ khí ngũ hành ${elementName}**\n\n💡 **Sử dụng**: \`fcraft <id_vu_khi>\` để chế tạo vũ khí`);

    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    rarityOrder.forEach(rarity => {
      if (weaponsByRarity[rarity] && weaponsByRarity[rarity].length > 0) {
        const weaponsList = weaponsByRarity[rarity];
        const rarityEmoji = this.getRarityEmoji(rarity);
        const chunks = this.chunkArray(weaponsList, 3);

        chunks.forEach((chunk) => {
          const weaponsListFormatted = chunk.map(weapon => {
            const materials = Object.entries(weapon.crafting || {}).map(([id, qty]) => {
              const materialInfo = itemLoader.getItemInfo(id);
              const playerMaterial = player.inventory.items.find(item => item.id === id);
              const availableQty = playerMaterial ? playerMaterial.quantity : 0;
              const materialName = materialInfo ? materialInfo.name : id;
              const materialEmoji = materialInfo ? materialInfo.emoji : '❓';
              return `${materialEmoji} **${materialName}** x${qty} (còn: ${availableQty})`;
            }).join(', ');

            const rarityEmoji = this.getRarityEmoji(weapon.rarity || 'common');
            const weaponTypeName = this.getWeaponTypeDisplayName(weapon.type);
            const weaponId = Object.keys(itemLoader.items).find(k => itemLoader.items[k] === weapon);
            return `${rarityEmoji} **${weapon.name}** (${weaponTypeName}, ID: \`${weaponId}\`)\n└ **Nguyên liệu**: ${materials}`;
          }).join('\n\n');

          embed.addFields({ name: '\u200B', value: weaponsListFormatted, inline: false });
        });
      }
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('craft_select_weapon')
      .setPlaceholder('Chọn vũ khí để chế tạo...');

    weapons.forEach(weapon => {
      const rarityEmoji = this.getRarityEmoji(weapon.rarity || 'common');
      const weaponId = Object.keys(itemLoader.items).find(key => itemLoader.items[key] === weapon);
      if (weaponId) {
        selectMenu.addOptions({ label: `${rarityEmoji} ${weapon.name}`, description: `ID: ${weaponId}`, value: weaponId });
      }
    });

    const backButton = new ButtonBuilder()
      .setCustomId('craft_back_main')
      .setLabel('🔙 Quay Lại')
      .setStyle(ButtonStyle.Secondary);

    const backRow = new ActionRowBuilder().addComponents(backButton);
    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.update({ embeds: [embed], components: [selectRow, backRow] });
  },

  // Hiển thị thông tin chi tiết lò rèn
  async showDetailedForgeInfo(interaction) {
    const userId = interaction.user.id;
    const player = await playerManager.getPlayer(userId);
    const forgeLevel = player.forge?.forgeLevel || 1;
    const totalCrafted = player.forge?.totalCrafted || 0;
    const successCount = player.forge?.successCount || 0;
    const failureCount = player.forge?.failureCount || 0;
    const successRate = totalCrafted > 0 ? Math.round((successCount / totalCrafted) * 100) : 0;

    const baseSuccessRate = 55;
    const levelBonus = (forgeLevel - 1) * 3;
    const currentSuccessRate = baseSuccessRate + levelBonus; // Level 15 = 55 + 42 = 97%

    const embed = new EmbedBuilder()
      .setColor('#FF8C00')
      .setTitle('⚒️ **Thông Tin Chi Tiết Lò Rèn**')
      .setDescription(`${this.createSeparator()}\n**Thông tin chi tiết về lò rèn và hệ thống chế tạo vũ khí và trang bị**`)
      .addFields(
        {
          name: '🔥 **Thông Số Lò Rèn**',
          value: `**Level hiện tại**: ${forgeLevel}\n**Tỉ lệ cơ bản**: ${baseSuccessRate}%\n**Bonus level**: +${levelBonus}%\n**Tỉ lệ hiện tại**: **${currentSuccessRate}%**`,
          inline: false
        },
        {
          name: '📊 **Thống Kê Chi Tiết**',
          value: `**Tổng số lần chế tạo**: ${totalCrafted}\n**Thành công**: ${successCount} (${successRate}%)\n**Thất bại**: ${failureCount} (${100 - successRate}%)\n**Lần chế tạo gần nhất**: ${totalCrafted > 0 ? 'Đã chế tạo' : 'Chưa chế tạo'}`,
          inline: false
        },
        {
          name: '📈 **Bảng Tỉ Lệ Theo Level**',
          value: this.createForgeLevelTable(),
          inline: false
        },
        {
          name: '💡 **Gợi Ý Nâng Cấp**',
          value: 'Nâng cấp lò rèn sẽ tăng tỉ lệ thành công chế tạo vũ khí và trang bị. Mỗi level tăng 5% tỉ lệ thành công, tối đa 95%.',
          inline: false
        }
      )
      .setFooter({ text: 'Sử dụng fcraft để quay lại menu chính' })
      .setTimestamp();

    const backButton = new ButtonBuilder()
      .setCustomId('craft_back_main')
      .setLabel('🔙 Quay Lại')
      .setStyle(ButtonStyle.Secondary);

    const backRow = new ActionRowBuilder().addComponents(backButton);
    await interaction.update({ embeds: [embed], components: [backRow] });
  },

  async handleButton(interaction) {
    const { customId } = interaction;
    const userId = interaction.user.id;

    // Tab buttons
    if (customId === 'craft_tab_weapon') {
      await this.showWeaponMenu(interaction, userId);
      return;
    }
    if (customId === 'craft_tab_equipment') {
      await this.showEquipmentMenu(interaction, userId);
      return;
    }
    if (customId === 'craft_tab_forge') {
      await this.showForgeMenu(interaction, userId);
      return;
    }

    // Back to main menu
    if (customId === 'craft_back_main') {
      await this.showMainMenu(interaction, userId);
      return;
    }

    // Nâng cấp lò rèn
    if (customId === 'craft_forge_upgrade') {
      await this.upgradeForge(interaction, userId);
      return;
    }

    // Element buttons (weapon)
    if (customId.startsWith('craft_element_')) {
      const element = customId.replace('craft_element_', '');
      await this.showWeaponsByElement(interaction, element, userId);
      return;
    }

    // Forge info button (backward compatibility - redirect to forge menu)
    if (customId === 'craft_forge_info') {
      await this.showForgeMenu(interaction, userId);
      return;
    }

    // Equipment type buttons
    if (customId.startsWith('craft_type_')) {
      const type = customId.replace('craft_type_', '');
      await this.showEquipmentByType(interaction, type, userId);
    }
  },

  async handleSelectMenu(interaction) {
    try {
      const { customId, values } = interaction;
      const userId = interaction.user.id;

      // Weapon select menu
      if (customId === 'craft_select_weapon') {
        const selectedId = values[0];
        if (!selectedId) {
          await interaction.reply({ content: '❌ Không có vũ khí nào được chọn!', ephemeral: true });
          return;
        }
        await this.showQuantitySelectWeapon(interaction, userId, selectedId);
        return;
      } else if (customId.startsWith('craft_select_qty_weapon:')) {
        const selectedId = customId.split(':')[1];
        const qtyValue = values[0];
        const player = await playerManager.getPlayer(userId);
        const weapon = itemLoader.items[selectedId];
        if (!weapon) {
          await interaction.reply({ content: '❌ Không tìm thấy vũ khí!', ephemeral: true });
          return;
        }
        const maxCraft = this.getMaxCraftableWeapon(player, weapon);
        if (maxCraft < 1) {
          await interaction.reply({ content: '⚠️ Đạo hữu không đủ nguyên liệu chế tạo', ephemeral: true });
          return;
        }
        let quantity = qtyValue === 'max' ? maxCraft : parseInt(qtyValue, 10);
        if (!quantity || quantity < 1) {
          await interaction.reply({ content: '❌ Số lượng không hợp lệ!', ephemeral: true });
          return;
        }
        if (quantity > maxCraft) quantity = maxCraft;

        if (quantity === 1) {
          await this.craftSelectedWeapon(interaction, selectedId, userId);
        } else {
          await this.craftSelectedWeaponBatch(interaction, selectedId, userId, quantity);
        }
        return;
      }

      // Equipment select menu
      if (customId === 'craft_select_equipment') {
        const selectedId = values[0];
        if (!selectedId) {
          await interaction.reply({ content: '❌ Không có trang bị nào được chọn!', ephemeral: true });
          return;
        }
        await this.showQuantitySelect(interaction, userId, selectedId);
        return;
      } else if (customId.startsWith('craft_select_qty:')) {
        const selectedId = customId.split(':')[1];
        const qtyValue = values[0];
        const player = await playerManager.getPlayer(userId);
        const equip = itemLoader.items[selectedId];
        if (!equip) {
          await interaction.reply({ content: '❌ Không tìm thấy trang bị!', ephemeral: true });
          return;
        }
        const maxCraft = this.getMaxCraftable(player, equip);
        if (maxCraft < 1) {
          await interaction.reply({ content: '⚠️ Đạo hữu không đủ nguyên liệu chế tạo', ephemeral: true });
          return;
        }
        let quantity = qtyValue === 'max' ? maxCraft : parseInt(qtyValue, 10);
        if (!quantity || quantity < 1) {
          await interaction.reply({ content: '❌ Số lượng không hợp lệ!', ephemeral: true });
          return;
        }
        if (quantity > maxCraft) quantity = maxCraft;

        if (quantity === 1) {
          await this.craftSelected(interaction, selectedId, userId);
        } else {
          await this.craftSelectedBatch(interaction, selectedId, userId, quantity);
        }
        return;
      }
    } catch (error) {
      console.error('❌ Error in craft handleSelectMenu:', error);
      await interaction.reply({ content: '❌ Có lỗi xảy ra khi xử lý lựa chọn!', ephemeral: true });
    }
  },

  async showEquipmentByType(interaction, type, userId) {
    try {
      // Reload items to ensure fresh data
      await itemLoader.reload();

      const equipments = Object.values(itemLoader.items).filter(item => item.category === 'equipment' && item.type === type && item.crafting);

      if (equipments.length === 0) {
        const noEmbed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('⚠️ Không Có Trang Bị')
          .setDescription(`Không tìm thấy trang bị loại **${this.getEquipTypeDisplayName(type)}**!`)
          .setFooter({ text: 'Quay lại menu chính' })
          .setTimestamp();

        const backButton = new ButtonBuilder().setCustomId('craft_back_main').setLabel('🔙 Quay Lại').setStyle(ButtonStyle.Secondary);
        const backRow = new ActionRowBuilder().addComponents(backButton);
        await interaction.update({ embeds: [noEmbed], components: [backRow] });
        return;
      }

      const player = await playerManager.getPlayer(userId);
      const byRarity = {};
      equipments.forEach(eq => {
        const rarity = eq.rarity || 'common';
        if (!byRarity[rarity]) byRarity[rarity] = [];
        byRarity[rarity].push(eq);
      });

      const embed = new EmbedBuilder()
        .setColor(this.getRarityColor('epic'))
        .setTitle(`🧰 Trang Bị - ${this.getEquipTypeDisplayName(type)}`)
        .setDescription(`${this.createSeparator()}\nDanh sách trang bị có thể chế tạo\n\nSử dụng: \`fcraft <id_trang_bi>\` để chế tạo nhanh`);

      const order = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

      order.forEach(r => {
        if (!byRarity[r] || byRarity[r].length === 0) return;
        const list = byRarity[r];
        const chunks = this.chunkArray(list, 3);
        chunks.forEach(chunk => {
          const value = chunk.map(eq => {
            const materials = Object.entries(eq.crafting || {}).map(([id, qty]) => {
              const info = itemLoader.getItemInfo(id);
              const have = player.inventory.items.find(i => i.id === id)?.quantity || 0;
              const emoji = info?.emoji || '❓';
              const name = info?.name || id;
              return `${emoji} **${name}** x${qty} (còn: ${have})`;
            }).join(', ');

            const id = Object.keys(itemLoader.items).find(k => itemLoader.items[k] === eq);
            const rarityEmoji = this.getRarityEmoji(eq.rarity || 'common');
            return `${rarityEmoji} **${eq.name}** (ID: \`${id}\`)\n└ Nguyên liệu: ${materials}`;
          }).join('\n\n');

          embed.addFields({ name: '\u200B', value, inline: false });
        });
      });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('craft_select_equipment')
        .setPlaceholder('Chọn trang bị để chế tạo...');

      equipments.forEach(eq => {
        const rarityEmoji = this.getRarityEmoji(eq.rarity || 'common');
        const id = Object.keys(itemLoader.items).find(k => itemLoader.items[k] === eq);
        if (id) {
          selectMenu.addOptions({ label: `${rarityEmoji} ${eq.name}`, description: `ID: ${id}`, value: id });
        }
      });

      const backButton = new ButtonBuilder().setCustomId('craft_back_main').setLabel('🔙 Quay Lại').setStyle(ButtonStyle.Secondary);
      const selectRow = new ActionRowBuilder().addComponents(selectMenu);
      const backRow = new ActionRowBuilder().addComponents(backButton);

      await interaction.update({ embeds: [embed], components: [selectRow, backRow] });
    } catch (error) {
      console.error('Error in showEquipmentByType:', error);
      await interaction.reply({ content: '❌ Có lỗi xảy ra khi hiển thị thông tin!', ephemeral: true });
    }
  },

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
    return chunks;
  },

  async craftEquipment(interaction, userId, username, equipmentId) {
    try {
      // Reload items to ensure fresh data
      await itemLoader.reload();
      const equipInfo = itemLoader.getItemInfo(equipmentId);
      const player = await playerManager.getPlayer(userId);

      if (!equipInfo || equipInfo.category !== 'equipment') {
        const errorEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('❌ Lỗi Chế Tạo Trang Bị')
          .setDescription('Không tìm thấy trang bị cần chế tạo hoặc ID không hợp lệ!')
          .addFields({ name: '💡 Gợi ý', value: 'Sử dụng `fcraft` để xem danh sách trang bị có thể chế tạo', inline: false });
        await interaction.reply({ embeds: [errorEmbed] });
        return;
      }

      // Ensure equipment has required properties
      if (!equipInfo.rarity) equipInfo.rarity = 'common';
      if (!equipInfo.type) equipInfo.type = 'armor';
      if (!equipInfo.name) equipInfo.name = equipmentId;

      const craftingMaterials = equipInfo.crafting || {};
      const missing = [];
      const available = [];

      for (const [materialId, requiredQty] of Object.entries(craftingMaterials)) {
        const invItem = player.inventory.items.find(item => item.id === materialId);
        const have = invItem ? invItem.quantity : 0;
        const info = itemLoader.getItemInfo(materialId);
        const name = info?.name || materialId;
        const emoji = info?.emoji || '❓';
        if (have < requiredQty) {
          missing.push({ name, emoji, have, requiredQty, missing: requiredQty - have });
        } else {
          available.push({ name, emoji, requiredQty });
        }
      }

      if (missing.length > 0) {
        const missingEmbed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('⚠️ Thiếu Nguyên Liệu Chế Tạo')
          .setDescription(`**${username}** không đủ nguyên liệu để chế tạo **${equipInfo.name}**!`)
          .addFields({
            name: '✅ Nguyên Liệu Đã Có',
            value: available.length > 0 ? available.map(m => `${m.emoji} **${m.name}**: ${m.requiredQty}`).join('\n') : 'Không',
            inline: false
          })
          .addFields({
            name: '❌ Nguyên Liệu Thiếu',
            value: missing.map(m => `${m.emoji} **${m.name}**: ${m.have}/${m.requiredQty} (Thiếu: ${m.missing})`).join('\n'),
            inline: false
          })
          .addFields({ name: '💡 Gợi ý', value: 'Dùng `fhunt`, `fpick`, `fmine` để lấy nguyên liệu.', inline: false });
        await interaction.reply({ embeds: [missingEmbed] });
        return;
      }

      // Tính toán tỉ lệ thành công dựa trên level lò rèn
      const forgeLevel = player.forge?.forgeLevel || 1;
      const baseSuccessRate = 55; // 55% cơ bản
      const levelBonus = (forgeLevel - 1) * 3; // Mỗi level tăng 3%
      const successRate = baseSuccessRate + levelBonus; // Level 15 = 55 + 42 = 97%

      // Thực hiện chế tạo trang bị
      const isSuccess = Math.random() * 100 < successRate;

      if (isSuccess) {
        // Chế tạo trang bị thành công
        // Trừ nguyên liệu
        for (const [materialId, requiredQty] of Object.entries(craftingMaterials)) {
          const invItem = player.inventory.items.find(item => item.id === materialId);
          if (invItem) {
            invItem.quantity -= requiredQty;
            if (invItem.quantity <= 0) {
              player.inventory.items = player.inventory.items.filter(item => item.id !== materialId);
            }
          }
        }

        // Thêm trang bị dạng instance (không stack)
        const equipInstance = {
          uid: `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`,
          id: equipmentId,
          createdAt: Date.now(),
          bonuses: this.randomizeEquipmentStats(equipInfo.rarity, equipInfo.name, equipInfo.type, equipInfo.set_id)
        };
        player.inventory.armors = player.inventory.armors || [];
        player.inventory.armors.push(equipInstance);

        // Cập nhật thống kê chế tạo và tích exp
        if (!player.forge) player.forge = { forgeLevel: 1, forgeExp: 0, totalCrafted: 0, successCount: 0, failureCount: 0, lastForge: 0 };
        player.forge.totalCrafted = (player.forge.totalCrafted || 0) + 1;
        player.forge.successCount = (player.forge.successCount || 0) + 1;
        player.forge.forgeExp = (player.forge.forgeExp || 0) + 10; // +10 EXP khi thành công
        player.forge.lastForge = Date.now();

        playerManager.savePlayers();

        const successEmbed = new EmbedBuilder()
          .setColor('#00C853')
          .setTitle('🎉 **Chế Tạo Trang Bị Thành Công!**')
          .setDescription(`${this.createSeparator()}\n**${username}** đã chế tạo thành công **${equipInfo.name}**!`)
          .addFields(
            { name: '🧰 **Trang Bị Nhận Được**', value: `${equipInfo.emoji} **${equipInfo.name}** ${this.getRarityEmoji(equipInfo.rarity)}`, inline: false },
            { name: '🔥 **Level Lò Rèn**', value: `**${forgeLevel}** (Tỉ lệ: **${successRate}%**)`, inline: true },
            { name: '📊 **Thống Kê**', value: `Tổng: ${player.forge.totalCrafted} | Thành công: ${player.forge.successCount} | Thất bại: ${player.forge.failureCount || 0}`, inline: true }
          )
          .addFields({
            name: '🔍 **Nguyên Liệu Đã Sử Dụng**', value: Object.entries(craftingMaterials).map(([id, qty]) => {
              const info = itemLoader.getItemInfo(id);
              return `${info?.emoji || '❓'} **${info?.name || id}**: ${qty}`;
            }).join('\n'), inline: false
          })
          .setTimestamp();

        await interaction.reply({ embeds: [successEmbed] });
      } else {
        // Chế tạo trang bị thất bại
        // Vẫn trừ nguyên liệu (thất bại cũng mất nguyên liệu)
        for (const [materialId, requiredQty] of Object.entries(craftingMaterials)) {
          const invItem = player.inventory.items.find(item => item.id === materialId);
          if (invItem) {
            invItem.quantity -= requiredQty;
            if (invItem.quantity <= 0) {
              player.inventory.items = player.inventory.items.filter(item => item.id !== materialId);
            }
          }
        }

        // Cập nhật thống kê chế tạo và tích exp
        if (!player.forge) player.forge = { forgeLevel: 1, forgeExp: 0, totalCrafted: 0, successCount: 0, failureCount: 0, lastForge: 0 };
        player.forge.totalCrafted = (player.forge.totalCrafted || 0) + 1;
        player.forge.failureCount = (player.forge.failureCount || 0) + 1;
        player.forge.forgeExp = (player.forge.forgeExp || 0) + 5; // +5 EXP khi thất bại
        player.forge.lastForge = Date.now();

        playerManager.savePlayers();

        const failureEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('💥 **Chế Tạo Trang Bị Thất Bại!**')
          .setDescription(`${this.createSeparator()}\n**${username}** đã thất bại khi chế tạo **${equipInfo.name}**!`)
          .addFields(
            { name: '🔥 **Level Lò Rèn**', value: `**${forgeLevel}** (Tỉ lệ: **${successRate}%**)`, inline: true },
            { name: '💔 **Hậu Quả**', value: 'Nguyên liệu đã bị mất do chế tạo thất bại!', inline: true }
          )
          .addFields({
            name: '🔍 **Nguyên Liệu Đã Mất**', value: Object.entries(craftingMaterials).map(([id, qty]) => {
              const info = itemLoader.getItemInfo(id);
              return `${info?.emoji || '❓'} **${info?.name || id}**: ${qty}`;
            }).join('\n'), inline: false
          })
          .addFields({
            name: '💡 **Gợi ý**',
            value: 'Nâng cấp lò rèn để tăng tỉ lệ thành công!',
            inline: false
          })
          .setTimestamp();

        await interaction.reply({ embeds: [failureEmbed] });
      }
    } catch (error) {
      console.error('Error in craftEquipment:', error);
      await interaction.reply({ content: '❌ Có lỗi xảy ra khi chế tạo trang bị!', ephemeral: true });
    }
  },

  async craftSelected(interaction, equipmentId, userId) {
    await itemLoader.loadAllItems();
    const equip = itemLoader.items[equipmentId];
    const player = await playerManager.getPlayer(userId);
    if (!equip || !player) {
      await interaction.reply({ content: '❌ Không tìm thấy dữ liệu cần thiết!', ephemeral: true });
      return;
    }

    // Ensure equipment has required properties
    if (!equip.rarity) equip.rarity = 'common';
    if (!equip.type) equip.type = 'armor';
    if (!equip.name) equip.name = equipmentId;

    // Kiểm tra nguyên liệu
    const missing = [];
    for (const [materialId, requiredQty] of Object.entries(equip.crafting || {})) {
      const have = player.inventory.items.find(i => i.id === materialId)?.quantity || 0;
      if (have < requiredQty) {
        const info = itemLoader.getItemInfo(materialId);
        missing.push(`${info?.name || materialId} (cần: ${requiredQty}, có: ${have})`);
      }
    }

    if (missing.length > 0) {
      await interaction.reply({ content: `❌ Thiếu nguyên liệu:\n${missing.join('\n')}`, ephemeral: true });
      return;
    }

    // Tính toán tỉ lệ thành công dựa trên level lò rèn
    const forgeLevel = player.forge?.forgeLevel || 1;
    const baseSuccessRate = 55;
    const levelBonus = (forgeLevel - 1) * 3;
    const successRate = baseSuccessRate + levelBonus; // Level 15 = 55 + 42 = 97%
    const isSuccess = Math.random() * 100 < successRate;

    if (isSuccess) {
      // Trừ vật liệu cho 1 lần
      for (const [materialId, req] of Object.entries(equip.crafting || {})) {
        const inv = player.inventory.items.find(i => i.id === materialId);
        if (inv) {
          inv.quantity -= req;
          if (inv.quantity <= 0) player.inventory.items = player.inventory.items.filter(i => i.id !== materialId);
        }
      }

      const equipInstance = {
        uid: `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`,
        id: equipmentId,
        createdAt: Date.now(),
        bonuses: this.randomizeEquipmentStats(equip.rarity, equip.name, equip.type, equip.set_id)
      };
      player.inventory.armors = player.inventory.armors || [];
      player.inventory.armors.push(equipInstance);

      // Cập nhật thống kê và tích exp
      if (!player.forge) player.forge = { forgeLevel: 1, forgeExp: 0, totalCrafted: 0, successCount: 0, failureCount: 0, lastForge: 0 };
      player.forge.totalCrafted = (player.forge.totalCrafted || 0) + 1;
      player.forge.successCount = (player.forge.successCount || 0) + 1;
      player.forge.forgeExp = (player.forge.forgeExp || 0) + 10; // +10 EXP khi thành công
      player.forge.lastForge = Date.now();

      playerManager.savePlayers();

      const embed = new EmbedBuilder()
        .setColor(0x00FF88)
        .setTitle('🧰 Chế Tạo Thành Công!')
        .setDescription(`**${equip.name}** đã được chế tạo!\n\n🆔 **ID**: \`${equipInstance.uid}\`\n💡 Sử dụng \`fitem ${equipInstance.uid}\` để xem thông tin chi tiết`)
        .addFields(
          { name: '🔥 **Level Lò Rèn**', value: `**${forgeLevel}** (Tỉ lệ: **${successRate}%**)`, inline: true }
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } else {
      // Thất bại: mất nguyên liệu
      for (const [materialId, req] of Object.entries(equip.crafting || {})) {
        const inv = player.inventory.items.find(i => i.id === materialId);
        if (inv) {
          inv.quantity -= req;
          if (inv.quantity <= 0) player.inventory.items = player.inventory.items.filter(i => i.id !== materialId);
        }
      }

      // Cập nhật thống kê và tích exp
      if (!player.forge) player.forge = { forgeLevel: 1, forgeExp: 0, totalCrafted: 0, successCount: 0, failureCount: 0, lastForge: 0 };
      player.forge.totalCrafted = (player.forge.totalCrafted || 0) + 1;
      player.forge.failureCount = (player.forge.failureCount || 0) + 1;
      player.forge.forgeExp = (player.forge.forgeExp || 0) + 5; // +5 EXP khi thất bại
      player.forge.lastForge = Date.now();

      playerManager.savePlayers();

      const embed = new EmbedBuilder()
        .setColor(0xFF5555)
        .setTitle('💥 Chế Tạo Thất Bại!')
        .setDescription(`**${equip.name}** chế tạo thất bại! Nguyên liệu đã bị mất.`)
        .addFields(
          { name: '🔥 **Level Lò Rèn**', value: `**${forgeLevel}** (Tỉ lệ: **${successRate}%**)`, inline: true },
          { name: '💡 **Gợi ý**', value: 'Nâng cấp lò rèn để tăng tỉ lệ thành công!', inline: false }
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  },

  async craftSelectedBatch(interaction, equipmentId, userId, quantity) {
    await itemLoader.loadAllItems();
    const equip = itemLoader.items[equipmentId];
    const player = await playerManager.getPlayer(userId);
    if (!equip || !player) {
      await interaction.reply({ content: '❌ Không tìm thấy dữ liệu cần thiết!', ephemeral: true });
      return;
    }

    // Ensure equipment has required properties
    if (!equip.rarity) equip.rarity = 'common';
    if (!equip.type) equip.type = 'armor';
    if (!equip.name) equip.name = equipmentId;

    // Tính toán tỉ lệ thành công
    const forgeLevel = player.forge?.forgeLevel || 1;
    const baseSuccessRate = 0.55;
    const levelBonus = (forgeLevel - 1) * 0.03;
    const successRate = baseSuccessRate + levelBonus; // Level 15 = 0.97 = 97%

    let crafted = 0;
    let successCount = 0;
    let failureCount = 0;
    const createdItems = [];

    for (let i = 0; i < quantity; i++) {
      const canCraft = Object.entries(equip.crafting || {}).every(([id, req]) => {
        const have = player.inventory.items.find(it => it.id === id)?.quantity || 0;
        return have >= req;
      });
      if (!canCraft) break;

      // Trừ nguyên liệu
      for (const [id, req] of Object.entries(equip.crafting || {})) {
        const invItem = player.inventory.items.find(it => it.id === id);
        if (invItem) {
          invItem.quantity -= req;
          if (invItem.quantity <= 0) player.inventory.items = player.inventory.items.filter(it => it.id !== id);
        }
      }

      crafted++;
      if (Math.random() < successRate) {
        // Thành công
        const equipInstance = {
          uid: `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`,
          id: equipmentId,
          createdAt: Date.now(),
          bonuses: this.randomizeEquipmentStats(equip.rarity, equip.name, equip.type, equip.set_id)
        };
        player.inventory.armors = player.inventory.armors || [];
        player.inventory.armors.push(equipInstance);
        createdItems.push(equipInstance.uid);
        successCount++;
      } else {
        // Thất bại
        failureCount++;
      }
    }

    // Cập nhật thống kê
    if (!player.forge) player.forge = {};
    player.forge.totalCrafted = (player.forge.totalCrafted || 0) + crafted;
    player.forge.successCount = (player.forge.successCount || 0) + successCount;
    player.forge.failureCount = (player.forge.failureCount || 0) + failureCount;
    player.forge.lastForge = Date.now();

    playerManager.savePlayers();

    const embed = new EmbedBuilder()
      .setColor(successCount > 0 ? 0x00FF88 : 0xFF5555)
      .setTitle('🧰 Kết Quả Chế Tạo Trang Bị')
      .setDescription(`**${equip.name}** — Số lượng yêu cầu: **${quantity}**`)
      .addFields(
        { name: '✅ Thành công', value: `${successCount}`, inline: true },
        { name: '❌ Thất bại', value: `${failureCount}`, inline: true },
        { name: '🔥 Level lò rèn', value: `${forgeLevel} (tỉ lệ: ${(successRate * 100).toFixed(1)}%)`, inline: true },
        { name: '🆔 **ID Các Item Đã Tạo**', value: createdItems.length > 0 ? createdItems.slice(0, 5).map(uid => `\`${uid}\``).join(', ') + (createdItems.length > 5 ? ` ... (+${createdItems.length - 5} nữa)` : '') : 'Không có', inline: false }
      )
      .addFields({
        name: '💡 **Gợi Ý**',
        value: `Sử dụng \`fitem <id>\` để xem thông tin chi tiết từng item`,
        inline: false
      })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },

  async showQuantitySelect(interaction, userId, equipmentId) {
    await itemLoader.loadAllItems();
    const player = await playerManager.getPlayer(userId);
    const equip = itemLoader.items[equipmentId];
    if (!equip) {
      await interaction.reply({ content: '❌ Không tìm thấy trang bị!', ephemeral: true });
      return;
    }

    const maxCraft = this.getMaxCraftable(player, equip);
    if (maxCraft < 1) {
      await interaction.reply({ content: '⚠️ Đạo hữu không đủ nguyên liệu chế tạo', ephemeral: true });
      return;
    }

    const materialsLine = Object.entries(equip.crafting || {}).map(([id, qty]) => {
      const info = itemLoader.getItemInfo(id);
      const have = player.inventory.items.find(i => i.id === id)?.quantity || 0;
      const emoji = info?.emoji || '❓';
      const name = info?.name || id;
      return `${emoji} ${name} x${qty} (còn: ${have})`;
    }).join(', ');

    const embed = new EmbedBuilder()
      .setColor('#8B4513')
      .setTitle(`🧰 Chọn Số Lượng - ${equip.name}`)
      .setDescription(`${this.createSeparator()}\nChọn số lượng cần chế tạo.\n\nNguyên liệu mỗi món: ${materialsLine}\nTối đa có thể chế tạo: **${maxCraft}**`)
      .setTimestamp();

    const qtySelect = new StringSelectMenuBuilder()
      .setCustomId(`craft_select_qty:${equipmentId}`)
      .setPlaceholder('Chọn số lượng...')
      .addOptions([
        { label: '1', value: '1', description: 'Chế tạo 1 món' },
        { label: '5', value: '5', description: 'Chế tạo 5 món' },
        { label: '10', value: '10', description: 'Chế tạo 10 món' },
        { label: `Tối đa (${maxCraft})`, value: 'max', description: 'Chế tạo tối đa theo nguyên liệu hiện có' }
      ]);

    const backButton = new ButtonBuilder().setCustomId('craft_back_main').setLabel('🔙 Quay Lại').setStyle(ButtonStyle.Secondary);

    const selectRow = new ActionRowBuilder().addComponents(qtySelect);
    const backRow = new ActionRowBuilder().addComponents(backButton);

    await interaction.update({ embeds: [embed], components: [selectRow, backRow] });
  },

  // Weapon crafting functions
  async showQuantitySelectWeapon(interaction, userId, weaponId) {
    await itemLoader.loadAllItems();
    const player = await playerManager.getPlayer(userId);
    const weapon = itemLoader.items[weaponId];
    if (!weapon) {
      await interaction.reply({ content: '❌ Không tìm thấy vũ khí!', ephemeral: true });
      return;
    }

    const maxCraft = this.getMaxCraftableWeapon(player, weapon);
    if (maxCraft < 1) {
      await interaction.reply({ content: '⚠️ Đạo hữu không đủ nguyên liệu chế tạo', ephemeral: true });
      return;
    }

    const materialsLine = Object.entries(weapon.crafting || {}).map(([id, qty]) => {
      const info = itemLoader.getItemInfo(id);
      const have = player.inventory.items.find(i => i.id === id)?.quantity || 0;
      const emoji = info?.emoji || '❓';
      const name = info?.name || id;
      return `${emoji} ${name} x${qty} (còn: ${have})`;
    }).join(', ');

    const embed = new EmbedBuilder()
      .setColor('#8B4513')
      .setTitle(`⚒️ Chọn Số Lượng - ${weapon.name}`)
      .setDescription(`${this.createSeparator()}\nChọn số lượng cần chế tạo.\n\nNguyên liệu mỗi vũ khí: ${materialsLine}\nTối đa có thể chế tạo: **${maxCraft}**`)
      .setTimestamp();

    const qtySelect = new StringSelectMenuBuilder()
      .setCustomId(`craft_select_qty_weapon:${weaponId}`)
      .setPlaceholder('Chọn số lượng...')
      .addOptions([
        { label: '1', value: '1', description: 'Chế tạo 1 vũ khí' },
        { label: '5', value: '5', description: 'Chế tạo 5 vũ khí' },
        { label: '10', value: '10', description: 'Chế tạo 10 vũ khí' },
        { label: `Tối đa (${maxCraft})`, value: 'max', description: 'Chế tạo tối đa theo nguyên liệu hiện có' }
      ]);

    const backButton = new ButtonBuilder()
      .setCustomId('craft_back_main')
      .setLabel('🔙 Quay Lại')
      .setStyle(ButtonStyle.Secondary);

    const selectRow = new ActionRowBuilder().addComponents(qtySelect);
    const backRow = new ActionRowBuilder().addComponents(backButton);

    await interaction.update({ embeds: [embed], components: [selectRow, backRow] });
  },

  getMaxCraftableWeapon(player, weapon) {
    let maxCraft = Infinity;
    for (const [materialId, reqQty] of Object.entries(weapon.crafting || {})) {
      const have = player.inventory.items.find(i => i.id === materialId)?.quantity || 0;
      const possible = Math.floor(have / reqQty);
      if (possible < maxCraft) maxCraft = possible;
    }
    if (!isFinite(maxCraft)) return 0;
    return Math.max(0, maxCraft);
  },

  async craftWeapon(interaction, userId, username, weaponId) {
    const player = await playerManager.getPlayer(userId);
    await itemLoader.loadAllItems();
    const weaponInfo = itemLoader.getItemInfo(weaponId);
    if (!weaponInfo || !weaponInfo.type) {
      await interaction.reply({ content: '❌ Không tìm thấy vũ khí!', ephemeral: true });
      return;
    }

    const craftingMaterials = weaponInfo.crafting || {};
    const missingMaterials = [];
    const availableMaterials = [];

    for (const [materialId, requiredQty] of Object.entries(craftingMaterials)) {
      const playerMaterial = player.inventory.items.find(item => item.id === materialId);
      const availableQty = playerMaterial ? playerMaterial.quantity : 0;
      if (availableQty < requiredQty) {
        missingMaterials.push({
          id: materialId,
          name: itemLoader.getItemInfo(materialId)?.name || materialId,
          emoji: itemLoader.getItemInfo(materialId)?.emoji || '❓',
          required: requiredQty,
          available: availableQty,
          missing: requiredQty - availableQty
        });
      } else {
        availableMaterials.push({
          id: materialId,
          name: itemLoader.getItemInfo(materialId)?.name || materialId,
          emoji: itemLoader.getItemInfo(materialId)?.emoji || '❓',
          required: requiredQty,
          available: availableQty
        });
      }
    }

    if (missingMaterials.length > 0) {
      const missingEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ **Thiếu Nguyên Liệu Chế Tạo**')
        .setDescription(`**${username}** không đủ nguyên liệu để chế tạo **${weaponInfo.name}**!`)
        .addFields({
          name: '❌ **Nguyên Liệu Thiếu**',
          value: missingMaterials.map(m => `❌ ${m.emoji} **${m.name}**: ${m.available}/${m.required} (Thiếu: ${m.missing})`).join('\n'),
          inline: false
        });
      await interaction.reply({ embeds: [missingEmbed] });
      return;
    }

    const forgeLevel = player.forge?.forgeLevel || 1;
    const baseSuccessRate = 55;
    const levelBonus = (forgeLevel - 1) * 3;
    const successRate = baseSuccessRate + levelBonus; // Level 15 = 55 + 42 = 97%
    const isSuccess = Math.random() * 100 < successRate;

    if (isSuccess) {
      for (const [materialId, requiredQty] of Object.entries(craftingMaterials)) {
        const playerMaterial = player.inventory.items.find(item => item.id === materialId);
        if (playerMaterial) {
          playerMaterial.quantity -= requiredQty;
          if (playerMaterial.quantity <= 0) {
            player.inventory.items = player.inventory.items.filter(item => item.id !== materialId);
          }
        }
      }

      const weaponInstance = {
        uid: `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`,
        id: weaponId,
        createdAt: Date.now(),
        bonuses: this.randomizeWeaponStats(weaponInfo.rarity, weaponInfo.name, weaponInfo.element)
      };
      if (weaponInstance.bonuses && weaponInstance.bonuses.__passives) {
        weaponInstance.passives = weaponInstance.bonuses.__passives;
        delete weaponInstance.bonuses.__passives;
      }
      if (weaponInstance.bonuses && typeof weaponInstance.bonuses.__weapon_skill_tier !== 'undefined') {
        weaponInstance.weaponSkillTier = weaponInstance.bonuses.__weapon_skill_tier;
        delete weaponInstance.bonuses.__weapon_skill_tier;
      }
      if (weaponInstance.bonuses && Array.isArray(weaponInstance.bonuses.__unlocked_skill_tiers)) {
        weaponInstance.unlockedSkillTiers = weaponInstance.bonuses.__unlocked_skill_tiers;
        delete weaponInstance.bonuses.__unlocked_skill_tiers;
      }
      player.inventory.weapons = player.inventory.weapons || [];
      player.inventory.weapons.push(weaponInstance);

      if (!player.forge) player.forge = {};
      player.forge.totalCrafted = (player.forge.totalCrafted || 0) + 1;
      player.forge.successCount = (player.forge.successCount || 0) + 1;
      player.forge.lastForge = Date.now();
      playerManager.savePlayers();

      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🎉 **Chế Tạo Vũ Khí Thành Công!**')
        .setDescription(`**${username}** đã chế tạo thành công **${weaponInfo.name}**!`)
        .addFields(
          { name: '⚔️ **Vũ Khí Thu Được**', value: `${weaponInfo.emoji} **${weaponInfo.name}** ${this.getRarityEmoji(weaponInfo.rarity)}`, inline: false },
          { name: '🔥 **Level Lò Rèn**', value: `**${forgeLevel}** (Tỉ lệ: **${successRate}%**)`, inline: true }
        )
        .setTimestamp();
      await interaction.reply({ embeds: [successEmbed] });
    } else {
      for (const [materialId, requiredQty] of Object.entries(craftingMaterials)) {
        const playerMaterial = player.inventory.items.find(item => item.id === materialId);
        if (playerMaterial) {
          playerMaterial.quantity -= requiredQty;
          if (playerMaterial.quantity <= 0) {
            player.inventory.items = player.inventory.items.filter(item => item.id !== materialId);
          }
        }
      }

      if (!player.forge) player.forge = {};
      player.forge.totalCrafted = (player.forge.totalCrafted || 0) + 1;
      player.forge.failureCount = (player.forge.failureCount || 0) + 1;
      player.forge.lastForge = Date.now();
      playerManager.savePlayers();

      const failureEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('💥 **Chế Tạo Vũ Khí Thất Bại!**')
        .setDescription(`**${username}** đã thất bại khi chế tạo **${weaponInfo.name}**!`)
        .addFields(
          { name: '🔥 **Level Lò Rèn**', value: `**${forgeLevel}** (Tỉ lệ: **${successRate}%**)`, inline: true },
          { name: '💔 **Hậu Quả**', value: 'Nguyên liệu đã bị mất!', inline: true }
        )
        .setTimestamp();
      await interaction.reply({ embeds: [failureEmbed] });
    }
  },

  async craftSelectedWeapon(interaction, weaponId, userId) {
    await itemLoader.loadAllItems();
    const weapon = itemLoader.items[weaponId];
    const player = await playerManager.getPlayer(userId);
    if (!weapon || !player) {
      await interaction.reply({ content: '❌ Không tìm thấy dữ liệu cần thiết!', ephemeral: true });
      return;
    }

    const missingMaterials = [];
    for (const [materialId, requiredQty] of Object.entries(weapon.crafting || {})) {
      const playerMaterial = player.inventory.items.find(item => item.id === materialId);
      const availableQty = playerMaterial ? playerMaterial.quantity : 0;
      if (availableQty < requiredQty) {
        const materialInfo = itemLoader.getItemInfo(materialId);
        missingMaterials.push(`${materialInfo?.name || materialId} (cần: ${requiredQty}, có: ${availableQty})`);
      }
    }

    if (missingMaterials.length > 0) {
      await interaction.reply({ content: `❌ Thiếu nguyên liệu:\n${missingMaterials.join('\n')}`, ephemeral: true });
      return;
    }

    const forgeLevel = player.forge?.forgeLevel || 1;
    const baseSuccessRate = 0.55;
    const levelBonus = (forgeLevel - 1) * 0.03;
    const successRate = baseSuccessRate + levelBonus; // Level 15 = 0.97 = 97%
    const isSuccess = Math.random() < successRate;

    if (isSuccess) {
      const weaponInstance = {
        uid: `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`,
        id: weaponId,
        createdAt: Date.now(),
        bonuses: this.randomizeWeaponStats(weapon.rarity, weapon.name, weapon.element)
      };
      if (weaponInstance.bonuses && weaponInstance.bonuses.__passives) {
        weaponInstance.passives = weaponInstance.bonuses.__passives;
        delete weaponInstance.bonuses.__passives;
      }
      if (weaponInstance.bonuses && typeof weaponInstance.bonuses.__weapon_skill_tier !== 'undefined') {
        weaponInstance.weaponSkillTier = weaponInstance.bonuses.__weapon_skill_tier;
        delete weaponInstance.bonuses.__weapon_skill_tier;
      }
      if (weaponInstance.bonuses && Array.isArray(weaponInstance.bonuses.__unlocked_skill_tiers)) {
        weaponInstance.unlockedSkillTiers = weaponInstance.bonuses.__unlocked_skill_tiers;
        delete weaponInstance.bonuses.__unlocked_skill_tiers;
      }
      player.inventory.weapons = player.inventory.weapons || [];
      player.inventory.weapons.push(weaponInstance);

      if (!player.forge) player.forge = { forgeLevel: 1, forgeExp: 0, totalCrafted: 0, successCount: 0, failureCount: 0, lastForge: 0 };
      player.forge.totalCrafted++;
      player.forge.successCount++;
      player.forge.forgeExp = (player.forge.forgeExp || 0) + 10; // +10 EXP khi thành công
      player.forge.lastForge = Date.now();

      for (const [materialId, requiredQty] of Object.entries(weapon.crafting || {})) {
        const playerMaterial = player.inventory.items.find(item => item.id === materialId);
        if (playerMaterial) {
          playerMaterial.quantity -= requiredQty;
          if (playerMaterial.quantity <= 0) {
            player.inventory.items = player.inventory.items.filter(item => item.id !== materialId);
          }
        }
      }

      playerManager.savePlayers();

      const successEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('⚒️ Chế Tạo Vũ Khí Thành Công!')
        .setDescription(`**${weapon.name}** đã được chế tạo thành công!`)
        .addFields(
          { name: '🎯 Tỉ lệ thành công', value: `${(successRate * 100).toFixed(1)}%`, inline: true },
          { name: '🔥 Level lò rèn', value: `${forgeLevel}`, inline: true }
        )
        .setTimestamp();
      await interaction.reply({ embeds: [successEmbed] });
    } else {
      if (!player.forge) player.forge = { forgeLevel: 1, forgeExp: 0, totalCrafted: 0, successCount: 0, failureCount: 0, lastForge: 0 };
      player.forge.totalCrafted++;
      player.forge.failureCount++;
      player.forge.forgeExp = (player.forge.forgeExp || 0) + 5; // +5 EXP khi thất bại
      player.forge.lastForge = Date.now();

      for (const [materialId, requiredQty] of Object.entries(weapon.crafting || {})) {
        const playerMaterial = player.inventory.items.find(item => item.id === materialId);
        if (playerMaterial) {
          playerMaterial.quantity -= requiredQty;
          if (playerMaterial.quantity <= 0) {
            player.inventory.items = player.inventory.items.filter(item => item.id !== materialId);
          }
        }
      }

      playerManager.savePlayers();

      const failureEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('💥 Chế Tạo Vũ Khí Thất Bại!')
        .setDescription(`**${weapon.name}** chế tạo thất bại! Nguyên liệu đã bị mất.`)
        .addFields(
          { name: '🎯 Tỉ lệ thành công', value: `${(successRate * 100).toFixed(1)}%`, inline: true },
          { name: '🔥 Level lò rèn', value: `${forgeLevel}`, inline: true }
        )
        .setTimestamp();
      await interaction.reply({ embeds: [failureEmbed] });
    }
  },

  async craftSelectedWeaponBatch(interaction, weaponId, userId, quantity) {
    await itemLoader.loadAllItems();
    const weapon = itemLoader.items[weaponId];
    const player = await playerManager.getPlayer(userId);
    if (!weapon || !player) {
      await interaction.reply({ content: '❌ Không tìm thấy dữ liệu cần thiết!', ephemeral: true });
      return;
    }

    const forgeLevel = player.forge?.forgeLevel || 1;
    const baseSuccessRate = 0.55;
    const levelBonus = (forgeLevel - 1) * 0.03;
    const successRate = baseSuccessRate + levelBonus; // Level 15 = 0.97 = 97%

    let successCount = 0;
    let failureCount = 0;
    let crafted = 0;

    for (let i = 0; i < quantity; i++) {
      const canCraft = Object.entries(weapon.crafting || {}).every(([matId, req]) => {
        const have = player.inventory.items.find(it => it.id === matId)?.quantity || 0;
        return have >= req;
      });
      if (!canCraft) break;

      for (const [matId, req] of Object.entries(weapon.crafting || {})) {
        const invItem = player.inventory.items.find(it => it.id === matId);
        if (invItem) {
          invItem.quantity -= req;
          if (invItem.quantity <= 0) {
            player.inventory.items = player.inventory.items.filter(it => it.id !== matId);
          }
        }
      }

      crafted++;
      if (Math.random() < successRate) {
        const weaponInstance = {
          uid: `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`,
          id: weaponId,
          createdAt: Date.now(),
          bonuses: this.randomizeWeaponStats(weapon.rarity, weapon.name, weapon.element)
        };
        if (weaponInstance.bonuses && weaponInstance.bonuses.__passives) {
          weaponInstance.passives = weaponInstance.bonuses.__passives;
          delete weaponInstance.bonuses.__passives;
        }
        if (weaponInstance.bonuses && typeof weaponInstance.bonuses.__weapon_skill_tier !== 'undefined') {
          weaponInstance.weaponSkillTier = weaponInstance.bonuses.__weapon_skill_tier;
          delete weaponInstance.bonuses.__weapon_skill_tier;
        }
        if (weaponInstance.bonuses && Array.isArray(weaponInstance.bonuses.__unlocked_skill_tiers)) {
          weaponInstance.unlockedSkillTiers = weaponInstance.bonuses.__unlocked_skill_tiers;
          delete weaponInstance.bonuses.__unlocked_skill_tiers;
        }
        player.inventory.weapons = player.inventory.weapons || [];
        player.inventory.weapons.push(weaponInstance);
        successCount++;
      } else {
        failureCount++;
      }
    }

    if (!player.forge) player.forge = { forgeLevel: 1, forgeExp: 0, totalCrafted: 0, successCount: 0, failureCount: 0, lastForge: 0 };
    player.forge.totalCrafted += crafted;
    player.forge.successCount += successCount;
    player.forge.failureCount += failureCount;
    player.forge.forgeExp = (player.forge.forgeExp || 0) + (successCount * 10) + (failureCount * 5); // +10 EXP thành công, +5 EXP thất bại
    player.forge.lastForge = Date.now();
    playerManager.savePlayers();

    const resultEmbed = new EmbedBuilder()
      .setColor(successCount > 0 ? 0x00FF88 : 0xFF5555)
      .setTitle('⚒️ Kết Quả Chế Tạo Vũ Khí')
      .setDescription(`**${weapon.name}** — Số lượng yêu cầu: **${quantity}**`)
      .addFields(
        { name: '✅ Thành công', value: `${successCount}`, inline: true },
        { name: '❌ Thất bại', value: `${failureCount}`, inline: true },
        { name: '🔥 Level lò rèn', value: `${forgeLevel} (tỉ lệ: ${(successRate * 100).toFixed(1)}%)`, inline: true }
      )
      .setTimestamp();
    await interaction.reply({ embeds: [resultEmbed] });
  },

  getMaxCraftable(player, equip) {
    let maxCraft = Infinity;
    for (const [id, reqQty] of Object.entries(equip.crafting || {})) {
      const have = player.inventory.items.find(i => i.id === id)?.quantity || 0;
      const possible = Math.floor(have / reqQty);
      if (possible < maxCraft) maxCraft = possible;
    }
    if (!isFinite(maxCraft)) return 0;
    return Math.max(0, maxCraft);
  }
};


