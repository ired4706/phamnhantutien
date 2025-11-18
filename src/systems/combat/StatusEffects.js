/**
 * Status Effects - Buffs, debuffs, and status effect management
 * Handles all status effect application and updates
 */

/**
 * Apply buffs to caster from skill
 * @param {Object} caster - Entity casting the skill
 * @param {Object} skill - Skill object with effects
 * @returns {string} Log message
 */
function applyBuffsFromSkill(caster, skill) {
  const e = skill.effects || {};
  const duration = e.duration || 2;
  let log = '';
  const casterName = caster.name || 'Unknown';

  if (e.defense_bonus) {
    caster.statusEffects.push({ type: 'defense_bonus', duration, value: e.defense_bonus });
    log += `🔺 **${casterName}** DEF **+${Math.round(e.defense_bonus * 100)}%** (${duration} lượt)`;
  }
  if (e.attack_bonus) {
    caster.statusEffects.push({ type: 'attack_boost', duration, value: e.attack_bonus });
    log += `🔺 **${casterName}** ATK **+${Math.round(e.attack_bonus * 100)}%** (${duration} lượt)`;
  }
  if (e.critical_bonus) {
    caster.statusEffects.push({ type: 'crit_boost', duration, value: e.critical_bonus });
    log += `🔺 **${casterName}** CRIT **+${Math.round(e.critical_bonus * 100)}%** (${duration} lượt)`;
  }
  if (e.speed_bonus) {
    caster.statusEffects.push({ type: 'speed_bonus', duration, value: e.speed_bonus });
    log += `🔺 **${casterName}** SPD **+${Math.round(e.speed_bonus * 100)}%** (${duration} lượt)`;
  }
  if (e.evade_next) {
    caster.statusEffects.push({ type: 'evade_next', duration: 1 });
    log += `💨 **${casterName}** né đòn kế tiếp`;
  }
  if (e.status_immunity_next) {
    caster.statusEffects.push({ type: 'status_immunity_next', duration: 1 });
    log += `🛡️ **${casterName}** miễn nhiễm hiệu ứng xấu kế tiếp`;
  }
  if (e.instant_heal_ratio) {
    const heal = (caster.stats.hp || 0) * e.instant_heal_ratio;
    caster.currentHp = Math.min(caster.stats.hp, (caster.currentHp || 0) + heal);
    log += `🔰 **${casterName}** hồi **${heal.toFixed(1)} HP**`;
  }
  if (e.per_turn_aoe_atk_ratio) {
    caster.statusEffects.push({ type: 'per_turn_aoe_atk_ratio', duration, value: e.per_turn_aoe_atk_ratio });
    log += `✨ **${casterName}** kích hoạt ATK (AOE) **${Math.round(e.per_turn_aoe_atk_ratio * 100)}%** (${duration} lượt)`;
  }
  if (e.regen_bonus) {
    caster.statusEffects.push({ type: 'regen_bonus', duration, value: e.regen_bonus });
    log += `🔺 **${casterName}** REGEN **+${Math.round(e.regen_bonus * 100)}%** (${duration} lượt)`;
  }
  if (e.taunt) {
    caster.statusEffects.push({ type: 'taunt', duration: e.taunt });
    log += `🛡️ **${casterName}** khiêu khích (${e.taunt} lượt)`;
  }
  return log;
}

/**
 * Apply debuffs to target from skill
 * @param {Object} caster - Entity casting the skill
 * @param {Object} target - Target entity
 * @param {Object} skill - Skill object with effects
 * @returns {string} Log message
 */
function applyDebuffsFromSkill(caster, target, skill) {
  const e = skill.effects || {};
  let log = '';
  const duration = e.duration || e.enemy_slow_duration || 2;
  const targetName = target.name || 'Unknown';

  // Nếu mục tiêu có miễn nhiễm hiệu ứng → chặn 1 lần
  const immIdx = (target.statusEffects || []).findIndex(x => x.type === 'status_immunity_next');
  const guard = () => {
    if (immIdx !== -1) {
      try {
        target.statusEffects.splice(immIdx, 1);
      } catch { }
      return true;
    }
    return false;
  };

  if (e.enemy_attack_down) {
    if (!guard()) {
      target.statusEffects.push({ type: 'attack_debuff', duration, value: e.enemy_attack_down });
      log += `🔻 **${targetName}** ATK **-${Math.round(e.enemy_attack_down * 100)}%** (${duration} lượt)`;
    } else {
      log += `🛡️ **${targetName}** miễn nhiễm hiệu ứng xấu`;
    }
  }
  if (e.team_damage_reduction && caster.party) {
    // Áp lên cả team caster trong raid
    (caster.party || []).forEach(p => p.statusEffects.push({ type: 'damage_reduction', duration, value: e.team_damage_reduction }));
    log += `🔻 Toàn đội giảm sát thương **-${Math.round(e.team_damage_reduction * 100)}%** (${duration} lượt)`;
  }
  if (e.enemy_slow_pct) {
    if (!guard()) {
      target.statusEffects.push({ type: 'slow', duration: e.enemy_slow_duration || duration, value: e.enemy_slow_pct });
      log += `🔻 **${targetName}** SPD **-${Math.round(e.enemy_slow_pct * 100)}%** (${e.enemy_slow_duration || duration} lượt)`;
    } else {
      log += `🛡️ **${targetName}** miễn nhiễm hiệu ứng xấu`;
    }
  }
  if (e.stun_chance) {
    if (!guard()) {
      if (Math.random() < (e.stun_chance || 0)) {
        target.statusEffects.push({ type: 'stun', duration: e.stun_duration || 1 });
        log += `⛔ **${targetName}** bị choáng (${e.stun_duration || 1} lượt)`;
      }
    } else {
      log += `🛡️ **${targetName}** miễn nhiễm choáng`;
    }
  }
  if (e.poison_regen_ratio) {
    // Ghi sẵn sát thương mỗi lượt dựa theo regen hiện tại của caster
    const dot = (caster.stats.regen || 0) * e.poison_regen_ratio;
    if (!guard()) {
      target.statusEffects.push({ type: 'poison', duration, dot });
      log += `☠️ **${targetName}** bị độc (${duration} lượt)`;
    } else {
      log += `🛡️ **${targetName}** miễn nhiễm độc`;
    }
  }
  if (e.burn_ratio_of_atk) {
    const dot = (caster.stats.attack || 0) * e.burn_ratio_of_atk;
    if (!guard()) {
      target.statusEffects.push({ type: 'burn', duration: e.burn_duration || duration, dot });
      log += `🔥 **${targetName}** bị thiêu đốt (${e.burn_duration || duration} lượt)`;
    } else {
      log += `🛡️ **${targetName}** miễn nhiễm thiêu đốt`;
    }
  }
  if (e.damage_reduction) {
    target.statusEffects.push({ type: 'damage_reduction', duration, value: e.damage_reduction });
    log += `🔻 **${targetName}** sát thương **-${Math.round(e.damage_reduction * 100)}%** (${duration} lượt)`;
  }
  return log;
}

/**
 * Apply on-hit status effects
 * @param {Object} attacker - Attacker entity
 * @param {Object} defender - Defender entity
 * @param {Object} skill - Skill object
 * @param {Object} combat - Combat object
 */
function applyOnHitStatus(attacker, defender, skill, combat) {
  const e = skill.effects || {};
  // đã xử lý trong applyDebuffsFromSkill ở nhánh debuff; với attack skill, áp trực tiếp một số hiệu ứng
  if (e.stun_chance && Math.random() < e.stun_chance) {
    const immIdx = (defender.statusEffects || []).findIndex(x => x.type === 'status_immunity_next');
    if (immIdx === -1) {
      defender.statusEffects.push({ type: 'stun', duration: e.stun_duration || 1 });
      const defenderName = defender.name || 'Unknown';
      if (combat?.battleLog) combat.battleLog.push(`⛔ **${defenderName}** bị choáng (${e.stun_duration || 1} lượt)`);
    } else {
      try {
        defender.statusEffects.splice(immIdx, 1);
      } catch { }
    }
  }
}

/**
 * Update status effects duration (decrease by 1)
 * @param {Object} entity - Entity to update
 */
function updateStatusEffects(entity) {
  // Không cập nhật status cho thực thể đã chết
  if (!entity || entity.currentHp <= 0) {
    entity.statusEffects = [];
    return;
  }
  entity.statusEffects = entity.statusEffects.filter(effect => {
    effect.duration--;
    return effect.duration > 0;
  });
}

/**
 * Apply regeneration (HP/MP recovery per turn)
 * @param {Object} entity - Entity to apply regeneration
 */
function applyRegeneration(entity) {
  if (!entity || entity.currentHp <= 0) return; // Đã chết thì không hồi phục
  // Chỉ quái 'mutated' | 'super_mutated' hoặc boss mới được regen; người chơi luôn được regen
  const isPlayer = !!entity.userId;
  const isBoss = Array.isArray(entity.bossSkills) && entity.bossSkills.length > 0;
  const isMutated = entity.variant === 'mutated' || entity.variant === 'super_mutated';
  if (!isPlayer && !(isBoss || isMutated)) return;

  // Tính regen với bonus
  let regen = parseFloat(entity.stats?.regen) || 0;
  const regenBonus = (entity.statusEffects || []).filter(e => e.type === 'regen_bonus').reduce((s, e) => s + (e.value || 0), 0);
  if (regenBonus) regen *= (1 + regenBonus);

  // Áp DOT (burn/poison) trước khi hồi
  const dotSum = (entity.statusEffects || []).reduce((sum, e) => {
    if (e.type === 'burn' || e.type === 'poison') return sum + (e.dot || 0);
    return sum;
  }, 0);
  if (dotSum > 0) {
    entity.currentHp = Math.max(0, (entity.currentHp || 0) - dotSum);
  }

  const maxHp = parseFloat(entity.stats?.hp) || 0;
  const maxMp = parseFloat(entity.stats?.mp) || 0;
  entity.currentHp = Math.min(maxHp, (entity.currentHp || 0) + regen);
  entity.currentMp = Math.min(maxMp, (entity.currentMp || 0) + regen);
}

module.exports = {
  applyBuffsFromSkill,
  applyDebuffsFromSkill,
  applyOnHitStatus,
  updateStatusEffects,
  applyRegeneration
};

