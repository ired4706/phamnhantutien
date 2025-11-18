/**
 * Raid System - Raid combat logic
 * Handles raid combat, initiative, turn management, and wave transitions
 */

const Logger = require('../../utils/core/logger');
const { getEffectiveSpeed, getApForRealm } = require('./TurnManager');
const { updateStatusEffects, applyRegeneration } = require('./StatusEffects');

class RaidSystem {
  /**
   * Build initiative for raid combat (multiple players vs multiple monsters)
   * @param {Object} combat - Combat object
   */
  buildRaidInitiative(combat) {
    const allEntities = [];

    // Thêm tất cả người chơi (dùng effective speed)
    combat.party.forEach((player, index) => {
      allEntities.push({
        type: 'player',
        index: index,
        id: player.userId || player.id,
        name: player.name || player.username,
        speed: getEffectiveSpeed(player),
        entity: player
      });
    });

    // Thêm tất cả quái vật (dùng effective speed)
    combat.monsters.forEach((monster, index) => {
      allEntities.push({
        type: 'monster',
        index: index,
        id: monster.id,
        name: monster.name,
        speed: getEffectiveSpeed(monster),
        entity: monster
      });
    });

    // Tìm speed thấp nhất để làm mốc
    const minSpeed = Math.min(...allEntities.map(e => e.speed));

    // Tính bonus cho từng entity
    allEntities.forEach(entity => {
      const speedRatio = entity.speed / minSpeed;

      if (entity.type === 'player') {
        // Bonus AP cho người chơi
        let apBonus = 0;
        // Cho phép cộng tối đa +4 AP từ speed advantage trong raid
        if (speedRatio >= 5) {
          apBonus = 4;
        } else if (speedRatio >= 4) {
          apBonus = 3;
        } else if (speedRatio >= 3) {
          apBonus = 2;
        } else if (speedRatio >= 2) {
          apBonus = 1;
        }
        entity.apBonus = apBonus;
        entity.actionBonus = 0;
      } else {
        // Bonus action cho quái
        let actionBonus = 0;
        if (speedRatio >= 5) {
          actionBonus = 3;
        } else if (speedRatio >= 3) {
          actionBonus = 2;
        } else if (speedRatio >= 2) {
          actionBonus = 1;
        }
        entity.apBonus = 0;
        entity.actionBonus = actionBonus;
      }

      entity.speedRatio = speedRatio;
    });

    // Sắp xếp theo speed (cao xuống thấp), người luôn thắng khi cùng speed
    allEntities.sort((a, b) => {
      if (a.speed === b.speed) {
        return a.type === 'player' ? -1 : 1; // Người đi trước khi cùng speed
      }
      return b.speed - a.speed; // Speed cao hơn đi trước
    });

    // Lưu initiative order
    combat.initiative = allEntities;

    // Cập nhật AP cho người chơi
    combat.party.forEach((player, index) => {
      const entity = allEntities.find(e => e.type === 'player' && e.index === index);
      if (entity && entity.apBonus > 0) {
        player.apBonus = entity.apBonus;
        player.apMax = getApForRealm(player.realm) + entity.apBonus;
        player.ap = player.apMax;
      }
    });

    // Cập nhật action bonus cho quái
    combat.monsters.forEach((monster, index) => {
      const entity = allEntities.find(e => e.type === 'monster' && e.index === index);
      if (entity) {
        monster.actionBonus = entity.actionBonus;
      }
    });

    Logger.info('Raid initiative built', {
      entities: allEntities.map(e => ({
        type: e.type,
        name: e.name,
        speed: e.speed,
        speedRatio: e.speedRatio.toFixed(2),
        apBonus: e.apBonus,
        actionBonus: e.actionBonus
      })),
      minSpeed
    });

    // Thêm log vào battle log
    const speedAdvantageLogs = allEntities
      .filter(e => e.apBonus > 0 || e.actionBonus > 0)
      .map(e => {
        if (e.apBonus > 0) {
          return `⚡ **Speed Advantage**: **${e.name}** +${e.apBonus} AP`;
        } else if (e.actionBonus > 0) {
          return `⚡ **Speed Advantage**: **${e.name}** +${e.actionBonus} action`;
        }
      })
      .filter(Boolean);

    if (speedAdvantageLogs.length > 0) {
      combat.battleLog.push(...speedAdvantageLogs);
    }
  }

  /**
   * Set current actor from initiative
   * @param {Object} combat - Combat object
   */
  setRaidActorFromInitiative(combat) {
    if (!combat.initiative || combat.initiative.length === 0) {
      Logger.error('No initiative found for raid combat');
      return;
    }

    // Tìm entity đầu tiên còn sống
    const firstAlive = combat.initiative.find(e => {
      if (e.type === 'player') {
        return combat.party[e.index] && combat.party[e.index].currentHp > 0;
      } else {
        return combat.monsters[e.index] && combat.monsters[e.index].currentHp > 0;
      }
    });

    if (!firstAlive) {
      Logger.error('No alive entity found in initiative');
      return;
    }

    if (firstAlive.type === 'player') {
      combat.currentActorIndex = firstAlive.index;
      combat.currentActorUserId = combat.party[firstAlive.index].userId;
      combat.currentTurn = 'party';
    } else {
      combat.currentTurn = 'monster';
    }
  }

  /**
   * Get symmetric target for player in raid
   * @param {Object} actor - Actor entity
   * @param {Object} combat - Combat object
   * @returns {Object|null} Target entity or null
   */
  getSymmetricTarget(actor, combat) {
    const aliveParty = combat.party.filter(p => p.currentHp > 0);
    const aliveMonsters = combat.monsters.filter(m => m.currentHp > 0);

    if (aliveMonsters.length === 0) return null;

    // Tìm vị trí của actor trong danh sách party còn sống
    const actorIndex = aliveParty.findIndex(p => p.id === actor.id);
    if (actorIndex === -1) return null;

    // Tính toán vị trí mục tiêu đối xứng
    const targetIndex = actorIndex % aliveMonsters.length;
    return aliveMonsters[targetIndex];
  }

  /**
   * Get symmetric target for monster in raid (prioritize taunt)
   * @param {Object} monster - Monster entity
   * @param {number} monsterIndex - Monster index
   * @param {Object} combat - Combat object
   * @returns {Object|null} Target entity or null
   */
  getSymmetricTargetForMonster(monster, monsterIndex, combat) {
    const aliveParty = combat.party.filter(p => p.currentHp > 0);
    const aliveMonsters = combat.monsters.filter(m => m.currentHp > 0);

    if (aliveParty.length === 0) return null;

    // Ưu tiên tấn công mục tiêu có taunt
    const tauntTarget = aliveParty.find(p => {
      return (p.statusEffects || []).some(e => e.type === 'taunt' && e.duration > 0);
    });
    if (tauntTarget) {
      return tauntTarget;
    }

    // Nếu không có taunt, dùng logic đối xứng như cũ
    const monsterAliveIndex = aliveMonsters.findIndex(m => m === monster);
    if (monsterAliveIndex === -1) return null;

    // Tính toán vị trí mục tiêu đối xứng
    const targetIndex = monsterAliveIndex % aliveParty.length;
    return aliveParty[targetIndex];
  }

  /**
   * Advance to next raid actor
   * @param {Object} combat - Combat object
   */
  nextRaidActor(combat) {
    // chuyển sang actor party tiếp theo còn sống
    const aliveParty = combat.party.filter(p => p.currentHp > 0);
    if (aliveParty.length === 0) return;
    let idx = combat.currentActorIndex;
    let loops = 0;
    do {
      idx = (idx + 1) % combat.party.length;
      loops++;
      if (loops > combat.party.length + 2) break;
    } while (combat.party[idx].currentHp <= 0);
    combat.currentActorIndex = idx;
    combat.currentActorUserId = combat.party[idx].userId;

    // Reset AP cho người chơi mới (chỉ khi chuyển sang người chơi khác)
    combat.playerAp = combat.playerApMax;
    console.log(`[RAID] nextRaidActor: Reset AP to ${combat.playerAp}/${combat.playerApMax} for ${combat.party[combat.currentActorIndex]?.name}`);

    // Kiểm tra stun cho actor mới - nếu bị stun thì skip và chuyển tiếp
    const currentActor = combat.party[combat.currentActorIndex];
    if (currentActor && currentActor.currentHp > 0) {
      const stunIdx = (currentActor.statusEffects || []).findIndex(e => e.type === 'stun');
      if (stunIdx !== -1) {
        // Giảm 1 lượt stun
        currentActor.statusEffects[stunIdx].duration -= 1;
        if (currentActor.statusEffects[stunIdx].duration <= 0) {
          currentActor.statusEffects.splice(stunIdx, 1);
        }
        combat.battleLog.push(`⛔ **${currentActor.name}** bị choáng và bỏ lượt`);
        // Chuyển sang actor tiếp theo (không end turn, chỉ skip actor này)
        return this.nextRaidActor(combat);
      }
    }
  }

  /**
   * Advance to next raid round
   * @param {Object} combat - Combat object
   */
  nextRaidRound(combat) {
    combat.turn++;
    // actor đầu tiên còn sống
    const firstAliveIdx = combat.party.findIndex(p => p.currentHp > 0);
    combat.currentActorIndex = Math.max(0, firstAliveIdx);
    combat.currentActorUserId = combat.party[combat.currentActorIndex]?.userId;

    // Kiểm tra stun cho actor đầu tiên - nếu bị stun thì skip và chuyển tiếp
    const firstActor = combat.party[combat.currentActorIndex];
    if (firstActor && firstActor.currentHp > 0) {
      const stunIdx = (firstActor.statusEffects || []).findIndex(e => e.type === 'stun');
      if (stunIdx !== -1) {
        // Giảm 1 lượt stun
        firstActor.statusEffects[stunIdx].duration -= 1;
        if (firstActor.statusEffects[stunIdx].duration <= 0) {
          firstActor.statusEffects.splice(stunIdx, 1);
        }
        combat.battleLog.push(`⛔ **${firstActor.name}** bị choáng và bỏ lượt`);
        // Chuyển sang actor tiếp theo (không end turn, chỉ skip actor này)
        this.nextRaidActor(combat);
      }
    }

    // Reset AP cho lượt mới (bao gồm bonus từ speed advantage)
    combat.playerAp = combat.playerApMax;
    // Reset turn actions
    combat.turnActions = { attacked: false, usedSkill: false, usedWeaponSkill: false, defended: false };
    // Reset defended flag cho tất cả actors trong raid
    combat.party.forEach(player => {
      player.defended = false;
    });

    // Tính lại initiative cho tất cả entities với effective speed (đã tính slow)
    const allEffectiveSpeeds = [];
    combat.party.forEach(player => {
      if (player.currentHp > 0) {
        allEffectiveSpeeds.push(getEffectiveSpeed(player));
      }
    });
    combat.monsters.forEach(monster => {
      if (monster.currentHp > 0) {
        allEffectiveSpeeds.push(getEffectiveSpeed(monster));
      }
    });
    const minSpeed = allEffectiveSpeeds.length > 0 ? Math.min(...allEffectiveSpeeds) : 1;

    // Cập nhật AP cho tất cả người chơi dựa trên effective speed
    combat.party.forEach((player, index) => {
      if (player.currentHp > 0) {
        const effectiveSpeed = getEffectiveSpeed(player);
        const speedRatio = effectiveSpeed / minSpeed;

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

        const baseAp = getApForRealm(player.realm);
        player.apBonus = apBonus;
        player.apMax = baseAp + apBonus;
        player.ap = player.apMax;

        // Log nếu bị slow
        const slowEffect = (player.statusEffects || []).find(e => e.type === 'slow');
        if (slowEffect && slowEffect.value) {
          const baseSpeed = parseFloat(player.stats.speed || 0);
          const reducedSpeed = baseSpeed * (1 - slowEffect.value);
          combat.battleLog.push(`🐌 **${player.name}** bị chậm → SPD: ${baseSpeed.toFixed(0)} → ${reducedSpeed.toFixed(0)} (AP bonus: ${apBonus})`);
        }

        Logger.info('Player AP updated for new round', {
          playerName: player.name || player.username,
          baseSpeed: parseFloat(player.stats.speed || 0),
          effectiveSpeed,
          baseAp,
          apBonus,
          totalAp: player.apMax
        });
      }
    });

    // Giảm cooldown theo lượt cho kỹ năng
    Object.keys(combat.playerCooldowns || {}).forEach(id => {
      const left = Math.max(0, (combat.playerCooldowns[id] || 0) - 1);
      if (left <= 0) {
        delete combat.playerCooldowns[id];
      } else {
        combat.playerCooldowns[id] = left;
      }
    });
    // regen theo lượt
    combat.party.forEach(p => applyRegeneration(p));
    combat.monsters.forEach(m => applyRegeneration(m));
  }

  /**
   * Check if raid combat has ended
   * @param {Object} combat - Combat object
   * @returns {boolean} True if combat ended
   */
  checkRaidEnd(combat) {
    const allPlayersDown = combat.party.every(p => p.currentHp <= 0);
    const allMonstersDown = combat.monsters.every(m => m.currentHp <= 0);
    return allPlayersDown || allMonstersDown;
  }

  /**
   * Perform monster group turn in raid
   * @param {Object} combat - Combat object
   * @param {Function} performMonsterAction - Function to perform monster action
   * @param {Function} checkRaidEnd - Function to check raid end
   * @param {Function} nextRaidRound - Function to advance raid round
   * @param {Function} createRaidUI - Function to create raid UI
   * @param {Function} updateCombatUI - Function to update UI
   * @returns {Promise<void>}
   */
  async performMonsterGroupTurn(combat, performMonsterAction, checkRaidEnd, nextRaidRound, createRaidUI, updateCombatUI) {
    if (!combat.isActive) return;
    if (!combat.monsters || combat.monsters.length === 0) return;

    // mỗi quái tấn công đối xứng theo thứ tự
    for (let i = 0; i < combat.monsters.length; i++) {
      const monster = combat.monsters[i];
      if (monster.currentHp <= 0) continue;

      // Tính số action cho quái này (1 + actionBonus)
      const actionCount = 1 + (monster.actionBonus || 0);

      Logger.info('Monster performing actions', {
        monsterName: monster.name,
        actionCount,
        actionBonus: monster.actionBonus || 0
      });

      // Thực hiện các action
      for (let actionIndex = 0; actionIndex < actionCount; actionIndex++) {
        if (monster.currentHp <= 0) break; // Quái đã chết thì dừng

        const target = this.getSymmetricTargetForMonster(monster, i, combat);
        if (!target) break;

        // Sử dụng AI hiện tại để chọn action
        const actionResult = await performMonsterAction(monster, target, combat);
        if (actionResult && actionResult.message) {
          combat.battleLog.push(actionResult.message.replace(monster.name, `${monster.name}`).replace('⚔️', '💥'));
        }

        if (checkRaidEnd(combat)) break;
      }

      if (checkRaidEnd(combat)) break;
    }

    // Kiểm tra kết thúc ải (lọc quái chết)
    combat.monsters = combat.monsters.filter(m => m.currentHp > 0);
    const allMonstersDown = combat.monsters.length === 0;
    if (allMonstersDown) {
      // Nếu còn ải tiếp theo thì chuyển ải
      const nextIdx = (combat.currentWaveIndex || 0) + 1;
      if (nextIdx < combat.waves.length) {
        combat.currentWaveIndex = nextIdx;
        combat.monsters = combat.waves[nextIdx].map(x => ({
          ...x,
          currentHp: parseFloat(x.stats.hp),
          currentMp: parseFloat(x.stats.mp),
          statusEffects: [],
          cooldowns: {}
        }));
        combat.turn++;
        combat.currentTurn = 'party';
        this.nextRaidRound(combat);
        combat.battleLog.push(`🚪 Sang ải **${nextIdx + 1}/${combat.waves.length}**`);
        const ui = createRaidUI(combat);
        await updateCombatUI(combat, ui, combat.interaction);
        return;
      } else {
        // RAID kết thúc thắng lợi
        combat.isActive = false;
        const EmbedBuilder = require('discord.js').EmbedBuilder;
        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🏆 RAID Chiến Thắng!')
          .setDescription('Toàn bộ ải đã bị đánh bại!')
          .setTimestamp();
        await updateCombatUI(combat, { embeds: [embed], components: [] }, combat.interaction);
        return;
      }
    }

    // Kiểm tra kết thúc, nếu chưa thì trả lượt về party
    if (!checkRaidEnd(combat)) {
      combat.currentTurn = 'party';
      this.nextRaidRound(combat);
    }

    // Cập nhật UI sau khi quái hành động
    try {
      const ui = createRaidUI(combat);
      await updateCombatUI(combat, ui, combat.interaction);
    } catch (e) {
      console.error('Error updating raid UI after monster turn:', e);
    }
  }

  /**
   * Advance to next actor in raid initiative
   * @param {Object} combat - Combat object
   */
  advanceRaidInitiative(combat) {
    if (!combat.initiative || combat.initiative.length === 0) {
      Logger.error('No initiative found for raid combat');
      return;
    }

    let nextIndex = (combat.initiativeIndex + 1) % combat.initiative.length;
    let attempts = 0;
    const maxAttempts = combat.initiative.length;

    // Tìm entity tiếp theo còn sống
    while (attempts < maxAttempts) {
      const entity = combat.initiative[nextIndex];
      let isAlive = false;

      if (entity.type === 'player') {
        const player = combat.party[entity.index];
        isAlive = player && player.currentHp > 0;
      } else {
        const monster = combat.monsters[entity.index];
        isAlive = monster && monster.currentHp > 0;
      }

      if (isAlive) {
        combat.initiativeIndex = nextIndex;
        break;
      }

      nextIndex = (nextIndex + 1) % combat.initiative.length;
      attempts++;
    }

    Logger.info('Raid initiative advanced', {
      from: combat.initiativeIndex,
      to: nextIndex,
      attempts
    });
  }
}

module.exports = RaidSystem;

