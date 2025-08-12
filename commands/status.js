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
          name: '❤️ Sinh Mệnh',
          value: `${player.stats.hp}/${player.stats.maxHp}`,
          inline: true
        },
        {
          name: '🔮 Linh Lực',
          value: `${player.stats.mp}/${player.stats.maxMp}`,
          inline: true
        },
        {
          name: '⚔️ Công Kích',
          value: `**${player.stats.attack}**`,
          inline: true
        },
        {
          name: '🛡️ Phòng Thủ',
          value: `**${player.stats.defense}**`,
          inline: true
        },
        {
          name: '⚡ Tốc Độ',
          value: `**${player.stats.speed}**`,
          inline: true
        },
        {
          name: '✨ Pháp Lực',
          value: `**${player.stats.magic}**`,
          inline: true
        }
      );

    // Thêm thông tin linh căn chi tiết
    const spiritRootEmbed = new EmbedBuilder()
      .setColor('#FF8C00')
      .setTitle(`${spiritRoot.emoji} ${spiritRoot.name} - Chi Tiết`)
      .addFields(
        {
          name: '🎯 Ưu Thế',
          value: `**${spiritRoot.attributes.attack_bonus}x** Công Kích\n**${spiritRoot.attributes.defense_bonus}x** Phòng Thủ\n**${spiritRoot.attributes.speed_bonus}x** Tốc Độ\n**${spiritRoot.attributes.magic_bonus}x** Pháp Lực`,
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