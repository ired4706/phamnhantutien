const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');

module.exports = {
  name: 'domain',
  aliases: ['dom', 'bícảnh', 'bicanh'],
  description: 'Khám phá bí cảnh để tìm kiếm bảo vật và tăng tu vi',
  cooldown: 28800000, // 8 giờ = 28800000ms

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
    if (player.cultivation && player.cultivation.lastDomain && 
        (now - player.cultivation.lastDomain) < this.cooldown) {
      const remainingTime = this.cooldown - (now - player.cultivation.lastDomain);
      const remainingHours = Math.ceil(remainingTime / 3600000);
      
      const cooldownEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⏰ Đang trong thời gian hồi phục!')
        .setDescription('Bạn cần nghỉ ngơi để tiếp tục khám phá bí cảnh.')
        .addFields({
          name: '⏳ Thời gian còn lại',
          value: `**${remainingHours} giờ**`,
          inline: true
        })
        .setFooter({ text: 'Khám phá bí cảnh đòi hỏi nhiều sức lực' })
        .setTimestamp();

      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán kết quả khám phá bí cảnh
    const baseExp = 150 + Math.floor(player.level * 3.0);
    const spiritStones = 50 + Math.floor(Math.random() * 100);
    const expGained = Math.floor(baseExp * (0.8 + Math.random() * 0.4)); // ±20% random

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    player.inventory.spiritStones += spiritStones;
    
    // Cập nhật thời gian khám phá bí cảnh cuối
    playerManager.updatePlayer(userId, {
      'cultivation.lastDomain': now,
      'inventory.spiritStones': player.inventory.spiritStones
    });

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🌌 Khám phá bí cảnh thành công!')
      .setDescription(`**${username}** đã khám phá được một bí cảnh mới.`)
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
      .setFooter({ text: 'Bí cảnh chứa nhiều bí mật và bảo vật quý giá' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },
};
