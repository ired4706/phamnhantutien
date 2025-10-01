const { EmbedBuilder } = require('discord.js');
const playerManager = require('../../systems/player.js');
const cooldownManager = require('../../utils/game/cooldown.js');
const expCalculator = require('../../systems/exp-calculator.js');
const SpiritStonesCalculator = require('../../utils/game/spirit-stones-calculator.js');

module.exports = {
  name: 'domain',
  aliases: ['dm', 'lanhdia', 'territory'],
  description: 'Khám phá lãnh địa để tìm kiếm bảo vật và tài nguyên quý hiếm',
  cooldown: 28800000, // 8h = 28800000ms

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
    const cooldownCheck = cooldownManager.checkCooldown(player, 'domain', this.cooldown);
    if (cooldownCheck.isOnCooldown) {
      const cooldownEmbed = cooldownManager.createCooldownEmbed('domain', cooldownCheck.remainingText);
      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán EXP theo hệ thống mới
    const expResult = expCalculator.calculateDomainExp(player, 'none');
    const expGained = expResult.finalExp;

    // Tính toán phần thưởng khác
    const spiritStones = SpiritStonesCalculator.calculateDomain();
    const treasures = this.getDomainTreasures();

    // Cập nhật player
    playerManager.addExperience(userId, expGained);

    // Cập nhật linh thạch theo format mới
    SpiritStonesCalculator.updatePlayerSpiritStones(player, spiritStones);

    // Cập nhật thời gian command cuối
    const lastCommandField = cooldownManager.getLastCommandField('domain');
    const updateData = {
      [lastCommandField]: now,
      ...SpiritStonesCalculator.createUpdateObject(spiritStones)
    };
    playerManager.updatePlayer(userId, updateData);

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#9932CC')
      .setTitle('🏰 Khám phá lãnh địa thành công!')
      .setDescription(`**${username}** đã khám phá được lãnh địa mới.`)
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
          name: '🏆 Bảo vật lãnh địa',
          value: treasures.join(', '),
          inline: true
        }
      )
      .addFields({
        name: '🔍 Chi tiết tính toán Linh khí',
        value: expResult.breakdown.calculation,
        inline: false
      })
      .setFooter({ text: 'Khám phá lãnh địa có thể thực hiện sau 8 giờ' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },

  /**
   * Lấy bảo vật từ lãnh địa
   * @returns {Array} Danh sách bảo vật
   */
  getDomainTreasures() {
    const treasures = [
      '👑 Vương miện cổ xưa', '🗡️ Kiếm thần thoại',
      '🛡️ Khiên bất tử', '🔮 Pha lê vũ trụ',
      '💎 Ngọc thần linh', '📜 Cuộn giấy bí mật',
      '🏺 Bình thuốc tiên', '🎭 Mặt nạ ma thuật'
    ];

    const count = Math.floor(Math.random() * 3) + 2; // 2-4 bảo vật
    const selected = [];

    for (let i = 0; i < count; i++) {
      const treasure = treasures[Math.floor(Math.random() * treasures.length)];
      if (!selected.includes(treasure)) {
        selected.push(treasure);
      }
    }

    return selected;
  }
};
