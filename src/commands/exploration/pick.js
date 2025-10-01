const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const playerManager = require('../../systems/player.js');
const cooldownManager = require('../../utils/game/cooldown.js');
const expCalculator = require('../../systems/exp-calculator.js');
const SpiritStonesCalculator = require('../../utils/game/spirit-stones-calculator.js');
const ItemDropCalculator = require('../../utils/game/item-drop-calculator.js');
const itemLoader = require('../../utils/data/item-loader.js');

module.exports = {
  name: 'pick',
  aliases: ['p', 'hai', 'thuoc'],
  description: 'Thu thập thảo dược để lấy tài nguyên và kinh nghiệm',
  cooldown: 300000, // 5m = 300000ms

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
      'legendary': '#FF9800',   // Cam
      'mythic': '#F44336'       // Đỏ
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
      'legendary': '🟠',
      'mythic': '🔴'
    };
    return emojis[rarity] || '⚪';
  },

  async execute(interaction, args) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Kiểm tra xem user đã bắt đầu game chưa
    if (!(await playerManager.hasStartedGame(userId))) {
      const notStartedEmbed = playerManager.createNotStartedEmbed();
      await interaction.reply({ embeds: [notStartedEmbed] });
      return;
    }

    // Thực hiện thu thập ngay lập tức
    await this.performCollection(interaction, userId, username);
  },

  // Hiển thị danh sách thảo dược
  async showHerbsList(interaction) {
    // Load items nếu chưa load
    await itemLoader.loadAllItems();

    const herbs = Object.values(itemLoader.items).filter(item => item.category === 'herbs');

    // Nhóm theo rarity
    const herbsByRarity = {};
    herbs.forEach(herb => {
      const rarity = herb.rarity || 'common';
      if (!herbsByRarity[rarity]) {
        herbsByRarity[rarity] = [];
      }
      herbsByRarity[rarity].push(herb);
    });

    const embed = new EmbedBuilder()
      .setColor('#4CAF50')
      .setTitle('🌿 **Danh Sách Thảo Dược**')
      .setDescription(`${this.createSeparator()}\n**Tất cả thảo dược có thể thu thập được**`);

    // Hiển thị theo rarity từ thấp đến cao
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

    rarityOrder.forEach(rarity => {
      if (herbsByRarity[rarity] && herbsByRarity[rarity].length > 0) {
        const herbsList = herbsByRarity[rarity];
        const rarityEmoji = this.getRarityEmoji(rarity);
        const rarityName = this.getRarityDisplayName(rarity);

        const herbsListFormatted = herbsList.map(herb =>
          `${herb.emoji} **${herb.name}** - ${herb.description}`
        ).join('\n');

        embed.addFields({
          name: `${rarityEmoji} **${rarityName}** (${herbsList.length} loại)`,
          value: herbsListFormatted,
          inline: false
        });
      }
    });

    // Button quay lại
    const backButton = new ButtonBuilder()
      .setCustomId('pick_back')
      .setLabel('Quay Lại')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⬅️');

    const backRow = new ActionRowBuilder().addComponents(backButton);

    try {
      await interaction.update({
        embeds: [embed],
        components: [backRow]
      });
    } catch (error) {
      console.log('Not a button interaction, sending new message');
      await interaction.channel.send({
        embeds: [embed],
        components: [backRow]
      });
    }
  },

  // Hiển thị thông tin chi tiết về thảo dược
  async showDetailedHerbsInfo(interaction) {
    const herbs = itemLoader.items;
    const herbsList = Object.values(herbs).filter(item => item.category === 'herbs');

    // Thống kê theo rarity
    const stats = {};
    herbsList.forEach(herb => {
      const rarity = herb.rarity || 'common';
      if (!stats[rarity]) {
        stats[rarity] = { count: 0, totalValue: 0 };
      }
      stats[rarity].count++;
      stats[rarity].totalValue += herb.value || 0;
    });

    const embed = new EmbedBuilder()
      .setColor('#9932CC')
      .setTitle('ℹ️ **Thông Tin Chi Tiết Thảo Dược**')
      .setDescription(`${this.createSeparator()}\n**Thống kê và thông tin về hệ thống thảo dược**`);

    // Thống kê theo rarity
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

    rarityOrder.forEach(rarity => {
      if (stats[rarity]) {
        const rarityEmoji = this.getRarityEmoji(rarity);
        const rarityName = this.getRarityDisplayName(rarity);
        const stat = stats[rarity];

        embed.addFields({
          name: `${rarityEmoji} **${rarityName}**`,
          value: `**Số lượng**: ${stat.count} loại\n**Tổng giá trị**: ${stat.totalValue.toLocaleString()} linh thạch`,
          inline: true
        });
      }
    });

    // Thông tin về hệ thống thu thập
    embed.addFields(
      {
        name: '📊 **Hệ Thống Thu Thập**',
        value: '• **Cooldown**: 5 phút\n• **Linh khí**: 40-50 (random)\n• **Thảo dược**: 2-4 loại (random)\n• **Linh thạch**: Hạ phẩm + Trung phẩm',
        inline: false
      },
      {
        name: '🎯 **Tỷ Lệ Thu Thập**',
        value: '• **Common**: 60% (thảo dược cơ bản)\n• **Uncommon**: 25% (thảo dược trung cấp)\n• **Rare**: 10% (thảo dược quý hiếm)\n• **Epic+**: 5% (thảo dược đặc biệt)',
        inline: false
      }
    );

    // Button quay lại
    const backButton = new ButtonBuilder()
      .setCustomId('pick_back')
      .setLabel('Quay Lại')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⬅️');

    const backRow = new ActionRowBuilder().addComponents(backButton);

    try {
      await interaction.update({
        embeds: [embed],
        components: [backRow]
      });
    } catch (error) {
      console.log('Not a button interaction, sending new message');
      await interaction.channel.send({
        embeds: [embed],
        components: [backRow]
      });
    }
  },

  // Thực hiện thu thập
  async performCollection(interaction, userId, username) {
    const player = await playerManager.getPlayer(userId);
    const now = Date.now();

    // Kiểm tra cooldown
    const cooldownCheck = cooldownManager.checkCooldown(player, 'pick', this.cooldown);
    if (cooldownCheck.isOnCooldown) {
      const cooldownEmbed = cooldownManager.createCooldownEmbed('pick', cooldownCheck.remainingText);
      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Load items nếu chưa load
    await itemLoader.loadAllItems();

    // Tính toán Linh khí
    const expResult = expCalculator.calculatePickExp(player, 'none');
    const expGained = expResult.finalExp;

    // Tính toán phần thưởng
    const spiritStones = SpiritStonesCalculator.calculatePick();
    const herbs = ItemDropCalculator.calculatePickItems(player);

    // Cập nhật player
    playerManager.addExperience(userId, expGained);
    SpiritStonesCalculator.updatePlayerSpiritStones(player, spiritStones);

    // Thêm thảo dược vào inventory
    herbs.forEach(herb => {
      playerManager.addItemToInventory(player, herb.id, 1);
    });

    // Cập nhật thời gian command cuối
    const lastCommandField = cooldownManager.getLastCommandField('pick');
    const updateData = {
      [lastCommandField]: now,
      ...SpiritStonesCalculator.createUpdateObject(spiritStones)
    };
    playerManager.updatePlayer(userId, updateData);

    // Tạo embed thông báo thành công
    const successEmbed = new EmbedBuilder()
      .setColor('#228B22')
      .setTitle('🌿 **Thu thập thảo dược thành công!**')
      .setDescription(`${this.createSeparator()}\n**${username}** đã thu thập được thảo dược.`)
      .addFields(
        {
          name: '📊 **Linh khí nhận được**',
          value: `**+${expGained} Linh khí** (Random 40-50)`,
          inline: true
        },
        {
          name: '💎 **Linh thạch thu được**',
          value: SpiritStonesCalculator.formatSpiritStones(spiritStones),
          inline: true
        },
        {
          name: '🌿 **Thảo dược thu được**',
          value: herbs.map(herb => `${herb.emoji} **${herb.name}** ${this.getRarityEmoji(herb.rarity)}`).join('\n'),
          inline: false
        }
      )
      .addFields({
        name: '🔍 **Chi tiết tính toán Linh khí**',
        value: expResult.breakdown.calculation,
        inline: false
      })
      .setFooter({ text: 'Thu thập thảo dược có thể thực hiện sau 5 phút' })
      .setTimestamp();

    // Gửi kết quả
    await interaction.reply({ embeds: [successEmbed] });
  },

  // Lấy tên hiển thị cho rarity
  getRarityDisplayName(rarity) {
    const displayNames = {
      'common': 'Thường',
      'uncommon': 'Hiếm',
      'rare': 'Quý Hiếm',
      'epic': 'Cực Quý',
      'legendary': 'Huyền Thoại',
      'mythic': 'Thần Thoại'
    };
    return displayNames[rarity] || rarity;
  }
};
