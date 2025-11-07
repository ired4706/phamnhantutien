const playerManager = require('../../systems/player.js');
const itemLoader = require('../../utils/data/item-loader.js');

module.exports = {
  name: 'funequip',
  aliases: ['unequip'],
  description: 'Tháo trang bị theo UID: funequip <uid>',

  async execute(interaction, args) {
    const userId = interaction.user.id;
    const player = await playerManager.getPlayer(userId);
    if (!player) {
      await interaction.reply({ content: '❌ Bạn chưa có nhân vật!', ephemeral: true });
      return;
    }
    const uid = (args && args[0]) ? String(args[0]).trim() : null;
    if (!uid) {
      await interaction.reply({ content: '❌ Vui lòng cung cấp UID: funequip <uid>', ephemeral: true });
      return;
    }

    const equipment = require('./equipment.js');
    
    // Tháo vũ khí nếu trùng UID slot weapon
    if (player.equipment && player.equipment.weapon && player.equipment.weapon.uid === uid) {
      // Gỡ chỉ số đã áp
      const applied = player.equipment.weapon._appliedCombatBonuses;
      if (applied) {
        equipment.applyCombatBonusesToPlayer(player, applied, { remove: true });
      }
      // Gỡ passives của vũ khí
      await equipment.applyEquipmentPassivesToPlayer(player, player.equipment.weapon, { remove: true });
      const info = itemLoader.getItemInfo(player.equipment.weapon.id);
      player.equipment.weapon = null;
      
      // Update set bonus (in case armor/pants/shoes changed)
      equipment.updateSetBonus(player);
      
      playerManager.savePlayers();
      // Đồng bộ PlayerService - cập nhật toàn bộ player object
      try {
        const { getContainer } = require('../../container/ServiceContainer');
        const container = getContainer();
        const playerService = container.get('playerService');
        // Cập nhật toàn bộ player object trong playerService.players Map
        const playerId = player.userId || player.id;
        playerService.players.set(playerId, JSON.parse(JSON.stringify(player)));
        // Lưu vào file
        await playerService.savePlayers();
      } catch (e) {
        console.warn('Sync to PlayerService failed (non-fatal):', e?.message || e);
      }
      await interaction.reply({ content: `✅ Đã tháo vũ khí: ${info?.emoji || '🗡️'} ${info?.name || uid}`, ephemeral: true });
      return;
    }

    // Tháo armor/pants/shoes/ring/pendant nếu trùng UID
    const slots = ['armor', 'pants', 'shoes', 'ring', 'pendant'];
    for (const slot of slots) {
      if (player.equipment && player.equipment[slot] && player.equipment[slot].uid === uid) {
        // Gỡ chỉ số đã áp
        const applied = player.equipment[slot]._appliedCombatBonuses;
        if (applied) {
          equipment.applyCombatBonusesToPlayer(player, applied, { remove: true });
        }
        // Gỡ passives của trang bị
        await equipment.applyEquipmentPassivesToPlayer(player, player.equipment[slot], { remove: true });
        const info = itemLoader.getItemInfo(player.equipment[slot].id);
        player.equipment[slot] = null;
        
        // Update set bonus (có thể đã thay đổi)
        equipment.updateSetBonus(player);
        
        playerManager.savePlayers();
        // Đồng bộ PlayerService - cập nhật toàn bộ player object
        try {
          const { getContainer } = require('../../container/ServiceContainer');
          const container = getContainer();
          const playerService = container.get('playerService');
          // Cập nhật toàn bộ player object trong playerService.players Map
          const playerId = player.userId || player.id;
          playerService.players.set(playerId, JSON.parse(JSON.stringify(player)));
          // Lưu vào file
          await playerService.savePlayers();
        } catch (e) {
          console.warn('Sync to PlayerService failed (non-fatal):', e?.message || e);
        }
        
        const slotNames = { 
          'armor': 'áo giáp', 
          'pants': 'quần', 
          'shoes': 'giày',
          'ring': 'nhẫn',
          'pendant': 'ngọc bội'
        };
        const slotName = slotNames[slot] || slot;
        await interaction.reply({ content: `✅ Đã tháo ${slotName}: ${info?.emoji || '🛡️'} ${info?.name || uid}`, ephemeral: true });
        return;
      }
    }

    await interaction.reply({ content: '⚠️ UID không trùng trang bị đang đeo.', ephemeral: true });
  }
};


