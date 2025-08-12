const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  aliases: ['h', 'trogiup'],
  description: 'Hiển thị danh sách các lệnh tu tiên',

  async execute(interaction, args) {
    const helpEmbed = new EmbedBuilder()
      .setColor('#8B0000')
      .setTitle('🌿 Tu Tiên Giới - Hướng dẫn tu luyện')
      .setDescription('Danh sách các lệnh tu tiên có sẵn:')
      .addFields(
        { name: 'fstart', value: 'Bắt đầu hành trình tu tiên - chọn linh căn', inline: true },
        { name: 'fhelp', value: 'Hiển thị hướng dẫn này', inline: true },
        { name: 'fping', value: 'Kiểm tra độ trễ của bot', inline: true },
        { name: 'fstatus', value: 'Xem trạng thái tu luyện', inline: true },
        { name: 'fspiritroot', value: 'Xem thông tin linh căn', inline: true },
        { name: 'fcultivation', value: 'Xem thông tin hệ thống tu vi', inline: true },
        { name: 'fcultivate', value: 'Tu luyện để tăng tu vi', inline: true },
        { name: 'fbreakthrough', value: 'Đột phá cảnh giới', inline: true },
        { name: 'fhunt', value: 'Săn yêu thú lấy tài nguyên', inline: true }
      )
      .setFooter({ text: 'Sử dụng fstart để bắt đầu hành trình tu tiên!' })
      .setTimestamp();

    await interaction.reply({ embeds: [helpEmbed] });
  },
}; 