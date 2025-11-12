/**
 * Turn Manager - Turn management and initiative calculation
 * Handles turn transitions, initiative, and turn start effects
 */

const { updateStatusEffects, applyRegeneration } = require('./StatusEffects');
const Logger = require('../../utils/core/logger');
const { getApForRealm } = require('./CombatHelpers');

/**
 * Get effective speed (base speed - slow effects)
 * @param {Object} entity - Entity to calculate speed for
 * @returns {number} Effective speed
 */
function getEffectiveSpeed(entity) {
  const baseSpeed = parseFloat(entity.stats?.speed || 0);
  const slowEffect = (entity.statusEffects || []).find(e => e.type === 'slow');
  if (slowEffect && slowEffect.value) {
    return Math.max(1, baseSpeed * (1 - slowEffect.value));
  }
  return baseSpeed;
}

/**
 * Calculate initiative based on speed (new system)
 * @param {Object} combat - Combat object
 */
function calculateInitiative(combat) {
  // Dùng effective speed (đã tính slow)
  const playerSpeed = getEffectiveSpeed(combat.player);
  const monsterSpeed = getEffectiveSpeed(combat.monster);

  // Tìm speed thấp nhất để làm mốc
  const minSpeed = Math.min(playerSpeed, monsterSpeed);

  // Tính bonus AP cho người chơi
  const speedRatio = playerSpeed / minSpeed;
  let apBonus = 0;
  // Cho phép cộng tối đa +4 AP từ speed advantage
  if (speedRatio >= 5) {
    apBonus = 4;
  } else if (speedRatio >= 4) {
    apBonus = 3;
  } else if (speedRatio >= 3) {
    apBonus = 2;
  } else if (speedRatio >= 2) {
    apBonus = 1;
  }

  // Tính bonus action cho quái
  const monsterSpeedRatio = monsterSpeed / minSpeed;
  let actionBonus = 0;
  // Giữ nguyên cơ chế action bonus cho quái (có thể điều chỉnh về sau)
  if (monsterSpeedRatio >= 4) {
    actionBonus = 3;
  } else if (monsterSpeedRatio >= 3) {
    actionBonus = 2;
  } else if (monsterSpeedRatio >= 2) {
    actionBonus = 1;
  }

  // Lưu bonus vào combat
  combat.playerApBonus = apBonus;
  combat.monsterActionBonus = actionBonus;
  combat.playerApMax = getApForRealm(combat.player.realm) + apBonus;
  combat.playerAp = combat.playerApMax;

  // Cập nhật AP cho player object
  combat.player.apBonus = apBonus;
  combat.player.apMax = combat.playerApMax;
  combat.player.ap = combat.playerAp;

  // Xác định ai đi trước (người luôn thắng khi cùng speed)
  combat.currentTurn = playerSpeed >= monsterSpeed ? 'player' : 'monster';

  Logger.info('Initiative calculated', {
    playerSpeed,
    monsterSpeed,
    minSpeed,
    speedRatio: speedRatio.toFixed(2),
    monsterSpeedRatio: monsterSpeedRatio.toFixed(2),
    apBonus,
    actionBonus,
    currentTurn: combat.currentTurn
  });

  combat.battleLog.push(`🎲 **Initiative**: ${combat.currentTurn === 'player' ? 'Bạn' : combat.monster.name} đi trước!`);
  if (apBonus > 0) {
    combat.battleLog.push(`⚡ **Speed Advantage**: Bạn +${apBonus} AP`);
  }
  if (actionBonus > 0) {
    combat.battleLog.push(`⚡ **Speed Advantage**: ${combat.monster.name} +${actionBonus} action`);
  }
}

/**
 * Process turn start effects (stun, DoT, etc.)
 * @param {Object} combat - Combat object
 */
function processTurnStartEffects(combat) {
  // Skip lượt nếu entity bị stun
  if (combat.currentTurn === 'player') {
    const p = combat.player;
    const stunIdx = (p.statusEffects || []).findIndex(e => e.type === 'stun');
    if (stunIdx !== -1) {
      // Giảm 1 lượt stun và chuyển lượt cho quái
      p.statusEffects[stunIdx].duration -= 1;
      if (p.statusEffects[stunIdx].duration <= 0) p.statusEffects.splice(stunIdx, 1);
      combat.battleLog.push(`⛔ ${p.name} bị choáng và bỏ lượt`);
      // Đánh dấu skip để nextTurn xử lý tiếp
      combat._skipTurn = true;
      return;
    }
  } else if (combat.currentTurn === 'monster') {
    const m = combat.monster;
    const stunIdx = (m.statusEffects || []).findIndex(e => e.type === 'stun');
    if (stunIdx !== -1) {
      m.statusEffects[stunIdx].duration -= 1;
      if (m.statusEffects[stunIdx].duration <= 0) m.statusEffects.splice(stunIdx, 1);
      combat.battleLog.push(`⛔ ${m.name} bị choáng và bỏ lượt`);
      combat._skipTurn = true;
      return;
    }
  }
}

/**
 * Advance to next turn
 * @param {Object} combat - Combat object
 */
function nextTurn(combat) {
  combat.currentTurn = combat.currentTurn === 'player' ? 'monster' : 'player';

  // Kiểm tra hiệu ứng gây skip/DoT/Per-turn ngay đầu lượt
  processTurnStartEffects(combat);
  // Nếu có đánh dấu skip từ stun → chuyển tiếp sang lượt kế tiếp ngay
  if (combat._skipTurn) {
    combat._skipTurn = false;
    return nextTurn(combat);
  }

  if (combat.currentTurn === 'player') {
    combat.turn++;

    // Tính lại initiative với effective speed (đã tính slow) để tính AP bonus mới
    const playerEffectiveSpeed = getEffectiveSpeed(combat.player);
    const monsterEffectiveSpeed = getEffectiveSpeed(combat.monster);
    const minSpeed = Math.min(playerEffectiveSpeed, monsterEffectiveSpeed);
    const speedRatio = playerEffectiveSpeed / minSpeed;

    // Tính lại AP bonus dựa trên effective speed
    let apBonus = 0;
    if (speedRatio >= 5) {
      apBonus = 4;
    } else if (speedRatio >= 4) {
      apBonus = 3;
    } else if (speedRatio >= 3) {
      apBonus = 2;
    } else if (speedRatio >= 2) {
      apBonus = 1;
    }

    // Cập nhật AP với bonus mới
    combat.playerApBonus = apBonus;
    combat.playerApMax = getApForRealm(combat.player.realm) + apBonus;
    combat.playerAp = combat.playerApMax;

    // Log nếu bị slow
    const slowEffect = (combat.player.statusEffects || []).find(e => e.type === 'slow');
    if (slowEffect && slowEffect.value) {
      const baseSpeed = parseFloat(combat.player.stats.speed || 0);
      const reducedSpeed = baseSpeed * (1 - slowEffect.value);
      combat.battleLog.push(`🐌 ${combat.player.name} bị chậm → SPD: ${baseSpeed.toFixed(0)} → ${reducedSpeed.toFixed(0)} (AP bonus: ${apBonus})`);
    }

    // reset quota hành động mỗi lượt cho người chơi
    combat.turnActions = { attacked: false, usedSkill: false, usedWeaponSkill: false, defended: false };
    // Reset defended flag cho player trong solo combat
    combat.player.defended = false;
    // giảm cooldown theo lượt cho kỹ năng người chơi
    Object.keys(combat.playerCooldowns || {}).forEach(id => {
      const left = Math.max(0, (combat.playerCooldowns[id] || 0) - 1);
      if (left <= 0) {
        delete combat.playerCooldowns[id];
      } else {
        combat.playerCooldowns[id] = left;
      }
    });

    Logger.info('Player turn started', {
      turn: combat.turn,
      ap: combat.playerAp,
      apMax: combat.playerApMax,
      apBonus: combat.playerApBonus || 0
    });
  } else {
    // lượt quái: reset AP quái (dự phòng nếu dùng về sau)
    combat.monsterAp = 1;

    Logger.info('Monster turn started', {
      turn: combat.turn,
      actionBonus: combat.monsterActionBonus || 0
    });
  }

  // Giảm duration của status effects
  updateStatusEffects(combat.player);
  updateStatusEffects(combat.monster);

  // Hồi phục HP/MP mỗi turn
  applyRegeneration(combat.player);
  applyRegeneration(combat.monster);
}

/**
 * Maybe advance turn if conditions are met
 * @param {Object} combat - Combat object
 * @param {Object} interaction - Discord interaction
 * @returns {Promise<void>}
 */
async function maybeAdvanceTurn(combat, interaction) {
  const apLeft = combat.playerAp || 0;
  const attacked = combat.turnActions?.attacked || false;
  const usedSkill = combat.turnActions?.usedSkill || false;

  console.log(`[maybeAdvanceTurn] AP: ${apLeft}, Attacked: ${attacked}, UsedSkill: ${usedSkill}`);

  if (apLeft <= 0 || (attacked && usedSkill)) {
    console.log(`[maybeAdvanceTurn] Advancing turn - AP: ${apLeft}, Attacked: ${attacked}, UsedSkill: ${usedSkill}`);
    nextTurn(combat);
    // Note: UI update should be handled by caller
    // This function only manages turn logic
  }
}

module.exports = {
  getEffectiveSpeed,
  calculateInitiative,
  processTurnStartEffects,
  nextTurn,
  maybeAdvanceTurn
};

