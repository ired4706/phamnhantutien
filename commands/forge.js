const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');
const itemLoader = require('../utils/item-loader.js');
const cooldownManager = require('../utils/cooldown.js');

module.exports = {
  name: 'forge',
  aliases: ['re', 'chutao', 'weapon'],
  description: 'Chế tạo vũ khí theo ngũ hành sử dụng khoáng thạch và da thú',
  cooldown: 0, // 1 giờ = 3600000ms

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
      'legendary': '#FF9800'    // Cam
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

  // Lấy emoji theo ngũ hành
  getElementEmoji(element) {
    const elementEmojis = {
      'kim': '⚔️',
      'moc': '🌳',
      'thuy': '💧',
      'hoa': '🔥',
      'tho': '🏔️'
    };
    return elementEmojis[element] || '❓';
  },

  // Lấy tên hiển thị cho ngũ hành
  getElementDisplayName(element) {
    const elementNames = {
      'kim': 'Kim (Kim Loại)',
      'moc': 'Mộc (Gỗ)',
      'thuy': 'Thủy (Nước)',
      'hoa': 'Hỏa (Lửa)',
      'tho': 'Thổ (Đất)'
    };
    return elementNames[element] || element;
  },

  // Lấy tên hiển thị cho loại vũ khí
  getWeaponTypeDisplayName(type) {
    const typeNames = {
      'sword': 'Kiếm',
      'spear': 'Thương',
      'staff': 'Trượng',
      'fan': 'Quạt',
      'bow': 'Cung',
      'double_sword': 'Song Kiếm',
      'broadsword': 'Đao',
      'fist': 'Quyền',
      'mace': 'Chùy',
      'axe': 'Rìu'
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

    // Nếu không có args, hiển thị thông tin lò rèn và các button
    if (!args || args.length === 0) {
      await this.showForgeInfo(interaction, userId);
      return;
    }

    // Nếu có args, thực hiện chế tạo vũ khí
    const weaponId = args[0];

    // Kiểm tra cooldown
    const player = playerManager.getPlayer(userId);
    const cooldownCheck = cooldownManager.checkCooldown(player, 'forge', this.cooldown);
    if (cooldownCheck.isOnCooldown) {
      const cooldownEmbed = cooldownManager.createCooldownEmbed('forge', cooldownCheck.remainingText);
      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    await this.craftWeapon(interaction, userId, username, weaponId);
  },

  // Hiển thị thông tin lò rèn và các button
  async showForgeInfo(interaction, userId) {
    const player = playerManager.getPlayer(userId);
    const forgeLevel = player.forge?.forgeLevel || 1;
    const totalCrafted = player.forge?.totalCrafted || 0;
    const successCount = player.forge?.successCount || 0;
    const failureCount = player.forge?.failureCount || 0;
    const successRate = totalCrafted > 0 ? Math.round((successCount / totalCrafted) * 100) : 0;

    const embed = new EmbedBuilder()
      .setColor('#8B4513')
      .setTitle('⚒️ **Thông Tin Lò Rèn**')
      .setDescription(`${this.createSeparator()}\n**Thông tin chi tiết về lò rèn của bạn**`)
      .addFields(
        {
          name: '🔥 **Level Lò Rèn**',
          value: `**${forgeLevel}** (Tỉ lệ thành công: **${65 + (forgeLevel - 1) * 5}%**)`,
          inline: true
        },
        {
          name: '📊 **Thống Kê Chế Tạo**',
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
        name: '⚔️ **Chọn Ngũ Hành Vũ Khí**',
        value: 'Nhấn vào các button bên dưới để xem danh sách vũ khí theo ngũ hành',
        inline: false
      })
      .setFooter({ text: 'Sử dụng fforge <id_vu_khi> để chế tạo vũ khí cụ thể' })
      .setTimestamp();

    // Tạo các button theo ngũ hành
    const buttons = [
      new ButtonBuilder()
        .setCustomId('forge_element_kim')
        .setLabel('⚔️ Kim (Kim Loại)')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('forge_element_moc')
        .setLabel('🌳 Mộc (Gỗ)')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('forge_element_thuy')
        .setLabel('💧 Thủy (Nước)')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('forge_element_hoa')
        .setLabel('🔥 Hỏa (Lửa)')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('forge_element_tho')
        .setLabel('🏔️ Thổ (Đất)')
        .setStyle(ButtonStyle.Secondary)
    ];

    const buttonRow = new ActionRowBuilder().addComponents(buttons);

    // Button thông tin lò rèn
    const infoButton = new ButtonBuilder()
      .setCustomId('forge_forge_info')
      .setLabel('⚒️ Thông Tin Lò Rèn')
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

    if (customId === 'forge_back_main') {
      await this.showForgeInfo(interaction, userId);
    } else if (customId === 'forge_forge_info') {
      await this.showDetailedForgeInfo(interaction);
    } else if (customId.startsWith('forge_element_')) {
      const element = customId.replace('forge_element_', '');
      await this.showWeaponsByElement(interaction, element, userId);
    }
  },

  // Xử lý select menu interactions
  async handleSelectMenu(interaction) {
    try {
      const { customId, values } = interaction;
      const userId = interaction.user.id;

      if (customId === 'forge_select_weapon') {
        const selectedWeaponId = values[0];
        if (!selectedWeaponId) {
          await interaction.reply({
            content: '❌ Không có vũ khí nào được chọn!',
            ephemeral: true
          });
          return;
        }

        // Hiển thị chọn số lượng cần chế tạo
        await this.showQuantitySelect(interaction, userId, selectedWeaponId);
        return;
      } else if (customId.startsWith('forge_select_qty:')) {
        const selectedWeaponId = customId.split(':')[1];
        const qtyValue = values[0];
        const player = playerManager.getPlayer(userId);
        const weapon = itemLoader.items[selectedWeaponId];

        if (!weapon) {
          await interaction.reply({ content: '❌ Không tìm thấy vũ khí!', ephemeral: true });
          return;
        }

        const maxCraft = this.getMaxCraftable(player, weapon);
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
          await this.craftSelectedWeapon(interaction, selectedWeaponId, userId);
        } else {
          await this.craftSelectedWeaponBatch(interaction, selectedWeaponId, userId, quantity);
        }
        return;
      }
    } catch (error) {
      console.error('❌ Error in handleSelectMenu:', error);
      await interaction.reply({
        content: '❌ Có lỗi xảy ra khi xử lý select menu!',
        ephemeral: true
      });
    }
  },

  // Hiển thị vũ khí theo ngũ hành
  async showWeaponsByElement(interaction, element, userId) {
    // Load items nếu chưa load
    await itemLoader.loadAllItems();

    const weapons = Object.values(itemLoader.items).filter(item =>
      item.type && item.element === element && item.crafting // Chỉ lấy items có type, element và crafting (vũ khí)
    );

    if (weapons.length === 0) {
      const noWeaponsEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ **Không Có Vũ Khí**')
        .setDescription(`Không tìm thấy vũ khí ngũ hành **${this.getElementDisplayName(element)}**!`)
        .setFooter({ text: 'Quay lại menu chính' })
        .setTimestamp();

      const backButton = new ButtonBuilder()
        .setCustomId('forge_back_main')
        .setLabel('🔙 Quay Lại')
        .setStyle(ButtonStyle.Secondary);

      const backRow = new ActionRowBuilder().addComponents(backButton);

      await interaction.update({
        embeds: [noWeaponsEmbed],
        components: [backRow]
      });
      return;
    }

    // Lấy thông tin player để kiểm tra số lượng nguyên liệu
    const player = playerManager.getPlayer(userId);

    // Nhóm theo rarity
    const weaponsByRarity = {};
    weapons.forEach(weapon => {
      const rarity = weapon.rarity || 'common';
      if (!weaponsByRarity[rarity]) {
        weaponsByRarity[rarity] = [];
      }
      weaponsByRarity[rarity].push(weapon);
    });

    const elementEmoji = this.getElementEmoji(element);
    const elementName = this.getElementDisplayName(element);

    const embed = new EmbedBuilder()
      .setColor(this.getRarityColor(element === 'kim' ? 'rare' : 'epic'))
      .setTitle(`${elementEmoji} **Vũ Khí ${elementName}**`)
      .setDescription(`${this.createSeparator()}\n**Danh sách vũ khí ngũ hành ${elementName}**\n\n💡 **Sử dụng**: \`fforge <id_vu_khi>\` để chế tạo vũ khí`);

    // Hiển thị theo rarity từ thấp đến cao
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

    rarityOrder.forEach(rarity => {
      if (weaponsByRarity[rarity] && weaponsByRarity[rarity].length > 0) {
        const weaponsList = weaponsByRarity[rarity];
        const rarityEmoji = this.getRarityEmoji(rarity);
        const rarityName = this.getRarityDisplayName(rarity);

        // Chia nhỏ danh sách để tránh vượt quá 1024 ký tự
        const maxItemsPerField = 3;
        const chunks = this.chunkArray(weaponsList, maxItemsPerField);

        chunks.forEach((chunk, index) => {
          const weaponsListFormatted = chunk.map(weapon => {
            // Hiển thị nguyên liệu với số lượng available (rút gọn)
            const materials = Object.entries(weapon.crafting || {}).map(([id, qty]) => {
              const materialInfo = itemLoader.getItemInfo(id);
              const playerMaterial = player.inventory.items.find(item => item.id === id);
              const availableQty = playerMaterial ? playerMaterial.quantity : 0;
              const materialName = materialInfo ? materialInfo.name : id;
              const materialEmoji = materialInfo ? materialInfo.emoji : '❓';

              return `${materialEmoji} **${materialName}** x${qty} (còn: ${availableQty})`;
            }).join(', ');

            // Thêm icon rarity vào trước tên vũ khí
            const rarityEmoji = this.getRarityEmoji(weapon.rarity || 'common');
            const weaponTypeName = this.getWeaponTypeDisplayName(weapon.type);

            return `${rarityEmoji} **${weapon.name}** (${weaponTypeName})\n└ **Nguyên liệu**: ${materials}`;
          }).join('\n\n');

          const fieldName = '\u200B'; // zero-width space để tránh lỗi tên field rỗng

          embed.addFields({
            name: fieldName,
            value: weaponsListFormatted,
            inline: false
          });
        });
      }
    });

    // Tạo button quay lại
    const backButton = new ButtonBuilder()
      .setCustomId('forge_back_main')
      .setLabel('🔙 Quay Lại')
      .setStyle(ButtonStyle.Secondary);

    // Tạo select menu để chọn vũ khí
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('forge_select_weapon')
      .setPlaceholder('Chọn vũ khí để chế tạo...');

    // Thêm từng option một cách riêng biệt
    weapons.forEach(weapon => {
      const rarityEmoji = this.getRarityEmoji(weapon.rarity || 'common');
      const weaponId = Object.keys(itemLoader.items).find(key => itemLoader.items[key] === weapon);

      if (weaponId) {
        selectMenu.addOptions({
          label: `${rarityEmoji} ${weapon.name}`,
          description: `ID: ${weaponId}`,
          value: weaponId
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

  // Hiển thị thông tin chi tiết lò rèn
  async showDetailedForgeInfo(interaction) {
    const userId = interaction.user.id;
    const player = playerManager.getPlayer(userId);
    const forgeLevel = player.forge?.forgeLevel || 1;
    const totalCrafted = player.forge?.totalCrafted || 0;
    const successCount = player.forge?.successCount || 0;
    const failureCount = player.forge?.failureCount || 0;
    const successRate = totalCrafted > 0 ? Math.round((successCount / totalCrafted) * 100) : 0;

    const baseSuccessRate = 65;
    const levelBonus = (forgeLevel - 1) * 5;
    const currentSuccessRate = Math.min(baseSuccessRate + levelBonus, 95);

    const embed = new EmbedBuilder()
      .setColor('#FF8C00')
      .setTitle('⚒️ **Thông Tin Chi Tiết Lò Rèn**')
      .setDescription(`${this.createSeparator()}\n**Thông tin chi tiết về lò rèn và hệ thống chế tạo vũ khí**`)
      .addFields(
        {
          name: '🔥 **Thông Số Lò Rèn**',
          value: `**Level hiện tại**: ${forgeLevel}\n**Tỉ lệ cơ bản**: ${baseSuccessRate}%\n**Bonus level**: +${levelBonus}%\n**Tỉ lệ hiện tại**: **${currentSuccessRate}%**`,
          inline: false
        },
        {
          name: '📊 **Thống Kê Chi Tiết**',
          value: `**Tổng số lần chế tạo**: ${totalCrafted}\n**Thành công**: ${successCount} (${successRate}%)\n**Thất bại**: ${failureCount} (${100 - successRate}%)\n**Lần chế tạo gần nhất**: ${totalCrafted > 0 ? 'Đã chế tạo' : 'Chưa chế tạo'}`,
          inline: false
        },
        {
          name: '📈 **Bảng Tỉ Lệ Theo Level**',
          value: this.createForgeLevelTable(),
          inline: false
        },
        {
          name: '💡 **Gợi Ý Nâng Cấp**',
          value: 'Nâng cấp lò rèn sẽ tăng tỉ lệ thành công chế tạo vũ khí. Mỗi level tăng 5% tỉ lệ thành công, tối đa 95%.',
          inline: false
        }
      )
      .setFooter({ text: 'Sử dụng fforge để quay lại menu chính' })
      .setTimestamp();

    const backButton = new ButtonBuilder()
      .setCustomId('forge_back_main')
      .setLabel('🔙 Quay Lại')
      .setStyle(ButtonStyle.Secondary);

    const backRow = new ActionRowBuilder().addComponents(backButton);

    await interaction.update({
      embeds: [embed],
      components: [backRow]
    });
  },

  // Tạo bảng tỉ lệ theo level
  createForgeLevelTable() {
    let table = '```\n';
    table += 'Level | Tỉ Lệ | Ghi Chú\n';
    table += '------|--------|---------\n';

    for (let level = 1; level <= 10; level++) {
      const baseRate = 65;
      const bonus = (level - 1) * 5;
      const totalRate = Math.min(baseRate + bonus, 95);
      const note = level === 1 ? 'Mặc định' : `+${bonus}%`;

      table += `${level.toString().padStart(4)} | ${totalRate.toString().padStart(6)}% | ${note}\n`;
    }

    table += '```';
    return table;
  },

  // Hàm chia nhỏ array
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

  // Lấy tên hiển thị cho rarity
  getRarityDisplayName(rarity) {
    const displayNames = {
      'common': 'Thường',
      'uncommon': 'Hiếm',
      'rare': 'Quý Hiếm',
      'epic': 'Cực Quý',
      'legendary': 'Huyền Thoại'
    };
    return displayNames[rarity] || rarity;
  },

  // Thực hiện chế tạo vũ khí
  async craftWeapon(interaction, userId, username, weaponId) {
    const player = playerManager.getPlayer(userId);
    const now = Date.now();

    // Load items nếu chưa load
    await itemLoader.loadAllItems();

    // Tìm vũ khí cần chế tạo
    const weaponInfo = itemLoader.getItemInfo(weaponId);
    if (!weaponInfo || !weaponInfo.type) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ **Lỗi Chế Tạo Vũ Khí**')
        .setDescription('Không tìm thấy vũ khí cần chế tạo hoặc ID không hợp lệ!')
        .addFields({
          name: '💡 Gợi ý',
          value: 'Sử dụng `fforge` để xem danh sách vũ khí có thể chế tạo',
          inline: false
        });

      await interaction.reply({ embeds: [errorEmbed] });
      return;
    }

    // Kiểm tra materials cần thiết
    const craftingMaterials = weaponInfo.crafting || {};
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
        .setTitle('⚠️ **Thiếu Nguyên Liệu Chế Tạo**')
        .setDescription(`**${username}** không đủ nguyên liệu để chế tạo **${weaponInfo.name}**!`)
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
          value: 'Sử dụng `fhunt` để săn yêu thú lấy da thú, `fmine` để khai thác khoáng thạch',
          inline: false
        });

      await interaction.reply({ embeds: [missingEmbed] });
      return;
    }

    // Tính toán tỉ lệ thành công dựa trên level lò rèn
    const forgeLevel = player.forge?.forgeLevel || 1;
    const baseSuccessRate = 65; // 65% cơ bản
    const levelBonus = (forgeLevel - 1) * 5; // Mỗi level tăng 5%
    const maxSuccessRate = 95; // Tối đa 95%
    const successRate = Math.min(baseSuccessRate + levelBonus, maxSuccessRate);

    // Thực hiện chế tạo vũ khí
    const isSuccess = Math.random() * 100 < successRate;

    if (isSuccess) {
      // Chế tạo vũ khí thành công
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

      // Thêm vũ khí vào inventory
      const existingWeapon = player.inventory.weapons.find(item => item.id === weaponId);
      if (existingWeapon) {
        existingWeapon.quantity += 1;
      } else {
        player.inventory.weapons.push({
          id: weaponId,
          quantity: 1
        });
      }

      // Cập nhật thống kê chế tạo
      if (!player.forge) player.forge = {};
      player.forge.totalCrafted = (player.forge.totalCrafted || 0) + 1;
      player.forge.successCount = (player.forge.successCount || 0) + 1;
      player.forge.lastForge = now;

      // Cập nhật player
      const updateData = {
        'forge.lastForge': now,
        'forge.totalCrafted': player.forge.totalCrafted,
        'forge.successCount': player.forge.successCount
      };
      playerManager.savePlayers();

      // Tạo embed thông báo thành công
      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🎉 **Chế Tạo Vũ Khí Thành Công!**')
        .setDescription(`${this.createSeparator()}\n**${username}** đã chế tạo thành công **${weaponInfo.name}**!`)
        .addFields(
          {
            name: '⚔️ **Vũ Khí Thu Được**',
            value: `${weaponInfo.emoji} **${weaponInfo.name}** ${this.getRarityEmoji(weaponInfo.rarity)}`,
            inline: false
          },
          {
            name: '🔥 **Level Lò Rèn**',
            value: `**${forgeLevel}** (Tỉ lệ thành công: **${successRate}%**)`,
            inline: true
          },
          {
            name: '🌊 **Ngũ Hành**',
            value: `${this.getElementEmoji(weaponInfo.element)} **${this.getElementDisplayName(weaponInfo.element)}**`,
            inline: true
          },
          {
            name: '🗡️ **Loại Vũ Khí**',
            value: `**${this.getWeaponTypeDisplayName(weaponInfo.type)}**`,
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
        .setFooter({ text: cooldownManager.cooldownMessages.forge })
        .setTimestamp();

      await interaction.reply({ embeds: [successEmbed] });

    } else {
      // Chế tạo vũ khí thất bại
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

      // Cập nhật thống kê chế tạo
      if (!player.forge) player.forge = {};
      player.forge.totalCrafted = (player.forge.totalCrafted || 0) + 1;
      player.forge.failureCount = (player.forge.failureCount || 0) + 1;
      player.forge.lastForge = now;

      // Cập nhật player
      const updateData = {
        'forge.lastForge': now,
        'forge.totalCrafted': player.forge.totalCrafted,
        'forge.failureCount': player.forge.failureCount
      };
      playerManager.savePlayers();

      // Tạo embed thông báo thất bại
      const failureEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('💥 **Chế Tạo Vũ Khí Thất Bại!**')
        .setDescription(`${this.createSeparator()}\n**${username}** đã thất bại khi chế tạo **${weaponInfo.name}**!`)
        .addFields(
          {
            name: '🔥 **Level Lò Rèn**',
            value: `**${forgeLevel}** (Tỉ lệ thành công: **${successRate}%**)`,
            inline: true
          },
          {
            name: '💔 **Hậu Quả**',
            value: 'Nguyên liệu đã bị mất do chế tạo thất bại!',
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
          value: 'Nâng cấp lò rèn để tăng tỉ lệ thành công!',
          inline: false
        })
        .setFooter({ text: cooldownManager.cooldownMessages.forge })
        .setTimestamp();

      await interaction.reply({ embeds: [failureEmbed] });
    }
  },

  // Chế tạo vũ khí được chọn
  async craftSelectedWeapon(interaction, weaponId, userId) {
    // Load items nếu chưa load
    await itemLoader.loadAllItems();

    const weapon = itemLoader.items[weaponId];
    if (!weapon) {
      await interaction.reply({ content: '❌ Không tìm thấy vũ khí!', ephemeral: true });
      return;
    }

    const player = playerManager.getPlayer(userId);
    if (!player) {
      await interaction.reply({ content: '❌ Không tìm thấy thông tin người chơi!', ephemeral: true });
      return;
    }

    // Kiểm tra materials
    const missingMaterials = [];
    for (const [materialId, requiredQty] of Object.entries(weapon.crafting || {})) {
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

    // Tính tỉ lệ thành công dựa trên level lò rèn
    const forgeLevel = player.forge?.forgeLevel || 1;
    const baseSuccessRate = 0.65; // 65% cơ bản
    const levelBonus = (forgeLevel - 1) * 0.05; // +5% mỗi level
    const successRate = Math.min(baseSuccessRate + levelBonus, 0.95); // Tối đa 95%

    // Thực hiện chế tạo vũ khí
    const isSuccess = Math.random() < successRate;

    if (isSuccess) {
      // Thành công: thêm vũ khí vào inventory
      const existingWeapon = player.inventory.weapons.find(item => item.id === weaponId);
      if (existingWeapon) {
        existingWeapon.quantity += 1;
      } else {
        player.inventory.weapons.push({
          id: weaponId,
          quantity: 1
        });
      }

      // Cập nhật thống kê forge
      if (!player.forge) player.forge = { forgeLevel: 1, totalCrafted: 0, successCount: 0, failureCount: 0, lastForge: 0 };
      player.forge.totalCrafted++;
      player.forge.successCount++;
      player.forge.lastForge = Date.now();

      // Tiêu thụ nguyên liệu
      for (const [materialId, requiredQty] of Object.entries(weapon.crafting || {})) {
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
        .setTitle('⚒️ Chế Tạo Vũ Khí Thành Công!')
        .setDescription(`**${weapon.name}** đã được chế tạo thành công!`)
        .addFields(
          { name: '🎯 Tỉ lệ thành công', value: `${(successRate * 100).toFixed(1)}%`, inline: true },
          { name: '🔥 Level lò rèn', value: `${forgeLevel}`, inline: true },
          { name: '📊 Thống kê', value: `Tổng: ${player.forge.totalCrafted} | Thành công: ${player.forge.successCount} | Thất bại: ${player.forge.failureCount}`, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [successEmbed] });
    } else {
      // Thất bại: mất nguyên liệu
      for (const [materialId, requiredQty] of Object.entries(weapon.crafting || {})) {
        const playerMaterial = player.inventory.items.find(item => item.id === materialId);
        if (playerMaterial) {
          playerMaterial.quantity -= requiredQty;
          if (playerMaterial.quantity <= 0) {
            player.inventory.items = player.inventory.items.filter(item => item.id !== materialId);
          }
        }
      }

      // Cập nhật thống kê forge
      if (!player.forge) player.forge = { forgeLevel: 1, totalCrafted: 0, successCount: 0, failureCount: 0, lastForge: 0 };
      player.forge.totalCrafted++;
      player.forge.failureCount++;
      player.forge.lastForge = Date.now();

      // Lưu player data
      playerManager.savePlayers();

      // Tạo embed thông báo thất bại
      const failureEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('💥 Chế Tạo Vũ Khí Thất Bại!')
        .setDescription(`**${weapon.name}** chế tạo thất bại! Nguyên liệu đã bị mất.`)
        .addFields(
          { name: '🎯 Tỉ lệ thành công', value: `${(successRate * 100).toFixed(1)}%`, inline: true },
          { name: '🔥 Level lò rèn', value: `${forgeLevel}`, inline: true },
          { name: '💡 Gợi ý', value: 'Nâng cấp lò rèn để tăng tỉ lệ thành công!', inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [failureEmbed] });
    }
  },

  // Chế tạo nhiều vũ khí trong một lần
  async craftSelectedWeaponBatch(interaction, weaponId, userId, quantity) {
    await itemLoader.loadAllItems();
    const weapon = itemLoader.items[weaponId];
    const player = playerManager.getPlayer(userId);
    if (!weapon || !player) {
      await interaction.reply({ content: '❌ Không tìm thấy dữ liệu cần thiết!', ephemeral: true });
      return;
    }

    const forgeLevel = player.forge?.forgeLevel || 1;
    const baseSuccessRate = 0.65;
    const levelBonus = (forgeLevel - 1) * 0.05;
    const successRate = Math.min(baseSuccessRate + levelBonus, 0.95);

    let successCount = 0;
    let failureCount = 0;
    let crafted = 0;

    for (let i = 0; i < quantity; i++) {
      // Kiểm tra đủ nguyên liệu cho 1 lần
      const canCraft = Object.entries(weapon.crafting || {}).every(([matId, req]) => {
        const have = player.inventory.items.find(it => it.id === matId)?.quantity || 0;
        return have >= req;
      });
      if (!canCraft) break;

      // Trừ nguyên liệu cho 1 lần
      for (const [matId, req] of Object.entries(weapon.crafting || {})) {
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
        const existingWeapon = player.inventory.weapons.find(item => item.id === weaponId);
        if (existingWeapon) {
          existingWeapon.quantity += 1;
        } else {
          player.inventory.weapons.push({
            id: weaponId,
            quantity: 1
          });
        }
        successCount++;
      } else {
        failureCount++;
      }
    }

    // Cập nhật thống kê forge
    if (!player.forge) player.forge = { forgeLevel: 1, totalCrafted: 0, successCount: 0, failureCount: 0, lastForge: 0 };
    player.forge.totalCrafted += crafted;
    player.forge.successCount += successCount;
    player.forge.failureCount += failureCount;
    player.forge.lastForge = Date.now();

    playerManager.savePlayers();

    const resultEmbed = new EmbedBuilder()
      .setColor(successCount > 0 ? 0x00FF88 : 0xFF5555)
      .setTitle('⚒️ Kết Quả Chế Tạo Vũ Khí')
      .setDescription(`**${weapon.name}** — Số lượng yêu cầu: **${quantity}**`)
      .addFields(
        { name: '✅ Thành công', value: `${successCount}`, inline: true },
        { name: '❌ Thất bại', value: `${failureCount}`, inline: true },
        { name: '🔥 Level lò rèn', value: `${forgeLevel} (tỉ lệ: ${(successRate * 100).toFixed(1)}%)`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [resultEmbed] });
  },

  // Hiển thị select số lượng cần chế tạo
  async showQuantitySelect(interaction, userId, weaponId) {
    await itemLoader.loadAllItems();
    const player = playerManager.getPlayer(userId);
    const weapon = itemLoader.items[weaponId];
    if (!weapon) {
      await interaction.reply({ content: '❌ Không tìm thấy vũ khí!', ephemeral: true });
      return;
    }

    const maxCraft = this.getMaxCraftable(player, weapon);
    if (maxCraft < 1) {
      await interaction.reply({ content: '⚠️ Đạo hữu không đủ nguyên liệu chế tạo', ephemeral: true });
      return;
    }

    const materialsLine = Object.entries(weapon.crafting || {}).map(([id, qty]) => {
      const info = itemLoader.getItemInfo(id);
      const have = player.inventory.items.find(i => i.id === id)?.quantity || 0;
      const emoji = info?.emoji || '❓';
      const name = info?.name || id;
      return `${emoji} ${name} x${qty} (còn: ${have})`;
    }).join(', ');

    const embed = new EmbedBuilder()
      .setColor('#8B4513')
      .setTitle(`⚒️ Chọn Số Lượng - ${weapon.name}`)
      .setDescription(`${this.createSeparator()}\nChọn số lượng cần chế tạo.\n\nNguyên liệu mỗi vũ khí: ${materialsLine}\nTối đa có thể chế tạo: **${maxCraft}**`)
      .setTimestamp();

    const qtySelect = new StringSelectMenuBuilder()
      .setCustomId(`forge_select_qty:${weaponId}`)
      .setPlaceholder('Chọn số lượng...')
      .addOptions([
        { label: '1', value: '1', description: 'Chế tạo 1 vũ khí' },
        { label: '5', value: '5', description: 'Chế tạo 5 vũ khí' },
        { label: '10', value: '10', description: 'Chế tạo 10 vũ khí' },
        { label: `Tối đa (${maxCraft})`, value: 'max', description: 'Chế tạo tối đa theo nguyên liệu hiện có' }
      ]);

    const backButton = new ButtonBuilder()
      .setCustomId('forge_back_main')
      .setLabel('🔙 Quay Lại')
      .setStyle(ButtonStyle.Secondary);

    const selectRow = new ActionRowBuilder().addComponents(qtySelect);
    const backRow = new ActionRowBuilder().addComponents(backButton);

    await interaction.update({ embeds: [embed], components: [selectRow, backRow] });
  },

  // Tính số lượng tối đa có thể chế tạo
  getMaxCraftable(player, weapon) {
    let maxCraft = Infinity;
    for (const [materialId, reqQty] of Object.entries(weapon.crafting || {})) {
      const have = player.inventory.items.find(i => i.id === materialId)?.quantity || 0;
      const possible = Math.floor(have / reqQty);
      if (possible < maxCraft) maxCraft = possible;
    }
    if (!isFinite(maxCraft)) return 0;
    return Math.max(0, maxCraft);
  }
};