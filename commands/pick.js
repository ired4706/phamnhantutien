const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');

module.exports = {
  name: 'pick',
  aliases: ['p', 'hái', 'hai'],
  description: 'Hái thuốc và tài nguyên từ thiên nhiên',
  cooldown: 300000, // 5 phút = 300000ms

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
    if (player.cultivation && player.cultivation.lastPick && 
        (now - player.cultivation.lastPick) < this.cooldown) {
      const remainingTime = this.cooldown - (now - player.cultivation.lastPick);
      const remainingMinutes = Math.ceil(remainingTime / 60000);
      
      const cooldownEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⏰ Đang trong thời gian hồi phục!')
        .setDescription('Bạn cần chờ để thiên nhiên phục hồi.')
        .addFields({
          name: '⏳ Thời gian còn lại',
          value: `**${remainingMinutes} phút**`,
          inline: true
        })
        .setFooter({ text: 'Hái thuốc quá thường xuyên sẽ làm cạn kiệt tài nguyên' })
        .setTimestamp();

      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán kết quả hái thuốc
    const baseExp = 15 + Math.floor(player.level * 0.5);
    const spiritStones = 5 + Math.floor(Math.random() * 15);
    const expGained = Math.floor(baseExp * (0.9 + Math.random() * 0.2)); // ±10% random

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    player.inventory.spiritStones += spiritStones;
    
    // Cập nhật thời gian hái thuốc cuối
    playerManager.updatePlayer(userId, {
      'cultivation.lastPick': now,
      'inventory.spiritStones': player.inventory.spiritStones
    });

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🌿 Hái thuốc thành công!')
      .setDescription(`**${username}** đã hái được dược liệu và tài nguyên.`)
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
      .setFooter({ text: 'Thiên nhiên cung cấp dược liệu quý giá' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },
};
