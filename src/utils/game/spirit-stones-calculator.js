/**
 * Utility để tính toán linh thạch theo tỉ lệ mới
 * Dựa trên bảng tỉ lệ được cung cấp
 */

class SpiritStonesCalculator {
  /**
   * Tính toán linh thạch cho lệnh /pick
   * @returns {Object} Linh thạch các loại
   */
  static calculatePick() {
    // Hạ phẩm: 2-6
    const haPham = 2 + Math.floor(Math.random() * 5);

    // Trung phẩm: 2% → +1
    const trungPham = Math.random() < 0.02 ? 1 : 0;

    return {
      ha_pham: haPham,
      trung_pham: trungPham,
      thuong_pham: 0,
      cuc_pham: 0
    };
  }

  /**
   * Tính toán linh thạch cho lệnh /explore
   * @returns {Object} Linh thạch các loại
   */
  static calculateExplore() {
    // Hạ phẩm: 5-12
    const haPham = 5 + Math.floor(Math.random() * 8);

    // Trung phẩm: 5% → +1
    const trungPham = Math.random() < 0.05 ? 1 : 0;

    return {
      ha_pham: haPham,
      trung_pham: trungPham,
      thuong_pham: 0,
      cuc_pham: 0
    };
  }

  /**
   * Tính toán linh thạch cho lệnh /hunt
   * @returns {Object} Linh thạch các loại
   */
  static calculateHunt() {
    // Hạ phẩm: 1-3
    const haPham = 1 + Math.floor(Math.random() * 3);

    // Trung phẩm: 1% → +1
    const trungPham = Math.random() < 0.01 ? 1 : 0;

    return {
      ha_pham: haPham,
      trung_pham: trungPham,
      thuong_pham: 0,
      cuc_pham: 0
    };
  }

  /**
   * Tính toán linh thạch cho lệnh /meditate
   * @returns {Object} Linh thạch các loại
   */
  static calculateMeditate() {
    // Hạ phẩm: 4-10 (không có trung phẩm)
    const haPham = 4 + Math.floor(Math.random() * 7);

    return {
      ha_pham: haPham,
      trung_pham: 0,
      thuong_pham: 0,
      cuc_pham: 0
    };
  }

  /**
   * Tính toán linh thạch cho lệnh /mine
   * @returns {Object} Linh thạch các loại
   */
  static calculateMine() {
    // Hạ phẩm: 20-40
    const haPham = 20 + Math.floor(Math.random() * 21);

    // Trung phẩm: 8% → +1
    const trungPham = Math.random() < 0.08 ? 1 : 0;

    // Thượng phẩm: 0.2% → +1
    const thuongPham = Math.random() < 0.002 ? 1 : 0;

    return {
      ha_pham: haPham,
      trung_pham: trungPham,
      thuong_pham: thuongPham,
      cuc_pham: 0
    };
  }

  /**
   * Tính toán linh thạch cho lệnh /challenge
   * @returns {Object} Linh thạch các loại
   */
  static calculateChallenge() {
    // Hạ phẩm: 30-60
    const haPham = 30 + Math.floor(Math.random() * 31);

    // Trung phẩm: 10% → +1
    const trungPham = Math.random() < 0.10 ? 1 : 0;

    // Thượng phẩm: 0.5% → +1
    const thuongPham = Math.random() < 0.005 ? 1 : 0;

    return {
      ha_pham: haPham,
      trung_pham: trungPham,
      thuong_pham: thuongPham,
      cuc_pham: 0
    };
  }

  /**
   * Tính toán linh thạch cho lệnh /domain
   * @returns {Object} Linh thạch các loại
   */
  static calculateDomain() {
    // Hạ phẩm: 120-240
    const haPham = 120 + Math.floor(Math.random() * 121);

    // Trung phẩm: 30% → +1~2
    const trungPham = Math.random() < 0.30 ? (1 + Math.floor(Math.random() * 2)) : 0;

    // Thượng phẩm: 3% → +1
    const thuongPham = Math.random() < 0.03 ? 1 : 0;

    // Cực phẩm: 0.2% → +1
    const cucPham = Math.random() < 0.002 ? 1 : 0;

    return {
      ha_pham: haPham,
      trung_pham: trungPham,
      thuong_pham: thuongPham,
      cuc_pham: cucPham
    };
  }

  /**
   * Tính toán linh thạch cho lệnh /dungeon
   * @returns {Object} Linh thạch các loại
   */
  static calculateDungeon() {
    // Hạ phẩm: 90-180
    const haPham = 90 + Math.floor(Math.random() * 91);

    // Trung phẩm: 25% → +1~2
    const trungPham = Math.random() < 0.25 ? (1 + Math.floor(Math.random() * 2)) : 0;

    // Thượng phẩm: 2% → +1
    const thuongPham = Math.random() < 0.02 ? 1 : 0;

    // Cực phẩm: 0.15% → +1
    const cucPham = Math.random() < 0.0015 ? 1 : 0;

    return {
      ha_pham: haPham,
      trung_pham: trungPham,
      thuong_pham: thuongPham,
      cuc_pham: cucPham
    };
  }

  /**
   * Tính toán linh thạch cho lệnh /daily
   * @returns {Object} Linh thạch các loại
   */
  static calculateDaily() {
    // Hạ phẩm: 200-300 (guarantee)
    const haPham = 200 + Math.floor(Math.random() * 101);

    // Trung phẩm: +1 Trung (guarantee) & 20% → +1
    const trungPham = 1 + (Math.random() < 0.20 ? 1 : 0);

    // Thượng phẩm: 3% → +1
    const thuongPham = Math.random() < 0.03 ? 1 : 0;

    return {
      ha_pham: haPham,
      trung_pham: trungPham,
      thuong_pham: thuongPham,
      cuc_pham: 0
    };
  }

  /**
   * Tính toán linh thạch cho lệnh /weekly
   * @returns {Object} Linh thạch các loại
   */
  static calculateWeekly() {
    // Hạ phẩm: 1000-1500 (guarantee)
    const haPham = 1000 + Math.floor(Math.random() * 501);

    // Trung phẩm: +5 Trung (guarantee) & 30% → +1~3
    const trungPham = 5 + (Math.random() < 0.30 ? (1 + Math.floor(Math.random() * 3)) : 0);

    // Thượng phẩm: 10% → +1
    const thuongPham = Math.random() < 0.10 ? 1 : 0;

    // Cực phẩm: 1% → +1
    const cucPham = Math.random() < 0.01 ? 1 : 0;

    return {
      ha_pham: haPham,
      trung_pham: trungPham,
      thuong_pham: thuongPham,
      cuc_pham: cucPham
    };
  }

  /**
   * Format hiển thị linh thạch
   * @param {Object} spiritStones - Linh thạch các loại
   * @returns {string} Text hiển thị
   */
  static formatSpiritStones(spiritStones) {
    const parts = [];
    if (spiritStones.cuc_pham > 0) parts.push(`💎${spiritStones.cuc_pham}`);
    if (spiritStones.thuong_pham > 0) parts.push(`🔮${spiritStones.thuong_pham}`);
    if (spiritStones.trung_pham > 0) parts.push(`✨${spiritStones.trung_pham}`);
    if (spiritStones.ha_pham > 0) parts.push(`🪙${spiritStones.ha_pham}`);

    return parts.length > 0 ? parts.join(' ') : '🪙0';
  }

  /**
   * Cập nhật linh thạch vào player inventory
   * @param {Object} player - Player object
   * @param {Object} spiritStones - Linh thạch cần cộng
   */
  static updatePlayerSpiritStones(player, spiritStones) {
    player.inventory.spiritStones.ha_pham += spiritStones.ha_pham;
    player.inventory.spiritStones.trung_pham += spiritStones.trung_pham;
    player.inventory.spiritStones.thuong_pham += spiritStones.thuong_pham;
    player.inventory.spiritStones.cuc_pham += spiritStones.cuc_pham;
  }

  /**
   * Tạo object update cho playerManager.updatePlayer
   * @param {Object} spiritStones - Linh thạch cần cộng
   * @returns {Object} Object để update
   */
  static createUpdateObject(spiritStones) {
    return {
      'inventory.spiritStones.ha_pham': spiritStones.ha_pham,
      'inventory.spiritStones.trung_pham': spiritStones.trung_pham,
      'inventory.spiritStones.thuong_pham': spiritStones.thuong_pham,
      'inventory.spiritStones.cuc_pham': spiritStones.cuc_pham
    };
  }
}

module.exports = SpiritStonesCalculator; 