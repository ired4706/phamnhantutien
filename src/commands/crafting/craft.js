const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const playerManager = require('../../systems/player.js');
const itemLoader = require('../../utils/data/item-loader.js');

module.exports = {
  name: 'craft',
  aliases: ['fcraft', 'che_tao_tb', 'trangbi'],
  description: 'Chế tạo trang bị từ nguyên liệu trong kho',

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

  // Get main stat for equipment based on name and type
  getMainStat(equipmentName, equipmentType) {
    const mainStatMap = {
      // Giáp (Armor) - thiên về thủ/sinh tồn
      'Giáp Da Thô': 'hp',
      'Giáp Vải Gai': 'defense',
      'Giáp Hắc Thiết': 'hp',
      'Giáp Uẩn Linh': 'defense',
      'Giáp Bạch Ngọc': 'hp',
      'Giáp Thiên Lam': 'defense',
      'Thần Giáp Kim Cang': 'hp',
      'Thần Giáp Huyền Thiên': 'defense',

      // Giày (Shoes) - thiên về tốc/né
      'Giày Da Thường': 'speed',
      'Giày Luyện Thể': 'evasion',
      'Giày Vân Hành': 'speed',
      'Giày Thanh Ảnh': 'evasion',
      'Giày Ảnh Ẩn': 'speed',
      'Giày Thủy Ảnh': 'evasion',
      'Giày Phi Vân': 'speed',
      'Giày Hỏa Vũ': 'evasion',
      'Thân Khởi Lôi Bộ': 'speed',
      'Thần Vân Ảnh Bộ': 'evasion',

      // Trang sức (Accessories) - thiên về công/năng lượng
      'Nhẫn Bạch Ngân': 'critical',
      'Ngọc Bội Thanh Liễu': 'regen',
      'Hoa Tai Thanh Vân': 'mana',
      'Nhẫn Huyền Ngọc': 'critical',
      'Ngọc Bội Hắc Thủy': 'regen',
      'Hoa Tai Hồng Vũ': 'mana',
      'Nhẫn Tinh Quang': 'critical',
      'Ngọc Bội Minh Nguyệt': 'regen',
      'Hoa Tai Tinh Hà': 'mana',
      'Nhẫn Vĩnh Hằng': 'critical',
      'Ngọc Bội Thần Quang': 'regen',
      'Hoa Tai Thái Hư': 'mana'
    };

    return mainStatMap[equipmentName] || null;
  },

  // Get main stat bonus value based on rarity and main stat type
  getMainStatBonus(rarity, mainStat, equipmentType) {
    const bonusConfig = {
      'rare': { // Địa
        'hp': 200,
        'defense': 20,
        'speed': 10,
        'evasion': 5, // 5%
        'critical': 5, // 5% CRIT DMG
        'regen': 3,
        'mana': 50
      },
      'epic': { // Thiên
        'hp': 500,
        'defense': 50,
        'speed': 15,
        'evasion': 10, // 10%
        'critical': 10, // 10% CRIT DMG
        'regen': 5,
        'mana': 100
      },
      'legendary': { // Thần
        'hp': 800,
        'defense': 80,
        'speed': 20,
        'evasion': 15, // 15%
        'critical': 15, // 15% CRIT DMG
        'regen': 8,
        'mana': 150
      }
    };

    return bonusConfig[rarity]?.[mainStat] || 0;
  },

  // Randomize equipment stats based on rarity
  randomizeEquipmentStats(rarity, equipmentName, equipmentType) {
    const stats = {};

    // Define stat pools for each rarity
    const statPools = {
      'common': ['attack', 'defense', 'hp', 'mana'],
      'uncommon': ['attack', 'defense', 'hp', 'mana', 'critical', 'regen', 'evasion', 'speed'],
      'rare': ['attack', 'defense', 'hp', 'mana', 'critical', 'regen', 'evasion', 'speed'],
      'epic': ['attack', 'defense', 'hp', 'mana', 'critical', 'regen', 'evasion', 'speed'],
      'legendary': ['attack', 'defense', 'hp', 'mana', 'critical', 'regen', 'evasion', 'speed']
    };

    // Define number of stat lines and value ranges
    const rarityConfig = {
      'common': { lines: 2, minValue: 1, maxValue: 4 },
      'uncommon': { lines: 3, minValue: 3, maxValue: 6 },
      'rare': { lines: 4, minValue: 5, maxValue: 8 },
      'epic': { lines: 5, minValue: 7, maxValue: 10 },
      'legendary': { lines: 6, minValue: 9, maxValue: 12 }
    };

    const config = rarityConfig[rarity] || rarityConfig['common'];
    const availableStats = statPools[rarity] || statPools['common'];

    // Randomly select stats to roll
    const selectedStats = [];
    const shuffledStats = [...availableStats].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(config.lines, shuffledStats.length); i++) {
      selectedStats.push(shuffledStats[i]);
    }

    // Roll values for selected stats (always positive)
    selectedStats.forEach(stat => {
      const value = Math.floor(Math.random() * (config.maxValue - config.minValue + 1)) + config.minValue;
      stats[stat] = value; // Always positive
    });

    // Add main stat bonus for rare+ equipment
    if (['rare', 'epic', 'legendary'].includes(rarity)) {
      const mainStat = this.getMainStat(equipmentName, equipmentType);
      if (mainStat) {
        const mainStatBonus = this.getMainStatBonus(rarity, mainStat, equipmentType);
        if (mainStatBonus > 0) {
          // Add main stat bonus (always positive)
          stats[`main_${mainStat}`] = mainStatBonus;
        }
      }
    }

    // Add elemental resistance for epic+ equipment
    if (['epic', 'legendary'].includes(rarity)) {
      const elements = ['fire', 'water', 'wood', 'metal', 'earth'];
      const shuffledElements = [...elements].sort(() => Math.random() - 0.5);

      if (rarity === 'epic') {
        // Thiên: 1 loại kháng ngũ hành (+5%–7%)
        const selectedElement = shuffledElements[0];
        const resistanceValue = Math.floor(Math.random() * 3) + 5; // 5-7%
        stats[`${selectedElement}_res`] = resistanceValue;
      } else if (rarity === 'legendary') {
        // Thần: 2 loại kháng ngũ hành khác nhau (+8%–12%)
        const selectedElements = shuffledElements.slice(0, 2);
        selectedElements.forEach(element => {
          const resistanceValue = Math.floor(Math.random() * 5) + 8; // 8-12%
          stats[`${element}_res`] = resistanceValue;
        });
      }
    }

    return stats;
  },

  // Map hiển thị loại trang bị
  getEquipTypeDisplayName(type) {
    const map = {
      'armor': 'Áo Giáp',
      'pants': 'Quần',
      'boots': 'Giày',
      'ring': 'Nhẫn',
      'pendant': 'Ngọc Bội',
      'earrings': 'Hoa Tai'
    };
    return map[type] || type;
  },

  async execute(interaction, args) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    if (!(await playerManager.hasStartedGame(userId))) {
      const notStartedEmbed = playerManager.createNotStartedEmbed();
      await interaction.reply({ embeds: [notStartedEmbed] });
      return;
    }

    // Không có args: mở menu chọn loại trang bị
    if (!args || args.length === 0) {
      await this.showCraftMenu(interaction, userId);
      return;
    }

    // Có args: chế tạo trực tiếp theo ID
    const equipmentId = args[0];
    await this.craftEquipment(interaction, userId, username, equipmentId);
  },

  async showCraftMenu(interaction, userId) {
    const embed = new EmbedBuilder()
      .setColor('#8B4513')
      .setTitle('🧰 Chế Tạo Trang Bị')
      .setDescription(`${this.createSeparator()}\nChọn loại trang bị bạn muốn chế tạo.`)
      .setTimestamp();

    const buttons = [
      new ButtonBuilder().setCustomId('craft_type_armor').setLabel('🛡️ Áo Giáp').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('craft_type_pants').setLabel('👖 Quần').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('craft_type_boots').setLabel('👟 Giày').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('craft_type_ring').setLabel('💍 Nhẫn').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('craft_type_pendant').setLabel('🔮 Ngọc Bội').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('craft_type_earrings').setLabel('👂 Hoa Tai').setStyle(ButtonStyle.Secondary)
    ];

    const row = new ActionRowBuilder().addComponents(buttons);

    await interaction.reply({ embeds: [embed], components: [row] });
  },

  async handleButton(interaction) {
    const { customId } = interaction;
    const userId = interaction.user.id;

    if (customId === 'craft_back_main') {
      await this.showCraftMenu(interaction, userId);
      return;
    }

    if (customId.startsWith('craft_type_')) {
      const type = customId.replace('craft_type_', '');
      await this.showEquipmentByType(interaction, type, userId);
    }
  },

  async handleSelectMenu(interaction) {
    try {
      const { customId, values } = interaction;
      const userId = interaction.user.id;

      if (customId === 'craft_select_equipment') {
        const selectedId = values[0];
        if (!selectedId) {
          await interaction.reply({ content: '❌ Không có trang bị nào được chọn!', ephemeral: true });
          return;
        }
        await this.showQuantitySelect(interaction, userId, selectedId);
        return;
      } else if (customId.startsWith('craft_select_qty:')) {
        const selectedId = customId.split(':')[1];
        const qtyValue = values[0];
        const player = await playerManager.getPlayer(userId);
        const equip = itemLoader.items[selectedId];
        if (!equip) {
          await interaction.reply({ content: '❌ Không tìm thấy trang bị!', ephemeral: true });
          return;
        }
        const maxCraft = this.getMaxCraftable(player, equip);
        if (maxCraft < 1) {
          await interaction.reply({ content: '⚠️ Đạo hữu không đủ nguyên liệu chế tạo', ephemeral: true });
          return;
        }
        let quantity = qtyValue === 'max' ? maxCraft : parseInt(qtyValue, 10);
        if (!quantity || quantity < 1) {
          await interaction.reply({ content: '❌ Số lượng không hợp lệ!', ephemeral: true });
          return;
        }
        if (quantity > maxCraft) quantity = maxCraft;

        if (quantity === 1) {
          await this.craftSelected(interaction, selectedId, userId);
        } else {
          await this.craftSelectedBatch(interaction, selectedId, userId, quantity);
        }
        return;
      }
    } catch (error) {
      console.error('❌ Error in craft handleSelectMenu:', error);
      await interaction.reply({ content: '❌ Có lỗi xảy ra khi xử lý lựa chọn!', ephemeral: true });
    }
  },

  async showEquipmentByType(interaction, type, userId) {
    await itemLoader.loadAllItems();

    const equipments = Object.values(itemLoader.items).filter(item => item.category === 'equipment' && item.type === type && item.crafting);

    if (equipments.length === 0) {
      const noEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ Không Có Trang Bị')
        .setDescription(`Không tìm thấy trang bị loại **${this.getEquipTypeDisplayName(type)}**!`)
        .setFooter({ text: 'Quay lại menu chính' })
        .setTimestamp();

      const backButton = new ButtonBuilder().setCustomId('craft_back_main').setLabel('🔙 Quay Lại').setStyle(ButtonStyle.Secondary);
      const backRow = new ActionRowBuilder().addComponents(backButton);
      await interaction.update({ embeds: [noEmbed], components: [backRow] });
      return;
    }

    const player = await playerManager.getPlayer(userId);
    const byRarity = {};
    equipments.forEach(eq => {
      const rarity = eq.rarity || 'common';
      if (!byRarity[rarity]) byRarity[rarity] = [];
      byRarity[rarity].push(eq);
    });

    const embed = new EmbedBuilder()
      .setColor(this.getRarityColor('epic'))
      .setTitle(`🧰 Trang Bị - ${this.getEquipTypeDisplayName(type)}`)
      .setDescription(`${this.createSeparator()}\nDanh sách trang bị có thể chế tạo\n\nSử dụng: \`fcraft <id_trang_bi>\` để chế tạo nhanh`);

    const order = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

    order.forEach(r => {
      if (!byRarity[r] || byRarity[r].length === 0) return;
      const list = byRarity[r];
      const chunks = this.chunkArray(list, 3);
      chunks.forEach(chunk => {
        const value = chunk.map(eq => {
          const materials = Object.entries(eq.crafting || {}).map(([id, qty]) => {
            const info = itemLoader.getItemInfo(id);
            const have = player.inventory.items.find(i => i.id === id)?.quantity || 0;
            const emoji = info?.emoji || '❓';
            const name = info?.name || id;
            return `${emoji} **${name}** x${qty} (còn: ${have})`;
          }).join(', ');

          const id = Object.keys(itemLoader.items).find(k => itemLoader.items[k] === eq);
          const rarityEmoji = this.getRarityEmoji(eq.rarity || 'common');
          return `${rarityEmoji} **${eq.name}** (ID: \`${id}\`)\n└ Nguyên liệu: ${materials}`;
        }).join('\n\n');

        embed.addFields({ name: '\u200B', value, inline: false });
      });
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('craft_select_equipment')
      .setPlaceholder('Chọn trang bị để chế tạo...');

    equipments.forEach(eq => {
      const rarityEmoji = this.getRarityEmoji(eq.rarity || 'common');
      const id = Object.keys(itemLoader.items).find(k => itemLoader.items[k] === eq);
      if (id) {
        selectMenu.addOptions({ label: `${rarityEmoji} ${eq.name}`, description: `ID: ${id}`, value: id });
      }
    });

    const backButton = new ButtonBuilder().setCustomId('craft_back_main').setLabel('🔙 Quay Lại').setStyle(ButtonStyle.Secondary);
    const selectRow = new ActionRowBuilder().addComponents(selectMenu);
    const backRow = new ActionRowBuilder().addComponents(backButton);

    await interaction.update({ embeds: [embed], components: [selectRow, backRow] });
  },

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
    return chunks;
  },

  async craftEquipment(interaction, userId, username, equipmentId) {
    await itemLoader.loadAllItems();
    const equipInfo = itemLoader.getItemInfo(equipmentId);
    const player = await playerManager.getPlayer(userId);

    if (!equipInfo || equipInfo.category !== 'equipment') {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Lỗi Chế Tạo Trang Bị')
        .setDescription('Không tìm thấy trang bị cần chế tạo hoặc ID không hợp lệ!')
        .addFields({ name: '💡 Gợi ý', value: 'Sử dụng `fcraft` để xem danh sách trang bị có thể chế tạo', inline: false });
      await interaction.reply({ embeds: [errorEmbed] });
      return;
    }

    const craftingMaterials = equipInfo.crafting || {};
    const missing = [];
    const available = [];

    for (const [materialId, requiredQty] of Object.entries(craftingMaterials)) {
      const invItem = player.inventory.items.find(item => item.id === materialId);
      const have = invItem ? invItem.quantity : 0;
      const info = itemLoader.getItemInfo(materialId);
      const name = info?.name || materialId;
      const emoji = info?.emoji || '❓';
      if (have < requiredQty) {
        missing.push({ name, emoji, have, requiredQty, missing: requiredQty - have });
      } else {
        available.push({ name, emoji, requiredQty });
      }
    }

    if (missing.length > 0) {
      const missingEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ Thiếu Nguyên Liệu Chế Tạo')
        .setDescription(`**${username}** không đủ nguyên liệu để chế tạo **${equipInfo.name}**!`)
        .addFields({
          name: '✅ Nguyên Liệu Đã Có',
          value: available.length > 0 ? available.map(m => `${m.emoji} **${m.name}**: ${m.requiredQty}`).join('\n') : 'Không',
          inline: false
        })
        .addFields({
          name: '❌ Nguyên Liệu Thiếu',
          value: missing.map(m => `${m.emoji} **${m.name}**: ${m.have}/${m.requiredQty} (Thiếu: ${m.missing})`).join('\n'),
          inline: false
        })
        .addFields({ name: '💡 Gợi ý', value: 'Dùng `fhunt`, `fpick`, `fmine` để lấy nguyên liệu.', inline: false });
      await interaction.reply({ embeds: [missingEmbed] });
      return;
    }

    // Trừ nguyên liệu
    for (const [materialId, requiredQty] of Object.entries(craftingMaterials)) {
      const invItem = player.inventory.items.find(item => item.id === materialId);
      if (invItem) {
        invItem.quantity -= requiredQty;
        if (invItem.quantity <= 0) {
          player.inventory.items = player.inventory.items.filter(item => item.id !== materialId);
        }
      }
    }

    // Thêm trang bị dạng instance (không stack)
    const equipInstance = {
      uid: `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`,
      id: equipmentId,
      createdAt: Date.now(),
      bonuses: this.randomizeEquipmentStats(equipInfo.rarity, equipInfo.name, equipInfo.type)
    };
    player.inventory.armors = player.inventory.armors || [];
    player.inventory.armors.push(equipInstance);

    playerManager.savePlayers();

    const successEmbed = new EmbedBuilder()
      .setColor('#00C853')
      .setTitle('🎉 Chế Tạo Trang Bị Thành Công!')
      .setDescription(`${this.createSeparator()}\n**${username}** đã chế tạo thành công **${equipInfo.name}**!`)
      .addFields({ name: '🧰 Trang Bị Nhận Được', value: `${equipInfo.emoji} **${equipInfo.name}** ${this.getRarityEmoji(equipInfo.rarity)}`, inline: false })
      .addFields({
        name: '🔍 Nguyên Liệu Đã Sử Dụng', value: Object.entries(craftingMaterials).map(([id, qty]) => {
          const info = itemLoader.getItemInfo(id);
          return `${info?.emoji || '❓'} **${info?.name || id}**: ${qty}`;
        }).join('\n'), inline: false
      })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },

  async craftSelected(interaction, equipmentId, userId) {
    await itemLoader.loadAllItems();
    const equip = itemLoader.items[equipmentId];
    const player = await playerManager.getPlayer(userId);
    if (!equip || !player) {
      await interaction.reply({ content: '❌ Không tìm thấy dữ liệu cần thiết!', ephemeral: true });
      return;
    }

    // Kiểm tra nguyên liệu
    const missing = [];
    for (const [materialId, requiredQty] of Object.entries(equip.crafting || {})) {
      const have = player.inventory.items.find(i => i.id === materialId)?.quantity || 0;
      if (have < requiredQty) {
        const info = itemLoader.getItemInfo(materialId);
        missing.push(`${info?.name || materialId} (cần: ${requiredQty}, có: ${have})`);
      }
    }

    if (missing.length > 0) {
      await interaction.reply({ content: `❌ Thiếu nguyên liệu:\n${missing.join('\n')}`, ephemeral: true });
      return;
    }

    // Trừ vật liệu cho 1 lần
    for (const [materialId, req] of Object.entries(equip.crafting || {})) {
      const inv = player.inventory.items.find(i => i.id === materialId);
      if (inv) {
        inv.quantity -= req;
        if (inv.quantity <= 0) player.inventory.items = player.inventory.items.filter(i => i.id !== materialId);
      }
    }

    const equipInstance = {
      uid: `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`,
      id: equipmentId,
      createdAt: Date.now(),
      bonuses: this.randomizeEquipmentStats(equipInfo.rarity, equipInfo.name, equipInfo.type)
    };
    player.inventory.armors = player.inventory.armors || [];
    player.inventory.armors.push(equipInstance);

    playerManager.savePlayers();

    const embed = new EmbedBuilder()
      .setColor(0x00FF88)
      .setTitle('🧰 Chế Tạo Thành Công!')
      .setDescription(`**${equip.name}** đã được chế tạo!\n\n🆔 **ID**: \`${equipInstance.uid}\`\n💡 Sử dụng \`fitem ${equipInstance.uid}\` để xem thông tin chi tiết`)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },

  async craftSelectedBatch(interaction, equipmentId, userId, quantity) {
    await itemLoader.loadAllItems();
    const equip = itemLoader.items[equipmentId];
    const player = await playerManager.getPlayer(userId);
    if (!equip || !player) {
      await interaction.reply({ content: '❌ Không tìm thấy dữ liệu cần thiết!', ephemeral: true });
      return;
    }

    let crafted = 0;
    const createdItems = [];

    for (let i = 0; i < quantity; i++) {
      const canCraft = Object.entries(equip.crafting || {}).every(([id, req]) => {
        const have = player.inventory.items.find(it => it.id === id)?.quantity || 0;
        return have >= req;
      });
      if (!canCraft) break;

      for (const [id, req] of Object.entries(equip.crafting || {})) {
        const invItem = player.inventory.items.find(it => it.id === id);
        if (invItem) {
          invItem.quantity -= req;
          if (invItem.quantity <= 0) player.inventory.items = player.inventory.items.filter(it => it.id !== id);
        }
      }

      const equipInstance = {
        uid: `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`,
        id: equipmentId,
        createdAt: Date.now(),
        bonuses: this.randomizeEquipmentStats(equip.rarity, equip.name, equip.type)
      };
      player.inventory.armors = player.inventory.armors || [];
      player.inventory.armors.push(equipInstance);
      createdItems.push(equipInstance.uid);
      crafted++;
    }

    playerManager.savePlayers();

    const embed = new EmbedBuilder()
      .setColor(crafted > 0 ? 0x00FF88 : 0xFF5555)
      .setTitle('🧰 Kết Quả Chế Tạo Trang Bị')
      .setDescription(`**${equip.name}** — Số lượng yêu cầu: **${quantity}**, đã chế tạo: **${crafted}**`)
      .addFields({
        name: '🆔 **ID Các Item Đã Tạo**',
        value: createdItems.map(uid => `\`${uid}\``).join(', '),
        inline: false
      })
      .addFields({
        name: '💡 **Gợi Ý**',
        value: `Sử dụng \`fitem <id>\` để xem thông tin chi tiết từng item`,
        inline: false
      })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },

  async showQuantitySelect(interaction, userId, equipmentId) {
    await itemLoader.loadAllItems();
    const player = await playerManager.getPlayer(userId);
    const equip = itemLoader.items[equipmentId];
    if (!equip) {
      await interaction.reply({ content: '❌ Không tìm thấy trang bị!', ephemeral: true });
      return;
    }

    const maxCraft = this.getMaxCraftable(player, equip);
    if (maxCraft < 1) {
      await interaction.reply({ content: '⚠️ Đạo hữu không đủ nguyên liệu chế tạo', ephemeral: true });
      return;
    }

    const materialsLine = Object.entries(equip.crafting || {}).map(([id, qty]) => {
      const info = itemLoader.getItemInfo(id);
      const have = player.inventory.items.find(i => i.id === id)?.quantity || 0;
      const emoji = info?.emoji || '❓';
      const name = info?.name || id;
      return `${emoji} ${name} x${qty} (còn: ${have})`;
    }).join(', ');

    const embed = new EmbedBuilder()
      .setColor('#8B4513')
      .setTitle(`🧰 Chọn Số Lượng - ${equip.name}`)
      .setDescription(`${this.createSeparator()}\nChọn số lượng cần chế tạo.\n\nNguyên liệu mỗi món: ${materialsLine}\nTối đa có thể chế tạo: **${maxCraft}**`)
      .setTimestamp();

    const qtySelect = new StringSelectMenuBuilder()
      .setCustomId(`craft_select_qty:${equipmentId}`)
      .setPlaceholder('Chọn số lượng...')
      .addOptions([
        { label: '1', value: '1', description: 'Chế tạo 1 món' },
        { label: '5', value: '5', description: 'Chế tạo 5 món' },
        { label: '10', value: '10', description: 'Chế tạo 10 món' },
        { label: `Tối đa (${maxCraft})`, value: 'max', description: 'Chế tạo tối đa theo nguyên liệu hiện có' }
      ]);

    const backButton = new ButtonBuilder().setCustomId('craft_back_main').setLabel('🔙 Quay Lại').setStyle(ButtonStyle.Secondary);

    const selectRow = new ActionRowBuilder().addComponents(qtySelect);
    const backRow = new ActionRowBuilder().addComponents(backButton);

    await interaction.update({ embeds: [embed], components: [selectRow, backRow] });
  },

  getMaxCraftable(player, equip) {
    let maxCraft = Infinity;
    for (const [id, reqQty] of Object.entries(equip.crafting || {})) {
      const have = player.inventory.items.find(i => i.id === id)?.quantity || 0;
      const possible = Math.floor(have / reqQty);
      if (possible < maxCraft) maxCraft = possible;
    }
    if (!isFinite(maxCraft)) return 0;
    return Math.max(0, maxCraft);
  }
};


