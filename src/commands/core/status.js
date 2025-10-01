const { EmbedBuilder } = require('discord.js');
const { getContainer } = require('../../container/ServiceContainer');
const SharedUtils = require('../../utils/core/shared-utils');

module.exports = {
  name: 'status',
  aliases: ['s', 'trangthai', 'info'],
  description: 'Xem trạng thái tu luyện và linh căn',

  // Tạo progress bar đẹp mắt với emoji và màu sắc
  createProgressBar(percentage, realm = 'luyen_khi') {
    return SharedUtils.createProgressBar(percentage, realm);
  },

  // Tạo separator đẹp mắt
  createSeparator() {
    return SharedUtils.createSeparator();
  },

  // Tạo header với style đẹp
  createHeader(username, realm, realmLevel, playerService) {
    const realmInfo = playerService.getRealmInfo(realm);
    const realmEmoji = realmInfo?.emoji || '🌿';
    const realmName = realmInfo?.name || 'Unknown';
    const levelName = realmInfo?.levels?.[realmLevel - 1] || `Tầng ${realmLevel}`;

    return `${realmEmoji} **${username}** - ${realmName} ${levelName}`;
  },

  // Format inventory items để hiển thị tên và emoji
  formatInventoryItems(items) {
    if (!items || items.length === 0) {
      return 'Không có vật phẩm nào';
    }

    const formattedItems = items.map(item => {
      const itemInfo = playerManager.getItemInfo(item.id);
      const itemName = itemInfo ? itemInfo.name : item.id;
      const itemEmoji = itemInfo ? itemInfo.emoji : '📦';
      const rarityInfo = playerManager.getItemRarity(item.id);

      if (rarityInfo) {
        const rarityEmoji = rarityInfo.emoji;
        return `${itemEmoji} **${itemName}** x${item.quantity} ${rarityEmoji}`;
      } else {
        return `${itemEmoji} **${itemName}** x${item.quantity}`;
      }
    });

    return formattedItems.join('\n');
  },

  async execute(interaction, args) {
    const container = getContainer();
    const playerService = container.get('playerService');
    const spiritRootService = container.get('spiritRootService');
    const logger = container.get('logger');

    const userId = interaction.user.id;
    const username = interaction.user.username;

    try {
      // Kiểm tra xem user đã bắt đầu game chưa
      if (!(await playerService.hasStartedGame(userId))) {
        const notStartedEmbed = playerService.createNotStartedEmbed ?
          playerService.createNotStartedEmbed() :
          new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('❌ Bạn chưa bắt đầu hành trình tu tiên!')
            .setDescription('Sử dụng `fstart` để bắt đầu và chọn linh căn!');

        await interaction.reply({ embeds: [notStartedEmbed] });
        return;
      }

      // Lấy thông tin player
      const player = await playerService.getPlayer(userId);
      const spiritRoot = await spiritRootService.getSpiritRootInfo(player.spiritRoot) || {
        emoji: '❓',
        name: 'Không xác định',
        description: 'Linh căn không xác định'
      };
      const realmInfo = playerService.getRealmInfo(player.realm);
      const breakthroughInfo = playerService.getBreakthroughExpRequired ? playerService.getBreakthroughExpRequired(player) : null;

      // Tạo embed chính với layout tối ưu
      const mainEmbed = new EmbedBuilder()
        .setColor(this.getRealmColor(player.realm))
        .setTitle(this.createHeader(username, player.realm, player.realmLevel, playerService))
        .setThumbnail(interaction.user.displayAvatarURL())
        .setDescription(`${this.createSeparator()}\n**Tu Tiên Trạng Thái**`);

      // Thông tin cơ bản - 3 cột
      mainEmbed.addFields(
        {
          name: '🏮 **Linh Căn**',
          value: `${spiritRoot.emoji} **${spiritRoot.name}**\n${spiritRoot.description}`,
          inline: false
        },
        {
          name: '📊 **Cảnh Giới**',
          value: `${realmInfo.emoji} **${realmInfo.name}**\n**Tầng**: ${realmInfo.levels[player.realmLevel - 1]}`,
          inline: true
        },
        {
          name: '✨ **Linh Khí**',
          value: `**${player.experience.toLocaleString()}** Linh khí\n**Tỷ lệ**: ${realmInfo.experienceMultiplier}x`,
          inline: true
        }
      );

      // Thêm footer
      mainEmbed.setFooter({
        text: `Tham gia từ ${new Date(player.joinDate).toLocaleDateString('vi-VN')} • Sử dụng fbreakthrough để đột phá`
      });
      mainEmbed.setTimestamp();

      // Tạo embed thứ hai cho stats chi tiết
      const statsEmbed = new EmbedBuilder()
        .setColor(this.getRealmColor(player.realm))
        .setTitle('⚔️ **Thuộc Tính Chiến Đấu**')
        .setDescription(`${this.createSeparator()}\n**Thông số chi tiết của tu sĩ**`);

      // Nhóm stats theo chức năng
      const combatStats = [
        { name: '❤️ **Sinh Mệnh**', value: `${player.stats.hp.toLocaleString()}/${player.stats.maxHp.toLocaleString()}`, inline: true },
        { name: '🔮 **Linh Lực**', value: `${player.stats.mp.toLocaleString()}/${player.stats.maxMp.toLocaleString()}`, inline: true },
        { name: '⚔️ **Công Kích**', value: `**${player.stats.attack.toLocaleString()}**`, inline: true }
      ];

      const defenseStats = [
        { name: '🛡️ **Phòng Thủ**', value: `**${player.stats.defense.toLocaleString()}**`, inline: true },
        { name: '⚡ **Tốc Độ**', value: `**${player.stats.speed.toLocaleString()}**`, inline: true },
        { name: '🎯 **Chí Mạng**', value: `**${player.stats.critical}%**`, inline: true }
      ];

      const utilityStats = [
        { name: '💚 **Hồi Phục**', value: `**${player.stats.regen.toLocaleString()}**`, inline: true },
        { name: '🦅 **Né Tránh**', value: `**${player.stats.evasion}%**`, inline: true },
        { name: '✨ **Danh Tiếng**', value: `**${player.stats.reputation.toLocaleString()}**`, inline: true }
      ];

      statsEmbed.addFields(...combatStats, ...defenseStats, ...utilityStats);

      // Tạo embed thứ ba cho linh căn chi tiết
      const spiritRootEmbed = new EmbedBuilder()
        .setColor(this.getSpiritRootColor(player.spiritRoot))
        .setTitle(`${spiritRoot.emoji} **${spiritRoot.name} - Chi Tiết**`)
        .setDescription(`${this.createSeparator()}\n**Thông tin chi tiết về linh căn**`);

      // Nhóm thông tin linh căn
      const basicStats = [
        { name: '🎯 **Basic Stats**', value: this.formatSpiritRootStats(spiritRoot.basic_stats), inline: true },
        { name: '📈 **Growth Rates**', value: this.formatSpiritRootGrowth(spiritRoot.growth_rates), inline: true }
      ];

      const elementalInfo = [
        { name: '⚔️ **Tương Khắc**', value: `⚠️ **${spiritRoot.weakness.toUpperCase()}** - Yếu điểm | 💪 **${spiritRoot.strength.toUpperCase()}** - Thế mạnh`, inline: false }
      ];

      spiritRootEmbed.addFields(...basicStats, ...elementalInfo);

      // Gửi tất cả embeds
      await interaction.reply({
        embeds: [mainEmbed, statsEmbed, spiritRootEmbed]
      });
    } catch (error) {
      logger.error('Error in status command', { error: error.message, userId });
      await interaction.reply('❌ Có lỗi xảy ra khi hiển thị trạng thái!');
    }
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

  // Lấy màu sắc theo linh căn
  getSpiritRootColor(spiritRoot) {
    const colors = {
      'kim': '#FFD700',   // Vàng
      'moc': '#228B22',   // Xanh lá
      'thuy': '#4169E1',  // Xanh dương
      'hoa': '#FF4500',   // Đỏ cam
      'tho': '#8B4513'    // Nâu
    };
    return colors[spiritRoot] || '#FF8C00';
  },

  // Lấy tên cấp độ cảnh giới
  getRealmLevelName(realmLevel) {
    if (realmLevel === 1) return 'Sơ Kỳ';
    if (realmLevel === 2) return 'Trung Kỳ';
    if (realmLevel === 3) return 'Hậu Kỳ';
    return `Tầng ${realmLevel}`;
  },

  // Format stats linh căn
  formatSpiritRootStats(stats) {
    return `**ATK**: ${stats.attack}\n**DEF**: ${stats.defense}\n**HP**: ${stats.hp}\n**MP**: ${stats.mana}\n**SPD**: ${stats.speed}\n**CRIT (rating)**: ${stats.critical}\n**REGEN**: ${stats.regen}\n**EVA (rating)**: ${stats.evasion}`;
  },

  // Format growth rates linh căn
  formatSpiritRootGrowth(growth) {
    return `**ATK**: +${growth.attack}\n**DEF**: +${growth.defense}\n**HP**: +${growth.hp}\n**MP**: +${growth.mana}\n**SPD**: +${growth.speed}\n**CRIT (rating)**: +${growth.critical}\n**REGEN**: +${growth.regen}\n**EVA (rating)**: +${growth.evasion}`;
  },

  // Format hiển thị linh thạch
  formatSpiritStones(spiritStones) {
    return SharedUtils.formatSpiritStones(spiritStones);
  }
}; 