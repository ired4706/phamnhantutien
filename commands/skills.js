const { EmbedBuilder } = require('discord.js');
const playerManager = require('../systems/player.js');
const loadEmojis = require('../utils/emoji-loader');
const fs = require('fs');
const path = require('path');

// Load skills data
const skillsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/skills.json'), 'utf8'));

module.exports = {
  name: 'skills',
  aliases: ['skill', 'kynang', 'abilities'],
  description: 'Xem kỹ năng đã học và kỹ năng có thể học theo tu vi',

  async execute(interaction, args) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Kiểm tra xem user đã bắt đầu game chưa
    if (!playerManager.hasStartedGame(userId)) {
      const notStartedEmbed = playerManager.createNotStartedEmbed();
      await interaction.reply({ embeds: [notStartedEmbed] });
      return;
    }

    const player = playerManager.getPlayer(userId);
    
    // Load emojis với fallback
    let emojis;
    try {
      emojis = loadEmojis.getBasicEmojis();
    } catch (error) {
      console.error('Error loading emojis, using fallback:', error);
      emojis = {
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
        check: '✅',
        cross: '❌',
        clock: '⏰',
        skill: '🎯'
      };
    }

    // Xử lý args để xác định subcommand
    const subcommand = args[0] || 'my_skills';

    switch (subcommand) {
      case 'list':
        await this.showSkillsList(interaction, player, emojis, args);
        break;
      case 'my_skills':
      case 'my':
      case 'learned':
        await this.showMySkills(interaction, player, emojis);
        break;
      default:
        await this.showMySkills(interaction, player, emojis);
        break;
    }
  },

  // Hiển thị danh sách kỹ năng theo tu vi
  async showSkillsList(interaction, player, emojis, args) {
    const selectedRealm = args[1] || player.realm;
    
    // Lấy kỹ năng khả dụng cho linh căn và tu vi được chọn
    const spiritRoot = player.spiritRoot;
    const availableSkills = this.getAvailableSkills(spiritRoot, selectedRealm, player);
    
    if (availableSkills.length === 0) {
      return await interaction.reply({
        content: `${emojis.error} Không có kỹ năng nào khả dụng cho tu vi **${this.getRealmName(selectedRealm)}** của bạn!`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(this.getRealmColor(selectedRealm))
      .setTitle(`🎯 **Kỹ Năng ${this.getRealmName(selectedRealm)} - ${this.getSpiritRootName(spiritRoot)}**`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription(`${this.createSeparator()}\n**Kỹ năng sẽ được học tự động khi đạt tu vi này!**`);

    // Nhóm kỹ năng theo loại
    const skillsByType = {};
    availableSkills.forEach(skill => {
      if (!skillsByType[skill.type]) {
        skillsByType[skill.type] = [];
      }
      skillsByType[skill.type].push(skill);
    });

    // Thêm các field kỹ năng
    Object.keys(skillsByType).forEach(type => {
      const skills = skillsByType[type];
      let fieldValue = '';
      
      skills.forEach(skill => {
        const learnedStatus = player.skills && player.skills[skill.id] ? 
          `${emojis.check} Đã học` : `${emojis.clock} Sẽ học tự động`;
        
        fieldValue += `**${skill.name}**\n`;
        fieldValue += `${skill.description}\n`;
        fieldValue += `💰 Mana: ${skill.effects.mana_cost} | ⏱️ Cooldown: ${skill.cooldown}s | ${learnedStatus}\n\n`;
      });
      
      embed.addFields({
        name: `${this.getSkillTypeEmoji(type)} ${this.getSkillTypeName(type)}`,
        value: fieldValue,
        inline: false
      });
    });

    // Thêm thông tin yêu cầu
    embed.addFields({
      name: `${emojis.info} **Thông Tin**`,
      value: `• Tu vi: **${this.getRealmName(selectedRealm)}**\n• Linh căn: **${this.getSpiritRootName(spiritRoot)}**\n• Cấp độ: **${this.getRealmLevel(selectedRealm)}**\n• **Kỹ năng sẽ được học tự động khi đạt tu vi này!**`,
      inline: false
    });

    embed.setFooter({ text: 'Sử dụng fskills my để xem kỹ năng đã học' });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  // Hiển thị kỹ năng đã học
  async showMySkills(interaction, player, emojis) {
    if (!player.skills || Object.keys(player.skills).length === 0) {
      return await interaction.reply({
        content: `${emojis.info} Bạn chưa học kỹ năng nào! Sử dụng \`fskills list\` để xem kỹ năng có thể học.`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(this.getRealmColor(player.realm))
      .setTitle(`🎯 **Kỹ Năng Đã Học - ${interaction.user.username}**`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription(`${this.createSeparator()}\n**Danh sách kỹ năng bạn đã học được**`);

    // Nhóm kỹ năng theo tu vi
    const skillsByRealm = {};
    Object.keys(player.skills).forEach(skillId => {
      const skill = this.findSkillById(skillId);
      if (skill) {
        const realm = skill.required_realm;
        if (!skillsByRealm[realm]) {
          skillsByRealm[realm] = [];
        }
        skillsByRealm[realm].push({
          skill: skill,
          playerSkill: player.skills[skillId]
        });
      }
    });

    // Thêm các field kỹ năng theo tu vi
    Object.keys(skillsByRealm).forEach(realm => {
      const skills = skillsByRealm[realm];
      let fieldValue = '';
      
       skills.forEach(({ skill, playerSkill }) => {
         fieldValue += `**${skill.name}**\n`;
         fieldValue += `💰 ${skill.effects.mana_cost} mana | ⏱️ ${skill.cooldown}s\n`;
         fieldValue += `📅 Học ngày: ${new Date(playerSkill.learned_at).toLocaleDateString('vi-VN')}\n\n`;
       });
      
      embed.addFields({
        name: `${this.getRealmEmoji(realm)} **${this.getRealmName(realm)}**`,
        value: fieldValue,
        inline: false
      });
    });

    embed.setFooter({ text: 'Kỹ năng được học tự động khi đạt tu vi tương ứng' });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  // ===== HELPER FUNCTIONS =====

  // Tạo separator đẹp mắt
  createSeparator() {
    return '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  },

  // Lấy màu sắc theo tu vi
  getRealmColor(realm) {
    const colors = {
      'luyen_khi': 0x00ff00,  // Xanh lá
      'truc_co': 0xffff00,    // Vàng
      'ket_dan': 0xff8c00,    // Cam
      'nguyen_anh': 0xff0000  // Đỏ
    };
    return colors[realm] || 0x0099ff;
  },

  // Lấy kỹ năng khả dụng
  getAvailableSkills(spiritRoot, realm, player) {
    const realmSkills = skillsData[`${spiritRoot}_skills`][realm] || [];
    return realmSkills.filter(skill => this.canLearnSkill(skill, player));
  },

  // Kiểm tra có thể học kỹ năng không
  canLearnSkill(skill, player) {
    // Kiểm tra yêu cầu tu vi
    if (skill.required_realm !== player.realm) {
      return false;
    }
    
    // Kiểm tra yêu cầu cấp độ
    if (player.realmLevel < skill.required_level) {
      return false;
    }
    
    // Kiểm tra yêu cầu linh căn
    if (skill.required_spirit_root !== player.spiritRoot) {
      return false;
    }
    
    return true;
  },

  // Tìm kỹ năng theo ID
  findSkillById(skillId) {
    for (const spiritRoot of ['kim', 'hoa', 'tho', 'thuy', 'moc']) {
      for (const realm of ['luyen_khi', 'truc_co', 'ket_dan', 'nguyen_anh']) {
        const skills = skillsData[`${spiritRoot}_skills`][realm];
        const skill = skills.find(s => s.id === skillId);
        if (skill) return skill;
      }
    }
    return null;
  },

  // Lấy tên tu vi
  getRealmName(realm) {
    const names = {
      'luyen_khi': 'Luyện Khí',
      'truc_co': 'Trúc Cơ',
      'ket_dan': 'Kết Đan',
      'nguyen_anh': 'Nguyên Anh'
    };
    return names[realm] || realm;
  },

  // Lấy emoji tu vi
  getRealmEmoji(realm) {
    const emojis = {
      'luyen_khi': '⚡',
      'truc_co': '🌱',
      'ket_dan': '💎',
      'nguyen_anh': '👑'
    };
    return emojis[realm] || '❓';
  },

  // Lấy cấp độ tu vi
  getRealmLevel(realm) {
    const levels = {
      'luyen_khi': 1,
      'truc_co': 10,
      'ket_dan': 20,
      'nguyen_anh': 30
    };
    return levels[realm] || 1;
  },

  // Lấy tên linh căn
  getSpiritRootName(spiritRoot) {
    const names = {
      'kim': 'Kim Linh Căn',
      'hoa': 'Hỏa Linh Căn',
      'tho': 'Thổ Linh Căn',
      'thuy': 'Thủy Linh Căn',
      'moc': 'Mộc Linh Căn'
    };
    return names[spiritRoot] || spiritRoot;
  },

  // Lấy tên loại kỹ năng
  getSkillTypeName(type) {
    return skillsData.skill_categories[type] || type;
  },

  // Lấy emoji loại kỹ năng
  getSkillTypeEmoji(type) {
    const emojis = {
      'attack': '⚔️',
      'defense': '🛡️',
      'buff': '📈',
      'debuff': '📉',
      'heal': '💚',
      'support': '🤝',
      'ultimate': '💥'
    };
    return emojis[type] || '❓';
  }
};