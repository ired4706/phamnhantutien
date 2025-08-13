const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');
const expCalculator = require('../systems/exp-calculator.js');
const cooldownManager = require('../utils/cooldown.js');

module.exports = {
  name: 'hunt',
  aliases: ['h', 'sanyeu', 'hunting'],
  description: 'Săn yêu thú lấy tài nguyên',
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

    // Kiểm tra cooldown sử dụng common manager
    const cooldownCheck = cooldownManager.checkCooldown(player, 'hunt', this.cooldown);
    if (cooldownCheck.isOnCooldown) {
      const cooldownEmbed = cooldownManager.createCooldownEmbed('hunt', cooldownCheck.remainingText);
      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán EXP theo hệ thống mới
    const expResult = expCalculator.calculateHuntExp(player, 'none');
    const expGained = expResult.finalExp;

    // Tính toán phần thưởng khác
    const spiritStones = 10 + Math.floor(Math.random() * 20); // 10-30
    const materials = ['Da yêu thú', 'Xương yêu thú', 'Máu yêu thú', 'Lông yêu thú'];
    const randomMaterial = materials[Math.floor(Math.random() * materials.length)];

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    player.inventory.spiritStones += spiritStones;

    // Cập nhật thời gian săn cuối
    const lastCommandField = cooldownManager.getLastCommandField('hunt');
    playerManager.updatePlayer(userId, {
      [lastCommandField]: now,
      'inventory.spiritStones': player.inventory.spiritStones
    });

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#8B4513')
      .setTitle('🏹 Săn yêu thú thành công!')
      .setDescription(`**${username}** đã săn được yêu thú.`)
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
          name: '🦴 Vật liệu thu được',
          value: `**${randomMaterial}**`,
          inline: true
        }
      )
      .addFields(        {
          name: '🔍 Chi tiết tính toán Linh khí',
          value: expResult.breakdown.calculation,
          inline: false
        })
      .setFooter({ text: 'Săn yêu thú có thể thực hiện sau 30 giây' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },
};
