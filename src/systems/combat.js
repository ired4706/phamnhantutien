const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const Logger = require('../utils/core/logger');
const ErrorHandler = require('../utils/core/error-handler');
const FileManager = require('../utils/data/file-manager');
const CONSTANTS = require('../../config/constants');

// Import combat modules
const {
  CombatHelpers,
  DamageCalculator,
  StatusEffects,
  TurnManager,
  CombatActions,
  SkillSystem,
  WeaponSystem,
  MonsterAI,
  RaidSystem
} = require('./combat/index');

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

    // Initialize combat modules
    this.skillSystem = new SkillSystem(this.skillsData);
    this.weaponSystem = new WeaponSystem(this.weaponSkillsData);
    this.monsterAI = new MonsterAI();
    this.raidSystem = new RaidSystem();

    // Expose helpers for backward compatibility
    this.REALM_CONFIG = CombatHelpers.REALM_CONFIG;
  }

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
    return this.raidSystem.nextRaidActor(combat);
  }

  // Lượt quái tấn công cả nhóm
  async performMonsterGroupTurn(combat) {
    return this.raidSystem.performMonsterGroupTurn(
      combat,
      this.performMonsterAction.bind(this),
      this.checkRaidEnd.bind(this),
      this.nextRaidRound.bind(this),
      this.createRaidUI.bind(this),
      this.updateCombatUI.bind(this)
    );
  }

  nextRaidRound(combat) {
    return this.raidSystem.nextRaidRound(combat);
  }

  checkRaidEnd(combat) {
    return this.raidSystem.checkRaidEnd(combat);
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
    return TurnManager.getEffectiveSpeed(entity);
  }

  // Tính initiative dựa trên speed (hệ thống mới)
  calculateInitiative(combat) {
    return TurnManager.calculateInitiative(combat);
  }

  // Xây dựng initiative cho raid (nhiều người vs nhiều quái)
  buildRaidInitiative(combat) {
    return this.raidSystem.buildRaidInitiative(combat);
  }

  // Thiết lập actor hiện tại từ initiative
  setRaidActorFromInitiative(combat) {
    return this.raidSystem.setRaidActorFromInitiative(combat);
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
    return this.monsterAI.performMonsterAction(monster, target, combat);
  }

  // Tạo UI cho trận chiến
  createCombatUI(combat) {
    const p = combat.player;
    const m = combat.monster;
    const icons = this.getStatIcons();
    const fmtBar = (cur, max) => this.renderTextBar(cur, max, 16);
    const fmtNum = (n) => {
      const num = parseFloat(n) || 0;
      return num.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };
    const fmtNumWithDec = (n) => {
      const num = parseFloat(n) || 0;
      return num.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
    };

    // Get element emoji
    const getElementEmoji = (element) => {
      const map = {
        'kim': '⚔️', 'moc': '🌿', 'thuy': '💧', 'hoa': '🔥', 'tho': '🏔️',
        'phong': '🌪️', 'loi': '⚡', 'vo_he': '🌀'
      };
      return map[element] || '⚫';
    };

    // Get variant rarity icon
    const getVariantRarityIcon = (variant, isBoss = false) => {
      if (isBoss) return '👑'; // Boss
      if (!variant || variant === 'normal') return '✦'; // Normal
      if (variant === 'mutated') return '✧'; // Mutated
      if (variant === 'super_mutated') return '✸'; // Super Mutated
      return '✦'; // Mặc định
    };

    // Format entity với layout cải thiện
    const fmt = (e, isPlayer = false) => {
      const s = e.stats || {};
      const currentHp = isNaN(e.currentHp) ? 0 : Math.max(0, e.currentHp);
      const currentMp = isNaN(e.currentMp) ? 0 : Math.max(0, e.currentMp);
      const maxHp = isNaN(s.hp) ? 0 : (s.hp || 0);
      const maxMp = isNaN(s.mp) ? 0 : (s.mp || 0);
      const elem = e.spiritRoot || e.element || 'vo_he';
      const elemName = this.getElementViNameOrNone(elem);
      const elemEmoji = getElementEmoji(elem);
      const hpPercent = maxHp > 0 ? Math.round((currentHp / maxHp) * 100) : 0;
      const mpPercent = maxMp > 0 ? Math.round((currentMp / maxMp) * 100) : 0;

      // Format số với dấu phẩy cho phần nghìn và dấu chấm cho phần thập phân
      const fmtNumWithComma = (n) => {
        const num = parseFloat(n) || 0;
        const parts = num.toFixed(1).split('.');
        const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return `${intPart}.${parts[1]}`;
      };

      // Format stats mỗi chỉ số 1 dòng (giảm khoảng cách - không có dòng trống giữa các stat)
      const statsText =
        `${icons.atk} ATK: ${fmtNum(s.attack || 0)}\n` +
        `${icons.def} DEF: ${fmtNum(s.defense || 0)}\n` +
        `${icons.spd} SPD: ${fmtNum(s.speed || 0)}\n` +
        `${icons.regen} Regen: ${fmtNum(s.regen || 0)}\n` +
        `🎯 ACC: ${fmtNum(s.accuracy || 0)}%\n` +
        `${icons.eva} EVA: ${fmtNum(s.evasion || 0)}%\n` +
        `${icons.crit} Crit: ${fmtNum(s.critical || 0)}%\n` +
        `🔪 PEN: ${fmtNum(s.penetration || 0)}`;

      // Progress bar cho HP/MP
      const hpBar = fmtBar(Math.round(currentHp), Math.round(maxHp));
      const mpBar = fmtBar(Math.round(currentMp), Math.round(maxMp));

      // Format tên: icon nguyên tố ở đầu, icon độ hiếm ở cuối (chỉ cho quái)
      let nameDisplay = '';
      if (!isPlayer) {
        // Làm sạch tên quái: loại bỏ emoji và variant name cũ
        let cleanName = e.name;
        // Loại bỏ emoji variant cũ (✦, ✧, ✸, 👑, 💀, 🔴)
        cleanName = cleanName.replace(/[✦✧✸👑💀🔴]/g, '').trim();
        // Loại bỏ variant name cũ
        cleanName = cleanName.replace(/\s*(Biến Dị|Biến dị|Siêu Biến Dị|Siêu biến dị)\s*/gi, '').trim();
        // Loại bỏ (BOSS)
        cleanName = cleanName.replace(/\s*\(BOSS\)\s*/gi, '').trim();

        // Lấy icon độ hiếm
        const rarityIcon = getVariantRarityIcon(e.variant, e.isBoss);

        // Format: icon nguyên tố + tên + icon độ hiếm
        nameDisplay = `${elemEmoji} **${cleanName}** ${rarityIcon}`;
      } else {
        // Người chơi chỉ hiển thị icon nguyên tố
        nameDisplay = `${elemEmoji} **${e.name}**`;
      }

      // Format với code block để tách rõ
      return `${nameDisplay}\n` +
        `\n` +
        `${icons.hp} ${hpBar}\n` +
        `     ${fmtNumWithComma(currentHp)} / ${fmtNumWithComma(maxHp)} (${hpPercent}%)\n` +
        `\n` +
        `${icons.mp} ${mpBar}\n` +
        `     ${fmtNumWithComma(currentMp)} / ${fmtNumWithComma(maxMp)} (${mpPercent}%)\n` +
        `\n` +
        `${statsText}\n`;
    };

    const apText = combat.playerApBonus > 0
      ? `${icons.ap} AP: ${combat.playerAp}/${combat.playerApMax} (+${combat.playerApBonus})`
      : `${icons.ap} AP: ${combat.playerAp}/${combat.playerApMax}`;

    // Format combat log với icon và format mới
    const formatLogEntry = (entry) => {
      if (!entry) return '';

      let formatted = entry;
      let icon = '⚔️'; // Icon mặc định

      // Loại bỏ tất cả emoji thừa ở đầu dòng (🧠, ⚔️, ✨, 🎲, etc.)
      formatted = formatted.replace(/^[🧠⚔️✨🎲🛡⛔🔄🔥🐌]+\s*/g, '').trim();

      // Loại bỏ các bold hiện có (trừ khi là tên)
      formatted = formatted.replace(/\*\*/g, '');

      // Bỏ emoji variant trước tên quái (⭐⭐, ⭐⭐⭐, etc.)
      formatted = formatted.replace(/⭐+/g, '').trim();

      // Xác định icon dựa trên nội dung
      if (formatted.includes('đi trước') || formatted.includes('Initiative')) {
        icon = '🎲';
      } else if (formatted.includes('phòng thủ') || formatted.includes('DEF')) {
        icon = '🛡';
      } else if (formatted.includes('tấn công') || formatted.includes('attack') || formatted.includes('dùng vũ khí')) {
        icon = '⚔️';
      } else if (formatted.includes('kỹ năng') || formatted.includes('skill') || formatted.includes('dùng') || formatted.includes('sử dụng')) {
        icon = '✨';
      } else if (formatted.includes('choáng') || formatted.includes('stun')) {
        icon = '⛔';
      } else if (formatted.includes('phản kích') || formatted.includes('counter')) {
        icon = '🔄';
      } else if (formatted.includes('cháy') || formatted.includes('burn')) {
        icon = '🔥';
      } else if (formatted.includes('chậm') || formatted.includes('slow')) {
        icon = '🐌';
      }

      // Tên người chơi in đậm
      formatted = formatted.replace(new RegExp(`\\b${p.name}\\b`, 'g'), `**${p.name}**`);

      // Tên quái in đậm với icon độ hiếm ở sau tên (không ở đầu)
      // Loại bỏ icon độ hiếm ở đầu dòng nếu có
      formatted = formatted.replace(/^[✦✧✸👑]\s+/, '').trim();

      // Làm sạch tên quái: loại bỏ emoji và variant name cũ
      let cleanMonsterName = m.name;
      cleanMonsterName = cleanMonsterName.replace(/[✦✧✸👑💀🔴]/g, '').trim();
      cleanMonsterName = cleanMonsterName.replace(/\s*(Biến Dị|Biến dị|Siêu Biến Dị|Siêu biến dị)\s*/gi, '').trim();
      cleanMonsterName = cleanMonsterName.replace(/\s*\(BOSS\)\s*/gi, '').trim();

      const monsterNamePattern = new RegExp(`\\b${m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');

      // Lấy icon độ hiếm
      const rarityIcon = getVariantRarityIcon(m.variant, m.isBoss);

      // Hiển thị tên quái với icon độ hiếm ở sau tên
      formatted = formatted.replace(monsterNamePattern, `**${cleanMonsterName}** ${rarityIcon}`);

      // Chuyển "sử dụng" thành "dùng"
      formatted = formatted.replace(/sử dụng/gi, 'dùng');

      // Format damage TRƯỚC để tránh match sai trong format skill name
      // Format damage: "gây X sát thương" -> "-> X sát thương" (không in đậm)
      formatted = formatted.replace(/(?:gây|Gây)\s+(\d+\.?\d*)\s+sát thương/gi, '-> $1 sát thương');
      // Format damage có sẵn: "→ X sát thương" -> "-> X sát thương"
      formatted = formatted.replace(/→\s+(\d+\.?\d*)\s+sát thương/gi, '-> $1 sát thương');

      // In đậm tên kỹ năng và loại bỏ dấu chấm than, dấu ngoặc kép thừa
      // Pattern: match "dùng" + tên skill (có thể có dấu ngoặc kép), dừng lại trước -> hoặc số
      formatted = formatted.replace(/dùng\s+([^->0-9]+?)(?:\s*->|\s*!|$)/g, (match, skillPart) => {
        // Loại bỏ dấu ngoặc kép thừa và trim
        let cleanSkillName = skillPart.trim().replace(/^"+|"+$/g, '').trim();
        // Nếu skillName rỗng, giữ nguyên match
        if (!cleanSkillName) return match;
        return `dùng **"${cleanSkillName}"**`;
      });

      // Critical -> **CRITICAL** (bold + caps)
      formatted = formatted.replace(/CRITICAL/gi, '**CRITICAL**');

      // Viết tắt stat in hoa và loại bỏ từ thừa
      formatted = formatted.replace(/attack/gi, 'ATK');
      formatted = formatted.replace(/defense/gi, 'DEF');
      formatted = formatted.replace(/speed/gi, 'SPD');
      formatted = formatted.replace(/accuracy/gi, 'ACC');
      formatted = formatted.replace(/evasion/gi, 'EVA');
      formatted = formatted.replace(/critical/gi, 'CRIT');
      formatted = formatted.replace(/penetration/gi, 'PEN');

      // Format initiative và các message đặc biệt
      if (formatted.includes('Initiative') || formatted.includes('đi trước')) {
        formatted = formatted.replace(/Initiative:?\s*/i, '').replace(/Bạn đi trước/i, 'Bạn đi trước');
      }

      // Loại bỏ dấu cuối câu
      formatted = formatted.replace(/[.!?]+$/g, '').trim();

      // Loại bỏ emoji thừa
      formatted = formatted.replace(/⚔️|🗡️/g, '').trim();

      // Format hiệu ứng: thêm "+" trước %, đổi "trong X lượt" thành "(X lượt)"
      // Tăng/Giảm +X% (Y lượt)
      // Pattern: "Tăng DEF 15%" -> "Tăng DEF +15%"
      formatted = formatted.replace(/(Tăng|tăng)\s+([A-Z]+)\s+(\d+)%/gi, (match, action, stat, percent) => {
        return `${action} ${stat} +${percent}%`;
      });
      // Pattern: "Giảm DEF 15%" -> "Giảm DEF -15%"
      formatted = formatted.replace(/(Giảm|giảm)\s+([A-Z]+)\s+(\d+)%/gi, (match, action, stat, percent) => {
        return `${action} ${stat} -${percent}%`;
      });
      // Pattern: "trong X lượt" -> "(X lượt)"
      formatted = formatted.replace(/trong\s+(\d+)\s+lượt/gi, '($1 lượt)');

      // Tách log thành nhiều dòng CHỈ KHI CÓ HIỆU ỨNG (buff/debuff)
      // Kiểm tra xem có từ khóa hiệu ứng không
      const effectKeywords = /(tăng|giảm|bị|sẽ|miễn nhiễm|kích hoạt|hồi|khiêu khích)/i;
      const hasEffects = effectKeywords.test(formatted);

      // Chỉ tách log nếu có hiệu ứng
      if (hasEffects) {
        const namePattern = /\*\*[^*]+\*\*/g;
        const names = formatted.match(namePattern) || [];

        if (names.length > 1) {
          // Có nhiều phần với nhiều tên, tách thành nhiều dòng
          const parts = [];
          let currentIndex = 0;

          // Tách dựa trên vị trí của mỗi tên
          for (let i = 0; i < names.length; i++) {
            const name = names[i];
            const nameIndex = formatted.indexOf(name, currentIndex);

            if (i === 0) {
              // Phần đầu: từ đầu đến hết tên đầu tiên
              const firstPart = formatted.substring(0, nameIndex + name.length).trim();
              if (firstPart) {
                parts.push(`${icon} ${firstPart}`);
              }
            } else {
              // Phần tiếp theo: từ sau tên trước đến hết tên hiện tại
              const prevName = names[i - 1];
              const prevNameIndex = formatted.indexOf(prevName, currentIndex - prevName.length);
              const prevNameEnd = prevNameIndex + prevName.length;
              const segment = formatted.substring(prevNameEnd, nameIndex + name.length).trim();

              if (segment) {
                // Loại bỏ tên trùng lặp nếu cùng một tên
                const cleanSegment = segment.replace(new RegExp(`^\\*\\*${name.replace(/\*/g, '')}\\*\\*\\s*`), '');
                if (cleanSegment) {
                  parts.push(`    -> ${cleanSegment}`);
                } else {
                  parts.push(`    -> ${segment}`);
                }
              }
            }

            currentIndex = nameIndex + name.length;
          }

          // Phần cuối (sau tên cuối cùng)
          const lastName = names[names.length - 1];
          const lastNameIndex = formatted.lastIndexOf(lastName);
          const lastNameEnd = lastNameIndex + lastName.length;
          const lastSegment = formatted.substring(lastNameEnd).trim();

          if (lastSegment) {
            parts.push(`    -> ${lastSegment}`);
          }

          if (parts.length > 1) {
            return parts.join('\n');
          }
        } else if (names.length === 1) {
          // Có một tên nhưng có nhiều hiệu ứng, tách dựa trên từ khóa
          const effectPattern = /(tăng|giảm|bị|sẽ|miễn nhiễm|kích hoạt|hồi|khiêu khích)/gi;
          const matches = [...formatted.matchAll(effectPattern)];

          if (matches.length > 1) {
            // Có nhiều hiệu ứng, tách thành nhiều dòng
            const parts = [];
            const name = names[0];
            const nameIndex = formatted.indexOf(name);

            // Tìm phần đầu (từ đầu đến hết phần chính, có thể có "dùng", "sử dụng", "gây sát thương")
            // Tìm vị trí hiệu ứng đầu tiên
            const firstEffectIndex = matches[0].index;
            let firstPartEnd = firstEffectIndex;

            // Nếu có "gây sát thương" trước hiệu ứng đầu tiên, bao gồm nó
            const damagePattern = /->\s+[\d.]+\s+sát thương/i;
            const damageMatch = formatted.substring(0, firstEffectIndex).match(damagePattern);
            if (damageMatch) {
              firstPartEnd = formatted.indexOf(damageMatch[0]) + damageMatch[0].length;
            } else {
              // Tìm dấu ngoặc kép cuối cùng (kết thúc tên kỹ năng) hoặc dấu chấm than
              const lastQuoteIndex = formatted.lastIndexOf('"', firstEffectIndex);
              const exclamationIndex = formatted.indexOf('!', nameIndex + name.length);

              if (lastQuoteIndex !== -1 && lastQuoteIndex < firstEffectIndex) {
                firstPartEnd = lastQuoteIndex + 1; // Sau dấu ngoặc kép cuối
              } else if (exclamationIndex !== -1 && exclamationIndex < firstEffectIndex) {
                firstPartEnd = exclamationIndex + 1;
              }
            }

            const firstPart = formatted.substring(0, firstPartEnd).trim();
            parts.push(`${icon} ${firstPart}`);

            // Tách các hiệu ứng
            let lastIndex = firstPartEnd;
            for (let i = 0; i < matches.length; i++) {
              const match = matches[i];
              if (match.index >= lastIndex) {
                // Tìm điểm kết thúc của hiệu ứng này (trước hiệu ứng tiếp theo hoặc cuối chuỗi)
                let segmentEnd;
                if (i < matches.length - 1) {
                  segmentEnd = matches[i + 1].index;
                } else {
                  segmentEnd = formatted.length;
                }

                const segment = formatted.substring(lastIndex, segmentEnd).trim();
                if (segment) {
                  parts.push(`    -> ${segment}`);
                }
                lastIndex = segmentEnd;
              }
            }

            if (parts.length > 1) {
              return parts.join('\n');
            }
          }
        }
      }

      // Không có hiệu ứng hoặc chỉ có 1 phần, giữ nguyên 1 dòng
      return `${icon} ${formatted}`;
    };

    const logEntries = combat.battleLog.slice(-6).map(formatLogEntry);
    const formattedLog = logEntries.length > 0
      ? logEntries.join('\n')
      : '⚪ _Chưa có hành động_';

    // Title gộp turn và lượt
    const waveInfo = Array.isArray(combat.waves) ? ` • Ải ${(combat.currentWaveIndex || 0) + 1}/${combat.waves.length}` : '';
    const turnText = combat.currentTurn === 'player'
      ? `Turn ${combat.turn}${waveInfo} – Lượt của bạn`
      : `Turn ${combat.turn}${waveInfo} – Lượt: ${m.name}`;

    const embed = new EmbedBuilder()
      .setColor(combat.currentTurn === 'player' ? '#4CAF50' : '#F44336')
      .setTitle(`⚔️ ${turnText}`)
      .addFields(
        { name: '👤 **Người Chơi**', value: fmt(p, true), inline: true },
        { name: `${m.emoji || '👹'} **Đối Thủ**`, value: fmt(m), inline: true },
        { name: apText, value: '', inline: false },
        { name: '📜 **Nhật Ký Chiến Đấu**', value: formattedLog, inline: false }
      )
      .setFooter({ text: 'Chọn hành động để tiếp tục' })
      .setTimestamp();

    // Determine weapon equipped - check if player has weapon equipped, not just in inventory
    const hasWeapon = p?.equipment?.weapon && p.equipment.weapon !== null;
    const canAct = combat.currentTurn === 'player' && (combat.playerAp || 0) > 0;

    // Tất cả nút dùng Primary style khi có thể bấm, Secondary khi disabled
    const attackButton = hasWeapon
      ? new ButtonBuilder()
        .setCustomId(`combat_weapon_${combat.id}`)
        .setLabel('🗡 Vũ Khí')
        .setStyle(canAct ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(!canAct)
      : new ButtonBuilder()
        .setCustomId(`combat_attack_${combat.id}`)
        .setLabel('🗡 Tấn Công')
        .setStyle(canAct ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(!canAct);

    const canDefend = combat.currentTurn === 'player' && !combat.turnActions?.defended && combat.playerAp >= 1;
    const canUseSkill = combat.currentTurn === 'player' && (combat.playerAp || 0) > 0;
    const canUseItem = combat.currentTurn === 'player';

    const row = new ActionRowBuilder()
      .addComponents(
        attackButton,
        new ButtonBuilder()
          .setCustomId(`combat_defend_${combat.id}`)
          .setLabel('🛡 Phòng Thủ')
          .setStyle(canDefend ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(!canDefend),
        new ButtonBuilder()
          .setCustomId(`combat_skill_${combat.id}`)
          .setLabel('🔥 Kỹ Năng')
          .setStyle(canUseSkill ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(!canUseSkill),
        new ButtonBuilder()
          .setCustomId(`combat_item_${combat.id}`)
          .setLabel('🎒 Vật Phẩm')
          .setStyle(canUseItem ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(!canUseItem),
        new ButtonBuilder()
          .setCustomId(`combat_flee_${combat.id}`)
          .setLabel('🚪 Chạy Trốn')
          .setStyle(canUseItem ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(!canUseItem)
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
    if (variant === 'mutated') return 'Biến dị';
    if (variant === 'super_mutated') return 'Siêu biến dị';
    return 'Thường';
  }

  getDifficultyStars(variant) {
    if (variant === 'mutated') return '⭐⭐';
    if (variant === 'super_mutated') return '⭐⭐⭐';
    return '⭐';
  }

  getApForRealm(realm) {
    return CombatHelpers.getApForRealm(realm);
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
    return this.raidSystem.getSymmetricTarget(actor, combat);
  }

  // Lấy mục tiêu đối xứng cho quái vật (ưu tiên taunt)
  getSymmetricTargetForMonster(monster, monsterIndex, combat) {
    return this.raidSystem.getSymmetricTargetForMonster(monster, monsterIndex, combat);
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
        // combat.id có '_' nên không thể split đơn thuần; dùng prefix chuẩn để cắt choice
        // Guard: require correct UI state and prevent double execution
        if ((combat.playerAp || 0) <= 0) {
          await this.updateCombatUI(combat, { content: '⚠️ Bạn đã hết Action Point!', components: [] }, interaction);
          return;
        }
        if (combat.actionLock || combat.uiLock !== 'weapon_menu') {
          await this.updateCombatUI(combat, { content: '⚠️ Không thể dùng vũ khí lúc này!', components: [] }, interaction);
          return;
        }
        combat.actionLock = true;
        const expectedPrefix = `combat_weaponuse_${combat.id}_`;
        let choice = '';
        if (interaction.customId && interaction.customId.startsWith(expectedPrefix)) {
          choice = interaction.customId.slice(expectedPrefix.length);
        } else {
          // Fallback: lấy phần sau cùng
          const parts = interaction.customId.split('_');
          choice = parts[parts.length - 1];
        }
        result = await this.useWeaponAction(combat, choice, interaction);
        combat.actionLock = false;
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
    return CombatActions.performAttack(attacker, defender, combat);
  }

  // Thực hiện phòng thủ
  performDefend(entity, combat) {
    return CombatActions.performDefend(entity, combat);
  }

  // Thực hiện chạy trốn
  performFlee(combat) {
    return CombatActions.performFlee(combat);
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
    return DamageCalculator.calculateDamage(attacker, defender, isCritical);
  }

  // Bảng hệ số sát thương ngũ hành (attacker -> defender)
  getElementDamageMultiplier(att, def) {
    return DamageCalculator.getElementDamageMultiplier(att, def);
  }

  // Thực hiện lượt của quái vật
  async performMonsterTurn(combat) {
    return this.monsterAI.performMonsterTurn(
      combat,
      this.checkCombatEnd.bind(this),
      this.endCombat.bind(this),
      this.nextTurn.bind(this),
      this.createCombatUI.bind(this),
      this.updateCombatUI.bind(this)
    );
  }

  // Lấy danh sách skills khả dụng (có MP và không cooldown)
  getAvailableMonsterSkills(monster) {
    return this.monsterAI.getAvailableMonsterSkills(monster);
  }

  // Tính tỉ lệ sử dụng skill dựa trên tình huống
  calculateSkillChance(monster, hpPercent, mpPercent, playerHpPercent, availableSkills) {
    return this.monsterAI.calculateSkillChance(monster, hpPercent, mpPercent, playerHpPercent, availableSkills);
  }

  // Sử dụng skill thông minh dựa trên tình huống
  performSmartMonsterSkill(monster, player, availableSkills, hpPercent, mpPercent, combat) {
    return this.monsterAI.performSmartMonsterSkill(monster, player, availableSkills, hpPercent, mpPercent, combat);
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
    return this.monsterAI.getMonsterTier(monster);
  }

  // Lấy danh sách kỹ năng theo element và tier
  getMonsterSkills(element, tier = 1) {
    return this.monsterAI.getMonsterSkills(element, tier);
  }

  // Chuyển đổi element name sang key trong file JSON
  getElementKey(element) {
    return this.monsterAI.getElementKey(element);
  }

  // Thực hiện kỹ năng
  executeSkill(caster, target, skill, combat) {
    return this.monsterAI.executeSkill(caster, target, skill, combat);
  }


  // Chuyển lượt
  nextTurn(combat) {
    return TurnManager.nextTurn(combat);
  }

  // Cập nhật status effects
  updateStatusEffects(entity) {
    return StatusEffects.updateStatusEffects(entity);
  }

  // Áp dụng hồi phục
  applyRegeneration(entity) {
    return StatusEffects.applyRegeneration(entity);
  }

  // Nếu người chơi đã attack và đã dùng skill trong lượt → chuyển lượt cho quái
  async maybeAdvanceTurn(combat, interaction) {
    const apLeft = combat.playerAp || 0;
    const attacked = combat.turnActions?.attacked || false;
    const usedSkill = combat.turnActions?.usedSkill || false;

    console.log(`[maybeAdvanceTurn] AP: ${apLeft}, Attacked: ${attacked}, UsedSkill: ${usedSkill}`);

    if (apLeft <= 0 || (attacked && usedSkill)) {
      console.log(`[maybeAdvanceTurn] Advancing turn - AP: ${apLeft}, Attacked: ${attacked}, UsedSkill: ${usedSkill}`);
      TurnManager.maybeAdvanceTurn(combat, interaction);
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
    return this.skillSystem.showSkillMenu(combat, interaction, this.updateCombatUI.bind(this));
  }

  // Hiển thị menu vũ khí: đánh thường hoặc dùng skill theo tiers
  async showWeaponMenu(combat, interaction) {
    return this.weaponSystem.showWeaponMenu(combat, interaction, this.updateCombatUI.bind(this));
  }

  // Xử lý dùng vũ khí: normal hoặc skill tier
  async useWeaponAction(combat, choice, interaction) {
    return this.weaponSystem.useWeaponAction(
      combat,
      choice,
      interaction,
      this.updateCombatUI.bind(this),
      this.createCombatUI.bind(this),
      this.maybeAdvanceTurn.bind(this)
    );
  }

  // Mô tả trực quan các skill của vũ khí (tương tự skill người chơi)
  buildWeaponSkillDescription(weaponInfo, weaponInstance) {
    return this.weaponSystem.buildWeaponSkillDescription(weaponInfo, weaponInstance);
  }

  // Hiển thị menu vật phẩm
  async showItemMenu(combat, interaction) {
    // TODO: Implement item menu
    return { action: 'menu', message: 'Menu vật phẩm đang được phát triển...' };
  }

  // === RAID SKILL EXECUTION ===
  async useRaidSkill(combat, skillId, interaction) {
    return this.skillSystem.useRaidSkill(
      combat,
      skillId,
      interaction,
      this.getSymmetricTarget.bind(this)
    );
  }

  // === PLAYER SKILL EXECUTION ===
  async usePlayerSkill(combat, skillId, interaction) {
    return this.skillSystem.usePlayerSkill(
      combat,
      skillId,
      interaction,
      this.updateCombatUI.bind(this),
      this.createCombatUI.bind(this)
    );
  }

  // find skill in skillsData
  findSkillById(id) {
    return this.skillSystem.findSkillById(id);
  }

  // === WEAPON SKILL SYSTEM ===

  // Get weapon skill by type and tier
  getWeaponSkill(weaponType, tier) {
    return this.weaponSystem.getWeaponSkill(weaponType, tier);
  }

  // Get tier multiplier based on rarity
  getTierMultiplier(rarity) {
    return this.weaponSystem.getTierMultiplier(rarity);
  }

  // Calculate affinity multiplier between spirit root and weapon element
  // Ngũ hành tương sinh: Mộc → Hỏa → Thổ → Kim → Thủy → Mộc
  // Ngũ hành tương khắc: Mộc → Thổ → Thủy → Hỏa → Kim → Mộc
  getAffinityMultiplier(spiritRoot, weaponElement) {
    return this.weaponSystem.getAffinityMultiplier(spiritRoot, weaponElement);
  }

  // Calculate weapon skill damage using new formula
  // FinalDamage = ATK × Multiplier × TierMultiplier × Affinity
  // Note: This calculates raw damage, then applies defense reduction
  calculateWeaponSkillDamage(attacker, defender, weaponSkill, weaponInstance, combat) {
    return this.weaponSystem.calculateWeaponSkillDamage(attacker, defender, weaponSkill, weaponInstance, combat);
  }

  // === HELPER: Tính sát thương kỹ năng với các hiệu ứng mở rộng ===
  computeAndApplySkillDamage(attacker, defender, skill, combat) {
    return this.skillSystem.computeAndApplySkillDamage(attacker, defender, skill, combat);
  }

  // === HELPER: Áp dụng AoE damage cho solo combat ===
  applyAoEDamageToMonsters(attacker, skill, combat) {
    return this.skillSystem.applyAoEDamageToMonsters(attacker, skill, combat);
  }

  // Áp dụng buff cho bản thân từ skill (trả về text log)
  applyBuffsFromSkill(caster, skill) {
    return StatusEffects.applyBuffsFromSkill(caster, skill);
  }

  // Áp dụng debuff lên mục tiêu (trả về text log)
  applyDebuffsFromSkill(caster, target, skill) {
    return StatusEffects.applyDebuffsFromSkill(caster, target, skill);
  }

  // Áp dụng các hiệu ứng on-hit đơn giản (stun/slow/...) khi gây damage
  applyOnHitStatus(attacker, defender, skill, combat) {
    return StatusEffects.applyOnHitStatus(attacker, defender, skill, combat);
  }

  // Xử lý DoT/HoT, AoE theo lượt, và choáng skip lượt tại điểm chuyển lượt
  processTurnStartEffects(combat) {
    return TurnManager.processTurnStartEffects(combat);
  }
}

module.exports = new CombatSystem();
