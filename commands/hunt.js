const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');

module.exports = {
  name: 'hunt',
  aliases: ['h', 'săn', 'sănbắt'],
  description: 'Săn bắt yêu thú để lấy tài nguyên và kinh nghiệm',
  cooldown: 30000, // 30 giây = 30000ms

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
    if (player.cultivation && player.cultivation.lastHunt && 
        (now - player.cultivation.lastHunt) < this.cooldown) {
      const remainingTime = this.cooldown - (now - player.cultivation.lastHunt);
      const remainingSeconds = Math.ceil(remainingTime / 1000);
      
      const cooldownEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⏰ Đang trong thời gian hồi phục!')
        .setDescription('Bạn cần nghỉ ngơi để tiếp tục săn bắt.')
        .addFields({
          name: '⏳ Thời gian còn lại',
          value: `**${remainingSeconds} giây**`,
          inline: true
        })
        .setFooter({ text: 'Săn bắt liên tục sẽ làm yêu thú cảnh giác' })
        .setTimestamp();

      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán kết quả săn bắt
    const baseExp = 20 + Math.floor(player.level * 0.8);
    const spiritStones = 10 + Math.floor(Math.random() * 20);
    const expGained = Math.floor(baseExp * (0.8 + Math.random() * 0.4)); // ±20% random

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    player.inventory.spiritStones += spiritStones;
    
    // Cập nhật thời gian săn bắt cuối
    playerManager.updatePlayer(userId, {
      'cultivation.lastHunt': now,
      'inventory.spiritStones': player.inventory.spiritStones
    });

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🏹 Săn bắt thành công!')
      .setDescription(`**${username}** đã săn bắt được yêu thú.`)
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
        }
      )
      .setFooter({ text: 'Săn bắt thường xuyên để tích lũy tài nguyên' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },
};
