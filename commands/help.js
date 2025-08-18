const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const playerManager = require('../systems/player.js');

module.exports = {
  name: 'help',
  aliases: ['h', 'trogiup', 'huongdan'],
  description: 'Hiển thị danh sách các lệnh tu tiên và hướng dẫn sử dụng',

  async execute(interaction, args) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Tạo embed chính với layout đẹp mắt
    const mainHelpEmbed = new EmbedBuilder()
      .setColor('#8B0000')
      .setTitle('🌿 **Tu Tiên Giới - Hướng Dẫn Tu Luyện**')
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription(`${this.createSeparator()}\n**Chào mừng bạn đến với thế giới tu tiên!**\n\nĐây là danh sách các lệnh có sẵn để bắt đầu hành trình tu luyện của bạn.`);

    // Thông tin cơ bản
    mainHelpEmbed.addFields(
      {
        name: '🎮 **Lệnh Khởi Đầu**',
        value: '• **`fstart`** - Bắt đầu hành trình tu tiên, chọn linh căn\n• **`fhelp`** - Hiển thị hướng dẫn này',
        inline: false
      },
              {
          name: '🏮 **Lệnh Thông Tin**',
          value: '• **`fstatus`** - Xem trạng thái tu luyện và tiến độ đột phá\n• **`fspiritroot`** - Xem thông tin linh căn\n• **`fcultivation`** - Xem thông tin hệ thống tu vi\n• **`fbreakthrough`** - Xem chi tiết tiến độ đột phá và vật phẩm cần thiết\n• **`finventory`** - Xem inventory và vật phẩm của bạn',
          inline: false
        }
    );

    // Thêm footer
    mainHelpEmbed.setFooter({
      text: 'Sử dụng các button bên dưới để xem chi tiết từng nhóm lệnh'
    });
    mainHelpEmbed.setTimestamp();

    // Tạo các button để xem chi tiết từng nhóm
    const explorationButton = new ButtonBuilder()
      .setCustomId('help_exploration')
      .setLabel('Khám Phá')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🗺️');

    const cultivationButton = new ButtonBuilder()
      .setCustomId('help_cultivation')
      .setLabel('Tu Luyện')
      .setStyle(ButtonStyle.Success)
      .setEmoji('⚔️');

    const collectionButton = new ButtonBuilder()
      .setCustomId('help_collection')
      .setLabel('Thu Thập')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🌿');

    const gameInfoButton = new ButtonBuilder()
      .setCustomId('help_game_info')
      .setLabel('Thông Tin Game')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('ℹ️');

    const row = new ActionRowBuilder().addComponents(
      explorationButton,
      cultivationButton,
      collectionButton,
      gameInfoButton
    );

    // Gửi message với button
    await interaction.reply({
      embeds: [mainHelpEmbed],
      components: [row]
    });

    // Tạo collector để lắng nghe button click
    try {
      const filter = i => i.user.id === userId && i.customId.startsWith('help_');
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 600000 // 10 phút
      });

      collector.on('collect', async (buttonInteraction) => {
        try {
          const helpType = buttonInteraction.customId.replace('help_', '');
          await this.showDetailedHelp(buttonInteraction, helpType);
        } catch (error) {
          console.error('Error in help button handler:', error);
          await buttonInteraction.followUp({
            content: '❌ Có lỗi xảy ra khi hiển thị thông tin!',
            ephemeral: true
          });
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          console.log('Help button interaction timed out');
        }
      });

      collector.on('error', (error) => {
        console.error('Help collector error:', error);
      });
    } catch (error) {
      console.error('Failed to create help button collector:', error);
    }
  },

  // Tạo separator đẹp mắt
  createSeparator() {
    return '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  },

  // Hiển thị thông tin chi tiết theo nhóm
  async showDetailedHelp(interaction, helpType) {
    let embed;

    switch (helpType) {
      case 'exploration':
        embed = this.createExplorationHelpEmbed();
        break;
      case 'cultivation':
        embed = this.createCultivationHelpEmbed();
        break;
      case 'collection':
        embed = this.createCollectionHelpEmbed();
        break;
      case 'game_info':
        embed = this.createGameInfoHelpEmbed();
        break;
      default:
        embed = this.createMainHelpEmbed();
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  // Embed cho lệnh khám phá
  createExplorationHelpEmbed() {
    return new EmbedBuilder()
      .setColor('#4169E1')
      .setTitle('🗺️ **Lệnh Khám Phá & Nhiệm Vụ**')
      .setDescription(`${this.createSeparator()}\n**Các lệnh để khám phá thế giới tu tiên và hoàn thành nhiệm vụ**`)
      .addFields(
        {
          name: '🏔️ **Bí Cảnh (8h Cooldown)**',
          value: '• **`fdomain`** - Khám phá bí cảnh cấp cao\n• Thu được vật phẩm quý hiếm và linh khí dồi dào\n• Có thể gặp boss và nhận pháp bảo',
          inline: false
        },
        {
          name: '🎯 **Nhiệm Vụ Hàng Ngày (1d Cooldown)**',
          value: '• **`fdaily`** - Nhiệm vụ hàng ngày\n• Hoàn thành để nhận phần thưởng cố định\n• Tích lũy điểm danh tiếng và linh khí',
          inline: false
        },
        {
          name: '🌟 **Nhiệm Vụ Hàng Tuần (1w Cooldown)**',
          value: '• **`fweekly`** - Nhiệm vụ hàng tuần\n• Phần thưởng lớn hơn nhiệm vụ hàng ngày\n• Có thể nhận vật phẩm đặc biệt',
          inline: false
        },
        {
          name: '🏰 **Thí Luyện (6h Cooldown)**',
          value: '• **`fdungeon`** - Thí luyện trong bí cảnh\n• Rèn luyện kỹ năng chiến đấu\n• Thu được kinh nghiệm và vật phẩm',
          inline: false
        },
      )
      .setFooter({ text: 'Sử dụng fhelp để quay lại menu chính' })
      .setTimestamp();
  },

  // Embed cho lệnh tu luyện
  createCultivationHelpEmbed() {
    return new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('⚔️ **Lệnh Tu Luyện & Chiến Đấu**')
      .setDescription(`${this.createSeparator()}\n**Các lệnh để tu luyện, đột phá và chiến đấu**`)
      .addFields(
        {
          name: '🧘 **Thiền Định (1h Cooldown)**',
          value: '• **`fmeditate`** - Thiền định tu luyện\n• Tích lũy linh khí ổn định\n• Tăng tỷ lệ đột phá thành công',
          inline: false
        },
        {
          name: '🦁 **Săn Yêu Thú (30s Cooldown)**',
          value: '• **`fhunt`** - Săn yêu thú lấy tài nguyên\n• Cooldown ngắn, phù hợp tu luyện liên tục\n• Thu được linh khí và vật phẩm cơ bản',
          inline: false
        },
        {
          name: '⚔️ **Thách Đấu (1h Cooldown)**',
          value: '• **`fchallenge`** - Thách đấu tu sĩ khác\n• Rèn luyện kỹ năng chiến đấu\n• Thu được kinh nghiệm và danh tiếng',
          inline: false
        },
        {
          name: '🚀 **Đột Phá Cảnh Giới**',
          value: '• **`fbreakthrough`** - Thực hiện đột phá\n• Cần đủ linh khí và vật phẩm\n• Tỷ lệ thành công không phải 100%',
          inline: false
        },
      )
      .setFooter({ text: 'Sử dụng fhelp để quay lại menu chính' })
      .setTimestamp();
  },

  // Embed cho lệnh thu thập
  createCollectionHelpEmbed() {
    return new EmbedBuilder()
      .setColor('#FF8C00')
      .setTitle('🌿 **Lệnh Thu Thập & Khai Thác**')
      .setDescription(`${this.createSeparator()}\n**Các lệnh để thu thập tài nguyên và vật phẩm**`)
      .addFields(
        {
          name: '🌿 **Thu Thập Thảo Dược (5m Cooldown)**',
          value: '• **`fpick`** - Thu thập thảo dược ngay lập tức\n• Cooldown ngắn, phù hợp thu thập liên tục\n• Thu được thảo dược thực tế từ herbs.json\n• Linh khí: 40-50, Thảo dược: 2-4 loại',
          inline: false
        },
        {
          name: '💎 **Khai Thác Khoáng Sản (1h Cooldown)**',
          value: '• **`fmine`** - Khai thác khoáng sản\n• Thu được linh thạch và khoáng sản\n• Cần thời gian dài nhưng phần thưởng tốt',
          inline: false
        },
        {
          name: '🗺️ **Khám Phá Thế Giới (10m Cooldown)**',
          value: '• **`fexplore`** - Khám phá thế giới\n• Thu được vật phẩm đa dạng\n• Có thể gặp sự kiện đặc biệt',
          inline: false
        },
        {
          name: '🎒 **Quản Lý Inventory**',
          value: '• **`finventory`** - Xem inventory và vật phẩm\n• Phân loại theo category và rarity\n• Thống kê linh thạch và trang bị',
          inline: false
        }
      )
      .setFooter({ text: 'Sử dụng fhelp để quay lại menu chính' })
      .setTimestamp();
  },

  // Embed cho thông tin game
  createGameInfoHelpEmbed() {
    return new EmbedBuilder()
      .setColor('#9932CC')
      .setTitle('ℹ️ **Thông Tin Hệ Thống Game**')
      .setDescription(`${this.createSeparator()}\n**Thông tin chi tiết về các hệ thống trong game**`)
      .addFields(
        {
          name: '🏮 **Hệ Thống Cảnh Giới**',
          value: '• **Luyện Khí**: 13 tầng (cảnh giới đầu tiên)\n• **Trúc Cơ**: 3 kỳ (Sơ, Trung, Hậu)\n• **Kết Đan**: 3 kỳ (Sơ, Trung, Hậu)\n• **Nguyên Anh**: 3 kỳ (Sơ, Trung, Hậu)',
          inline: false
        },
        {
          name: '🌱 **Hệ Thống Linh Căn**',
          value: '• **Kim** ⚔️: Công kích cao, phòng thủ thấp\n• **Mộc** 🌳: Hồi phục tốt, cân bằng\n• **Thủy** 💧: Linh lực dồi dào, né tránh cao\n• **Hỏa** 🔥: Chí mạng cao, tốc độ nhanh\n• **Thổ** 🏔️: Phòng thủ cao, công kích thấp',
          inline: false
        },
        {
          name: '💎 **Hệ Thống Vật Phẩm**',
          value: '• **Linh Thạch**: Tiền tệ trong game\n• **Thảo Dược**: Vật phẩm tu luyện\n• **Đan Dược**: Tăng tỷ lệ đột phá\n• **Pháp Bảo**: Tăng sức mạnh chiến đấu',
          inline: false
        },
        {
          name: '⚔️ **Hệ Thống Chiến Đấu**',
          value: '• **HP/MP**: Sinh mệnh và linh lực\n• **ATK/DEF**: Công kích và phòng thủ\n• **SPD/CRT**: Tốc độ và chí mạng\n• **RGN/EVA**: Hồi phục và né tránh',
          inline: false
        },
        {
          name: '💡 **Mẹo Chơi Game**',
          value: '• Tích lũy đủ linh khí trước khi đột phá\n• Sử dụng linh căn phù hợp với phong cách chơi\n• Hoàn thành nhiệm vụ hàng ngày để nhận phần thưởng\n• Tham gia các hoạt động để tăng kinh nghiệm',
          inline: false
        }
      )
      .setFooter({ text: 'Sử dụng fhelp để quay lại menu chính' })
      .setTimestamp();
  },

  // Embed chính (fallback)
  createMainHelpEmbed() {
    return new EmbedBuilder()
      .setColor('#8B0000')
      .setTitle('🌿 **Tu Tiên Giới - Hướng Dẫn Tu Luyện**')
      .setDescription(`${this.createSeparator()}\n**Danh sách các lệnh tu tiên có sẵn**`)
      .addFields(
        {
          name: '🎮 **Lệnh Cơ Bản**',
          value: '`fstart` - Bắt đầu hành trình tu tiên\n`fhelp` - Hiển thị hướng dẫn này',
          inline: false
        },
        {
          name: '🏮 **Lệnh Thông Tin**',
          value: '`fstatus` - Trạng thái tu luyện\n`fspiritroot` - Thông tin linh căn\n`fcultivation` - Hệ thống tu vi\n`fbreakthrough` - Tiến độ đột phá\n`finventory` - Xem inventory',
          inline: false
        },
        {
          name: '🗺️ **Lệnh Khám Phá**',
          value: '`fdomain` (8h) - Bí cảnh\n`fdaily` (1d) - Nhiệm vụ ngày\n`fweekly` (1w) - Nhiệm vụ tuần\n`fdungeon` (6h) - Thí luyện',
          inline: false
        },
        {
          name: '⚔️ **Lệnh Tu Luyện**',
          value: '`fmeditate` (1h) - Thiền định\n`fhunt` (30s) - Săn yêu thú\n`fchallenge` (1h) - Thách đấu',
          inline: false
        },
        {
          name: '🌿 **Lệnh Thu Thập**',
          value: '`fmine` (1h) - Khai thác\n`fpick` (5m) - Thu thập\n`fexplore` (10m) - Khám phá',
          inline: false
        }
      )
      .setFooter({ text: 'Sử dụng fhelp để xem hướng dẫn chi tiết' })
      .setTimestamp();
  }
}; 