const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'test',
  aliases: ['t'],
  description: 'Test command để kiểm tra buttons',

  async execute(interaction, args) {
    const testEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🧪 Test Buttons')
      .setDescription('Đây là command test để kiểm tra buttons có hoạt động không');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('test_button')
          .setLabel('Test Button')
          .setStyle(ButtonStyle.Primary)
      );

    await interaction.reply({
      content: '🧪 **Test Buttons**',
      embeds: [testEmbed],
      components: [row]
    });
  },
}; 