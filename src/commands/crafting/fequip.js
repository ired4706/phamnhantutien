const equipment = require('./equipment.js');
const playerManager = require('../../systems/player.js');

module.exports = {
  name: 'fequip',
  aliases: ['equip'],
  description: 'Trang bị item theo UID: fequip <uid>',

  async execute(interaction, args) {
    const userId = interaction.user.id;
    const player = await playerManager.getPlayer(userId);
    if (!player) {
      await interaction.reply({ content: '❌ Bạn chưa có nhân vật!', ephemeral: true });
      return;
    }
    const uid = (args && args[0]) ? String(args[0]).trim() : null;
    if (!uid) {
      await interaction.reply({ content: '❌ Vui lòng cung cấp UID: fequip <uid>', ephemeral: true });
      return;
    }
    // Trang bị vũ khí nếu UID nằm trong weapons; nếu thuộc armors thì TODO: trang bị theo slot
    const inWeapons = Array.isArray(player.inventory?.weapons) && player.inventory.weapons.find(w => w.uid === uid);
    if (inWeapons) {
      await equipment.equipWeaponByUid(interaction, player, uid);
      return;
    }

    await interaction.reply({ content: '⚠️ UID không thuộc vũ khí. Trang bị các slot khác sẽ hỗ trợ sau.', ephemeral: true });
  }
};


