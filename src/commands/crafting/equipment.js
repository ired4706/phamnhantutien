const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const playerManager = require('../../systems/player.js');

module.exports = {
  name: 'equipment',
  aliases: ['eq', 'trangbi', 'gear'],
  description: 'Xem và quản lý trang bị của bạn',

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const player = await playerManager.getPlayer(userId);

      if (!player) {
        return await interaction.reply({
          content: '❌ Bạn chưa có nhân vật! Hãy sử dụng `/start` để tạo nhân vật.',
          ephemeral: true
        });
      }

      // Khởi tạo equipment nếu chưa có
      if (!player.equipment) {
        player.equipment = {
          weapon: null,
          armor: null,
          pants: null,
          shoes: null,
          ring: null,
          pendant: null,
          artifact: null
        };
        playerManager.savePlayers();
      }

      const mainEmbed = await this.createMainEquipmentEmbed(player);
      const row = this.createEquipmentButtons();

      await interaction.reply({
        embeds: [mainEmbed],
        components: [row]
      });

    } catch (error) {
      console.error('Error in equipment command:', error);
      await interaction.reply({
        content: '❌ Có lỗi xảy ra khi xem trang bị!',
        ephemeral: true
      });
    }
  },

  // Xử lý button interactions cho trang bị
  async handleButton(interaction) {
    try {
      const userId = interaction.user.id;
      const player = await playerManager.getPlayer(userId);
      if (!player) {
        await interaction.reply({ content: '❌ Không tìm thấy người chơi!', ephemeral: true });
        return;
      }

      const { customId } = interaction;
      if (customId === 'equip_item') {
        await this.showEquipWeaponMenu(interaction, player);
        return;
      }
      if (customId.startsWith('equip_weapon_select:')) {
        const uid = customId.split(':')[1];
        await this.equipWeaponByUid(interaction, player, uid);
        return;
      }
    } catch (e) {
      console.error('equipment.handleButton error', e);
      try { await interaction.reply({ content: '❌ Lỗi xử lý trang bị!', ephemeral: true }); } catch { }
    }
  },

  // Hiển thị danh sách vũ khí để trang bị
  async showEquipWeaponMenu(interaction, player) {
    const itemLoader = require('../../utils/data/item-loader.js');
    await itemLoader.loadAllItems();
    const weapons = Array.isArray(player.inventory?.weapons) ? player.inventory.weapons : [];
    if (weapons.length === 0) {
      await interaction.reply({ content: '⚠️ Bạn không có vũ khí nào trong kho!', ephemeral: true });
      return;
    }

    const list = weapons.slice(0, 25).map(w => {
      const info = itemLoader.getItemInfo(w.id);
      return `• ${info?.emoji || '🗡️'} ${info?.name || w.id} — UID: \
\`${w.uid}\``;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle('🗡️ Chọn Vũ Khí Để Trang Bị')
      .setDescription(list || '—');

    // Tạo hàng nút chọn cho 5 vũ khí đầu tiên (tránh quá nhiều nút)
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const row = new ActionRowBuilder();
    weapons.slice(0, 5).forEach((w, idx) => {
      const info = itemLoader.getItemInfo(w.id);
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`equip_weapon_select:${w.uid}`)
          .setLabel(`${idx + 1}. ${info?.name || w.id}`)
          .setStyle(ButtonStyle.Primary)
      );
    });

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },

  // Trang bị vũ khí theo UID và áp dụng chỉ số vào player.stats
  async equipWeaponByUid(interaction, player, uid) {
    const itemLoader = require('../../utils/data/item-loader.js');
    await itemLoader.loadAllItems();

    const inv = Array.isArray(player.inventory?.weapons) ? player.inventory.weapons : [];
    const weapon = inv.find(w => w.uid === uid);
    if (!weapon) {
      await interaction.reply({ content: '❌ Không tìm thấy vũ khí với UID này!', ephemeral: true });
      return;
    }

    // Khởi tạo equipment nếu chưa có
    if (!player.equipment) {
      player.equipment = { weapon: null, armor: null, accessory: null, shoes: null, artifact: null, special: null };
    }

    // Gỡ chỉ số vũ khí cũ nếu có
    if (player.equipment.weapon) {
      if (player.equipment.weapon._appliedCombatBonuses) {
        this.applyCombatBonusesToPlayer(player, player.equipment.weapon._appliedCombatBonuses, { remove: true });
      }
      // Gỡ passives của vũ khí cũ
      await this.applyEquipmentPassivesToPlayer(player, player.equipment.weapon, { remove: true });
    }

    // Trang bị mới
    player.equipment.weapon = weapon;

    // Tính contribution combat từ bonuses core (post-scale mapping)
    const applied = this.computeWeaponCombatBonuses(player, weapon);
    // Lưu lại để về sau gỡ đúng
    player.equipment.weapon._appliedCombatBonuses = applied;
    // Áp dụng vào player.stats
    this.applyCombatBonusesToPlayer(player, applied, { remove: false });
    // Áp dụng passives của vũ khí mới
    await this.applyEquipmentPassivesToPlayer(player, weapon, { remove: false });

    // Update set bonus (in case armor/pants/shoes changed)
    this.updateSetBonus(player);

    // Lưu dữ liệu vào playerManager
    playerManager.savePlayers();

    // Đồng bộ với PlayerService cache - cập nhật toàn bộ player object
    try {
      const { getContainer } = require('../../container/ServiceContainer');
      const container = getContainer();
      const playerService = container.get('playerService');
      // Cập nhật toàn bộ player object trong playerService.players Map
      const playerId = player.userId || player.id;
      playerService.players.set(playerId, JSON.parse(JSON.stringify(player)));
      // Lưu vào file
      await playerService.savePlayers();
    } catch (e) {
      console.warn('Sync to PlayerService failed (non-fatal):', e?.message || e);
    }

    // Phản hồi
    const info = itemLoader.getItemInfo(weapon.id);
    const msg = `✅ Đã trang bị vũ khí: ${info?.emoji || '🗡️'} ${info?.name || weapon.id}\n` +
      `Chỉ số đã được cập nhật.`;
    await interaction.reply({ content: msg, ephemeral: true });
  },

  // Trang bị armor/pants/shoes theo UID và áp dụng chỉ số vào player.stats
  async equipEquipmentByUid(interaction, player, uid, slotType) {
    const itemLoader = require('../../utils/data/item-loader.js');
    await itemLoader.loadAllItems();

    const inv = Array.isArray(player.inventory?.armors) ? player.inventory.armors : [];
    const equipment = inv.find(e => e.uid === uid);
    if (!equipment) {
      await interaction.reply({ content: `❌ Không tìm thấy trang bị với UID này!`, ephemeral: true });
      return;
    }

    const itemInfo = itemLoader.getItemInfo(equipment.id);
    if (!itemInfo) {
      await interaction.reply({ content: '❌ Không tìm thấy thông tin trang bị!', ephemeral: true });
      return;
    }

    // Kiểm tra type có khớp với slot không
    const typeMap = {
      'armor': ['armor'],
      'pants': ['pants'],
      'shoes': ['shoes', 'boots'],
      'ring': ['ring'],
      'pendant': ['pendant']
    };
    const allowedTypes = typeMap[slotType] || [];
    if (!allowedTypes.includes(itemInfo.type)) {
      await interaction.reply({ content: `❌ Trang bị này không thể trang bị vào slot ${slotType}!`, ephemeral: true });
      return;
    }

    // Khởi tạo equipment nếu chưa có
    if (!player.equipment) {
      player.equipment = { weapon: null, armor: null, pants: null, shoes: null, ring: null, pendant: null, artifact: null };
    }

    // Gỡ chỉ số trang bị cũ nếu có
    const oldItem = player.equipment[slotType];
    if (oldItem) {
      if (oldItem._appliedCombatBonuses) {
        this.applyCombatBonusesToPlayer(player, oldItem._appliedCombatBonuses, { remove: true });
      }
      // Gỡ passives của trang bị cũ
      await this.applyEquipmentPassivesToPlayer(player, oldItem, { remove: true });
    }

    // Trang bị mới
    player.equipment[slotType] = equipment;

    // Tính contribution combat từ bonuses core
    const applied = this.computeEquipmentCombatBonuses(equipment);
    // Lưu lại để về sau gỡ đúng
    player.equipment[slotType]._appliedCombatBonuses = applied;
    // Áp dụng vào player.stats
    this.applyCombatBonusesToPlayer(player, applied, { remove: false });
    // Áp dụng passives của trang bị mới
    await this.applyEquipmentPassivesToPlayer(player, equipment, { remove: false });

    // Update set bonus (có thể đã thay đổi)
    this.updateSetBonus(player);

    // Lưu dữ liệu vào playerManager
    playerManager.savePlayers();

    // Đồng bộ với PlayerService cache - cập nhật toàn bộ player object
    try {
      const { getContainer } = require('../../container/ServiceContainer');
      const container = getContainer();
      const playerService = container.get('playerService');
      // Cập nhật toàn bộ player object trong playerService.players Map
      const playerId = player.userId || player.id;
      playerService.players.set(playerId, JSON.parse(JSON.stringify(player)));
      // Lưu vào file
      await playerService.savePlayers();
    } catch (e) {
      console.warn('Sync to PlayerService failed (non-fatal):', e?.message || e);
    }

    // Phản hồi
    const slotNames = {
      'armor': 'áo giáp',
      'pants': 'quần',
      'shoes': 'giày',
      'ring': 'nhẫn',
      'pendant': 'ngọc bội'
    };
    const slotName = slotNames[slotType] || slotType;
    const msg = `✅ Đã trang bị ${slotName}: ${itemInfo.emoji || '🛡️'} ${itemInfo.name}\n` +
      `Chỉ số đã được cập nhật.`;
    await interaction.reply({ content: msg, ephemeral: true });
  },

  // Tính đóng góp combat stats từ core stat bonuses của vũ khí
  computeWeaponCombatBonuses(player, weapon) {
    const bonuses = weapon.bonuses || {};
    const main = (bonuses.__main_stats && bonuses.__main_stats.STR) ? bonuses.__main_stats.STR : 0;
    const sub = {
      STR: bonuses.STR || 0,
      INT: bonuses.INT || 0,
      DEX: bonuses.DEX || 0,
      VIT: bonuses.VIT || 0,
      LUK: bonuses.LUK || 0
    };
    // Tổng core tăng thêm (post-scale nên coi là flat đóng góp vào combat theo hệ số quy đổi Bước 2)
    const STR = main + sub.STR;
    const INT = sub.INT;
    const DEX = sub.DEX;
    const VIT = sub.VIT;
    const LUK = sub.LUK;

    const delta = {
      attack: STR * 1.8 + INT * 0.6 + LUK * 0.3,
      defense: VIT * 2.0 + STR * 0.5,
      hp: VIT * 20 + STR * 5,
      mp: INT * 15 + LUK * 3,
      speed: DEX * 1.5 + LUK * 0.5,
      regen: INT * 0.4 + VIT * 0.2,
      critical: LUK * 0.4 + DEX * 0.2,
      evasion: DEX * 0.3 + LUK * 0.3,
      accuracy: DEX * 0.6,
      penetration: STR * 0.4 + INT * 0.2
    };
    return delta;
  },

  // Tính đóng góp combat stats từ core stat bonuses của armor/pants/shoes/ring/pendant
  computeEquipmentCombatBonuses(equipment) {
    const bonuses = equipment.bonuses || {};
    
    // Get main INT for ring/pendant (similar to main STR for weapons)
    const main = (bonuses.__main_stats && bonuses.__main_stats.INT) ? bonuses.__main_stats.INT : 0;
    
    const sub = {
      STR: bonuses.STR || 0,
      INT: bonuses.INT || 0,
      DEX: bonuses.DEX || 0,
      VIT: bonuses.VIT || 0,
      LUK: bonuses.LUK || 0
    };

    // Total core stats (main INT + sub stats for ring/pendant, or just sub stats for armor/pants/shoes)
    const STR = sub.STR;
    const INT = main + sub.INT; // Include main INT for ring/pendant
    const DEX = sub.DEX;
    const VIT = sub.VIT;
    const LUK = sub.LUK;

    const delta = {
      attack: STR * 1.8 + INT * 0.6 + LUK * 0.3,
      defense: VIT * 2.0 + STR * 0.5,
      hp: VIT * 20 + STR * 5,
      mp: INT * 15 + LUK * 3,
      speed: DEX * 1.5 + LUK * 0.5,
      regen: INT * 0.4 + VIT * 0.2,
      critical: LUK * 0.4 + DEX * 0.2,
      evasion: DEX * 0.3 + LUK * 0.3,
      accuracy: DEX * 0.6,
      penetration: STR * 0.4 + INT * 0.2
    };
    return delta;
  },

  // Áp dụng (hoặc gỡ) đóng góp combat vào player.stats
  applyCombatBonusesToPlayer(player, delta, { remove = false } = {}) {
    // Bảo đảm stats khởi tạo đầy đủ để hiển thị tại fstatus/fequipment
    if (!player.stats) player.stats = {};
    const s = player.stats;
    const sign = remove ? -1 : 1;
    const num = (v) => (isNaN(parseFloat(v)) ? 0 : parseFloat(v));
    player.stats.attack = num(s.attack) + sign * num(delta.attack);
    player.stats.defense = num(s.defense) + sign * num(delta.defense);
    player.stats.hp = num(s.hp) + sign * num(delta.hp);
    player.stats.maxHp = num(s.maxHp || s.hp) + sign * num(delta.hp);
    player.stats.mp = num(s.mp) + sign * num(delta.mp);
    player.stats.maxMp = num(s.maxMp || s.mp) + sign * num(delta.mp);
    player.stats.speed = num(s.speed) + sign * num(delta.speed);
    player.stats.regen = num(s.regen) + sign * num(delta.regen);
    player.stats.critical = num(s.critical) + sign * num(delta.critical);
    player.stats.evasion = num(s.evasion) + sign * num(delta.evasion);
    player.stats.accuracy = num(s.accuracy) + sign * num(delta.accuracy);
    player.stats.penetration = num(s.penetration) + sign * num(delta.penetration);
  },

  // Tính base stats (không có equipment) để apply percentage bonuses
  async getBaseStatsForPassives(player) {
    const StatsCalculator = require('../../utils/game/stats-calculator');
    const baseStats = await StatsCalculator.calculateBaseStats(
      player.spiritRoot,
      player.realm,
      player.realmLevel
    );
    return baseStats;
  },

  // Áp dụng (hoặc gỡ) equipment passives vào player.stats
  async applyEquipmentPassivesToPlayer(player, equipment, { remove = false } = {}) {
    if (!equipment || !equipment.bonuses) return;
    
    const passives = equipment.bonuses.__passives || [];
    if (!Array.isArray(passives) || passives.length === 0) return;

    // Tính base stats (không có equipment) để apply percentage bonuses
    const baseStats = await this.getBaseStatsForPassives(player);
    if (!baseStats) return;

    const sign = remove ? -1 : 1;
    const num = (v) => (isNaN(parseFloat(v)) ? 0 : parseFloat(v));

    // Apply từng passive
    for (const passive of passives) {
      if (!passive.effect || !passive.value) continue;

      const effect = passive.effect;
      const value = num(passive.value) / 100; // Convert percentage to decimal

      switch (effect) {
        case 'hp_bonus_pct':
          // Tăng % HP dựa trên base HP
          const hpBonus = baseStats.hp * value * sign;
          player.stats.hp = num(player.stats.hp) + hpBonus;
          player.stats.maxHp = num(player.stats.maxHp || player.stats.hp) + hpBonus;
          break;

        case 'def_bonus_pct':
          // Tăng % DEF dựa trên base DEF
          const defBonus = baseStats.defense * value * sign;
          player.stats.defense = num(player.stats.defense) + defBonus;
          break;

        case 'eva_bonus_pct':
          // Tăng % EVA dựa trên base EVA
          const evaBonus = baseStats.evasion * value * sign;
          player.stats.evasion = num(player.stats.evasion) + evaBonus;
          break;

        case 'speed_bonus_pct':
          // Tăng % SPD dựa trên base SPD
          const speedBonus = baseStats.speed * value * sign;
          player.stats.speed = num(player.stats.speed) + speedBonus;
          break;

        case 'acc_bonus_pct':
          // Tăng % ACC dựa trên base ACC
          const accBonus = baseStats.accuracy * value * sign;
          player.stats.accuracy = num(player.stats.accuracy) + accBonus;
          break;

        // Các passive khác (damage_reduction_pct, shield_per_turn_pct, elemental resistances, etc.)
        // sẽ được xử lý trong combat system, không apply vào player.stats ở đây
      }
    }
  },

  // Tạo embed chính hiển thị trang bị
  async createMainEquipmentEmbed(player) {
    // Đảm bảo itemLoader đã load items trước khi format
    const itemLoader = require('../../utils/data/item-loader.js');
    await itemLoader.loadAllItems();

    const embed = new EmbedBuilder()
      .setColor('#4CAF50')
      .setTitle('⚔️ **TRANG BỊ CỦA BẠN**')
      .setDescription(`${this.createSeparator()}\n**${player.username}** - ${this.formatRealmDisplay(player.realm, player.realmLevel)}`)
      .addFields(
        {
          name: '🗡️ **Vũ Khí**',
          value: await this.formatEquipmentSlot(player.equipment.weapon, 'weapon'),
          inline: true
        },
        {
          name: '🛡️ **Áo Giáp**',
          value: await this.formatEquipmentSlot(player.equipment.armor, 'armor'),
          inline: true
        },
        {
          name: '💍 **Nhẫn**',
          value: await this.formatEquipmentSlot(player.equipment.ring, 'ring'),
          inline: true
        },
        {
          name: '👟 **Giày**',
          value: await this.formatEquipmentSlot(player.equipment.shoes, 'shoes'),
          inline: true
        },
        {
          name: '👖 **Quần**',
          value: await this.formatEquipmentSlot(player.equipment.pants, 'pants'),
          inline: true
        },
        {
          name: '📿 **Ngọc Bội**',
          value: await this.formatEquipmentSlot(player.equipment.pendant, 'pendant'),
          inline: true
        },
        {
          name: '🔮 **Pháp Bảo**',
          value: await this.formatEquipmentSlot(player.equipment.artifact, 'artifact'),
          inline: true
        },
        {
          name: '❓ **Slot Đặc Biệt**',
          value: await this.formatEquipmentSlot(player.equipment.special, 'special'),
          inline: true
        }
      )
      .addFields(
        {
          name: '📊 **Tổng Chỉ Số**',
          value: this.calculateTotalStats(player),
          inline: false
        }
      );

    // Hiển thị passives và set bonus của các item đang trang bị
    const equipmentDetails = await this.getEquipmentDetails(player);
    if (equipmentDetails.passives.length > 0 || equipmentDetails.setBonuses.length > 0) {
      const detailsText = [];
      
      if (equipmentDetails.passives.length > 0) {
        detailsText.push('**✨ Passives:**\n' + equipmentDetails.passives.join('\n'));
      }
      
      if (equipmentDetails.setBonuses.length > 0) {
        detailsText.push('**🎯 Set Bonuses:**\n' + equipmentDetails.setBonuses.join('\n'));
      }
      
      if (detailsText.length > 0) {
        embed.addFields({
          name: '💎 **Chi Tiết Trang Bị**',
          value: detailsText.join('\n\n'),
          inline: false
        });
      }
    }

    embed.setFooter({ text: 'Sử dụng các nút bên dưới để quản lý trang bị' })
      .setTimestamp();

    return embed;
  },

  // Lấy chi tiết passives và set bonus từ các item đang trang bị
  async getEquipmentDetails(player) {
    const passives = [];
    const setBonuses = [];
    const itemLoader = require('../../utils/data/item-loader.js');
    const craftModule = require('./craft.js');

    if (!player.equipment) return { passives, setBonuses };

    // Đảm bảo itemLoader đã load
    await itemLoader.loadAllItems();

    const slots = ['weapon', 'armor', 'pants', 'shoes', 'ring', 'pendant', 'artifact'];
    
    slots.forEach(slot => {
      const item = player.equipment[slot];
      if (!item) return;

      const itemInfo = itemLoader.getItemInfo(item.id);
      if (!itemInfo) return;

      // Lấy passives từ bonuses.__passives hoặc item.passives
      const itemPassives = item.bonuses?.__passives || item.passives || [];
      if (Array.isArray(itemPassives) && itemPassives.length > 0) {
        const slotName = this.getSlotDisplayName(slot);
        itemPassives.forEach(p => {
          // Với weapon passives, cần lấy name và description từ id/type
          const passiveInfo = this.getPassiveNameAndDescription(p, slot);
          const name = passiveInfo.name;
          const desc = passiveInfo.description;
          passives.push(`• **${slotName}**: ${name} - ${desc}`);
        });
      }

      // Lấy set bonus nếu có
      if (item.bonuses?.__set_id && item.bonuses?.__set_type) {
        const setType = item.bonuses.__set_type;
        const rarity = itemInfo.rarity;
        const setBonusConfig = craftModule.getSetBonusConfig(setType, rarity);
        
        if (setBonusConfig) {
          const slotName = this.getSlotDisplayName(slot);
          setBonuses.push(`• **${slotName}**: *${setBonusConfig.description}*`);
        }
      }
    });

    return { passives, setBonuses };
  },

  // Lấy tên hiển thị của slot
  getSlotDisplayName(slot) {
    const names = {
      'weapon': 'Vũ Khí',
      'armor': 'Áo Giáp',
      'pants': 'Quần',
      'shoes': 'Giày',
      'ring': 'Nhẫn',
      'pendant': 'Ngọc Bội',
      'artifact': 'Pháp Bảo'
    };
    return names[slot] || slot;
  },

  // Lấy tên và mô tả của passive (hỗ trợ weapon passives cũ chỉ có id/type)
  getPassiveNameAndDescription(passive, slot) {
    // Nếu passive đã có name và description, dùng luôn
    if (passive.name && passive.description) {
      return { name: passive.name, description: passive.description };
    }

    // Với weapon passives, cần map từ id/type sang name và description
    if (slot === 'weapon') {
      const passiveId = passive.id || '';
      
      // Map các passive ID sang name và description
      const passiveMap = {
        // Thiên passives
        'passive_thien_kim_kim_tram': {
          name: 'Kim Trảm',
          description: 'Sát thương vũ khí có luôn xuyên 6% DEF, 15% xuyên thêm 3% DEF trong lượt'
        },
        'passive_thien_moc_lac_diep': {
          name: 'Lạc Diệp',
          description: 'Mỗi 3 lượt gây sát thương 6% sát thương vũ khí'
        },
        'passive_thien_thuy_luu_anh': {
          name: 'Lưu Ảnh',
          description: 'Sát thương vũ khí có 12% giảm 10% SPD địch trong lượt kế tiếp'
        },
        'passive_thien_hoa_huyet_viem': {
          name: 'Huyết Viêm',
          description: 'Khi tấn công bằng vũ khí, gây thêm 4% sát thương dưới dạng đốt trong 2 lượt'
        },
        'passive_thien_hoa_viem_ho': {
          name: 'Huyết Viêm',
          description: 'Khi tấn công bằng vũ khí, gây thêm 4% sát thương dưới dạng đốt trong 2 lượt'
        },
        'passive_thien_tho_son_tram': {
          name: 'Sơn Trấn',
          description: 'Mỗi 4 lượt sát thương vũ khí có 25% giảm 8% DEF địch trong 2 lượt'
        },
        // Thần passives
        'passive_than_kim_kim_hon_doan_sat': {
          name: 'Kim Hồn Đoạn Sát',
          description: 'Bắt đầu sẽ cd 5 lượt; khi đủ, bảo đảm lần tấn công vũ khí tiếp theo là guaranteed crit and deals +40% Crit Damage'
        },
        'passive_than_moc_van_diep_hoa_chuyen': {
          name: 'Vạn Diệp Hóa Chuyển',
          description: 'Khi tấn công bằng vũ khí mục tiêu trên 70% HP, gây thêm sát thương bằng 6% sát thương vũ khí + 2% HP mục tiêu'
        },
        'passive_than_thuy_thuy_anh_song_than': {
          name: 'Thủy Ảnh Song Thân',
          description: '15% gây thêm 35% sát thương vũ khí'
        },
        'passive_than_hoa_liet_tam_huyet_tram': {
          name: 'Liệt Tâm Huyết Trảm',
          description: 'Khi tấn công bằng vũ khí, gây 6% sát thương vũ khí dưới dạng đốt trong 2 lượt'
        },
        'passive_than_hoa_kiem_soat_viem_tam': {
          name: 'Viêm Tâm Dẫn Lực',
          description: `Mỗi khi chí mạng, +${Math.round((passive.value || 0.04) * 100)}% ATK trong ${passive.duration || 2} lượt, tối đa ${passive.max_stacks || 3} cộng dồn`
        },
        'passive_than_tho_cuu_thach_chan_uy': {
          name: 'Cửu Thạch Chấn Uy',
          description: 'Mỗi 5 lượt, đòn đánh vũ khí kế tiếp gây thêm 15% sát thương và 25% stun 1 lượt'
        }
      };

      if (passiveMap[passiveId]) {
        return passiveMap[passiveId];
      }
    }

    // Fallback: dùng id hoặc type làm name, description mặc định
    const name = passive.name || passive.id || passive.type || 'Passive';
    const description = passive.description || 'Hiệu ứng bị động';
    return { name, description };
  },

  // Tạo các nút quản lý trang bị
  createEquipmentButtons() {
    return new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('equipment_info')
          .setLabel('Thông Tin')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('ℹ️')
      );
  },

  // Format slot trang bị
  async formatEquipmentSlot(item, slotType) {
    if (!item) {
      const slotNames = {
        'weapon': 'Chưa trang bị vũ khí',
        'armor': 'Chưa trang bị áo giáp',
        'ring': 'Chưa trang bị nhẫn',
        'shoes': 'Chưa trang bị giày',
        'pants': 'Chưa trang bị quần',
        'pendant': 'Chưa trang bị ngọc bội',
        'artifact': 'Chưa trang bị pháp bảo'
      };
      return `⚪ ${slotNames[slotType] || 'Chưa trang bị'}`;
    }

    const itemLoader = require('../../utils/data/item-loader.js');
    // Đảm bảo itemLoader đã load items
    await itemLoader.loadAllItems();
    const itemInfo = itemLoader.getItemInfo(item.id);
    const rarity = itemInfo?.rarity;

    if (!itemInfo) {
      return `❌ Vật phẩm không tồn tại`;
    }

    const rarityEmoji = (() => {
      const map = { 'common': '⚪', 'uncommon': '🟢', 'rare': '🔵', 'epic': '🟣', 'legendary': '🟠' };
      return map[rarity] || '';
    })();

    return `${itemInfo.emoji} **${itemInfo.name}** ${rarityEmoji}`;
  },

  // Tính tổng chỉ số từ trang bị
  calculateTotalStats(player) {
    if (!player.equipment) return 'Chưa có trang bị';

    // Tổng hợp từ _appliedCombatBonuses (vì vũ khí tính mapping combat)
    const slots = ['weapon', 'armor', 'pants', 'shoes', 'ring', 'pendant', 'artifact'];
    const sum = {
      attack: 0, defense: 0, hp: 0, mp: 0, speed: 0, regen: 0,
      critical: 0, evasion: 0, accuracy: 0, penetration: 0
    };
    slots.forEach(slot => {
      const it = player.equipment[slot];
      const delta = it && it._appliedCombatBonuses ? it._appliedCombatBonuses : null;
      if (!delta) return;
      Object.keys(sum).forEach(k => { sum[k] += (delta[k] || 0); });
    });

    const pairs = [
      ['⚔️ ATK', sum.attack], ['🛡️ DEF', sum.defense], ['❤️ HP', sum.hp], ['🔮 MP', sum.mp],
      ['💨 SPD', sum.speed], ['🔄 REGEN', sum.regen], ['💥 CRIT', sum.critical], ['🌪️ EVA', sum.evasion],
      ['🎯 ACC', sum.accuracy], ['🗡️ PEN', sum.penetration]
    ];
    const lines = pairs.filter(([, v]) => Math.round(v) !== 0).map(([n, v]) => `${n}: **+${Math.round(v)}**`);
    return lines.length ? lines.join(' | ') : 'Không có chỉ số bổ sung';
  },

  // Get set bonus configuration (same as in craft.js)
  getSetBonusConfig(setType, rarity) {
    const craftModule = require('./craft.js');
    return craftModule.getSetBonusConfig(setType, rarity);
  },

  // Check if player has complete set (3 items: armor, pants, shoes) with same set_id and rarity
  checkSetBonus(player) {
    if (!player.equipment) return null;

    const armor = player.equipment.armor;
    const pants = player.equipment.pants;
    const shoes = player.equipment.shoes;

    // Need all 3 items
    if (!armor || !pants || !shoes) return null;

    const itemLoader = require('../../utils/data/item-loader.js');
    const armorInfo = itemLoader.getItemInfo(armor.id);
    const pantsInfo = itemLoader.getItemInfo(pants.id);
    const shoesInfo = itemLoader.getItemInfo(shoes.id);

    if (!armorInfo || !pantsInfo || !shoesInfo) return null;

    // Get set_id and rarity from bonuses (stored during craft)
    const armorSetId = armor.bonuses?.['__set_id'];
    const pantsSetId = pants.bonuses?.['__set_id'];
    const shoesSetId = shoes.bonuses?.['__set_id'];

    // Check if all have same set_id
    if (!armorSetId || armorSetId !== pantsSetId || armorSetId !== shoesSetId) return null;

    // Check if all have same rarity
    if (armorInfo.rarity !== pantsInfo.rarity || armorInfo.rarity !== shoesInfo.rarity) return null;

    // Get set_type from any item (they should all be the same)
    const setType = armor.bonuses?.['__set_type'];
    if (!setType) return null;

    // Get set bonus config
    const setBonusConfig = this.getSetBonusConfig(setType, armorInfo.rarity);
    if (!setBonusConfig) return null;

    return {
      set_id: armorSetId,
      set_type: setType,
      rarity: armorInfo.rarity,
      config: setBonusConfig
    };
  },

  // Compute set bonus combat stats (convert VIT/DEX to combat stats)
  computeSetBonusCombatStats(setBonus) {
    if (!setBonus || !setBonus.config) return null;

    const config = setBonus.config;
    const stat = config.stat; // 'VIT' or 'DEX'
    const value = config.value || 0;

    // Convert core stat to combat stats (same formula as weapon)
    let delta = {
      attack: 0, defense: 0, hp: 0, mp: 0, speed: 0, regen: 0,
      critical: 0, evasion: 0, accuracy: 0, penetration: 0
    };

    if (stat === 'VIT') {
      // VIT contributes to: DEF, HP, REGEN
      delta.defense = value * 2.0; // VIT * 2.0 = DEF
      delta.hp = value * 20; // VIT * 20 = HP
      delta.regen = value * 0.2; // VIT * 0.2 = REGEN
    } else if (stat === 'DEX') {
      // DEX contributes to: SPD, EVA, ACC
      delta.speed = value * 1.5; // DEX * 1.5 = SPD
      delta.evasion = value * 0.3; // DEX * 0.3 = EVA
      delta.accuracy = value * 0.6; // DEX * 0.6 = ACC
    }

    // Apply additional effects from set bonus
    if (config.effects) {
      const effects = config.effects;
      // These effects will be handled in combat system, not here
      // But we can store them for reference
      delta._set_effects = effects;
    }

    return delta;
  },

  // Apply or remove set bonus from player stats
  applySetBonusToPlayer(player, setBonus, { remove = false } = {}) {
    if (!setBonus) return;

    const combatDelta = this.computeSetBonusCombatStats(setBonus);
    if (!combatDelta) return;

    // Apply combat stats
    this.applyCombatBonusesToPlayer(player, combatDelta, { remove });

    // Store set bonus info for reference
    if (!remove) {
      player._activeSetBonus = setBonus;
    } else {
      player._activeSetBonus = null;
    }
  },

  // Update set bonus when equipment changes
  updateSetBonus(player) {
    // Remove old set bonus if exists
    if (player._activeSetBonus) {
      this.applySetBonusToPlayer(player, player._activeSetBonus, { remove: true });
    }

    // Check for new set bonus
    const setBonus = this.checkSetBonus(player);
    if (setBonus) {
      this.applySetBonusToPlayer(player, setBonus, { remove: false });
    }
  },

  // Tạo separator đẹp mắt
  createSeparator() {
    return '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  },

  // Format hiển thị cảnh giới đẹp
  formatRealmDisplay(realm, realmLevel) {
    const realmNames = {
      'luyen_khi': 'Luyện Khí',
      'truc_co': 'Trúc Cơ',
      'ket_dan': 'Kết Đan',
      'nguyen_anh': 'Nguyên Anh'
    };

    const realmEmojis = {
      'luyen_khi': '🌿',
      'truc_co': '🌱',
      'ket_dan': '🔮',
      'nguyen_anh': '🌟'
    };

    const realmName = realmNames[realm] || realm;
    const realmEmoji = realmEmojis[realm] || '🌿';

    // Format level name
    let levelName;
    if (realm === 'luyen_khi') {
      levelName = `Tầng ${realmLevel}`;
    } else {
      if (realmLevel === 1) levelName = 'Sơ Kỳ';
      else if (realmLevel === 2) levelName = 'Trung Kỳ';
      else if (realmLevel === 3) levelName = 'Hậu Kỳ';
      else levelName = `Tầng ${realmLevel}`;
    }

    return `${realmEmoji} **${realmName}** - ${levelName}`;
  }
}; 