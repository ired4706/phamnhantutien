const fs = require('fs');
const path = require('path');

class EmojiLoader {
  constructor() {
    this.discordEmojis = {};
    this.fallbackEmojis = {};
    this.loadEmojis();
  }

  /**
   * Load emoji từ file cấu hình
   */
  loadEmojis() {
    try {
      const emojiPath = path.join(__dirname, '../config/discord-emojis.json');
      if (fs.existsSync(emojiPath)) {
        const emojiData = JSON.parse(fs.readFileSync(emojiPath, 'utf8'));
        this.discordEmojis = emojiData.discord_emojis || {};
        this.fallbackEmojis = emojiData.fallback_emojis || {};
        console.log('✅ Discord emojis loaded successfully');
      } else {
        console.log('⚠️ Discord emojis config not found, using fallback emojis only');
      }
    } catch (error) {
      console.error('❌ Error loading Discord emojis:', error);
    }
  }

  /**
   * Lấy emoji Discord hoặc fallback
   * @param {string} category - Danh mục emoji (rarity, currency, items, etc.)
   * @param {string} type - Loại emoji cụ thể
   * @returns {string} Emoji Discord hoặc fallback
   */
  getEmoji(category, type) {
    // Thử lấy emoji Discord trước
    if (this.discordEmojis[category] && this.discordEmojis[category][type]) {
      const discordEmoji = this.discordEmojis[category][type];
      // Kiểm tra xem có phải là emoji Discord hợp lệ không
      if (discordEmoji.startsWith('<:') && discordEmoji.includes(':')) {
        return discordEmoji;
      }
    }

    // Fallback về emoji Unicode
    if (this.fallbackEmojis[category] && this.fallbackEmojis[category][type]) {
      return this.fallbackEmojis[category][type];
    }

    // Fallback cuối cùng
    return '❓';
  }

  /**
   * Lấy emoji rarity
   * @param {string} rarity - Rarity level
   * @returns {string} Emoji rarity
   */
  getRarityEmoji(rarity) {
    return this.getEmoji('rarity', rarity);
  }

  /**
   * Lấy emoji currency
   * @param {string} currencyType - Loại tiền tệ
   * @returns {string} Emoji currency
   */
  getCurrencyEmoji(currencyType) {
    return this.getEmoji('currency', currencyType);
  }

  /**
   * Lấy emoji item
   * @param {string} itemType - Loại vật phẩm
   * @returns {string} Emoji item
   */
  getItemEmoji(itemType) {
    return this.getEmoji('items', itemType);
  }

  /**
   * Lấy emoji action
   * @param {string} actionType - Loại hành động
   * @returns {string} Emoji action
   */
  getActionEmoji(actionType) {
    return this.getEmoji('actions', actionType);
  }

  /**
   * Lấy emoji status
   * @param {string} statusType - Loại trạng thái
   * @returns {string} Emoji status
   */
  getStatusEmoji(statusType) {
    return this.getEmoji('status', statusType);
  }

  /**
   * Kiểm tra xem emoji có phải là Discord emoji không
   * @param {string} emoji - Emoji để kiểm tra
   * @returns {boolean} True nếu là Discord emoji
   */
  isDiscordEmoji(emoji) {
    return emoji.startsWith('<:') && emoji.includes(':');
  }

  /**
   * Lấy danh sách tất cả emoji Discord
   * @returns {Object} Danh sách emoji Discord
   */
  getAllDiscordEmojis() {
    return this.discordEmojis;
  }

  /**
   * Lấy danh sách tất cả fallback emojis
   * @returns {Object} Danh sách fallback emojis
   */
  getAllFallbackEmojis() {
    return this.fallbackEmojis;
  }

  /**
   * Reload emoji từ file cấu hình
   */
  reloadEmojis() {
    this.loadEmojis();
  }

  /**
   * Tạo embed với emoji Discord
   * @param {Object} embedData - Dữ liệu embed
   * @returns {Object} Embed với emoji đã được xử lý
   */
  processEmbedWithEmojis(embedData) {
    // Xử lý title
    if (embedData.title) {
      embedData.title = this.processTextWithEmojis(embedData.title);
    }

    // Xử lý description
    if (embedData.description) {
      embedData.description = this.processTextWithEmojis(embedData.description);
    }

    // Xử lý fields
    if (embedData.fields) {
      embedData.fields.forEach(field => {
        if (field.name) field.name = this.processTextWithEmojis(field.name);
        if (field.value) field.value = this.processTextWithEmojis(field.value);
      });
    }

    // Xử lý footer
    if (embedData.footer && embedData.footer.text) {
      embedData.footer.text = this.processTextWithEmojis(embedData.footer.text);
    }

    return embedData;
  }

  /**
   * Xử lý text với emoji
   * @param {string} text - Text cần xử lý
   * @returns {string} Text đã được xử lý
   */
  processTextWithEmojis(text) {
    // Thay thế các placeholder emoji
    const emojiReplacements = {
      '{rarity:common}': this.getRarityEmoji('common'),
      '{rarity:uncommon}': this.getRarityEmoji('uncommon'),
      '{rarity:rare}': this.getRarityEmoji('rare'),
      '{rarity:epic}': this.getRarityEmoji('epic'),
      '{rarity:legendary}': this.getRarityEmoji('legendary'),
      '{currency:ha_pham}': this.getCurrencyEmoji('ha_pham'),
      '{currency:trung_pham}': this.getCurrencyEmoji('trung_pham'),
      '{currency:thuong_pham}': this.getCurrencyEmoji('thuong_pham'),
      '{currency:cuc_pham}': this.getCurrencyEmoji('cuc_pham'),
      '{item:herbs}': this.getItemEmoji('herbs'),
      '{item:minerals}': this.getItemEmoji('minerals'),
      '{item:equipment}': this.getItemEmoji('equipment'),
      '{item:artifacts}': this.getItemEmoji('artifacts'),
      '{action:hunt}': this.getActionEmoji('hunt'),
      '{action:mine}': this.getActionEmoji('mine'),
      '{action:cultivate}': this.getActionEmoji('cultivate'),
      '{action:meditate}': this.getActionEmoji('meditate'),
      '{action:breakthrough}': this.getActionEmoji('breakthrough'),
      '{status:health}': this.getStatusEmoji('health'),
      '{status:mana}': this.getStatusEmoji('mana'),
      '{status:experience}': this.getStatusEmoji('experience'),
      '{status:level}': this.getStatusEmoji('level')
    };

    let processedText = text;
    Object.entries(emojiReplacements).forEach(([placeholder, emoji]) => {
      processedText = processedText.replace(new RegExp(placeholder, 'g'), emoji);
    });

    return processedText;
  }
}

// Export singleton instance
module.exports = new EmojiLoader(); 