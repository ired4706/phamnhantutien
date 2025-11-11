const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const playerManager = require('../../systems/player.js');
const itemLoader = require('../../utils/data/item-loader.js');

module.exports = {
  name: 'craft',
  aliases: ['fcraft', 'che_tao_tb', 'trangbi'],
  description: 'Chế tạo trang bị từ nguyên liệu trong kho',

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
      // Pendant config: starts from uncommon
      rarityConfig = {
        'uncommon': { lines: 2, minValue: 3, maxValue: 7, mainIntMin: 18, mainIntMax: 18 },
        'rare': { lines: 3, minValue: 6, maxValue: 12, mainIntMin: 40, mainIntMax: 40 },
        'epic': { lines: 4, minValue: 10, maxValue: 18, mainIntMin: 65, mainIntMax: 65 },
        'legendary': { lines: 5, minValue: 16, maxValue: 28, mainIntMin: 110, mainIntMax: 110 }
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

    // Roll main INT for ring and pendant (similar to main STR for weapons)
    if ((equipmentType === 'ring' || equipmentType === 'pendant') && config.mainIntMin !== undefined) {
      const mainINT = this.randBetween(config.mainIntMin, config.mainIntMax);
      stats['__main_stats'] = { INT: mainINT };
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

    // Không có args: mở menu chọn loại trang bị
    if (!args || args.length === 0) {
      await this.showCraftMenu(interaction, userId);
      return;
    }

    // Có args: chế tạo trực tiếp theo ID
    const equipmentId = args[0];
    await this.craftEquipment(interaction, userId, username, equipmentId);
    } catch (error) {
      console.error('Error in craft execute:', error);
      await interaction.reply({ content: '❌ Có lỗi xảy ra khi hiển thị thông tin!', ephemeral: true });
    }
  },

  async showCraftMenu(interaction, userId) {
    const embed = new EmbedBuilder()
      .setColor('#8B4513')
      .setTitle('🧰 Chế Tạo Trang Bị')
      .setDescription(`${this.createSeparator()}\nChọn loại trang bị bạn muốn chế tạo.`)
      .setTimestamp();

    const buttons = [
      new ButtonBuilder().setCustomId('craft_type_armor').setLabel('🛡️ Áo Giáp').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('craft_type_pants').setLabel('👖 Quần').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('craft_type_boots').setLabel('👟 Giày').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('craft_type_ring').setLabel('💍 Nhẫn').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('craft_type_pendant').setLabel('🔮 Ngọc Bội').setStyle(ButtonStyle.Secondary),
      // new ButtonBuilder().setCustomId('craft_type_earrings').setLabel('👂 Hoa Tai').setStyle(ButtonStyle.Secondary)
    ];

    // Discord chỉ cho phép tối đa 5 buttons trong một ActionRow
    const row1 = new ActionRowBuilder().addComponents(buttons.slice(0, 3));
    const row2 = new ActionRowBuilder().addComponents(buttons.slice(3, 5));

    await interaction.reply({ embeds: [embed], components: [row1, row2] });
  },

  async handleButton(interaction) {
    const { customId } = interaction;
    const userId = interaction.user.id;

    if (customId === 'craft_back_main') {
      await this.showCraftMenu(interaction, userId);
      return;
    }

    if (customId.startsWith('craft_type_')) {
      const type = customId.replace('craft_type_', '');
      await this.showEquipmentByType(interaction, type, userId);
    }
  },

  async handleSelectMenu(interaction) {
    try {
      const { customId, values } = interaction;
      const userId = interaction.user.id;

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

    playerManager.savePlayers();

    const successEmbed = new EmbedBuilder()
      .setColor('#00C853')
      .setTitle('🎉 Chế Tạo Trang Bị Thành Công!')
      .setDescription(`${this.createSeparator()}\n**${username}** đã chế tạo thành công **${equipInfo.name}**!`)
      .addFields({ name: '🧰 Trang Bị Nhận Được', value: `${equipInfo.emoji} **${equipInfo.name}** ${this.getRarityEmoji(equipInfo.rarity)}`, inline: false })
      .addFields({
        name: '🔍 Nguyên Liệu Đã Sử Dụng', value: Object.entries(craftingMaterials).map(([id, qty]) => {
          const info = itemLoader.getItemInfo(id);
          return `${info?.emoji || '❓'} **${info?.name || id}**: ${qty}`;
        }).join('\n'), inline: false
      })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
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

    playerManager.savePlayers();

    const embed = new EmbedBuilder()
      .setColor(0x00FF88)
      .setTitle('🧰 Chế Tạo Thành Công!')
      .setDescription(`**${equip.name}** đã được chế tạo!\n\n🆔 **ID**: \`${equipInstance.uid}\`\n💡 Sử dụng \`fitem ${equipInstance.uid}\` để xem thông tin chi tiết`)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
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

    let crafted = 0;
    const createdItems = [];

    for (let i = 0; i < quantity; i++) {
      const canCraft = Object.entries(equip.crafting || {}).every(([id, req]) => {
        const have = player.inventory.items.find(it => it.id === id)?.quantity || 0;
        return have >= req;
      });
      if (!canCraft) break;

      for (const [id, req] of Object.entries(equip.crafting || {})) {
        const invItem = player.inventory.items.find(it => it.id === id);
        if (invItem) {
          invItem.quantity -= req;
          if (invItem.quantity <= 0) player.inventory.items = player.inventory.items.filter(it => it.id !== id);
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
      createdItems.push(equipInstance.uid);
      crafted++;
    }

    playerManager.savePlayers();

    const embed = new EmbedBuilder()
      .setColor(crafted > 0 ? 0x00FF88 : 0xFF5555)
      .setTitle('🧰 Kết Quả Chế Tạo Trang Bị')
      .setDescription(`**${equip.name}** — Số lượng yêu cầu: **${quantity}**, đã chế tạo: **${crafted}**`)
      .addFields({
        name: '🆔 **ID Các Item Đã Tạo**',
        value: createdItems.map(uid => `\`${uid}\``).join(', '),
        inline: false
      })
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


