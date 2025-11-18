/**
 * Combat Actions - Player action handlers
 * Handles attack, defend, flee actions
 */

const { calculateDamage, getElementDamageMultiplier } = require('./DamageCalculator');

/**
 * Perform attack action
 * @param {Object} attacker - Attacker entity
 * @param {Object} defender - Defender entity
 * @param {Object} combat - Combat object
 * @returns {Object} Attack result { action, message, damage, isCritical }
 */
function performAttack(attacker, defender, combat) {
  // Evade-next: tiêu thụ để né đòn kế tiếp
  const evadeIdx = (defender.statusEffects || []).findIndex(e => e.type === 'evade_next');
  if (evadeIdx !== -1) {
    try {
      defender.statusEffects.splice(evadeIdx, 1);
    } catch { }
    return {
      action: 'attack',
      message: `💨 **${defender.name}** né tránh hoàn toàn`,
      damage: 0
    };
  }

  // Dùng ACC/EVA mới trong calculateDamage, nên bỏ hitChance cũ
  const dmgObj = calculateDamage(attacker, defender, undefined);
  if (!dmgObj.hit) {
    return {
      action: 'attack',
      message: `❌ **${attacker.name}** tấn công → **MISS**`,
      damage: 0
    };
  }

  // Nếu là người chơi và không trang bị vũ khí: áp dụng multiplier ngũ hành theo linh căn như skill
  let adjustedDamage = dmgObj.damage;
  if (attacker.userId && !(attacker.equipment && attacker.equipment.weapon)) {
    const newAttElm = attacker.spiritRoot || attacker.element || 'vo_he';
    const newDefElm = defender.spiritRoot || defender.element || 'vo_he';
    const newMul = getElementDamageMultiplier(newAttElm, newDefElm);
    const oldMul = Number.isFinite(dmgObj.elementMultiplier) ? dmgObj.elementMultiplier : 1;
    const ratio = (newMul > 0 && oldMul > 0) ? (newMul / oldMul) : 1;
    adjustedDamage *= ratio;
  }

  const finalDamage = isNaN(adjustedDamage) ? 1 : Math.max(1, adjustedDamage);

  defender.currentHp = Math.max(0, (defender.currentHp || 0) - finalDamage);

  const critText = dmgObj.isCritical ? ' **CRIT**' : '';
  const message = `⚔️ **${attacker.name}** tấn công → **${finalDamage.toFixed(1)}** sát thương${critText}`;

  return {
    action: 'attack',
    message: message,
    damage: finalDamage,
    isCritical: !!dmgObj.isCritical
  };
}

/**
 * Perform defend action
 * @param {Object} entity - Entity defending
 * @param {Object} combat - Combat object
 * @returns {Object} Defend result { action, message } or { success, message }
 */
function performDefend(entity, combat) {
  // Kiểm tra AP cho solo combat
  if (combat.playerAp < 1) {
    return { success: false, message: '❌ Không đủ AP để phòng thủ' };
  }

  // Kiểm tra đã phòng thủ chưa trong turn này
  if (combat.turnActions && combat.turnActions.defended) {
    return { success: false, message: '❌ Đã phòng thủ lượt này' };
  }

  // Kiểm tra cho raid combat - mỗi actor chỉ được phòng thủ 1 lần/turn
  if (combat.party && combat.party.includes(entity)) {
    if (entity.defended) {
      return { success: false, message: '❌ Đã phòng thủ lượt này' };
    }
    entity.defended = true;
  }

  // Giảm AP và đánh dấu đã phòng thủ (chỉ cho solo combat)
  if (combat.turnActions) {
    combat.playerAp -= 1;
    combat.turnActions.defended = true;
  }

  // Tăng defense cho lượt tiếp theo
  entity.statusEffects.push({
    type: 'defend',
    duration: 1,
    defenseBonus: 0.5 // +50% defense
  });

  return {
    action: 'defend',
    message: `🛡️ **${entity.name}** phòng thủ → DEF +50% (1 lượt)`
  };
}

/**
 * Perform flee action
 * @param {Object} combat - Combat object
 * @returns {Object} Flee result { action, message, combatEnd? }
 */
function performFlee(combat) {
  const fleeChance = 70; // 70% cơ hội chạy trốn
  const isSuccess = Math.random() * 100 < fleeChance;

  if (isSuccess) {
    combat.isActive = false;
    return {
      action: 'flee',
      message: `🏃 Chạy trốn thành công`,
      combatEnd: true
    };
  } else {
    return {
      action: 'flee',
      message: `❌ Chạy trốn thất bại`
    };
  }
}

module.exports = {
  performAttack,
  performDefend,
  performFlee
};

