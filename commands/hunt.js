const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');
const expCalculator = require('../systems/exp-calculator.js');
const cooldownManager = require('../utils/cooldown.js');
const SpiritStonesCalculator = require('../utils/spirit-stones-calculator.js');
const ItemDropCalculator = require('../utils/item-drop-calculator.js');

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
    const spiritStones = SpiritStonesCalculator.calculateHunt();
    const huntItems = ItemDropCalculator.calculateHuntItems(player);

    // Cập nhật player
    playerManager.addExperience(userId, expGained);

    // Cập nhật linh thạch theo format mới
    SpiritStonesCalculator.updatePlayerSpiritStones(player, spiritStones);

    // Thêm vật liệu săn được vào inventory
    huntItems.forEach(item => {
      playerManager.addItemToInventory(player, item.id, 1);
    });

    // Cập nhật thời gian săn cuối
    const lastCommandField = cooldownManager.getLastCommandField('hunt');
    const updateData = {
      [lastCommandField]: now,
      ...SpiritStonesCalculator.createUpdateObject(spiritStones)
    };
    playerManager.updatePlayer(userId, updateData);

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
          value: SpiritStonesCalculator.formatSpiritStones(spiritStones),
          inline: true
        },
        {
          name: '🦴 Vật liệu thu được',
          value: huntItems.length > 0 ? ItemDropCalculator.formatItems(huntItems) : 'Không có vật liệu nào',
          inline: false
        }
      )
      .addFields({
        name: '🔍 Chi tiết tính toán Linh khí',
        value: expResult.breakdown.calculation,
        inline: false
      })
      .setFooter({ text: 'Săn yêu thú có thể thực hiện sau 30 giây' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  }
};
