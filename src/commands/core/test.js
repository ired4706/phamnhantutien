const { EmbedBuilder } = require('discord.js');
const playerManager = require('../../systems/player.js');

module.exports = {
  name: 'test',
  aliases: ['t', 'kiemtra'],
  description: 'Test command để kiểm tra hệ thống',

  async execute(interaction, args) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Kiểm tra xem user đã bắt đầu game chưa
    if (!(await playerManager.hasStartedGame(userId))) {
      await interaction.reply('❌ Bạn cần sử dụng `fstart` để bắt đầu tu tiên trước!');
      return;
    }

    // Lấy thông tin player
    const player = await playerManager.getPlayer(userId);

    // Test spiritStones
    const spiritStones = player.inventory.spiritStones;
    const spiritStonesType = typeof spiritStones;
    const spiritStonesString = JSON.stringify(spiritStones, null, 2);

    // Test add spirit stones
    const testResult = playerManager.addSpiritStones(player, 'ha_pham', 10);

    const testEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🧪 **Test Command - Kiểm Tra Hệ Thống**')
      .setDescription(`**Kết quả kiểm tra cho ${username}**`)
      .addFields(
        {
          name: '📊 **Thông Tin SpiritStones**',
          value: `**Kiểu dữ liệu**: ${spiritStonesType}\n**Giá trị**: \`\`\`json\n${spiritStonesString}\n\`\`\``,
          inline: false
        },
        {
          name: '✅ **Test Add Spirit Stones**',
          value: `Thêm 10 hạ phẩm: ${testResult ? 'Thành công' : 'Thất bại'}`,
          inline: true
        },
        {
          name: '🔍 **Kiểm Tra Sau Khi Thêm**',
          value: `Hạ phẩm hiện tại: ${playerManager.getSpiritStoneQuantity(player, 'ha_pham')}`,
          inline: true
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [testEmbed] });
  }
}; 