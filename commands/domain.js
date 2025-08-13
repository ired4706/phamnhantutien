const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');
const cooldownManager = require('../utils/cooldown.js');
const expCalculator = require('../systems/exp-calculator.js');

module.exports = {
  name: 'domain',
  aliases: ['d', 'bicanh', 'bicảnh'],
  description: 'Khám phá bí cảnh domain để nhận phần thưởng lớn',
  cooldown: 28800000, // 8h = 28800000ms

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
    const cooldownCheck = cooldownManager.checkCooldown(player, 'domain', this.cooldown);
    if (cooldownCheck.isOnCooldown) {
      const cooldownEmbed = cooldownManager.createCooldownEmbed('domain', cooldownCheck.remainingText);
      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán EXP theo hệ thống mới
    const expResult = expCalculator.calculateDomainExp(player, 'domain', 'none');
    const expGained = expResult.finalExp;

    // Tính toán phần thưởng khác (domain có phần thưởng lớn)
    const spiritStones = 500 + Math.floor(Math.random() * 1000); // 500-1500
    const rareMaterials = this.getRareMaterials();

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    player.inventory.spiritStones += spiritStones;

    // Cập nhật thời gian command cuối
    const lastCommandField = cooldownManager.getLastCommandField('domain');
    playerManager.updatePlayer(userId, {
      [lastCommandField]: now,
      'inventory.spiritStones': player.inventory.spiritStones
    });

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#8A2BE2')
      .setTitle('🏛️ Khám phá domain thành công!')
      .setDescription(`**${username}** đã khám phá được bí cảnh domain.`)
      .addFields(
        {
          name: '📊 Kinh nghiệm nhận được',
          value: `**+${expGained} Linh khí**`,
          inline: true
        },
        {
          name: '💎 Linh thạch thu được',
          value: `**+${spiritStones}**`,
          inline: true
        }
      )
      .addFields({
        name: '🌿 Tài nguyên quý hiếm',
        value: rareMaterials.join(', '),
        inline: false
      })
      .addFields({
        name: '🔍 Chi tiết tính toán EXP',
        value: expResult.breakdown.calculation,
        inline: false
      })
      .setFooter({ text: 'Domain có thể khám phá sau 8 giờ' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },

  /**
   * Lấy tài nguyên quý hiếm từ domain
   * @returns {Array} Danh sách tài nguyên quý hiếm
   */
  getRareMaterials() {
    const materials = [
      '🔮 Linh đan', '⚔️ Pháp bảo', '📜 Công pháp',
      '💎 Linh thạch tinh khiết', '🌿 Thảo dược quý', '🪨 Khoáng sản hiếm'
    ];

    const count = Math.floor(Math.random() * 2) + 2; // 2-3 tài nguyên quý hiếm
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
