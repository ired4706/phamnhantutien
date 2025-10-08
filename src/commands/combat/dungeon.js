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

    // Tạo danh sách quái cho nhiều ải (3 ải mặc định) với cơ chế endurance
    const tier = monsterManager.getPlayerEquivalentTier(player.realm, player.realmLevel);
    const waveCount = 3;
    const monsters = [];

    for (let i = 0; i < waveCount; i++) {
      const m = await this.generateDungeonMonster(tier, player, i === waveCount - 1); // Boss cuối
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
   * Tạo monster cho dungeon với cơ chế endurance
   * @param {string} tier - Tier của monster
   * @param {Object} player - Player object
   * @param {boolean} isBoss - Có phải boss cuối không
   * @returns {Object} Monster object
   */
  async generateDungeonMonster(tier, player, isBoss = false) {
    // Tỉ lệ xuất hiện quái cho dungeon
    const selectDungeonVariant = () => {
      if (isBoss) {
        // Boss cuối chắc chắn là Mutated hoặc Super
        return Math.random() < 0.7 ? "mutated" : "super_mutated";
      }

      const random = Math.random();
      if (random < 0.5) return "normal";      // 50%
      else if (random < 0.9) return "mutated"; // 40%
      else return "super_mutated";             // 10%
    };

    // Tạo monster cơ bản
    const monster = await monsterManager.generateRandomMonster(tier, player);
    const variant = selectDungeonVariant();

    // Áp dụng cơ chế endurance cho dungeon
    const enduranceMultiplier = {
      hp: 1.3 + Math.random() * 0.2, // 1.3-1.5x HP
      def: 1.1 + Math.random() * 0.05, // +10-15% DEF
      atk: 1.0, // Giữ nguyên ATK
      speed: 1.0, // Giữ nguyên Speed
      regen: 1.0, // Giữ nguyên Regen
      mp: 1.0 // Giữ nguyên MP
    };

    // Cập nhật stats với endurance
    monster.stats.hp = Math.round(monster.stats.hp * enduranceMultiplier.hp);
    monster.stats.maxHp = monster.stats.hp;
    monster.stats.defense = Math.round(monster.stats.defense * enduranceMultiplier.def);

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
