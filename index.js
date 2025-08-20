const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Kiểm tra các biến môi trường bắt buộc
if (!process.env.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN không được tìm thấy trong file .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Cấu hình từ biến môi trường
const config = {
  prefix: process.env.PREFIX || 'f',
  gameName: process.env.GAME_NAME || 'Tu Tiên Bot',
  gameVersion: process.env.GAME_VERSION || '1.0.0',
  logLevel: process.env.LOG_LEVEL || 'info',
  commandCooldown: parseInt(process.env.COMMAND_COOLDOWN) || 3000,
  enableEconomy: process.env.ENABLE_ECONOMY === 'true',
  enableLeveling: process.env.ENABLE_LEVELING === 'true',
  enableCultivation: process.env.ENABLE_CULTIVATION === 'true',
  enableSpiritRoots: process.env.ENABLE_SPIRIT_ROOTS === 'true'
};

// Collection để lưu trữ commands
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ('name' in command && 'execute' in command) {
    client.commands.set(command.name, command);
    console.log(`✅ Loaded command: ${command.name}`);
  } else {
    console.log(`❌ Command at ${filePath} is missing required properties`);
  }
}

// Event handler
client.once('ready', () => {
  console.log(`🌿 ${config.gameName} v${config.gameVersion} is ready! Logged in as ${client.user.tag}`);
  client.user.setActivity(`🌿 Tu luyện cùng ${config.prefix}help`, { type: 'PLAYING' });

  // Log cấu hình
  console.log('📋 Bot Configuration:');
  console.log(`   Prefix: ${config.prefix}`);
  console.log(`   Economy: ${config.enableEconomy ? '✅' : '❌'}`);
  console.log(`   Leveling: ${config.enableLeveling ? '✅' : '❌'}`);
  console.log(`   Cultivation: ${config.enableCultivation ? '✅' : '❌'}`);
  console.log(`   Spirit Roots: ${config.enableSpiritRoots ? '✅' : '❌'}`);
});

// Message handler for prefix commands
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(config.prefix)) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName) ||
    client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

  if (!command) return;

  try {
    // Tạo mock interaction object để tương thích với code hiện tại
    const mockInteraction = {
      user: message.author,
      guild: message.guild,
      channel: message.channel,
      client: client,
      reply: async (content) => {
        try {
          if (typeof content === 'string') {
            await message.channel.send(content);
          } else if (content.embeds && content.components) {
            // Hỗ trợ cả embeds và components
            await message.channel.send({
              content: content.content || null,
              embeds: content.embeds || [],
              components: content.components || []
            });
          } else if (content.embeds) {
            await message.channel.send({ embeds: content.embeds });
          } else if (content.content) {
            await message.channel.send(content.content);
          }
        } catch (error) {
          console.error('Error sending message:', error);
          // Fallback: gửi message đơn giản
          try {
            await message.channel.send('❌ Có lỗi xảy ra khi hiển thị thông tin!');
          } catch (fallbackError) {
            console.error('Fallback error:', fallbackError);
          }
        }
      },
      options: {
        getUser: (name) => {
          const user = message.mentions.users.first();
          return user || null;
        }
      }
    };

    await command.execute(mockInteraction, args);
  } catch (error) {
    console.error(error);
    await message.reply('❌ Có lỗi xảy ra khi thực hiện lệnh này!');
  }
});

// Button interaction handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  try {
    await handleButtonInteraction(interaction);
  } catch (error) {
    console.error('Button interaction error:', error);
    await interaction.reply({
      content: '❌ Có lỗi xảy ra khi xử lý tương tác!',
      ephemeral: true
    });
  }
});

// Select menu interaction handler (e.g., falchemy select, forge select)
client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu()) return;

  const { customId } = interaction;

  try {
    if (customId === 'falchemy_select_elixir' || customId.startsWith('falchemy_select_qty:')) {
      const falchemyCommand = require('./commands/alchemy.js');
      const playerManager = require('./systems/player.js');

      const userId = interaction.user.id;

      // Kiểm tra xem user đã bắt đầu game chưa
      if (!playerManager.hasStartedGame(userId)) {
        const notStartedEmbed = playerManager.createNotStartedEmbed();
        await interaction.reply({ embeds: [notStartedEmbed], ephemeral: true });
        return;
      }

      await falchemyCommand.handleSelectMenu(interaction);
      return;
    }

    if (customId === 'forge_select_weapon' || customId.startsWith('forge_select_qty:')) {
      const forgeCommand = require('./commands/forge.js');
      const playerManager = require('./systems/player.js');

      const userId = interaction.user.id;

      // Kiểm tra xem user đã bắt đầu game chưa
      if (!playerManager.hasStartedGame(userId)) {
        const notStartedEmbed = playerManager.createNotStartedEmbed();
        await interaction.reply({ embeds: [notStartedEmbed], ephemeral: true });
        return;
      }

      await forgeCommand.handleSelectMenu(interaction);
      return;
    }
  } catch (error) {
    console.error('Select menu interaction error:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Có lỗi xảy ra khi xử lý select menu!',
        ephemeral: true
      });
    }
  }
});

// Hàm xử lý button interactions
async function handleButtonInteraction(interaction) {
  const { customId } = interaction;

  // Xử lý chọn linh căn
  if (customId.startsWith('choose_')) {
    const spiritRootType = customId.replace('choose_', '');
    const playerManager = require('./systems/player.js');

    const result = playerManager.chooseSpiritRoot(
      interaction.user.id,
      interaction.user.username,
      spiritRootType
    );

    if (result.success) {
      const spiritRoot = result.spiritRoot;

      const successEmbed = new (require('discord.js')).EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🎉 Chúc mừng! Bạn đã chọn linh căn thành công!')
        .setDescription(`**${interaction.user.username}** đã chọn **${spiritRoot.emoji} ${spiritRoot.name}**!`)
        .addFields(
          {
            name: '🏮 Linh Căn',
            value: `${spiritRoot.emoji} ${spiritRoot.name}`,
            inline: true
          },
          {
            name: '📊 Cảnh Giới',
            value: 'Luyện Khí - Tầng 1',
            inline: true
          },
          {
            name: '✨ Linh Khí',
            value: '0 Linh khí',
            inline: true
          },
          {
            name: '💎 Linh Thạch',
            value: '100',
            inline: true
          },
          {
            name: '🎯 Basic Stats',
            value: `**ATK**: ${spiritRoot.basic_stats.attack}\n**DEF**: ${spiritRoot.basic_stats.defense}\n**HP**: ${spiritRoot.basic_stats.hp}\n**MP**: ${spiritRoot.basic_stats.mana}\n**SPD**: ${spiritRoot.basic_stats.speed}\n**CRT**: ${spiritRoot.basic_stats.critical}%\n**RGN**: ${spiritRoot.basic_stats.regen}\n**EVA**: ${spiritRoot.basic_stats.evasion}%\n**REP**: ${spiritRoot.basic_stats.reputation}\n**KAR**: ${spiritRoot.basic_stats.karma}`,
            inline: true
          },
          {
            name: '📈 Growth Rates',
            value: `**ATK**: +${spiritRoot.growth_rates.attack}\n**DEF**: +${spiritRoot.growth_rates.defense}\n**HP**: +${spiritRoot.growth_rates.hp}\n**MP**: +${spiritRoot.growth_rates.mana}\n**SPD**: +${spiritRoot.growth_rates.speed}\n**CRT**: +${spiritRoot.growth_rates.critical}%\n**RGN**: +${spiritRoot.growth_rates.regen}\n**EVA**: +${spiritRoot.growth_rates.evasion}%\n**REP**: +${spiritRoot.growth_rates.reputation}\n**KAR**: +${spiritRoot.growth_rates.karma}`,
            inline: true
          },
        )
        .setFooter({ text: 'Bây giờ bạn có thể sử dụng fstatus để xem thông tin chi tiết!' })
        .setTimestamp();

      await interaction.update({
        content: '🎯 **Linh căn đã được chọn thành công!**',
        embeds: [successEmbed],
        components: []
      });
    } else {
      await interaction.reply({
        content: `❌ ${result.message}`,
        ephemeral: true
      });
    }
    return;
  }

  // Xử lý button inventory
  if (customId.startsWith('inventory_')) {
    try {
      const inventoryCommand = require('./commands/inventory.js');
      const playerManager = require('./systems/player.js');

      const userId = interaction.user.id;
      const username = interaction.user.username;

      // Kiểm tra xem user đã bắt đầu game chưa
      if (!playerManager.hasStartedGame(userId)) {
        const notStartedEmbed = playerManager.createNotStartedEmbed();
        await interaction.reply({ embeds: [notStartedEmbed], ephemeral: true });
        return;
      }

      const player = playerManager.getPlayer(userId);
      const viewType = customId.replace('inventory_', '');

      if (viewType === 'back') {
        await inventoryCommand.showMainInventory(interaction, player, username);
      } else {
        await inventoryCommand.showDetailedView(interaction, viewType, player);
      }
    } catch (error) {
      console.error('Error handling inventory button:', error);
      await interaction.reply({
        content: '❌ Có lỗi xảy ra khi xử lý button inventory!',
        ephemeral: true
      });
    }
    return;
  }

  // Xử lý button falchemy
  if (customId.startsWith('falchemy_')) {
    try {
      const falchemyCommand = require('./commands/alchemy.js');
      const playerManager = require('./systems/player.js');

      const userId = interaction.user.id;
      const username = interaction.user.username;

      // Kiểm tra xem user đã bắt đầu game chưa
      if (!playerManager.hasStartedGame(userId)) {
        const notStartedEmbed = playerManager.createNotStartedEmbed();
        await interaction.reply({ embeds: [notStartedEmbed], ephemeral: true });
        return;
      }

      // Xử lý các button falchemy
      if (customId === 'falchemy_back_main') {
        await falchemyCommand.showFurnaceInfo(interaction, userId);
      } else if (customId.startsWith('falchemy_type_')) {
        const type = customId.replace('falchemy_type_', '');
        await falchemyCommand.showElixirsByType(interaction, type, userId);
      } else if (customId === 'falchemy_furnace_info') {
        await falchemyCommand.showDetailedFurnaceInfo(interaction);
      } else {
        // Fallback: gọi handleButton của command
        await falchemyCommand.handleButton(interaction);
      }
    } catch (error) {
      console.error('Error handling falchemy button:', error);
      await interaction.reply({
        content: '❌ Có lỗi xảy ra khi xử lý button falchemy!',
        ephemeral: true
      });
    }
    return;
  }

  // Xử lý button forge
  if (customId.startsWith('forge_')) {
    try {
      const forgeCommand = require('./commands/forge.js');
      const playerManager = require('./systems/player.js');

      const userId = interaction.user.id;
      const username = interaction.user.username;

      // Kiểm tra xem user đã bắt đầu game chưa
      if (!playerManager.hasStartedGame(userId)) {
        const notStartedEmbed = playerManager.createNotStartedEmbed();
        await interaction.reply({ embeds: [notStartedEmbed], ephemeral: true });
        return;
      }

      // Xử lý các button forge
      if (customId === 'forge_back_main') {
        await forgeCommand.showForgeInfo(interaction, userId);
      } else if (customId.startsWith('forge_element_')) {
        const element = customId.replace('forge_element_', '');
        await forgeCommand.showWeaponsByElement(interaction, element, userId);
      } else if (customId === 'forge_forge_info') {
        await forgeCommand.showDetailedForgeInfo(interaction);
      } else {
        // Fallback: gọi handleButton của command
        await forgeCommand.handleButton(interaction);
      }
    } catch (error) {
      console.error('Error handling forge button:', error);
      await interaction.reply({
        content: '❌ Có lỗi xảy ra khi xử lý button forge!',
        ephemeral: true
      });
    }
    return;
  }

  // Xử lý select menu falchemy
  if (customId === 'falchemy_select_elixir') {
    try {
      const falchemyCommand = require('./commands/alchemy.js');
      const playerManager = require('./systems/player.js');

      const userId = interaction.user.id;
      const username = interaction.user.username;

      // Kiểm tra xem user đã bắt đầu game chưa
      if (!playerManager.hasStartedGame(userId)) {
        const notStartedEmbed = playerManager.createNotStartedEmbed();
        await interaction.reply({ embeds: [notStartedEmbed], ephemeral: true });
        return;
      }

      // Xử lý select menu
      await falchemyCommand.handleSelectMenu(interaction);
    } catch (error) {
      console.error('Error handling falchemy select menu:', error);
      await interaction.reply({
        content: '❌ Có lỗi xảy ra khi xử lý select menu falchemy!',
        ephemeral: true
      });
    }
    return;
  }



  // Xử lý equipment buttons
  if (customId === 'equip_item') {
    await interaction.reply({
      content: '🔧 **Tính năng trang bị sẽ được cập nhật trong phiên bản tiếp theo!**\n\nHiện tại bạn có thể:\n• Xem trang bị hiện tại\n• Kiểm tra chỉ số\n• Quản lý inventory',
      ephemeral: true
    });
    return;
  }

  if (customId === 'unequip_item') {
    await interaction.reply({
      content: '🔓 **Tính năng tháo bỏ trang bị sẽ được cập nhật trong phiên bản tiếp theo!**',
      ephemeral: true
    });
    return;
  }

  if (customId === 'upgrade_equipment') {
    await interaction.reply({
      content: '⬆️ **Tính năng nâng cấp trang bị sẽ được cập nhật trong phiên bản tiếp theo!**',
      ephemeral: true
    });
    return;
  }

  if (customId === 'equipment_info') {
    await interaction.reply({
      content: 'ℹ️ **Thông tin trang bị:**\n\n• **Vũ khí**: Tăng ATK, CRIT\n• **Áo giáp**: Tăng DEF, HP\n• **Trang sức**: Tăng MP, REGEN\n• **Giày**: Tăng SPD, EVASION\n• **Pháp bảo**: Tăng DEF, MP, REP\n• **Slot đặc biệt**: Tăng tất cả chỉ số',
      ephemeral: true
    });
    return;
  }

  // Xử lý xem thông tin linh căn (từ command spiritroot)
  if (customId.startsWith('spirit_')) {
    const spiritType = customId.replace('spirit_', '');
    const playerManager = require('./systems/player.js');
    const spiritRoot = playerManager.getSpiritRootInfo(spiritType);

    if (!spiritRoot) {
      await interaction.reply({
        content: '❌ Không tìm thấy thông tin linh căn!',
        ephemeral: true
      });
      return;
    }

    const spiritEmbed = new (require('discord.js')).EmbedBuilder()
      .setColor('#FF8C00')
      .setTitle(`${spiritRoot.emoji} ${spiritRoot.name}`)
      .setDescription(spiritRoot.description)
      .addFields(
        {
          name: '🎯 Basic Stats',
          value: `**ATK**: ${spiritRoot.basic_stats.attack}\n**DEF**: ${spiritRoot.basic_stats.defense}\n**HP**: ${spiritRoot.basic_stats.hp}\n**MP**: ${spiritRoot.basic_stats.mana}\n**SPD**: ${spiritRoot.basic_stats.speed}\n**CRT**: ${spiritRoot.basic_stats.critical}%\n**RGN**: ${spiritRoot.basic_stats.regen}\n**EVA**: ${spiritRoot.basic_stats.evasion}%\n**REP**: ${spiritRoot.basic_stats.reputation}\n**KAR**: ${spiritRoot.basic_stats.karma}`,
          inline: true
        },
        {
          name: '📈 Growth Rates',
          value: `**ATK**: +${spiritRoot.growth_rates.attack}\n**DEF**: +${spiritRoot.growth_rates.defense}\n**HP**: +${spiritRoot.growth_rates.hp}\n**MP**: +${spiritRoot.growth_rates.mana}\n**SPD**: +${spiritRoot.growth_rates.speed}\n**CRT**: +${spiritRoot.growth_rates.critical}%\n**RGN**: +${spiritRoot.growth_rates.regen}\n**EVA**: +${spiritRoot.growth_rates.evasion}%\n**REP**: +${spiritRoot.growth_rates.reputation}\n**KAR**: +${spiritRoot.growth_rates.karma}`,
          inline: true
        },
        {
          name: '🔥 Bị Khắc Bởi',
          value: `**${spiritRoot.weakness.toUpperCase()}** - Yếu điểm chính`,
          inline: false
        },
        {
          name: '🌱 Khắc Chế Tốt',
          value: `**${spiritRoot.strength.toUpperCase()}** - Đối đầu tốt`,
          inline: false
        },
        {
          name: '✨ Kỹ Năng Đặc Biệt',
          value: spiritRoot.special_abilities.join('\n'),
          inline: false
        }
      )
      .setFooter({ text: 'Linh căn quyết định thiên phú tu luyện' })
      .setTimestamp();

    await interaction.reply({
      embeds: [spiritEmbed],
      ephemeral: true
    });
  }
}

// Error handling
client.on('error', error => {
  console.error('Bot error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Login bot
client.login(process.env.BOT_TOKEN); 