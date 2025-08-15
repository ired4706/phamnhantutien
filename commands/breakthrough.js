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

    // Tạo embed chính với layout đẹp mắt
    const mainEmbed = new EmbedBuilder()
      .setColor(this.getRealmColor(player.realm))
      .setTitle(`🚀 **Tiến Độ Đột Phá - ${username}**`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription(`${this.createSeparator()}\n**Thông tin chi tiết về đột phá**`);

    // Thông tin cảnh giới hiện tại
    mainEmbed.addFields({
      name: '🏮 **Cảnh Giới Hiện Tại**',
      value: `${currentRealmInfo.emoji} **${currentRealmInfo.name}**\n**Tầng**: ${currentRealmInfo.levels[player.realmLevel - 1]}`,
      inline: false
    });

    // Thêm thông tin đột phá
    if (breakthroughInfo.canBreakthrough) {
      const nextRealmInfo = playerManager.getRealmInfo(breakthroughInfo.nextRealm);
      const progressBar = this.createProgressBar(breakthroughInfo.progress, player.realm);
      const progressEmoji = breakthroughInfo.progress >= 100 ? '🚀' : '📈';
      const progressColor = breakthroughInfo.progress >= 100 ? '#00FF00' : '#FFA500';

      // Thông tin mục tiêu đột phá
      const successRate = this.getBreakthroughSuccessRate(player.realm, player.realmLevel);
      const successRatePercent = (successRate * 100).toFixed(1);
      const successRateEmoji = successRate >= 0.8 ? '🟢' : successRate >= 0.6 ? '🟡' : successRate >= 0.4 ? '🟠' : '🔴';

      mainEmbed.addFields({
        name: `${progressEmoji} **Mục Tiêu Đột Phá**`,
        value: `${this.createSeparator()}\n**🎯 Cảnh giới mới**: ${nextRealmInfo.emoji} **${nextRealmInfo.name}**\n**📊 Cấp độ**: ${this.getRealmLevelName(breakthroughInfo.nextRealmLevel)}\n**✨ Linh khí cần**: **${breakthroughInfo.linhKhiRequired.toLocaleString()}** Linh khí`,
        inline: false
      });

      // Progress bar với màu sắc
      const progressValue = `${progressBar}\n**${breakthroughInfo.progress.toFixed(1)}%** (${breakthroughInfo.currentLinhKhi.toLocaleString()}/${breakthroughInfo.linhKhiRequired.toLocaleString()} Linh khí)`;

      mainEmbed.addFields({
        name: '📊 **Tiến Độ Tu Luyện**',
        value: progressValue,
        inline: false
      });

      // Kiểm tra điều kiện đột phá
      const hasEnoughLinhKhi = breakthroughInfo.linhKhiNeeded <= 0;
      const linhKhiStatus = hasEnoughLinhKhi ? '✅' : '❌';
      const linhKhiColor = hasEnoughLinhKhi ? '#00FF00' : '#FF0000';

      mainEmbed.addFields({
        name: '⚡ **Trạng Thái Linh Khí**',
        value: `${linhKhiStatus} **${breakthroughInfo.linhKhiNeeded.toLocaleString()}** Linh khí còn thiếu\n**${hasEnoughLinhKhi ? 'Sẵn sàng đột phá!' : 'Cần tu luyện thêm!'}**`,
        inline: false
      });

      // Thêm thông tin items cần thiết
      if (breakthroughInfo.requiredItems) {
        const itemStatus = await playerManager.checkBreakthroughItems(player, breakthroughInfo.requiredItems);

        if (itemStatus) {
          const itemsList = await Promise.all(
            Object.entries(itemStatus.items).map(async ([itemId, status]) => {
              const statusEmoji = status.status === '✅' ? '✅' : '❌';
              const itemColor = status.status === '✅' ? '#00FF00' : '#FF0000';
              const itemName = await this.formatItemName(itemId);
              return `${statusEmoji} **${itemName}**: ${status.current}/${status.required}`;
            })
          );
          const itemsListText = itemsList.join('\n');

          const allReady = itemStatus.allReady;
          const itemsStatusEmoji = allReady ? '🎒' : '⚠️';
          const itemsStatusColor = allReady ? '#00FF00' : '#FFA500';

          mainEmbed.addFields({
            name: `${itemsStatusEmoji} **Vật Phẩm Cần Thiết**`,
            value: `${this.createSeparator()}\n${itemsListText}\n`,
            inline: false
          });

          // Thêm dòng tỷ lệ đột phá hiện tại
          mainEmbed.addFields({
            name: '🎲 **Tỷ Lệ Đột Phá**',
            value: `**${successRatePercent}%** thành công`,
            inline: false
          });
        }
      }



      // Thêm gợi ý cách kiếm vật phẩm
      if (breakthroughInfo.requiredItems) {
        const itemSuggestions = this.getItemAcquisitionSuggestions(breakthroughInfo.requiredItems);
        mainEmbed.addFields({
          name: '🔍 **Cách Kiếm Vật Phẩm**',
          value: `${this.createSeparator()}\n${itemSuggestions}`,
          inline: false
        });
      }
    } else {
      mainEmbed.addFields({
        name: '🏆 **Trạng Thái Đột Phá**',
        value: `${this.createSeparator()}\n**${breakthroughInfo.reason}**\n🎉 Bạn đã đạt đến cảnh giới tối đa!\n\n**Linh khí hiện tại**: ${breakthroughInfo.currentLinhKhi.toLocaleString()} Linh khí`,
        inline: false
      });
    }

    // Thêm footer
    mainEmbed.setFooter({
      text: 'Sử dụng fstatus để xem thông tin tổng quan • Sử dụng fhelp để xem tất cả lệnh'
    });
    mainEmbed.setTimestamp();

    // Tạo button đột phá với style đẹp mắt
    const hasEnoughLinhKhi = breakthroughInfo.linhKhiNeeded <= 0;
    const itemStatus = breakthroughInfo.requiredItems ?
      await playerManager.checkBreakthroughItems(player, breakthroughInfo.requiredItems) : null;
    const hasEnoughItems = itemStatus ? itemStatus.allReady : true;
    const canBreakthrough = breakthroughInfo.canBreakthrough && hasEnoughLinhKhi && hasEnoughItems;

    const breakthroughButton = new ButtonBuilder()
      .setCustomId('breakthrough_attempt')
      .setLabel(canBreakthrough ? 'Đột Phá Ngay!' : 'Chưa Đủ Điều Kiện')
      .setStyle(canBreakthrough ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji(canBreakthrough ? '🚀' : '⏳')
      .setDisabled(!canBreakthrough);

    // Thêm button thông tin
    const infoButton = new ButtonBuilder()
      .setCustomId('breakthrough_info')
      .setLabel('Thông Tin Chi Tiết')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('ℹ️');

    const row = new ActionRowBuilder().addComponents(breakthroughButton, infoButton);

    // Gửi message với button
    await interaction.reply({
      embeds: [mainEmbed],
      components: [row]
    });

    // Tạo collector để lắng nghe button click
    try {
      const filter = i => (i.customId === 'breakthrough_attempt' || i.customId === 'breakthrough_info') && i.user.id === userId;
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 600000 // 10 phút
      });

      collector.on('collect', async (buttonInteraction) => {
        try {
          if (buttonInteraction.customId === 'breakthrough_attempt') {
            await this.handleBreakthroughAttempt(buttonInteraction, player, breakthroughInfo);
          } else if (buttonInteraction.customId === 'breakthrough_info') {
            await this.showBreakthroughInfo(buttonInteraction, player, breakthroughInfo);
          }
        } catch (error) {
          console.error('Error in button handler:', error);
          await buttonInteraction.followUp({
            content: '❌ Có lỗi xảy ra khi xử lý yêu cầu!',
            ephemeral: true
          });
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          console.log('Button interaction timed out');
        }
      });

      collector.on('error', (error) => {
        console.error('Collector error:', error);
      });
    } catch (error) {
      console.error('Failed to create button collector:', error);
    }
  },

  // Tạo progress bar đẹp mắt với emoji và màu sắc
  createProgressBar(percentage, realm = 'luyen_khi') {
    const filledBlocks = Math.floor(percentage / 10);
    const emptyBlocks = 10 - filledBlocks;

    // Emoji và màu sắc theo cảnh giới
    const realmEmojis = {
      'luyen_khi': { filled: '🟢', empty: '⚪' },
      'truc_co': { filled: '🟡', empty: '⚪' },
      'ket_dan': { filled: '🟠', empty: '⚪' },
      'nguyen_anh': { filled: '🔴', empty: '⚪' }
    };

    const emojis = realmEmojis[realm] || realmEmojis['luyen_khi'];
    const filled = emojis.filled.repeat(filledBlocks);
    const empty = emojis.empty.repeat(emptyBlocks);

    return `${filled}${empty}`;
  },

  // Tạo separator đẹp mắt
  createSeparator() {
    return '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  },

  // Lấy màu sắc theo cảnh giới
  getRealmColor(realm) {
    const colors = {
      'luyen_khi': '#00FF00', // Xanh lá
      'truc_co': '#FFFF00',   // Vàng
      'ket_dan': '#FF8C00',   // Cam
      'nguyen_anh': '#FF0000' // Đỏ
    };
    return colors[realm] || '#8B0000';
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
      return '• 🦁 **`fhunt`** (30s) - Săn yêu thú lấy linh khí\n• 🌿 **`fpick`** (5m) - Thu thập thảo dược\n• 💎 **`fmine`** (1h) - Khai thác khoáng sản';
    } else if (linhKhiNeeded <= 1000) {
      return '• 🧘 **`fmeditate`** (1h) - Thiền định tu luyện\n• 🗺️ **`fexplore`** (10m) - Khám phá thế giới\n• ⚔️ **`fchallenge`** (1h) - Thách đấu tu sĩ';
    } else if (linhKhiNeeded <= 10000) {
      return '• 🏰 **`fdungeon`** (6h) - Thí luyện trong bí cảnh\n• 🎯 **`fdaily`** (1d) - Nhiệm vụ hàng ngày\n• 🌟 **`fweekly`** (1w) - Nhiệm vụ hàng tuần';
    } else {
      return '• 🏔️ **`fdomain`** (8h) - Khám phá bí cảnh cấp cao\n• 🎖️ **`fdaily`** (1d) - Nhiệm vụ hàng ngày\n• 🏆 **`fweekly`** (1w) - Nhiệm vụ hàng tuần';
    }
  },

  // Gợi ý cách kiếm vật phẩm
  getItemAcquisitionSuggestions(requiredItems) {
    const suggestions = [];

    // Kiểm tra các loại vật phẩm theo category
    const hasHerbs = Object.keys(requiredItems).some(itemId =>
      itemId.startsWith('herb_') || itemId.includes('thao_duoc')
    );

    const hasElixirs = Object.keys(requiredItems).some(itemId =>
      itemId.startsWith('elixir_') || itemId.includes('dan_duoc')
    );

    const hasArtifacts = Object.keys(requiredItems).some(itemId =>
      itemId.startsWith('artifact_') || itemId.includes('phap_bao')
    );

    const hasEssences = Object.keys(requiredItems).some(itemId =>
      itemId.startsWith('essence_') || itemId.includes('linh_khi_tinh_hoa')
    );

    if (hasHerbs) {
      suggestions.push('• **🌿 Thảo dược**: Sử dụng `fpick`, `fexplore` để thu thập');
    }

    if (hasElixirs) {
      suggestions.push('• **🔮 Đan dược**: Cần luyện chế hoặc mua từ NPC (sẽ có trong tương lai)');
    }

    if (hasArtifacts) {
      suggestions.push('• **⚔️ Pháp bảo**: Cần khám phá bí cảnh `fdomain` hoặc đánh boss');
    }

    if (hasEssences) {
      suggestions.push('• **✨ Linh khí tinh hoa**: Cần tu luyện đặc biệt hoặc khám phá bí cảnh hiếm');
    }

    // Kiểm tra các vật phẩm đặc biệt
    if (Object.keys(requiredItems).some(itemId => itemId.includes('thien_dao'))) {
      suggestions.push('• **🌟 Thiên đạo chứng minh**: Vật phẩm thần thoại, cần hoàn thành nhiệm vụ đặc biệt');
    }

    return suggestions.join('\n');
  },

  // Hiển thị thông tin chi tiết về đột phá
  async showBreakthroughInfo(interaction, player, breakthroughInfo) {
    const infoEmbed = new EmbedBuilder()
      .setColor('#4169E1')
      .setTitle('ℹ️ **Thông Tin Chi Tiết Về Đột Phá**')
      .setDescription(`${this.createSeparator()}\n**Hướng dẫn và lưu ý quan trọng**`)
      .addFields(
        {
          name: '🎯 **Điều Kiện Đột Phá**',
          value: '• **Linh khí**: Phải đủ số lượng yêu cầu\n• **Vật phẩm**: Cần có đầy đủ vật phẩm cần thiết\n• **Tuổi tu luyện**: Một số cảnh giới yêu cầu thời gian tu luyện tối thiểu',
          inline: false
        },
        {
          name: '⚠️ **Lưu Ý Quan Trọng**',
          value: '• **Tỷ lệ thành công**: Không phải 100%, có thể thất bại\n• **Tiêu thụ vật phẩm**: Vật phẩm sẽ bị tiêu thụ khi đột phá\n• **Cooldown**: Có thời gian chờ giữa các lần đột phá',
          inline: false
        },
        {
          name: '💡 **Mẹo Đột Phá**',
          value: '• Tích lũy đủ linh khí trước khi đột phá\n• Chuẩn bị đầy đủ vật phẩm cần thiết\n• Chọn thời điểm thuận lợi để đột phá',
          inline: false
        }
      )
      .setFooter({ text: 'Sử dụng fhelp để xem tất cả lệnh có sẵn' })
      .setTimestamp();

    await interaction.reply({ embeds: [infoEmbed], ephemeral: true });
  },

  // Xử lý khi người chơi click button đột phá
  async handleBreakthroughAttempt(interaction, player, breakthroughInfo) {
    // Kiểm tra lại điều kiện
    const hasEnoughLinhKhi = breakthroughInfo.linhKhiNeeded <= 0;
    const itemStatus = breakthroughInfo.requiredItems ?
      await playerManager.checkBreakthroughItems(player, breakthroughInfo.requiredItems) : null;
    const hasEnoughItems = itemStatus ? itemStatus.allReady : true;

    if (!breakthroughInfo.canBreakthrough || !hasEnoughLinhKhi || !hasEnoughItems) {
      await interaction.reply({
        content: '❌ Bạn chưa đủ điều kiện để đột phá!',
        ephemeral: true
      });
      return;
    }

    // Thực hiện đột phá với tỷ lệ thành công theo cảnh giới và tầng
    const successRate = this.getBreakthroughSuccessRate(player.realm, player.realmLevel);
    const success = Math.random() < successRate;

    // Log tỷ lệ thành công để debug
    console.log(`Breakthrough attempt: ${player.realm} Tầng ${player.realmLevel} → Success rate: ${(successRate * 100).toFixed(1)}%`);

    try {
      if (success) {
        // Tiêu thụ vật phẩm cần thiết
        if (breakthroughInfo.requiredItems) {
          for (const [itemId, requiredQuantity] of Object.entries(breakthroughInfo.requiredItems)) {
            const removed = playerManager.removeItemFromInventory(player, itemId, requiredQuantity);
            if (!removed) {
              console.error(`Failed to remove item: ${itemId} from player inventory`);
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
          .setTitle('🎉 **Đột Phá Thành Công!**')
          .setDescription(`${this.createSeparator()}\n**Chúc mừng! Bạn đã đột phá thành công!**`)
          .addFields(
            {
              name: '🏮 **Cảnh Giới Mới**',
              value: `${playerManager.getRealmInfo(player.realm).emoji} **${playerManager.getRealmInfo(player.realm).name}** - ${this.getRealmLevelName(player.realmLevel)}`,
              inline: true
            },
            {
              name: '✨ **Linh Khí Còn Lại**',
              value: `${player.experience.toLocaleString()} Linh Khí`,
              inline: true
            },
            {
              name: '🚀 **Tiếp Theo**',
              value: 'Sử dụng `fstatus` để xem thông tin mới',
              inline: false
            }
          )
          .setTimestamp();

        await interaction.update({
          embeds: [successEmbed],
          components: []
        });
      } else {
        // Đột phá thất bại
        const failureEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('💥 **Đột Phá Thất Bại!**')
          .setDescription(`${this.createSeparator()}\n**Đột phá thất bại! Bạn cần tu luyện thêm để tăng tỷ lệ thành công.**`)
          .addFields(
            {
              name: '💡 **Gợi Ý**',
              value: '• Tích lũy thêm Linh Khí\n• Tu luyện thêm thời gian\n• Thử lại sau khi đủ điều kiện',
              inline: false
            },
            {
              name: '🔄 **Thử Lại**',
              value: 'Sử dụng `fbreakthrough` để kiểm tra lại điều kiện',
              inline: false
            }
          )
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
            .setTitle('💥 **Lỗi Đột Phá**')
            .setDescription(`${this.createSeparator()}\n**Có lỗi xảy ra trong quá trình đột phá!**`)
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
  },

  // Lấy tỷ lệ thành công đột phá theo cảnh giới và tầng
  getBreakthroughSuccessRate(currentRealm, currentRealmLevel) {
    const successRates = {
      'luyen_khi': {
        1: 0.85,   // Tầng 1 → 2: 85%
        2: 0.83,   // Tầng 2 → 3: 83%
        3: 0.81,   // Tầng 3 → 4: 81%
        4: 0.79,   // Tầng 4 → 5: 79%
        5: 0.77,   // Tầng 5 → 6: 77%
        6: 0.75,   // Tầng 6 → 7: 75%
        7: 0.73,   // Tầng 7 → 8: 73%
        8: 0.71,   // Tầng 8 → 9: 71%
        9: 0.69,   // Tầng 9 → 10: 69%
        10: 0.67,  // Tầng 10 → 11: 67%
        11: 0.65,  // Tầng 11 → 12: 65%
        12: 0.63,  // Tầng 12 → 13: 63%
        13: 0.58   // Tầng 13 → Trúc Cơ sơ kỳ: 58%
      },
      'truc_co': {
        1: 0.75,   // Sơ kỳ → Trung kỳ: 75%
        2: 0.70,   // Trung kỳ → Hậu kỳ: 70%
        3: 0.55    // Hậu kỳ → Kim Đan sơ kỳ: 55%
      },
      'ket_dan': {
        1: 0.65,   // Sơ kỳ → Trung kỳ: 65%
        2: 0.60,   // Trung kỳ → Hậu kỳ: 60%
        3: 0.40    // Hậu kỳ → Nguyên Anh sơ kỳ: 40%
      },
      'nguyen_anh': {
        1: 0.50,   // Sơ kỳ → Trung kỳ: 50%
        2: 0.45    // Trung kỳ → Hậu kỳ: 45%
      }
    };

    return successRates[currentRealm]?.[currentRealmLevel] || 0.5; // Mặc định 50% nếu không tìm thấy
  },

  // Tạo header với style đẹp
  createHeader(username, realm, realmLevel) {
    const realmInfo = playerManager.getRealmInfo(realm);
    const realmEmoji = realmInfo?.emoji || '🌿';
    const realmName = realmInfo?.name || 'Unknown';
    const levelName = realmInfo?.levels?.[realmLevel - 1] || `Tầng ${realmLevel}`;

    return `${realmEmoji} **${username}** - ${realmName} ${levelName}`;
  },

  // Format item names từ ID để hiển thị
  async formatItemName(itemId) {
    const itemInfo = await playerManager.getItemInfo(itemId);
    const rarityInfo = await playerManager.getItemRarity(itemId);

    if (itemInfo) {
      const itemName = itemInfo.name;
      if (rarityInfo) {
        const rarityEmoji = rarityInfo.emoji;
        return `${itemName} ${rarityInfo.emoji}`;
      }
      return itemName;
    }
    return itemId;
  }
};
