const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');

module.exports = {
  name: 'status',
  aliases: ['s', 'trangthai', 'info'],
  description: 'Xem trạng thái tu luyện và linh căn',

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
    const playerInfo = playerManager.formatPlayerInfo(player);
    const spiritRoot = playerManager.getSpiritRootInfo(player.spiritRoot);
    const realmInfo = playerManager.getRealmInfo(player.realm);

    // Tạo embed hiển thị thông tin
    const statusEmbed = new EmbedBuilder()
      .setColor('#8B0000')
      .setTitle(`🌿 ${playerInfo.username} - Tu Tiên Trạng Thái`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        {
          name: '🏮 Linh Căn',
          value: `${playerInfo.spiritRoot}\n${spiritRoot.description}`,
          inline: false
        },
        {
          name: '📊 Cảnh Giới',
          value: `**${playerInfo.realm}**`,
          inline: true
        },
        {
          name: '⭐ Cấp Độ',
          value: `**${playerInfo.level}** (${playerInfo.experience})`,
          inline: true
        },
        {
          name: '💎 Linh Thạch',
          value: `**${player.inventory.spiritStones}**`,
          inline: true
        }
      );

    // Thêm thông tin cảnh giới chi tiết
    if (realmInfo) {
      statusEmbed.addFields({
        name: '🎯 Thông Tin Cảnh Giới',
        value: `**${realmInfo.name}**\n${realmInfo.description}\n\n**Tầng hiện tại**: ${realmInfo.levels[player.realmLevel - 1]}\n**Tầng tối đa**: ${realmInfo.maxLevel}\n**Độ khó đột phá**: ${realmInfo.breakthroughDifficulty}x`,
        inline: false
      });
    }

    // Thêm stats
    const statsEmbed = new EmbedBuilder()
      .setColor('#006400')
      .setTitle('⚔️ Thuộc Tính Chiến Đấu')
      .addFields(
        {
          name: '❤️ Sinh Mệnh (HP)',
          value: `${player.stats.hp}/${player.stats.maxHp}`,
          inline: true
        },
        {
          name: '🔮 Linh Lực (MP)',
          value: `${player.stats.mp}/${player.stats.maxMp}`,
          inline: true
        },
        {
          name: '⚔️ Công Kích (ATK)',
          value: `**${player.stats.attack}**`,
          inline: true
        },
        {
          name: '🛡️ Phòng Thủ (DEF)',
          value: `**${player.stats.defense}**`,
          inline: true
        },
        {
          name: '⚡ Tốc Độ (SPD)',
          value: `**${player.stats.speed}**`,
          inline: true
        },
        {
          name: '🎯 Chí Mạng (CRT)',
          value: `**${player.stats.critical}%**`,
          inline: true
        },
        {
          name: '💚 Hồi Phục (RGN)',
          value: `**${player.stats.regen}**`,
          inline: true
        },
        {
          name: '🦅 Né Tránh (EVA)',
          value: `**${player.stats.evasion}%**`,
          inline: true
        },
        {
          name: '⭐ Danh Tiếng (REP)',
          value: `**${player.stats.reputation}**`,
          inline: true
        },
        {
          name: '🌟 Nghiệp Lực (KAR)',
          value: `**${player.stats.karma}**`,
          inline: true
        }
      );

    // Thêm thông tin linh căn chi tiết
    const spiritRootEmbed = new EmbedBuilder()
      .setColor('#FF8C00')
      .setTitle(`${spiritRoot.emoji} ${spiritRoot.name} - Chi Tiết`)
      .addFields(
        {
          name: '🎯 Basic Stats (Level 0)',
          value: `**ATK**: ${spiritRoot.basic_stats.attack}\n**DEF**: ${spiritRoot.basic_stats.defense}\n**HP**: ${spiritRoot.basic_stats.hp}\n**MP**: ${spiritRoot.basic_stats.mana}\n**SPD**: ${spiritRoot.basic_stats.speed}\n**CRT**: ${spiritRoot.basic_stats.critical}%\n**RGN**: ${spiritRoot.basic_stats.regen}\n**EVA**: ${spiritRoot.basic_stats.evasion}%\n**REP**: ${spiritRoot.basic_stats.reputation}\n**KAR**: ${spiritRoot.basic_stats.karma}`,
          inline: false
        },
        {
          name: '📈 Growth Rates (per tier)',
          value: `**ATK**: +${spiritRoot.growth_rates.attack}\n**DEF**: +${spiritRoot.growth_rates.defense}\n**HP**: +${spiritRoot.growth_rates.hp}\n**MP**: +${spiritRoot.growth_rates.mana}\n**SPD**: +${spiritRoot.growth_rates.speed}\n**CRT**: +${spiritRoot.growth_rates.critical}%\n**RGN**: +${spiritRoot.growth_rates.regen}\n**EVA**: +${spiritRoot.growth_rates.evasion}%\n**REP**: +${spiritRoot.growth_rates.reputation}\n**KAR**: +${spiritRoot.growth_rates.karma}`,
          inline: false
        },
        {
          name: '🔥 Khắc Chế',
          value: `**${spiritRoot.weakness.toUpperCase()}** - Yếu điểm`,
          inline: true
        },
        {
          name: '🌱 Tương Sinh',
          value: `**${spiritRoot.strength.toUpperCase()}** - Hỗ trợ`,
          inline: true
        }
      );

    // Thêm footer
    statusEmbed.setFooter({ text: `Tham gia từ ${new Date(player.joinDate).toLocaleDateString('vi-VN')}` });
    statusEmbed.setTimestamp();

    await interaction.reply({
      embeds: [statusEmbed, statsEmbed, spiritRootEmbed]
    });
  },
}; 