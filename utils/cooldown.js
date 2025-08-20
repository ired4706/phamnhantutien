const { EmbedBuilder } = require('discord.js');

class CooldownManager {
  constructor() {
    this.cooldownMessages = {
      meditate: 'Thiền định có thể thực hiện sau 1 giờ',
      hunt: 'Săn yêu thú có thể thực hiện sau 30 giây',
      challenge: 'Thách đấu có thể thực hiện sau 1 giờ',
      domain: 'Khám phá domain có thể thực hiện sau 8 giờ',
      daily: 'Nhiệm vụ hàng ngày có thể nhận sau 24 giờ',
      weekly: 'Nhiệm vụ tuần có thể nhận sau 7 ngày',
      dungeon: 'Thí luyện có thể thực hiện sau 6 giờ',
      mine: 'Khai thác có thể thực hiện sau 1 giờ',
      pick: 'Thu thập thảo dược có thể thực hiện sau 5 phút',
      explore: 'Khám phá có thể thực hiện sau 10 phút',
      forge: 'Chế tạo vũ khí có thể thực hiện sau 1 giờ'
    };
  }

  /**
   * Kiểm tra cooldown và trả về true nếu đang trong cooldown
   * @param {Object} player - Player object
   * @param {string} commandName - Tên command (meditate, hunt, etc.)
   * @param {number} cooldownMs - Cooldown tính bằng milliseconds
   * @returns {Object} - { isOnCooldown: boolean, remainingTime: number, remainingText: string }
   */
  checkCooldown(player, commandName, cooldownMs) {
    if (!player || !player.cultivation) {
      return { isOnCooldown: false, remainingTime: 0, remainingText: '' };
    }

    const fieldName = `last${commandName.charAt(0).toUpperCase() + commandName.slice(1)}`;
    const lastCommandTime = player.cultivation[fieldName];

    // Kiểm tra xem field có tồn tại và có giá trị > 0 không
    if (!lastCommandTime || lastCommandTime === 0) {
      return { isOnCooldown: false, remainingTime: 0, remainingText: '' };
    }

    const now = Date.now();
    const timeSinceLastCommand = now - lastCommandTime;

    if (timeSinceLastCommand < cooldownMs) {
      const remainingTime = cooldownMs - timeSinceLastCommand;
      const remainingText = this.formatRemainingTime(remainingTime);

      return {
        isOnCooldown: true,
        remainingTime: remainingTime,
        remainingText: remainingText
      };
    }

    return { isOnCooldown: false, remainingTime: 0, remainingText: '' };
  }

  /**
   * Tạo embed thông báo cooldown
   * @param {string} commandName - Tên command
   * @param {string} remainingText - Thời gian còn lại
   * @returns {EmbedBuilder} - Embed thông báo cooldown
   */
  createCooldownEmbed(commandName, remainingText) {
    const commandDisplayNames = {
      meditate: 'Thiền định',
      hunt: 'Săn yêu thú',
      challenge: 'Thách đấu',
      domain: 'Khám phá domain',
      daily: 'Nhiệm vụ hàng ngày',
      weekly: 'Nhiệm vụ tuần',
      dungeon: 'Thí luyện',
      mine: 'Khai thác',
      pick: 'Thu thập thảo dược',
      explore: 'Khám phá'
    };

    const displayName = commandDisplayNames[commandName] || commandName;
    const cooldownMessage = this.cooldownMessages[commandName] || 'Vui lòng chờ để tiếp tục';

    return new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('⏰ Đang trong thời gian hồi phục!')
      .setDescription(`**${displayName}** đang trong cooldown.`)
      .addFields({
        name: '⏳ Thời gian còn lại',
        value: `**${remainingText}**`,
        inline: true
      })
      .setFooter({ text: cooldownMessage })
      .setTimestamp();
  }

  /**
   * Format thời gian còn lại thành text dễ đọc
   * @param {number} remainingMs - Thời gian còn lại tính bằng milliseconds
   * @returns {string} - Text thời gian còn lại
   */
  formatRemainingTime(remainingMs) {
    const hours = Math.floor(remainingMs / 3600000);
    const minutes = Math.floor((remainingMs % 3600000) / 60000);
    const seconds = Math.ceil((remainingMs % 60000) / 1000);

    if (hours > 0) {
      return `${hours} giờ ${minutes} phút`;
    } else if (minutes > 0) {
      return `${minutes} phút ${seconds} giây`;
    } else {
      return `${seconds} giây`;
    }
  }

  /**
   * Cập nhật thời gian command cuối cùng
   * @param {string} commandName - Tên command
   * @returns {string} - Field name để update trong database
   */
  getLastCommandField(commandName) {
    // Xử lý đặc biệt cho forge (không thuộc cultivation)
    if (commandName === 'forge') {
      return 'forge.lastForge';
    }
    return `cultivation.last${commandName.charAt(0).toUpperCase() + commandName.slice(1)}`;
  }
}

module.exports = new CooldownManager(); 