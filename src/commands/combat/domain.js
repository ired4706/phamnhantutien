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

    // Subcommands: lesser / greater / grand / supreme / invite / accept / decline / start / status
    const action = (args && args[0]) ? String(args[0]).toLowerCase() : 'status';

    if (action === 'lesser') {
      const tierInfo = this.getDomainTierInfo('basic');
      const lobby = raidManager.getOrCreateLobbyByHost(userId, interaction.channel.id, { maxSize: 5 });
      lobby.selectedTier = 'basic';
      await interaction.reply({ content: `🌱 Đã chọn bậc bí cảnh: **${tierInfo.name}**\n💪 Độ khó: ${tierInfo.difficulty}\n\nDùng: fdomain invite @tên để mời người chơi.` });
      return;
    }

    if (action === 'greater') {
      const tierInfo = this.getDomainTierInfo('intermediate');
      const lobby = raidManager.getOrCreateLobbyByHost(userId, interaction.channel.id, { maxSize: 5 });
      lobby.selectedTier = 'intermediate';
      await interaction.reply({ content: `🌿 Đã chọn bậc bí cảnh: **${tierInfo.name}**\n💪 Độ khó: ${tierInfo.difficulty}\n\nDùng: fdomain invite @tên để mời người chơi.` });
      return;
    }

    if (action === 'grand') {
      const tierInfo = this.getDomainTierInfo('advanced');
      const lobby = raidManager.getOrCreateLobbyByHost(userId, interaction.channel.id, { maxSize: 5 });
      lobby.selectedTier = 'advanced';
      await interaction.reply({ content: `🌙 Đã chọn bậc bí cảnh: **${tierInfo.name}**\n💪 Độ khó: ${tierInfo.difficulty}\n\nDùng: fdomain invite @tên để mời người chơi.` });
      return;
    }

    if (action === 'supreme') {
      const tierInfo = this.getDomainTierInfo('supreme');
      const lobby = raidManager.getOrCreateLobbyByHost(userId, interaction.channel.id, { maxSize: 5 });
      lobby.selectedTier = 'supreme';
      await interaction.reply({ content: `☁️ Đã chọn bậc bí cảnh: **${tierInfo.name}**\n💪 Độ khó: ${tierInfo.difficulty}\n\nDùng: fdomain invite @tên để mời người chơi.` });
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
        await interaction.reply({ content: '❌ Bạn chưa có lobby. Chọn bậc bí cảnh bằng: fdomain lesser/greater/grand/supreme', flags: 64 });
        return;
      }
      if (!lobby.selectedTier) {
        await interaction.reply({ content: '❌ Chưa chọn bậc bí cảnh. Dùng: fdomain lesser/greater/grand/supreme', flags: 64 });
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

      // Kiểm tra item yêu cầu cho tất cả party members
      const itemCheck = this.checkPartyItems(party, lobby.selectedTier);
      if (!itemCheck.allHaveItems) {
        const missingList = itemCheck.missingItems.map(m => `- ${m.player}: thiếu ${m.item}`).join('\n');
        await interaction.reply({
          content: `❌ Một số thành viên thiếu item yêu cầu:\n${missingList}\n\nCần: **${itemCheck.requiredItemName}** cho mỗi người chơi.`,
          flags: 64
        });
        return;
      }

      const leader = party[0];
      const tierInfo = this.getDomainTierInfo(lobby.selectedTier);
      const waves = await this.generateDomainWaves(tierInfo, leader);

      const combat = combatSystem.startRaidCombat(party, waves, interaction);
      const ui = combatSystem.createRaidUI(combat);
      const reply = await interaction.reply({ ...ui, fetchReply: true });
      combat.lastMessage = reply;
      raidManager.destroyLobby(lobby.id);
      return;
    }

    // status hoặc không có action
    const lobby = raidManager.getLobbyByHost(userId) || raidManager.getOrCreateLobbyByHost(userId, interaction.channel.id, { maxSize: 5 });
    const tierInfo = lobby.selectedTier ? this.getDomainTierInfo(lobby.selectedTier) : null;
    const tierText = tierInfo ? `\n🎯 Bậc bí cảnh: **${tierInfo.emoji} ${tierInfo.name}** (${tierInfo.difficulty})\n📋 Item yêu cầu: **${tierInfo.requiredItemName}**` : '\n🎯 Chưa chọn bậc bí cảnh (dùng: fdomain lesser/greater/grand/supreme)';
    await interaction.reply({ content: `👥 Party: ${Array.from(lobby.party).map(uid => `<@${uid}>`).join(', ') || '—'} (${lobby.party.size}/${lobby.maxSize})${tierText}\n\nHDSD: fdomain lesser/greater/grand/supreme | invite @tên | accept | decline | start | status` });
  },


  /**
   * Lấy thông tin bậc bí cảnh
   * @param {string} tier - Tier key
   * @returns {Object} Tier info
   */
  getDomainTierInfo(tier) {
    const tiers = {
      'basic': {
        name: 'Thí Luyện Bí Cảnh',
        emoji: '🌱',
        difficulty: 'Sơ cấp',
        realm: 'luyen_khi',
        realmLevel: 10,
        requiredItemId: 'ban_do_thi_luyen',
        requiredItemName: 'Bản đồ Thí Luyện'
      },
      'intermediate': {
        name: 'Vấn Đạo Bí Cảnh',
        emoji: '🌿',
        difficulty: 'Trung cấp',
        realm: 'truc_co',
        realmLevel: 2,
        requiredItemId: 'ban_do_van_dao',
        requiredItemName: 'Bản đồ Vấn Đạo'
      },
      'advanced': {
        name: 'Huyết Nguyệt Bí Cảnh',
        emoji: '🌙',
        difficulty: 'Cao cấp',
        realm: 'ket_dan',
        realmLevel: 2,
        requiredItemId: 'ban_do_huyet_nguyet',
        requiredItemName: 'Bản đồ Huyết Nguyệt'
      },
      'supreme': {
        name: 'Thái Hư Bí Cảnh',
        emoji: '☁️',
        difficulty: 'Thượng cấp',
        realm: 'nguyen_anh',
        realmLevel: 2,
        requiredItemId: 'ban_do_thai_hu',
        requiredItemName: 'Bản đồ Thái Hư'
      }
    };

    return tiers[tier] || tiers['basic'];
  },

  /**
   * Kiểm tra xem player có item yêu cầu cho domain không
   * @param {Object} player - Player object
   * @param {string} tier - Tier key
   * @returns {boolean} Có item hay không
   */
  hasRequiredItem(player, tier) {
    const tierInfo = this.getDomainTierInfo(tier);
    const requiredItemId = tierInfo.requiredItemId;
    const requiredItemName = tierInfo.requiredItemName;

    // Kiểm tra trong inventory của player
    if (!player.inventory) return false;
    // Hỗ trợ 2 dạng: inventory.items (mặc định) hoặc inventory là mảng đơn giản
    const items = Array.isArray(player.inventory?.items) ? player.inventory.items : (Array.isArray(player.inventory) ? player.inventory : []);
    return items.some(item => {
      const idMatch = (item.id === requiredItemId);
      const nameMatch = (item.name === requiredItemName);
      const qty = typeof item.quantity === 'number' ? item.quantity : (typeof item.qty === 'number' ? item.qty : 0);
      return (idMatch || nameMatch) && qty > 0;
    });
  },

  /**
   * Kiểm tra tất cả party members có item yêu cầu không
   * @param {Array} party - Array of players
   * @param {string} tier - Tier key
   * @returns {Object} Kết quả kiểm tra
   */
  checkPartyItems(party, tier) {
    const tierInfo = this.getDomainTierInfo(tier);
    const requiredItemId = tierInfo.requiredItemId;
    const requiredItemName = tierInfo.requiredItemName;
    const missingItems = [];

    for (const player of party) {
      if (!this.hasRequiredItem(player, tier)) {
        missingItems.push({
          player: player.username || player.id,
          item: requiredItemName
        });
      }
    }

    return {
      allHaveItems: missingItems.length === 0,
      missingItems: missingItems,
      requiredItemId: requiredItemId,
      requiredItemName: requiredItemName
    };
  },

  /**
   * Tạo monster cho domain với tỉ lệ mới
   * @param {Object} tierInfo - Thông tin bậc bí cảnh
   * @param {Object} player - Player object
   * @param {boolean} isBoss - Có phải boss không
   * @returns {Object} Monster object
   */
  async generateDomainMonster(tierInfo, player, isBoss = false) {
    // Tỉ lệ xuất hiện quái cho domain
    const selectDomainVariant = () => {
      if (isBoss) {
        // Boss sẽ được thiết kế riêng sau
        return "normal"; // Tạm thời
      }

      const random = Math.random();
      if (random < 0.4) return "normal";      // 40%
      else if (random < 0.9) return "mutated"; // 50%
      else return "super_mutated";             // 10%
    };

    // Tạo monster với cấp độ tương ứng bậc bí cảnh
    const monster = await monsterManager.generateRandomMonster(
      monsterManager.getPlayerEquivalentTier(tierInfo.realm, tierInfo.realmLevel),
      player
    );

    const variant = selectDomainVariant();

    // Cập nhật tên variant
    const variantNames = {
      "normal": "",
      "mutated": " Biến Dị",
      "super_mutated": " Siêu Biến Dị"
    };

    monster.name = monster.name + variantNames[variant];

    // Thêm prefix cho boss
    if (isBoss) {
      monster.name = "👑 " + monster.name + " (BOSS)";
    }

    return monster;
  },

  /**
   * Tạo các ải cho domain
   * @param {Object} tierInfo - Thông tin bậc bí cảnh
   * @param {Object} leader - Leader player
   * @returns {Array} Array of waves
   */
  async generateDomainWaves(tierInfo, leader) {
    const waves = [];

    // 2 ải đầu: 3 quái thường
    for (let w = 0; w < 2; w++) {
      const monsters = [];
      for (let i = 0; i < 3; i++) {
        const monster = await this.generateDomainMonster(tierInfo, leader, false);
        // Apply domain monster modifiers (non-boss)
        const hpMul = 1.15 + Math.random() * 0.10; // 1.15 - 1.25
        const defMul = 1.05 + Math.random() * 0.05; // +5% - +10%
        const atkMul = 1.05 + Math.random() * 0.05; // +5% - +10%
        monster.stats.hp = Math.round(monster.stats.hp * hpMul);
        monster.stats.maxHp = monster.stats.hp;
        monster.stats.defense = Math.round(monster.stats.defense * defMul);
        monster.stats.attack = Math.round(monster.stats.attack * atkMul);
        monsters.push(monster);
      }
      waves.push(monsters);
    }

    // Ải cuối: 1 boss + 2 quái phụ (boss lấy từ domain-bosses.json)
    const boss = await this.generateDomainBoss(tierInfo, leader);
    // Apply boss modifiers
    const bossHpMul = 5 + Math.random() * 2; // x5 - x7
    const bossAtkMul = 1.5 + Math.random() * 0.5; // x1.5 - x2
    const bossDefMul = 1.5 + Math.random() * 0.5; // x1.5 - x2
    boss.stats.hp = Math.round(boss.stats.hp * bossHpMul);
    boss.stats.maxHp = boss.stats.hp;
    boss.stats.attack = Math.round(boss.stats.attack * bossAtkMul);
    boss.stats.defense = Math.round(boss.stats.defense * bossDefMul);
    const add1 = await this.generateDomainMonster(tierInfo, leader, false);
    const add2 = await this.generateDomainMonster(tierInfo, leader, false);
    waves.push([boss, add1, add2]);

    return waves;
  },

  /**
   * Tạo boss theo bậc từ data/monsters/domain-bosses.json
   */
  async generateDomainBoss(tierInfo, leader) {
    const fs = require('fs');
    const path = require('path');
    const bossPath = path.join(__dirname, '../../../data/monsters/domain-bosses.json');
    let db;
    try {
      db = JSON.parse(fs.readFileSync(bossPath, 'utf8'));
    } catch (e) {
      console.error('Cannot load domain-bosses.json', e);
      // fallback: generate normal boss
      const fallback = await this.generateDomainMonster(tierInfo, leader, true);
      return fallback;
    }

    const key = tierInfo.realm === 'luyen_khi' ? 'basic'
      : tierInfo.realm === 'truc_co' ? 'intermediate'
        : tierInfo.realm === 'ket_dan' ? 'advanced'
          : 'supreme';

    const list = Array.isArray(db[key]) ? db[key] : [];
    if (list.length === 0) {
      const fallback = await this.generateDomainMonster(tierInfo, leader, true);
      return fallback;
    }

    const chosen = list[Math.floor(Math.random() * list.length)];

    // Tạo stat base theo bậc
    const monsterManager = require('../../systems/monster.js');
    const template = { id: chosen.id, name: chosen.name, emoji: '👑' };
    const tierKey = monsterManager.getPlayerEquivalentTier(tierInfo.realm, tierInfo.realmLevel);
    const statsObj = await monsterManager.calculateMonsterStats(leader, template, { key: tierKey }, 'mutated');

    const boss = {
      id: chosen.id,
      name: `👑 ${chosen.name} (BOSS)`,
      element: Array.isArray(chosen.elements) && chosen.elements.length > 0 ? chosen.elements[0] : 'vo_he',
      stats: statsObj.stats || statsObj,
      currentHp: (statsObj.stats || statsObj).hp,
      currentMp: (statsObj.stats || statsObj).mp,
      statusEffects: [],
      cooldowns: {},
      bossSkills: (chosen.skills || []).map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        description: s.description,
        // chuẩn hóa tối thiểu để AI dùng được cùng pipeline
        cost: s.effects?.mana_cost || 20,
        damage: s.effects?.damage || 0,
        effects: s.effects || []
      }))
    };

    return boss;
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
