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
    // Trang bị vũ khí nếu UID nằm trong weapons
    const inWeapons = Array.isArray(player.inventory?.weapons) && player.inventory.weapons.find(w => w.uid === uid);
    if (inWeapons) {
      await equipment.equipWeaponByUid(interaction, player, uid);
      return;
    }

    // Trang bị armor/pants/shoes nếu UID nằm trong armors
    const inArmors = Array.isArray(player.inventory?.armors) && player.inventory.armors.find(a => a.uid === uid);
    if (inArmors) {
      const itemLoader = require('../../utils/data/item-loader.js');
      await itemLoader.loadAllItems();
      const itemInfo = itemLoader.getItemInfo(inArmors.id);
      
      if (!itemInfo) {
        await interaction.reply({ content: '❌ Không tìm thấy thông tin trang bị!', ephemeral: true });
        return;
      }

      // Xác định slot dựa trên type
      let slotType = null;
      if (itemInfo.type === 'armor') {
        slotType = 'armor';
      } else if (itemInfo.type === 'pants') {
        slotType = 'pants';
      } else if (itemInfo.type === 'shoes' || itemInfo.type === 'boots') {
        slotType = 'shoes';
      } else if (itemInfo.type === 'ring') {
        slotType = 'ring';
      } else if (itemInfo.type === 'pendant') {
        slotType = 'pendant';
      }

      if (slotType) {
        await equipment.equipEquipmentByUid(interaction, player, uid, slotType);
        return;
      }
    }

    await interaction.reply({ content: '❌ Không tìm thấy item với UID này hoặc item không thể trang bị!', ephemeral: true });
  }
};


