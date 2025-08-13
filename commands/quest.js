const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');

module.exports = {
  name: 'quest',
  aliases: ['q', 'nhiệm', 'nhiemvu'],
  description: 'Nhận và hoàn thành nhiệm vụ để nhận phần thưởng lớn',
  cooldown: 43200000, // 12 giờ = 43200000ms
  weeklyCooldown: 604800000, // 7 ngày = 604800000ms

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
    if (player.cultivation && player.cultivation.lastQuest && 
        (now - player.cultivation.lastQuest) < this.cooldown) {
      const remainingTime = this.cooldown - (now - player.cultivation.lastQuest);
      const remainingHours = Math.ceil(remainingTime / 3600000);
      
      const cooldownEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⏰ Đang trong thời gian hồi phục!')
        .setDescription('Bạn cần nghỉ ngơi để tiếp tục nhận nhiệm vụ.')
        .addFields({
          name: '⏳ Thời gian còn lại',
          value: `**${remainingHours} giờ**`,
          inline: true
        })
        .setFooter({ text: 'Nhiệm vụ hàng ngày có thể nhận sau 12 giờ' })
        .setTimestamp();

      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Kiểm tra cooldown hàng tuần
    if (player.cultivation && player.cultivation.lastWeeklyQuest && 
        (now - player.cultivation.lastWeeklyQuest) < this.weeklyCooldown) {
      const remainingTime = this.weeklyCooldown - (now - player.cultivation.lastWeeklyQuest);
      const remainingDays = Math.ceil(remainingTime / 86400000);
      
      const weeklyCooldownEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⏰ Nhiệm vụ tuần đang trong thời gian hồi phục!')
        .setDescription('Bạn cần chờ để nhận nhiệm vụ tuần mới.')
        .addFields({
          name: '⏳ Thời gian còn lại',
          value: `**${remainingDays} ngày**`,
          inline: true
        })
        .setFooter({ text: 'Nhiệm vụ tuần có thể nhận sau 7 ngày' })
        .setTimestamp();

      await interaction.reply({ embeds: [weeklyCooldownEmbed] });
      return;
    }

    // Tính toán kết quả nhiệm vụ
    const baseExp = 200 + Math.floor(player.level * 4.0);
    const spiritStones = 100 + Math.floor(Math.random() * 200);
    const reputationGain = 15 + Math.floor(Math.random() * 25);
    const expGained = Math.floor(baseExp * (0.9 + Math.random() * 0.2)); // ±10% random

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    player.inventory.spiritStones += spiritStones;
    
    // Cập nhật thời gian nhiệm vụ cuối và danh tiếng
    playerManager.updatePlayer(userId, {
      'cultivation.lastQuest': now,
      'cultivation.lastWeeklyQuest': now,
      'inventory.spiritStones': player.inventory.spiritStones,
      'stats.reputation': (player.stats.reputation || 0) + reputationGain
    });

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('📜 Hoàn thành nhiệm vụ thành công!')
      .setDescription(`**${username}** đã hoàn thành một nhiệm vụ quan trọng.`)
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
          value: `**+${reputationGain} REP**`,
          inline: true
        },
        {
          name: '🏮 Cảnh giới hiện tại',
          value: `**${playerManager.getRealmDisplayName(player.realm, player.realmLevel)}**`,
          inline: true
        }
      )
      .setFooter({ text: 'Nhiệm vụ mang lại phần thưởng phong phú' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },
};
