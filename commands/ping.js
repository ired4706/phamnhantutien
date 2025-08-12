const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');

module.exports = {
  name: 'ping',
  aliases: ['p', 'latency'],
  description: 'Kiểm tra độ trễ của bot',

  async execute(interaction, args) {
    // Kiểm tra xem user đã bắt đầu game chưa
    if (!playerManager.hasStartedGame(interaction.user.id)) {
      const notStartedEmbed = playerManager.createNotStartedEmbed();
      await interaction.reply({ embeds: [notStartedEmbed] });
      return;
    }

    const startTime = Date.now();

    // Tạo embed ping
    const pingEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('🏓 Pong!')
      .addFields(
        { name: 'Bot Latency', value: `${Date.now() - startTime}ms`, inline: true },
        { name: 'API Latency', value: 'N/A (prefix mode)', inline: true }
      )
      .setTimestamp();

    // Gửi embed trực tiếp
    await interaction.reply({ embeds: [pingEmbed] });
  },
}; 