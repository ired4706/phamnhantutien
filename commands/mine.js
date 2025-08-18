const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');
const cooldownManager = require('../utils/cooldown.js');
const expCalculator = require('../systems/exp-calculator.js');
const SpiritStonesCalculator = require('../utils/spirit-stones-calculator.js');

module.exports = {
  name: 'mine',
  aliases: ['mi', 'dao', 'mining'],
  description: 'Khai thác khoáng sản để lấy tài nguyên (không có Linh khí)',
  cooldown: 3600000, // 1h = 3600000ms

  async execute(interaction, args) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Kiểm tra xem user đã bắt đầu game chưa
    if (!playerManager.hasStartedGame(userId)) {
      const notStartedEmbed = playerManager.createNotStartedEmbed();
      await interaction.reply({ embeds: [notStartedEmbed] });
      return;
    }

    const player = playerManager.getPlayer(userId);
    const now = Date.now();

    // Kiểm tra cooldown sử dụng common manager
    const cooldownCheck = cooldownManager.checkCooldown(player, 'mine', this.cooldown);
    if (cooldownCheck.isOnCooldown) {
      const cooldownEmbed = cooldownManager.createCooldownEmbed('mine', cooldownCheck.remainingText);
      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán Linh khí theo hệ thống mới (mine = 0 Linh khí)
    const expResult = expCalculator.calculateMineExp(player, 'none');
    const expGained = expResult.finalExp; // Sẽ luôn = 0

    // Tính toán phần thưởng khác
    const spiritStones = SpiritStonesCalculator.calculateMine();
    const minerals = this.getMineralsByRealm(player.realm, player.realmLevel);

    // Cập nhật player
    playerManager.addExperience(userId, expGained);

    // Cập nhật linh thạch theo format mới
    SpiritStonesCalculator.updatePlayerSpiritStones(player, spiritStones);

    // Cập nhật thời gian command cuối
    const lastCommandField = cooldownManager.getLastCommandField('mine');
    const updateData = {
      [lastCommandField]: now,
      ...SpiritStonesCalculator.createUpdateObject(spiritStones)
    };
    playerManager.updatePlayer(userId, updateData);

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#8B4513')
      .setTitle('⛏️ Khai thác khoáng sản thành công!')
      .setDescription(`**${username}** đã hoàn thành buổi khai thác.`)
      .addFields(
        {
          name: '📊 Linh khí nhận được',
          value: `**+${expGained} Linh khí** (Khai thác không có Linh khí)`,
          inline: true
        },
        {
          name: '💎 Linh thạch thu được',
          value: SpiritStonesCalculator.formatSpiritStones(spiritStones),
          inline: true
        },
        {
          name: '🌿 Khoáng sản thu được',
          value: `${minerals.length} items: ${minerals.join(', ')}`,
          inline: true
        }
      )
      .addFields({
        name: '🔍 Chi tiết tính toán Linh khí',
        value: expResult.breakdown.calculation,
        inline: false
      })
      .setFooter({ text: `Khai thác có thể thực hiện sau 1 giờ • Tu vi ${player.realm} nhận ${minerals.length} khoáng sản` })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },

  /**
   * Lấy khoáng sản từ khai thác dựa trên tu vi
   * @param {string} realm - Tu vi hiện tại
   * @param {number} realmLevel - Cấp độ tu vi
   * @returns {Array} Danh sách khoáng sản
   */
  getMineralsByRealm(realm, realmLevel) {
    // Tỉ lệ drop theo tu vi (dựa trên bảng bạn cung cấp)
    const dropRates = this.getDropRatesByRealm(realm, realmLevel);

    // Lấy danh sách khoáng sản theo rarity
    const mineralsByRarity = this.getMineralsByRarity();

    // Số lượng item theo tu vi
    const itemCountByRealm = {
      'luyen_khi': { min: 3, max: 5 },    // Luyện Khí: 3-5 item
      'truc_co': { min: 4, max: 6 },      // Trúc Cơ: 4-6 item
      'ket_dan': { min: 5, max: 7 },      // Kết Đan: 5-7 item
      'nguyen_anh': { min: 6, max: 8 }    // Nguyên Anh: 6-8 item
    };

    const realmConfig = itemCountByRealm[realm] || itemCountByRealm['luyen_khi'];
    const count = Math.floor(Math.random() * (realmConfig.max - realmConfig.min + 1)) + realmConfig.min;

    const selectedMinerals = [];

    for (let i = 0; i < count; i++) {
      const rarity = this.selectRarityByDropRate(dropRates);
      const minerals = mineralsByRarity[rarity];

      if (minerals && minerals.length > 0) {
        const randomMineral = minerals[Math.floor(Math.random() * minerals.length)];
        if (!selectedMinerals.includes(randomMineral)) {
          selectedMinerals.push(randomMineral);
        }
      }
    }

    return selectedMinerals;
  },

  /**
   * Lấy tỉ lệ drop theo tu vi
   * @param {string} realm - Tu vi hiện tại
   * @param {number} realmLevel - Cấp độ tu vi
   * @returns {Object} Tỉ lệ drop cho mỗi rarity
   */
  getDropRatesByRealm(realm, realmLevel) {
    // Bảng tỉ lệ drop theo tu vi
    const realmDropRates = {
      'luyen_khi': {
        common: 80,    // Phàm cấp: 80%
        uncommon: 20,  // Huyền cấp: 20%
        rare: 0,       // Địa cấp: 0%
        epic: 0,       // Thiên cấp: 0%
        legendary: 0   // Thần cấp: 0%
      },
      'truc_co': {
        common: 55,    // Phàm cấp: 55%
        uncommon: 35,  // Huyền cấp: 35%
        rare: 10,      // Địa cấp: 10%
        epic: 0,       // Thiên cấp: 0%
        legendary: 0   // Thần cấp: 0%
      },
      'ket_dan': {
        common: 35,    // Phàm cấp: 35%
        uncommon: 35,  // Huyền cấp: 35%
        rare: 25,      // Địa cấp: 25%
        epic: 5,       // Thiên cấp: 5%
        legendary: 0   // Thần cấp: 0%
      },
      'nguyen_anh': {
        common: 20,    // Phàm cấp: 20%
        uncommon: 30,  // Huyền cấp: 30%
        rare: 35,      // Địa cấp: 35%
        epic: 14,      // Thiên cấp: 14%
        legendary: 1   // Thần cấp: 1%
      }
    };

    return realmDropRates[realm] || realmDropRates['luyen_khi'];
  },

  /**
   * Chọn rarity dựa trên tỉ lệ drop
   * @param {Object} dropRates - Tỉ lệ drop cho mỗi rarity
   * @returns {string} Rarity được chọn
   */
  selectRarityByDropRate(dropRates) {
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const [rarity, rate] of Object.entries(dropRates)) {
      cumulative += rate;
      if (random <= cumulative) {
        return rarity;
      }
    }

    // Fallback về common nếu có lỗi
    return 'common';
  },

  /**
   * Lấy danh sách khoáng sản theo rarity
   * @returns {Object} Danh sách khoáng sản theo rarity
   */
  getMineralsByRarity() {
    return {
      common: [
        '🪨 Thiết Tinh Thô', '🪨 Kim Thiết Thường', '🪨 Thanh Mộc Tinh',
        '💎 Thủy Tinh Thạch', '🔥 Hỏa Thạch Nhiệt Tâm', '🟡 Hoàng Thổ Kết'
      ],
      uncommon: [
        '🟠 Đồng Tinh Luyện', '💎 Ngọc Thạch Thanh Khiết', '🩸 Huyết Viêm Tủy Kết',
        '🛡️ Hộ Linh Tâm Kết', '👻 Hư Ảnh Linh Kết', '🟠 Kim Thiết Tinh',
        '🟢 Thanh Mộc Linh', '💎 Thủy Tinh Huyền', '🔥 Hỏa Thạch Linh Tâm',
        '🟡 Hoàng Thổ Tâm Kết'
      ],
      rare: [
        '🟣 Huyền Tinh Địa Tâm', '❄️ Lam Thạch Băng Tâm', '💫 Tinh Hồn Thạch',
        '🔴 Hồng Ngọc Địa', '🟢 Lục Ngọc Địa', '🟡 Hoàng Thạch Địa',
        '🔵 Lam Thạch Địa', '⚡ Tinh Tốc Thạch Địa', '⚫ Hắc Thạch Địa',
        '🔮 Trận Văn Thạch', '🟠 Huyền Kim Thiết', '🟢 Huyền Thanh Mộc',
        '💎 Huyền Thủy Tinh', '🔥 Huyền Hỏa Thạch', '🟡 Huyền Hoàng Thổ',
        '⚫ Huyền Thiết Tinh Phách', '🟢 Ngọc Mộc Linh Tủy', '🔵 Lam Thủy Minh Châu',
        '🔴 Xích Viêm Tâm Hỏa', '🟡 Huyền Thổ Linh Kết'
      ],
      epic: [
        '✨ Ngân Tinh Thiên Khôi', '🩸 Huyết Thạch Thiên Tâm', '💎 Huyết Châu Linh',
        '🔴 Hồng Ngọc Thánh', '🟢 Lục Ngọc Thánh', '🟡 Hoàng Thạch Thánh',
        '🔵 Lam Thạch Thánh', '⚡ Tinh Tốc Thạch Thánh', '⚫ Hắc Thạch Thánh',
        '☁️ Tinh Vân Thạch', '🟠 Thánh Kim Thiết', '🟢 Thánh Thanh Mộc',
        '💎 Thánh Thủy Tinh', '🔥 Thánh Hỏa Thạch', '🟡 Thánh Hoàng Thổ'
      ],
      legendary: [
        '🌟 Thiên Tinh Thần Khí', '💎 Thần Ngọc Tịnh Tâm', '🌌 Hỗn Thạch Nguyên',
        '💎 Ngọc Thánh Hồn', '🔴 Hồng Ngọc Thần', '🟢 Lục Ngọc Thần',
        '🟡 Hoàng Thạch Thần', '🔵 Lam Thạch Thần', '⚡ Tinh Tốc Thạch Thần',
        '⚫ Hắc Thạch Thần', '💎 Thần Ngọc Tâm', '🟠 Thần Kim Thiết',
        '🟢 Thần Thanh Mộc', '💎 Thần Thủy Tinh', '🔥 Thần Hỏa Thạch',
        '🟡 Thần Hoàng Thổ', '🟠 Thần Kim Thánh Thiết', '🟢 Tiên Mộc Thánh Tủy',
        '💎 Thần Thủy Tinh Ngọc', '🔥 Thánh Viêm Chân Hỏa', '🟡 Thần Thổ Chí Tinh'
      ]
    };
  }
};
