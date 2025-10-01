const { EmbedBuilder } = require('discord.js');
const playerManager = require('../../systems/player.js');
const expCalculator = require('../../systems/exp-calculator.js');
const cooldownManager = require('../../utils/game/cooldown.js');
const SpiritStonesCalculator = require('../../utils/game/spirit-stones-calculator.js');
const ItemDropCalculator = require('../../utils/game/item-drop-calculator.js');
const monsterManager = require('../../systems/monster.js');
const combatSystem = require('../../systems/combat.js');

module.exports = {
  name: 'hunt',
  aliases: ['h', 'sanyeu', 'hunting'],
  description: 'Săn yêu thú lấy tài nguyên',
  cooldown: 30000, // 30s = 30000ms

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
    const cooldownCheck = cooldownManager.checkCooldown(player, 'hunt', this.cooldown);
    if (cooldownCheck.isOnCooldown) {
      const cooldownEmbed = cooldownManager.createCooldownEmbed('hunt', cooldownCheck.remainingText);
      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    try {
      // Tạo quái dựa trên tu vi người chơi
      const monsterTier = monsterManager.getPlayerEquivalentTier(player.realm, player.realmLevel);
      const monster = await monsterManager.generateRandomMonster(monsterTier, player);

      // Thêm thông tin cần thiết vào player object
      player.id = userId;
      player.username = username;

      // Khởi tạo trận chiến turn-based
      const combat = combatSystem.startCombat(player, monster, interaction);

      // Tạo UI trận chiến
      const combatUI = combatSystem.createCombatUI(combat);
      const reply = await interaction.reply({ ...combatUI, fetchReply: true });

      // Lưu message để có thể edit sau này
      combat.lastMessage = reply;

      // Nếu quái vật đi trước theo initiative, cho quái hành động ngay
      if (combat.currentTurn === 'monster') {
        // Trễ nhẹ để người chơi kịp thấy UI ban đầu
        setTimeout(async () => {
          try {
            await combatSystem.performMonsterTurn(combat);
          } catch (e) {
            console.error('Error performing initial monster turn:', e);
          }
        }, 800);
      }

    } catch (error) {
      console.error('Error in hunt command:', error);
      await interaction.reply({
        content: '❌ Có lỗi xảy ra khi săn yêu thú!',
        flags: 64
      });
    }
  }
};
