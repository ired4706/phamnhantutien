const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');

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
        { name: '🎮 Lệnh Cơ Bản', value: '`fstart` - Bắt đầu hành trình tu tiên - chọn linh căn\n`fhelp` - Hiển thị hướng dẫn này', inline: false },
        { name: '🏮 Lệnh Thông Tin', value: '`fspiritroot` - Xem thông tin linh căn\n`fcultivation` - Xem thông tin hệ thống tu vi\n`fstatus` - Xem trạng thái tu luyện', inline: false },
        { name: '🗺️ Lệnh Khám Phá (Cooldown)', value: '`fdomain` - Khám phá bí cảnh (8h)\n`fdaily` - Nhiệm vụ hàng ngày (1d)\n`fweekly` - Nhiệm vụ hàng tuần (1w)\n`fdungeon` - Thí luyện (6h)', inline: false },
        { name: '⚔️ Lệnh Tu Luyện (Cooldown)', value: '`fmeditate` - Thiền định tu luyện (1h)\n`fhunt` - Săn yêu thú (30s)\n`fchallenge` - Thách đấu tu sĩ (1h)\n`fbreakthrough` - Đột phá cảnh giới', inline: false },
        { name: '🌿 Lệnh Thu Thập (Cooldown)', value: '`fmine` - Khai thác khoáng sản (1h)\n`fpick` - Thu thập thảo dược (5m)\n`fexplore` - Khám phá thế giới (10m)', inline: false }
      )
      .setFooter({ text: 'Sử dụng fstart để bắt đầu hành trình tu tiên!' })
      .setTimestamp();

    await interaction.reply({
      embeds: [helpEmbed]
    });
  },
}; 