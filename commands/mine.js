const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');
const cooldownManager = require('../utils/cooldown.js');
const expCalculator = require('../systems/exp-calculator.js');

module.exports = {
  name: 'mine',
  aliases: ['mi', 'dao', 'mining'],
  description: 'Khai thác khoáng sản để lấy tài nguyên (không có EXP)',
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

    // Tính toán EXP theo hệ thống mới (mine = 0 EXP)
    const expResult = expCalculator.calculateMineExp(player, 'none');
    const expGained = expResult.finalExp; // Sẽ luôn = 0

    // Tính toán phần thưởng khác
    const spiritStones = 100 + Math.floor(Math.random() * 200); // 100-300
    const minerals = this.getMinerals();

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    player.inventory.spiritStones += spiritStones;

    // Cập nhật thời gian command cuối
    const lastCommandField = cooldownManager.getLastCommandField('mine');
    playerManager.updatePlayer(userId, {
      [lastCommandField]: now,
      'inventory.spiritStones': player.inventory.spiritStones
    });

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#8B4513')
      .setTitle('⛏️ Khai thác khoáng sản thành công!')
      .setDescription(`**${username}** đã hoàn thành buổi khai thác.`)
      .addFields(
        {
          name: '📊 Kinh nghiệm nhận được',
          value: `**+${expGained} EXP** (Khai thác không có EXP)`,
          inline: true
        },
        {
          name: '💎 Linh thạch thu được',
          value: `**+${spiritStones}**`,
          inline: true
        },
        {
          name: '🌿 Khoáng sản thu được',
          value: minerals.join(', '),
          inline: true
        }
      )
      .addFields({
        name: '🔍 Chi tiết tính toán EXP',
        value: expResult.breakdown.calculation,
        inline: false
      })
      .setFooter({ text: 'Khai thác có thể thực hiện sau 1 giờ' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },

  /**
   * Lấy khoáng sản từ khai thác
   * @returns {Array} Danh sách khoáng sản
   */
  getMinerals() {
    const minerals = [
      '🪨 Đá thường', '💎 Đá quý', '🟡 Vàng',
      '⚫ Than đá', '🔴 Quặng sắt', '🔵 Quặng đồng',
      '🟢 Ngọc lục bảo', '🟣 Ngọc tím', '⚪ Bạc'
    ];

    const count = Math.floor(Math.random() * 3) + 2; // 2-4 khoáng sản
    const selected = [];

    for (let i = 0; i < count; i++) {
      const mineral = minerals[Math.floor(Math.random() * minerals.length)];
      if (!selected.includes(mineral)) {
        selected.push(mineral);
      }
    }

    return selected;
  }
};
