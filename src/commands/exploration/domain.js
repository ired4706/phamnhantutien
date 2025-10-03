const { EmbedBuilder } = require('discord.js');
const playerManager = require('../../systems/player.js');
const cooldownManager = require('../../utils/game/cooldown.js');
const expCalculator = require('../../systems/exp-calculator.js');
const SpiritStonesCalculator = require('../../utils/game/spirit-stones-calculator.js');
const monsterManager = require('../../systems/monster.js');
const combatSystem = require('../../systems/combat.js');
const raidManager = require('../../systems/raid.js');

module.exports = {
  name: 'domain',
  aliases: ['dm', 'lanhdia', 'territory'],
  description: 'Khám phá lãnh địa để tìm kiếm bảo vật và tài nguyên quý hiếm',
  cooldown: 28800000, // 8h = 28800000ms

  async execute(interaction, args) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Kiểm tra xem user đã bắt đầu game chưa
    if (!(await playerManager.hasStartedGame(userId))) {
      const notStartedEmbed = playerManager.createNotStartedEmbed();
      await interaction.reply({ embeds: [notStartedEmbed] });
      return;
    }

    const player = await playerManager.getPlayer(userId);
    const now = Date.now();

    // Kiểm tra cooldown sử dụng common manager
    const cooldownCheck = cooldownManager.checkCooldown(player, 'domain', this.cooldown);
    if (cooldownCheck.isOnCooldown) {
      const cooldownEmbed = cooldownManager.createCooldownEmbed('domain', cooldownCheck.remainingText);
      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Subcommands: create / invite / accept / decline / start / status
    const action = (args && args[0]) ? String(args[0]).toLowerCase() : 'status';

    if (action === 'create') {
      const lobby = raidManager.getOrCreateLobbyByHost(userId, interaction.channel.id, { maxSize: 5 });
      await interaction.reply({ content: `🏰 Lobby đã tạo. Host: <@${userId}>. Dùng: fdomain invite @tên để mời.` });
      return;
    }

    if (action === 'invite') {
      const mention = interaction.options?.getUser?.('user') || interaction.mentions?.users?.first?.() || null;
      const target = mention || (interaction.guild?.members?.cache?.find?.(m => args[1] && (m.user.username === args[1] || `<@${m.user.id}>` === args[1]))?.user) || null;
      if (!target) {
        await interaction.reply({ content: '❌ Vui lòng đề cập người cần mời: fdomain invite @tên', flags: 64 });
        return;
      }
      if (target.id === userId) {
        await interaction.reply({ content: '❌ Bạn không thể tự mời chính mình.', flags: 64 });
        return;
      }
      const lobby = raidManager.getOrCreateLobbyByHost(userId, interaction.channel.id, { maxSize: 5 });
      await interaction.reply({ content: `📨 <@${target.id}>, bạn có đồng ý tham gia RAID của <@${userId}>? Trả lời: fdomain accept hoặc fdomain decline`, allowedMentions: { users: [target.id] } });
      return;
    }

    if (action === 'accept') {
      const possibleHosts = Array.from(raidManager.hostToLobby.keys());
      let joined = false;
      for (const host of possibleHosts) {
        const lobby = raidManager.getLobbyByHost(host);
        if (lobby && lobby.channelId === interaction.channel.id) {
          const res = raidManager.joinLobby(lobby.id, userId);
          if (!res.ok) {
            await interaction.reply({ content: `❌ ${res.reason}`, flags: 64 });
            return;
          }
          await interaction.reply({ content: `✅ <@${userId}> đã tham gia RAID của <@${host}>!` });
          joined = true;
          break;
        }
      }
      if (!joined) {
        await interaction.reply({ content: '❌ Không tìm thấy lời mời RAID hợp lệ trong kênh này.', flags: 64 });
      }
      return;
    }

    if (action === 'decline') {
      await interaction.reply({ content: `🚫 <@${userId}> đã từ chối lời mời RAID.`, flags: 64 });
      return;
    }

    if (action === 'start') {
      const lobby = raidManager.getLobbyByHost(userId);
      if (!lobby) {
        await interaction.reply({ content: '❌ Bạn chưa có lobby. Tạo bằng: fdomain create', flags: 64 });
        return;
      }
      const partyUsers = Array.from(lobby.party);
      const party = partyUsers.map(uid => {
        const p = playerManager.getPlayer(uid);
        return { ...p, id: uid, username: p?.username || uid };
      }).filter(Boolean);
      if (party.length === 0) {
        await interaction.reply({ content: '❌ Party trống!', flags: 64 });
        return;
      }
      const leader = party[0];
      const tier = monsterManager.getPlayerEquivalentTier(leader.realm, leader.realmLevel);
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

      const combat = combatSystem.startRaidCombat(party, waves, interaction);
      const ui = combatSystem.createRaidUI(combat);
      const reply = await interaction.reply({ ...ui, fetchReply: true });
      combat.lastMessage = reply;
      raidManager.destroyLobby(lobby.id);
      return;
    }

    // status hoặc không có action
    const lobby = raidManager.getLobbyByHost(userId) || raidManager.getOrCreateLobbyByHost(userId, interaction.channel.id, { maxSize: 5 });
    await interaction.reply({ content: `👥 Party: ${Array.from(lobby.party).map(uid => `<@${uid}>`).join(', ') || '—'} (${lobby.party.size}/${lobby.maxSize})\nHDSD: fdomain create | invite @tên | accept | decline | start | status` });
  },

  /**
   * Lấy bảo vật từ lãnh địa
   * @returns {Array} Danh sách bảo vật
   */
  getDomainTreasures() {
    const treasures = [
      '👑 Vương miện cổ xưa', '🗡️ Kiếm thần thoại',
      '🛡️ Khiên bất tử', '🔮 Pha lê vũ trụ',
      '💎 Ngọc thần linh', '📜 Cuộn giấy bí mật',
      '🏺 Bình thuốc tiên', '🎭 Mặt nạ ma thuật'
    ];

    const count = Math.floor(Math.random() * 3) + 2; // 2-4 bảo vật
    const selected = [];

    for (let i = 0; i < count; i++) {
      const treasure = treasures[Math.floor(Math.random() * treasures.length)];
      if (!selected.includes(treasure)) {
        selected.push(treasure);
      }
    }

    return selected;
  }
};
