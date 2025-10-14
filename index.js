const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { getContainer } = require('./src/container/ServiceContainer');

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

// Initialize DI container and attach to client
const container = getContainer();
client.container = container;

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

// Load commands from new structure
const commandsPath = path.join(__dirname, 'src/commands');
const commandCategories = fs.readdirSync(commandsPath, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

for (const category of commandCategories) {
  const categoryPath = path.join(commandsPath, category);
  const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(categoryPath, file);
    const command = require(filePath);

    if ('name' in command && 'execute' in command) {
      client.commands.set(command.name, command);
      console.log(`✅ Loaded command: ${command.name} (${category})`);
    } else {
      console.log(`❌ Command at ${filePath} is missing required properties`);
    }
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
            const sent = await message.channel.send(content);
            return sent;
          } else if (content.embeds && content.components) {
            // Hỗ trợ cả embeds và components
            const sent = await message.channel.send({
              content: content.content || null,
              embeds: content.embeds || [],
              components: content.components || []
            });
            return sent;
          } else if (content.embeds) {
            const sent = await message.channel.send({ embeds: content.embeds });
            return sent;
          } else if (content.content) {
            const sent = await message.channel.send(content.content);
            return sent;
          }
        } catch (error) {
          console.error('Error sending message:', error);
          // Fallback: gửi message đơn giản
          try {
            const sent = await message.channel.send('❌ Có lỗi xảy ra khi hiển thị thông tin!');
            return sent;
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
      const falchemyCommand = require('./src/commands/crafting/alchemy.js');
      const playerManager = require('./src/systems/player.js');

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
      const forgeCommand = require('./src/commands/crafting/forge.js');
      const playerManager = require('./src/systems/player.js');

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

    if (customId === 'craft_select_equipment' || customId.startsWith('craft_select_qty:')) {
      const craftCommand = require('./src/commands/crafting/craft.js');
      const playerManager = require('./src/systems/player.js');

      const userId = interaction.user.id;

      if (!playerManager.hasStartedGame(userId)) {
        const notStartedEmbed = playerManager.createNotStartedEmbed();
        await interaction.reply({ embeds: [notStartedEmbed], ephemeral: true });
        return;
      }

      await craftCommand.handleSelectMenu(interaction);
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
    const playerManager = require('./src/systems/player.js');

    const result = playerManager.chooseSpiritRoot(
      interaction.user.id,
      interaction.user.username,
      spiritRootType
    );

    if (result.success) {
      const spiritRoot = result.spiritRoot;

      // Tự động học kỹ năng ban đầu cho Luyện Khí
      const player = playerManager.getPlayer(interaction.user.id);
      const learnedSkills = autoLearnInitialSkills(player);

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
            value: String(player.inventory && player.inventory.spiritStones ? player.inventory.spiritStones.ha_pham : 100),
            inline: true
          },
          {
            name: '🎯 Basic Stats',
            value: `**ATK**: ${spiritRoot.basic_stats.attack}\n**DEF**: ${spiritRoot.basic_stats.defense}\n**HP**: ${spiritRoot.basic_stats.hp}\n**MP**: ${spiritRoot.basic_stats.mana}\n**SPD**: ${spiritRoot.basic_stats.speed}\n**CRT (rating)**: ${spiritRoot.basic_stats.critical}\n**RGN**: ${spiritRoot.basic_stats.regen}\n**EVA (rating)**: ${spiritRoot.basic_stats.evasion}`,
            inline: true
          },
          {
            name: '📈 Growth Rates',
            value: `**ATK**: +${spiritRoot.growth_rates.attack}\n**DEF**: +${spiritRoot.growth_rates.defense}\n**HP**: +${spiritRoot.growth_rates.hp}\n**MP**: +${spiritRoot.growth_rates.mana}\n**SPD**: +${spiritRoot.growth_rates.speed}\n**CRT (rating)**: +${spiritRoot.growth_rates.critical}\n**RGN**: +${spiritRoot.growth_rates.regen}\n**EVA (rating)**: +${spiritRoot.growth_rates.evasion}`,
            inline: true
          }
        );

      // Thêm thông tin kỹ năng ban đầu nếu có
      if (learnedSkills.length > 0) {
        const skillNames = learnedSkills.map(skill => `**${skill.name}**`).join('\n');
        successEmbed.addFields({
          name: '🎯 **Kỹ Năng Ban Đầu**',
          value: skillNames,
          inline: false
        });
      }

      successEmbed.setFooter({
        text: 'Bây giờ bạn có thể sử dụng fstatus để xem thông tin chi tiết!\nSử dụng fskills để xem kỹ năng đã học!'
      });
      successEmbed.setTimestamp();

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

  // Xử lý raid combat buttons
  if (customId.startsWith('raid_')) {
    const combatSystem = require('./src/systems/combat.js');
    const parts = customId.split('_');
    // Hỗ trợ: raid_skilluse_<combatId>_<actorId>_<ts>_<skillId>, raid_back_<combatId>
    let action = parts[1];
    let combatId = parts[2];

    if (parts[1] === 'skilluse') {
      action = 'raid_skilluse';
      combatId = parts[2] + '_' + parts[3]; // combatId = raid_<timestamp>
      const actorId = parts[4];
      const skillId = parts.slice(6).join('_');

      // Kiểm tra quyền sử dụng skill
      const combat = combatSystem.activeCombats.get(combatId);
      if (combat && combat.party) {
        const actor = combat.party.find(p => p.id === actorId);
        if (!actor || interaction.user.id !== actor.id) {
          await interaction.reply({ content: '❌ Bạn không thể sử dụng kỹ năng của người khác!', ephemeral: true });
          return;
        }
      }

      await combatSystem.handlePlayerAction(combatId, action, interaction);
      return;
    } else if (parts[1] === 'back') {
      action = 'raid_back';
      combatId = parts[2] + '_' + parts[3]; // combatId = raid_<timestamp>
      await combatSystem.handlePlayerAction(combatId, action, interaction);
      return;
    }
  }

  // Xử lý combat buttons
  if (customId.startsWith('combat_')) {
    const combatSystem = require('./src/systems/combat.js');
    const parts = customId.split('_');
    // Hỗ trợ: combat_attack_<id>, combat_defend_<id>, combat_skill_<id>, combat_item_<id>,
    //          combat_skilluse_<id>_<skillId>, combat_back_<id>
    let action = parts[1];
    let combatId = parts.slice(2).join('_');
    if (parts[1] === 'skilluse') {
      action = 'skilluse';
      combatId = parts[2] + (parts[3] ? '_' + parts[3] : '');
    } else if (parts[1] === 'back') {
      action = 'back';
      combatId = parts.slice(2).join('_');
    }

    console.log(`Combat button clicked: action=${action}, combatId=${combatId}`);
    await combatSystem.handlePlayerAction(combatId, action, interaction);
    return;
  }

  // Xử lý button inventory
  if (customId.startsWith('inventory_')) {
    try {
      const inventoryCommand = require('./src/commands/management/inventory.js');
      const playerManager = require('./src/systems/player.js');

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

  // ===== DOMAIN LOBBY BUTTONS =====
  if (customId.startsWith('domain_')) {
    const raidManager = require('./src/systems/raid.js');
    const monsterManager = require('./src/systems/monster.js');
    const combatSystem = require('./src/systems/combat.js');
    const playerManager = require('./src/systems/player.js');

    try {
      const [prefix, action, lobbyId] = customId.split('_');
      const userId = interaction.user.id;

      if (action === 'join') {
        const res = raidManager.joinLobby(lobbyId, userId);
        if (!res.ok) {
          await interaction.reply({ content: `❌ ${res.reason}`, ephemeral: true });
          return;
        }
        // update message
        const ui = raidManager.buildInviteUI(raidManager.getLobby(lobbyId));
        await interaction.update(ui);
        return;
      }

      if (action === 'leave') {
        const res = raidManager.leaveLobby(lobbyId, userId);
        if (!res.ok) {
          await interaction.reply({ content: `❌ ${res.reason}`, ephemeral: true });
          return;
        }
        const lobby = raidManager.getLobby(lobbyId);
        if (!lobby || lobby.party.size === 0) {
          // destroy and disable UI
          raidManager.destroyLobby(lobbyId);
          await interaction.update({ content: '🛑 Lobby đã đóng.', components: [] });
          return;
        }
        const ui = raidManager.buildInviteUI(lobby);
        await interaction.update(ui);
        return;
      }

      if (action === 'cancel') {
        raidManager.destroyLobby(lobbyId);
        await interaction.update({ content: '🛑 Host đã hủy lobby.', components: [] });
        return;
      }

      if (action === 'start') {
        const lobby = raidManager.getLobby(lobbyId);
        if (!lobby) {
          await interaction.reply({ content: '❌ Lobby không tồn tại!', ephemeral: true });
          return;
        }
        if (lobby.hostId !== userId) {
          await interaction.reply({ content: '❌ Chỉ host mới có thể bắt đầu!', ephemeral: true });
          return;
        }
        // Build party data
        const partyUsers = Array.from(lobby.party);
        const party = partyUsers.map(uid => {
          const p = playerManager.getPlayer(uid);
          return { ...p, id: uid, username: p?.username || uid };
        }).filter(Boolean);
        if (party.length === 0) {
          await interaction.reply({ content: '❌ Không có người chơi hợp lệ trong party!', ephemeral: true });
          return;
        }
        // Waves: 2 mob waves + 1 boss wave
        const leader = party[0];
        const tier = require('./src/systems/monster.js').getPlayerEquivalentTier(leader.realm, leader.realmLevel);
        const waves = [];
        for (let w = 0; w < 2; w++) {
          const m1 = await monsterManager.generateRandomMonster(tier, leader);
          const m2 = await monsterManager.generateRandomMonster(tier, leader);
          waves.push([m1, m2]);
        }
        const boss = await monsterManager.generateRandomMonster(tier, leader);
        boss.name = `👑 ${boss.name} (BOSS)`;
        const add = await monsterManager.generateRandomMonster(tier, leader);
        waves.push([boss, add]);

        // Start raid combat
        const combat = combatSystem.startRaidCombat(party, waves, interaction);
        const ui = combatSystem.createRaidUI(combat);
        await interaction.update(ui);
        raidManager.destroyLobby(lobbyId);
        return;
      }
    } catch (e) {
      console.error('Domain lobby error:', e);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Lỗi xử lý domain lobby!', ephemeral: true });
      }
    }
    return;
  }
  // Xử lý button falchemy
  if (customId.startsWith('falchemy_')) {
    try {
      const falchemyCommand = require('./src/commands/crafting/alchemy.js');
      const playerManager = require('./src/systems/player.js');

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
      const forgeCommand = require('./src/commands/crafting/forge.js');
      const playerManager = require('./src/systems/player.js');

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

  // Xử lý button craft (trang bị)
  if (customId.startsWith('craft_')) {
    try {
      const craftCommand = require('./src/commands/crafting/craft.js');
      const playerManager = require('./src/systems/player.js');

      const userId = interaction.user.id;

      if (!playerManager.hasStartedGame(userId)) {
        const notStartedEmbed = playerManager.createNotStartedEmbed();
        await interaction.reply({ embeds: [notStartedEmbed], ephemeral: true });
        return;
      }

      if (customId === 'craft_back_main') {
        await craftCommand.showCraftMenu(interaction, userId);
      } else if (customId.startsWith('craft_type_')) {
        const type = customId.replace('craft_type_', '');
        await craftCommand.showEquipmentByType(interaction, type, userId);
      } else {
        await craftCommand.handleButton(interaction);
      }
    } catch (error) {
      console.error('Error handling craft button:', error);
      await interaction.reply({
        content: '❌ Có lỗi xảy ra khi xử lý button craft!',
        ephemeral: true
      });
    }
    return;
  }

  // Xử lý select menu falchemy
  if (customId === 'falchemy_select_elixir') {
    try {
      const falchemyCommand = require('./src/commands/crafting/alchemy.js');
      const playerManager = require('./src/systems/player.js');

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
    const playerManager = require('./src/systems/player.js');
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
          name: '🎯 Core Stats',
          value: `**STR**: ${spiritRoot.core_stats.STR}\n**INT**: ${spiritRoot.core_stats.INT}\n**DEX**: ${spiritRoot.core_stats.DEX}\n**VIT**: ${spiritRoot.core_stats.VIT}\n**LUK**: ${spiritRoot.core_stats.LUK}`,
          inline: true
        },
        {
          name: '📈 Growth Rates',
          value: `**STR**: +${spiritRoot.growth_rates.STR}\n**INT**: +${spiritRoot.growth_rates.INT}\n**DEX**: +${spiritRoot.growth_rates.DEX}\n**VIT**: +${spiritRoot.growth_rates.VIT}\n**LUK**: +${spiritRoot.growth_rates.LUK}`,
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

// Tự động học kỹ năng ban đầu cho Luyện Khí
function autoLearnInitialSkills(player) {
  const fs = require('fs');
  const path = require('path');

  try {
    const skillsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/skills.json'), 'utf8'));
    const learnedSkills = [];

    // Lấy kỹ năng của linh căn và tu vi Luyện Khí
    const spiritRoot = player.spiritRoot;
    const realm = 'luyen_khi';
    const realmSkills = skillsData[`${spiritRoot}_skills`][realm] || [];

    // Khởi tạo skills nếu chưa có
    if (!player.skills) {
      player.skills = {};
    }

    // Học tất cả kỹ năng Luyện Khí
    realmSkills.forEach(skill => {
      // Kiểm tra xem đã học chưa
      if (!player.skills[skill.id]) {
        // Kiểm tra điều kiện học (tu vi và cấp độ)
        if (skill.required_realm === realm &&
          skill.required_level <= player.realmLevel &&
          skill.required_spirit_root === spiritRoot) {

          // Học kỹ năng
          player.skills[skill.id] = {
            learned_at: new Date().toISOString()
          };

          learnedSkills.push(skill);
          console.log(`Auto-learned initial skill: ${skill.name} for player ${player.username}`);
        }
      }
    });

    // Lưu player data
    const playerManager = require('./src/systems/player.js');
    playerManager.savePlayers();

    return learnedSkills;
  } catch (error) {
    console.error('Error auto-learning initial skills:', error);
    return [];
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