const { EmbedBuilder } = require('discord.js');
const playerManager = require('../../systems/player.js');
const cooldownManager = require('../../utils/game/cooldown.js');
const expCalculator = require('../../systems/exp-calculator.js');
const SpiritStonesCalculator = require('../../utils/game/spirit-stones-calculator.js');
const monsterManager = require('../../systems/monster.js');
const combatSystem = require('../../systems/combat.js');

module.exports = {
  name: 'dungeon',
  aliases: ['dg', 'hamnguc', 'underground'],
  description: 'Khám phá hầm ngục để tìm kiếm kho báu và đánh bại quái vật',
  cooldown: 21600000, // 6h = 21600000ms

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
    const cooldownCheck = cooldownManager.checkCooldown(player, 'dungeon', this.cooldown);
    if (cooldownCheck.isOnCooldown) {
      const cooldownEmbed = cooldownManager.createCooldownEmbed('dungeon', cooldownCheck.remainingText);
      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    // Tạo danh sách quái cho nhiều ải (3 ải mặc định)
    const tier = monsterManager.getPlayerEquivalentTier(player.realm, player.realmLevel);
    const waveCount = 3;
    const monsters = [];
    for (let i = 0; i < waveCount; i++) {
      const m = await monsterManager.generateRandomMonster(tier, player);
      monsters.push(m);
    }

    // Khởi tạo combat theo cơ chế nhiều ải
    // Gắn thông tin người chơi cần thiết
    player.id = userId;
    player.username = username;
    const combat = combatSystem.startWaveCombat(player, monsters, interaction);

    // Gửi UI đầu tiên
    const ui = combatSystem.createCombatUI(combat);
    const reply = await interaction.reply({ ...ui, fetchReply: true });
    combat.lastMessage = reply;

    // Nếu quái đi trước, cho hành động ngay
    if (combat.currentTurn === 'monster') {
      setTimeout(async () => {
        try { await combatSystem.performMonsterTurn(combat); } catch (e) { console.error(e); }
      }, 800);
    }
  },

  /**
   * Lấy chiến lợi phẩm từ hầm ngục
   * @returns {Array} Danh sách chiến lợi phẩm
   */
  getDungeonLoot() {
    const loot = [
      '⚔️ Vũ khí ma thuật', '🛡️ Giáp trụ bảo vệ',
      '🔮 Pha lê ma lực', '💎 Đá quý hiếm',
      '🌿 Thảo dược ma thuật', '📜 Bí kíp tu luyện',
      '🏺 Bình thuốc ma thuật', '🎭 Trang phục ma thuật'
    ];

    const count = Math.floor(Math.random() * 3) + 2; // 2-4 chiến lợi phẩm
    const selected = [];

    for (let i = 0; i < count; i++) {
      const item = loot[Math.floor(Math.random() * loot.length)];
      if (!selected.includes(item)) {
        selected.push(item);
      }
    }

    return selected;
  }
};
