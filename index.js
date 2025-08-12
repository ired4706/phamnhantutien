const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

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
  console.log(`🌿 Tu Tiên Bot is ready! Logged in as ${client.user.tag}`);
  client.user.setActivity('🌿 Tu luyện cùng fhelp', { type: 'PLAYING' });
});

// Message handler for prefix commands
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith('f')) return;

  const args = message.content.slice(1).trim().split(/ +/);
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
        if (typeof content === 'string') {
          await message.reply(content);
        } else if (content.embeds && content.components) {
          // Hỗ trợ cả embeds và components
          await message.reply({
            content: content.content || null,
            embeds: content.embeds || [],
            components: content.components || []
          });
        } else if (content.embeds) {
          await message.reply({ embeds: content.embeds });
        } else if (content.content) {
          await message.reply(content.content);
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
            name: '⭐ Cấp Độ',
            value: '1 (0/100)',
            inline: true
          },
          {
            name: '💎 Linh Thạch',
            value: '100',
            inline: true
          },
          {
            name: '🎯 Ưu Thế',
            value: `**${spiritRoot.attributes.attack_bonus}x** Công Kích\n**${spiritRoot.attributes.defense_bonus}x** Phòng Thủ\n**${spiritRoot.attributes.speed_bonus}x** Tốc Độ\n**${spiritRoot.attributes.magic_bonus}x** Pháp Lực`,
            inline: false
          }
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
          name: '🎯 Thuộc Tính',
          value: `**Công Kích**: ${spiritRoot.attributes.attack_bonus}x\n**Phòng Thủ**: ${spiritRoot.attributes.defense_bonus}x\n**Tốc Độ**: ${spiritRoot.attributes.speed_bonus}x\n**Pháp Lực**: ${spiritRoot.attributes.magic_bonus}x`,
          inline: false
        },
        {
          name: '🔥 Khắc Chế',
          value: `**${spiritRoot.weakness.toUpperCase()}** - Yếu điểm chính`,
          inline: true
        },
        {
          name: '🌱 Tương Sinh',
          value: `**${spiritRoot.strength.toUpperCase()}** - Hỗ trợ tốt`,
          inline: true
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
client.login(process.env.DISCORD_TOKEN); 