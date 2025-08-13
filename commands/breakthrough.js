const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');

module.exports = {
  name: 'breakthrough',
  aliases: ['bt', 'dotpha', 'advance'],
  description: 'Xem tiến độ đột phá và linh khí cần thiết',

  async execute(interaction, args) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Kiểm tra xem user đã bắt đầu game chưa
    if (!playerManager.hasStartedGame(userId)) {
      const notStartedEmbed = playerManager.createNotStartedEmbed();
      await interaction.reply({ embeds: [notStartedEmbed] });
      return;
    }

    const player = playerManager.getPlayer(userId);
    const breakthroughInfo = playerManager.getBreakthroughExpRequired(player);
    const currentRealmInfo = playerManager.getRealmInfo(player.realm);

    // Tạo embed chính
    const mainEmbed = new EmbedBuilder()
      .setColor('#8B0000')
      .setTitle(`🚀 Tiến Độ Đột Phá - ${username}`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields({
        name: '🏮 Cảnh Giới Hiện Tại',
        value: `**${currentRealmInfo.name} - ${currentRealmInfo.levels[player.realmLevel - 1]}**\n**Linh khí**: ${player.experience} Linh khí`,
        inline: false
      });

    // Thêm thông tin đột phá
    if (breakthroughInfo.canBreakthrough) {
      const nextRealmInfo = playerManager.getRealmInfo(breakthroughInfo.nextRealm);
      const progressBar = this.createProgressBar(breakthroughInfo.progress);
      
      mainEmbed.addFields({
        name: '🎯 Mục Tiêu Đột Phá',
        value: `**${nextRealmInfo.name} - ${this.getRealmLevelName(breakthroughInfo.nextRealmLevel)}**`,
        inline: true
      });

      mainEmbed.addFields({
        name: '📊 Tiến Độ',
        value: `${progressBar}\n**${breakthroughInfo.progress.toFixed(1)}%**`,
        inline: true
      });

      mainEmbed.addFields({
        name: '💎 Linh khí Cần Thiết',
        value: `**${breakthroughInfo.linhKhiRequired} Linh khí**`,
        inline: true
      });

      mainEmbed.addFields({
        name: '⚡ Linh khí Còn Thiếu',
        value: `**${breakthroughInfo.linhKhiNeeded} Linh khí**`,
        inline: false
      });

      // Thêm gợi ý hoạt động
      const suggestions = this.getActivitySuggestions(breakthroughInfo.linhKhiNeeded);
      mainEmbed.addFields({
        name: '💡 Gợi Ý Hoạt Động',
        value: suggestions,
        inline: false
      });

    } else {
      mainEmbed.addFields({
        name: '🏆 Trạng Thái',
        value: `**${breakthroughInfo.reason}**\nBạn đã đạt đến cảnh giới tối đa!`,
        inline: false
      });
    }

    // Thêm footer
    mainEmbed.setFooter({ text: 'Sử dụng fstatus để xem thông tin chi tiết hơn' });
    mainEmbed.setTimestamp();

    await interaction.reply({ embeds: [mainEmbed] });
  },

  // Tạo progress bar
  createProgressBar(percentage) {
    const filledBlocks = Math.floor(percentage / 10);
    const emptyBlocks = 10 - filledBlocks;
    
    const filled = '█'.repeat(filledBlocks);
    const empty = '░'.repeat(emptyBlocks);
    
    return `${filled}${empty}`;
  },

  // Lấy tên cấp độ cảnh giới
  getRealmLevelName(realmLevel) {
    if (realmLevel === 1) return 'Sơ Kỳ';
    if (realmLevel === 2) return 'Trung Kỳ';
    if (realmLevel === 3) return 'Hậu Kỳ';
    return `Tầng ${realmLevel}`;
  },

  // Gợi ý hoạt động để tích lũy Linh khí
  getActivitySuggestions(linhKhiNeeded) {
    if (linhKhiNeeded <= 100) {
      return '• `fhunt` (30s) - Săn yêu thú\n• `fpick` (5m) - Thu thập thảo dược';
    } else if (linhKhiNeeded <= 1000) {
      return '• `fmeditate` (1h) - Thiền định tu luyện\n• `fexplore` (10m) - Khám phá thế giới';
    } else if (linhKhiNeeded <= 10000) {
      return '• `fchallenge` (1h) - Thách đấu tu sĩ\n• `fdungeon` (6h) - Thí luyện';
    } else {
      return '• `fdomain` (8h) - Khám phá bí cảnh\n• `fdaily` (1d) - Nhiệm vụ hàng ngày\n• `fweekly` (1w) - Nhiệm vụ hàng tuần';
    }
  }
};
