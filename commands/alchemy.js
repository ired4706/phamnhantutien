const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');
const itemLoader = require('../utils/item-loader.js');

module.exports = {
  name: 'falchemy',
  aliases: ['alchemy', 'luyen_dan', 'dan'],
  description: 'Luyện đan dược sử dụng dược thảo và khoáng thạch',
  cooldown: 0,

  // Tạo separator đẹp mắt
  createSeparator() {
    return '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  },

  // Lấy màu theo rarity
  getRarityColor(rarity) {
    const colors = {
      'common': '#9B9B9B',      // Xám
      'uncommon': '#4CAF50',    // Xanh lá
      'rare': '#2196F3',        // Xanh dương
      'epic': '#9C27B0',        // Tím
      'legendary': '#FF9800',   // Cam
      'mythic': '#F44336'       // Đỏ
    };
    return colors[rarity] || '#9B9B9B';
  },

  // Lấy emoji rarity
  getRarityEmoji(rarity) {
    const emojis = {
      'common': '⚪',
      'uncommon': '🟢',
      'rare': '🔵',
      'epic': '🟣',
      'legendary': '🟠',
      'mythic': '🔴'
    };
    return emojis[rarity] || '⚪';
  },

  // Lấy emoji theo type
  getTypeEmoji(type) {
    const typeEmojis = {
      'heal': '💚',
      'buff': '⚔️',
      'breakthrough': '🌟',
      'special': '✨'
    };
    return typeEmojis[type] || '❓';
  },

  // Lấy tên hiển thị cho type
  getTypeDisplayName(type) {
    const typeNames = {
      'heal': 'Đan Hồi Phục',
      'buff': 'Đan Hỗ Trợ',
      'breakthrough': 'Đan Cảnh Giới',
      'special': 'Đan Đặc Biệt'
    };
    return typeNames[type] || type;
  },

  async execute(interaction, args) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Kiểm tra xem user đã bắt đầu game chưa
    if (!playerManager.hasStartedGame(userId)) {
      const notStartedEmbed = playerManager.createNotStartedEmbed();
      await interaction.reply({ embeds: [notStartedEmbed] });
      return;
    }

    // Nếu không có args, hiển thị thông tin lò đan và các button
    if (!args || args.length === 0) {
      await this.showFurnaceInfo(interaction, userId);
      return;
    }

    // Nếu có args, thực hiện luyện đan
    const elixirId = args[0];
    await this.craftElixir(interaction, userId, username, elixirId);
  },

  // Hiển thị thông tin lò đan và các button
  async showFurnaceInfo(interaction, userId) {
    const player = playerManager.getPlayer(userId);
    const furnaceLevel = player.alchemy?.furnaceLevel || 1;
    const totalCrafted = player.alchemy?.totalCrafted || 0;
    const successCount = player.alchemy?.successCount || 0;
    const failureCount = player.alchemy?.failureCount || 0;
    const successRate = totalCrafted > 0 ? Math.round((successCount / totalCrafted) * 100) : 0;

    const embed = new EmbedBuilder()
      .setColor('#9C27B0')
      .setTitle('🏭 **Thông Tin Lò Đan**')
      .setDescription(`${this.createSeparator()}\n**Thông tin chi tiết về lò đan của bạn**`)
      .addFields(
        {
          name: '🔥 **Level Lò Đan**',
          value: `**${furnaceLevel}** (Tỉ lệ thành công: **${60 + (furnaceLevel - 1) * 5}%**)`,
          inline: true
        },
        {
          name: '📊 **Thống Kê Luyện Đan**',
          value: `**Tổng số**: ${totalCrafted}\n**Thành công**: ${successCount}\n**Thất bại**: ${failureCount}`,
          inline: true
        },
        {
          name: '📈 **Tỉ Lệ Thành Công**',
          value: `**${successRate}%** (${successCount}/${totalCrafted})`,
          inline: true
        }
      )
      .addFields({
        name: '🧪 **Chọn Loại Đan Dược**',
        value: 'Nhấn vào các button bên dưới để xem danh sách đan dược theo loại',
        inline: false
      })
      .setFooter({ text: 'Sử dụng falchemy <id_dan> để luyện đan cụ thể' })
      .setTimestamp();

    // Tạo các button theo type
    const buttons = [
      new ButtonBuilder()
        .setCustomId('falchemy_type_heal')
        .setLabel('💚 Đan Hồi Phục')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('falchemy_type_buff')
        .setLabel('⚔️ Đan Hỗ Trợ')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('falchemy_type_breakthrough')
        .setLabel('🌟 Đan Cảnh Giới')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('falchemy_type_special')
        .setLabel('✨ Đan Đặc Biệt')
        .setStyle(ButtonStyle.Primary)
    ];

    const buttonRow = new ActionRowBuilder().addComponents(buttons);

    // Button thông tin lò đan
    const infoButton = new ButtonBuilder()
      .setCustomId('falchemy_furnace_info')
      .setLabel('🏭 Thông Tin Lò Đan')
      .setStyle(ButtonStyle.Secondary);

    const infoRow = new ActionRowBuilder().addComponents(infoButton);

    await interaction.reply({
      embeds: [embed],
      components: [buttonRow, infoRow]
    });
  },

  // Xử lý button interactions
  async handleButton(interaction) {
    const { customId } = interaction;
    const userId = interaction.user.id;

    if (customId === 'falchemy_back_main') {
      await this.showFurnaceInfo(interaction, userId);
    } else if (customId === 'falchemy_furnace_info') {
      await this.showDetailedFurnaceInfo(interaction);
    } else if (customId.startsWith('falchemy_type_')) {
      const type = customId.replace('falchemy_type_', '');
      await this.showElixirsByType(interaction, type, userId);
    }
  },

  // Xử lý select menu interactions
  async handleSelectMenu(interaction) {
    try {
      const { customId, values } = interaction;
      const userId = interaction.user.id;

      console.log(`🔍 Debug: handleSelectMenu called with customId: ${customId}, values:`, values);

      if (customId === 'falchemy_select_elixir') {
        const selectedElixirId = values[0];
        console.log(`🔍 Debug: Selected elixir ID: ${selectedElixirId}`);

        if (!selectedElixirId) {
          await interaction.reply({
            content: '❌ Không có đan dược nào được chọn!',
            ephemeral: true
          });
          return;
        }

        // Hiển thị chọn số lượng cần luyện
        await this.showQuantitySelect(interaction, userId, selectedElixirId);
        return;
      } else if (customId.startsWith('falchemy_select_qty:')) {
        const selectedElixirId = customId.split(':')[1];
        const qtyValue = values[0];
        const player = playerManager.getPlayer(userId);
        const elixir = itemLoader.items[selectedElixirId];
        if (!elixir) {
          await interaction.reply({ content: '❌ Không tìm thấy đan dược!', ephemeral: true });
          return;
        }
        const maxCraft = this.getMaxCraftable(player, elixir);
        if (maxCraft < 1) {
          await interaction.reply({ content: '⚠️ Đạo hữu không đủ nguyên liệu luyện chế', ephemeral: true });
          return;
        }
        let quantity = qtyValue === 'max' ? maxCraft : parseInt(qtyValue, 10);
        if (!quantity || quantity < 1) {
          await interaction.reply({ content: '❌ Số lượng không hợp lệ!', ephemeral: true });
          return;
        }
        if (quantity > maxCraft) quantity = maxCraft;

        if (quantity === 1) {
          await this.craftSelectedElixir(interaction, selectedElixirId, userId);
        } else {
          await this.craftSelectedElixirBatch(interaction, selectedElixirId, userId, quantity);
        }
        return;
      } else {
        console.log(`🔍 Debug: Unknown customId: ${customId}`);
        await interaction.reply({
          content: '❌ Lỗi xử lý select menu!',
          ephemeral: true
        });
      }
    } catch (error) {
      console.error('❌ Error in handleSelectMenu:', error);
      await interaction.reply({
        content: '❌ Có lỗi xảy ra khi xử lý select menu!',
        ephemeral: true
      });
    }
  },

  // Hiển thị đan dược theo type
  async showElixirsByType(interaction, type, userId) {
    // Load items nếu chưa load
    await itemLoader.loadAllItems();

    const elixirs = Object.values(itemLoader.items).filter(item =>
      item.type === type && item.crafting // Chỉ lấy items có type và crafting (đan dược)
    );

    console.log(`🔍 Debug: Found ${elixirs.length} elixirs for type ${type}`);
    console.log(`🔍 Debug: Elixirs:`, elixirs.map(e => ({ name: e.name, type: e.type, hasCrafting: !!e.crafting })));

    if (elixirs.length === 0) {
      const noElixirsEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ **Không Có Đan Dược**')
        .setDescription(`Không tìm thấy đan dược loại **${this.getTypeDisplayName(type)}**!`)
        .setFooter({ text: 'Quay lại menu chính' })
        .setTimestamp();

      const backButton = new ButtonBuilder()
        .setCustomId('falchemy_back_main')
        .setLabel('🔙 Quay Lại')
        .setStyle(ButtonStyle.Secondary);

      const backRow = new ActionRowBuilder().addComponents(backButton);

      await interaction.update({
        embeds: [noElixirsEmbed],
        components: [backRow]
      });
      return;
    }

    // Lấy thông tin player để kiểm tra số lượng nguyên liệu
    const player = playerManager.getPlayer(userId);

    // Nhóm theo rarity
    const elixirsByRarity = {};
    elixirs.forEach(elixir => {
      const rarity = elixir.rarity || 'common';
      if (!elixirsByRarity[rarity]) {
        elixirsByRarity[rarity] = [];
      }
      elixirsByRarity[rarity].push(elixir);
    });

    const typeEmoji = this.getTypeEmoji(type);
    const typeName = this.getTypeDisplayName(type);

    const embed = new EmbedBuilder()
      .setColor(this.getRarityColor(type === 'special' ? 'legendary' : 'epic'))
      .setTitle(`${typeEmoji} **Đan Dược ${typeName}**`)
      .setDescription(`${this.createSeparator()}\n**Danh sách đan dược loại ${typeName}**\n\n💡 **Sử dụng**: \`falchemy <id_dan>\` để luyện đan`);

    // Hiển thị theo rarity từ thấp đến cao
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

    rarityOrder.forEach(rarity => {
      if (elixirsByRarity[rarity] && elixirsByRarity[rarity].length > 0) {
        const elixirsList = elixirsByRarity[rarity];
        const rarityEmoji = this.getRarityEmoji(rarity);
        const rarityName = this.getRarityDisplayName(rarity);

        // Chia nhỏ danh sách để tránh vượt quá 1024 ký tự
        const maxItemsPerField = 3; // Giảm xuống 3 item mỗi field để đảm bảo không vượt quá 1024 ký tự
        const chunks = this.chunkArray(elixirsList, maxItemsPerField);

        chunks.forEach((chunk, index) => {
          const elixirsListFormatted = chunk.map(elixir => {
            // Hiển thị nguyên liệu với số lượng available (rút gọn)
            const materials = Object.entries(elixir.crafting || {}).map(([id, qty]) => {
              const materialInfo = itemLoader.getItemInfo(id);
              const playerMaterial = player.inventory.items.find(item => item.id === id);
              const availableQty = playerMaterial ? playerMaterial.quantity : 0;
              const materialName = materialInfo ? materialInfo.name : id;
              const materialEmoji = materialInfo ? materialInfo.emoji : '❓';

              return `${materialEmoji} **${materialName}** x${qty} (còn: ${availableQty})`;
            }).join(', ');

            // Hiển thị hiệu quả (rút gọn)
            const effects = Object.entries(elixir.effects || {}).map(([key, value]) => {
              const effectNames = {
                'hp': 'HP',
                'mp': 'MP',
                'attack': 'ATK',
                'defense': 'DEF',
                'speed': 'SPD',
                'critical': 'CRT',
                'stamina': 'STA',
                'recovery': 'REG',
                'spirit_power': 'SP',
                'cultivation_speed': 'CS',
                'strength': 'STR',
                'fire_power': 'FP',
                'agility': 'AGI',
                'evasion': 'EVA',
                'reaction_time': 'RT',
                'mental_clarity': 'MC',
                'focus': 'FOC',
                'meditation_bonus': 'MB',
                'spirit_purification': 'SP',
                'enlightenment': 'ENL',
                'alchemy_mastery': 'AM',
                'elixir_quality': 'EQ',
                'success_rate': 'SR',
                'spirit_control': 'SC',
                'elemental_affinity': 'EA'
              };

              return `${effectNames[key] || key}: +${value}`;
            }).join(', ');

            // Thêm icon rarity vào trước tên đan dược
            const rarityEmoji = this.getRarityEmoji(elixir.rarity || 'common');
            return `${rarityEmoji} **${elixir.name}** (ID: \`${Object.keys(itemLoader.items).find(key => itemLoader.items[key] === elixir)}\`)\n└ **Nguyên liệu**: ${materials}\n└ **Hiệu quả**: ${effects}`;
          }).join('\n\n');

          // Chỉ hiển thị "tiếp theo" nếu có nhiều hơn 1 chunk
          const fieldName = '\u200B'; // zero-width space để tránh lỗi tên field rỗng

          embed.addFields({
            name: fieldName,
            value: elixirsListFormatted,
            inline: false
          });
        });
      }
    });

    // Chỉ tạo button quay lại (lược bỏ button xem công thức)
    const backButton = new ButtonBuilder()
      .setCustomId('falchemy_back_main')
      .setLabel('🔙 Quay Lại')
      .setStyle(ButtonStyle.Secondary);

    // Tạo select menu để chọn đan dược
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('falchemy_select_elixir')
      .setPlaceholder('Chọn đan dược để luyện...');

    // Thêm từng option một cách riêng biệt
    elixirs.forEach(elixir => {
      const rarityEmoji = this.getRarityEmoji(elixir.rarity || 'common');
      // Tìm ID của đan dược một cách an toàn
      const elixirId = Object.keys(itemLoader.items).find(key => itemLoader.items[key] === elixir);

      if (elixirId) {
        selectMenu.addOptions({
          label: `${rarityEmoji} ${elixir.name}`,
          description: `ID: ${elixirId}`,
          value: elixirId
        });
      }
    });

    const backRow = new ActionRowBuilder().addComponents(backButton);
    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.update({
      embeds: [embed],
      components: [selectRow, backRow]
    });
  },

  // Hiển thị thông tin chi tiết lò đan
  async showDetailedFurnaceInfo(interaction) {
    const userId = interaction.user.id;
    const player = playerManager.getPlayer(userId);
    const furnaceLevel = player.alchemy?.furnaceLevel || 1;
    const totalCrafted = player.alchemy?.totalCrafted || 0;
    const successCount = player.alchemy?.successCount || 0;
    const failureCount = player.alchemy?.failureCount || 0;
    const successRate = totalCrafted > 0 ? Math.round((successCount / totalCrafted) * 100) : 0;

    const baseSuccessRate = 60;
    const levelBonus = (furnaceLevel - 1) * 5;
    const currentSuccessRate = Math.min(baseSuccessRate + levelBonus, 95);

    const embed = new EmbedBuilder()
      .setColor('#FF9800')
      .setTitle('🏭 **Thông Tin Chi Tiết Lò Đan**')
      .setDescription(`${this.createSeparator()}\n**Thông tin chi tiết về lò đan và hệ thống luyện đan**`)
      .addFields(
        {
          name: '🔥 **Thông Số Lò Đan**',
          value: `**Level hiện tại**: ${furnaceLevel}\n**Tỉ lệ cơ bản**: ${baseSuccessRate}%\n**Bonus level**: +${levelBonus}%\n**Tỉ lệ hiện tại**: **${currentSuccessRate}%**`,
          inline: false
        },
        {
          name: '📊 **Thống Kê Chi Tiết**',
          value: `**Tổng số lần luyện**: ${totalCrafted}\n**Thành công**: ${successCount} (${successRate}%)\n**Thất bại**: ${failureCount} (${100 - successRate}%)\n**Lần luyện gần nhất**: ${totalCrafted > 0 ? 'Đã luyện' : 'Chưa luyện'}`,
          inline: false
        },
        {
          name: '📈 **Bảng Tỉ Lệ Theo Level**',
          value: this.createFurnaceLevelTable(),
          inline: false
        },
        {
          name: '💡 **Gợi Ý Nâng Cấp**',
          value: 'Nâng cấp lò đan sẽ tăng tỉ lệ thành công luyện đan. Mỗi level tăng 5% tỉ lệ thành công, tối đa 95%.',
          inline: false
        }
      )
      .setFooter({ text: 'Sử dụng falchemy để quay lại menu chính' })
      .setTimestamp();

    const backButton = new ButtonBuilder()
      .setCustomId('falchemy_back_main')
      .setLabel('🔙 Quay Lại')
      .setStyle(ButtonStyle.Secondary);

    const backRow = new ActionRowBuilder().addComponents(backButton);

    await interaction.update({
      embeds: [embed],
      components: [backRow]
    });
  },

  // Tạo bảng tỉ lệ theo level
  createFurnaceLevelTable() {
    let table = '```\n';
    table += 'Level | Tỉ Lệ | Ghi Chú\n';
    table += '------|--------|---------\n';

    for (let level = 1; level <= 10; level++) {
      const baseRate = 60;
      const bonus = (level - 1) * 5;
      const totalRate = Math.min(baseRate + bonus, 95);
      const note = level === 1 ? 'Mặc định' : `+${bonus}%`;

      table += `${level.toString().padStart(4)} | ${totalRate.toString().padStart(6)}% | ${note}\n`;
    }

    table += '```';
    return table;
  },

  // Hiển thị công thức theo type
  async showRecipesByType(interaction, type) {
    // Load items nếu chưa load
    await itemLoader.loadAllItems();

    const elixirs = Object.values(itemLoader.items).filter(item =>
      item.type === type && item.crafting // Chỉ lấy items có type và crafting (đan dược)
    );

    if (elixirs.length === 0) {
      const noRecipesEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ **Không Có Công Thức**')
        .setDescription(`Không tìm thấy công thức đan dược loại **${this.getTypeDisplayName(type)}**!`)
        .setFooter({ text: 'Quay lại danh sách đan dược' })
        .setTimestamp();

      const backButton = new ButtonBuilder()
        .setCustomId(`falchemy_type_${type}`)
        .setLabel('🔙 Quay Lại')
        .setStyle(ButtonStyle.Secondary);

      const backRow = new ActionRowBuilder().addComponents(backButton);

      await interaction.update({
        embeds: [noRecipesEmbed],
        components: [backRow]
      });
      return;
    }

    const typeEmoji = this.getTypeEmoji(type);
    const typeName = this.getTypeDisplayName(type);

    const embed = new EmbedBuilder()
      .setColor(this.getRarityColor(type === 'special' ? 'legendary' : 'epic'))
      .setTitle(`${typeEmoji} **Công Thức ${typeName}**`)
      .setDescription(`${this.createSeparator()}\n**Công thức chi tiết các đan dược loại ${typeName}**\n\n💡 **Sử dụng**: \`falchemy <id_dan>\` để luyện đan`);

    // Nhóm theo rarity
    const elixirsByRarity = {};
    elixirs.forEach(elixir => {
      const rarity = elixir.rarity || 'common';
      if (!elixirsByRarity[rarity]) {
        elixirsByRarity[rarity] = [];
      }
      elixirsByRarity[rarity].push(elixir);
    });

    // Hiển thị theo rarity từ thấp đến cao
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

    rarityOrder.forEach(rarity => {
      if (elixirsByRarity[rarity] && elixirsByRarity[rarity].length > 0) {
        const elixirsList = elixirsByRarity[rarity];
        const rarityEmoji = this.getRarityEmoji(rarity);
        const rarityName = this.getRarityDisplayName(rarity);

        // Chia nhỏ danh sách để tránh vượt quá 1024 ký tự
        const maxItemsPerField = 4; // Giới hạn số item mỗi field cho công thức
        const chunks = this.chunkArray(elixirsList, maxItemsPerField);

        chunks.forEach((chunk, index) => {
          const recipesFormatted = chunk.map(elixir => {
            const materials = Object.entries(elixir.crafting || {}).map(([id, qty]) => {
              const materialInfo = itemLoader.getItemInfo(id);
              return `${materialInfo ? materialInfo.emoji : '❓'} **${materialInfo ? materialInfo.name : id}** x${qty}`;
            }).join('\n└ ');

            const effects = Object.entries(elixir.effects || {}).map(([key, value]) => {
              const effectNames = {
                'hp': 'Sinh Mệnh',
                'mp': 'Linh Lực',
                'attack': 'Công Kích',
                'defense': 'Phòng Thủ',
                'speed': 'Tốc Độ',
                'critical': 'Chí Mạng',
                'stamina': 'Thể Lực',
                'recovery': 'Hồi Phục',
                'spirit_power': 'Linh Khí',
                'cultivation_speed': 'Tốc Độ Tu Luyện',
                'strength': 'Sức Mạnh',
                'fire_power': 'Hỏa Lực',
                'agility': 'Nhanh Nhẹn',
                'evasion': 'Né Tránh',
                'reaction_time': 'Thời Gian Phản Ứng',
                'mental_clarity': 'Tinh Thần',
                'focus': 'Tập Trung',
                'meditation_bonus': 'Thiền Định',
                'spirit_purification': 'Thanh Lọc Linh Khí',
                'enlightenment': 'Giác Ngộ',
                'alchemy_mastery': 'Thuật Luyện Đan',
                'elixir_quality': 'Chất Lượng Đan',
                'success_rate': 'Tỉ Lệ Thành Công',
                'spirit_control': 'Kiểm Soát Linh Khí',
                'elemental_affinity': 'Tương Thích Ngũ Hành'
              };

              return `**${effectNames[key] || key}**: +${value}`;
            }).join(', ');

            return `**${elixir.name}** (ID: \`${Object.keys(itemLoader.items).find(key => itemLoader.items[key] === elixir)}\`)\n└ **Nguyên liệu**:\n└ ${materials}\n└ **Hiệu quả**: ${effects}\n└ **Giá trị**: ${elixir.value} linh thạch`;
          }).join('\n\n');

          const fieldName = index === 0
            ? `${rarityEmoji} **${rarityName}** (${elixirsList.length} loại)`
            : `${rarityEmoji} **${rarityName}** (tiếp theo)`;

          embed.addFields({
            name: fieldName,
            value: recipesFormatted,
            inline: false
          });
        });
      }
    });

    // Tạo button quay lại
    const backButton = new ButtonBuilder()
      .setCustomId(`falchemy_type_${type}`)
      .setLabel('🔙 Quay Lại')
      .setStyle(ButtonStyle.Secondary);

    const backRow = new ActionRowBuilder().addComponents(backButton);

    await interaction.update({
      embeds: [embed],
      components: [backRow]
    });
  },

  // Hiển thị danh sách đan dược có thể luyện (giữ lại để tương thích)
  async showElixirsList(interaction) {
    // Load items nếu chưa load
    await itemLoader.loadAllItems();

    const elixirs = Object.values(itemLoader.items).filter(item => item.category === 'elixirs');

    // Nhóm theo rarity
    const elixirsByRarity = {};
    elixirs.forEach(elixir => {
      const rarity = elixir.rarity || 'common';
      if (!elixirsByRarity[rarity]) {
        elixirsByRarity[rarity] = [];
      }
      elixirsByRarity[rarity].push(elixir);
    });

    const embed = new EmbedBuilder()
      .setColor('#9C27B0')
      .setTitle('🧪 **Danh Sách Đan Dược Có Thể Luyện**')
      .setDescription(`${this.createSeparator()}\n**Tất cả đan dược có thể luyện được**\n\n💡 **Sử dụng**: \`falchemy <id_dan>\` để luyện đan`);

    // Hiển thị theo rarity từ thấp đến cao
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

    rarityOrder.forEach(rarity => {
      if (elixirsByRarity[rarity] && elixirsByRarity[rarity].length > 0) {
        const elixirsList = elixirsByRarity[rarity];
        const rarityEmoji = this.getRarityEmoji(rarity);
        const rarityName = this.getRarityDisplayName(rarity);

        // Chia nhỏ danh sách để tránh vượt quá 1024 ký tự
        const maxItemsPerField = 8; // Giới hạn số item mỗi field
        const chunks = this.chunkArray(elixirsList, maxItemsPerField);

        chunks.forEach((chunk, index) => {
          const elixirsListFormatted = chunk.map(elixir => {
            const materials = Object.entries(elixir.crafting || {}).map(([id, qty]) => {
              const materialInfo = itemLoader.getItemInfo(id);
              return `${materialInfo ? materialInfo.emoji : '❓'} ${materialInfo ? materialInfo.name : id} x${qty}`;
            }).join(', ');

            return `**${elixir.name}** (ID: \`${Object.keys(itemLoader.items).find(key => itemLoader.items[key] === elixir)}\`)\n└ ${materials}`;
          }).join('\n\n');

          const fieldName = index === 0
            ? `${rarityEmoji} **${rarityName}** (${elixirsList.length} loại)`
            : `${rarityEmoji} **${rarityName}** (tiếp theo)`;

          embed.addFields({
            name: fieldName,
            value: elixirsListFormatted,
            inline: false
          });
        });
      }
    });

    embed.setFooter({ text: 'Sử dụng falchemy <id_dan> để luyện đan cụ thể' });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  // Hàm chia nhỏ array
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

  // Thực hiện luyện đan
  async craftElixir(interaction, userId, username, elixirId) {
    const player = playerManager.getPlayer(userId);
    const now = Date.now();

    // Load items nếu chưa load
    await itemLoader.loadAllItems();

    // Tìm đan dược cần luyện
    const elixirInfo = itemLoader.getItemInfo(elixirId);
    if (!elixirInfo || elixirInfo.category !== 'elixirs') {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ **Lỗi Luyện Đan**')
        .setDescription('Không tìm thấy đan dược cần luyện hoặc ID không hợp lệ!')
        .addFields({
          name: '💡 Gợi ý',
          value: 'Sử dụng `falchemy` để xem danh sách đan dược có thể luyện',
          inline: false
        });

      await interaction.reply({ embeds: [errorEmbed] });
      return;
    }

    // Kiểm tra materials cần thiết
    const craftingMaterials = elixirInfo.crafting || {};
    const missingMaterials = [];
    const availableMaterials = [];

    for (const [materialId, requiredQty] of Object.entries(craftingMaterials)) {
      const playerMaterial = player.inventory.items.find(item => item.id === materialId);
      const availableQty = playerMaterial ? playerMaterial.quantity : 0;

      if (availableQty < requiredQty) {
        missingMaterials.push({
          id: materialId,
          name: itemLoader.getItemInfo(materialId)?.name || materialId,
          emoji: itemLoader.getItemInfo(materialId)?.emoji || '❓',
          required: requiredQty,
          available: availableQty,
          missing: requiredQty - availableQty
        });
      } else {
        availableMaterials.push({
          id: materialId,
          name: itemLoader.getItemInfo(materialId)?.name || materialId,
          emoji: itemLoader.getItemInfo(materialId)?.emoji || '❓',
          required: requiredQty,
          available: availableQty
        });
      }
    }

    // Nếu thiếu materials, hiển thị thông báo
    if (missingMaterials.length > 0) {
      const missingEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ **Thiếu Nguyên Liệu Luyện Đan**')
        .setDescription(`**${username}** không đủ nguyên liệu để luyện **${elixirInfo.name}**!`)
        .addFields({
          name: '🔍 **Nguyên Liệu Cần Thiết**',
          value: availableMaterials.map(material =>
            `✅ ${material.emoji} **${material.name}**: ${material.available}/${material.required}`
          ).join('\n'),
          inline: false
        })
        .addFields({
          name: '❌ **Nguyên Liệu Thiếu**',
          value: missingMaterials.map(material =>
            `❌ ${material.emoji} **${material.name}**: ${material.available}/${material.required} (Thiếu: ${material.missing})`
          ).join('\n'),
          inline: false
        })
        .addFields({
          name: '💡 **Gợi ý**',
          value: 'Sử dụng `fpick` để thu thập thảo dược, `fmine` để khai thác khoáng thạch',
          inline: false
        });

      await interaction.reply({ embeds: [missingEmbed] });
      return;
    }

    // Tính toán tỉ lệ thành công dựa trên level lò luyện
    const furnaceLevel = player.alchemy?.furnaceLevel || 1;
    const baseSuccessRate = 60; // 60% cơ bản
    const levelBonus = (furnaceLevel - 1) * 5; // Mỗi level tăng 5%
    const maxSuccessRate = 95; // Tối đa 95%
    const successRate = Math.min(baseSuccessRate + levelBonus, maxSuccessRate);

    // Thực hiện luyện đan
    const isSuccess = Math.random() * 100 < successRate;

    if (isSuccess) {
      // Luyện đan thành công
      // Trừ materials
      for (const [materialId, requiredQty] of Object.entries(craftingMaterials)) {
        const playerMaterial = player.inventory.items.find(item => item.id === materialId);
        if (playerMaterial) {
          playerMaterial.quantity -= requiredQty;
          // Xóa item nếu hết
          if (playerMaterial.quantity <= 0) {
            player.inventory.items = player.inventory.items.filter(item => item.id !== materialId);
          }
        }
      }

      // Thêm đan dược vào inventory
      const existingElixir = player.inventory.items.find(item => item.id === elixirId);
      if (existingElixir) {
        existingElixir.quantity += 1;
      } else {
        player.inventory.items.push({
          id: elixirId,
          quantity: 1
        });
      }

      // Cập nhật thống kê luyện đan
      if (!player.alchemy) player.alchemy = {};
      player.alchemy.totalCrafted = (player.alchemy.totalCrafted || 0) + 1;
      player.alchemy.successCount = (player.alchemy.successCount || 0) + 1;
      player.alchemy.lastAlchemy = now;

      // Cập nhật player
      const updateData = {
        'alchemy.lastAlchemy': now,
        'alchemy.totalCrafted': player.alchemy.totalCrafted,
        'alchemy.successCount': player.alchemy.successCount
      };
      playerManager.updatePlayer(userId, updateData);

      // Tạo embed thông báo thành công
      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🎉 **Luyện Đan Thành Công!**')
        .setDescription(`${this.createSeparator()}\n**${username}** đã luyện thành công **${elixirInfo.name}**!`)
        .addFields(
          {
            name: '🧪 **Đan Dược Thu Được**',
            value: `${elixirInfo.emoji} **${elixirInfo.name}** ${this.getRarityEmoji(elixirInfo.rarity)}`,
            inline: false
          },
          {
            name: '🔥 **Level Lò Luyện**',
            value: `**${furnaceLevel}** (Tỉ lệ thành công: **${successRate}%**)`,
            inline: true
          },
          {
            name: '📊 **Hiệu Quả**',
            value: this.formatEffects(elixirInfo.effects),
            inline: true
          }
        )
        .addFields({
          name: '🔍 **Nguyên Liệu Đã Sử Dụng**',
          value: availableMaterials.map(material =>
            `${material.emoji} **${material.name}**: ${material.required}`
          ).join('\n'),
          inline: false
        })
        .setFooter({ text: 'Luyện đan có thể thực hiện sau 30 phút' })
        .setTimestamp();

      await interaction.reply({ embeds: [successEmbed] });

    } else {
      // Luyện đan thất bại
      // Vẫn trừ materials (thất bại cũng mất nguyên liệu)
      for (const [materialId, requiredQty] of Object.entries(craftingMaterials)) {
        const playerMaterial = player.inventory.items.find(item => item.id === materialId);
        if (playerMaterial) {
          playerMaterial.quantity -= requiredQty;
          // Xóa item nếu hết
          if (playerMaterial.quantity <= 0) {
            player.inventory.items = player.inventory.items.filter(item => item.id !== materialId);
          }
        }
      }

      // Cập nhật thống kê luyện đan
      if (!player.alchemy) player.alchemy = {};
      player.alchemy.totalCrafted = (player.alchemy.totalCrafted || 0) + 1;
      player.alchemy.failureCount = (player.alchemy.failureCount || 0) + 1;
      player.alchemy.lastAlchemy = now;

      // Cập nhật player
      const updateData = {
        'alchemy.lastAlchemy': now,
        'alchemy.totalCrafted': player.alchemy.totalCrafted,
        'alchemy.failureCount': player.alchemy.failureCount
      };
      playerManager.updatePlayer(userId, updateData);

      // Tạo embed thông báo thất bại
      const failureEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('💥 **Luyện Đan Thất Bại!**')
        .setDescription(`${this.createSeparator()}\n**${username}** đã thất bại khi luyện **${elixirInfo.name}**!`)
        .addFields(
          {
            name: '🔥 **Level Lò Luyện**',
            value: `**${furnaceLevel}** (Tỉ lệ thành công: **${successRate}%**)`,
            inline: true
          },
          {
            name: '💔 **Hậu Quả**',
            value: 'Nguyên liệu đã bị mất do luyện đan thất bại!',
            inline: true
          }
        )
        .addFields({
          name: '🔍 **Nguyên Liệu Đã Mất**',
          value: availableMaterials.map(material =>
            `${material.emoji} **${material.name}**: ${material.required}`
          ).join('\n'),
          inline: false
        })
        .addFields({
          name: '💡 **Gợi ý**',
          value: 'Nâng cấp lò luyện để tăng tỉ lệ thành công!',
          inline: false
        })
        .setFooter({ text: 'Luyện đan có thể thực hiện sau 30 phút' })
        .setTimestamp();

      await interaction.reply({ embeds: [failureEmbed] });
    }
  },

  // Chế tạo đan dược được chọn
  async craftSelectedElixir(interaction, elixirId, userId) {
    // Load items nếu chưa load
    await itemLoader.loadAllItems();

    const elixir = itemLoader.items[elixirId];
    if (!elixir) {
      await interaction.reply({ content: '❌ Không tìm thấy đan dược!', ephemeral: true });
      return;
    }

    const player = playerManager.getPlayer(userId);
    if (!player) {
      await interaction.reply({ content: '❌ Không tìm thấy thông tin người chơi!', ephemeral: true });
      return;
    }

    // Kiểm tra materials
    const missingMaterials = [];
    for (const [materialId, requiredQty] of Object.entries(elixir.crafting || {})) {
      const playerMaterial = player.inventory.items.find(item => item.id === materialId);
      const availableQty = playerMaterial ? playerMaterial.quantity : 0;

      if (availableQty < requiredQty) {
        const materialInfo = itemLoader.getItemInfo(materialId);
        const materialName = materialInfo ? materialInfo.name : materialId;
        missingMaterials.push(`${materialName} (cần: ${requiredQty}, có: ${availableQty})`);
      }
    }

    if (missingMaterials.length > 0) {
      await interaction.reply({
        content: `❌ Thiếu nguyên liệu:\n${missingMaterials.join('\n')}`,
        ephemeral: true
      });
      return;
    }

    // Tính tỉ lệ thành công dựa trên level lò luyện
    const furnaceLevel = player.alchemy?.furnaceLevel || 1;
    const baseSuccessRate = 0.6; // 60% cơ bản
    const levelBonus = (furnaceLevel - 1) * 0.05; // +5% mỗi level
    const successRate = Math.min(baseSuccessRate + levelBonus, 0.95); // Tối đa 95%

    // Thực hiện luyện đan
    const isSuccess = Math.random() < successRate;

    if (isSuccess) {
      // Thành công: thêm đan dược vào inventory
      playerManager.addItemToInventory(player, elixirId, 1);

      // Cập nhật thống kê alchemy
      if (!player.alchemy) player.alchemy = { furnaceLevel: 1, totalCrafted: 0, successCount: 0, failureCount: 0, lastAlchemy: 0 };
      player.alchemy.totalCrafted++;
      player.alchemy.successCount++;
      player.alchemy.lastAlchemy = Date.now();

      // Tiêu thụ nguyên liệu
      for (const [materialId, requiredQty] of Object.entries(elixir.crafting || {})) {
        const playerMaterial = player.inventory.items.find(item => item.id === materialId);
        if (playerMaterial) {
          playerMaterial.quantity -= requiredQty;
          if (playerMaterial.quantity <= 0) {
            player.inventory.items = player.inventory.items.filter(item => item.id !== materialId);
          }
        }
      }

      // Lưu player data
      playerManager.savePlayers();

      // Tạo embed thông báo thành công
      const successEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🧪 Luyện Đan Thành Công!')
        .setDescription(`**${elixir.name}** đã được luyện thành công!`)
        .addFields(
          { name: '🎯 Tỉ lệ thành công', value: `${(successRate * 100).toFixed(1)}%`, inline: true },
          { name: '🔥 Level lò luyện', value: `${furnaceLevel}`, inline: true },
          { name: '📊 Thống kê', value: `Tổng: ${player.alchemy.totalCrafted} | Thành công: ${player.alchemy.successCount} | Thất bại: ${player.alchemy.failureCount}`, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [successEmbed] });
    } else {
      // Thất bại: mất nguyên liệu
      for (const [materialId, requiredQty] of Object.entries(elixir.crafting || {})) {
        const playerMaterial = player.inventory.items.find(item => item.id === materialId);
        if (playerMaterial) {
          playerMaterial.quantity -= requiredQty;
          if (playerMaterial.quantity <= 0) {
            player.inventory.items = player.inventory.items.filter(item => item.id !== materialId);
          }
        }
      }

      // Cập nhật thống kê alchemy
      if (!player.alchemy) player.alchemy = { furnaceLevel: 1, totalCrafted: 0, successCount: 0, failureCount: 0, lastAlchemy: 0 };
      player.alchemy.totalCrafted++;
      player.alchemy.failureCount++;
      player.alchemy.lastAlchemy = Date.now();

      // Lưu player data
      playerManager.savePlayers();

      // Tạo embed thông báo thất bại
      const failureEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('💥 Luyện Đan Thất Bại!')
        .setDescription(`**${elixir.name}** luyện thất bại! Nguyên liệu đã bị mất.`)
        .addFields(
          { name: '🎯 Tỉ lệ thành công', value: `${(successRate * 100).toFixed(1)}%`, inline: true },
          { name: '🔥 Level lò luyện', value: `${furnaceLevel}`, inline: true },
          { name: '💡 Gợi ý', value: 'Nâng cấp lò luyện để tăng tỉ lệ thành công!', inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [failureEmbed] });
    }
  },

  // Luyện nhiều viên trong một lần
  async craftSelectedElixirBatch(interaction, elixirId, userId, quantity) {
    await itemLoader.loadAllItems();
    const elixir = itemLoader.items[elixirId];
    const player = playerManager.getPlayer(userId);
    if (!elixir || !player) {
      await interaction.reply({ content: '❌ Không tìm thấy dữ liệu cần thiết!', ephemeral: true });
      return;
    }

    const furnaceLevel = player.alchemy?.furnaceLevel || 1;
    const baseSuccessRate = 0.6;
    const levelBonus = (furnaceLevel - 1) * 0.05;
    const successRate = Math.min(baseSuccessRate + levelBonus, 0.95);

    let successCount = 0;
    let failureCount = 0;
    let crafted = 0;

    for (let i = 0; i < quantity; i++) {
      // Kiểm tra đủ nguyên liệu cho 1 lần
      const canCraft = Object.entries(elixir.crafting || {}).every(([matId, req]) => {
        const have = player.inventory.items.find(it => it.id === matId)?.quantity || 0;
        return have >= req;
      });
      if (!canCraft) break;

      // Trừ nguyên liệu cho 1 lần
      for (const [matId, req] of Object.entries(elixir.crafting || {})) {
        const invItem = player.inventory.items.find(it => it.id === matId);
        if (invItem) {
          invItem.quantity -= req;
          if (invItem.quantity <= 0) {
            player.inventory.items = player.inventory.items.filter(it => it.id !== matId);
          }
        }
      }

      crafted++;
      if (Math.random() < successRate) {
        playerManager.addItemToInventory(player, elixirId, 1);
        successCount++;
      } else {
        failureCount++;
      }
    }

    // Cập nhật thống kê alchemy
    if (!player.alchemy) player.alchemy = { furnaceLevel: 1, totalCrafted: 0, successCount: 0, failureCount: 0, lastAlchemy: 0 };
    player.alchemy.totalCrafted += crafted;
    player.alchemy.successCount += successCount;
    player.alchemy.failureCount += failureCount;
    player.alchemy.lastAlchemy = Date.now();

    playerManager.savePlayers();

    const resultEmbed = new EmbedBuilder()
      .setColor(successCount > 0 ? 0x00FF88 : 0xFF5555)
      .setTitle('🧪 Kết Quả Luyện Đan')
      .setDescription(`**${elixir.name}** — Số lượng yêu cầu: **${quantity}**`)
      .addFields(
        { name: '✅ Thành công', value: `${successCount}`, inline: true },
        { name: '❌ Thất bại', value: `${failureCount}`, inline: true },
        { name: '🔥 Level lò luyện', value: `${furnaceLevel} (tỉ lệ: ${(successRate * 100).toFixed(1)}%)`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [resultEmbed] });
  },

  // Hiển thị select số lượng cần luyện
  async showQuantitySelect(interaction, userId, elixirId) {
    await itemLoader.loadAllItems();
    const player = playerManager.getPlayer(userId);
    const elixir = itemLoader.items[elixirId];
    if (!elixir) {
      await interaction.reply({ content: '❌ Không tìm thấy đan dược!', ephemeral: true });
      return;
    }

    const maxCraft = this.getMaxCraftable(player, elixir);
    if (maxCraft < 1) {
      await interaction.reply({ content: '⚠️ Đạo hữu không đủ nguyên liệu luyện chế', ephemeral: true });
      return;
    }

    const materialsLine = Object.entries(elixir.crafting || {}).map(([id, qty]) => {
      const info = itemLoader.getItemInfo(id);
      const have = player.inventory.items.find(i => i.id === id)?.quantity || 0;
      const emoji = info?.emoji || '❓';
      const name = info?.name || id;
      return `${emoji} ${name} x${qty} (còn: ${have})`;
    }).join(', ');

    const embed = new EmbedBuilder()
      .setColor('#9C27B0')
      .setTitle(`🧪 Chọn Số Lượng - ${elixir.name}`)
      .setDescription(`${this.createSeparator()}\nChọn số lượng cần luyện.\n\nNguyên liệu mỗi viên: ${materialsLine}\nTối đa có thể luyện: **${maxCraft}**`)
      .setTimestamp();

    const qtySelect = new StringSelectMenuBuilder()
      .setCustomId(`falchemy_select_qty:${elixirId}`)
      .setPlaceholder('Chọn số lượng...')
      .addOptions([
        { label: '1', value: '1', description: 'Luyện 1 viên' },
        { label: '5', value: '5', description: 'Luyện 5 viên' },
        { label: '10', value: '10', description: 'Luyện 10 viên' },
        { label: `Tối đa (${maxCraft})`, value: 'max', description: 'Luyện tối đa theo nguyên liệu hiện có' }
      ]);

    const backButton = new ButtonBuilder()
      .setCustomId('falchemy_back_main')
      .setLabel('🔙 Quay Lại')
      .setStyle(ButtonStyle.Secondary);

    const selectRow = new ActionRowBuilder().addComponents(qtySelect);
    const backRow = new ActionRowBuilder().addComponents(backButton);

    await interaction.update({ embeds: [embed], components: [selectRow, backRow] });
  },

  // Tính số lượng tối đa có thể luyện
  getMaxCraftable(player, elixir) {
    let maxCraft = Infinity;
    for (const [materialId, reqQty] of Object.entries(elixir.crafting || {})) {
      const have = player.inventory.items.find(i => i.id === materialId)?.quantity || 0;
      const possible = Math.floor(have / reqQty);
      if (possible < maxCraft) maxCraft = possible;
    }
    if (!isFinite(maxCraft)) return 0;
    return Math.max(0, maxCraft);
  },

  // Format hiệu quả của đan dược
  formatEffects(effects) {
    if (!effects) return 'Không có hiệu quả';

    return Object.entries(effects).map(([key, value]) => {
      const effectNames = {
        'hp': 'Sinh Mệnh',
        'mp': 'Linh Lực',
        'attack': 'Công Kích',
        'defense': 'Phòng Thủ',
        'speed': 'Tốc Độ',
        'critical': 'Chí Mạng',
        'stamina': 'Thể Lực',
        'recovery': 'Hồi Phục',
        'spirit_power': 'Linh Khí',
        'cultivation_speed': 'Tốc Độ Tu Luyện',
        'strength': 'Sức Mạnh',
        'fire_power': 'Hỏa Lực',
        'agility': 'Nhanh Nhẹn',
        'evasion': 'Né Tránh',
        'reaction_time': 'Thời Gian Phản Ứng',
        'mental_clarity': 'Tinh Thần',
        'focus': 'Tập Trung',
        'meditation_bonus': 'Thiền Định',
        'spirit_purification': 'Thanh Lọc Linh Khí',
        'enlightenment': 'Giác Ngộ',
        'alchemy_mastery': 'Thuật Luyện Đan',
        'elixir_quality': 'Chất Lượng Đan',
        'success_rate': 'Tỉ Lệ Thành Công',
        'spirit_control': 'Kiểm Soát Linh Khí',
        'elemental_affinity': 'Tương Thích Ngũ Hành'
      };

      return `**${effectNames[key] || key}**: +${value}`;
    }).join('\n');
  },

  // Lấy tên hiển thị cho rarity
  getRarityDisplayName(rarity) {
    const displayNames = {
      'common': 'Thường',
      'uncommon': 'Hiếm',
      'rare': 'Quý Hiếm',
      'epic': 'Cực Quý',
      'legendary': 'Huyền Thoại',
      'mythic': 'Thần Thoại'
    };
    return displayNames[rarity] || rarity;
  }
}; 