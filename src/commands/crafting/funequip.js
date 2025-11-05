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

    // Tháo vũ khí nếu trùng UID slot weapon
    if (player.equipment && player.equipment.weapon && player.equipment.weapon.uid === uid) {
      // Gỡ chỉ số đã áp
      const applied = player.equipment.weapon._appliedCombatBonuses;
      if (applied) {
        // Reuse mapping inline
        const s = player.stats || {};
        player.stats = {
          ...s,
          attack: (s.attack || 0) - (applied.attack || 0),
          defense: (s.defense || 0) - (applied.defense || 0),
          hp: (s.hp || 0) - (applied.hp || 0),
          maxHp: (s.maxHp || s.hp || 0) - (applied.hp || 0),
          mp: (s.mp || 0) - (applied.mp || 0),
          maxMp: (s.maxMp || s.mp || 0) - (applied.mp || 0),
          speed: (s.speed || 0) - (applied.speed || 0),
          regen: (s.regen || 0) - (applied.regen || 0),
          critical: (s.critical || 0) - (applied.critical || 0),
          evasion: (s.evasion || 0) - (applied.evasion || 0),
          accuracy: (s.accuracy || 0) - (applied.accuracy || 0),
          penetration: (s.penetration || 0) - (applied.penetration || 0)
        };
      }
      const info = itemLoader.getItemInfo(player.equipment.weapon.id);
      player.equipment.weapon = null;
      playerManager.savePlayers();
      // Đồng bộ PlayerService để lưu vào players.json ngay
      try {
        const { getContainer } = require('../../container/ServiceContainer');
        const container = getContainer();
        const playerService = container.get('playerService');
        await playerService.updatePlayer(player.userId || player.id, {
          'equipment.weapon': null,
          'stats': player.stats
        });
      } catch (e) {
        console.warn('Sync to PlayerService failed (non-fatal):', e?.message || e);
      }
      await interaction.reply({ content: `✅ Đã tháo vũ khí: ${info?.emoji || '🗡️'} ${info?.name || uid}`, ephemeral: true });
      return;
    }

    await interaction.reply({ content: '⚠️ UID không trùng trang bị đang đeo.', ephemeral: true });
  }
};


