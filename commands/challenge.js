const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');
const expCalculator = require('../systems/exp-calculator.js');
const cooldownManager = require('../utils/cooldown.js');

module.exports = {
  name: 'challenge',
  aliases: ['c', 'thachdau', 'duel'],
  description: 'Thách đấu tu sĩ khác để tăng tu vi',
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
    const cooldownCheck = cooldownManager.checkCooldown(player, 'challenge', this.cooldown);
    if (cooldownCheck.isOnCooldown) {
      const cooldownEmbed = cooldownManager.createCooldownEmbed('challenge', cooldownCheck.remainingText);
      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán EXP theo hệ thống mới
    const expResult = expCalculator.calculateChallengeExp(player, 'none');
    const expGained = expResult.finalExp;

    // Tính toán kết quả thách đấu (thắng/thua)
    const isVictory = Math.random() > 0.4; // 60% cơ hội thắng
    const spiritStones = 100 + Math.floor(Math.random() * 200); // 100-300

    // Cập nhật danh tiếng và karma dựa trên kết quả
    let reputationChange = 0;
    let karmaChange = 0;

    if (isVictory) {
      reputationChange = 1; // +1 danh tiếng khi thắng
      karmaChange = 0;
    } else {
      reputationChange = 0;
      karmaChange = 1; // +1 karma khi thua
    }

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    player.inventory.spiritStones += spiritStones;

    // Cập nhật thời gian command cuối
    const lastCommandField = cooldownManager.getLastCommandField('challenge');
    playerManager.updatePlayer(userId, {
      [lastCommandField]: now,
      'inventory.spiritStones': player.inventory.spiritStones,
      'stats.reputation': (player.stats.reputation || 0) + reputationChange,
      'stats.karma': (player.stats.karma || 0) + karmaChange
    });

    // Tạo embed thông báo kết quả
    const resultColor = isVictory ? '#00FF00' : '#FF4500';
    const resultTitle = isVictory ? '🏆 Thách đấu thắng lợi!' : '💀 Thách đấu thất bại!';
    const resultDescription = isVictory
      ? `**${username}** đã chiến thắng trong trận thách đấu!`
      : `**${username}** đã thất bại trong trận thách đấu.`;

    const successEmbed = new EmbedBuilder()
      .setColor(resultColor)
      .setTitle(resultTitle)
      .setDescription(resultDescription)
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
          name: '⚔️ Kết quả thách đấu',
          value: isVictory ? '**Chiến thắng** 🏆' : '**Thất bại** 💀',
          inline: true
        }
      )
      .addFields(
        {
          name: '✨ Thay đổi danh tiếng',
          value: reputationChange > 0 ? `**+${reputationChange}**` : '**Không thay đổi**',
          inline: true
        },
        {
          name: '🌙 Thay đổi karma',
          value: karmaChange > 0 ? `**+${karmaChange}**` : '**Không thay đổi**',
          inline: true
        }
      )
      .addFields({
        name: '🔍 Chi tiết tính toán Linh khí',
        value: expResult.breakdown.calculation,
        inline: false
      })
      .setFooter({ text: 'Thách đấu có thể thực hiện sau 1 giờ' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },
};
