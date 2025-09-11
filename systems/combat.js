const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class CombatSystem {
  constructor() {
    this.activeCombats = new Map(); // Lưu trữ các trận chiến đang diễn ra
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
  }

  // Tạo UI cho trận chiến
  createCombatUI(combat) {
    const embed = new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('⚔️ Trận Chiến Đang Diễn Ra')
      .setDescription(`**Turn ${combat.turn}** - ${combat.currentTurn === 'player' ? 'Lượt của bạn' : `Lượt của ${combat.monster.name}`}`)
      .addFields(
        {
          name: '👤 Người Chơi',
          value: `**HP**: ${combat.player.currentHp.toFixed(1)}/${combat.player.stats.hp}\n**MP**: ${combat.player.currentMp.toFixed(1)}/${combat.player.stats.mp}`,
          inline: true
        },
        {
          name: '👹 Quái Vật',
          value: `**HP**: ${combat.monster.currentHp.toFixed(1)}/${combat.monster.stats.hp}\n**MP**: ${combat.monster.currentMp.toFixed(1)}/${combat.monster.stats.mp}`,
          inline: true
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

    if (combat.currentTurn !== 'player') {
      try {
        await interaction.update({ content: '❌ Chưa đến lượt của bạn!', components: [] });
      } catch (error) {
        console.error('Error updating interaction:', error);
      }
      return;
    }

    let result = null;

    switch (action) {
      case 'attack':
        result = this.performAttack(combat.player, combat.monster, combat);
        break;
      case 'defend':
        result = this.performDefend(combat.player, combat);
        break;
      case 'skill':
        result = await this.showSkillMenu(combat, interaction);
        break;
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
      this.nextTurn(combat);

      // Nếu là lượt của quái, thực hiện AI
      if (combat.currentTurn === 'monster') {
        setTimeout(async () => await this.performMonsterTurn(combat), 2000);
      }
    }

    // Cập nhật UI
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
    const baseHitChance = 90; // 90% cơ hội cơ bản
    const evasionPenalty = parseFloat(defender.stats.evasion) || 0;
    const speedBonus = Math.min(10, parseFloat(attacker.stats.speed) / 10);

    return Math.max(20, baseHitChance - evasionPenalty + speedBonus);
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
    });

    defender.statusEffects.forEach(effect => {
      if (effect.type === 'defend') {
        finalDefense *= (1 + effect.defenseBonus);
      }
    });

    const baseDamage = Math.max(1, finalAttack - finalDefense * 0.5);
    const criticalMultiplier = isCritical ? 1.8 : 1.0;

    return baseDamage * criticalMultiplier;
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

      // Thêm vật phẩm
      const huntItems = ItemDropCalculator.calculateHuntItems(combat.player);
      huntItems.forEach(item => {
        playerManager.addItemToInventory(combat.player, item.id, 1);
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
      // Kiểm tra xem interaction có method update không
      if (interaction && typeof interaction.update === 'function') {
        await interaction.update(ui);
      } else if (combat.lastMessage) {
        // Nếu có message cũ, edit message đó
        await combat.lastMessage.edit(ui);
      } else if (combat.channel) {
        // Gửi message mới
        const newMessage = await combat.channel.send(ui);
        combat.lastMessage = newMessage;
      } else {
        console.log('Cannot update UI - no valid interaction or message');
      }
    } catch (error) {
      console.error('Error updating combat UI:', error);
      // Nếu tất cả đều thất bại, gửi message mới
      try {
        if (combat.channel) {
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
    // TODO: Implement skill menu
    return { action: 'menu', message: 'Menu kỹ năng đang được phát triển...' };
  }

  // Hiển thị menu vật phẩm
  async showItemMenu(combat, interaction) {
    // TODO: Implement item menu
    return { action: 'menu', message: 'Menu vật phẩm đang được phát triển...' };
  }
}

module.exports = new CombatSystem();
