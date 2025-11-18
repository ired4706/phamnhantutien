/**
 * Weapon System - Weapon skills and actions
 * Handles weapon menus, weapon actions, and weapon skill damage calculation
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { calculateDamage, getElementDamageMultiplier } = require('./DamageCalculator');
const { applyBuffsFromSkill, applyDebuffsFromSkill } = require('./StatusEffects');
const { getElementViName } = require('./CombatHelpers');

class WeaponSystem {
  constructor(weaponSkillsData) {
    this.weaponSkillsData = weaponSkillsData || {};
  }

  /**
   * Get weapon skill by type and tier
   * @param {string} weaponType - Weapon type
   * @param {number} tier - Skill tier
   * @returns {Object|null} Weapon skill or null
   */
  getWeaponSkill(weaponType, tier) {
    if (!this.weaponSkillsData || !weaponType) return null;
    const typeSkills = this.weaponSkillsData[weaponType];
    if (!typeSkills) return null;
    const tierKey = `tier_${tier}`;
    return typeSkills[tierKey] || null;
  }

  /**
   * Get tier multiplier based on rarity
   * @param {string} rarity - Item rarity
   * @returns {number} Tier multiplier
   */
  getTierMultiplier(rarity) {
    const multipliers = {
      'common': 1.0,      // Phàm
      'uncommon': 1.2,    // Huyền
      'rare': 1.44,       // Địa
      'epic': 1.75,       // Thiên
      'legendary': 2.0    // Thần
    };
    return multipliers[rarity] || 1.0;
  }

  /**
   * Calculate affinity multiplier between spirit root and weapon element
   * Ngũ hành tương sinh: Mộc → Hỏa → Thổ → Kim → Thủy → Mộc
   * Ngũ hành tương khắc: Mộc → Thổ → Thủy → Hỏa → Kim → Mộc
   * @param {string} spiritRoot - Player spirit root
   * @param {string} weaponElement - Weapon element
   * @returns {number} Affinity multiplier
   */
  getAffinityMultiplier(spiritRoot, weaponElement) {
    if (!spiritRoot || !weaponElement) return 1.0;

    // Same element (bản mệnh)
    if (spiritRoot === weaponElement) {
      return 1.10; // 110%
    }

    // Tương sinh: vũ khí sinh linh căn (weapon element generates spirit root)
    // Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim, Kim sinh Thủy, Thủy sinh Mộc
    const generates = {
      'moc': 'hoa',   // Mộc sinh Hỏa
      'hoa': 'tho',    // Hỏa sinh Thổ
      'tho': 'kim',    // Thổ sinh Kim
      'kim': 'thuy',   // Kim sinh Thủy
      'thuy': 'moc'    // Thủy sinh Mộc
    };

    if (generates[weaponElement] === spiritRoot) {
      return 1.15; // 115% - vũ khí tương sinh
    }

    // Tương khắc 1: vũ khí khắc linh căn (weapon element overcomes spirit root)
    // Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim, Kim khắc Mộc
    const overcomes = {
      'moc': 'tho',   // Mộc khắc Thổ
      'tho': 'thuy',   // Thổ khắc Thủy
      'thuy': 'hoa',   // Thủy khắc Hỏa
      'hoa': 'kim',    // Hỏa khắc Kim
      'kim': 'moc'     // Kim khắc Mộc
    };

    if (overcomes[weaponElement] === spiritRoot) {
      return 0.85; // 85% - vũ khí tương khắc (bất lợi)
    }

    // Tương khắc 2: linh căn khắc vũ khí (spirit root overcomes weapon element)
    // Ngược lại: Hỏa khắc Kim, Kim khắc Mộc, Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa
    if (overcomes[spiritRoot] === weaponElement) {
      return 0.90; // 90% - linh căn khắc vũ khí (bất lợi nhẹ)
    }

    // Tương sinh ngược: linh căn sinh vũ khí (spirit root generates weapon element)
    if (generates[spiritRoot] === weaponElement) {
      return 1.05; // 105% - linh căn sinh vũ khí (lợi nhẹ)
    }

    // Default: không có tương tác đặc biệt
    return 1.0;
  }

  /**
   * Calculate weapon skill damage using new formula
   * FinalDamage = ATK × Multiplier × TierMultiplier × Affinity
   * @param {Object} attacker - Attacker entity
   * @param {Object} defender - Defender entity
   * @param {Object} weaponSkill - Weapon skill object
   * @param {Object} weaponInstance - Weapon instance
   * @param {Object} combat - Combat object
   * @returns {number} Final damage
   */
  calculateWeaponSkillDamage(attacker, defender, weaponSkill, weaponInstance, combat) {
    if (!weaponSkill || !weaponInstance) return 0;

    const attackerAtk = parseFloat(attacker.stats?.attack || 0);
    const skillMultiplier = parseFloat(weaponSkill.multiplier || 1.0);

    // Get weapon rarity from weaponInstance (need to look up weapon info)
    const itemLoader = require('../../utils/data/item-loader');
    const weaponInfo = itemLoader.getItemInfo(weaponInstance.id);
    if (!weaponInfo) return 0;

    const weaponRarity = weaponInfo.rarity || 'common';
    const tierMultiplier = this.getTierMultiplier(weaponRarity);

    // Get affinity multiplier
    const spiritRoot = attacker.spiritRoot || 'vo';
    const weaponElement = weaponInfo.element || 'vo_he';
    const affinityMultiplier = this.getAffinityMultiplier(spiritRoot, weaponElement);

    // Calculate raw damage: ATK × Multiplier × TierMultiplier × Affinity
    let rawDamage = attackerAtk * skillMultiplier * tierMultiplier * affinityMultiplier;

    // Apply status effects bonuses/debuffs to ATK before calculation
    attacker.statusEffects?.forEach(effect => {
      if (effect.type === 'attack_boost') rawDamage *= (1 + effect.value);
      if (effect.type === 'attack_debuff') rawDamage *= Math.max(0, 1 - effect.value);
    });

    // Apply effects from skill (penetration, etc.)
    const effects = weaponSkill.effects || {};

    // Calculate defense with penetration
    let defenderDef = parseFloat(defender.stats?.defense || 0);

    // Apply defender status effects to defense
    defender.statusEffects?.forEach(effect => {
      if (effect.type === 'defense_bonus') defenderDef *= (1 + effect.value);
      if (effect.type === 'defend') defenderDef *= (1 + (effect.defenseBonus || 0));
    });

    // Apply penetration if skill has it
    let effectiveDef = defenderDef;
    if (effects.skill_penetration_pct) {
      const penReduction = effects.skill_penetration_pct;
      effectiveDef = defenderDef * (1 - penReduction);
    }

    // Calculate final damage: rawDamage - effectiveDef
    let finalDamage = Math.max(1, rawDamage - effectiveDef);

    // Apply damage reduction (final damage reduction)
    defender.statusEffects?.forEach(effect => {
      if (effect.type === 'damage_reduction') {
        finalDamage *= Math.max(0, 1 - effect.value);
      }
    });

    // Apply element multiplier using the weapon's element (not the attacker's element)
    const attackerElement = weaponElement;
    const defenderElement = defender.element || 'vo_he';
    const elementMultiplier = getElementDamageMultiplier(attackerElement, defenderElement);
    finalDamage *= elementMultiplier;

    // Validate final damage
    finalDamage = isNaN(finalDamage) ? 1 : Math.max(1, finalDamage);

    return finalDamage;
  }

  /**
   * Build weapon skill description
   * @param {Object} weaponInfo - Weapon info
   * @param {Object} weaponInstance - Weapon instance
   * @returns {string} Description text
   */
  buildWeaponSkillDescription(weaponInfo, weaponInstance) {
    const lines = [];
    lines.push('Chọn hành động vũ khí: đánh thường hoặc kỹ năng vũ khí');
    const tiers = weaponInstance.unlockedSkillTiers || [1];
    tiers.forEach(tier => {
      const sk = this.getWeaponSkill(weaponInfo.type, tier);
      if (!sk) return;
      const cost = sk.effects?.mana_cost || 0;
      const cd = sk.cooldown || 0;
      const elem = weaponInfo.element ? getElementViName(weaponInfo.element) : 'Không';
      const desc = sk.description || '';
      lines.push(`• ${tier}. ${sk.name} — MP: ${cost} • CD: ${cd} • Hệ VK: ${elem}\n   ${desc}`);
    });
    return lines.join('\n');
  }

  /**
   * Show weapon menu
   * @param {Object} combat - Combat object
   * @param {Object} interaction - Discord interaction
   * @param {Function} updateCombatUI - UI update function
   * @returns {Promise<Object>} Menu result
   */
  async showWeaponMenu(combat, interaction, updateCombatUI) {
    combat.uiLock = 'weapon_menu';
    const player = combat.player;
    const weaponInstance = player?.equipment?.weapon || null;
    if (!weaponInstance) {
      await updateCombatUI(combat, { content: '❌ Bạn chưa trang bị vũ khí!', components: [] }, interaction);
      return { action: 'menu', message: 'no weapon' };
    }
    const itemLoader = require('../../utils/data/item-loader');
    try {
      await itemLoader.loadAllItems();
    } catch { }
    const weaponInfo = itemLoader.getItemInfo(weaponInstance.id);
    if (!weaponInfo) {
      await updateCombatUI(combat, { content: '❌ Không tìm thấy thông tin vũ khí!', components: [] }, interaction);
      return { action: 'menu', message: 'no weapon info' };
    }

    const embed = new EmbedBuilder()
      .setColor('#F39C12')
      .setTitle(`🗡️ Vũ Khí: ${weaponInfo.name}`)
      .setDescription(this.buildWeaponSkillDescription(weaponInfo, weaponInstance));

    // Buttons: Normal Attack + Tier skill buttons
    const row = new ActionRowBuilder();
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`combat_weaponuse_${combat.id}_normal`)
        .setLabel('Đánh thường')
        .setStyle(ButtonStyle.Danger)
        .setDisabled((combat.playerAp || 0) <= 0)
    );

    // Unlocked tiers
    const unlocked = weaponInstance.unlockedSkillTiers || [1];
    unlocked.forEach(tier => {
      const sk = this.getWeaponSkill(weaponInfo.type, tier);
      const skId = sk?.id;
      const remain = skId ? (combat.playerCooldowns?.[skId] || 0) : 0;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`combat_weaponuse_${combat.id}_tier_${tier}`)
          .setLabel(remain > 0 ? `${tier} (CD:${remain})` : String(tier))
          .setStyle(ButtonStyle.Primary)
          .setDisabled((combat.playerAp || 0) <= 0 || remain > 0)
      );
    });

    // back
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`combat_back_${combat.id}`)
        .setLabel('Quay lại')
        .setStyle(ButtonStyle.Secondary)
    );

    await updateCombatUI(combat, { embeds: [embed], components: [row] }, interaction);
    return { action: 'menu', message: 'weapon menu' };
  }

  /**
   * Use weapon action (normal attack or skill)
   * @param {Object} combat - Combat object
   * @param {string} choice - Action choice ('normal' or 'tier_X')
   * @param {Object} interaction - Discord interaction
   * @param {Function} updateCombatUI - UI update function
   * @param {Function} createCombatUI - UI creation function
   * @param {Function} maybeAdvanceTurn - Turn advancement function
   * @returns {Promise<Object>} Action result
   */
  async useWeaponAction(combat, choice, interaction, updateCombatUI, createCombatUI, maybeAdvanceTurn) {
    const player = combat.player;
    const weaponInstance = player?.equipment?.weapon || null;
    if (!weaponInstance) {
      await updateCombatUI(combat, { content: '❌ Bạn chưa trang bị vũ khí!', components: [] }, interaction);
      return { action: 'weapon', message: 'no weapon' };
    }

    const itemLoader = require('../../utils/data/item-loader');
    try {
      await itemLoader.loadAllItems();
    } catch { }
    const weaponInfo = itemLoader.getItemInfo(weaponInstance.id);
    if (!weaponInfo) {
      await updateCombatUI(combat, { content: '❌ Không tìm thấy thông tin vũ khí!', components: [] }, interaction);
      return { action: 'weapon', message: 'no info' };
    }

    let log = '';
    let dmg = 0;

    if (choice === 'normal') {
      // Normal attack with weapon
      const attackResult = calculateDamage(player, combat.monster, undefined);
      if (attackResult.hit) {
        dmg = attackResult.damage;
        // Apply weapon element multiplier if player has weapon equipped
        const weaponElement = weaponInfo.element || 'vo_he';
        const defenderElement = combat.monster.element || 'vo_he';
        const elementMultiplier = getElementDamageMultiplier(weaponElement, defenderElement);
        dmg *= elementMultiplier;
        dmg = Math.max(1, dmg);

        combat.monster.currentHp = Math.max(0, (combat.monster.currentHp || 0) - dmg);
        const critText = attackResult.isCritical ? ' **CRIT**' : '';
        log = `🗡️ **${player.name}** dùng **${weaponInfo.name}** → **${dmg.toFixed(1)}** sát thương${critText}`;
      } else {
        log = `🗡️ **${player.name}** dùng **${weaponInfo.name}** → **MISS**`;
      }
    } else if (choice.startsWith('tier_')) {
      const tier = Number(choice.split('_')[1]);
      const skill = this.getWeaponSkill(weaponInfo.type, tier);
      if (!skill) {
        await updateCombatUI(combat, { content: '❌ Không tìm thấy kĩ năng vũ khí', components: [] }, interaction);
        return { action: 'weapon', message: 'no weapon skill' };
      }
      // Cooldown check for weapon skill
      const remainTurns = (combat.playerCooldowns || {})[skill.id] || 0;
      if (remainTurns > 0) {
        await updateCombatUI(combat, { content: `⏳ Kỹ năng vũ khí đang hồi (${remainTurns} lượt)`, components: [] }, interaction);
        return { action: 'weapon', message: 'on cd' };
      }

      dmg = this.calculateWeaponSkillDamage(player, combat.monster, skill, weaponInstance, combat);
      if (isNaN(dmg) || dmg <= 0) {
        console.error('[WEAPON SKILL] Invalid damage calculated:', { dmg, skill, weaponInfo, playerAtk: player.stats?.attack });
        dmg = 1; // Fallback to minimum damage
      }

      combat.monster.currentHp = Math.max(0, (combat.monster.currentHp || 0) - dmg);
      log = `🗡️ **${player.name}** thi triển **${skill.name}** → **${dmg.toFixed(1)}** sát thương`;

      // Apply simple effects (crit bonus, slow, stun, etc.) via existing helpers
      if (skill.effects) {
        applyDebuffsFromSkill(player, combat.monster, { effects: skill.effects });
        applyBuffsFromSkill(player, { effects: skill.effects });
      }
      // Apply cooldown turns
      const cdTurns = skill.cooldown || 0;
      if (cdTurns > 0) {
        if (!combat.playerCooldowns) combat.playerCooldowns = {};
        combat.playerCooldowns[skill.id] = cdTurns;
      }
    } else {
      log = `❌ **${player.name}** hành động không hợp lệ`;
    }

    // consume AP
    combat.playerAp = Math.max(0, (combat.playerAp || 0) - 1);
    // Deduplicate consecutive identical logs - check last 2 logs to prevent duplicates
    const last = combat.battleLog[combat.battleLog.length - 1];
    const secondLast = combat.battleLog[combat.battleLog.length - 2];
    if (last !== log && secondLast !== log) {
      combat.battleLog.push(log);
    }
    combat.uiLock = null;
    await updateCombatUI(combat, createCombatUI(combat), interaction);
    await maybeAdvanceTurn(combat, interaction);
    return { action: 'weapon', message: log };
  }
}

module.exports = WeaponSystem;

