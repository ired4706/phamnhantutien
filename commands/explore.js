const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');

module.exports = {
  name: 'explore',
  aliases: ['exp', 'khám', 'kham'],
  description: 'Khám phá thế giới để tìm kiếm cơ hội và tài nguyên',
  cooldown: 600000, // 10 phút = 600000ms

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
    if (player.cultivation && player.cultivation.lastExplore && 
        (now - player.cultivation.lastExplore) < this.cooldown) {
      const remainingTime = this.cooldown - (now - player.cultivation.lastExplore);
      const remainingMinutes = Math.ceil(remainingTime / 60000);
      
      const cooldownEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⏰ Đang trong thời gian hồi phục!')
        .setDescription('Bạn cần nghỉ ngơi để tiếp tục khám phá.')
        .addFields({
          name: '⏳ Thời gian còn lại',
          value: `**${remainingMinutes} phút**`,
          inline: true
        })
        .setFooter({ text: 'Khám phá liên tục sẽ làm mệt mỏi' })
        .setTimestamp();

      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán kết quả khám phá
    const baseExp = 25 + Math.floor(player.level * 0.8);
    const spiritStones = 15 + Math.floor(Math.random() * 30);
    const expGained = Math.floor(baseExp * (0.85 + Math.random() * 0.3)); // ±15% random

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    player.inventory.spiritStones += spiritStones;
    
    // Cập nhật thời gian khám phá cuối
    playerManager.updatePlayer(userId, {
      'cultivation.lastExplore': now,
      'inventory.spiritStones': player.inventory.spiritStones
    });

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🗺️ Khám phá thành công!')
      .setDescription(`**${username}** đã khám phá được vùng đất mới.`)
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
          name: '💎 Tổng linh thạch',
          value: `**${player.inventory.spiritStones}**`,
          inline: true
        },
        {
          name: '🏮 Cảnh giới hiện tại',
          value: `**${playerManager.getRealmDisplayName(player.realm, player.realmLevel)}**`,
          inline: true
        }
      )
      .setFooter({ text: 'Thế giới rộng lớn chứa nhiều bí mật chờ khám phá' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },
};
