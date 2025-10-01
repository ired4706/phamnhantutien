const Logger = require('../core/logger');

class SharedUtils {
  // Format time remaining
  static formatTimeRemaining(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.ceil((ms % 60000) / 1000);

    if (hours > 0) {
      return `${hours} giờ ${minutes} phút`;
    } else if (minutes > 0) {
      return `${minutes} phút ${seconds} giây`;
    } else {
      return `${seconds} giây`;
    }
  }

  // Format number with locale
  static formatNumber(num) {
    return num.toLocaleString('vi-VN');
  }

  // Create progress bar
  static createProgressBar(percentage, realm = 'luyen_khi') {
    const filledBlocks = Math.floor(percentage / 10);
    const emptyBlocks = 10 - filledBlocks;

    const realmEmojis = {
      'luyen_khi': { filled: '🟢', empty: '⚪' },
      'truc_co': { filled: '🟡', empty: '⚪' },
      'ket_dan': { filled: '🟠', empty: '⚪' },
      'nguyen_anh': { filled: '🔴', empty: '⚪' }
    };

    const emojis = realmEmojis[realm] || realmEmojis['luyen_khi'];
    const filled = emojis.filled.repeat(filledBlocks);
    const empty = emojis.empty.repeat(emptyBlocks);

    return `${filled}${empty}`;
  }

  // Create separator
  static createSeparator() {
    return '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  }

  // Validate spirit root type
  static isValidSpiritRootType(type) {
    const validTypes = ['kim', 'moc', 'thuy', 'hoa', 'tho'];
    return validTypes.includes(type);
  }

  // Get realm color
  static getRealmColor(realm) {
    const colors = {
      'luyen_khi': '#00FF00', // Xanh lá
      'truc_co': '#FFFF00',   // Vàng
      'ket_dan': '#FF8C00',   // Cam
      'nguyen_anh': '#FF0000' // Đỏ
    };
    return colors[realm] || '#808080';
  }

  // Round to 1 decimal place
  static round1(value) {
    return Math.round(value * 10) / 10;
  }

  // Safe JSON parse
  static safeJsonParse(str, fallback = {}) {
    try {
      return JSON.parse(str);
    } catch (error) {
      Logger.warn('Failed to parse JSON', { error: error.message, str: str.substring(0, 100) });
      return fallback;
    }
  }

  // Deep clone object
  static deepClone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      Logger.warn('Failed to deep clone object', { error: error.message });
      return obj;
    }
  }

  // Generate random ID
  static generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Check if value is empty
  static isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  // Capitalize first letter
  static capitalize(str) {
    if (!str || typeof str !== 'string') return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Format spirit stones
  static formatSpiritStones(spiritStones) {
    if (!spiritStones) return '0 hạ phẩm';

    if (typeof spiritStones === 'string') {
      const match = spiritStones.match(/(\d+)$/);
      if (match) {
        const amount = parseInt(match[1]);
        return `${amount.toLocaleString()} hạ phẩm (dữ liệu cũ)`;
      }
      return '0 hạ phẩm (dữ liệu lỗi)';
    }

    if (typeof spiritStones === 'number') {
      return `${spiritStones.toLocaleString()} hạ phẩm (dữ liệu cũ)`;
    }

    if (typeof spiritStones === 'object' && spiritStones.ha_pham !== undefined) {
      const parts = [];
      if (spiritStones.cuc_pham > 0) parts.push(`💎${spiritStones.cuc_pham}`);
      if (spiritStones.thuong_pham > 0) parts.push(`🔮${spiritStones.thuong_pham}`);
      if (spiritStones.trung_pham > 0) parts.push(`✨${spiritStones.trung_pham}`);
      if (spiritStones.ha_pham > 0) parts.push(`🪙${spiritStones.ha_pham}`);

      if (parts.length === 0) return '0 hạ phẩm';

      const totalValue = (spiritStones.cuc_pham * 1000000) +
        (spiritStones.thuong_pham * 10000) +
        (spiritStones.trung_pham * 100) +
        spiritStones.ha_pham;

      return `${parts.join(' ')} (Tổng: ${totalValue.toLocaleString()} hạ phẩm)`;
    }

    return '0 hạ phẩm (dữ liệu không hợp lệ)';
  }
}

module.exports = SharedUtils;
