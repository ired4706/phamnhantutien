const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const Logger = require('../utils/core/logger');
const ErrorHandler = require('../utils/core/error-handler');
const FileManager = require('../utils/data/file-manager');
const CONSTANTS = require('../../config/constants');

class CombatSystem {
  constructor() {
    this.activeCombats = new Map(); // Lưu trữ các trận chiến đang diễn ra
    this._cleanupInterval = setInterval(() => {
      try {
        this.cleanupExpiredCombats();
      } catch (e) {
        ErrorHandler.handle(e, 'CombatSystem.cleanupExpiredCombats');
      }
    }, CONSTANTS.COMBAT.CLEANUP_INTERVAL_MS);
    // Load skills data once
    try {
      const skillsPath = path.join(__dirname, '../../data/core/skills.json');
      const data = fs.readFileSync(skillsPath, 'utf8');
      this.skillsData = JSON.parse(data);
    } catch (e) {
      ErrorHandler.handle(e, 'CombatSystem.constructor.loadSkills');
      this.skillsData = {};
    }
    // Load weapon skills data once
    try {
      const weaponSkillsPath = path.join(__dirname, '../../data/core/weapon-skills.json');
      const weaponSkillsData = fs.readFileSync(weaponSkillsPath, 'utf8');
      this.weaponSkillsData = JSON.parse(weaponSkillsData);
    } catch (e) {
      ErrorHandler.handle(e, 'CombatSystem.constructor.loadWeaponSkills');
      this.weaponSkillsData = {};
    }
  }

  // Realm-based config for crit and penetration baselines
  REALM_CONFIG = {
    luyen_khi: { Kcrit: 200, PEN_BASE: 150 },
    truc_co: { Kcrit: 800, PEN_BASE: 500 },
    ket_dan: { Kcrit: 2000, PEN_BASE: 1500 },
    nguyen_anh: { Kcrit: 3000, PEN_BASE: 3500 }
  };

  cleanupExpiredCombats() {
    const now = Date.now();
    for (const [combatId, combat] of this.activeCombats.entries()) {
      if (!combat || !combat.isActive) {
        this.activeCombats.delete(combatId);
        continue;
      }
      const createdAt = Number(combat.id.split('_')[1]) || 0;
      if (createdAt && now - createdAt > CONSTANTS.COMBAT.TIMEOUT_MS) {
        Logger.warn('Cleaning up expired combat', { combatId });
        this.activeCombats.delete(combatId);
      }
    }
  }

  // Khởi tạo trận chiến
  startCombat(player, monster, interaction) {
    const combatId = `${player.id}_${Date.now()}`;

    const combat = {
      id: combatId,
      player: {
        ...player,
        userId: player.id, // Thêm userId để sử dụng sau này
        name: player.username || 'Bạn',
        currentHp: parseFloat(player.stats.hp),
        currentMp: parseFloat(player.stats.mp),
        statusEffects: [],
        cooldowns: {}
      },
      monster: {
        ...monster,
        currentHp: parseFloat(monster.stats.hp),
        currentMp: parseFloat(monster.stats.mp),
        statusEffects: [],
        cooldowns: {}
      },
      turn: 1,
      currentTurn: 'player', // 'player' hoặc 'monster'
      battleLog: [],
      interaction: interaction,
      channel: interaction.channel, // Lưu channel để gửi message mới
      isActive: true
    };

    this.activeCombats.set(combatId, combat);
    Logger.info('Combat created', { combatId, active: this.activeCombats.size });

    // Khởi tạo Action Points và state combat (sẽ được cập nhật trong calculateInitiative)
    combat.playerApMax = this.getApForRealm(player.realm);
    combat.playerAp = combat.playerApMax;
    // Tính initiative để xác định ai đi trước (sau khi đã set AP cơ bản)
    this.calculateInitiative(combat);
    combat.monsterAp = 1;
    combat.turnActions = { attacked: false, usedSkill: false, usedWeaponSkill: false, defended: false };
    // Khởi tạo cooldown theo lượt
    combat.playerCooldowns = {}; // { skillId: remainingTurns }
    combat.monsterCooldowns = {};
    // Khởi tạo speed advantage bonus
    combat.playerApBonus = 0;
    combat.monsterActionBonus = 0;

    // Tự động kết thúc combat sau timeout
    setTimeout(() => {
      if (this.activeCombats.has(combatId)) {
        Logger.warn('Combat timed out, ending', { combatId });
        this.activeCombats.delete(combatId);
      }
    }, CONSTANTS.COMBAT.TIMEOUT_MS);

    return combat;
  }

  // Khởi tạo trận chiến theo nhiều ải (waves)
  startWaveCombat(player, monsters, interaction) {
    if (!Array.isArray(monsters) || monsters.length === 0) {
      throw new Error('startWaveCombat cần mảng quái hợp lệ');
    }

    // Bắt đầu với quái đầu tiên
    const firstMonster = monsters[0];
    const combat = this.startCombat(player, firstMonster, interaction);
    combat.waves = monsters;
    combat.currentWaveIndex = 0;
    combat.battleLog.push(`📣 Bắt đầu ải 1/${monsters.length}: ${firstMonster.name}`);

    return combat;
  }

  // ===== RAID (NHIỀU NGƯỜI VS 1+ QUÁI, NHIỀU ẢI) =====
  startRaidCombat(partyPlayers, wavesMonsters, interaction) {
    if (!Array.isArray(partyPlayers) || partyPlayers.length === 0) {
      throw new Error('startRaidCombat cần danh sách người chơi hợp lệ');
    }
    if (!Array.isArray(wavesMonsters) || wavesMonsters.length === 0) {
      throw new Error('startRaidCombat cần danh sách các ải quái hợp lệ');
    }

    const combatId = `raid_${Date.now()}`;
    const party = partyPlayers.map(p => ({
      ...p,
      userId: p.id,
      name: p.username || 'Người chơi',
      currentHp: parseFloat(p.stats.hp),
      currentMp: parseFloat(p.stats.mp),
      statusEffects: [],
      cooldowns: {}
    }));

    const initWave = wavesMonsters[0].map(m => ({
      ...m,
      currentHp: parseFloat(m.stats.hp),
      currentMp: parseFloat(m.stats.mp),
      statusEffects: [],
      cooldowns: {}
    }));

    const combat = {
      id: combatId,
      mode: 'raid',
      party: party,
      monsters: initWave,
      waves: wavesMonsters,
      currentWaveIndex: 0,
      turn: 1,
      currentTurn: 'party', // 'party' hoặc 'monster'
      currentActorIndex: 0,
      currentActorUserId: party[0].userId,
      battleLog: [],
      interaction: interaction,
      channel: interaction.channel,
      isActive: true,
      // Thêm AP system cho raid
      playerApMax: this.getApForRealm(party[0].realm), // Dùng realm của leader
      playerAp: this.getApForRealm(party[0].realm),
      playerCooldowns: {}, // { skillId: remainingTurns }
      // Speed advantage bonus
      playerApBonus: 0,
      monsterActionBonus: 0,
      // Khởi tạo quota hành động lượt
      turnActions: { attacked: false, usedSkill: false, usedWeaponSkill: false, defended: false }
    };

    this.activeCombats.set(combatId, combat);
    // Build initiative and set first actor
    this.buildRaidInitiative(combat);
    this.setRaidActorFromInitiative(combat);
    combat.battleLog.push(`📣 Bắt đầu RAID - Ải 1/${wavesMonsters.length}`);
    return combat;
  }

  createRaidUI(combat) {
    const waveInfo = `Ải ${(combat.currentWaveIndex || 0) + 1}/${combat.waves.length}`;
    const currentActor = combat.party[combat.currentActorIndex];
    const apInfo = combat.currentTurn === 'party' ? `AP: ${combat.playerAp || 0}/${combat.playerApMax || 1}` : '';

    const icons = this.getStatIcons();
    const fmtBar = (cur, max) => this.renderTextBar(cur, max, 14);
    const fmt = (e) => {
      const s = e.stats || {};
      return `${e.emoji || ''} **${e.name}**\n` +
        `${icons.hp} ${fmtBar(e.currentHp, s.hp || 0)} ${Math.max(0, Math.round(e.currentHp))}/${s.hp || 0}\n` +
        `${icons.mp} ${fmtBar(e.currentMp, s.mp || 0)} ${Math.max(0, Math.round(e.currentMp))}/${s.mp || 0}\n` +
        `${icons.atk} ${s.attack || 0}  • ${icons.def} ${s.defense || 0}  • ${icons.spd} ${s.speed || 0}\n` +
        `${icons.crit} ${s.critical || 0}% • ${icons.eva} ${s.evasion || 0}% • ${icons.regen} ${s.regen || 0}`;
    };
    const partyLines = combat.party.map((p, idx) => {
      const isCurrent = idx === combat.currentActorIndex;
      const apBonus = p.apBonus > 0 ? ` ${icons.apBonus}+${p.apBonus}` : '';
      const tag = isCurrent && combat.currentTurn === 'party' ? ` (Turn • ${apInfo})` : '';
      return `• ${fmt(p)}${apBonus}${tag}`;
    }).join('\n\n');
    const monsterLines = combat.monsters.map((m) => `• ${fmt(m)}`).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor('#F1C40F')
      .setTitle('🏰 Domain Raid')
      .setDescription(`Turn ${combat.turn} • ${waveInfo} • ${combat.currentTurn === 'party' ? `Lượt: ${currentActor?.name}` : 'Lượt: Quái'}`)
      .addFields(
        { name: '👥 Party', value: partyLines || '—', inline: true },
        { name: '👹 Enemy Team', value: monsterLines || '—', inline: true },
        { name: '📜 Log', value: combat.battleLog.slice(-8).join('\n') || '—', inline: false }
      )
      .setFooter({ text: 'Chọn hành động để tiếp tục' })
      .setTimestamp();

    const isPlayerTurn = combat.currentTurn === 'party';
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId(`combat_attack_${combat.id}`).setLabel('⚔️ Tấn Công').setStyle(ButtonStyle.Danger).setDisabled(!isPlayerTurn || (combat.playerAp || 0) <= 0),
        new ButtonBuilder().setCustomId(`combat_defend_${combat.id}`).setLabel('🛡️ Phòng Thủ').setStyle(ButtonStyle.Secondary).setDisabled(!isPlayerTurn || combat.playerAp < 1 || (currentActor && currentActor.defended) || (combat.turnActions?.defended === true)),
        new ButtonBuilder().setCustomId(`combat_skill_${combat.id}`).setLabel('✨ Kỹ Năng').setStyle(ButtonStyle.Primary).setDisabled(!isPlayerTurn || (combat.playerAp || 0) <= 0),
        new ButtonBuilder().setCustomId(`combat_item_${combat.id}`).setLabel('🧪 Vật Phẩm').setStyle(ButtonStyle.Success).setDisabled(!isPlayerTurn),
        new ButtonBuilder().setCustomId(`combat_flee_${combat.id}`).setLabel('🏃 Rời Raid').setStyle(ButtonStyle.Danger).setDisabled(!isPlayerTurn)
      );

    return { embeds: [embed], components: [row] };
  }

  // Tiến lượt RAID cho party
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
  }

  // Lượt quái tấn công cả nhóm
  async performMonsterGroupTurn(combat) {
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
        const actionResult = await this.performMonsterAction(monster, target, combat);
        if (actionResult && actionResult.message) {
          combat.battleLog.push(actionResult.message.replace(monster.name, `${monster.name}`).replace('⚔️', '💥'));
        }

        if (this.checkRaidEnd(combat)) break;
      }

      if (this.checkRaidEnd(combat)) break;
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
        combat.battleLog.push(`🚪 Sang ải ${nextIdx + 1}/${combat.waves.length}`);
        const ui = this.createRaidUI(combat);
        await this.updateCombatUI(combat, ui, combat.interaction);
        return;
      } else {
        // RAID kết thúc thắng lợi
        combat.isActive = false;
        this.activeCombats.delete(combat.id);
        const embed = new (require('discord.js')).EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🏆 RAID Chiến Thắng!')
          .setDescription('Toàn bộ ải đã bị đánh bại!')
          .setTimestamp();
        await this.updateCombatUI(combat, { embeds: [embed], components: [] }, combat.interaction);
        return;
      }
    }

    // Kiểm tra kết thúc, nếu chưa thì trả lượt về party
    if (!this.checkRaidEnd(combat)) {
      combat.currentTurn = 'party';
      this.nextRaidRound(combat);
    }

    // Cập nhật UI sau khi quái hành động
    try {
      const ui = this.createRaidUI(combat);
      await this.updateCombatUI(combat, ui, combat.interaction);
    } catch (e) {
      console.error('Error updating raid UI after monster turn:', e);
    }
  }

  nextRaidRound(combat) {
    combat.turn++;
    // actor đầu tiên còn sống
    const firstAliveIdx = combat.party.findIndex(p => p.currentHp > 0);
    combat.currentActorIndex = Math.max(0, firstAliveIdx);
    combat.currentActorUserId = combat.party[combat.currentActorIndex]?.userId;

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
        allEffectiveSpeeds.push(this.getEffectiveSpeed(player));
      }
    });
    combat.monsters.forEach(monster => {
      if (monster.currentHp > 0) {
        allEffectiveSpeeds.push(this.getEffectiveSpeed(monster));
      }
    });
    const minSpeed = allEffectiveSpeeds.length > 0 ? Math.min(...allEffectiveSpeeds) : 1;

    // Cập nhật AP cho tất cả người chơi dựa trên effective speed
    combat.party.forEach((player, index) => {
      if (player.currentHp > 0) {
        const effectiveSpeed = this.getEffectiveSpeed(player);
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

        const baseAp = this.getApForRealm(player.realm);
        player.apBonus = apBonus;
        player.apMax = baseAp + apBonus;
        player.ap = player.apMax;

        // Log nếu bị slow
        const slowEffect = (player.statusEffects || []).find(e => e.type === 'slow');
        if (slowEffect && slowEffect.value) {
          const baseSpeed = parseFloat(player.stats.speed || 0);
          const reducedSpeed = baseSpeed * (1 - slowEffect.value);
          combat.battleLog.push(`🐌 ${player.name} bị làm chậm! Speed: ${baseSpeed.toFixed(0)} → ${reducedSpeed.toFixed(0)} (AP bonus: ${apBonus})`);
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
    combat.party.forEach(p => this.applyRegeneration(p));
    combat.monsters.forEach(m => this.applyRegeneration(m));
  }

  checkRaidEnd(combat) {
    const allPlayersDown = combat.party.every(p => p.currentHp <= 0);
    const allMonstersDown = combat.monsters.every(m => m.currentHp <= 0);
    if (allPlayersDown) return true;
    if (allMonstersDown) return true;
    return false;
  }

  // Chuyển sang ải tiếp theo
  advanceToNextWave(combat) {
    if (!combat || !Array.isArray(combat.waves)) return false;
    const nextIndex = (combat.currentWaveIndex || 0) + 1;
    if (nextIndex >= combat.waves.length) {
      return false;
    }

    // Thiết lập quái mới
    const nextMonster = combat.waves[nextIndex];
    combat.currentWaveIndex = nextIndex;
    combat.monster = {
      ...nextMonster,
      currentHp: parseFloat(nextMonster.stats.hp),
      currentMp: parseFloat(nextMonster.stats.mp),
      statusEffects: [],
      cooldowns: {}
    };

    // Reset một số trạng thái khi sang ải mới
    combat.turn++;
    combat.currentTurn = 'player';
    combat.playerAp = combat.playerApMax;
    combat.monsterAp = 1;
    combat.turnActions = { attacked: false, usedSkill: false, usedWeaponSkill: false, defended: false };

    combat.battleLog.push(`🚪 Sang ải ${nextIndex + 1}/${combat.waves.length}: ${nextMonster.name}`);
    return true;
  }

  // Tính effective speed (base speed - slow effects)
  getEffectiveSpeed(entity) {
    const baseSpeed = parseFloat(entity.stats?.speed || 0);
    const slowEffect = (entity.statusEffects || []).find(e => e.type === 'slow');
    if (slowEffect && slowEffect.value) {
      return Math.max(1, baseSpeed * (1 - slowEffect.value));
    }
    return baseSpeed;
  }

  // Tính initiative dựa trên speed (hệ thống mới)
  calculateInitiative(combat) {
    // Dùng effective speed (đã tính slow)
    const playerSpeed = this.getEffectiveSpeed(combat.player);
    const monsterSpeed = this.getEffectiveSpeed(combat.monster);

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
    combat.playerApMax = this.getApForRealm(combat.player.realm) + apBonus;
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
      combat.battleLog.push(`⚡ **Speed Advantage**: Bạn được +${apBonus} AP do tốc độ vượt trội!`);
    }
    if (actionBonus > 0) {
      combat.battleLog.push(`⚡ **Speed Advantage**: ${combat.monster.name} được +${actionBonus} action do tốc độ vượt trội!`);
    }
  }

  // Xây dựng initiative cho raid (nhiều người vs nhiều quái)
  buildRaidInitiative(combat) {
    const allEntities = [];

    // Thêm tất cả người chơi (dùng effective speed)
    combat.party.forEach((player, index) => {
      allEntities.push({
        type: 'player',
        index: index,
        id: player.userId || player.id,
        name: player.name || player.username,
        speed: this.getEffectiveSpeed(player),
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
        speed: this.getEffectiveSpeed(monster),
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
        player.apMax = this.getApForRealm(player.realm) + entity.apBonus;
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
          return `⚡ **${e.name}** được +${e.apBonus} AP do tốc độ vượt trội!`;
        } else if (e.actionBonus > 0) {
          return `⚡ **${e.name}** được +${e.actionBonus} action do tốc độ vượt trội!`;
        }
      })
      .filter(Boolean);

    if (speedAdvantageLogs.length > 0) {
      combat.battleLog.push(...speedAdvantageLogs);
    }
  }

  // Thiết lập actor hiện tại từ initiative
  setRaidActorFromInitiative(combat) {
    if (!combat.initiative || combat.initiative.length === 0) {
      Logger.error('No initiative found for raid combat');
      return;
    }

    // Tìm entity đầu tiên còn sống
    let currentIndex = 0;
    for (let i = 0; i < combat.initiative.length; i++) {
      const entity = combat.initiative[i];
      if (entity.type === 'player') {
        const player = combat.party[entity.index];
        if (player && player.currentHp > 0) {
          currentIndex = i;
          break;
        }
      } else {
        const monster = combat.monsters[entity.index];
        if (monster && monster.currentHp > 0) {
          currentIndex = i;
          break;
        }
      }
    }

    combat.initiativeIndex = currentIndex;
    const currentEntity = combat.initiative[currentIndex];

    if (currentEntity.type === 'player') {
      combat.currentTurn = 'party';
      combat.currentActorIndex = currentEntity.index;
      combat.currentActorUserId = currentEntity.id;
      // Cập nhật AP theo realm + apBonus của actor hiện tại
      const actor = combat.party[currentEntity.index];
      const baseAp = this.getApForRealm(actor.realm);
      const bonus = actor.apBonus || 0;
      combat.playerApMax = baseAp + bonus;
      combat.playerAp = combat.playerApMax;
      // Reset trạng thái phòng thủ cho actor hiện tại
      actor.defended = false;
      // Đảm bảo turnActions khởi tạo đúng
      combat.turnActions = { attacked: false, usedSkill: false, usedWeaponSkill: false, defended: false };
    } else {
      combat.currentTurn = 'monster_group';
      combat.currentMonsterIndex = currentEntity.index;
    }

    Logger.info('Raid actor set', {
      currentIndex,
      entity: {
        type: currentEntity.type,
        name: currentEntity.name,
        speed: currentEntity.speed
      },
      currentTurn: combat.currentTurn
    });
  }

  // Chuyển sang actor tiếp theo trong raid
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

  // Thực hiện action của quái (sử dụng AI hiện tại)
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
      return this.performAttack(monster, target, combat);
    } else {
      // Phòng thủ
      return this.performDefend(monster, combat);
    }
  }

  // Tạo UI cho trận chiến
  createCombatUI(combat) {
    const p = combat.player;
    const m = combat.monster;
    const icons = this.getStatIcons();
    const fmtBar = (cur, max) => this.renderTextBar(cur, max, 16);
    const fmt = (e) => {
      const s = e.stats || {};
      // Fix NaN display issues by ensuring valid numbers
      const currentHp = isNaN(e.currentHp) ? 0 : Math.max(0, Math.round(e.currentHp));
      const currentMp = isNaN(e.currentMp) ? 0 : Math.max(0, Math.round(e.currentMp));
      const maxHp = isNaN(s.hp) ? 0 : s.hp || 0;
      const maxMp = isNaN(s.mp) ? 0 : s.mp || 0;

      return `${e.emoji || ''} **${e.name}**\n` +
        `${icons.hp} ${fmtBar(currentHp, maxHp)} ${currentHp}/${maxHp}\n` +
        `${icons.mp} ${fmtBar(currentMp, maxMp)} ${currentMp}/${maxMp}\n` +
        `${icons.atk} ${s.attack || 0}  • ${icons.def} ${s.defense || 0}  • ${icons.spd} ${s.speed || 0}\n` +
        `${icons.crit} ${s.critical || 0}% • ${icons.eva} ${s.evasion || 0}% • ${icons.regen} ${s.regen || 0}`;
    };

    const apText = combat.playerApBonus > 0
      ? `${icons.ap} ${combat.playerAp}/${combat.playerApMax} ${icons.apBonus}+${combat.playerApBonus}`
      : `${icons.ap} ${combat.playerAp}/${combat.playerApMax}`;

    const embed = new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('⚔️ Combat')
      .setDescription(`Turn ${combat.turn}` + (Array.isArray(combat.waves) ? ` • Ải ${(combat.currentWaveIndex || 0) + 1}/${combat.waves.length}` : '') + ` • Lượt: ${combat.currentTurn === 'player' ? 'Bạn' : m.name}`)
      .addFields(
        { name: '👤 Player', value: `${fmt(p)}\n${apText}`, inline: true },
        { name: `${m.emoji || '👹'} Enemy`, value: fmt(m), inline: true },
        { name: '📜 Log', value: combat.battleLog.slice(-8).join('\n') || '—', inline: false }
      )
      .setFooter({ text: 'Chọn hành động để tiếp tục' })
      .setTimestamp();

    // Determine weapon equipped (simple heuristic: has any weapon instance)
    const hasWeapon = Array.isArray(p?.inventory?.weapons) && p.inventory.weapons.length > 0;
    const attackButton = hasWeapon
      ? new ButtonBuilder()
        .setCustomId(`combat_weapon_${combat.id}`)
        .setLabel('🗡️ Vũ Khí')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(combat.currentTurn !== 'player' || (combat.playerAp || 0) <= 0)
      : new ButtonBuilder()
        .setCustomId(`combat_attack_${combat.id}`)
        .setLabel('⚔️ Tấn Công')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(combat.currentTurn !== 'player' || (combat.playerAp || 0) <= 0);

    const row = new ActionRowBuilder()
      .addComponents(
        attackButton,
        new ButtonBuilder()
          .setCustomId(`combat_defend_${combat.id}`)
          .setLabel('🛡️ Phòng Thủ')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(combat.currentTurn !== 'player' || combat.turnActions?.defended || combat.playerAp < 1),
        new ButtonBuilder()
          .setCustomId(`combat_skill_${combat.id}`)
          .setLabel('✨ Kỹ Năng')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(combat.currentTurn !== 'player' || (combat.playerAp || 0) <= 0),
        new ButtonBuilder()
          .setCustomId(`combat_item_${combat.id}`)
          .setLabel('🧪 Vật Phẩm')
          .setStyle(ButtonStyle.Success)
          .setDisabled(combat.currentTurn !== 'player'),
        new ButtonBuilder()
          .setCustomId(`combat_flee_${combat.id}`)
          .setLabel('🏃 Chạy Trốn')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(combat.currentTurn !== 'player')
      );

    // set thumbnail avatar nếu có
    try {
      const url = combat?.interaction?.client?.users?.cache?.get?.(p.userId)?.displayAvatarURL?.({ size: 64 });
      if (url) embed.setThumbnail(url);
    } catch { }

    return { embeds: [embed], components: [row] };
  }

  getStatIcons() {
    return { hp: '❤️', mp: '🔵', atk: '⚔️', def: '🛡️', spd: '🏃', crit: '🎯', eva: '💨', regen: '♻️', ap: '🔶', apBonus: '⚡' };
  }

  renderTextBar(current, max, width = 14) {
    const cur = Math.max(0, Number(current || 0));
    const m = Math.max(1, Number(max || 1));
    const ratio = Math.max(0, Math.min(1, cur / m));
    const filled = Math.round(ratio * width);
    const empty = width - filled;
    return '▰'.repeat(filled) + '▱'.repeat(empty);
  }

  getVariantName(variant) {
    if (variant === 'mutated') return 'Biến Dị';
    if (variant === 'super_mutated') return 'Siêu Biến Dị';
    return 'Thường';
  }

  getDifficultyStars(variant) {
    if (variant === 'mutated') return '⭐⭐';
    if (variant === 'super_mutated') return '⭐⭐⭐';
    return '⭐';
  }

  getApForRealm(realm) {
    // Base AP cố định = 1 cho mọi tu vi
    return 1;
  }

  getElementViName(code) {
    const map = { kim: 'Kim', moc: 'Mộc', thuy: 'Thủy', hoa: 'Hỏa', tho: 'Thổ', phong: 'Phong', loi: 'Lôi', vo_he: 'Vô Hệ' };
    return map[code] || 'Vô Hệ';
  }

  getElementViNameOrNone(code) {
    if (!code || code === 'none' || code === 'vo_he') return 'Không';
    return this.getElementViName(code);
  }

  getTierViName(key) {
    const map = {
      nhat_cap: 'Nhất Cấp', nhi_cap: 'Nhị Cấp', tam_cap: 'Tam Cấp', tu_cap: 'Tứ Cấp',
      ngu_cap: 'Ngũ Cấp', luc_cap: 'Lục Cấp', that_cap: 'Thất Cấp', bat_cap: 'Bát Cấp',
      cuu_cap: 'Cửu Cấp', thap_cap: 'Thập Cấp'
    };
    return map[key] || (key ? key.replace(/_/g, ' ').toUpperCase() : '');
  }

  // Lấy mục tiêu đối xứng cho người chơi
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

  // Lấy mục tiêu đối xứng cho quái vật (ưu tiên taunt)
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

  // Xử lý hành động của người chơi
  async handlePlayerAction(combatId, action, interaction) {
    console.log(`Looking for combat with ID: ${combatId}`);
    console.log(`Active combats:`, Array.from(this.activeCombats.keys()));

    const combat = this.activeCombats.get(combatId);
    if (!combat || !combat.isActive) {
      try {
        await interaction.update({ content: '❌ Trận chiến không tồn tại hoặc đã kết thúc!', components: [] });
      } catch (error) {
        console.error('Error updating interaction:', error);
      }
      return;
    }

    // Chặn người ngoài tương tác
    try {
      const ownerId = combat.player?.userId || combat.player?.id;
      if (interaction.user?.id && ownerId && interaction.user.id !== ownerId) {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Bạn không phải người tham gia trận chiến này!', flags: 64 });
        }
        return;
      }
    } catch (e) {
      console.error('Outsider guard error:', e);
    }

    // Debug state snapshot
    try {
      const ta = combat.turnActions || {};
      console.log('[COMBAT] action=', action, 'user=', interaction.user?.id, 'owner=', combat.player?.userId,
        'turn=', combat.turn, 'currentTurn=', combat.currentTurn,
        'attacked=', !!ta.attacked, 'usedSkill=', !!ta.usedSkill,
        'lock=', !!combat.actionLock, 'uiLock=', combat.uiLock);
    } catch (e) { }

    // RAID MODE: xử lý riêng cho nhiều người
    if (combat.mode === 'raid') {
      // Chỉ cho phép actor hiện tại thao tác
      if (interaction.user?.id && combat.currentActorUserId && interaction.user.id !== combat.currentActorUserId) {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Không phải lượt của bạn!', flags: 64 });
        }
        return;
      }

      if (combat.currentTurn !== 'party') {
        // Lượt quái: để quái đánh rồi cập nhật UI
        await this.performMonsterGroupTurn(combat);
        await this.updateCombatUI(combat, this.createRaidUI(combat), interaction);
        return;
      }

      const actor = combat.party[combat.currentActorIndex];
      let result = null;
      switch (action) {
        case 'attack': {
          // Kiểm tra AP
          if ((combat.playerAp || 0) <= 0) {
            await interaction.reply({ content: '⚠️ Bạn đã hết Action Point!', ephemeral: true });
            return;
          }
          // Tấn công đối xứng theo thứ tự
          const target = this.getSymmetricTarget(actor, combat);
          if (!target) return;
          result = this.performAttack(actor, target, combat);
          if (result && result.message) combat.battleLog.push(`👤 ${actor.name}: ${result.message}`);
          // Trừ AP
          combat.playerAp = Math.max(0, (combat.playerAp || 0) - 1);
          console.log(`[RAID] After ATTACK: AP=${combat.playerAp}/${combat.playerApMax}`);
          break;
        }
        case 'defend':
          result = this.performDefend(actor, combat);
          if (result && result.message) combat.battleLog.push(`👤 ${actor.name}: ${result.message}`);
          // Nếu hết AP sau phòng thủ → chuyển lượt ngay
          if ((combat.playerAp || 0) <= 0) {
            const prevIdx = combat.currentActorIndex;
            this.nextRaidActor(combat);
            const aliveCount = combat.party.filter(p => p.currentHp > 0).length;
            if (combat.currentActorIndex <= prevIdx || aliveCount <= 1) {
              combat.currentTurn = 'monster_group';
              await this.updateCombatUI(combat, this.createRaidUI(combat), interaction);
              await this.performMonsterGroupTurn(combat);
              await this.updateCombatUI(combat, this.createRaidUI(combat), interaction);
              return;
            }
            await this.updateCombatUI(combat, this.createRaidUI(combat), interaction);
            return;
          }
          break;
        case 'skill':
          // Kiểm tra AP
          if ((combat.playerAp || 0) <= 0) {
            await interaction.reply({ content: '⚠️ Bạn đã hết Action Point!', ephemeral: true });
            return;
          }
          // Hiển thị menu kỹ năng cho raid
          result = await this.showRaidSkillMenu(combat, interaction);
          return; // đã update UI bên trong
        case 'flee': {
          // Cho phép rời raid ở lượt của người chơi hiện tại
          const leaver = combat.party[combat.currentActorIndex];
          // Đánh dấu rời trận (coi như bị loại)
          leaver.currentHp = 0;
          combat.battleLog.push(`🏃 ${leaver.name} đã rời RAID!`);
          // Kiểm tra kết thúc RAID
          if (this.checkRaidEnd(combat)) {
            // Nếu tất cả người chơi đã rời/bị hạ hoặc tất cả quái đã chết
            await this.updateCombatUI(combat, this.createRaidUI(combat), interaction);
            // Kết thúc nếu phù hợp
            if (combat.monsters.every(m => m.currentHp <= 0)) {
              // kết thúc như thắng
              // Tái sử dụng luồng kết thúc hiện có
            }
          }
          // Chuyển sang actor tiếp theo hoặc quái
          const prevIdx = combat.currentActorIndex;
          this.nextRaidActor(combat);
          // Nếu quay vòng hoặc không còn actor sống khác → lượt quái
          if (prevIdx >= combat.currentActorIndex || combat.party.filter(p => p.currentHp > 0).length === 0) {
            combat.currentTurn = 'monster_group';
            await this.performMonsterGroupTurn(combat);
          }
          await this.updateCombatUI(combat, this.createRaidUI(combat), interaction);
          return;
        }
        case 'item':
          result = { action: 'item', message: '🧪 Sử dụng vật phẩm (đang phát triển)...' };
          combat.battleLog.push(`👤 ${actor.name}: ${result.message}`);
          break;
        case 'raid_skilluse': {
          const parts = interaction.customId.split('_');
          const skillId = parts.slice(6).join('_');
          const actor = combat.party[combat.currentActorIndex];

          // Kiểm tra AP
          if ((combat.playerAp || 0) <= 0) {
            await interaction.reply({ content: '⚠️ Bạn đã hết Action Point!', ephemeral: true });
            return;
          }

          // Kiểm tra quyền sử dụng skill
          if (interaction.user.id !== actor.id) {
            await interaction.reply({ content: '❌ Bạn không thể sử dụng kỹ năng của người khác!', ephemeral: true });
            return;
          }

          if (combat.actionLock || combat.uiLock !== 'skill_menu') {
            await interaction.reply({ content: '⚠️ Không thể dùng kỹ năng lúc này!', ephemeral: true });
            return;
          }

          combat.actionLock = true;
          combat.uiLock = 'skill_resolve';
          result = await this.useRaidSkill(combat, skillId, interaction);

          // Chỉ trừ AP nếu skill được dùng thành công (không bị CD)
          if (result && result.success) {
            combat.playerAp = Math.max(0, (combat.playerAp || 0) - 1);
            console.log(`[RAID] After SKILL: AP=${combat.playerAp}/${combat.playerApMax}`);
          } else {
            console.log(`[RAID] SKILL failed, no AP consumed: ${result?.message || 'unknown error'}`);
            // Không chuyển lượt nếu skill thất bại
            await this.updateCombatUI(combat, this.createRaidUI(combat), interaction);
            combat.actionLock = false;
            return;
          }

          // Kiểm tra kết thúc ải/quái
          const allMonstersDown = combat.monsters.every(m => m.currentHp <= 0);
          if (allMonstersDown) {
            // Xử lý rewards cho ải vừa hoàn thành
            await this.processWaveRewards(combat, combat.currentWaveIndex || 0, interaction);

            // Nếu còn ải tiếp theo
            const nextIdx = (combat.currentWaveIndex || 0) + 1;
            if (nextIdx < combat.waves.length) {
              combat.currentWaveIndex = nextIdx;
              combat.monsters = combat.waves[nextIdx].map(m => ({
                ...m,
                currentHp: parseFloat(m.stats.hp),
                currentMp: parseFloat(m.stats.mp),
                statusEffects: [],
                cooldowns: {}
              }));
              combat.turn++;
              combat.currentTurn = 'party';
              this.nextRaidRound(combat);
              combat.battleLog.push(`🚪 Sang ải ${nextIdx + 1}/${combat.waves.length}`);
              const ui = this.createRaidUI(combat);
              await this.updateCombatUI(combat, ui, interaction);
              combat.actionLock = false;
              return;
            } else {
              // RAID kết thúc thắng lợi - xử lý rewards cho ải cuối
              await this.processWaveRewards(combat, combat.currentWaveIndex || 0, interaction);

              combat.isActive = false;
              this.activeCombats.delete(combat.id);
              const embed = new (require('discord.js')).EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🏆 RAID Chiến Thắng!')
                .setDescription('Toàn bộ ải đã bị đánh bại!')
                .setTimestamp();
              await this.updateCombatUI(combat, { embeds: [embed], components: [] }, interaction);
              combat.actionLock = false;
              return;
            }
          }

          // Kiểm tra nếu hết AP thì chuyển lượt
          if ((combat.playerAp || 0) <= 0) {
            // Chuyển lượt cho người tiếp theo hoặc quái
            const prevIdx = combat.currentActorIndex;
            this.nextRaidActor(combat);

            // Nếu đã đến cuối vòng (prev >= current) hoặc không còn actor sống khác → lượt quái
            const aliveCount = combat.party.filter(p => p.currentHp > 0).length;
            if (combat.currentActorIndex <= prevIdx || aliveCount <= 1) {
              combat.currentTurn = 'monster_group';
              combat.actionLock = false;
              await this.updateCombatUI(combat, this.createRaidUI(combat), interaction);
              setTimeout(async () => {
                await this.performMonsterGroupTurn(combat);
                await this.updateCombatUI(combat, this.createRaidUI(combat), interaction);
              }, 1000);
              return;
            }
          }

          await this.updateCombatUI(combat, this.createRaidUI(combat), interaction);
          combat.actionLock = false;
          return;
        }
        case 'raid_back':
          combat.uiLock = null;
          await this.updateCombatUI(combat, this.createRaidUI(combat), interaction);
          return;
        case 'back':
          await this.updateCombatUI(combat, this.createRaidUI(combat), interaction);
          return;
      }

      // Kiểm tra kết thúc ải/quái
      const allMonstersDown = combat.monsters.every(m => m.currentHp <= 0);
      if (allMonstersDown) {
        // Xử lý rewards cho ải vừa hoàn thành
        await this.processWaveRewards(combat, combat.currentWaveIndex || 0, interaction);

        // Nếu còn ải tiếp theo
        const nextIdx = (combat.currentWaveIndex || 0) + 1;
        if (nextIdx < combat.waves.length) {
          combat.currentWaveIndex = nextIdx;
          // Tạo quái ải mới
          combat.monsters = combat.waves[nextIdx].map(m => ({
            ...m,
            currentHp: parseFloat(m.stats.hp),
            currentMp: parseFloat(m.stats.mp),
            statusEffects: [],
            cooldowns: {}
          }));
          combat.turn++;
          combat.currentTurn = 'party';
          this.nextRaidRound(combat);
          combat.battleLog.push(`🚪 Sang ải ${nextIdx + 1}/${combat.waves.length}`);
          await this.updateCombatUI(combat, this.createRaidUI(combat), interaction);
          return;
        } else {
          // RAID thắng - xử lý rewards cho ải cuối
          await this.processWaveRewards(combat, combat.currentWaveIndex || 0, interaction);

          combat.isActive = false;
          this.activeCombats.delete(combat.id);
          const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🏆 RAID Chiến Thắng!')
            .setDescription('Toàn bộ ải đã bị đánh bại!')
            .addFields(
              { name: '👥 Party', value: combat.party.map(p => `• ${p.name}`).join('\n') || '—', inline: true },
              { name: 'Ải', value: `${(combat.currentWaveIndex || 0) + 1}/${combat.waves.length}`, inline: true }
            )
            .setTimestamp();
          await this.updateCombatUI(combat, { embeds: [embed], components: [] }, interaction);
          return;
        }
      }

      // Kiểm tra nếu hết AP thì chuyển lượt
      if ((combat.playerAp || 0) <= 0) {
        // Chuyển sang actor tiếp theo hoặc lượt quái
        const prevIdx = combat.currentActorIndex;
        this.nextRaidActor(combat);
        // Nếu đã đến cuối vòng (prev >= current) hoặc không còn actor sống khác → lượt quái
        const aliveCount = combat.party.filter(p => p.currentHp > 0).length;
        if (combat.currentActorIndex <= prevIdx || aliveCount <= 1) {
          combat.currentTurn = 'monster_group';
          // ACK trước khi quái hành động để tránh interaction failed
          await this.updateCombatUI(combat, this.createRaidUI(combat), interaction);
          setTimeout(async () => {
            try { await this.performMonsterGroupTurn(combat); } catch (e) { console.error(e); }
          }, 800);
          return;
        }
      }

      await this.updateCombatUI(combat, this.createRaidUI(combat), interaction);
      return;
    }

    // Nếu là lượt của quái mà người chơi bấm nút, cho quái hành động trước rồi mới trả lượt
    if (combat.currentTurn !== 'player') {
      try {
        await this.performMonsterTurn(combat);
      } catch (e) {
        console.error('Error auto-performing monster turn:', e);
      }
      // Sau khi quái xong lượt, nếu vẫn chưa tới lượt người chơi thì dừng
      if (combat.currentTurn !== 'player') {
        try {
          await this.updateCombatUI(combat, this.createCombatUI(combat), interaction);
        } catch (error) {
          console.error('Error updating after monster auto turn:', error);
        }
        return;
      }
    }

    let result = null;

    switch (action) {
      case 'attack': {
        if ((combat.playerAp || 0) <= 0) {
          await this.updateCombatUI(combat, { content: '⚠️ Bạn đã hết Action Point!', components: [] }, interaction);
          return;
        }
        if (combat.actionLock) {
          await this.updateCombatUI(combat, { content: '⚠️ Đang xử lý hành động, vui lòng chờ...', components: [] }, interaction);
          return;
        }
        combat.actionLock = true;
        result = this.performAttack(combat.player, combat.monster, combat);
        // Ghi log ngay lập tức để không bị mất khi trả lượt sớm
        if (result && result.message) {
          combat.battleLog.push(result.message);
          result._pushed = true;
        }
        // Nếu quái đã chết, kết thúc trận ngay lập tức
        if (this.checkCombatEnd(combat)) {
          combat.actionLock = false;
          await this.endCombat(combat, interaction);
          return;
        }
        // không còn giới hạn 1 lần/turn, chỉ trừ AP
        combat.playerAp = Math.max(0, (combat.playerAp || 0) - 1);
        console.log('[COMBAT] after ATTACK: AP=', combat.playerAp, 'turn=', combat.turn);
        if ((combat.playerAp || 0) <= 0) {
          this.nextTurn(combat);
          if (combat.currentTurn === 'monster') {
            combat.actionLock = false; // ensure unlock before delegating to monster
            // ACK button interaction before handing to monster to avoid "interaction failed"
            await this.updateCombatUI(combat, this.createCombatUI(combat), interaction);
            await this.performMonsterTurn(combat);
            return;
          }
        }
        await this.updateCombatUI(combat, this.createCombatUI(combat), interaction);
        await this.maybeAdvanceTurn(combat, interaction);
        combat.actionLock = false;
        break;
      }
      case 'defend':
        result = this.performDefend(combat.player, combat);
        if (result && result.message) {
          combat.battleLog.push(result.message);
          result._pushed = true;
        }
        // Nếu hết AP sau phòng thủ → chuyển lượt ngay cho quái
        if ((combat.playerAp || 0) <= 0) {
          this.nextTurn(combat);
          if (combat.currentTurn === 'monster') {
            await this.updateCombatUI(combat, this.createCombatUI(combat), interaction);
            await this.performMonsterTurn(combat);
            return;
          }
        }
        break;
      case 'skill':
        if ((combat.playerAp || 0) <= 0) {
          await this.updateCombatUI(combat, { content: '⚠️ Bạn đã hết Action Point!', components: [] }, interaction);
          return;
        }
        if (combat.actionLock) {
          await this.updateCombatUI(combat, { content: '⚠️ Đang xử lý hành động, vui lòng chờ...', components: [] }, interaction);
          return;
        }
        result = await this.showSkillMenu(combat, interaction);
        break;
      case 'weapon': {
        if ((combat.playerAp || 0) <= 0) {
          await this.updateCombatUI(combat, { content: '⚠️ Bạn đã hết Action Point!', components: [] }, interaction);
          return;
        }
        if (combat.actionLock) {
          await this.updateCombatUI(combat, { content: '⚠️ Đang xử lý hành động, vui lòng chờ...', components: [] }, interaction);
          return;
        }
        result = await this.showWeaponMenu(combat, interaction);
        break;
      }
      case 'weaponuse': {
        // customId: combat_weaponuse_<combat.id>_<choice>
        const parts = interaction.customId.split('_');
        const choice = parts.slice(3).join('_');
        result = await this.useWeaponAction(combat, choice, interaction);
        break;
      }
      case 'skilluse': {
        const parts = interaction.customId.split('_');
        // combat_skilluse_<userId>_<ts>_<skillId..>
        const skillId = parts.slice(4).join('_');
        const remainTurns = (combat.playerCooldowns || {})[skillId] || 0;
        console.log('[COMBAT] skilluse clicked skillId=', skillId, 'remainCD=', remainTurns);
        if ((combat.playerAp || 0) <= 0) {
          await this.updateCombatUI(combat, { content: '⚠️ Bạn đã hết Action Point!', components: [] }, interaction);
          return;
        }
        if (combat.actionLock || combat.uiLock !== 'skill_menu') {
          await this.updateCombatUI(combat, { content: '⚠️ Không thể dùng kỹ năng lúc này!', components: [] }, interaction);
          return;
        }
        combat.actionLock = true;
        // không còn giới hạn 1 lần/turn; chỉ trừ AP và kiểm tra cooldown
        combat.uiLock = 'skill_resolve';
        result = await this.usePlayerSkill(combat, skillId, interaction);
        // Nếu quái đã chết sau khi dùng skill, kết thúc trận ngay lập tức
        if (this.checkCombatEnd(combat)) {
          combat.actionLock = false;
          await this.endCombat(combat, interaction);
          return;
        }
        // Chỉ trừ AP nếu skill được dùng thành công (không bị CD)
        if (result && result.success !== false) {
          combat.playerAp = Math.max(0, (combat.playerAp || 0) - 1);
        }
        console.log('[COMBAT] after SKILL: AP=', combat.playerAp, 'turn=', combat.turn);
        // Nếu hết AP, chuyển lượt ngay cho quái hành động lập tức
        if ((combat.playerAp || 0) <= 0) {
          this.nextTurn(combat);
          if (combat.currentTurn === 'monster') {
            combat.actionLock = false; // ensure unlock before delegating to monster
            // ACK button interaction before handing to monster to avoid "interaction failed"
            await this.updateCombatUI(combat, this.createCombatUI(combat), interaction);
            await this.performMonsterTurn(combat);
            return;
          }
        }
        await this.updateCombatUI(combat, this.createCombatUI(combat), interaction);
        // Nếu đã tấn công rồi, kết thúc lượt
        await this.maybeAdvanceTurn(combat, interaction);
        combat.actionLock = false;
        break;
      }
      case 'back': {
        combat.uiLock = null;
        await this.updateCombatUI(combat, this.createCombatUI(combat), interaction);
        return; // Không xử lý tiếp
      }
      case 'item':
        result = await this.showItemMenu(combat, interaction);
        break;
      case 'flee':
        result = this.performFlee(combat);
        // Nếu chạy trốn thất bại → đến lượt quái ngay
        if (!result.combatEnd) {
          this.nextTurn(combat);
          if (combat.currentTurn === 'monster') {
            await this.updateCombatUI(combat, this.createCombatUI(combat), interaction);
            await this.performMonsterTurn(combat);
            return;
          }
        }
        break;
    }

    if (result && result.action !== 'menu') {
      if (!result._pushed) {
        combat.battleLog.push(result.message);
      }

      // Kiểm tra kết thúc trận chiến
      if (this.checkCombatEnd(combat)) {
        await this.endCombat(combat, interaction);
        return;
      }

      // Không auto chuyển lượt tại đây; việc chuyển lượt do maybeAdvanceTurn quyết định theo AP/quota
    } else if (result && result.action === 'menu') {
      // Đã hiển thị menu (đã update UI bên trong), không refresh combat UI nữa
      return;
    }

    // Cập nhật UI (chỉ khi không phải menu)
    const ui = this.createCombatUI(combat);
    await this.updateCombatUI(combat, ui, interaction);
  }

  // Thực hiện tấn công
  performAttack(attacker, defender, combat) {
    // Evade-next: tiêu thụ để né đòn kế tiếp
    const evadeIdx = (defender.statusEffects || []).findIndex(e => e.type === 'evade_next');
    if (evadeIdx !== -1) {
      try { defender.statusEffects.splice(evadeIdx, 1); } catch { }
      return {
        action: 'attack',
        message: `💨 ${defender.name} né tránh hoàn toàn đòn đánh!`,
        damage: 0
      };
    }

    // Dùng ACC/EVA mới trong calculateDamage, nên bỏ hitChance cũ
    const dmgObj = this.calculateDamage(attacker, defender, undefined);
    if (!dmgObj.hit) {
      return {
        action: 'attack',
        message: `❌ ${attacker.name} tấn công nhưng **MISS!**`,
        damage: 0
      };
    }

    const finalDamage = isNaN(dmgObj.damage) ? 1 : Math.max(1, dmgObj.damage);

    defender.currentHp = Math.max(0, (defender.currentHp || 0) - finalDamage);

    const critText = dmgObj.isCritical ? ' **CRITICAL!**' : '';
    const message = `⚔️ ${attacker.name} tấn công gây **${finalDamage.toFixed(1)}** sát thương${critText}!`;

    return {
      action: 'attack',
      message: message,
      damage: finalDamage,
      isCritical: !!dmgObj.isCritical
    };
  }

  // Thực hiện phòng thủ
  performDefend(entity, combat) {
    // Kiểm tra AP cho solo combat
    if (combat.playerAp < 1) {
      return { success: false, message: '❌ Không đủ AP để phòng thủ!' };
    }

    // Kiểm tra đã phòng thủ chưa trong turn này
    if (combat.turnActions && combat.turnActions.defended) {
      return { success: false, message: '❌ Bạn đã phòng thủ trong turn này!' };
    }

    // Kiểm tra cho raid combat - mỗi actor chỉ được phòng thủ 1 lần/turn
    if (combat.party && combat.party.includes(entity)) {
      if (entity.defended) {
        return { success: false, message: '❌ Bạn đã phòng thủ trong turn này!' };
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
      message: `🛡️ ${entity.name} đã phòng thủ! Defense tăng 50% cho lượt tiếp theo.`
    };
  }

  // Thực hiện chạy trốn
  performFlee(combat) {
    const fleeChance = 70; // 70% cơ hội chạy trốn
    const isSuccess = Math.random() * 100 < fleeChance;

    if (isSuccess) {
      combat.isActive = false;
      return {
        action: 'flee',
        message: `🏃 Bạn đã chạy trốn thành công!`,
        combatEnd: true
      };
    } else {
      return {
        action: 'flee',
        message: `❌ Chạy trốn thất bại!`
      };
    }
  }

  // Tính toán cơ hội trúng đích
  calculateHitChance(attacker, defender) {
    // EVA là phần trăm 0-100; clamp để tránh âm
    const evasion = Math.min(90, Math.max(0, parseFloat(defender.stats.evasion) || 0));
    const speed = Math.max(0, parseFloat(attacker.stats.speed) || 0);
    const speedBonus = Math.min(15, speed / 10);
    const hit = 85 - evasion + speedBonus; // base 85%
    return Math.min(95, Math.max(10, hit));
  }

  // Kiểm tra critical hit
  checkCritical(attacker) {
    const realm = attacker.realm || 'luyen_khi';
    const cfg = this.REALM_CONFIG[realm] || this.REALM_CONFIG.luyen_khi;
    const critRating = parseFloat(attacker.stats.critical) || 0; // rating
    const critChance = critRating / (critRating + cfg.Kcrit);
    return Math.random() < critChance;
  }

  // Tính toán sát thương theo hệ chỉ số mới
  calculateDamage(attacker, defender, isCritical) {
    const realm = attacker.realm || 'luyen_khi';
    const cfg = this.REALM_CONFIG[realm] || this.REALM_CONFIG.luyen_khi;

    const attack = parseFloat(attacker.stats.attack) || 0;
    const defense = parseFloat(defender.stats.defense) || 0;
    const acc = parseFloat(attacker.stats.accuracy) || 0;
    const eva = parseFloat(defender.stats.evasion) || 0;
    const pen = parseFloat(attacker.stats.penetration) || 0;

    let finalAttack = attack;
    let finalDefense = defense;

    attacker.statusEffects.forEach(effect => {
      if (effect.type === 'attack_boost') finalAttack *= (1 + effect.value);
      if (effect.type === 'attack_debuff') finalAttack *= Math.max(0, 1 - effect.value);
    });

    defender.statusEffects.forEach(effect => {
      if (effect.type === 'defend') finalDefense *= (1 + effect.defenseBonus);
      if (effect.type === 'defense_bonus') finalDefense *= (1 + effect.value);
    });

    // Hit check ACC vs EVA
    const hitChance = Math.min(Math.max(0.05 + 0.95 * (acc / (acc + Math.max(1, eva))), 0.05), 0.95);
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

    defender.statusEffects.forEach(effect => {
      if (effect.type === 'damage_reduction') {
        baseDamage *= Math.max(0, 1 - effect.value);
      }
    });

    const attackerElement = (attacker.element || 'vo_he');
    const defenderElement = (defender.element || 'vo_he');
    const elementMultiplier = this.getElementDamageMultiplier(attackerElement, defenderElement);
    baseDamage *= elementMultiplier;

    // Validate final damage to prevent NaN
    const finalDamage = isNaN(baseDamage) ? 1 : Math.max(1, baseDamage);

    return { hit: true, damage: finalDamage, isCritical: !!doCrit, elementMultiplier };
  }

  // Bảng hệ số sát thương ngũ hành (attacker -> defender)
  getElementDamageMultiplier(att, def) {
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

  // Thực hiện lượt của quái vật
  async performMonsterTurn(combat) {
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
      result = this.performAttack(monster, player, combat);
    } else {
      // Phòng thủ
      result = this.performDefend(monster, combat);
    }

    combat.battleLog.push(result.message);

    // Kiểm tra kết thúc trận chiến
    if (this.checkCombatEnd(combat)) {
      this.endCombat(combat, combat.interaction);
      return;
    }

    // Chuyển lượt
    this.nextTurn(combat);
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
    const ui = this.createCombatUI(combat);
    await this.updateCombatUI(combat, ui, combat.interaction);
  }

  // Lấy danh sách skills khả dụng (có MP và không cooldown)
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

  // Tính tỉ lệ sử dụng skill dựa trên tình huống
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

  // Sử dụng skill thông minh dựa trên tình huống
  performSmartMonsterSkill(monster, player, availableSkills, hpPercent, mpPercent, combat) {
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

    return this.executeSkill(monster, player, selectedSkill, combat);
  }

  // Thực hiện kỹ năng của quái vật (legacy - giữ để tương thích)
  performMonsterSkill(combat) {
    const monster = combat.monster;
    const tier = this.getMonsterTier(monster);
    const skills = this.getMonsterSkills(monster.element, tier);
    if (skills.length === 0) return null;

    const skill = skills[Math.floor(Math.random() * skills.length)];
    return this.executeSkill(monster, combat.player, skill, combat);
  }

  // Lấy tier của monster dựa trên stats hoặc level
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

  // Lấy danh sách kỹ năng theo element và tier
  getMonsterSkills(element, tier = 1) {
    const fs = require('fs');
    const path = require('path');

    try {
      const skillsData = JSON.parse(fs.readFileSync(
        path.join(__dirname, '../../data/monsters/monster-skills.json'),
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

  // Chuyển đổi element name sang key trong file JSON
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

  // Thực hiện kỹ năng
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
      const dmgObj = this.calculateDamage(caster, target, false);
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

  // Áp dụng effect của skill
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

  // Chuyển lượt
  nextTurn(combat) {
    combat.currentTurn = combat.currentTurn === 'player' ? 'monster' : 'player';

    // Kiểm tra hiệu ứng gây skip/DoT/Per-turn ngay đầu lượt
    this.processTurnStartEffects(combat);
    // Nếu processTurnStartEffects đã tự chuyển lượt lần nữa thì dừng
    // (tránh thực hiện logic refill/bUFF sai lượt)
    // Không thể dễ dàng detect ở đây, nhưng log sẽ phản ánh và flow tiếp

    if (combat.currentTurn === 'player') {
      combat.turn++;

      // Tính lại initiative với effective speed (đã tính slow) để tính AP bonus mới
      const playerEffectiveSpeed = this.getEffectiveSpeed(combat.player);
      const monsterEffectiveSpeed = this.getEffectiveSpeed(combat.monster);
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
      combat.playerApMax = this.getApForRealm(combat.player.realm) + apBonus;
      combat.playerAp = combat.playerApMax;

      // Log nếu bị slow
      const slowEffect = (combat.player.statusEffects || []).find(e => e.type === 'slow');
      if (slowEffect && slowEffect.value) {
        const baseSpeed = parseFloat(combat.player.stats.speed || 0);
        const reducedSpeed = baseSpeed * (1 - slowEffect.value);
        combat.battleLog.push(`🐌 ${combat.player.name} bị làm chậm! Speed: ${baseSpeed.toFixed(0)} → ${reducedSpeed.toFixed(0)} (AP bonus: ${apBonus})`);
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
    this.updateStatusEffects(combat.player);
    this.updateStatusEffects(combat.monster);

    // Hồi phục HP/MP mỗi turn
    this.applyRegeneration(combat.player);
    this.applyRegeneration(combat.monster);
  }

  // Cập nhật status effects
  updateStatusEffects(entity) {
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

  // Áp dụng hồi phục
  applyRegeneration(entity) {
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

  // Nếu người chơi đã attack và đã dùng skill trong lượt → chuyển lượt cho quái
  async maybeAdvanceTurn(combat, interaction) {
    const apLeft = combat.playerAp || 0;
    const attacked = combat.turnActions?.attacked || false;
    const usedSkill = combat.turnActions?.usedSkill || false;

    console.log(`[maybeAdvanceTurn] AP: ${apLeft}, Attacked: ${attacked}, UsedSkill: ${usedSkill}`);

    if (apLeft <= 0 || (attacked && usedSkill)) {
      console.log(`[maybeAdvanceTurn] Advancing turn - AP: ${apLeft}, Attacked: ${attacked}, UsedSkill: ${usedSkill}`);
      this.nextTurn(combat);
      await this.updateCombatUI(combat, this.createCombatUI(combat), interaction);
      if (combat.currentTurn === 'monster') {
        setTimeout(async () => await this.performMonsterTurn(combat), 800);
      }
    }
  }

  // Kiểm tra kết thúc trận chiến
  checkCombatEnd(combat) {
    return combat.player.currentHp <= 0 || combat.monster.currentHp <= 0;
  }

  // Xử lý rewards sau mỗi ải trong domain
  async processWaveRewards(combat, waveIndex, interaction) {
    const playerManager = require('./player.js');
    const SpiritStonesCalculator = require('../utils/game/spirit-stones-calculator.js');
    const ItemDropCalculator = require('../utils/game/item-drop-calculator.js');

    // Tính rewards cho từng player trong party
    for (const player of combat.party) {
      if (player.currentHp <= 0) continue; // Bỏ qua player đã chết

      // Tính EXP và spirit stones dựa trên monsters trong ải vừa hoàn thành
      const currentWave = combat.waves[waveIndex];
      let totalExp = 0;
      let totalSpiritStones = { ha_pham: 0, trung_pham: 0, thuong_pham: 0, cuc_pham: 0 };

      for (const monster of currentWave) {
        totalExp += monster.expReward || 0;
        if (monster.spiritStonesReward) {
          totalSpiritStones.ha_pham += monster.spiritStonesReward;
        }
      }

      // Thêm EXP
      if (totalExp > 0) {
        playerManager.addExperience(player.userId, totalExp);
      }

      // Thêm linh thạch
      if (totalSpiritStones.ha_pham > 0) {
        SpiritStonesCalculator.updatePlayerSpiritStones(player, totalSpiritStones);
      }

      // Thêm vật phẩm
      const storePlayer = playerManager.getPlayer(player.userId) || player;
      const waveItems = ItemDropCalculator.calculateHuntItems(storePlayer);
      waveItems.forEach(item => {
        playerManager.addItemToInventory(storePlayer, item.id, 1);
      });

      // Cập nhật cooldown và spirit stones
      const cooldownManager = require('../utils/game/cooldown.js');
      const lastCommandField = cooldownManager.getLastCommandField('domain');
      const updateData = {
        [lastCommandField]: Date.now(),
        ...SpiritStonesCalculator.createUpdateObject(totalSpiritStones)
      };
      playerManager.updatePlayer(player.userId, updateData);
    }

    // Thêm log về rewards
    combat.battleLog.push(`🎁 Hoàn thành ải ${waveIndex + 1}! Nhận được EXP và vật phẩm.`);
  }

  // Kết thúc trận chiến
  async endCombat(combat, interaction) {
    const playerWon = combat.monster.currentHp <= 0;

    // Nếu là dạng nhiều ải và còn ải tiếp theo, chuyển ải thay vì kết thúc
    if (playerWon && Array.isArray(combat.waves) && (combat.currentWaveIndex + 1) < combat.waves.length) {
      const progressed = this.advanceToNextWave(combat);
      if (progressed) {
        // Cập nhật UI cho ải mới và tiếp tục combat
        const ui = this.createCombatUI(combat);
        await this.updateCombatUI(combat, ui, interaction);
        return;
      }
    }

    combat.isActive = false;
    this.activeCombats.delete(combat.id);
    const color = playerWon ? '#00FF00' : '#FF0000';
    const title = playerWon ? '🏆 Chiến Thắng!' : '💀 Thất Bại!';

    // Cập nhật player data nếu thắng
    if (playerWon) {
      const playerManager = require('./player.js');
      const SpiritStonesCalculator = require('../utils/game/spirit-stones-calculator.js');
      const ItemDropCalculator = require('../utils/game/item-drop-calculator.js');

      // Thêm EXP
      playerManager.addExperience(combat.player.userId, combat.monster.expReward);

      // Thêm linh thạch
      const spiritStones = { ha_pham: combat.monster.spiritStonesReward, trung_pham: 0, thuong_pham: 0, cuc_pham: 0 };
      SpiritStonesCalculator.updatePlayerSpiritStones(combat.player, spiritStones);

      // Thêm vật phẩm (sử dụng bản ghi player trong PlayerManager để đảm bảo lưu đúng)
      const storePlayer = playerManager.getPlayer(combat.player.userId) || combat.player;
      const huntItems = ItemDropCalculator.calculateHuntItems(storePlayer);
      huntItems.forEach(item => {
        playerManager.addItemToInventory(storePlayer, item.id, 1);
      });

      // Cập nhật cooldown
      const cooldownManager = require('../utils/game/cooldown.js');
      const lastCommandField = cooldownManager.getLastCommandField('hunt');
      const updateData = {
        [lastCommandField]: Date.now(),
        ...SpiritStonesCalculator.createUpdateObject(spiritStones)
      };
      playerManager.updatePlayer(combat.player.userId, updateData);
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(`**${combat.player.name}** ${playerWon ? 'đã đánh bại' : 'đã bị đánh bại bởi'} **${combat.monster.name}**`)
      .addFields(
        {
          name: '📊 Thống Kê Trận Đấu',
          value: `**Số lượt**: ${combat.turn}\n**HP còn lại**: ${combat.player.currentHp.toFixed(1)}/${combat.player.stats.hp}`,
          inline: true
        },
        {
          name: '🎁 Phần Thưởng',
          value: playerWon ? `**EXP**: +${combat.monster.expReward}\n**Linh thạch**: +${combat.monster.spiritStonesReward}` : 'Không có phần thưởng',
          inline: true
        }
      )
      .setFooter({ text: Array.isArray(combat.waves) ? `Kết thúc ải ${(combat.currentWaveIndex || 0) + 1}/${combat.waves.length}` : 'Trận chiến đã kết thúc' })
      .setTimestamp();

    // Nếu thắng và có item rơi, thêm field hiển thị vật phẩm
    if (playerWon) {
      try {
        const ItemDropCalculator = require('../utils/game/item-drop-calculator.js');
        const droppedItems = ItemDropCalculator.calculateHuntItems(combat.player) || [];
        if (droppedItems.length > 0) {
          const itemLines = droppedItems.map(it => `• ${it.name || it.id}${it.quantity ? ` x${it.quantity}` : ''}`).join('\n');
          embed.addFields({ name: '🦴 Vật phẩm', value: itemLines, inline: false });
        }
      } catch (e) {
        console.error('Error formatting dropped items:', e);
      }
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('combat_end')
          .setLabel('Kết Thúc')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

    await this.updateCombatUI(combat, { embeds: [embed], components: [row] }, interaction);
  }

  // Cập nhật UI combat
  async updateCombatUI(combat, ui, interaction) {
    try {
      // 1) Nếu là interaction còn sống và chưa replied/deferred → update
      if (
        interaction &&
        typeof interaction.update === 'function' &&
        !interaction.replied &&
        !interaction.deferred &&
        interaction.isRepliable()
      ) {
        await interaction.update(ui);
        return;
      }

      // 2) Nếu interaction đã replied/deferred, ưu tiên edit message gốc của button
      if (interaction && interaction.message && typeof interaction.message.edit === 'function') {
        await interaction.message.edit(ui);
        combat.lastMessage = interaction.message;
        return;
      }

      // 3) Nếu đã lưu lastMessage → edit
      if (combat.lastMessage && typeof combat.lastMessage.edit === 'function') {
        await combat.lastMessage.edit(ui);
        return;
      }

      // 4) Gửi message mới về channel
      if (combat.channel && typeof combat.channel.send === 'function') {
        const newMessage = await combat.channel.send(ui);
        combat.lastMessage = newMessage;
        return;
      }

      console.log('Cannot update UI - no valid interaction/message/channel');
    } catch (error) {
      // Handle specific Discord API errors
      if (error.code === 10062 || error.code === 40060) {
        // Interaction expired or already acknowledged - try fallback
        try {
          if (combat.channel && typeof combat.channel.send === 'function') {
            const newMessage = await combat.channel.send(ui);
            combat.lastMessage = newMessage;
            return;
          }
        } catch (fallbackError) {
          console.error('Fallback UI update failed:', fallbackError);
        }
      } else {
        console.error('Error updating combat UI:', error);
        // Fallback cuối cùng: gửi message mới nếu có thể
        try {
          if (combat.channel && typeof combat.channel.send === 'function') {
            const newMessage = await combat.channel.send(ui);
            combat.lastMessage = newMessage;
          }
        } catch (fallbackError) {
          console.error('Error sending fallback message:', fallbackError);
        }
      }
    }
  }

  // Hiển thị menu kỹ năng cho raid
  async showRaidSkillMenu(combat, interaction) {
    // Khóa UI để tránh refresh/auto-turn ghi đè
    combat.uiLock = 'skill_menu';
    const actor = combat.party[combat.currentActorIndex];
    const learned = actor.skills ? Object.keys(actor.skills) : [];
    const available = learned
      .map(id => this.findSkillById(id))
      .filter(Boolean)
      .slice(0, 4);

    if (available.length === 0) {
      await this.updateCombatUI(combat, { content: '❌ Bạn chưa có kỹ năng để dùng!', components: [] }, interaction);
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
    await this.updateCombatUI(combat, { embeds: [embed], components: [row] }, interaction);
    return { action: 'menu', message: 'Skill menu shown' };
  }

  // Hiển thị menu kỹ năng
  async showSkillMenu(combat, interaction) {
    // Khóa UI để tránh refresh/auto-turn ghi đè
    combat.uiLock = 'skill_menu';
    const player = combat.player;
    const learned = player.skills ? Object.keys(player.skills) : [];
    const available = learned
      .map(id => this.findSkillById(id))
      .filter(Boolean)
      .slice(0, 4);

    if (available.length === 0) {
      await this.updateCombatUI(combat, { content: '❌ Bạn chưa có kỹ năng để dùng!', components: [] }, interaction);
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

    await this.updateCombatUI(combat, { embeds: [embed], components: [row] }, interaction);
    return { action: 'menu', message: 'skill menu' };
  }

  // Hiển thị menu vũ khí: đánh thường hoặc dùng skill theo tiers
  async showWeaponMenu(combat, interaction) {
    combat.uiLock = 'weapon_menu';
    const player = combat.player;
    const weapons = Array.isArray(player?.inventory?.weapons) ? player.inventory.weapons : [];
    if (weapons.length === 0) {
      await this.updateCombatUI(combat, { content: '❌ Bạn chưa trang bị vũ khí!', components: [] }, interaction);
      return { action: 'menu', message: 'no weapon' };
    }
    // Tạm thời coi vũ khí đầu tiên là đang dùng
    const weaponInstance = weapons[0];
    const itemLoader = require('../utils/data/item-loader');
    const weaponInfo = itemLoader.getItemInfo(weaponInstance.id);
    if (!weaponInfo) {
      await this.updateCombatUI(combat, { content: '❌ Không tìm thấy thông tin vũ khí!', components: [] }, interaction);
      return { action: 'menu', message: 'no weapon info' };
    }

    const embed = new EmbedBuilder()
      .setColor('#F39C12')
      .setTitle(`🗡️ Vũ Khí: ${weaponInfo.name}`)
      .setDescription('Chọn hành động vũ khí: đánh thường hoặc kĩ năng vũ khí');

    // Buttons: Normal Attack + Tier skill buttons
    const row = new ActionRowBuilder();
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`combat_weaponuse_${combat.id}_normal`)
        .setLabel('Đánh thường (100%)')
        .setStyle(ButtonStyle.Danger)
    );

    // Unlocked tiers
    const unlocked = weaponInstance.unlockedSkillTiers || [1];
    unlocked.forEach(tier => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`combat_weaponuse_${combat.id}_tier_${tier}`)
          .setLabel(`Skill Tier ${tier}`)
          .setStyle(ButtonStyle.Primary)
      );
    });

    // back
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`combat_back_${combat.id}`)
        .setLabel('Quay lại')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateCombatUI(combat, { embeds: [embed], components: [row] }, interaction);
    return { action: 'menu', message: 'weapon menu' };
  }

  // Xử lý dùng vũ khí: normal hoặc skill tier
  async useWeaponAction(combat, choice, interaction) {
    const player = combat.player;
    const weapons = Array.isArray(player?.inventory?.weapons) ? player.inventory.weapons : [];
    if (weapons.length === 0) {
      await this.updateCombatUI(combat, { content: '❌ Bạn chưa trang bị vũ khí!', components: [] }, interaction);
      return { action: 'weapon', message: 'no weapon' };
    }

    const weaponInstance = weapons[0];
    const itemLoader = require('../utils/data/item-loader');
    const weaponInfo = itemLoader.getItemInfo(weaponInstance.id);
    if (!weaponInfo) {
      await this.updateCombatUI(combat, { content: '❌ Không tìm thấy thông tin vũ khí!', components: [] }, interaction);
      return { action: 'weapon', message: 'no info' };
    }

    let log = `🗡️ ${player.name} dùng vũ khí ${weaponInfo.name}: `;
    if (choice === 'normal') {
      const dmg = Math.max(1, (parseFloat(player.stats?.attack || 0)) * 1 * 1 * 1 - (parseFloat(combat.monster.stats?.defense || 0)));
      combat.monster.currentHp = Math.max(0, (combat.monster.currentHp || 0) - dmg);
      log += `Gây ${dmg.toFixed(1)} sát thương thường.`;
    } else if (choice.startsWith('tier_')) {
      const tier = Number(choice.split('_')[1]);
      const skill = this.getWeaponSkill(weaponInfo.type, tier);
      if (!skill) {
        await this.updateCombatUI(combat, { content: '❌ Không tìm thấy kĩ năng vũ khí!', components: [] }, interaction);
        return { action: 'weapon', message: 'no weapon skill' };
      }
      const dmg = this.calculateWeaponSkillDamage(player, combat.monster, skill, weaponInstance, combat);
      combat.monster.currentHp = Math.max(0, (combat.monster.currentHp || 0) - dmg);
      log += `Dùng "${skill.name}" gây ${dmg.toFixed(1)} sát thương.`;
      // Apply simple effects (crit bonus, slow, stun, etc.) via existing helpers
      this.applyDebuffsFromSkill(player, combat.monster, { effects: skill.effects });
      this.applyBuffsFromSkill(player, { effects: skill.effects });
    }

    // consume AP
    combat.playerAp = Math.max(0, (combat.playerAp || 0) - 1);
    combat.battleLog.push(log);
    combat.uiLock = null;
    await this.updateCombatUI(combat, this.createCombatUI(combat), interaction);
    await this.maybeAdvanceTurn(combat, interaction);
    return { action: 'weapon', message: log };
  }

  // Hiển thị menu vật phẩm
  async showItemMenu(combat, interaction) {
    // TODO: Implement item menu
    return { action: 'menu', message: 'Menu vật phẩm đang được phát triển...' };
  }

  // === RAID SKILL EXECUTION ===
  async useRaidSkill(combat, skillId, interaction) {
    const actor = combat.party[combat.currentActorIndex];
    const skill = this.findSkillById(skillId);
    if (!skill) {
      await interaction.reply({ content: '❌ Kỹ năng không tồn tại!', ephemeral: true });
      return { action: 'skill', message: 'invalid skill' };
    }

    // cooldown check
    const cdTurns = skill.cooldown || 0;
    const remainTurns = combat.playerCooldowns?.[skill.id] || 0;
    if (remainTurns > 0) {
      await interaction.reply({ content: `⏳ Kỹ năng đang hồi (${remainTurns} lượt)!`, ephemeral: true });
      return { action: 'skill', message: 'on cd', success: false };
    }

    // mana check
    const manaCost = skill.effects?.mana_cost || 0;
    if (actor.currentMp < manaCost) {
      await interaction.reply({ content: '❌ Không đủ MP!', ephemeral: true });
      return { action: 'skill', message: 'no mp', success: false };
    }

    // spend mana
    actor.currentMp = Math.max(0, actor.currentMp - manaCost);

    // apply effect
    const type = skill.type || skill.effects?.type || 'attack';
    let log = `✨ ${actor.name} dùng ${skill.name}!`;

    if (type === 'attack') {
      const effects = skill.effects || {};
      if (effects.aoe && Array.isArray(combat.monsters)) {
        let total = 0;
        combat.monsters.filter(t => t.currentHp > 0).forEach(t => {
          const dealt = this.computeAndApplySkillDamage(actor, t, skill, combat);
          total += dealt;
        });
        log += ` Gây **${total.toFixed(1)}** sát thương AoE!`;
      } else {
        const target = this.getSymmetricTarget(actor, combat);
        if (target) {
          const dealt = this.computeAndApplySkillDamage(actor, target, skill, combat);
          log += ` Gây **${dealt.toFixed(1)}** sát thương cho ${target.name}!`;
        }
      }
    } else if (type === 'heal') {
      const ratio = skill.effects?.power || skill.effects?.heal_ratio || 0.3;
      const flatFromRegen = skill.effects?.heal_flat_regen_multiplier
        ? (actor.stats.regen || 0) * skill.effects.heal_flat_regen_multiplier
        : 0;
      const healAmount = actor.stats.hp * ratio + flatFromRegen;
      actor.currentHp = Math.min(actor.stats.hp, actor.currentHp + healAmount);
      log += ` Hồi phục **${healAmount.toFixed(1)}** HP!`;
    } else if (type === 'buff') {
      log += this.applyBuffsFromSkill(actor, skill);
    }

    // debuff/aoe helpers for raid (hỗ trợ skill kiểu support/debuff)
    if (type === 'debuff') {
      const target = this.getSymmetricTarget(actor, combat);
      if (target) log += this.applyDebuffsFromSkill(actor, target, skill);
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
        log += ` Toàn đội hồi máu và tăng hồi phục!`;
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

  // === PLAYER SKILL EXECUTION ===
  async usePlayerSkill(combat, skillId, interaction) {
    const player = combat.player;
    const skill = this.findSkillById(skillId);
    if (!skill) {
      await this.updateCombatUI(combat, { content: '❌ Kỹ năng không tồn tại!', components: [] }, interaction);
      return { action: 'skill', message: 'invalid skill' };
    }
    // cooldown check
    // Lượt cooldown
    const cdTurns = skill.cooldown || 0;
    const remainTurns = combat.playerCooldowns?.[skill.id] || 0;
    if (remainTurns > 0) {
      await this.updateCombatUI(combat, { content: `⏳ Kỹ năng đang hồi (${remainTurns} lượt)!`, components: [] }, interaction);
      return { action: 'skill', message: 'on cd', success: false };
    }
    // mana check
    const manaCost = skill.effects?.mana_cost || 0;
    if (player.currentMp < manaCost) {
      await this.updateCombatUI(combat, { content: '❌ Không đủ MP!', components: [] }, interaction);
      return { action: 'skill', message: 'no mp', success: false };
    }

    // spend mana
    player.currentMp = Math.max(0, player.currentMp - manaCost);
    // apply effect
    const type = skill.type || skill.effects?.type || 'attack';
    let log = `✨ ${player.name} dùng ${skill.name}!`;
    if (type === 'attack') {
      const effects = skill.effects || {};
      // Kiểm tra AoE
      if (effects.aoe) {
        const totalDmg = this.applyAoEDamageToMonsters(player, skill, combat);
        log += ` Gây **${totalDmg.toFixed(1)}** sát thương AoE!`;
      } else {
        const finalDmg = this.computeAndApplySkillDamage(player, combat.monster, skill, combat);
        log += ` Gây ${finalDmg.toFixed(1)} sát thương!`;
      }
    } else if (type === 'heal') {
      const ratio = skill.effects?.power || skill.effects?.heal_ratio || 0.25;
      const flatFromRegen = skill.effects?.heal_flat_regen_multiplier
        ? (player.stats.regen || 0) * skill.effects.heal_flat_regen_multiplier
        : 0;
      const amount = player.stats.hp * ratio + flatFromRegen;
      player.currentHp = Math.min(player.stats.hp, player.currentHp + amount);
      log += ` Hồi ${amount.toFixed(1)} HP!`;
    } else if (type === 'buff') {
      log += this.applyBuffsFromSkill(player, skill);
    } else if (type === 'debuff') {
      log += this.applyDebuffsFromSkill(player, combat.monster, skill);
    }

    // mark cooldown theo lượt (bắt đầu từ lượt tiếp theo)
    combat.playerCooldowns[skill.id] = cdTurns; // sẽ giảm ở nextTurn

    combat.battleLog.push(log);
    // Gỡ khóa UI vì menu đã được xử lý
    combat.uiLock = null;
    // KHÔNG tự chuyển lượt ở đây. Chủ đích: cho phép combo 1 skill + 1 attack trong cùng lượt.
    // Việc chuyển lượt sẽ do caller quyết định thông qua maybeAdvanceTurn.
    await this.updateCombatUI(combat, this.createCombatUI(combat), interaction);
    return { action: 'skill', message: log };
  }

  // find skill in skillsData
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

  // === WEAPON SKILL SYSTEM ===

  // Get weapon skill by type and tier
  getWeaponSkill(weaponType, tier) {
    if (!this.weaponSkillsData || !weaponType) return null;
    const typeSkills = this.weaponSkillsData[weaponType];
    if (!typeSkills) return null;
    const tierKey = `tier_${tier}`;
    return typeSkills[tierKey] || null;
  }

  // Get tier multiplier based on rarity
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

  // Calculate affinity multiplier between spirit root and weapon element
  // Ngũ hành tương sinh: Mộc → Hỏa → Thổ → Kim → Thủy → Mộc
  // Ngũ hành tương khắc: Mộc → Thổ → Thủy → Hỏa → Kim → Mộc
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

  // Calculate weapon skill damage using new formula
  // FinalDamage = ATK × Multiplier × TierMultiplier × Affinity
  // Note: This calculates raw damage, then applies defense reduction
  calculateWeaponSkillDamage(attacker, defender, weaponSkill, weaponInstance, combat) {
    if (!weaponSkill || !weaponInstance) return 0;

    const attackerAtk = parseFloat(attacker.stats?.attack || 0);
    const skillMultiplier = parseFloat(weaponSkill.multiplier || 1.0);

    // Get weapon rarity from weaponInstance (need to look up weapon info)
    const itemLoader = require('../utils/data/item-loader');
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

    // Apply element multiplier (attacker element vs defender element)
    const attackerElement = attacker.element || weaponElement;
    const defenderElement = defender.element || 'vo_he';
    const elementMultiplier = this.getElementDamageMultiplier(attackerElement, defenderElement);
    finalDamage *= elementMultiplier;

    // Validate final damage
    finalDamage = isNaN(finalDamage) ? 1 : Math.max(1, finalDamage);

    return finalDamage;
  }

  // === HELPER: Tính sát thương kỹ năng với các hiệu ứng mở rộng ===
  computeAndApplySkillDamage(attacker, defender, skill, combat) {
    const effects = skill.effects || {};
    // Cơ sở theo hệ thống vật lý
    const baseObj = this.calculateDamage(attacker, defender, false);
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
    finalDmg = isNaN(finalDmg) ? 1 : Math.max(1, finalDmg);

    // Áp dụng sát thương đơn hoặc AoE (solo: vẫn chỉ 1 mục tiêu)
    defender.currentHp = Math.max(0, (defender.currentHp || 0) - finalDmg);

    // Áp dụng các hiệu ứng trạng thái đi kèm
    this.applyOnHitStatus(attacker, defender, skill, combat);

    return finalDmg;
  }

  // === HELPER: Áp dụng AoE damage cho solo combat ===
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
      combat.battleLog.push(`💥 **AoE**: ${logMessages.join(' | ')}`);
    }

    return totalDamage;
  }

  // Áp dụng buff cho bản thân từ skill (trả về text log)
  applyBuffsFromSkill(caster, skill) {
    const e = skill.effects || {};
    const duration = e.duration || 2;
    let log = '';

    if (e.defense_bonus) {
      caster.statusEffects.push({ type: 'defense_bonus', duration, value: e.defense_bonus });
      log += ` Tăng phòng thủ ${Math.round(e.defense_bonus * 100)}% trong ${duration} lượt!`;
    }
    if (e.attack_bonus) {
      caster.statusEffects.push({ type: 'attack_boost', duration, value: e.attack_bonus });
      log += ` Tăng công ${Math.round(e.attack_bonus * 100)}% trong ${duration} lượt!`;
    }
    if (e.critical_bonus) {
      caster.statusEffects.push({ type: 'crit_boost', duration, value: e.critical_bonus });
      log += ` Tăng chí mạng ${Math.round(e.critical_bonus * 100)}% trong ${duration} lượt!`;
    }
    if (e.speed_bonus) {
      caster.statusEffects.push({ type: 'speed_bonus', duration, value: e.speed_bonus });
      log += ` Tăng tốc độ ${Math.round(e.speed_bonus * 100)}% trong ${duration} lượt!`;
    }
    if (e.evade_next) {
      caster.statusEffects.push({ type: 'evade_next', duration: 1 });
      log += ` Sẽ né đòn kế tiếp!`;
    }
    if (e.status_immunity_next) {
      caster.statusEffects.push({ type: 'status_immunity_next', duration: 1 });
      log += ` Miễn nhiễm hiệu ứng xấu kế tiếp!`;
    }
    if (e.instant_heal_ratio) {
      const heal = (caster.stats.hp || 0) * e.instant_heal_ratio;
      caster.currentHp = Math.min(caster.stats.hp, (caster.currentHp || 0) + heal);
      log += ` Hồi ngay ${heal.toFixed(1)} HP!`;
    }
    if (e.per_turn_aoe_atk_ratio) {
      caster.statusEffects.push({ type: 'per_turn_aoe_atk_ratio', duration, value: e.per_turn_aoe_atk_ratio });
      log += ` Kích hoạt sát thương AoE theo lượt (${Math.round(e.per_turn_aoe_atk_ratio * 100)}% ATK trong ${duration} lượt)!`;
    }
    if (e.regen_bonus) {
      caster.statusEffects.push({ type: 'regen_bonus', duration, value: e.regen_bonus });
      log += ` Tăng hồi phục ${Math.round(e.regen_bonus * 100)}% trong ${duration} lượt!`;
    }
    if (e.taunt) {
      caster.statusEffects.push({ type: 'taunt', duration: e.taunt });
      log += ` Khiêu khích kẻ địch trong ${e.taunt} lượt!`;
    }
    return log;
  }

  // Áp dụng debuff lên mục tiêu (trả về text log)
  applyDebuffsFromSkill(caster, target, skill) {
    const e = skill.effects || {};
    let log = '';
    const duration = e.duration || e.enemy_slow_duration || 2;

    // Nếu mục tiêu có miễn nhiễm hiệu ứng → chặn 1 lần
    const immIdx = (target.statusEffects || []).findIndex(x => x.type === 'status_immunity_next');
    const guard = () => { if (immIdx !== -1) { try { target.statusEffects.splice(immIdx, 1); } catch { }; return true; } return false; };

    if (e.enemy_attack_down) {
      if (!guard()) {
        target.statusEffects.push({ type: 'attack_debuff', duration, value: e.enemy_attack_down });
        log += ` Giảm công địch ${Math.round(e.enemy_attack_down * 100)}% trong ${duration} lượt!`;
      } else {
        log += ` (Địch miễn nhiễm hiệu ứng xấu!)`;
      }
    }
    if (e.team_damage_reduction && caster.party) {
      // Áp lên cả team caster trong raid
      (caster.party || []).forEach(p => p.statusEffects.push({ type: 'damage_reduction', duration, value: e.team_damage_reduction }));
      log += ` Toàn đội giảm sát thương ${Math.round(e.team_damage_reduction * 100)}% trong ${duration} lượt!`;
    }
    if (e.enemy_slow_pct) {
      if (!guard()) {
        target.statusEffects.push({ type: 'slow', duration: e.enemy_slow_duration || duration, value: e.enemy_slow_pct });
        log += ` Giảm tốc địch ${Math.round(e.enemy_slow_pct * 100)}% trong ${e.enemy_slow_duration || duration} lượt!`;
      } else {
        log += ` (Địch miễn nhiễm hiệu ứng xấu!)`;
      }
    }
    if (e.stun_chance) {
      if (!guard()) {
        if (Math.random() < (e.stun_chance || 0)) {
          target.statusEffects.push({ type: 'stun', duration: e.stun_duration || 1 });
          log += ` Gây choáng ${e.stun_duration || 1} lượt!`;
        }
      } else {
        log += ` (Địch miễn nhiễm choáng!)`;
      }
    }
    if (e.poison_regen_ratio) {
      // Ghi sẵn sát thương mỗi lượt dựa theo regen hiện tại của caster
      const dot = (caster.stats.regen || 0) * e.poison_regen_ratio;
      if (!guard()) {
        target.statusEffects.push({ type: 'poison', duration, dot });
        log += ` Gây độc trong ${duration} lượt!`;
      } else {
        log += ` (Địch miễn nhiễm độc!)`;
      }
    }
    if (e.burn_ratio_of_atk) {
      const dot = (caster.stats.attack || 0) * e.burn_ratio_of_atk;
      if (!guard()) {
        target.statusEffects.push({ type: 'burn', duration: e.burn_duration || duration, dot });
        log += ` Thiêu đốt trong ${e.burn_duration || duration} lượt!`;
      } else {
        log += ` (Địch miễn nhiễm thiêu đốt!)`;
      }
    }
    if (e.damage_reduction) {
      target.statusEffects.push({ type: 'damage_reduction', duration, value: e.damage_reduction });
      log += ` Giảm sát thương địch ${Math.round(e.damage_reduction * 100)}% trong ${duration} lượt!`;
    }
    return log;
  }

  // Áp dụng các hiệu ứng on-hit đơn giản (stun/slow/...) khi gây damage
  applyOnHitStatus(attacker, defender, skill, combat) {
    const e = skill.effects || {};
    // đã xử lý trong applyDebuffsFromSkill ở nhánh debuff; với attack skill, áp trực tiếp một số hiệu ứng
    if (e.stun_chance && Math.random() < e.stun_chance) {
      const immIdx = (defender.statusEffects || []).findIndex(x => x.type === 'status_immunity_next');
      if (immIdx === -1) {
        defender.statusEffects.push({ type: 'stun', duration: e.stun_duration || 1 });
        if (combat?.battleLog) combat.battleLog.push(`🔒 ${defender.name} bị choáng ${e.stun_duration || 1} lượt!`);
      } else {
        try { defender.statusEffects.splice(immIdx, 1); } catch { }
      }
    }
  }

  // Xử lý DoT/HoT, AoE theo lượt, và choáng skip lượt tại điểm chuyển lượt
  processTurnStartEffects(combat) {
    // Skip lượt nếu entity bị stun
    if (combat.currentTurn === 'player') {
      const p = combat.player;
      const stunIdx = (p.statusEffects || []).findIndex(e => e.type === 'stun');
      if (stunIdx !== -1) {
        // Giảm 1 lượt stun và chuyển lượt cho quái
        p.statusEffects[stunIdx].duration -= 1;
        if (p.statusEffects[stunIdx].duration <= 0) p.statusEffects.splice(stunIdx, 1);
        combat.battleLog.push(`⛔ ${p.name} bị choáng và bỏ lượt!`);
        this.nextTurn(combat);
        return;
      }

      // Per-turn AoE buff từ caster (solo combat)
      const aoe = (p.statusEffects || []).find(e => e.type === 'per_turn_aoe_atk_ratio');
      if (aoe && combat.monster && combat.monster.currentHp > 0) {
        const dmg = Math.max(1, (p.stats.attack || 0) * (aoe.value || 0));
        combat.monster.currentHp = Math.max(0, (combat.monster.currentHp || 0) - dmg);
        combat.battleLog.push(`🔥 Hiệu ứng bộc phát gây ${dmg.toFixed(1)} sát thương lan!`);
      }
    } else if (combat.currentTurn === 'monster') {
      const m = combat.monster;
      const stunIdx = (m.statusEffects || []).findIndex(e => e.type === 'stun');
      if (stunIdx !== -1) {
        m.statusEffects[stunIdx].duration -= 1;
        if (m.statusEffects[stunIdx].duration <= 0) m.statusEffects.splice(stunIdx, 1);
        combat.battleLog.push(`⛔ ${m.name} bị choáng và bỏ lượt!`);
        this.nextTurn(combat);
        return;
      }
    }
  }
}

module.exports = new CombatSystem();
