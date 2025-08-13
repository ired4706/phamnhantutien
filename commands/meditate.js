const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');

module.exports = {
  name: 'meditate',
  aliases: ['med', 'tu', 'tuvi'],
  description: 'Tu luyện để tăng kinh nghiệm và đột phá',
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
    if (player.cultivation && player.cultivation.lastCultivate && 
        (now - player.cultivation.lastCultivate) < this.cooldown) {
      const remainingTime = this.cooldown - (now - player.cultivation.lastCultivate);
      const remainingMinutes = Math.ceil(remainingTime / 60000);
      
      const cooldownEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⏰ Đang trong thời gian hồi phục!')
        .setDescription('Bạn cần nghỉ ngơi để tiếp tục tu luyện.')
        .addFields({
          name: '⏳ Thời gian còn lại',
          value: `**${remainingMinutes} phút**`,
          inline: true
        })
        .setFooter({ text: 'Tu luyện quá sức sẽ gây tổn thương cơ thể' })
        .setTimestamp();

      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán kinh nghiệm nhận được
    const baseExp = 50 + Math.floor(player.level * 1.5);
    const realmMultiplier = playerManager.getRealmInfo(player.realm)?.experienceMultiplier || 1.0;
    const expGained = Math.floor(baseExp * realmMultiplier);

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    
    // Cập nhật thời gian tu luyện cuối
    playerManager.updatePlayer(userId, {
      'cultivation.lastCultivate': now
    });

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🧘 Tu luyện thành công!')
      .setDescription(`**${username}** đã hoàn thành một phiên tu luyện.`)
      .addFields(
        {
          name: '📊 Kinh nghiệm nhận được',
          value: `**+${expGained} EXP**`,
          inline: true
        },
        {
          name: '🏮 Cảnh giới hiện tại',
          value: `**${playerManager.getRealmDisplayName(player.realm, player.realmLevel)}**`,
          inline: true
        },
        {
          name: '⭐ Cấp độ',
          value: `**${player.level}** (${player.experience}/${player.experienceToNext})`,
          inline: true
        }
      )
      .setFooter({ text: 'Tu luyện đều đặn sẽ giúp bạn tiến bộ nhanh chóng' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },
};
