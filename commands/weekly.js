const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');
const expCalculator = require('../systems/exp-calculator.js');

module.exports = {
  name: 'weekly',
  aliases: ['w', 'nhiemvutuan', 'weeklyquest'],
  description: 'Nhận và hoàn thành nhiệm vụ hàng tuần để nhận phần thưởng lớn',
  cooldown: 604800000, // 1 tuần = 604800000ms

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

    // Kiểm tra cooldown hàng tuần
    if (player.cultivation && player.cultivation.lastWeeklyQuest &&
      (now - player.cultivation.lastWeeklyQuest) < this.cooldown) {
      const remainingTime = this.cooldown - (now - player.cultivation.lastWeeklyQuest);
      const remainingDays = Math.ceil(remainingTime / 86400000);

      const cooldownEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⏰ Nhiệm vụ tuần đang trong thời gian hồi phục!')
        .setDescription('Bạn cần chờ để nhận nhiệm vụ tuần mới.')
        .addFields({
          name: '⏳ Thời gian còn lại',
          value: `**${remainingDays} ngày**`,
          inline: true
        })
        .setFooter({ text: 'Nhiệm vụ tuần có thể nhận sau 7 ngày' })
        .setTimestamp();

      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán EXP theo hệ thống mới
    const expResult = expCalculator.calculateWeeklyExp(player, 'none');
    const expGained = expResult.finalExp;

    // Tính toán phần thưởng khác (nhiệm vụ tuần có phần thưởng lớn hơn)
    const spiritStones = 300 + Math.floor(Math.random() * 400); // 300-700
    const reputationGain = 50 + Math.floor(Math.random() * 100); // 50-150

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    player.inventory.spiritStones += spiritStones;

    // Cập nhật thời gian nhiệm vụ tuần cuối và danh tiếng
    playerManager.updatePlayer(userId, {
      'cultivation.lastWeeklyQuest': now,
      'inventory.spiritStones': player.inventory.spiritStones,
      'stats.reputation': (player.stats.reputation || 0) + reputationGain
    });

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏆 Hoàn thành nhiệm vụ tuần thành công!')
      .setDescription(`**${username}** đã hoàn thành nhiệm vụ tuần quan trọng.`)
      .addFields(
        {
          name: '📊 Kinh nghiệm nhận được',
          value: `**+${expGained} EXP**`,
          inline: true
        },
        {
          name: '💎 Linh thạch thu được',
          value: `**+${spiritStones}**`,
          inline: true
        },
        {
          name: '⭐ Danh tiếng tăng',
          value: `**+${reputationGain}**`,
          inline: true
        }
      )
      .addFields({
        name: '🔍 Chi tiết tính toán EXP',
        value: expResult.breakdown.calculation,
        inline: false
      })
      .setFooter({ text: 'Nhiệm vụ tuần có thể nhận sau 7 ngày' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },
}; 