const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');
const expCalculator = require('../systems/exp-calculator.js');

module.exports = {
  name: 'daily',
  aliases: ['d', 'nhiemvungay', 'dailyquest'],
  description: 'Nhận và hoàn thành nhiệm vụ hàng ngày để nhận phần thưởng lớn',
  cooldown: 86400000, // 1 ngày = 86400000ms

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

    // Kiểm tra cooldown hàng ngày
    if (player.cultivation && player.cultivation.lastDailyQuest &&
      (now - player.cultivation.lastDailyQuest) < this.cooldown) {
      const remainingTime = this.cooldown - (now - player.cultivation.lastDailyQuest);
      const remainingHours = Math.ceil(remainingTime / 3600000);

      const cooldownEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⏰ Đang trong thời gian hồi phục!')
        .setDescription('Bạn cần nghỉ ngơi để tiếp tục nhận nhiệm vụ hàng ngày.')
        .addFields({
          name: '⏳ Thời gian còn lại',
          value: `**${remainingHours} giờ**`,
          inline: true
        })
        .setFooter({ text: 'Nhiệm vụ hàng ngày có thể nhận sau 24 giờ' })
        .setTimestamp();

      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán EXP theo hệ thống mới
    const expResult = expCalculator.calculateDailyExp(player, 'none');
    const expGained = expResult.finalExp;

    // Tính toán phần thưởng khác
    const spiritStones = 100 + Math.floor(Math.random() * 200);
    const reputationGain = 15 + Math.floor(Math.random() * 25);

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    player.inventory.spiritStones += spiritStones;

    // Cập nhật thời gian nhiệm vụ hàng ngày cuối và danh tiếng
    playerManager.updatePlayer(userId, {
      'cultivation.lastDailyQuest': now,
      'inventory.spiritStones': player.inventory.spiritStones,
      'stats.reputation': (player.stats.reputation || 0) + reputationGain
    });

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('📜 Hoàn thành nhiệm vụ hàng ngày thành công!')
      .setDescription(`**${username}** đã hoàn thành nhiệm vụ hàng ngày quan trọng.`)
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
      .setFooter({ text: 'Nhiệm vụ hàng ngày có thể nhận sau 24 giờ' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },
}; 