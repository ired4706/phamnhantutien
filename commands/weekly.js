const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');
const cooldownManager = require('../utils/cooldown.js');
const expCalculator = require('../systems/exp-calculator.js');
const SpiritStonesCalculator = require('../utils/spirit-stones-calculator.js');

module.exports = {
  name: 'weekly',
  aliases: ['w', 'hangtuan', 'weeklyquest'],
  description: 'Nhiệm vụ hàng tuần để nhận phần thưởng cực lớn',
  cooldown: 604800000, // 1w = 604800000ms

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
    const cooldownCheck = cooldownManager.checkCooldown(player, 'weekly', this.cooldown);
    if (cooldownCheck.isOnCooldown) {
      const cooldownEmbed = cooldownManager.createCooldownEmbed('weekly', cooldownCheck.remainingText);
      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán EXP theo hệ thống mới
    const expResult = expCalculator.calculateWeeklyExp(player, 'none');
    const expGained = expResult.finalExp;

    // Tính toán phần thưởng khác
    const spiritStones = SpiritStonesCalculator.calculateWeekly();
    const rewards = this.getWeeklyRewards();

    // Cập nhật player
    playerManager.addExperience(userId, expGained);

    // Cập nhật linh thạch theo format mới
    SpiritStonesCalculator.updatePlayerSpiritStones(player, spiritStones);

    // Cập nhật thời gian command cuối
    const lastCommandField = cooldownManager.getLastCommandField('weekly');
    const updateData = {
      [lastCommandField]: now,
      ...SpiritStonesCalculator.createUpdateObject(spiritStones)
    };
    playerManager.updatePlayer(userId, updateData);

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#FF4500')
      .setTitle('📆 Nhiệm vụ hàng tuần hoàn thành!')
      .setDescription(`**${username}** đã hoàn thành nhiệm vụ hàng tuần.`)
      .addFields(
        {
          name: '📊 Linh khí nhận được',
          value: `**+${expGained} Linh khí**`,
          inline: true
        },
        {
          name: '💎 Linh thạch thu được',
          value: SpiritStonesCalculator.formatSpiritStones(spiritStones),
          inline: true
        },
        {
          name: '🎁 Phần thưởng đặc biệt',
          value: rewards.join(', '),
          inline: true
        }
      )
      .addFields({
        name: '🔍 Chi tiết tính toán Linh khí',
        value: expResult.breakdown.calculation,
        inline: false
      })
      .setFooter({ text: 'Nhiệm vụ hàng tuần có thể thực hiện sau 7 ngày' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },

  /**
   * Lấy phần thưởng nhiệm vụ hàng tuần
   * @returns {Array} Danh sách phần thưởng
   */
  getWeeklyRewards() {
    const rewards = [
      '🌟 Kinh nghiệm tu luyện lớn', '🌿 Thảo dược cực quý hiếm',
      '💎 Khoáng sản thần thoại', '⚔️ Trang bị vĩnh viễn',
      '🔮 Bùa chú mạnh mẽ', '📚 Kỹ năng độc đáo',
      '🏆 Danh hiệu đặc biệt', '🎭 Trang phục hiếm'
    ];

    const count = Math.floor(Math.random() * 4) + 3; // 3-6 phần thưởng
    const selected = [];

    for (let i = 0; i < count; i++) {
      const reward = rewards[Math.floor(Math.random() * rewards.length)];
      if (!selected.includes(reward)) {
        selected.push(reward);
      }
    }

    return selected;
  }
}; 