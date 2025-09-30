const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

class CombatSystem {
  constructor() {
    this.activeCombats = new Map(); // Lưu trữ các trận chiến đang diễn ra
    // Load skills data once
    try {
      this.skillsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/skills.json'), 'utf8'));
    } catch (e) {
      console.error('Failed to load skills.json', e);
      this.skillsData = {};
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
    console.log(`Created combat with ID: ${combatId}`);
    console.log(`Total active combats: ${this.activeCombats.size}`);

    // Tính initiative để xác định ai đi trước
    this.calculateInitiative(combat);
    // Khởi tạo Action Points và state combat
    combat.playerApMax = this.getApForRealm(player.realm);
    combat.playerAp = combat.playerApMax;
    combat.monsterAp = 1;
    combat.turnActions = { attacked: false, usedSkill: false, usedWeaponSkill: false };
    // Khởi tạo cooldown theo lượt
    combat.playerCooldowns = {}; // { skillId: remainingTurns }
    combat.monsterCooldowns = {};

    // Tự động kết thúc combat sau 10 phút
    setTimeout(() => {
      if (this.activeCombats.has(combatId)) {
        console.log(`Combat ${combatId} timed out, ending...`);
        this.activeCombats.delete(combatId);
      }
    }, 10 * 60 * 1000); // 10 phút

    return combat;
  }

  // Tính initiative dựa trên speed
  calculateInitiative(combat) {
    const playerSpeed = parseFloat(combat.player.stats.speed);
    const monsterSpeed = parseFloat(combat.monster.stats.speed);

    // Thêm yếu tố ngẫu nhiên
    const playerRoll = playerSpeed + Math.random() * 10;
    const monsterRoll = monsterSpeed + Math.random() * 10;

    combat.currentTurn = playerRoll >= monsterRoll ? 'player' : 'monster';

    combat.battleLog.push(`🎲 **Initiative**: ${combat.currentTurn === 'player' ? 'Bạn' : combat.monster.name} đi trước!`);
    // Reset AP đầu combat theo người đi trước
    if (combat.currentTurn === 'player') {
      combat.playerAp = combat.playerApMax;
    } else {
      combat.monsterAp = 1;
    }
  }

  // Tạo UI cho trận chiến
  createCombatUI(combat) {
    const variantName = this.getVariantName(combat.monster.variant);
    const difficultyStars = this.getDifficultyStars(combat.monster.variant);
    const element = this.getElementViName(combat.monster.element || 'vo_he');
    const tier = this.getTierViName(combat.monster.tier || '');

    const embed = new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle(`⚔️ Trận Chiến: ${combat.player.name} vs ${combat.monster.name}`)
      .setDescription(`**Turn ${combat.turn}** - ${combat.currentTurn === 'player' ? 'Lượt của bạn' : `Lượt của ${combat.monster.name}`}`)
      .addFields(
        {
          name: '👤 Người Chơi',
          value: `**HP**: ${combat.player.currentHp.toFixed(1)}/${combat.player.stats.hp}\n**MP**: ${combat.player.currentMp.toFixed(1)}/${combat.player.stats.mp}\n**AP**: ${combat.playerAp}/${combat.playerApMax}`,
          inline: true
        },
        {
          name: `${combat.monster.emoji || '👹'} ${combat.monster.name}`,
          value: `**HP**: ${combat.monster.currentHp.toFixed(1)}/${combat.monster.stats.hp}\n**MP**: ${combat.monster.currentMp.toFixed(1)}/${combat.monster.stats.mp}`,
          inline: true
        },
        {
          name: '🧩 Thông Tin Đối Thủ',
          value: `**Hệ**: ${element}\n**Cấp**: ${tier}\n**Biến thể**: ${variantName} ${difficultyStars}` + (combat.monster.elementAffinity ? `\n**Khắc chế**: ${this.getElementViNameOrNone(combat.monster.elementAffinity.strength)} • **Bị khắc**: ${this.getElementViNameOrNone(combat.monster.elementAffinity.weakness)}` : ''),
          inline: false
        },
        {
          name: '📜 Diễn Biến',
          value: combat.battleLog.slice(-5).join('\n') || 'Trận chiến vừa bắt đầu!',
          inline: false
        }
      )
      .setFooter({ text: 'Chọn hành động để tiếp tục' })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`combat_attack_${combat.id}`)
          .setLabel('⚔️ Tấn Công')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(combat.currentTurn !== 'player'),
        new ButtonBuilder()
          .setCustomId(`combat_defend_${combat.id}`)
          .setLabel('🛡️ Phòng Thủ')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(combat.currentTurn !== 'player'),
        new ButtonBuilder()
          .setCustomId(`combat_skill_${combat.id}`)
          .setLabel('✨ Kỹ Năng')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(combat.currentTurn !== 'player'),
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

    return { embeds: [embed], components: [row] };
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
    const map = { luyen_khi: 1, truc_co: 2, ket_dan: 3, nguyen_anh: 4 };
    return map[realm] || 1;
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
        combat.playerAp = Math.max(0, (combat.playerAp || 0) - 1);
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
        break;
    }

    if (result && result.action !== 'menu') {
      combat.battleLog.push(result.message);

      // Kiểm tra kết thúc trận chiến
      if (this.checkCombatEnd(combat)) {
        await this.endCombat(combat, interaction);
        return;
      }

      // Chuyển lượt
      // Nếu UI đang khóa (menu skill), không auto chuyển lượt
      if (!combat.uiLock) {
        this.nextTurn(combat);
      }

      // Nếu là lượt của quái, thực hiện AI
      if (combat.currentTurn === 'monster') {
        setTimeout(async () => await this.performMonsterTurn(combat), 2000);
      }
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
    const hitChance = this.calculateHitChance(attacker, defender);
    const isHit = Math.random() * 100 < hitChance;

    if (!isHit) {
      return {
        action: 'attack',
        message: `❌ ${attacker.name} tấn công nhưng **MISS!**`,
        damage: 0
      };
    }

    const isCritical = this.checkCritical(attacker);
    const baseDamage = this.calculateDamage(attacker, defender, isCritical);
    const finalDamage = Math.max(1, baseDamage);

    defender.currentHp = Math.max(0, defender.currentHp - finalDamage);

    const critText = isCritical ? ' **CRITICAL!**' : '';
    const message = `⚔️ ${attacker.name} tấn công gây **${finalDamage.toFixed(1)}** sát thương${critText}!`;

    return {
      action: 'attack',
      message: message,
      damage: finalDamage,
      isCritical: isCritical
    };
  }

  // Thực hiện phòng thủ
  performDefend(entity, combat) {
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
    const critChance = parseFloat(attacker.stats.critical) || 0;
    return Math.random() * 100 < critChance;
  }

  // Tính toán sát thương
  calculateDamage(attacker, defender, isCritical) {
    const attack = parseFloat(attacker.stats.attack);
    const defense = parseFloat(defender.stats.defense);

    // Áp dụng status effects
    let finalAttack = attack;
    let finalDefense = defense;

    attacker.statusEffects.forEach(effect => {
      if (effect.type === 'attack_boost') {
        finalAttack *= (1 + effect.value);
      }
      if (effect.type === 'attack_debuff') {
        finalAttack *= Math.max(0, 1 - effect.value);
      }
    });

    defender.statusEffects.forEach(effect => {
      if (effect.type === 'defend') {
        finalDefense *= (1 + effect.defenseBonus);
      }
      if (effect.type === 'defense_bonus') {
        finalDefense *= (1 + effect.value);
      }
    });

    const baseDamage = Math.max(1, finalAttack - finalDefense * 0.5);
    const criticalMultiplier = isCritical ? 1.8 : 1.0;
    let damage = baseDamage * criticalMultiplier;
    // Apply defender damage reduction statuses
    defender.statusEffects.forEach(effect => {
      if (effect.type === 'damage_reduction') {
        damage *= Math.max(0, 1 - effect.value);
      }
    });
    return damage;
  }

  // Thực hiện lượt của quái vật
  async performMonsterTurn(combat) {
    if (!combat.isActive || combat.currentTurn !== 'monster') return;

    // AI đơn giản: 70% tấn công, 20% phòng thủ, 10% kỹ năng
    const actionRoll = Math.random();
    let result = null;

    if (actionRoll < 0.7) {
      result = this.performAttack(combat.monster, combat.player, combat);
    } else if (actionRoll < 0.9) {
      result = this.performDefend(combat.monster, combat);
    } else {
      result = this.performMonsterSkill(combat);
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
    Object.keys(combat.monsterCooldowns || {}).forEach(id => {
      const left = Math.max(0, (combat.monsterCooldowns[id] || 0) - 1);
      if (left <= 0) {
        delete combat.monsterCooldowns[id];
      } else {
        combat.monsterCooldowns[id] = left;
      }
    });

    // Cập nhật UI
    const ui = this.createCombatUI(combat);
    await this.updateCombatUI(combat, ui, combat.interaction);
  }

  // Thực hiện kỹ năng của quái vật
  performMonsterSkill(combat) {
    const monster = combat.monster;
    const skills = this.getMonsterSkills(monster.element);
    const skill = skills[Math.floor(Math.random() * skills.length)];

    return this.executeSkill(monster, combat.player, skill, combat);
  }

  // Lấy danh sách kỹ năng theo element
  getMonsterSkills(element) {
    const skillDatabase = {
      'kim': [
        { name: 'Kim Cang Thần Công', type: 'attack', power: 1.5, cost: 20 },
        { name: 'Kim Cang Hộ Thể', type: 'defense', power: 2.0, cost: 15 }
      ],
      'moc': [
        { name: 'Mộc Linh Hồi Phục', type: 'heal', power: 0.3, cost: 25 },
        { name: 'Mộc Linh Trói Buộc', type: 'debuff', power: 0.5, cost: 20 }
      ],
      'thuy': [
        { name: 'Thủy Long Cuồng Phong', type: 'attack', power: 1.3, cost: 20 },
        { name: 'Thủy Linh Làm Chậm', type: 'debuff', power: 0.3, cost: 15 }
      ],
      'hoa': [
        { name: 'Hỏa Long Phun Lửa', type: 'attack', power: 1.8, cost: 30 },
        { name: 'Hỏa Linh Tăng Công', type: 'buff', power: 0.4, cost: 20 }
      ],
      'tho': [
        { name: 'Thổ Linh Địa Chấn', type: 'attack', power: 1.4, cost: 25 },
        { name: 'Thổ Linh Tăng Máu', type: 'heal', power: 0.2, cost: 20 }
      ],
      'phong': [
        { name: 'Phong Linh Tốc Độ', type: 'buff', power: 0.5, cost: 15 },
        { name: 'Phong Linh Tấn Công', type: 'attack', power: 1.2, cost: 18 }
      ],
      'loi': [
        { name: 'Lôi Điện Sấm Sét', type: 'attack', power: 2.0, cost: 35 },
        { name: 'Lôi Linh Tê Liệt', type: 'debuff', power: 0.4, cost: 25 }
      ],
      'vo_he': [
        { name: 'Vô Hệ Công Kích', type: 'attack', power: 1.3, cost: 20 },
        { name: 'Vô Hệ Phòng Thủ', type: 'defense', power: 1.5, cost: 18 }
      ]
    };

    return skillDatabase[element] || skillDatabase['vo_he'];
  }

  // Thực hiện kỹ năng
  executeSkill(caster, target, skill, combat) {
    if (caster.currentMp < skill.cost) {
      return {
        action: 'skill',
        message: `❌ ${caster.name} không đủ MP để sử dụng ${skill.name}!`
      };
    }

    caster.currentMp -= skill.cost;
    let message = `✨ ${caster.name} sử dụng **${skill.name}**!`;

    switch (skill.type) {
      case 'attack':
        const damage = this.calculateDamage(caster, target, false) * skill.power;
        target.currentHp = Math.max(0, target.currentHp - damage);
        message += ` Gây **${damage.toFixed(1)}** sát thương!`;
        break;
      case 'heal':
        const healAmount = caster.stats.hp * skill.power;
        caster.currentHp = Math.min(caster.stats.hp, caster.currentHp + healAmount);
        message += ` Hồi phục **${healAmount.toFixed(1)}** HP!`;
        break;
      case 'buff':
        caster.statusEffects.push({
          type: 'attack_boost',
          duration: 3,
          value: skill.power
        });
        message += ` Tăng sức tấn công **${(skill.power * 100).toFixed(0)}%**!`;
        break;
      case 'debuff':
        target.statusEffects.push({
          type: 'attack_debuff',
          duration: 2,
          value: skill.power
        });
        message += ` Giảm sức tấn công địch **${(skill.power * 100).toFixed(0)}%**!`;
        break;
      case 'defense':
        caster.statusEffects.push({
          type: 'defend',
          duration: 2,
          defenseBonus: skill.power
        });
        message += ` Tăng phòng thủ **${(skill.power * 100).toFixed(0)}%**!`;
        break;
    }

    return {
      action: 'skill',
      message: message
    };
  }

  // Chuyển lượt
  nextTurn(combat) {
    combat.currentTurn = combat.currentTurn === 'player' ? 'monster' : 'player';

    if (combat.currentTurn === 'player') {
      combat.turn++;
      // refill Action Points mỗi khi đến lượt người chơi
      combat.playerAp = combat.playerApMax;
      // reset quota hành động mỗi lượt cho người chơi
      combat.turnActions = { attacked: false, usedSkill: false, usedWeaponSkill: false };
      // giảm cooldown theo lượt cho kỹ năng người chơi
      Object.keys(combat.playerCooldowns || {}).forEach(id => {
        const left = Math.max(0, (combat.playerCooldowns[id] || 0) - 1);
        if (left <= 0) {
          delete combat.playerCooldowns[id];
        } else {
          combat.playerCooldowns[id] = left;
        }
      });
    } else {
      // lượt quái: reset AP quái (dự phòng nếu dùng về sau)
      combat.monsterAp = 1;
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
    entity.statusEffects = entity.statusEffects.filter(effect => {
      effect.duration--;
      return effect.duration > 0;
    });
  }

  // Áp dụng hồi phục
  applyRegeneration(entity) {
    const regen = parseFloat(entity.stats.regen) || 0;
    entity.currentHp = Math.min(entity.stats.hp, entity.currentHp + regen);
    entity.currentMp = Math.min(entity.stats.mp, entity.currentMp + regen);
  }

  // Nếu người chơi đã attack và đã dùng skill trong lượt → chuyển lượt cho quái
  async maybeAdvanceTurn(combat, interaction) {
    if ((combat.playerAp || 0) <= 0 || (combat.turnActions?.attacked && combat.turnActions?.usedSkill)) {
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

  // Kết thúc trận chiến
  async endCombat(combat, interaction) {
    combat.isActive = false;
    this.activeCombats.delete(combat.id);

    const playerWon = combat.monster.currentHp <= 0;
    const color = playerWon ? '#00FF00' : '#FF0000';
    const title = playerWon ? '🏆 Chiến Thắng!' : '💀 Thất Bại!';

    // Cập nhật player data nếu thắng
    if (playerWon) {
      const playerManager = require('./player.js');
      const SpiritStonesCalculator = require('../utils/spirit-stones-calculator.js');
      const ItemDropCalculator = require('../utils/item-drop-calculator.js');

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
      const cooldownManager = require('../utils/cooldown.js');
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
      .setFooter({ text: 'Trận chiến đã kết thúc' })
      .setTimestamp();

    // Nếu thắng và có item rơi, thêm field hiển thị vật phẩm
    if (playerWon) {
      try {
        const ItemDropCalculator = require('../utils/item-drop-calculator.js');
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
        !interaction.deferred
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
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`combat_skilluse_${combat.id}_${s.id}`)
          .setLabel(`${idx + 1}`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(player.currentMp < cost)
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

  // Hiển thị menu vật phẩm
  async showItemMenu(combat, interaction) {
    // TODO: Implement item menu
    return { action: 'menu', message: 'Menu vật phẩm đang được phát triển...' };
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
      return { action: 'skill', message: 'on cd' };
    }
    // mana check
    const manaCost = skill.effects?.mana_cost || 0;
    if (player.currentMp < manaCost) {
      await this.updateCombatUI(combat, { content: '❌ Không đủ MP!', components: [] }, interaction);
      return { action: 'skill', message: 'no mp' };
    }

    // spend mana
    player.currentMp = Math.max(0, player.currentMp - manaCost);
    // apply effect
    const type = skill.type || skill.effects?.type || 'attack';
    let log = `✨ ${player.name} dùng ${skill.name}!`;
    if (type === 'attack') {
      const power = skill.effects?.power || skill.effects?.damage_multiplier || 1.2;
      const dmg = this.calculateDamage(player, combat.monster, false) * power;
      combat.monster.currentHp = Math.max(0, combat.monster.currentHp - dmg);
      log += ` Gây ${dmg.toFixed(1)} sát thương!`;
    } else if (type === 'heal') {
      const ratio = skill.effects?.power || skill.effects?.heal_ratio || 0.25;
      const amount = player.stats.hp * ratio;
      player.currentHp = Math.min(player.stats.hp, player.currentHp + amount);
      log += ` Hồi ${amount.toFixed(1)} HP!`;
    } else if (type === 'buff') {
      const val = skill.effects?.power || skill.effects?.defense_bonus || skill.effects?.attack_bonus || 0.3;
      const duration = skill.effects?.duration || 3;
      // Ưu tiên defense_bonus nếu có, ngược lại coi là attack_boost
      if (skill.effects?.defense_bonus) {
        player.statusEffects.push({ type: 'defense_bonus', duration, value: skill.effects.defense_bonus });
        log += ` Tăng phòng thủ ${Math.round((skill.effects.defense_bonus) * 100)}% trong ${duration} lượt!`;
      } else {
        player.statusEffects.push({ type: 'attack_boost', duration, value: val });
        log += ` Tăng công ${Math.round(val * 100)}% trong ${duration} lượt!`;
      }
    } else if (type === 'debuff') {
      const val = skill.effects?.power || skill.effects?.damage_reduction || 0.3;
      const duration = skill.effects?.duration || 2;
      // Nếu skill có damage_reduction, áp vào địch
      if (skill.effects?.damage_reduction) {
        combat.monster.statusEffects.push({ type: 'damage_reduction', duration, value: skill.effects.damage_reduction });
        log += ` Giảm sát thương địch ${Math.round((skill.effects.damage_reduction) * 100)}% trong ${duration} lượt!`;
      } else {
        combat.monster.statusEffects.push({ type: 'attack_debuff', duration, value: val });
        log += ` Giảm công địch ${Math.round(val * 100)}% trong ${duration} lượt!`;
      }
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
}

module.exports = new CombatSystem();
