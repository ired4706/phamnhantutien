/**
 * Monster AI - Monster AI and action logic
 * Handles monster turns, skill selection, and monster actions
 */

const fs = require('fs');
const path = require('path');
const { calculateDamage } = require('./DamageCalculator');
const { performAttack, performDefend } = require('./CombatActions');

class MonsterAI {
  /**
   * Perform monster turn in solo combat
   * @param {Object} combat - Combat object
   * @param {Function} checkCombatEnd - Function to check combat end
   * @param {Function} endCombat - Function to end combat
   * @param {Function} nextTurn - Function to advance turn
   * @param {Function} createCombatUI - Function to create UI
   * @param {Function} updateCombatUI - Function to update UI
   * @returns {Promise<void>}
   */
  async performMonsterTurn(combat, checkCombatEnd, endCombat, nextTurn, createCombatUI, updateCombatUI) {
    if (!combat.isActive || combat.currentTurn !== 'monster') return;

    // AI thông minh: quyết định dựa trên tình huống
    let result = null;
    const monster = combat.monster;
    const player = combat.player;

    // Tính toán tình huống
    const hpPercent = monster.currentHp / monster.stats.hp;
    const mpPercent = monster.currentMp / monster.stats.mp;
    const playerHpPercent = player.currentHp / player.stats.hp;

    // Kiểm tra skills khả dụng
    const availableSkills = this.getAvailableMonsterSkills(monster);
    const skillChance = this.calculateSkillChance(monster, hpPercent, mpPercent, playerHpPercent, availableSkills);

    const actionRoll = Math.random();

    if (actionRoll < skillChance && availableSkills.length > 0) {
      // Sử dụng skill thông minh
      result = this.performSmartMonsterSkill(monster, player, availableSkills, hpPercent, mpPercent, combat);
    } else if (actionRoll < skillChance + 0.6) {
      // Tấn công thường
      result = performAttack(monster, player, combat);
    } else {
      // Phòng thủ
      result = performDefend(monster, combat);
    }

    combat.battleLog.push(result.message);

    // Kiểm tra kết thúc trận chiến
    if (checkCombatEnd(combat)) {
      endCombat(combat, combat.interaction);
      return;
    }

    // Chuyển lượt
    nextTurn(combat);
    // giảm cooldown kỹ năng của quái theo lượt
    if (monster.cooldowns) {
      Object.keys(monster.cooldowns).forEach(id => {
        monster.cooldowns[id] = Math.max(0, monster.cooldowns[id] - 1);
        if (monster.cooldowns[id] <= 0) {
          delete monster.cooldowns[id];
        }
      });
    }

    // Cập nhật UI
    const ui = createCombatUI(combat);
    await updateCombatUI(combat, ui, combat.interaction);
  }

  /**
   * Perform monster action in raid combat
   * @param {Object} monster - Monster entity
   * @param {Object} target - Target entity
   * @param {Object} combat - Combat object
   * @returns {Promise<Object>} Action result
   */
  async performMonsterAction(monster, target, combat) {
    // Tính toán tình huống
    const hpPercent = monster.currentHp / monster.stats.hp;
    const mpPercent = monster.currentMp / monster.stats.mp;
    const targetHpPercent = target.currentHp / target.stats.hp;

    // Kiểm tra skills khả dụng
    const availableSkills = this.getAvailableMonsterSkills(monster);
    const skillChance = this.calculateSkillChance(monster, hpPercent, mpPercent, targetHpPercent, availableSkills);

    const actionRoll = Math.random();

    if (actionRoll < skillChance && availableSkills.length > 0) {
      // Sử dụng skill thông minh
      return this.performSmartMonsterSkill(monster, target, availableSkills, hpPercent, mpPercent, combat);
    } else if (actionRoll < skillChance + 0.6) {
      // Tấn công thường
      return performAttack(monster, target, combat);
    } else {
      // Phòng thủ
      return performDefend(monster, combat);
    }
  }

  /**
   * Get available monster skills (has MP and not on cooldown)
   * @param {Object} monster - Monster entity
   * @returns {Array} Available skills
   */
  getAvailableMonsterSkills(monster) {
    const tier = this.getMonsterTier(monster);
    // Kết hợp skill theo hệ + skill riêng của boss (nếu có)
    const elementSkills = this.getMonsterSkills(monster.element, tier);
    const bossSkills = Array.isArray(monster.bossSkills) ? monster.bossSkills : [];
    const allSkills = [...elementSkills, ...bossSkills];

    return allSkills.filter(skill => {
      // Kiểm tra MP
      const cost = Number(skill.cost || 0);
      if (monster.currentMp < cost) return false;

      // Kiểm tra cooldown
      if (monster.cooldowns && skill.id && monster.cooldowns[skill.id] > 0) return false;

      return true;
    });
  }

  /**
   * Calculate skill usage chance based on situation
   * @param {Object} monster - Monster entity
   * @param {number} hpPercent - HP percentage
   * @param {number} mpPercent - MP percentage
   * @param {number} playerHpPercent - Player HP percentage
   * @param {Array} availableSkills - Available skills
   * @returns {number} Skill chance (0-1)
   */
  calculateSkillChance(monster, hpPercent, mpPercent, playerHpPercent, availableSkills) {
    if (availableSkills.length === 0) return 0;

    let baseChance = 0.15; // 15% cơ bản

    // MP đủ → tăng tỉ lệ skill
    if (mpPercent > 0.5) baseChance += 0.1;
    if (mpPercent > 0.8) baseChance += 0.05;

    // HP thấp → ưu tiên heal/defense skills
    if (hpPercent < 0.3) baseChance += 0.1;
    if (hpPercent < 0.1) baseChance += 0.1;

    // Player HP thấp → ưu tiên attack skills
    if (playerHpPercent < 0.3) baseChance += 0.05;

    // Tier cao hơn → tỉ lệ skill cao hơn
    const tier = this.getMonsterTier(monster);
    if (tier >= 5) baseChance += 0.05;
    if (tier >= 8) baseChance += 0.05;

    return Math.min(baseChance, 0.4); // Tối đa 40%
  }

  /**
   * Perform smart monster skill based on situation
   * @param {Object} monster - Monster entity
   * @param {Object} target - Target entity
   * @param {Array} availableSkills - Available skills
   * @param {number} hpPercent - HP percentage
   * @param {number} mpPercent - MP percentage
   * @param {Object} combat - Combat object
   * @returns {Object} Skill result
   */
  performSmartMonsterSkill(monster, target, availableSkills, hpPercent, mpPercent, combat) {
    // Phân loại skills theo mục đích
    const healSkills = availableSkills.filter(skill =>
      skill.effects && skill.effects.some(effect => effect.type === 'heal')
    );
    const defenseSkills = availableSkills.filter(skill =>
      skill.effects && skill.effects.some(effect =>
        effect.type === 'buff' && (effect.stat === 'defense' || effect.stat === 'evasion')
      )
    );
    const attackSkills = availableSkills.filter(skill =>
      skill.damage > 0 || (skill.effects && skill.effects.some(effect =>
        effect.type === 'dot' || effect.type === 'stun'
      ))
    );

    let selectedSkill = null;

    // Logic chọn skill thông minh
    if (hpPercent < 0.3 && healSkills.length > 0) {
      // HP thấp → ưu tiên heal
      selectedSkill = healSkills[Math.floor(Math.random() * healSkills.length)];
    } else if (hpPercent < 0.5 && defenseSkills.length > 0) {
      // HP trung bình → ưu tiên defense
      selectedSkill = defenseSkills[Math.floor(Math.random() * defenseSkills.length)];
    } else if (attackSkills.length > 0) {
      // Còn lại → ưu tiên attack
      selectedSkill = attackSkills[Math.floor(Math.random() * attackSkills.length)];
    } else {
      // Fallback: chọn skill bất kỳ
      selectedSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
    }

    if (!selectedSkill) return null;

    // Thêm cooldown cho skill
    if (!monster.cooldowns) monster.cooldowns = {};
    monster.cooldowns[selectedSkill.id] = 2; // 2 lượt cooldown

    return this.executeSkill(monster, target, selectedSkill, combat);
  }

  /**
   * Get monster tier based on stats or level
   * @param {Object} monster - Monster entity
   * @returns {number} Monster tier (1-10)
   */
  getMonsterTier(monster) {
    // Có thể dựa trên HP, level, hoặc stats để xác định tier
    // Tạm thời dùng logic đơn giản dựa trên HP
    const hp = monster.stats?.hp || monster.maxHp || 100;
    if (hp < 200) return 1;
    if (hp < 500) return 2;
    if (hp < 1000) return 3;
    if (hp < 2000) return 4;
    if (hp < 4000) return 5;
    if (hp < 8000) return 6;
    if (hp < 15000) return 7;
    if (hp < 30000) return 8;
    if (hp < 60000) return 9;
    return 10;
  }

  /**
   * Get monster skills by element and tier
   * @param {string} element - Monster element
   * @param {number} tier - Monster tier
   * @returns {Array} Monster skills
   */
  getMonsterSkills(element, tier = 1) {
    try {
      const skillsData = JSON.parse(fs.readFileSync(
        path.join(__dirname, '../../../data/monsters/monster-skills.json'),
        'utf8'
      ));

      const elementKey = this.getElementKey(element);
      const elementSkills = skillsData[elementKey];
      if (!elementSkills) return [];

      const availableSkills = [];

      // Thêm skills theo tier
      if (tier >= 1 && elementSkills.tier_1) {
        availableSkills.push(...elementSkills.tier_1);
      }
      if (tier >= 2 && tier <= 4 && elementSkills.tier_2_4) {
        availableSkills.push(...elementSkills.tier_2_4);
      }
      if (tier >= 5 && tier <= 7 && elementSkills.tier_5_7) {
        availableSkills.push(...elementSkills.tier_5_7);
      }
      if (tier >= 8 && tier <= 10 && elementSkills.tier_8_10) {
        availableSkills.push(...elementSkills.tier_8_10);
      }

      return availableSkills;
    } catch (error) {
      console.error('Error loading monster skills:', error);
      return [];
    }
  }

  /**
   * Convert element name to key in JSON file
   * @param {string} element - Element name
   * @returns {string} Element key
   */
  getElementKey(element) {
    const elementMap = {
      'kim': 'metal_skills',
      'moc': 'wood_skills',
      'thuy': 'water_skills',
      'hoa': 'fire_skills',
      'tho': 'earth_skills',
      'phong': 'wind_skills',
      'loi': 'lightning_skills',
      'vo_he': 'void_skills'
    };
    return elementMap[element] || 'void_skills';
  }

  /**
   * Execute monster skill
   * @param {Object} caster - Caster entity
   * @param {Object} target - Target entity
   * @param {Object} skill - Skill object
   * @param {Object} combat - Combat object
   * @returns {Object} Skill result
   */
  executeSkill(caster, target, skill, combat) {
    const cost = Number(skill.cost || 0);
    if (caster.currentMp < cost) {
      return {
        action: 'skill',
        message: `❌ ${caster.name} không đủ MP để sử dụng ${skill.name}!`
      };
    }

    caster.currentMp = Math.max(0, caster.currentMp - cost);
    let message = `✨ ${caster.name} sử dụng **${skill.name}**!`;

    // Xử lý damage cơ bản
    if (skill.damage > 0) {
      const dmgObj = calculateDamage(caster, target, false);
      if (!dmgObj.hit) {
        message += ` ⚠️ Đòn đánh trượt!`;
      } else {
        const damage = (dmgObj.damage || 0) * (skill.damage || 0);
        // Validate damage to prevent NaN
        const finalDamage = isNaN(damage) ? 1 : Math.max(1, damage);
        target.currentHp = Math.max(0, (target.currentHp || 0) - finalDamage);
        const critTag = dmgObj.isCritical ? ' (CRIT)' : '';
        message += ` Gây **${finalDamage.toFixed(1)}** sát thương${critTag}!`;
      }
    }

    // Xử lý các effects
    if (skill.effects && Array.isArray(skill.effects)) {
      for (const effect of skill.effects) {
        message += this.applySkillEffect(caster, target, effect, combat);
      }
    }

    return {
      action: 'skill',
      message: message
    };
  }

  /**
   * Apply skill effect
   * @param {Object} caster - Caster entity
   * @param {Object} target - Target entity
   * @param {Object} effect - Effect object
   * @param {Object} combat - Combat object
   * @returns {string} Effect message
   */
  applySkillEffect(caster, target, effect, combat) {
    let message = '';

    switch (effect.type) {
      case 'dot':
        target.statusEffects.push({
          type: 'dot',
          name: effect.name,
          duration: effect.duration,
          damage: effect.damage,
          source: caster.name
        });
        message += ` Gây ${effect.name} trong ${effect.duration} lượt!`;
        break;

      case 'buff':
        caster.statusEffects.push({
          type: effect.name.toLowerCase().replace(/\s+/g, '_'),
          stat: effect.stat,
          value: effect.value,
          duration: effect.duration
        });
        message += ` Tăng ${effect.stat} **${(effect.value * 100).toFixed(0)}%** trong ${effect.duration} lượt!`;
        break;

      case 'debuff':
        target.statusEffects.push({
          type: effect.name.toLowerCase().replace(/\s+/g, '_'),
          stat: effect.stat,
          value: effect.value,
          duration: effect.duration
        });
        message += ` Giảm ${effect.stat} địch **${(effect.value * 100).toFixed(0)}%** trong ${effect.duration} lượt!`;
        break;

      case 'heal':
        const healAmount = caster.stats.hp * effect.value;
        caster.currentHp = Math.min(caster.stats.hp, caster.currentHp + healAmount);
        message += ` Hồi phục **${healAmount.toFixed(1)}** HP!`;
        break;

      case 'stun':
        if (Math.random() < (effect.chance || 1)) {
          target.statusEffects.push({
            type: 'stun',
            name: effect.name,
            duration: effect.duration
          });
          message += ` Làm choáng địch trong ${effect.duration} lượt!`;
        }
        break;

      case 'counter_attack':
        caster.statusEffects.push({
          type: 'counter_attack',
          name: effect.name,
          damage: effect.damage,
          trigger: effect.trigger
        });
        message += ` Kích hoạt phản đòn!`;
        break;

      case 'multi_attack':
        const hits = Math.floor(Math.random() * (effect.max_hits - effect.min_hits + 1)) + effect.min_hits;
        message += ` Tấn công liên tiếp **${hits}** lần!`;
        break;

      case 'splash':
        message += ` Sát thương lan sang mục tiêu khác!`;
        break;

      case 'knockback':
        if (Math.random() < (effect.chance || 1)) {
          message += ` Đẩy lùi địch!`;
        }
        break;

      case 'armor_penetration':
        message += ` Xuyên thủng giáp!`;
        break;

      case 'turn_delay':
        message += ` Làm chậm lượt đi của địch!`;
        break;

      case 'damage_boost':
        caster.statusEffects.push({
          type: 'damage_boost',
          name: effect.name,
          value: effect.value
        });
        message += ` Tăng sát thương **${(effect.value * 100).toFixed(0)}%**!`;
        break;

      case 'damage_reduction':
        caster.statusEffects.push({
          type: 'damage_reduction',
          name: effect.name,
          value: effect.value,
          duration: effect.duration
        });
        message += ` Giảm sát thương nhận **${(effect.value * 100).toFixed(0)}%**!`;
        break;

      case 'status_resistance':
        caster.statusEffects.push({
          type: 'status_resistance',
          name: effect.name,
          value: effect.value
        });
        message += ` Tăng kháng hiệu ứng xấu!`;
        break;

      case 'crit_boost':
        caster.statusEffects.push({
          type: 'crit_boost',
          name: effect.name,
          value: effect.value
        });
        message += ` Tăng tỉ lệ chí mạng!`;
        break;

      case 'double_attack':
        caster.statusEffects.push({
          type: 'double_attack',
          name: effect.name,
          chance: effect.chance
        });
        message += ` Có cơ hội tấn công 2 lần!`;
        break;

      case 'perfect_dodge':
        caster.statusEffects.push({
          type: 'perfect_dodge',
          name: effect.name,
          chance: effect.chance
        });
        message += ` Có cơ hội né hoàn toàn!`;
        break;

      case 'revive':
        caster.statusEffects.push({
          type: 'revive',
          name: effect.name,
          chance: effect.chance,
          hp_percent: effect.hp_percent
        });
        message += ` Có cơ hội hồi sinh!`;
        break;
    }

    return message;
  }
}

module.exports = MonsterAI;

