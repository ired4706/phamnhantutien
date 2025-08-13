const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');

module.exports = {
  name: 'challenge',
  aliases: ['chal', 'thách', 'thachdau'],
  description: 'Thách đấu với tu sĩ khác để tăng kinh nghiệm và danh tiếng',
  cooldown: 3600000, // 1 giờ = 3600000ms

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
        .setFooter({ text: 'Thách đấu liên tục sẽ làm tổn thương cơ thể' })
        .setTimestamp();

      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán kết quả thách đấu
    const baseExp = 80 + Math.floor(player.level * 2.0);
    const reputationGain = 5 + Math.floor(Math.random() * 10);
    const expGained = Math.floor(baseExp * (0.9 + Math.random() * 0.2)); // ±10% random

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    
    // Cập nhật thời gian thách đấu cuối và danh tiếng
    playerManager.updatePlayer(userId, {
      'cultivation.lastChallenge': now,
      'stats.reputation': (player.stats.reputation || 0) + reputationGain
    });

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('⚔️ Thách đấu thành công!')
      .setDescription(`**${username}** đã hoàn thành một trận thách đấu.`)
      .addFields(
        {
          name: '📊 Kinh nghiệm nhận được',
          value: `**+${expGained} EXP**`,
          inline: true
        },
        {
          name: '⭐ Danh tiếng tăng',
          value: `**+${reputationGain} REP**`,
          inline: true
        },
        {
          name: '🏮 Cảnh giới hiện tại',
          value: `**${playerManager.getRealmDisplayName(player.realm, player.realmLevel)}**`,
          inline: true
        }
      )
      .setFooter({ text: 'Thách đấu giúp rèn luyện kỹ năng chiến đấu' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },
};
