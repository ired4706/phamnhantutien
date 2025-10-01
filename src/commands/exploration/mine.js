const { EmbedBuilder } = require('discord.js');
const playerManager = require('../../systems/player.js');
const cooldownManager = require('../../utils/game/cooldown.js');
const expCalculator = require('../../systems/exp-calculator.js');
const SpiritStonesCalculator = require('../../utils/game/spirit-stones-calculator.js');
const ItemDropCalculator = require('../../utils/game/item-drop-calculator.js');

module.exports = {
  name: 'mine',
  aliases: ['mi', 'dao', 'mining'],
  description: 'Khai thác khoáng sản để lấy tài nguyên (không có Linh khí)',
  cooldown: 3600000, // 1h = 3600000ms

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
    const cooldownCheck = cooldownManager.checkCooldown(player, 'mine', this.cooldown);
    if (cooldownCheck.isOnCooldown) {
      const cooldownEmbed = cooldownManager.createCooldownEmbed('mine', cooldownCheck.remainingText);
      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán Linh khí theo hệ thống mới (mine = 0 Linh khí)
    const expResult = expCalculator.calculateMineExp(player, 'none');
    const expGained = expResult.finalExp; // Sẽ luôn = 0

    // Tính toán phần thưởng khác
    const spiritStones = SpiritStonesCalculator.calculateMine();
    const minerals = ItemDropCalculator.calculateMineItems(player);

    // Cập nhật player
    playerManager.addExperience(userId, expGained);

    // Cập nhật linh thạch theo format mới
    SpiritStonesCalculator.updatePlayerSpiritStones(player, spiritStones);

    // Cập nhật thời gian command cuối
    const lastCommandField = cooldownManager.getLastCommandField('mine');
    const updateData = {
      [lastCommandField]: now,
      ...SpiritStonesCalculator.createUpdateObject(spiritStones)
    };
    playerManager.updatePlayer(userId, updateData);

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#8B4513')
      .setTitle('⛏️ Khai thác khoáng sản thành công!')
      .setDescription(`**${username}** đã hoàn thành buổi khai thác.`)
      .addFields(
        {
          name: '📊 Linh khí nhận được',
          value: `**+${expGained} Linh khí** (Khai thác không có Linh khí)`,
          inline: true
        },
        {
          name: '💎 Linh thạch thu được',
          value: SpiritStonesCalculator.formatSpiritStones(spiritStones),
          inline: true
        },
        {
          name: '🌿 Khoáng sản thu được',
          value: minerals.length > 0 ? ItemDropCalculator.formatItems(minerals) : 'Không có khoáng sản nào',
          inline: false
        }
      )
      .addFields({
        name: '🔍 Chi tiết tính toán Linh khí',
        value: expResult.breakdown.calculation,
        inline: false
      })
      .setFooter({ text: `Khai thác có thể thực hiện sau 1 giờ • Tu vi ${player.realm} nhận ${minerals.length} khoáng sản` })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },


};
