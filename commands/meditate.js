const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');
const expCalculator = require('../systems/exp-calculator.js');
const cooldownManager = require('../utils/cooldown.js');

module.exports = {
  name: 'meditate',
  aliases: ['m', 'thien', 'meditation'],
  description: 'Thiền định tu luyện để tăng tu vi',
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

    // Kiểm tra cooldown sử dụng common manager
    const cooldownCheck = cooldownManager.checkCooldown(player, 'meditate', this.cooldown);
    if (cooldownCheck.isOnCooldown) {
      const cooldownEmbed = cooldownManager.createCooldownEmbed('meditate', cooldownCheck.remainingText);
      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán EXP theo hệ thống mới
    const expResult = expCalculator.calculateMeditateExp(player, 'none');
    const expGained = expResult.finalExp;

    // Tính toán phần thưởng khác
    const spiritStones = 50 + Math.floor(Math.random() * 100); // 50-150

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    player.inventory.spiritStones += spiritStones;

    // Cập nhật thời gian thiền định cuối
    const lastCommandField = cooldownManager.getLastCommandField('meditate');
    playerManager.updatePlayer(userId, {
      [lastCommandField]: now,
      'inventory.spiritStones': player.inventory.spiritStones
    });

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#87CEEB')
      .setTitle('🧘 Thiền định tu luyện thành công!')
      .setDescription(`**${username}** đã hoàn thành buổi thiền định.`)
      .addFields(
        {
          name: '📊 Linh khí nhận được',
          value: `**+${expGained} Linh khí**`,
          inline: true
        },
        {
          name: '💎 Linh thạch thu được',
          value: `**+${spiritStones}**`,
          inline: true
        },
        {
          name: '🌿 Cảnh giới hiện tại',
          value: `**${playerManager.getRealmDisplayName(player.realm, player.realmLevel)}**`,
          inline: true
        }
      )
      .addFields({
        name: '🔍 Chi tiết tính toán Linh khí',
        value: expResult.breakdown.calculation,
        inline: false
      })
      .setFooter({ text: 'Thiền định có thể thực hiện sau 1 giờ' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },
};
