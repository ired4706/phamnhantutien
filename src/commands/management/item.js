const { EmbedBuilder } = require('discord.js');
const playerManager = require('../../systems/player.js');
const itemLoader = require('../../utils/data/item-loader.js');

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

    if (!(await playerManager.hasStartedGame(userId))) {
      const notStartedEmbed = playerManager.createNotStartedEmbed();
      await interaction.reply({ embeds: [notStartedEmbed] });
      return;
    }

    const player = await playerManager.getPlayer(userId);
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

      // Xử lý main stats lưu theo bonuses.__main_stats
      if (item.bonuses.__main_stats && typeof item.bonuses.__main_stats === 'object') {
        Object.entries(item.bonuses.__main_stats).forEach(([k, v]) => {
          // Hiển thị dạng: ⭐ Chỉ Số Chính: STR +<value>
          mainStats.push(`Chỉ Số Chính: ${k} **+${v}**`);
        });
      }

      // Các stat còn lại (bỏ qua key nội bộ bắt đầu bằng __)
      Object.entries(item.bonuses).forEach(([stat, value]) => {
        if (stat.startsWith('__')) return; // skip internal keys
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

    // Hiển thị passive nếu có (đối với weapon)
    if (Array.isArray(item.passives) && item.passives.length > 0) {
      const toNameDesc = (p) => {
        // Ưu tiên sử dụng name và description từ passive object (cho passive mới)
        if (p.name && p.description) {
          return { name: p.name, desc: p.description };
        }
        
        // Fallback về switch case cho passive cũ (nếu có)
        switch (p.id) {
          // Thiên (Epic) - passive cũ (đã bị xóa, nhưng giữ lại để tương thích)
          case 'passive_thien_kim_thuong_phong':
            return { name: 'Thường phong', desc: `+${Math.round((p.value || 0) * 100)}% xuyên giáp (penetration).` };
          case 'passive_thien_moc_sinh_diep':
            return { name: 'Sinh diệp', desc: `Mỗi ${p.every || 2} lượt hồi ${Math.round((p.value || 0) * 100)}% HP (hồi theo lượt), hồi lại sau ${p.cooldown || 2} lượt.` };
          case 'passive_thien_thuy_luu_anh':
            return { name: 'Lưu ảnh', desc: `+${Math.round((p.value || 0) * 100)}% Né Tránh (EVA).` };
          case 'passive_thien_hoa_viem_ho':
            return { name: 'Viêm hộ', desc: `Phản ${Math.round((p.value || 0) * 100)}% sát thương, hồi lại sau ${p.cooldown || 2} lượt.` };
          case 'passive_thien_tho_tram_uy':
            return { name: 'Trầm uy', desc: `Giảm ${Math.round((p.value || 0) * 100)}% sát thương cuối cùng nhận vào, hồi lại sau ${p.cooldown || 2} lượt.` };
          // Thần (Legendary) - passive cũ (đã bị xóa, nhưng giữ lại để tương thích)
          case 'passive_than_kim_hon_doan_sat':
            return { name: 'Kim Hồn Đoạn Sát', desc: `Sau khi hồi ${p.cooldown || 5} lượt, đòn tấn công kế tiếp là chí mạng đảm bảo, +${Math.round((p.crit_damage_bonus_pct || 0) * 100)}% sát thương chí mạng.` };
          case 'passive_than_moc_van_diep_sinh_chuyen':
            return { name: 'Vạn Diệp Sinh Chuyển', desc: `Khi dưới ${Math.round((p.threshold || 0.3) * 100)}% HP, tăng gấp đôi regen trong ${p.duration || 2} lượt (hồi lại sau ${p.cooldown || 4} lượt).` };
          case 'passive_than_thuy_thuy_anh_song_than':
            return { name: 'Thủy Ảnh Song Thân', desc: `${Math.round((p.value || 0.1) * 100)}% cơ hội né hoàn toàn (không cộng dồn với skill), hồi lại sau ${p.cooldown || 2} lượt.` };
          case 'passive_than_hoa_kiem_soat_viem_tam':
            return { name: 'Viêm Tâm Dẫn Lực', desc: `Mỗi khi chí mạng, +${Math.round((p.value || 0.04) * 100)}% ATK trong ${p.duration || 2} lượt, tối đa ${p.max_stacks || 3} cộng dồn.` };
          case 'passive_than_tho_cu_luc_ho_son':
            return { name: 'Cự Lực Hộ Sơn', desc: `Khi dùng kỹ năng phòng thủ, hiệu quả tăng thêm ${Math.round((p.value || 0.1) * 100)}%, hồi lại sau ${p.cooldown || 2} lượt.` };
        }
        // Fallback cuối cùng
        const pretty = (p.id || p.type || 'passive').replace(/_/g, ' ');
        return { name: pretty, desc: 'Hiệu ứng bị động của vũ khí.' };
      };

      const blocks = item.passives.map(p => {
        const nd = toNameDesc(p);
        return `• ${nd.name}\n  ${nd.desc}`;
      }).join('\n');

      embed.addFields({
        name: '✨ **Kĩ Năng Passive**',
        value: blocks || '—',
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
