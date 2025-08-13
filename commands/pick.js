const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');
const cooldownManager = require('../utils/cooldown.js');
const expCalculator = require('../systems/exp-calculator.js');

module.exports = {
  name: 'pick',
  aliases: ['p', 'hai', 'thuoc'],
  description: 'Thu thập thảo dược để lấy tài nguyên và kinh nghiệm',
  cooldown: 300000, // 5m = 300000ms

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
    const cooldownCheck = cooldownManager.checkCooldown(player, 'pick', this.cooldown);
    if (cooldownCheck.isOnCooldown) {
      const cooldownEmbed = cooldownManager.createCooldownEmbed('pick', cooldownCheck.remainingText);
      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán EXP theo hệ thống mới (pick có EXP random 40-50)
    const expResult = expCalculator.calculatePickExp(player, 'none');
    const expGained = expResult.finalExp;

    // Tính toán phần thưởng khác
    const spiritStones = 20 + Math.floor(Math.random() * 30); // 20-50
    const herbs = this.getHerbs();

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    player.inventory.spiritStones += spiritStones;

    // Cập nhật thời gian command cuối
    const lastCommandField = cooldownManager.getLastCommandField('pick');
    playerManager.updatePlayer(userId, {
      [lastCommandField]: now,
      'inventory.spiritStones': player.inventory.spiritStones
    });

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#228B22')
      .setTitle('🌿 Thu thập thảo dược thành công!')
      .setDescription(`**${username}** đã thu thập được thảo dược.`)
      .addFields(
        {
          name: '📊 Kinh nghiệm nhận được',
          value: `**+${expGained} EXP** (Random 40-50)`,
          inline: true
        },
        {
          name: '💎 Linh thạch thu được',
          value: `**+${spiritStones}**`,
          inline: true
        },
        {
          name: '🌿 Thảo dược thu được',
          value: herbs.join(', '),
          inline: true
        }
      )
      .addFields({
        name: '🔍 Chi tiết tính toán EXP',
        value: expResult.breakdown.calculation,
        inline: false
      })
      .setFooter({ text: 'Thu thập thảo dược có thể thực hiện sau 5 phút' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },

  /**
   * Lấy thảo dược từ thu thập
   * @returns {Array} Danh sách thảo dược
   */
  getHerbs() {
    const herbs = [
      '🌱 Cỏ thuốc', '🌸 Hoa dược', '🌿 Lá thuốc',
      '🍄 Nấm dược', '🌺 Hoa sen', '🌻 Hoa hướng dương',
      '🌼 Hoa cúc', '🌷 Hoa hồng', '🌹 Hoa hồng dại'
    ];

    const count = Math.floor(Math.random() * 3) + 2; // 2-4 thảo dược
    const selected = [];

    for (let i = 0; i < count; i++) {
      const herb = herbs[Math.floor(Math.random() * herbs.length)];
      if (!selected.includes(herb)) {
        selected.push(herb);
      }
    }

    return selected;
  }
};
