const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');
const expCalculator = require('../systems/exp-calculator.js');
const cooldownManager = require('../utils/cooldown.js');

module.exports = {
  name: 'dungeon',
  aliases: ['dg', 'thiluyen', 'dungeon'],
  description: 'Thí luyện trong dungeon để tăng tu vi',
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

    // Kiểm tra cooldown
    if (player.cultivation && player.cultivation.lastDungeon &&
      (now - player.cultivation.lastDungeon) < this.cooldown) {
      const remainingTime = this.cooldown - (now - player.cultivation.lastDungeon);
      const remainingHours = Math.ceil(remainingTime / 3600000);

      const cooldownEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⏰ Đang trong thời gian hồi phục!')
        .setDescription('Bạn cần nghỉ ngơi để tiếp tục thí luyện trong dungeon.')
        .addFields({
          name: '⏳ Thời gian còn lại',
          value: `**${remainingHours} giờ**`,
          inline: true
        })
        .setFooter({ text: 'Dungeon có thể thí luyện sau 6 giờ' })
        .setTimestamp();

      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tính toán EXP theo hệ thống mới
    const expResult = expCalculator.calculateDungeonExp(player, 'none');
    const expGained = expResult.finalExp;

    // Tính toán phần thưởng khác
    const spiritStones = 200 + Math.floor(Math.random() * 300); // 200-500
    const dungeonMaterials = this.getDungeonMaterials();

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    player.inventory.spiritStones += spiritStones;

    // Cập nhật thời gian command cuối
    const lastCommandField = cooldownManager.getLastCommandField('dungeon');
    playerManager.updatePlayer(userId, {
      [lastCommandField]: now,
      'inventory.spiritStones': player.inventory.spiritStones
    });

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#FF8C00')
      .setTitle('🏰 Thí luyện dungeon thành công!')
      .setDescription(`**${username}** đã hoàn thành thí luyện trong dungeon.`)
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
        }
      )
      .addFields({
        name: '🗡️ Vật phẩm dungeon',
        value: dungeonMaterials.join(', '),
        inline: false
      })
      .addFields({
        name: '🔍 Chi tiết tính toán EXP',
        value: expResult.breakdown.calculation,
        inline: false
      })
      .setFooter({ text: 'Dungeon có thể thí luyện sau 6 giờ' })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },

  /**
   * Lấy vật phẩm từ dungeon
   * @returns {Array} Danh sách vật phẩm
   */
  getDungeonMaterials() {
    const materials = [
      '🗡️ Vũ khí dungeon', '🛡️ Giáp trụ dungeon', '💊 Thuốc hồi phục',
      '📜 Bí kíp chiến đấu', '💎 Linh thạch dungeon', '🌿 Thảo dược dungeon'
    ];

    const count = Math.floor(Math.random() * 2) + 2; // 2-3 vật phẩm
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
