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
        { name: '🎮 Lệnh Cơ Bản', value: '`fstart` - Bắt đầu hành trình tu tiên\n`fstatus` - Xem trạng thái tu luyện\n`fhelp` - Hiển thị hướng dẫn\n`fping` - Kiểm tra độ trễ bot', inline: false },
        { name: '🏮 Lệnh Thông Tin', value: '`fspiritroot` - Xem thông tin linh căn\n`fcultivation` - Xem hệ thống tu vi', inline: false },
        { name: '🧘 Lệnh Tu Luyện (Cooldown)', value: '`fmeditate` - Tu luyện (1h)\n`fhunt` - Săn bắt (30s)\n`fchallenge` - Thách đấu (1h)', inline: false },
        { name: '🗺️ Lệnh Khám Phá (Cooldown)', value: '`fdomain` - Khám phá bí cảnh (8h)\n`fquest` - Nhiệm vụ (12h/7d)\n`fdungeon` - Thí luyện (6h)', inline: false },
        { name: '⛏️ Lệnh Thu Thập (Cooldown)', value: '`fmine` - Đào quặng (1h)\n`fpick` - Hái thuốc (5m)\n`fexplore` - Khám phá (10m)', inline: false }
      )
      .setFooter({ text: 'Sử dụng fstart để bắt đầu hành trình tu tiên!' })
      .setTimestamp();

    await interaction.reply({ embeds: [helpEmbed] });
  },
}; 