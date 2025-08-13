const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');

module.exports = {
  name: 'dungeon',
  aliases: ['dun', 'thíluyện', 'thiluyen'],
  description: 'Tham gia thí luyện để rèn luyện kỹ năng và nhận phần thưởng',
  cooldown: 21600000, // 6 giờ = 21600000ms

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
    if (player.cultivation && player.cultivation.lastDungeon && 
        (now - player.cultivation.lastDungeon) < this.cooldown) {
      const remainingTime = this.cooldown - (now - player.cultivation.lastDungeon);
      const remainingHours = Math.ceil(remainingTime / 3600000);
      
      const cooldownEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⏰ Đang trong thời gian hồi phục!')
        .setDescription('Bạn cần nghỉ ngơi để tiếp tục tham gia thí luyện.')
        .addFields({
          name: '⏳ Thời gian còn lại',
          value: `**${remainingHours} giờ**`,
          inline: true
        })
        .setFooter({ text: 'Thí luyện liên tục sẽ làm tổn thương cơ thể' })
        .setTimestamp();

      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán kết quả thí luyện
    const baseExp = 120 + Math.floor(player.level * 2.5);
    const spiritStones = 80 + Math.floor(Math.random() * 120);
    const expGained = Math.floor(baseExp * (0.85 + Math.random() * 0.3)); // ±15% random

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    player.inventory.spiritStones += spiritStones;
    
    // Cập nhật thời gian thí luyện cuối
    playerManager.updatePlayer(userId, {
      'cultivation.lastDungeon': now,
      'inventory.spiritStones': player.inventory.spiritStones
    });

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🏰 Thí luyện thành công!')
      .setDescription(`**${username}** đã hoàn thành một buổi thí luyện.`)
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
      .setFooter({ text: 'Thí luyện giúp rèn luyện kỹ năng và nhận phần thưởng' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },
};
