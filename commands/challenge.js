const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');
const expCalculator = require('../systems/exp-calculator.js');

module.exports = {
  name: 'challenge',
  aliases: ['c', 'thachdau', 'duel'],
  description: 'Thách đấu tu sĩ khác để tăng tu vi',
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

    // Kiểm tra cooldown
    if (player.cultivation && player.cultivation.lastChallenge &&
      (now - player.cultivation.lastChallenge) < this.cooldown) {
      const remainingTime = this.cooldown - (now - player.cultivation.lastChallenge);
      const remainingMinutes = Math.ceil(remainingTime / 60000);

      const cooldownEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⏰ Đang trong thời gian hồi phục!')
        .setDescription('Bạn cần nghỉ ngơi để tiếp tục thách đấu.')
        .addFields({
          name: '⏳ Thời gian còn lại',
          value: `**${remainingMinutes} phút**`,
          inline: true
        })
        .setFooter({ text: 'Thách đấu có thể thực hiện sau 1 giờ' })
        .setTimestamp();

      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán EXP theo hệ thống mới
    const expResult = expCalculator.calculateChallengeExp(player, 'none');
    const expGained = expResult.finalExp;

    // Tính toán phần thưởng khác
    const spiritStones = 100 + Math.floor(Math.random() * 200); // 100-300
    const reputationGain = 20 + Math.floor(Math.random() * 30); // 20-50

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    player.inventory.spiritStones += spiritStones;

    // Cập nhật thời gian thách đấu cuối và danh tiếng
    playerManager.updatePlayer(userId, {
      'cultivation.lastChallenge': now,
      'inventory.spiritStones': player.inventory.spiritStones,
      'stats.reputation': (player.stats.reputation || 0) + reputationGain
    });

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#FF4500')
      .setTitle('⚔️ Thách đấu thành công!')
      .setDescription(`**${username}** đã hoàn thành một trận thách đấu.`)
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
      .setFooter({ text: 'Thách đấu có thể thực hiện sau 1 giờ' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },
};
