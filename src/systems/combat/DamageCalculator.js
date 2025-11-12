/**
 * Damage Calculator - Damage calculation logic
 * Handles all damage calculations including crit, penetration, elemental multipliers
 */

const { REALM_CONFIG } = require('./CombatHelpers');

/**
 * Calculate damage based on new stat system
 * @param {Object} attacker - Attacker entity
 * @param {Object} defender - Defender entity
 * @param {boolean|undefined} isCritical - Force critical (optional)
 * @returns {Object} Damage result { hit, damage, isCritical, elementMultiplier }
 */
function calculateDamage(attacker, defender, isCritical) {
  const realm = attacker.realm || 'luyen_khi';
  const cfg = REALM_CONFIG[realm] || REALM_CONFIG.luyen_khi;

  const attack = parseFloat(attacker.stats.attack) || 0;
  const defense = parseFloat(defender.stats.defense) || 0;
  const acc = parseFloat(attacker.stats.accuracy) || 0;
  const eva = parseFloat(defender.stats.evasion) || 0;
  const pen = parseFloat(attacker.stats.penetration) || 0;

  let finalAttack = attack;
  let finalDefense = defense;

  // Apply attacker status effects
  attacker.statusEffects.forEach(effect => {
    if (effect.type === 'attack_boost') finalAttack *= (1 + effect.value);
    if (effect.type === 'attack_debuff') finalAttack *= Math.max(0, 1 - effect.value);
  });

  // Apply defender status effects
  defender.statusEffects.forEach(effect => {
    if (effect.type === 'defend') finalDefense *= (1 + effect.defenseBonus);
    if (effect.type === 'defense_bonus') finalDefense *= (1 + effect.value);
  });

  // Hit check ACC vs EVA
  // Base hit chance 70% (instead of 5%) for low-level play
  // Range 25% (instead of 95%) to allow variation based on ACC/EVA ratio
  // Add 10 to denominator to prevent extreme values when both are very low
  const accEvaRatio = acc / (acc + eva + 10);
  const hitChance = Math.min(Math.max(0.70 + 0.25 * accEvaRatio, 0.05), 0.95);
  if (Math.random() > hitChance) {
    return { hit: false, damage: 0, isCritical: false, elementMultiplier: 1 };
  }

  // Penetration reduces defender defense
  const penReduction = pen / (pen + cfg.PEN_BASE);
  const effectiveDEF = finalDefense * (1 - penReduction);
  let baseDamage = Math.max(1, finalAttack - effectiveDEF);

  // Crit using realm-specific Kcrit
  const critRating = parseFloat(attacker.stats.critical) || 0;
  const critChance = critRating / (critRating + cfg.Kcrit);
  const doCrit = (typeof isCritical === 'boolean') ? isCritical : (Math.random() < critChance);
  if (doCrit) {
    const CRIT_MIN = 1.4;
    const CRIT_MAX = 1.7;
    const critMultiplier = CRIT_MIN + Math.random() * (CRIT_MAX - CRIT_MIN);
    baseDamage *= critMultiplier;
  }

  // Apply damage reduction
  defender.statusEffects.forEach(effect => {
    if (effect.type === 'damage_reduction') {
      baseDamage *= Math.max(0, 1 - effect.value);
    }
  });

  // Apply elemental multiplier
  const attackerElement = (attacker.element || 'vo_he');
  const defenderElement = (defender.element || 'vo_he');
  const elementMultiplier = getElementDamageMultiplier(attackerElement, defenderElement);
  baseDamage *= elementMultiplier;

  // Validate final damage to prevent NaN
  const finalDamage = isNaN(baseDamage) ? 1 : Math.max(1, baseDamage);

  return { hit: true, damage: finalDamage, isCritical: !!doCrit, elementMultiplier };
}

/**
 * Elemental damage multiplier table (attacker -> defender)
 * @param {string} att - Attacker element
 * @param {string} def - Defender element
 * @returns {number} Damage multiplier
 */
function getElementDamageMultiplier(att, def) {
  const table = {
    kim: { kim: 1.0, moc: 1.25, thuy: 1.0, hoa: 0.80, tho: 1.0, phong: 1.0, loi: 1.0, vo_he: 1.0 },
    moc: { kim: 0.80, moc: 1.0, thuy: 1.0, hoa: 1.0, tho: 1.25, phong: 1.0, loi: 1.0, vo_he: 1.0 },
    thuy: { kim: 1.0, moc: 1.0, thuy: 1.0, hoa: 1.25, tho: 0.80, phong: 1.0, loi: 1.0, vo_he: 1.0 },
    hoa: { kim: 1.25, moc: 1.0, thuy: 0.80, hoa: 1.0, tho: 1.0, phong: 1.0, loi: 1.0, vo_he: 1.0 },
    tho: { kim: 1.0, moc: 0.80, thuy: 1.25, hoa: 1.0, tho: 1.0, phong: 1.0, loi: 1.0, vo_he: 1.0 },
    phong: { kim: 1.0, moc: 1.0, thuy: 1.0, hoa: 1.0, tho: 1.0, phong: 1.0, loi: 1.25, vo_he: 1.0 },
    loi: { kim: 1.0, moc: 1.0, thuy: 1.0, hoa: 1.0, tho: 1.0, phong: 1.25, loi: 1.0, vo_he: 1.0 },
    vo_he: { kim: 1.0, moc: 1.0, thuy: 1.0, hoa: 1.0, tho: 1.0, phong: 1.0, loi: 1.0, vo_he: 1.0 }
  };
  const a = (att in table) ? att : 'vo_he';
  const d = (def in table[a]) ? def : 'vo_he';
  return table[a][d];
}

/**
 * Check if attack is critical
 * @param {Object} attacker - Attacker entity
 * @returns {boolean} Is critical
 */
function checkCritical(attacker) {
  const realm = attacker.realm || 'luyen_khi';
  const cfg = REALM_CONFIG[realm] || REALM_CONFIG.luyen_khi;
  const critRating = parseFloat(attacker.stats.critical) || 0; // rating
  const critChance = critRating / (critRating + cfg.Kcrit);
  return Math.random() < critChance;
}

/**
 * Calculate hit chance (legacy - kept for compatibility)
 * @param {Object} attacker - Attacker entity
 * @param {Object} defender - Defender entity
 * @returns {number} Hit chance percentage
 */
function calculateHitChance(attacker, defender) {
  // EVA là phần trăm 0-100; clamp để tránh âm
  const evasion = Math.min(90, Math.max(0, parseFloat(defender.stats.evasion) || 0));
  const speed = Math.max(0, parseFloat(attacker.stats.speed) || 0);
  const speedBonus = Math.min(15, speed / 10);
  const hit = 85 - evasion + speedBonus; // base 85%
  return Math.min(95, Math.max(10, hit));
}

module.exports = {
  calculateDamage,
  getElementDamageMultiplier,
  checkCritical,
  calculateHitChance
};

