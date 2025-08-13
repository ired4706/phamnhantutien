const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');

module.exports = {
  name: 'mine',
  aliases: ['m', 'đào', 'dao'],
  description: 'Đào quặng để lấy linh thạch và khoáng sản quý',
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
    if (player.cultivation && player.cultivation.lastMine && 
        (now - player.cultivation.lastMine) < this.cooldown) {
      const remainingTime = this.cooldown - (now - player.cultivation.lastMine);
      const remainingMinutes = Math.ceil(remainingTime / 60000);
      
      const cooldownEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⏰ Đang trong thời gian hồi phục!')
        .setDescription('Bạn cần nghỉ ngơi để tiếp tục đào quặng.')
        .addFields({
          name: '⏳ Thời gian còn lại',
          value: `**${remainingMinutes} phút**`,
          inline: true
        })
        .setFooter({ text: 'Đào quặng liên tục sẽ làm tổn thương cơ thể' })
        .setTimestamp();

      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán kết quả đào quặng
    const baseExp = 30 + Math.floor(player.level * 1.0);
    const spiritStones = 25 + Math.floor(Math.random() * 50);
    const expGained = Math.floor(baseExp * (0.8 + Math.random() * 0.4)); // ±20% random

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    player.inventory.spiritStones += spiritStones;
    
    // Cập nhật thời gian đào quặng cuối
    playerManager.updatePlayer(userId, {
      'cultivation.lastMine': now,
      'inventory.spiritStones': player.inventory.spiritStones
    });

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('⛏️ Đào quặng thành công!')
      .setDescription(`**${username}** đã đào được linh thạch và khoáng sản.`)
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
      .setFooter({ text: 'Đào quặng giúp tích lũy tài nguyên cơ bản' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },
};
