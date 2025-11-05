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

      const mainEmbed = this.createMainEquipmentEmbed(player);
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
    if (player.equipment.weapon && player.equipment.weapon._appliedCombatBonuses) {
      this.applyCombatBonusesToPlayer(player, player.equipment.weapon._appliedCombatBonuses, { remove: true });
    }

    // Trang bị mới
    player.equipment.weapon = weapon;

    // Tính contribution combat từ bonuses core (post-scale mapping)
    const applied = this.computeWeaponCombatBonuses(player, weapon);
    // Lưu lại để về sau gỡ đúng
    player.equipment.weapon._appliedCombatBonuses = applied;
    // Áp dụng vào player.stats
    this.applyCombatBonusesToPlayer(player, applied, { remove: false });

    // Lưu dữ liệu
    playerManager.savePlayers();

    // Đồng bộ với PlayerService cache để fstatus hiển thị ngay
    try {
      const { getContainer } = require('../../container/ServiceContainer');
      const container = getContainer();
      const playerService = container.get('playerService');
      await playerService.updatePlayer(player.userId || player.id, {
        'equipment.weapon': player.equipment.weapon,
        'stats': player.stats
      });
    } catch (e) {
      console.warn('Sync to PlayerService failed (non-fatal):', e?.message || e);
    }

    // Phản hồi
    const info = itemLoader.getItemInfo(weapon.id);
    const msg = `✅ Đã trang bị vũ khí: ${info?.emoji || '🗡️'} ${info?.name || weapon.id}\n` +
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

  // Tạo embed chính hiển thị trang bị
  createMainEquipmentEmbed(player) {
    const embed = new EmbedBuilder()
      .setColor('#4CAF50')
      .setTitle('⚔️ **TRANG BỊ CỦA BẠN**')
      .setDescription(`${this.createSeparator()}\n**${player.username}** - ${this.formatRealmDisplay(player.realm, player.realmLevel)}`)
      .addFields(
        {
          name: '🗡️ **Vũ Khí**',
          value: this.formatEquipmentSlot(player.equipment.weapon, 'weapon'),
          inline: true
        },
        {
          name: '🛡️ **Áo Giáp**',
          value: this.formatEquipmentSlot(player.equipment.armor, 'armor'),
          inline: true
        },
        {
          name: '💍 **Nhẫn**',
          value: this.formatEquipmentSlot(player.equipment.ring, 'ring'),
          inline: true
        },
        {
          name: '👟 **Giày**',
          value: this.formatEquipmentSlot(player.equipment.shoes, 'shoes'),
          inline: true
        },
        {
          name: '👖 **Quần**',
          value: this.formatEquipmentSlot(player.equipment.pants, 'pants'),
          inline: true
        },
        {
          name: '📿 **Ngọc Bội**',
          value: this.formatEquipmentSlot(player.equipment.pendant, 'pendant'),
          inline: true
        },
        {
          name: '🔮 **Pháp Bảo**',
          value: this.formatEquipmentSlot(player.equipment.artifact, 'artifact'),
          inline: true
        },
        {
          name: '❓ **Slot Đặc Biệt**',
          value: this.formatEquipmentSlot(player.equipment.special, 'special'),
          inline: true
        }
      )
      .addFields(
        {
          name: '📊 **Tổng Chỉ Số**',
          value: this.calculateTotalStats(player),
          inline: false
        }
      )
      .setFooter({ text: 'Sử dụng các nút bên dưới để quản lý trang bị' })
      .setTimestamp();

    return embed;
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
  formatEquipmentSlot(item, slotType) {
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
      return `⚪ ${slotNames[slotType]}`;
    }

    const itemLoader = require('../../utils/data/item-loader.js');
    const itemInfo = itemLoader.getItemInfo(item.id);
    const rarity = itemInfo?.rarity;

    if (!itemInfo) {
      return `❌ Vật phẩm không tồn tại`;
    }

    const rarityEmoji = (() => {
      const map = { 'common': '⚪', 'uncommon': '🟢', 'rare': '🔵', 'epic': '🟣', 'legendary': '🟠' };
      return map[rarity] || '';
    })();
    const level = item.level || 1;
    const enhancement = item.enhancement || 0;

    let enhancementText = '';
    if (enhancement > 0) {
      enhancementText = ` +${enhancement}`;
    }

    return `${itemInfo.emoji} **${itemInfo.name}** ${rarityEmoji}\n📊 Lv.${level}${enhancementText}`;
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