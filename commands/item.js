const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');
const itemLoader = require('../utils/item-loader.js');

module.exports = {
  name: 'item',
  aliases: ['fitem', 'xem_item', 'item_info'],
  description: 'Xem thông tin chi tiết của item theo UID',

  // Tạo separator đẹp mắt
  createSeparator() {
    return '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  },

  // Lấy màu theo rarity
  getRarityColor(rarity) {
    const colors = {
      'common': '#9B9B9B',
      'uncommon': '#4CAF50',
      'rare': '#2196F3',
      'epic': '#9C27B0',
      'legendary': '#FF9800'
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
      'legendary': '🟠'
    };
    return emojis[rarity] || '⚪';
  },

  // Format stat value
  formatStatValue(stat, value) {
    if (stat.includes('_res')) {
      return value >= 0 ? `+${value}%` : `${value}%`; // Show + for positive, - for negative
    }
    if (stat.includes('main_')) {
      const mainStat = stat.replace('main_', '');
      if (['hp', 'defense', 'mana', 'regen'].includes(mainStat)) {
        return value >= 100 ? `+${value}` : `+${value}`;
      }
      if (['critical', 'evasion'].includes(mainStat)) {
        return `+${value}%`;
      }
      return `+${value}`;
    }
    return `+${value}`; // Always positive now
  },

  // Get stat display name
  getStatDisplayName(stat) {
    const statNames = {
      'attack': '⚔️ Công Kích',
      'defense': '🛡️ Phòng Thủ',
      'hp': '❤️ Sinh Lực',
      'mana': '💙 Năng Lượng',
      'speed': '💨 Tốc Độ',
      'critical': '💥 Bạo Kích',
      'regen': '🔄 Hồi Phục',
      'evasion': '🌪️ Né Tránh',
      'fire_res': '🔥 Kháng Hỏa',
      'water_res': '💧 Kháng Thủy',
      'wood_res': '🌿 Kháng Mộc',
      'metal_res': '⚔️ Kháng Kim',
      'earth_res': '🏔️ Kháng Thổ',
      'main_attack': '⚔️ Chỉ Số Chính: Công Kích',
      'main_defense': '🛡️ Chỉ Số Chính: Phòng Thủ',
      'main_hp': '❤️ Chỉ Số Chính: Sinh Lực',
      'main_mana': '💙 Chỉ Số Chính: Năng Lượng',
      'main_speed': '💨 Chỉ Số Chính: Tốc Độ',
      'main_critical': '💥 Chỉ Số Chính: Bạo Kích',
      'main_regen': '🔄 Chỉ Số Chính: Hồi Phục',
      'main_evasion': '🌪️ Chỉ Số Chính: Né Tránh',
    };
    return statNames[stat] || stat;
  },

  async execute(interaction, args) {
    if (!args || args.length === 0) {
      await interaction.reply({ content: '❌ Vui lòng cung cấp UID của item!\nSử dụng: `fitem <uid>`' });
      return;
    }

    const uid = args[0].trim();
    const userId = interaction.user.id;

    if (!playerManager.hasStartedGame(userId)) {
      const notStartedEmbed = playerManager.createNotStartedEmbed();
      await interaction.reply({ embeds: [notStartedEmbed] });
      return;
    }

    const player = playerManager.getPlayer(userId);
    if (!player) {
      await interaction.reply({ content: '❌ Không tìm thấy thông tin người chơi!' });
      return;
    }

    // Tìm item trong inventory
    let item = null;
    let itemType = null;

    // Tìm trong weapons
    if (player.inventory.weapons) {
      const weapon = player.inventory.weapons.find(w => w.uid === uid);
      if (weapon) {
        item = weapon;
        itemType = 'weapon';
      }
    }

    // Tìm trong armors
    if (!item && player.inventory.armors) {
      const armor = player.inventory.armors.find(a => a.uid === uid);
      if (armor) {
        item = armor;
        itemType = 'armor';
      }
    }

    // Tìm trong items (stackable items)
    if (!item && player.inventory.items) {
      const stackableItem = player.inventory.items.find(i => i.uid === uid);
      if (stackableItem) {
        item = stackableItem;
        itemType = 'item';
      }
    }

    if (!item) {
      await interaction.reply({ content: '❌ Không tìm thấy item với UID này trong kho của bạn!' });
      return;
    }

    await itemLoader.loadAllItems();
    const itemInfo = itemLoader.getItemInfo(item.id);

    if (!itemInfo) {
      await interaction.reply({ content: '❌ Không tìm thấy thông tin item!' });
      return;
    }

    // Tạo embed hiển thị thông tin item
    const embed = new EmbedBuilder()
      .setColor(this.getRarityColor(itemInfo.rarity))
      .setTitle(`${this.getRarityEmoji(itemInfo.rarity)} ${itemInfo.name}`)
      .setDescription(`${this.createSeparator()}\n${itemInfo.description || 'Không có mô tả'}`)
      .addFields({
        name: '🆔 **Thông Tin Cơ Bản**',
        value: `**UID**: \`${item.uid}\`\n**Loại**: ${this.getItemTypeDisplayName(itemType)}\n**Cấp**: ${this.getRarityDisplayName(itemInfo.rarity)}\n**Tạo lúc**: <t:${Math.floor(item.createdAt / 1000)}:F>`,
        inline: false
      });

    // Hiển thị stats nếu có
    if (item.bonuses && Object.keys(item.bonuses).length > 0) {
      const regularStats = [];
      const mainStats = [];
      const resistanceStats = [];

      Object.entries(item.bonuses).forEach(([stat, value]) => {
        const displayName = this.getStatDisplayName(stat);
        const formattedValue = this.formatStatValue(stat, value);

        if (stat.startsWith('main_')) {
          mainStats.push(`${displayName}: **${formattedValue}**`);
        } else if (stat.includes('_res')) {
          resistanceStats.push(`${displayName}: **${formattedValue}**`);
        } else {
          regularStats.push(`${displayName}: **${formattedValue}**`);
        }
      });

      if (regularStats.length > 0) {
        embed.addFields({
          name: '📊 **Chỉ Số Ngẫu Nhiên**',
          value: regularStats.join('\n'),
          inline: false
        });
      }

      if (mainStats.length > 0) {
        embed.addFields({
          name: '⭐ **Chỉ Số Đặc Biệt**',
          value: mainStats.join('\n'),
          inline: false
        });
      }

      if (resistanceStats.length > 0) {
        embed.addFields({
          name: '🛡️ **Kháng Ngũ Hành**',
          value: resistanceStats.join('\n'),
          inline: false
        });
      }
    } else {
      embed.addFields({
        name: '📊 **Chỉ Số**',
        value: 'Không có chỉ số đặc biệt',
        inline: false
      });
    }

    // Hiển thị crafting info nếu có
    if (itemInfo.crafting) {
      const materials = Object.entries(itemInfo.crafting).map(([id, qty]) => {
        const materialInfo = itemLoader.getItemInfo(id);
        const emoji = materialInfo?.emoji || '❓';
        const name = materialInfo?.name || id;
        return `${emoji} **${name}** x${qty}`;
      }).join('\n');

      embed.addFields({
        name: '🔨 **Nguyên Liệu Chế Tạo**',
        value: materials,
        inline: false
      });
    }

    embed.setFooter({ text: 'Sử dụng fitem <uid> để xem thông tin item khác' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  // Helper functions
  getItemTypeDisplayName(type) {
    const types = {
      'weapon': '⚔️ Vũ Khí',
      'armor': '🛡️ Trang Bị',
      'item': '📦 Vật Phẩm'
    };
    return types[type] || '❓ Không Xác Định';
  },

  getRarityDisplayName(rarity) {
    const rarities = {
      'common': 'Phàm',
      'uncommon': 'Huyền',
      'rare': 'Địa',
      'epic': 'Thiên',
      'legendary': 'Thần'
    };
    return rarities[rarity] || 'Không Xác Định';
  }
};
