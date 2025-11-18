/**
 * Skill System - Player and raid skill management
 * Handles skill menus, skill execution, and skill damage calculation
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { calculateDamage, getElementDamageMultiplier } = require('./DamageCalculator');
const { applyBuffsFromSkill, applyDebuffsFromSkill, applyOnHitStatus } = require('./StatusEffects');

class SkillSystem {
  constructor(skillsData) {
    this.skillsData = skillsData || {};
  }

  /**
   * Find skill by ID in skillsData
   * @param {string} id - Skill ID
   * @returns {Object|null} Skill object or null
   */
  findSkillById(id) {
    if (!this.skillsData) return null;
    for (const root of ['kim', 'hoa', 'tho', 'thuy', 'moc']) {
      for (const realm of ['luyen_khi', 'truc_co', 'ket_dan', 'nguyen_anh']) {
        const list = (this.skillsData[`${root}_skills`] || {})[realm] || [];
        const found = list.find(s => s.id === id);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Show skill menu for solo combat
   * @param {Object} combat - Combat object
   * @param {Object} interaction - Discord interaction
   * @param {Function} updateCombatUI - UI update function
   * @returns {Promise<Object>} Menu result
   */
  async showSkillMenu(combat, interaction, updateCombatUI) {
    // Khóa UI để tránh refresh/auto-turn ghi đè
    combat.uiLock = 'skill_menu';
    const player = combat.player;
    const learned = player.skills ? Object.keys(player.skills) : [];
    const available = learned
      .map(id => this.findSkillById(id))
      .filter(Boolean)
      .slice(0, 4);

    if (available.length === 0) {
      await updateCombatUI(combat, { content: '❌ Bạn chưa có kỹ năng để dùng!', components: [] }, interaction);
      return { action: 'menu', message: 'No skills' };
    }

    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('✨ Chọn Kỹ Năng')
      .setDescription(`MP: ${player.currentMp.toFixed(1)}/${player.stats.mp}`);

    embed.addFields(available.map((s, idx) => ({
      name: `${idx + 1}. ${s.name}`,
      value: `${s.description || ''}\nMana: ${s.effects?.mana_cost || 0} • CD: ${s.cooldown || 0} lượt`,
      inline: false
    })));

    const row = new ActionRowBuilder();
    available.forEach((s, idx) => {
      const cost = s.effects?.mana_cost || 0;
      const remainTurns = combat.playerCooldowns?.[s.id] || 0;
      const isOnCooldown = remainTurns > 0;
      const hasEnoughMp = player.currentMp >= cost;

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`combat_skilluse_${combat.id}_${s.id}`)
          .setLabel(`${idx + 1}${isOnCooldown ? ` (CD:${remainTurns})` : ''}`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!hasEnoughMp || isOnCooldown)
      );
    });
    // back button
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`combat_back_${combat.id}`)
        .setLabel('Quay lại')
        .setStyle(ButtonStyle.Secondary)
    );

    await updateCombatUI(combat, { embeds: [embed], components: [row] }, interaction);
    return { action: 'menu', message: 'skill menu' };
  }

  /**
   * Show skill menu for raid combat
   * @param {Object} combat - Combat object
   * @param {Object} interaction - Discord interaction
   * @param {Function} updateCombatUI - UI update function
   * @returns {Promise<Object>} Menu result
   */
  async showRaidSkillMenu(combat, interaction, updateCombatUI) {
    // Khóa UI để tránh refresh/auto-turn ghi đè
    combat.uiLock = 'skill_menu';
    const actor = combat.party[combat.currentActorIndex];
    const learned = actor.skills ? Object.keys(actor.skills) : [];
    const available = learned
      .map(id => this.findSkillById(id))
      .filter(Boolean)
      .slice(0, 4);

    if (available.length === 0) {
      await updateCombatUI(combat, { content: '❌ Bạn chưa có kỹ năng để dùng!', components: [] }, interaction);
      return { action: 'menu', message: 'No skills' };
    }

    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle(`✨ Chọn Kỹ Năng - ${actor.name}`)
      .setDescription(`MP: ${actor.currentMp.toFixed(1)}/${actor.stats.mp}`);

    embed.addFields(available.map((s, idx) => {
      const remainCD = combat.playerCooldowns?.[s.id] || 0;
      const cdText = remainCD > 0 ? `⏳ ${remainCD} lượt` : `✅ Sẵn sàng`;
      return {
        name: `${idx + 1}. ${s.name}`,
        value: `MP: ${s.effects?.mana_cost || 0} | CD: ${cdText}\n${s.description || 'Không có mô tả'}`,
        inline: false
      };
    }));

    const buttons = available.map((s, idx) => {
      const remainCD = combat.playerCooldowns?.[s.id] || 0;
      const isOnCD = remainCD > 0;
      const cost = s.effects?.mana_cost || 0;
      const hasEnoughMp = actor.currentMp >= cost;
      return new ButtonBuilder()
        .setCustomId(`raid_skilluse_${combat.id}_${actor.id}_${Date.now()}_${s.id}`)
        .setLabel(`${idx + 1}. ${s.name}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(isOnCD || !hasEnoughMp);
    });

    const backButton = new ButtonBuilder()
      .setCustomId(`raid_back_${combat.id}`)
      .setLabel('🔙 Quay lại')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents([...buttons, backButton]);
    await updateCombatUI(combat, { embeds: [embed], components: [row] }, interaction);
    return { action: 'menu', message: 'Skill menu shown' };
  }

  /**
   * Use player skill in solo combat
   * @param {Object} combat - Combat object
   * @param {string} skillId - Skill ID
   * @param {Object} interaction - Discord interaction
   * @param {Function} updateCombatUI - UI update function
   * @param {Function} createCombatUI - UI creation function
   * @returns {Promise<Object>} Skill use result
   */
  async usePlayerSkill(combat, skillId, interaction, updateCombatUI, createCombatUI) {
    const player = combat.player;
    const skill = this.findSkillById(skillId);
    if (!skill) {
      await updateCombatUI(combat, { content: '❌ Kỹ năng không tồn tại', components: [] }, interaction);
      return { action: 'skill', message: 'invalid skill' };
    }
    // cooldown check
    const cdTurns = skill.cooldown || 0;
    const remainTurns = combat.playerCooldowns?.[skill.id] || 0;
    if (remainTurns > 0) {
      await updateCombatUI(combat, { content: `⏳ Kỹ năng đang hồi (${remainTurns} lượt)`, components: [] }, interaction);
      return { action: 'skill', message: 'on cd', success: false };
    }
    // mana check
    const manaCost = skill.effects?.mana_cost || 0;
    if (player.currentMp < manaCost) {
      await updateCombatUI(combat, { content: '❌ Không đủ MP', components: [] }, interaction);
      return { action: 'skill', message: 'no mp', success: false };
    }

    // spend mana
    player.currentMp = Math.max(0, player.currentMp - manaCost);
    // apply effect
    const type = skill.type || skill.effects?.type || 'attack';
    let log = `✨ **${player.name}** thi triển **${skill.name}**`;
    if (type === 'attack') {
      const effects = skill.effects || {};
      // Kiểm tra AoE
      if (effects.aoe) {
        const totalDmg = this.applyAoEDamageToMonsters(player, skill, combat);
        log += ` (AOE) → **${totalDmg.toFixed(1)}** sát thương mỗi mục tiêu`;
      } else {
        const finalDmg = this.computeAndApplySkillDamage(player, combat.monster, skill, combat);
        log += ` → **${finalDmg.toFixed(1)}** sát thương`;
      }
    } else if (type === 'heal') {
      const ratio = skill.effects?.power || skill.effects?.heal_ratio || 0.25;
      const flatFromRegen = skill.effects?.heal_flat_regen_multiplier
        ? (player.stats.regen || 0) * skill.effects.heal_flat_regen_multiplier
        : 0;
      const amount = player.stats.hp * ratio + flatFromRegen;
      player.currentHp = Math.min(player.stats.hp, player.currentHp + amount);
      log += ` → Hồi **${amount.toFixed(1)} HP**`;
    } else if (type === 'buff') {
      log += ` → ${applyBuffsFromSkill(player, skill)}`;
    } else if (type === 'debuff') {
      log += ` → ${applyDebuffsFromSkill(player, combat.monster, skill)}`;
    }

    // mark cooldown theo lượt (bắt đầu từ lượt tiếp theo)
    combat.playerCooldowns[skill.id] = cdTurns; // sẽ giảm ở nextTurn

    combat.battleLog.push(log);
    // Gỡ khóa UI vì menu đã được xử lý
    combat.uiLock = null;
    await updateCombatUI(combat, createCombatUI(combat), interaction);
    return { action: 'skill', message: log };
  }

  /**
   * Use skill in raid combat
   * @param {Object} combat - Combat object
   * @param {string} skillId - Skill ID
   * @param {Object} interaction - Discord interaction
   * @param {Function} getSymmetricTarget - Function to get symmetric target
   * @returns {Promise<Object>} Skill use result
   */
  async useRaidSkill(combat, skillId, interaction, getSymmetricTarget) {
    const actor = combat.party[combat.currentActorIndex];
    const skill = this.findSkillById(skillId);
    if (!skill) {
      await interaction.reply({ content: '❌ Kỹ năng không tồn tại', ephemeral: true });
      return { action: 'skill', message: 'invalid skill' };
    }

    // cooldown check
    const cdTurns = skill.cooldown || 0;
    const remainTurns = combat.playerCooldowns?.[skill.id] || 0;
    if (remainTurns > 0) {
      await interaction.reply({ content: `⏳ Kỹ năng đang hồi (${remainTurns} lượt)`, ephemeral: true });
      return { action: 'skill', message: 'on cd', success: false };
    }

    // mana check
    const manaCost = skill.effects?.mana_cost || 0;
    if (actor.currentMp < manaCost) {
      await interaction.reply({ content: '❌ Không đủ MP', ephemeral: true });
      return { action: 'skill', message: 'no mp', success: false };
    }

    // spend mana
    actor.currentMp = Math.max(0, actor.currentMp - manaCost);

    // apply effect
    const type = skill.type || skill.effects?.type || 'attack';
    let log = `✨ **${actor.name}** thi triển **${skill.name}**`;

    if (type === 'attack') {
      const effects = skill.effects || {};
      if (effects.aoe && Array.isArray(combat.monsters)) {
        let total = 0;
        combat.monsters.filter(t => t.currentHp > 0).forEach(t => {
          const dealt = this.computeAndApplySkillDamage(actor, t, skill, combat);
          total += dealt;
        });
        log += ` (AOE) → **${total.toFixed(1)}** sát thương`;
      } else {
        const target = getSymmetricTarget(actor, combat);
        if (target) {
          const dealt = this.computeAndApplySkillDamage(actor, target, skill, combat);
          log += ` → **${dealt.toFixed(1)}** sát thương lên **${target.name}**`;
        }
      }
    } else if (type === 'heal') {
      const ratio = skill.effects?.power || skill.effects?.heal_ratio || 0.3;
      const flatFromRegen = skill.effects?.heal_flat_regen_multiplier
        ? (actor.stats.regen || 0) * skill.effects.heal_flat_regen_multiplier
        : 0;
      const healAmount = actor.stats.hp * ratio + flatFromRegen;
      actor.currentHp = Math.min(actor.stats.hp, actor.currentHp + healAmount);
      log += ` → Hồi **${healAmount.toFixed(1)} HP**`;
    } else if (type === 'buff') {
      log += ` → ${applyBuffsFromSkill(actor, skill)}`;
    }

    // debuff/aoe helpers for raid (hỗ trợ skill kiểu support/debuff)
    if (type === 'debuff') {
      const target = getSymmetricTarget(actor, combat);
      if (target) log += ` → ${applyDebuffsFromSkill(actor, target, skill)}`;
    } else if (type === 'support') {
      // team heal/regens if provided
      if (skill.effects?.team_heal_ratio && Array.isArray(combat.party)) {
        const ratio = skill.effects.team_heal_ratio;
        const regenBonus = skill.effects.team_regen_bonus || 0;
        combat.party.forEach(p => {
          const heal = (p.stats.hp || 0) * ratio;
          p.currentHp = Math.min(p.stats.hp, (p.currentHp || 0) + heal);
          if (regenBonus > 0) p.statusEffects.push({ type: 'regen_bonus', duration: skill.effects.duration || 2, value: regenBonus });
        });
        log += ` → 🔰 Toàn đội hồi máu và tăng hồi phục`;
      }
    }

    // apply cooldown
    if (cdTurns > 0) {
      if (!combat.playerCooldowns) combat.playerCooldowns = {};
      combat.playerCooldowns[skill.id] = cdTurns;
    }

    combat.battleLog.push(log);
    return { action: 'skill', message: log, success: true };
  }

  /**
   * Compute and apply skill damage with extended effects
   * @param {Object} attacker - Attacker entity
   * @param {Object} defender - Defender entity
   * @param {Object} skill - Skill object
   * @param {Object} combat - Combat object
   * @returns {number} Final damage dealt
   */
  computeAndApplySkillDamage(attacker, defender, skill, combat) {
    const effects = skill.effects || {};
    // Cơ sở theo hệ thống vật lý
    const baseObj = calculateDamage(attacker, defender, false);
    let damage = baseObj.hit ? (baseObj.damage || 0) : 0;

    // Chọn multiplier theo ATK hay MP
    const atkMul = effects.damage_multiplier || 0;
    const mpMul = effects.mp_damage_multiplier || 0;
    let power = atkMul || mpMul || 1.2;

    // Bonus nhỏ nếu là MP dmg (cho cảm giác khác biệt)
    if (mpMul > 0) {
      damage += (attacker.stats.mp || 0) * 0.05;
    }

    // Xuyên giáp theo skill (xấp xỉ): khuếch đại sát thương theo % xuyên thêm
    if (effects.skill_penetration_pct) {
      power *= (1 + 0.5 * effects.skill_penetration_pct);
    }

    // Bonus nếu caster đang có DEF buff
    if (effects.bonus_on_def_buff_multiplier) {
      const hasDefBuff = (attacker.statusEffects || []).some(e => e.type === 'defense_bonus');
      if (hasDefBuff) power *= (1 + effects.bonus_on_def_buff_multiplier);
    }

    // Bonus nếu mục tiêu đang bị đốt
    if (effects.bonus_vs_burning_atk_ratio) {
      const isBurning = (defender.statusEffects || []).some(e => e.type === 'burn');
      if (isBurning) {
        // nhân thêm theo tỉ lệ để thể hiện cộng dồn
        power *= (1 + effects.bonus_vs_burning_atk_ratio);
      }
    }

    let finalDmg = damage * power;
    // Elemental multiplier for player skills:
    // - Use skill's element if provided, otherwise use player's spirit root; fall back to attacker's element
    // - Defender side prefers spiritRoot if available, else element
    const attackerSkillElement = effects.element || attacker.spiritRoot || attacker.element || 'vo_he';
    const defenderElementForSkill = defender.spiritRoot || defender.element || 'vo_he';
    const skillElementMultiplier = getElementDamageMultiplier(attackerSkillElement, defenderElementForSkill);
    finalDmg *= skillElementMultiplier;
    finalDmg = isNaN(finalDmg) ? 1 : Math.max(1, finalDmg);

    // Áp dụng sát thương đơn hoặc AoE (solo: vẫn chỉ 1 mục tiêu)
    defender.currentHp = Math.max(0, (defender.currentHp || 0) - finalDmg);

    // Áp dụng các hiệu ứng trạng thái đi kèm
    applyOnHitStatus(attacker, defender, skill, combat);

    return finalDmg;
  }

  /**
   * Apply AoE damage to monsters
   * @param {Object} attacker - Attacker entity
   * @param {Object} skill - Skill object
   * @param {Object} combat - Combat object
   * @returns {number} Total damage dealt
   */
  applyAoEDamageToMonsters(attacker, skill, combat) {
    const effects = skill.effects || {};
    if (!effects.aoe) return 0;

    let totalDamage = 0;
    const logMessages = [];

    // Trong solo combat, có thể có waves hoặc chỉ 1 monster
    const targets = [];
    if (combat.monster && combat.monster.currentHp > 0) {
      targets.push(combat.monster);
    }
    // Nếu có waves, có thể thêm logic để gây damage lên các monster trong wave hiện tại
    if (Array.isArray(combat.waves) && combat.currentWaveIndex !== undefined) {
      const currentWave = combat.waves[combat.currentWaveIndex] || [];
      currentWave.forEach(m => {
        if (m.currentHp > 0 && !targets.find(t => t === m)) {
          targets.push(m);
        }
      });
    }

    // Gây damage lên tất cả mục tiêu
    targets.forEach(target => {
      const dealt = this.computeAndApplySkillDamage(attacker, target, skill, combat);
      totalDamage += dealt;
      logMessages.push(`  → ${target.name}: ${dealt.toFixed(1)} sát thương`);
    });

    // Thêm log AoE vào battle log
    if (logMessages.length > 0 && combat.battleLog) {
      combat.battleLog.push(`💥 **AOE**: ${logMessages.join(' | ')}`);
    }

    return totalDamage;
  }
}

module.exports = SkillSystem;

