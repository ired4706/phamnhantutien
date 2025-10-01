const { EmbedBuilder } = require('discord.js');
const playerManager = require('../../systems/player.js');
const cooldownManager = require('../../utils/game/cooldown.js');
const expCalculator = require('../../systems/exp-calculator.js');
const SpiritStonesCalculator = require('../../utils/game/spirit-stones-calculator.js');

module.exports = {
  name: 'daily',
  aliases: ['d', 'hangngay', 'dailyquest'],
  description: 'Nhiệm vụ hàng ngày để nhận phần thưởng lớn',
  cooldown: 86400000, // 1d = 86400000ms

  async execute(interaction, args) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Kiểm tra xem user đã bắt đầu game chưa
    if (!(await playerManager.hasStartedGame(userId))) {
      const notStartedEmbed = playerManager.createNotStartedEmbed();
      await interaction.reply({ embeds: [notStartedEmbed] });
      return;
    }

    const player = await playerManager.getPlayer(userId);
    const now = Date.now();

    // Kiểm tra cooldown sử dụng common manager
    const cooldownCheck = cooldownManager.checkCooldown(player, 'daily', this.cooldown);
    if (cooldownCheck.isOnCooldown) {
      const cooldownEmbed = cooldownManager.createCooldownEmbed('daily', cooldownCheck.remainingText);
      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán EXP theo hệ thống mới
    const expResult = expCalculator.calculateDailyExp(player, 'none');
    const expGained = expResult.finalExp;

    // Tính toán phần thưởng khác
    const spiritStones = SpiritStonesCalculator.calculateDaily();
    const rewards = this.getDailyRewards();

    // Cập nhật player
    playerManager.addExperience(userId, expGained);

    // Cập nhật linh thạch theo format mới
    SpiritStonesCalculator.updatePlayerSpiritStones(player, spiritStones);

    // Cập nhật thời gian command cuối
    const lastCommandField = cooldownManager.getLastCommandField('daily');
    const updateData = {
      [lastCommandField]: now,
      ...SpiritStonesCalculator.createUpdateObject(spiritStones)
    };
    playerManager.updatePlayer(userId, updateData);

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('📅 Nhiệm vụ hàng ngày hoàn thành!')
      .setDescription(`**${username}** đã hoàn thành nhiệm vụ hàng ngày.`)
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
      .setFooter({ text: 'Nhiệm vụ hàng ngày có thể thực hiện sau 24 giờ' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },

  /**
   * Lấy phần thưởng nhiệm vụ hàng ngày
   * @returns {Array} Danh sách phần thưởng
   */
  getDailyRewards() {
    const rewards = [
      '🌟 Kinh nghiệm tu luyện', '🌿 Thảo dược quý hiếm',
      '💎 Khoáng sản đặc biệt', '⚔️ Trang bị tạm thời',
      '🔮 Bùa chú ngẫu nhiên', '📚 Kỹ năng mới'
    ];

    const count = Math.floor(Math.random() * 3) + 2; // 2-4 phần thưởng
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