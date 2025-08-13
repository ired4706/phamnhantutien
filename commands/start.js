const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const playerManager = require('../systems/player.js');

module.exports = {
  name: 'start',
  aliases: ['batdau', 'begin'],
  description: 'Bắt đầu hành trình tu tiên - chọn linh căn',

  async execute(interaction, args) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Kiểm tra xem user đã có linh căn chưa
    const existingPlayer = playerManager.getPlayer(userId);
    if (existingPlayer && existingPlayer.spiritRoot) {
      const spiritRoot = playerManager.getSpiritRootInfo(existingPlayer.spiritRoot);

      const alreadyStartedEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('❌ Bạn đã bắt đầu rồi!')
        .setDescription(`Bạn đã có linh căn **${spiritRoot.emoji} ${spiritRoot.name}** rồi!`)
        .addFields({
          name: '💡 Gợi ý',
          value: 'Sử dụng `fstatus` để xem trạng thái tu luyện của bạn',
          inline: false
        });

      await interaction.reply({ embeds: [alreadyStartedEmbed] });
      return;
    }

    // Tạo embed chọn linh căn
    const startEmbed = new EmbedBuilder()
      .setColor('#8B0000')
      .setTitle('🌿 Chào mừng đến với Tu Tiên Giới!')
      .setDescription(`**${username}**, hãy chọn linh căn phù hợp với thiên phú của bạn!\n\nLinh căn sẽ quyết định hướng tu luyện và khả năng của bạn trong tương lai.`)
      .addFields(
        {
          name: '⚔️ Kim Linh Căn',
          value: 'Chuyên về công kích sắc bén và phòng thủ cứng cáp',
          inline: true
        },
        {
          name: '🌳 Mộc Linh Căn',
          value: 'Chuyên về hồi phục và né tránh',
          inline: true
        },
        {
          name: '💧 Thủy Linh Căn',
          value: 'Chuyên về tốc độ và né tránh',
          inline: true
        },
        {
          name: '🔥 Hỏa Linh Căn',
          value: 'Chuyên về công kích mãnh liệt và chí mạng',
          inline: true
        },
        {
          name: '🏔️ Thổ Linh Căn',
          value: 'Chuyên về phòng thủ và hồi phục',
          inline: true
        }
      )
      .setFooter({ text: 'Chọn linh căn cẩn thận - không thể thay đổi sau này! Sử dụng fcultivation để xem thông tin tu vi.' })
      .setTimestamp();

    // Tạo buttons để chọn linh căn - sử dụng cấu trúc Discord.js v14
    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('choose_kim')
          .setLabel('Kim Linh Căn')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('⚔️'),
        new ButtonBuilder()
          .setCustomId('choose_moc')
          .setLabel('Mộc Linh Căn')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🌳'),
        new ButtonBuilder()
          .setCustomId('choose_thuy')
          .setLabel('Thủy Linh Căn')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('💧')
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('choose_hoa')
          .setLabel('Hỏa Linh Căn')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔥'),
        new ButtonBuilder()
          .setCustomId('choose_tho')
          .setLabel('Thổ Linh Căn')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🏔️')
      );

    await interaction.reply({
      content: '🎯 **Hãy chọn linh căn của bạn!**\n\nClick vào button tương ứng với linh căn bạn muốn chọn:\n\n💡 **Tip**: Sử dụng `fcultivation` để xem thông tin chi tiết về hệ thống tu vi!',
      embeds: [startEmbed],
      components: [row1, row2]
    });
  },
}; 