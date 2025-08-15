const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');
const cooldownManager = require('../utils/cooldown.js');
const expCalculator = require('../systems/exp-calculator.js');
const SpiritStonesCalculator = require('../utils/spirit-stones-calculator.js');

module.exports = {
  name: 'dungeon',
  aliases: ['dg', 'hamnguc', 'underground'],
  description: 'Khám phá hầm ngục để tìm kiếm kho báu và đánh bại quái vật',
  cooldown: 21600000, // 6h = 21600000ms

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
    const cooldownCheck = cooldownManager.checkCooldown(player, 'dungeon', this.cooldown);
    if (cooldownCheck.isOnCooldown) {
      const cooldownEmbed = cooldownManager.createCooldownEmbed('dungeon', cooldownCheck.remainingText);
      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán EXP theo hệ thống mới
    const expResult = expCalculator.calculateDungeonExp(player, 'none');
    const expGained = expResult.finalExp;

    // Tính toán kết quả khám phá hầm ngục
    const isVictory = Math.random() > 0.3; // 70% cơ hội thành công
    const spiritStones = SpiritStonesCalculator.calculateDungeon();
    const loot = this.getDungeonLoot();

    // Cập nhật player
    playerManager.addExperience(userId, expGained);

    // Cập nhật linh thạch theo format mới
    SpiritStonesCalculator.updatePlayerSpiritStones(player, spiritStones);

    // Cập nhật thời gian command cuối
    const lastCommandField = cooldownManager.getLastCommandField('dungeon');
    const updateData = {
      [lastCommandField]: now,
      ...SpiritStonesCalculator.createUpdateObject(spiritStones)
    };
    playerManager.updatePlayer(userId, updateData);

    // Tạo embed thông báo kết quả
    const resultColor = isVictory ? '#00FF00' : '#FF4500';
    const resultTitle = isVictory ? '🐉 Khám phá hầm ngục thành công!' : '💀 Khám phá hầm ngục thất bại!';
    const resultDescription = isVictory
      ? `**${username}** đã khám phá thành công hầm ngục!`
      : `**${username}** đã gặp khó khăn trong hầm ngục.`;

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
          value: SpiritStonesCalculator.formatSpiritStones(spiritStones),
          inline: true
        },
        {
          name: '⚔️ Kết quả khám phá',
          value: isVictory ? '**Thành công** 🐉' : '**Thất bại** 💀',
          inline: true
        }
      )
      .addFields(
        {
          name: '🏆 Chiến lợi phẩm',
          value: loot.join(', '),
          inline: false
        },
        {
          name: '🔍 Chi tiết tính toán Linh khí',
          value: expResult.breakdown.calculation,
          inline: false
        }
      )
      .setFooter({ text: 'Khám phá hầm ngục có thể thực hiện sau 6 giờ' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },

  /**
   * Lấy chiến lợi phẩm từ hầm ngục
   * @returns {Array} Danh sách chiến lợi phẩm
   */
  getDungeonLoot() {
    const loot = [
      '⚔️ Vũ khí ma thuật', '🛡️ Giáp trụ bảo vệ',
      '🔮 Pha lê ma lực', '💎 Đá quý hiếm',
      '🌿 Thảo dược ma thuật', '📜 Bí kíp tu luyện',
      '🏺 Bình thuốc ma thuật', '🎭 Trang phục ma thuật'
    ];

    const count = Math.floor(Math.random() * 3) + 2; // 2-4 chiến lợi phẩm
    const selected = [];

    for (let i = 0; i < count; i++) {
      const item = loot[Math.floor(Math.random() * loot.length)];
      if (!selected.includes(item)) {
        selected.push(item);
      }
    }

    return selected;
  }
};
