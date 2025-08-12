const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const playerManager = require('../systems/player.js');

module.exports = {
  name: 'spiritroot',
  aliases: ['sr', 'linhcan', 'root'],
  description: 'Xem thông tin chi tiết về linh căn',

  async execute(interaction, args) {
    // Kiểm tra xem user đã bắt đầu game chưa
    if (!playerManager.hasStartedGame(interaction.user.id)) {
      const notStartedEmbed = playerManager.createNotStartedEmbed();
      await interaction.reply({ embeds: [notStartedEmbed] });
      return;
    }

    const spiritRoots = playerManager.getAllSpiritRoots();

    // Tạo embed chính
    const mainEmbed = new EmbedBuilder()
      .setColor('#8B0000')
      .setTitle('🏮 Hệ Thống Linh Căn Tu Tiên')
      .setDescription('Linh căn quyết định thiên phú và hướng tu luyện của tu sĩ. Mỗi linh căn có ưu thế và nhược điểm riêng.')
      .addFields(
        {
          name: '⚔️ Kim Linh Căn',
          value: 'Chuyên về công kích sắc bén và phòng thủ cứng cáp',
          inline: true
        },
        {
          name: '🌳 Mộc Linh Căn',
          value: 'Chuyên về sinh trưởng và hồi phục',
          inline: true
        },
        {
          name: '💧 Thủy Linh Căn',
          value: 'Chuyên về linh hoạt và biến hóa',
          inline: true
        },
        {
          name: '🔥 Hỏa Linh Căn',
          value: 'Chuyên về công kích mãnh liệt và phá hủy',
          inline: true
        },
        {
          name: '🏔️ Thổ Linh Căn',
          value: 'Chuyên về phòng thủ và ổn định',
          inline: true
        }
      );

    // Tạo buttons để xem chi tiết từng linh căn
    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('spirit_kim')
          .setLabel('⚔️ Kim')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('spirit_moc')
          .setLabel('🌳 Mộc')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('spirit_thuy')
          .setLabel('💧 Thủy')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('spirit_hoa')
          .setLabel('🔥 Hỏa')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('spirit_tho')
          .setLabel('🏔️ Thổ')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.reply({
      embeds: [mainEmbed],
      components: [buttons]
    });
  },
}; 