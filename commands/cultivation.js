const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');

module.exports = {
  name: 'cultivation',
  aliases: ['cv', 'tuvi', 'realm'],
  description: 'Xem thông tin chi tiết về hệ thống tu vi',

  async execute(interaction, args) {
    const realms = playerManager.realms;

    // Tạo embed chính về hệ thống tu vi
    const mainEmbed = new EmbedBuilder()
      .setColor('#8B0000')
      .setTitle('🏮 Hệ Thống Tu Vi Tu Tiên')
      .setDescription('Các cảnh giới tu luyện trong Tu Tiên Giới. Mỗi cảnh giới có đặc điểm và yêu cầu riêng.')
      .addFields(
        {
          name: '💨 Luyện Khí Kỳ',
          value: '**13 tầng** - Cảnh giới đầu tiên, luyện khí trong cơ thể',
          inline: true
        },
        {
          name: '🌱 Trúc Cơ Kỳ',
          value: '**3 kỳ** - Xây dựng nền tảng tu luyện vững chắc',
          inline: true
        },
        {
          name: '🔮 Kết Đan Kỳ',
          value: '**3 kỳ** - Kết tinh tu vi thành đan',
          inline: true
        },
        {
          name: '👶 Nguyên Anh Kỳ',
          value: '**3 kỳ** - Tu luyện nguyên thần',
          inline: true
        }
      )
      .setFooter({ text: 'Sử dụng fstatus để xem trạng thái tu luyện của bạn' })
      .setTimestamp();

    // Tạo embed chi tiết cho từng cảnh giới
    const luyenKhiEmbed = new EmbedBuilder()
      .setColor('#87CEEB')
      .setTitle('💨 Luyện Khí Kỳ')
      .setDescription('Cảnh giới đầu tiên của tu tiên, luyện khí trong cơ thể')
      .addFields(
        {
          name: '📊 Thông Tin',
          value: '**Tổng tầng**: 13\n**Mô tả**: Luyện khí trong cơ thể, tăng cường thể chất',
          inline: true
        },
        {
          name: '🎯 Yêu Cầu',
          value: '**Linh khí**: 100-1000\n**Độ khó**: 1.0x\n**Thời gian**: 1-3 ngày/tầng',
          inline: true
        },
        {
          name: '💪 Realm Bonus',
          value: '**Luyện Khí**: Không có bonus\n**Trúc Cơ Sơ**: +10% toàn bộ stats\n**Trúc Cơ Trung**: +15% toàn bộ stats\n**Trúc Cơ Hậu**: +20% toàn bộ stats',
          inline: false
        }
      );

    const trucCoEmbed = new EmbedBuilder()
      .setColor('#90EE90')
      .setTitle('🌱 Trúc Cơ Kỳ')
      .setDescription('Cảnh giới thứ hai, xây dựng nền tảng tu luyện vững chắc')
      .addFields(
        {
          name: '📊 Thông Tin',
          value: '**Tổng kỳ**: 3 (Sơ, Trung, Hậu)\n**Mô tả**: Xây dựng nền tảng tu luyện vững chắc',
          inline: true
        },
        {
          name: '🎯 Yêu Cầu',
          value: '**Linh khí**: 1000-5000\n**Độ khó**: 2.5x\n**Thời gian**: 3-7 ngày/kỳ',
          inline: true
        },
        {
          name: '💪 Realm Bonus',
          value: '**Trúc Cơ Sơ**: +10% toàn bộ stats\n**Trúc Cơ Trung**: +15% toàn bộ stats\n**Trúc Cơ Hậu**: +20% toàn bộ stats',
          inline: false
        }
      );

    const ketDanEmbed = new EmbedBuilder()
      .setColor('#DDA0DD')
      .setTitle('🔮 Kết Đan Kỳ')
      .setDescription('Cảnh giới thứ ba, kết tinh tu vi thành đan')
      .addFields(
        {
          name: '📊 Thông Tin',
          value: '**Tổng kỳ**: 3 (Sơ, Trung, Hậu)\n**Mô tả**: Kết tinh tu vi thành đan',
          inline: true
        },
        {
          name: '🎯 Yêu Cầu',
          value: '**Linh khí**: 5000-20000\n**Độ khó**: 5.0x\n**Thời gian**: 7-15 ngày/kỳ',
          inline: true
        },
        {
          name: '💪 Realm Bonus',
          value: '**Kết Đan Sơ**: +25% toàn bộ stats\n**Kết Đan Trung**: +30% toàn bộ stats\n**Kết Đan Hậu**: +35% toàn bộ stats',
          inline: false
        }
      );

    const nguyenAnhEmbed = new EmbedBuilder()
      .setColor('#F0E68C')
      .setTitle('👶 Nguyên Anh Kỳ')
      .setDescription('Cảnh giới thứ tư, tu luyện nguyên thần')
      .addFields(
        {
          name: '📊 Thông Tin',
          value: '**Tổng kỳ**: 3 (Sơ, Trung, Hậu)\n**Mô tả**: Tu luyện nguyên thần',
          inline: true
        },
        {
          name: '🎯 Yêu Cầu',
          value: '**Linh khí**: 20000-100000\n**Độ khó**: 10.0x\n**Thời gian**: 15-30 ngày/kỳ',
          inline: true
        },
        {
          name: '💪 Realm Bonus',
          value: '**Nguyên Anh Sơ**: +40% toàn bộ stats\n**Nguyên Anh Trung**: +50% toàn bộ stats\n**Nguyên Anh Hậu**: +60% toàn bộ stats',
          inline: false
        }
      );

    await interaction.reply({
      embeds: [mainEmbed, luyenKhiEmbed, trucCoEmbed, ketDanEmbed, nguyenAnhEmbed]
    });
  },
}; 