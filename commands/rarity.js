const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');

module.exports = {
  name: 'rarity',
  aliases: ['r', 'do_hiem', 'cap_do'],
  description: 'Xem bảng độ hiếm của các vật phẩm',

  // Tạo separator đẹp mắt
  createSeparator() {
    return '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  },

  async execute(interaction, args) {
    const rarityLevels = playerManager.items.rarity_levels;

    if (!rarityLevels) {
      await interaction.reply('❌ Không thể tải thông tin độ hiếm!');
      return;
    }

    // Tạo embed chính
    const rarityEmbed = new EmbedBuilder()
      .setColor('#9370DB')
      .setTitle('🌟 **Bảng Độ Hiếm Vật Phẩm**')
      .setDescription(`${this.createSeparator()}\n**Hệ thống phân cấp độ hiếm trong tu tiên giới**`)
      .setThumbnail(interaction.user.displayAvatarURL());

    // Thêm từng cấp độ hiếm
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

    for (const rarity of rarityOrder) {
      const rarityInfo = rarityLevels[rarity];
      if (rarityInfo) {
        rarityEmbed.addFields({
          name: `${rarityInfo.emoji} **${rarityInfo.name}**`,
          value: `**Màu sắc**: ${rarityInfo.color === '#FFFFFF' ? '⚪ Trắng' : `\`${rarityInfo.color}\``}\n**Mô tả**: ${rarityInfo.description}`,
          inline: true
        });
      }
    }

    // Thêm thông tin bổ sung
    rarityEmbed.addFields({
      name: '💡 **Thông Tin Bổ Sung**',
      value: '• **Phàm cấp**: Vật phẩm thường gặp, dễ kiếm\n• **Huyền cấp**: Vật phẩm có giá trị, cần tìm kiếm\n• **Địa cấp**: Vật phẩm quý hiếm, khó tìm\n• **Thiên cấp**: Vật phẩm cực kỳ quý hiếm, hiếm gặp\n• **Thần cấp**: Vật phẩm thần thoại, cực kỳ hiếm',
      inline: false
    });

    // Thêm ví dụ vật phẩm
    rarityEmbed.addFields({
      name: '📋 **Ví Dụ Vật Phẩm**',
      value: '• **Phàm cấp**: Thảo dược cơ bản, Linh thạch hạ phẩm\n• **Huyền cấp**: Thảo dược trung cấp, Linh thạch trung phẩm\n• **Địa cấp**: Thảo dược thượng cấp, Pháp bảo trung cấp\n• **Thiên cấp**: Thảo dược cực cấp, Linh thạch cực phẩm\n• **Thần cấp**: Thiên đạo chứng minh, Vật phẩm thần thoại',
      inline: false
    });

    // Footer
    rarityEmbed.setFooter({
      text: 'Sử dụng fhelp để xem tất cả lệnh • Sử dụng fwallet để xem ví linh thạch'
    });
    rarityEmbed.setTimestamp();

    await interaction.reply({ embeds: [rarityEmbed] });
  }
}; 