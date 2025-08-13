const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');
const expCalculator = require('../systems/exp-calculator.js');

module.exports = {
  name: 'hunt',
  aliases: ['h', 'san', 'hunting'],
  description: 'Săn yêu thú lấy tài nguyên và kinh nghiệm',
  cooldown: 30000, // 30s = 30000ms

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
    if (player.cultivation && player.cultivation.lastHunt &&
      (now - player.cultivation.lastHunt) < this.cooldown) {
      const remainingTime = this.cooldown - (now - player.cultivation.lastHunt);
      const remainingSeconds = Math.ceil(remainingTime / 1000);

      const cooldownEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⏰ Đang trong thời gian hồi phục!')
        .setDescription('Bạn cần nghỉ ngơi để tiếp tục săn yêu thú.')
        .addFields({
          name: '⏳ Thời gian còn lại',
          value: `**${remainingSeconds} giây**`,
          inline: true
        })
        .setFooter({ text: 'Săn yêu thú có thể thực hiện sau 30 giây' })
        .setTimestamp();

      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán EXP theo hệ thống mới
    const expResult = expCalculator.calculateHuntExp(player, 'none');
    const expGained = expResult.finalExp;

    // Tính toán phần thưởng khác
    const spiritStones = 10 + Math.floor(Math.random() * 20); // 10-30
    const materials = this.getRandomMaterials();

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    player.inventory.spiritStones += spiritStones;

    // Cập nhật thời gian săn cuối
    playerManager.updatePlayer(userId, {
      'cultivation.lastHunt': now,
      'inventory.spiritStones': player.inventory.spiritStones
    });

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#90EE90')
      .setTitle('🏹 Săn yêu thú thành công!')
      .setDescription(`**${username}** đã săn được yêu thú.`)
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
          name: '🌿 Tài nguyên thu được',
          value: materials.join(', '),
          inline: true
        }
      )
      .addFields({
        name: '🔍 Chi tiết tính toán EXP',
        value: expResult.breakdown.calculation,
        inline: false
      })
      .setFooter({ text: 'Săn yêu thú có thể thực hiện sau 30 giây' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },

  /**
   * Lấy tài nguyên ngẫu nhiên từ săn yêu thú
   * @returns {Array} Danh sách tài nguyên
   */
  getRandomMaterials() {
    const materials = [
      '🐺 Da yêu thú', '🦷 Nanh yêu thú', '🩸 Máu yêu thú',
      '🦴 Xương yêu thú', '🪶 Lông yêu thú', '💎 Linh thạch thô'
    ];

    const count = Math.floor(Math.random() * 3) + 1; // 1-3 tài nguyên
    const selected = [];

    for (let i = 0; i < count; i++) {
      const material = materials[Math.floor(Math.random() * materials.length)];
      if (!selected.includes(material)) {
        selected.push(material);
      }
    }

    return selected;
  }
};
