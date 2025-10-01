const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const playerManager = require('../../systems/player.js');
const emojiLoader = require('../../utils/game/emoji-loader.js');

module.exports = {
  name: 'wallet',
  aliases: ['w', 'vi', 'tien', 'linhthach'],
  description: 'Xem ví linh thạch và tài sản',

  // Tạo separator đẹp mắt
  createSeparator() {
    return '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  },

  // Format linh thạch với emoji và màu sắc
  formatSpiritStones(spiritStones) {
    // Xử lý dữ liệu bị lỗi
    if (!spiritStones) {
      return '0 hạ phẩm';
    }

    // Nếu là string bị lỗi như "[object Object]903"
    if (typeof spiritStones === 'string') {
      const match = spiritStones.match(/(\d+)$/);
      if (match) {
        const amount = parseInt(match[1]);
        return `${amount.toLocaleString()} hạ phẩm (dữ liệu cũ)`;
      }
      return '0 hạ phẩm (dữ liệu lỗi)';
    }

    // Nếu là number (dữ liệu cũ)
    if (typeof spiritStones === 'number') {
      return `${spiritStones.toLocaleString()} hạ phẩm (dữ liệu cũ)`;
    }

    // Nếu là object hợp lệ
    if (typeof spiritStones === 'object' && spiritStones.ha_pham !== undefined) {
      const parts = [];
      if (spiritStones.cuc_pham > 0) parts.push(`💎${spiritStones.cuc_pham}`);
      if (spiritStones.thuong_pham > 0) parts.push(`🔮${spiritStones.thuong_pham}`);
      if (spiritStones.trung_pham > 0) parts.push(`✨${spiritStones.trung_pham}`);
      if (spiritStones.ha_pham > 0) parts.push(`🪙${spiritStones.ha_pham}`);

      if (parts.length === 0) {
        return '0 hạ phẩm';
      }

      return parts.join(' ');
    }

    // Fallback
    return '0 hạ phẩm (dữ liệu không hợp lệ)';
  },

  // Tính tổng giá trị quy đổi về hạ phẩm
  calculateTotalValue(spiritStones) {
    // Xử lý dữ liệu bị lỗi
    if (!spiritStones) {
      return 0;
    }

    // Nếu là string bị lỗi như "[object Object]903"
    if (typeof spiritStones === 'string') {
      const match = spiritStones.match(/(\d+)$/);
      if (match) {
        return parseInt(match[1]);
      }
      return 0;
    }

    // Nếu là number (dữ liệu cũ)
    if (typeof spiritStones === 'number') {
      return spiritStones;
    }

    // Nếu là object hợp lệ
    if (typeof spiritStones === 'object' && spiritStones.ha_pham !== undefined) {
      return (spiritStones.cuc_pham * 1000000) +
        (spiritStones.thuong_pham * 10000) +
        (spiritStones.trung_pham * 100) +
        spiritStones.ha_pham;
    }

    // Fallback
    return 0;
  },

  // Format tổng giá trị
  formatTotalValue(totalValue) {
    if (totalValue >= 1000000) {
      return `${(totalValue / 1000000).toFixed(2)}M hạ phẩm`;
    } else if (totalValue >= 1000) {
      return `${(totalValue / 1000).toFixed(2)}K hạ phẩm`;
    } else {
      return `${totalValue.toLocaleString()} hạ phẩm`;
    }
  },

  // Tạo progress bar cho tổng tài sản
  createWealthBar(totalValue) {
    // Phân loại theo mức độ giàu có
    let wealthLevel, wealthColor, wealthEmoji;

    if (totalValue >= 10000000) {
      wealthLevel = 'Cực Kỳ Giàu Có';
      wealthColor = '#FFD700'; // Vàng
      wealthEmoji = '👑';
    } else if (totalValue >= 1000000) {
      wealthLevel = 'Rất Giàu Có';
      wealthColor = '#FF4500'; // Cam đỏ
      wealthEmoji = '💰';
    } else if (totalValue >= 100000) {
      wealthLevel = 'Giàu Có';
      wealthColor = '#32CD32'; // Xanh lá
      wealthEmoji = '💵';
    } else if (totalValue >= 10000) {
      wealthLevel = 'Khá Giàu';
      wealthColor = '#4169E1'; // Xanh dương
      wealthEmoji = '💳';
    } else if (totalValue >= 1000) {
      wealthLevel = 'Tạm Đủ';
      wealthColor = '#9370DB'; // Tím
      wealthEmoji = '💸';
    } else {
      wealthLevel = 'Nghèo';
      wealthColor = '#808080'; // Xám
      wealthEmoji = '🪙';
    }

    return { level: wealthLevel, color: wealthColor, emoji: wealthEmoji };
  },

  // Hiển thị tỷ lệ quy đổi
  async showExchangeRates(interaction) {
    const exchangeEmbed = new EmbedBuilder()
      .setColor('#4169E1')
      .setTitle('🔄 **Tỷ Lệ Quy Đổi Linh Thạch**')
      .setDescription(`${this.createSeparator()}\n**Hệ thống quy đổi giữa các bậc linh thạch**`)
      .addFields(
        {
          name: '💎 **Cực Phẩm**',
          value: '**1 Cực Phẩm** = 100 Thượng Phẩm\n**1 Cực Phẩm** = 10,000 Trung Phẩm\n**1 Cực Phẩm** = 1,000,000 Hạ Phẩm',
          inline: true
        },
        {
          name: '🔮 **Thượng Phẩm**',
          value: '**1 Thượng Phẩm** = 100 Trung Phẩm\n**1 Thượng Phẩm** = 10,000 Hạ Phẩm',
          inline: true
        },
        {
          name: '✨ **Trung Phẩm**',
          value: '**1 Trung Phẩm** = 100 Hạ Phẩm',
          inline: true
        },
        {
          name: '🪙 **Hạ Phẩm**',
          value: '**1 Hạ Phẩm** = 1 Hạ Phẩm\n*Đơn vị cơ bản nhất*',
          inline: true
        },
        {
          name: '💡 **Gợi Ý Sử Dụng**',
          value: '• **Hạ Phẩm**: Giao dịch hàng ngày\n• **Trung Phẩm**: Mua vật phẩm trung cấp\n• **Thượng Phẩm**: Mua vật phẩm cao cấp\n• **Cực Phẩm**: Giao dịch lớn, đột phá',
          inline: false
        }
      )
      .setFooter({ text: 'Sử dụng fhelp để xem tất cả lệnh' })
      .setTimestamp();

    await interaction.reply({ embeds: [exchangeEmbed], ephemeral: true });
  },

  async execute(interaction, args) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Kiểm tra xem user đã bắt đầu game chưa
    if (!(await playerManager.hasStartedGame(userId))) {
      const notStartedEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ **Chưa Bắt Đầu Tu Tiên**')
        .setDescription('Bạn cần sử dụng `fstart` để bắt đầu tu tiên trước!')
        .setFooter({ text: 'Sử dụng fhelp để xem tất cả lệnh' });

      await interaction.reply({ embeds: [notStartedEmbed] });
      return;
    }

    // Lấy thông tin player
    const player = await playerManager.getPlayer(userId);
    const spiritStones = player.inventory.spiritStones;
    const totalValue = this.calculateTotalValue(spiritStones);
    const wealthInfo = this.createWealthBar(totalValue);

    // Tạo embed chính
    const walletEmbed = new EmbedBuilder()
      .setColor(wealthInfo.color)
      .setTitle(`${wealthInfo.emoji} **Ví Linh Thạch - ${username}**`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription(`${this.createSeparator()}\n**Tài sản linh thạch hiện tại**`);

    // Thông tin tổng quan
    walletEmbed.addFields({
      name: '💎 **Tổng Tài Sản**',
      value: `**${this.formatTotalValue(totalValue)}**\n${wealthInfo.emoji} **${wealthInfo.level}**`,
      inline: false
    });

    // Chi tiết từng loại linh thạch
    if (typeof spiritStones === 'object' && spiritStones.ha_pham !== undefined) {
      const stoneDetails = [];

      if (spiritStones.cuc_pham > 0) {
        stoneDetails.push(`${emojiLoader.getCurrencyEmoji('cuc_pham')} **Cực Phẩm**: ${spiritStones.cuc_pham.toLocaleString()} (${(spiritStones.cuc_pham * 100).toLocaleString()} Thượng Phẩm)`);
      }
      if (spiritStones.thuong_pham > 0) {
        stoneDetails.push(`${emojiLoader.getCurrencyEmoji('thuong_pham')} **Thượng Phẩm**: ${spiritStones.thuong_pham.toLocaleString()} (${(spiritStones.thuong_pham * 100).toLocaleString()} Trung Phẩm)`);
      }
      if (spiritStones.trung_pham > 0) {
        stoneDetails.push(`${emojiLoader.getCurrencyEmoji('trung_pham')} **Trung Phẩm**: ${spiritStones.trung_pham.toLocaleString()} (${(spiritStones.trung_pham * 100).toLocaleString()} Hạ Phẩm)`);
      }
      if (spiritStones.ha_pham > 0) {
        stoneDetails.push(`${emojiLoader.getCurrencyEmoji('ha_pham')} **Hạ Phẩm**: ${spiritStones.ha_pham.toLocaleString()}`);
      }

      if (stoneDetails.length > 0) {
        walletEmbed.addFields({
          name: '📊 **Chi Tiết Linh Thạch**',
          value: stoneDetails.join('\n'),
          inline: false
        });
      }
    } else {
      // Hiển thị thông tin dữ liệu cũ
      let oldDataInfo = '';
      if (typeof spiritStones === 'string') {
        const match = spiritStones.match(/(\d+)$/);
        if (match) {
          oldDataInfo = `🪙 **Hạ Phẩm (dữ liệu cũ)**: ${parseInt(match[1]).toLocaleString()}`;
        } else {
          oldDataInfo = '❌ **Dữ liệu linh thạch bị lỗi**';
        }
      } else if (typeof spiritStones === 'number') {
        oldDataInfo = `🪙 **Hạ Phẩm (dữ liệu cũ)**: ${spiritStones.toLocaleString()}`;
      } else {
        oldDataInfo = '❌ **Dữ liệu linh thạch không hợp lệ**';
      }

      walletEmbed.addFields({
        name: '⚠️ **Dữ Liệu Cũ**',
        value: oldDataInfo,
        inline: false
      });
    }

    // Gợi ý kiếm tiền
    walletEmbed.addFields({
      name: '💡 **Cách Kiếm Linh Thạch**',
      value: '• **fhunt** - Săn quái vật\n• **fmine** - Khai thác mỏ\n• **fdaily** - Nhiệm vụ hàng ngày\n• **fweekly** - Nhiệm vụ hàng tuần\n• **fchallenge** - Thách đấu tu sĩ khác',
      inline: false
    });

    // Footer
    walletEmbed.setFooter({
      text: `Cập nhật lần cuối: ${new Date().toLocaleString('vi-VN')} • Sử dụng fhelp để xem tất cả lệnh`
    });
    walletEmbed.setTimestamp();

    // Tạo buttons
    const exchangeButton = new ButtonBuilder()
      .setCustomId('show_exchange_rates')
      .setLabel('🔄 Tỷ Lệ Quy Đổi')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('💱');

    const row = new ActionRowBuilder().addComponents(exchangeButton);

    // Gửi message với button
    await interaction.reply({
      embeds: [walletEmbed],
      components: [row]
    });

    // Tạo collector để lắng nghe button click
    try {
      const filter = i => i.customId === 'show_exchange_rates' && i.user.id === userId;
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 300000 // 5 phút
      });

      collector.on('collect', async (buttonInteraction) => {
        try {
          if (buttonInteraction.customId === 'show_exchange_rates') {
            await this.showExchangeRates(buttonInteraction);
          }
        } catch (error) {
          console.error('Error in button handler:', error);
          await buttonInteraction.followUp({
            content: '❌ Có lỗi xảy ra khi xử lý yêu cầu!',
            ephemeral: true
          });
        }
      });

      collector.on('end', () => {
        console.log('Wallet button collector ended');
      });
    } catch (error) {
      console.error('Error setting up collector:', error);
    }
  }
}; 