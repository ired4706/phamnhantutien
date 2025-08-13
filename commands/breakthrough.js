const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const playerManager = require('../systems/player.js');

module.exports = {
  name: 'breakthrough',
  aliases: ['bt', 'dotpha', 'advance'],
  description: 'Xem tiến độ đột phá, linh khí và vật phẩm cần thiết',

  async execute(interaction, args) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Kiểm tra xem user đã bắt đầu game chưa
    if (!playerManager.hasStartedGame(userId)) {
      const notStartedEmbed = playerManager.createNotStartedEmbed();
      await interaction.reply({ embeds: [notStartedEmbed] });
      return;
    }

    const player = playerManager.getPlayer(userId);
    const breakthroughInfo = playerManager.getBreakthroughExpRequired(player);
    const currentRealmInfo = playerManager.getRealmInfo(player.realm);

    // Tạo embed chính
    const mainEmbed = new EmbedBuilder()
      .setColor('#8B0000')
      .setTitle(`🚀 Tiến Độ Đột Phá - ${username}`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields({
        name: '🏮 Cảnh Giới Hiện Tại',
        value: `**${currentRealmInfo.name} - ${currentRealmInfo.levels[player.realmLevel - 1]}**\n**Linh khí**: ${player.experience} Linh khí`,
        inline: false
      });

    // Thêm thông tin đột phá
    if (breakthroughInfo.canBreakthrough) {
      const nextRealmInfo = playerManager.getRealmInfo(breakthroughInfo.nextRealm);
      const progressBar = this.createProgressBar(breakthroughInfo.progress);
      
      mainEmbed.addFields({
        name: '🎯 Mục Tiêu Đột Phá',
        value: `**${nextRealmInfo.name} - ${this.getRealmLevelName(breakthroughInfo.nextRealmLevel)}**`,
        inline: true
      });

      mainEmbed.addFields({
        name: '📊 Tiến Độ',
        value: `${progressBar}\n**${breakthroughInfo.progress.toFixed(1)}%**`,
        inline: true
      });

      mainEmbed.addFields({
        name: '💎 Linh khí Cần Thiết',
        value: `**${breakthroughInfo.linhKhiRequired} Linh khí**`,
        inline: true
      });

      // Kiểm tra điều kiện đột phá
      const hasEnoughLinhKhi = breakthroughInfo.linhKhiNeeded <= 0;
      const linhKhiStatus = hasEnoughLinhKhi ? '✅' : '❌';
      
      mainEmbed.addFields({
        name: '⚡ Linh khí Còn Thiếu',
        value: `${linhKhiStatus} **${breakthroughInfo.linhKhiNeeded} Linh khí**`,
        inline: false
      });

      // Thêm thông tin items cần thiết
      if (breakthroughInfo.requiredItems) {
        const itemStatus = playerManager.checkBreakthroughItems(player, breakthroughInfo.requiredItems);
        
        if (itemStatus) {
          const itemsList = Object.entries(itemStatus.items)
            .map(([itemName, status]) => `${status.status} **${itemName}**: ${status.current}/${status.required}`)
            .join('\n');
          
          mainEmbed.addFields({
            name: '🎒 Vật Phẩm Cần Thiết',
            value: itemsList,
            inline: false
          });

          // Thêm gợi ý cách kiếm vật phẩm
          const suggestions = this.getItemAcquisitionSuggestions(breakthroughInfo.requiredItems);
          mainEmbed.addFields({
            name: '💡 Gợi Ý Kiếm Vật Phẩm',
            value: suggestions,
            inline: false
          });
        }
      }

      // Thêm gợi ý hoạt động
      const suggestions = this.getActivitySuggestions(breakthroughInfo.linhKhiNeeded);
      mainEmbed.addFields({
        name: '💡 Gợi Ý Hoạt Động',
        value: suggestions,
        inline: false
      });
    } else {
      mainEmbed.addFields({
        name: '🏆 Trạng Thái',
        value: `**${breakthroughInfo.reason}**\nBạn đã đạt đến cảnh giới tối đa!`,
        inline: false
      });
    }

    // Thêm footer
    mainEmbed.setFooter({ text: 'Sử dụng fstatus để xem thông tin tổng quan' });
    mainEmbed.setTimestamp();

    // Tạo button đột phá
    const hasEnoughLinhKhi = breakthroughInfo.linhKhiNeeded <= 0;
    const hasEnoughItems = breakthroughInfo.requiredItems ? 
      playerManager.checkBreakthroughItems(player, breakthroughInfo.requiredItems)?.allReady : true;
    const canBreakthrough = breakthroughInfo.canBreakthrough && hasEnoughLinhKhi && hasEnoughItems;
    
    const breakthroughButton = new ButtonBuilder()
      .setCustomId('breakthrough_attempt')
      .setLabel('🚀 Đột Phá')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!canBreakthrough);

    const row = new ActionRowBuilder().addComponents(breakthroughButton);

    // Gửi message với button
    await interaction.reply({ 
      embeds: [mainEmbed], 
      components: [row]
    });

    // Tạo collector để lắng nghe button click
    try {
      const filter = i => i.customId === 'breakthrough_attempt' && i.user.id === userId;
      const collector = interaction.channel.createMessageComponentCollector({ 
        filter, 
        time: 300000 // 5 phút
      });

      collector.on('collect', async (buttonInteraction) => {
        try {
          await this.handleBreakthroughAttempt(buttonInteraction, player, breakthroughInfo);
        } catch (error) {
          console.error('Error in button handler:', error);
          await buttonInteraction.followUp({
            content: '❌ Có lỗi xảy ra khi xử lý đột phá!',
            ephemeral: true
          });
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          console.log('Button interaction timed out');
          // Có thể thêm logic để disable button sau khi timeout
        } else if (reason === 'user') {
          console.log('Button interaction ended by user');
        }
      });

      collector.on('error', (error) => {
        console.error('Collector error:', error);
      });
    } catch (error) {
      console.error('Failed to create button collector:', error);
    }
  },

  // Tạo progress bar
  createProgressBar(percentage) {
    const filledBlocks = Math.floor(percentage / 10);
    const emptyBlocks = 10 - filledBlocks;
    
    const filled = '█'.repeat(filledBlocks);
    const empty = '░'.repeat(emptyBlocks);
    
    return `${filled}${empty}`;
  },

  // Lấy tên cấp độ cảnh giới
  getRealmLevelName(realmLevel) {
    if (realmLevel === 1) return 'Sơ Kỳ';
    if (realmLevel === 2) return 'Trung Kỳ';
    if (realmLevel === 3) return 'Hậu Kỳ';
    return `Tầng ${realmLevel}`;
  },

  // Gợi ý hoạt động để tích lũy Linh khí
  getActivitySuggestions(linhKhiNeeded) {
    if (linhKhiNeeded <= 100) {
      return '• `fhunt` (30s) - Săn yêu thú\n• `fpick` (5m) - Thu thập thảo dược';
    } else if (linhKhiNeeded <= 1000) {
      return '• `fmeditate` (1h) - Thiền định tu luyện\n• `fexplore` (10m) - Khám phá thế giới';
    } else if (linhKhiNeeded <= 10000) {
      return '• `fchallenge` (1h) - Thách đấu tu sĩ\n• `fdungeon` (6h) - Thí luyện';
    } else {
      return '• `fdomain` (8h) - Khám phá bí cảnh\n• `fdaily` (1d) - Nhiệm vụ hàng ngày\n• `fweekly` (1w) - Nhiệm vụ hàng tuần';
    }
  },

  // Gợi ý cách kiếm vật phẩm
  getItemAcquisitionSuggestions(requiredItems) {
    const suggestions = [];
    
    if (requiredItems['Linh Thạch Hạ Phẩm'] || requiredItems['Linh Thạch Trung Phẩm'] || requiredItems['Linh Thạch Thượng Phẩm'] || requiredItems['Linh Thạch Cực Phẩm']) {
      suggestions.push('• **Linh thạch**: Sử dụng `fhunt`, `fmine`, `fdaily`, `fweekly` để kiếm');
    }
    
    if (requiredItems['Thảo Dược Cơ Bản'] || requiredItems['Thảo Dược Trung Cấp'] || requiredItems['Thảo Dược Thượng Cấp'] || requiredItems['Thảo Dược Cực Cấp']) {
      suggestions.push('• **Thảo dược**: Sử dụng `fpick`, `fexplore` để thu thập');
    }
    
    if (requiredItems['Đan Dược Đột Phá']) {
      suggestions.push('• **Đan dược**: Cần luyện chế hoặc mua từ NPC (sẽ có trong tương lai)');
    }
    
    if (requiredItems['Pháp Bảo Hộ Thân']) {
      suggestions.push('• **Pháp bảo**: Cần khám phá bí cảnh `fdomain` hoặc đánh boss');
    }
    
    if (requiredItems['Linh Khí Tinh Hoa']) {
      suggestions.push('• **Linh khí tinh hoa**: Cần tu luyện đặc biệt hoặc khám phá bí cảnh hiếm');
    }
    
    if (requiredItems['Thiên Đạo Chứng Minh']) {
      suggestions.push('• **Thiên đạo chứng minh**: Vật phẩm thần thoại, cần hoàn thành nhiệm vụ đặc biệt');
    }
    
    return suggestions.join('\n');
  },

  // Xử lý khi người chơi click button đột phá
  async handleBreakthroughAttempt(interaction, player, breakthroughInfo) {
    // Kiểm tra lại điều kiện
    const hasEnoughLinhKhi = breakthroughInfo.linhKhiNeeded <= 0;
    const hasEnoughItems = breakthroughInfo.requiredItems ? 
      playerManager.checkBreakthroughItems(player, breakthroughInfo.requiredItems)?.allReady : true;
    
    if (!breakthroughInfo.canBreakthrough || !hasEnoughLinhKhi || !hasEnoughItems) {
      await interaction.reply({
        content: '❌ Bạn chưa đủ điều kiện để đột phá!',
        ephemeral: true
      });
      return;
    }

    // Thực hiện đột phá
    const success = Math.random() < 0.8; // 80% tỷ lệ thành công
    
    try {
      if (success) {
        // Tiêu thụ vật phẩm cần thiết
        if (breakthroughInfo.requiredItems) {
          for (const [itemName, requiredQuantity] of Object.entries(breakthroughInfo.requiredItems)) {
            const removed = playerManager.removeItemFromInventory(player, itemName, requiredQuantity);
            if (!removed) {
              console.error(`Failed to remove item: ${itemName} from player inventory`);
            }
          }
        }

        // Cập nhật thông tin player
        player.realm = breakthroughInfo.nextRealm;
        player.realmLevel = breakthroughInfo.nextRealmLevel;
        player.experience = Math.max(0, player.experience - breakthroughInfo.linhKhiRequired);
        
        // Tính toán lại stats
        playerManager.calculatePlayerStats(player);
        playerManager.savePlayers();

        const successEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🎉 Đột Phá Thành Công!')
          .setDescription(`Chúc mừng! Bạn đã đột phá thành công lên **${breakthroughInfo.nextRealm} - Tầng ${breakthroughInfo.nextRealmLevel}**`)
          .addFields({
            name: '🏮 Cảnh Giới Mới',
            value: `${player.realm} - Tầng ${player.realmLevel}`,
            inline: false
          })
          .addFields({
            name: '💎 Linh Khí Còn Lại',
            value: `${player.experience} Linh Khí`,
            inline: false
          })
          .setTimestamp();

        await interaction.update({
          embeds: [successEmbed],
          components: []
        });
      } else {
        // Đột phá thất bại
        const failureEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('💥 Đột Phá Thất Bại!')
          .setDescription('Đột phá thất bại! Bạn cần tu luyện thêm để tăng tỷ lệ thành công.')
          .addFields({
            name: '💡 Gợi Ý',
            value: 'Hãy tích lũy thêm Linh Khí và thử lại sau!',
            inline: false
          })
          .setTimestamp();

        await interaction.update({
          embeds: [failureEmbed],
          components: []
        });
      }
    } catch (error) {
      console.error('Error during breakthrough attempt:', error);
      try {
        await interaction.followUp({
          content: '❌ Có lỗi xảy ra trong quá trình đột phá!',
          ephemeral: true
        });
      } catch (followUpError) {
        console.error('Failed to send followUp:', followUpError);
        // Nếu không thể followUp, thử update với thông báo lỗi
        try {
          const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('💥 Lỗi Đột Phá')
            .setDescription('Có lỗi xảy ra trong quá trình đột phá!')
            .setTimestamp();
          
          await interaction.update({
            embeds: [errorEmbed],
            components: []
          });
        } catch (updateError) {
          console.error('Failed to update message:', updateError);
        }
      }
    }
  }
};
