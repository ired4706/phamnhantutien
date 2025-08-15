const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');
const cooldownManager = require('../utils/cooldown.js');
const expCalculator = require('../systems/exp-calculator.js');

module.exports = {
  name: 'explore',
  aliases: ['e', 'khampha', 'exploration'],
  description: 'Khám phá thế giới để tìm kiếm bí mật và tài nguyên',
  cooldown: 600000, // 10m = 600000ms

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
    const cooldownCheck = cooldownManager.checkCooldown(player, 'explore', this.cooldown);
    if (cooldownCheck.isOnCooldown) {
      const cooldownEmbed = cooldownManager.createCooldownEmbed('explore', cooldownCheck.remainingText);
      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán Linh khí theo hệ thống mới (explore có Linh khí random 120-150)
    const expResult = expCalculator.calculateExploreExp(player, 'none');
    const expGained = expResult.finalExp;

    // Tính toán phần thưởng khác
    const spiritStones = 50 + Math.floor(Math.random() * 100); // 50-150
    const discoveries = this.getDiscoveries();

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    player.inventory.spiritStones += spiritStones;

    // Cập nhật thời gian command cuối
    const lastCommandField = cooldownManager.getLastCommandField('explore');
    playerManager.updatePlayer(userId, {
      [lastCommandField]: now,
      'inventory.spiritStones': player.inventory.spiritStones
    });

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#4169E1')
      .setTitle('🗺️ Khám phá thế giới thành công!')
      .setDescription(`**${username}** đã khám phá được những điều mới lạ.`)
      .addFields(
        {
          name: '📊 Linh khí nhận được',
          value: `**+${expGained} Linh khí** (Random 120-150)`,
          inline: true
        },
        {
          name: '💎 Linh thạch thu được',
          value: `**+${spiritStones}**`,
          inline: true
        },
        {
          name: '🔍 Khám phá mới',
          value: discoveries.join(', '),
          inline: true
        }
      )
      .addFields({
        name: '🔍 Chi tiết tính toán Linh khí',
        value: expResult.breakdown.calculation,
        inline: false
      })
      .setFooter({ text: 'Khám phá có thể thực hiện sau 10 phút' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },

  /**
   * Lấy khám phá từ thế giới
   * @returns {Array} Danh sách khám phá
   */
  getDiscoveries() {
    const discoveries = [
      '🏔️ Núi cao', '🌊 Biển rộng', '🌲 Rừng rậm',
      '🏜️ Sa mạc', '🏞️ Thung lũng', '🌋 Núi lửa',
      '🏰 Lâu đài cổ', '🗿 Tượng đá', '🏛️ Đền thờ',
      '🌅 Bình minh', '🌄 Hoàng hôn', '🌌 Bầu trời đêm'
    ];

    const count = Math.floor(Math.random() * 3) + 2; // 2-4 khám phá
    const selected = [];

    for (let i = 0; i < count; i++) {
      const discovery = discoveries[Math.floor(Math.random() * discoveries.length)];
      if (!selected.includes(discovery)) {
        selected.push(discovery);
      }
    }

    return selected;
  }
};
