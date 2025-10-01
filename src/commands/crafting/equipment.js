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
          accessory: null,
          shoes: null,
          artifact: null,
          special: null
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
          name: '💍 **Trang Sức**',
          value: this.formatEquipmentSlot(player.equipment.accessory, 'accessory'),
          inline: true
        },
        {
          name: '👟 **Giày**',
          value: this.formatEquipmentSlot(player.equipment.shoes, 'shoes'),
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
          .setCustomId('equip_item')
          .setLabel('Trang Bị')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('⚔️'),
        new ButtonBuilder()
          .setCustomId('unequip_item')
          .setLabel('Tháo Bỏ')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔓'),
        new ButtonBuilder()
          .setCustomId('upgrade_equipment')
          .setLabel('Nâng Cấp')
          .setStyle(ButtonStyle.Success)
          .setEmoji('⬆️'),
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
        'accessory': 'Chưa trang bị trang sức',
        'shoes': 'Chưa trang bị giày',
        'artifact': 'Chưa trang bị pháp bảo',
        'special': 'Slot chưa mở khóa'
      };
      return `⚪ ${slotNames[slotType]}`;
    }

    const itemInfo = playerManager.getItemInfo(item.id);
    const rarityInfo = playerManager.getItemRarity(item.id);

    if (!itemInfo) {
      return `❌ Vật phẩm không tồn tại`;
    }

    const rarityEmoji = rarityInfo ? rarityInfo.emoji : '';
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

    let totalStats = {
      ATK: 0,
      DEF: 0,
      HP: 0,
      MP: 0,
      SPD: 0,
      CRIT: 0,
      REGEN: 0,
      EVASION: 0,
      REP: 0,
      KARMA: 0
    };

    // Tính chỉ số từ từng slot trang bị
    Object.values(player.equipment).forEach(item => {
      if (item && item.stats) {
        Object.keys(totalStats).forEach(stat => {
          if (item.stats[stat]) {
            totalStats[stat] += item.stats[stat];
          }
        });
      }
    });

    // Format hiển thị
    const statDisplay = Object.entries(totalStats)
      .filter(([_, value]) => value > 0)
      .map(([stat, value]) => `${stat}: +${value}`)
      .join(' | ');

    return statDisplay || 'Không có chỉ số bổ sung';
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