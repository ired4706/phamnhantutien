const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const playerManager = require('../systems/player.js');
const itemLoader = require('../utils/item-loader.js');

module.exports = {
  name: 'inventory',
  aliases: ['inv', 'tui', 'bag', 'ruong'],
  description: 'Xem inventory và vật phẩm của bạn',

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

  // Format số lượng với màu sắc
  formatQuantity(quantity) {
    if (quantity >= 1000) {
      return `**${(quantity / 1000).toFixed(1)}k**`;
    } else if (quantity >= 100) {
      return `**${quantity}**`;
    } else {
      return quantity.toString();
    }
  },

  // Format inventory items theo category
  formatInventoryByCategory(items) {
    if (!items || items.length === 0) {
      return 'Không có vật phẩm nào';
    }

    const categories = {};
    
    // Phân loại items theo category
    items.forEach(item => {
      const itemInfo = itemLoader.getItemInfo(item.id);
      if (itemInfo) {
        const category = itemInfo.category || 'unknown';
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push({
          ...item,
          info: itemInfo
        });
      }
    });

    // Format từng category
    const formattedCategories = [];
    Object.keys(categories).forEach(category => {
      const categoryItems = categories[category];
      const categoryName = this.getCategoryDisplayName(category);
      
      const formattedItems = categoryItems.map(item => {
        const rarityInfo = itemLoader.getItemRarity(item.id);
        const rarityEmoji = rarityInfo ? rarityInfo.emoji : '';
        const quantity = this.formatQuantity(item.quantity);
        
        return `${item.info.emoji} **${item.info.name}** x${quantity} ${rarityEmoji}`;
      });

      formattedCategories.push(`**${categoryName}**\n${formattedItems.join('\n')}`);
    });

    return formattedCategories.join('\n\n');
  },

  // Lấy tên hiển thị cho category
  getCategoryDisplayName(category) {
    const displayNames = {
      'herbs': '🌿 Thảo Dược',
      'elixirs': '💊 Đan Dược',
      'minerals': '⛏️ Khoáng Thạch',
      'weapons': '⚔️ Vũ Khí',
      'armors': '🛡️ Áo Giáp',
      'accessories': '💍 Trang Sức',
      'shoes': '👟 Giày',
      'artifacts': '🔮 Pháp Bảo',
      'essences': '✨ Linh Khí Tinh Hoa',
      'special_items': '🎁 Vật Phẩm Đặc Biệt',
      'currency': '💰 Tiền Tệ'
    };
    return displayNames[category] || category;
  },

  // Format spirit stones
  formatSpiritStones(spiritStones) {
    if (!spiritStones) return 'Không có linh thạch';
    
    const stones = [];
    if (spiritStones.ha_pham > 0) {
      stones.push(`💎 **Hạ Phẩm**: ${spiritStones.ha_pham.toLocaleString()}`);
    }
    if (spiritStones.trung_pham > 0) {
      stones.push(`🔷 **Trung Phẩm**: ${spiritStones.trung_pham.toLocaleString()}`);
    }
    if (spiritStones.thuong_pham > 0) {
      stones.push(`🔶 **Thượng Phẩm**: ${spiritStones.thuong_pham.toLocaleString()}`);
    }
    if (spiritStones.cuc_pham > 0) {
      stones.push(`💠 **Cực Phẩm**: ${spiritStones.cuc_pham.toLocaleString()}`);
    }
    
    return stones.length > 0 ? stones.join('\n') : 'Không có linh thạch';
  },

  // Format equipment
  formatEquipment(equipment, type) {
    if (!equipment || equipment.length === 0) {
      return `Không có ${type} nào`;
    }

    return equipment.map(item => {
      const itemInfo = itemLoader.getItemInfo(item.id);
      if (itemInfo) {
        const rarityInfo = itemLoader.getItemRarity(item.id);
        const rarityEmoji = rarityInfo ? rarityInfo.emoji : '';
        return `${itemInfo.emoji} **${itemInfo.name}** ${rarityEmoji}`;
      }
      return `📦 **${item.id}**`;
    }).join('\n');
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

    // Lấy thông tin player
    const player = playerManager.getPlayer(userId);
    
    // Load items nếu chưa load
    await itemLoader.loadAllItems();

    // Tạo embed chính cho inventory
    const mainEmbed = new EmbedBuilder()
      .setColor('#8B0000')
      .setTitle('🎒 **Tu Tiên Inventory**')
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription(`${this.createSeparator()}\n**${username}** - Kho đồ của tu sĩ`);

    // Thông tin cơ bản
    mainEmbed.addFields(
      {
        name: '💰 **Linh Thạch**',
        value: this.formatSpiritStones(player.inventory.spiritStones),
        inline: false
      },
      {
        name: '📦 **Tổng Vật Phẩm**',
        value: `**${player.inventory.items ? player.inventory.items.length : 0}** loại vật phẩm`,
        inline: true
      },
      {
        name: '⚔️ **Vũ Khí**',
        value: `**${player.inventory.weapons ? player.inventory.weapons.length : 0}** vũ khí`,
        inline: true
      },
      {
        name: '🛡️ **Áo Giáp**',
        value: `**${player.inventory.armors ? player.inventory.armors.length : 0}** áo giáp`,
        inline: true
      }
    );

    // Tạo embed thứ hai cho vật phẩm chi tiết
    const itemsEmbed = new EmbedBuilder()
      .setColor('#4CAF50')
      .setTitle('🌿 **Vật Phẩm Chi Tiết**')
      .setDescription(`${this.createSeparator()}\n**Danh sách các vật phẩm trong kho**`);

    if (player.inventory.items && player.inventory.items.length > 0) {
      itemsEmbed.addFields({
        name: '📋 **Danh Sách Vật Phẩm**',
        value: this.formatInventoryByCategory(player.inventory.items),
        inline: false
      });
    } else {
      itemsEmbed.addFields({
        name: '📋 **Danh Sách Vật Phẩm**',
        value: 'Không có vật phẩm nào trong kho',
        inline: false
      });
    }

    // Tạo embed thứ ba cho equipment
    const equipmentEmbed = new EmbedBuilder()
      .setColor('#2196F3')
      .setTitle('⚔️ **Trang Bị**')
      .setDescription(`${this.createSeparator()}\n**Vũ khí và áo giáp đang sở hữu**`);

    equipmentEmbed.addFields(
      {
        name: '⚔️ **Vũ Khí**',
        value: this.formatEquipment(player.inventory.weapons, 'vũ khí'),
        inline: false
      },
      {
        name: '🛡️ **Áo Giáp**',
        value: this.formatEquipment(player.inventory.armors, 'áo giáp'),
        inline: false
      }
    );

    // Tạo buttons để xem các phần khác nhau
    const spiritStonesButton = new ButtonBuilder()
      .setCustomId('inventory_spirit_stones')
      .setLabel('Linh Thạch')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('💰');

    const itemsButton = new ButtonBuilder()
      .setCustomId('inventory_items')
      .setLabel('Vật Phẩm')
      .setStyle(ButtonStyle.Success)
      .setEmoji('📦');

    const equipmentButton = new ButtonBuilder()
      .setCustomId('inventory_equipment')
      .setLabel('Trang Bị')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⚔️');

    const row = new ActionRowBuilder().addComponents(
      spiritStonesButton,
      itemsButton,
      equipmentButton
    );

    // Gửi message với button
    await interaction.reply({
      embeds: [mainEmbed, itemsEmbed, equipmentEmbed],
      components: [row]
    });

    // Tạo collector để lắng nghe button click
    try {
      const filter = i => i.user.id === userId && i.customId.startsWith('inventory_');
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 600000 // 10 phút
      });

      collector.on('collect', async (buttonInteraction) => {
        try {
          const viewType = buttonInteraction.customId.replace('inventory_', '');
          
          if (viewType === 'back') {
            // Xử lý button quay lại
            await this.showMainInventory(buttonInteraction, player, username);
          } else {
            await this.showDetailedView(buttonInteraction, viewType, player);
          }
        } catch (error) {
          console.error('Error in inventory button handler:', error);
          // Sử dụng followUp thay vì update cho prefix commands
          try {
            await buttonInteraction.followUp({
              content: '❌ Có lỗi xảy ra khi hiển thị thông tin!',
              ephemeral: true
            });
          } catch (followUpError) {
            console.error('FollowUp error:', followUpError);
            // Fallback: gửi message mới
            await interaction.channel.send('❌ Có lỗi xảy ra khi hiển thị thông tin!');
          }
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          console.log('Inventory collector timed out');
        }
      });

    } catch (error) {
      console.error('Error setting up inventory collector:', error);
    }
  },

  // Hiển thị view chi tiết theo button
  async showDetailedView(interaction, viewType, player) {
    let embed;
    let components = [];

    switch (viewType) {
      case 'spirit_stones':
        embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('💰 **Linh Thạch Chi Tiết**')
          .setDescription(`${this.createSeparator()}\n**Thống kê linh thạch của bạn**`);

        const spiritStones = player.inventory.spiritStones;
        const totalValue = this.calculateSpiritStonesValue(spiritStones);
        
        embed.addFields(
          {
            name: '💎 **Hạ Phẩm**',
            value: `${spiritStones.ha_pham.toLocaleString()} linh thạch`,
            inline: true
          },
          {
            name: '🔷 **Trung Phẩm**',
            value: `${spiritStones.trung_pham.toLocaleString()} linh thạch`,
            inline: true
          },
          {
            name: '🔶 **Thượng Phẩm**',
            value: `${spiritStones.thuong_pham.toLocaleString()} linh thạch`,
            inline: true
          },
          {
            name: '💠 **Cực Phẩm**',
            value: `${spiritStones.cuc_pham.toLocaleString()} linh thạch`,
            inline: true
          },
          {
            name: '💵 **Tổng Giá Trị**',
            value: `${totalValue.toLocaleString()} linh thạch`,
            inline: false
          }
        );
        break;

      case 'items':
        embed = new EmbedBuilder()
          .setColor('#4CAF50')
          .setTitle('📦 **Vật Phẩm Chi Tiết**')
          .setDescription(`${this.createSeparator()}\n**Danh sách đầy đủ các vật phẩm**`);

        if (player.inventory.items && player.inventory.items.length > 0) {
          // Phân loại và hiển thị theo rarity
          const itemsByRarity = this.groupItemsByRarity(player.inventory.items);
          
          Object.keys(itemsByRarity).forEach(rarity => {
            const items = itemsByRarity[rarity];
            const rarityInfo = itemLoader.getItemRarity(items[0].id);
            const rarityName = rarityInfo ? rarityInfo.name : rarity;
            
            const formattedItems = items.map(item => {
              const itemInfo = itemLoader.getItemInfo(item.id);
              return `${itemInfo.emoji} **${itemInfo.name}** x${this.formatQuantity(item.quantity)}`;
            });

            embed.addFields({
              name: `${rarityInfo ? rarityInfo.emoji : '📦'} **${rarityName}**`,
              value: formattedItems.join('\n'),
              inline: false
            });
          });
        } else {
          embed.addFields({
            name: '📋 **Danh Sách Vật Phẩm**',
            value: 'Không có vật phẩm nào trong kho',
            inline: false
          });
        }
        break;

      case 'equipment':
        embed = new EmbedBuilder()
          .setColor('#2196F3')
          .setTitle('⚔️ **Trang Bị Chi Tiết**')
          .setDescription(`${this.createSeparator()}\n**Thông tin chi tiết về vũ khí và áo giáp**`);

        if (player.inventory.weapons && player.inventory.weapons.length > 0) {
          const weaponsList = player.inventory.weapons.map(weapon => {
            const weaponInfo = itemLoader.getItemInfo(weapon.id);
            const rarityInfo = itemLoader.getItemRarity(weapon.id);
            const rarityEmoji = rarityInfo ? rarityInfo.emoji : '';
            return `${weaponInfo.emoji} **${weaponInfo.name}** ${rarityEmoji}\n   └ ${weaponInfo.description || 'Không có mô tả'}`;
          });

          embed.addFields({
            name: '⚔️ **Vũ Khí**',
            value: weaponsList.join('\n\n'),
            inline: false
          });
        } else {
          embed.addFields({
            name: '⚔️ **Vũ Khí**',
            value: 'Không có vũ khí nào',
            inline: false
          });
        }

        if (player.inventory.armors && player.inventory.armors.length > 0) {
          const armorsList = player.inventory.armors.map(armor => {
            const armorInfo = itemLoader.getItemInfo(armor.id);
            const rarityInfo = itemLoader.getItemRarity(armor.id);
            const rarityEmoji = rarityInfo ? rarityInfo.emoji : '';
            return `${armorInfo.emoji} **${armorInfo.name}** ${rarityEmoji}\n   └ ${armorInfo.description || 'Không có mô tả'}`;
          });

          embed.addFields({
            name: '🛡️ **Áo Giáp**',
            value: armorsList.join('\n\n'),
            inline: false
          });
        } else {
          embed.addFields({
            name: '🛡️ **Áo Giáp**',
            value: 'Không có áo giáp nào',
            inline: false
          });
        }
        break;
    }

    // Thêm footer
    embed.setFooter({
      text: 'Sử dụng finventory để xem tổng quan • Sử dụng fhelp để xem các lệnh khác'
    });
    embed.setTimestamp();

    // Button quay lại
    const backButton = new ButtonBuilder()
      .setCustomId('inventory_back')
      .setLabel('Quay Lại')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⬅️');

    const backRow = new ActionRowBuilder().addComponents(backButton);

    try {
      // Thử update nếu là button interaction
      await interaction.update({
        embeds: [embed],
        components: [backRow]
      });
    } catch (error) {
      // Nếu không phải button interaction hoặc có lỗi, gửi message mới
      console.log('Not a button interaction, sending new message');
      await interaction.channel.send({
        embeds: [embed],
        components: [backRow]
      });
    }
  },

  // Nhóm items theo rarity
  groupItemsByRarity(items) {
    const grouped = {};
    
    items.forEach(item => {
      const rarityInfo = itemLoader.getItemRarity(item.id);
      const rarity = rarityInfo ? rarityInfo.name : 'unknown';
      
      if (!grouped[rarity]) {
        grouped[rarity] = [];
      }
      grouped[rarity].push(item);
    });

    return grouped;
  },

  // Tính tổng giá trị linh thạch
  calculateSpiritStonesValue(spiritStones) {
    if (!spiritStones) return 0;
    
    return (spiritStones.ha_pham || 0) + 
           ((spiritStones.trung_pham || 0) * 10) + 
           ((spiritStones.thuong_pham || 0) * 100) + 
           ((spiritStones.cuc_pham || 0) * 1000);
  },

  // Hiển thị lại inventory chính
  async showMainInventory(interaction, player, username) {
    // Tạo embed chính cho inventory
    const mainEmbed = new EmbedBuilder()
      .setColor('#8B0000')
      .setTitle('🎒 **Tu Tiên Inventory**')
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription(`${this.createSeparator()}\n**${username}** - Kho đồ của tu sĩ`);

    // Thông tin cơ bản
    mainEmbed.addFields(
      {
        name: '💰 **Linh Thạch**',
        value: this.formatSpiritStones(player.inventory.spiritStones),
        inline: false
      },
      {
        name: '📦 **Tổng Vật Phẩm**',
        value: `**${player.inventory.items ? player.inventory.items.length : 0}** loại vật phẩm`,
        inline: true
      },
      {
        name: '⚔️ **Vũ Khí**',
        value: `**${player.inventory.weapons ? player.inventory.weapons.length : 0}** vũ khí`,
        inline: true
      },
      {
        name: '🛡️ **Áo Giáp**',
        value: `**${player.inventory.armors ? player.inventory.armors.length : 0}** áo giáp`,
        inline: true
      }
    );

    // Tạo embed thứ hai cho vật phẩm chi tiết
    const itemsEmbed = new EmbedBuilder()
      .setColor('#4CAF50')
      .setTitle('🌿 **Vật Phẩm Chi Tiết**')
      .setDescription(`${this.createSeparator()}\n**Danh sách các vật phẩm trong kho**`);

    if (player.inventory.items && player.inventory.items.length > 0) {
      itemsEmbed.addFields({
        name: '📋 **Danh Sách Vật Phẩm**',
        value: this.formatInventoryByCategory(player.inventory.items),
        inline: false
      });
    } else {
      itemsEmbed.addFields({
        name: '📋 **Danh Sách Vật Phẩm**',
        value: 'Không có vật phẩm nào trong kho',
        inline: false
      });
    }

    // Tạo embed thứ ba cho equipment
    const equipmentEmbed = new EmbedBuilder()
      .setColor('#2196F3')
      .setTitle('⚔️ **Trang Bị**')
      .setDescription(`${this.createSeparator()}\n**Vũ khí và áo giáp đang sở hữu**`);

    equipmentEmbed.addFields(
      {
        name: '⚔️ **Vũ Khí**',
        value: this.formatEquipment(player.inventory.weapons, 'vũ khí'),
        inline: false
      },
      {
        name: '🛡️ **Áo Giáp**',
        value: this.formatEquipment(player.inventory.armors, 'áo giáp'),
        inline: false
      }
    );

    // Tạo buttons để xem các phần khác nhau
    const spiritStonesButton = new ButtonBuilder()
      .setCustomId('inventory_spirit_stones')
      .setLabel('Linh Thạch')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('💰');

    const itemsButton = new ButtonBuilder()
      .setCustomId('inventory_items')
      .setLabel('Vật Phẩm')
      .setStyle(ButtonStyle.Success)
      .setEmoji('📦');

    const equipmentButton = new ButtonBuilder()
      .setCustomId('inventory_equipment')
      .setLabel('Trang Bị')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⚔️');

    const row = new ActionRowBuilder().addComponents(
      spiritStonesButton,
      itemsButton,
      equipmentButton
    );

    try {
      // Thử update nếu là button interaction
      await interaction.update({
        embeds: [mainEmbed, itemsEmbed, equipmentEmbed],
        components: [row]
      });
    } catch (error) {
      // Nếu không phải button interaction hoặc có lỗi, gửi message mới
      console.log('Not a button interaction, sending new message');
      await interaction.channel.send({
        embeds: [mainEmbed, itemsEmbed, equipmentEmbed],
        components: [row]
      });
    }
  }
};
