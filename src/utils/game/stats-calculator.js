const { getContainer } = require('../../container/ServiceContainer');

/**
 * Utility class để tính chỉ số chung cho player và monster
 */
class StatsCalculator {
  /**
   * Tính chỉ số cơ bản dựa trên linh căn, realm và level
   * @param {string} spiritRootType - Loại linh căn
   * @param {string} realm - Cảnh giới
   * @param {number} level - Cấp độ
   * @returns {Object} Chỉ số đã tính
   */
  static async calculateBaseStats(spiritRootType, realm, level) {
    const container = getContainer();
    const spiritRootService = container.get('spiritRootService');

    // Lấy thông tin linh căn
    const spiritRoot = await spiritRootService.getSpiritRootInfo(spiritRootType);
    if (!spiritRoot) {
      // Fallback về kim nếu không tìm thấy
      const kimRoot = await spiritRootService.getSpiritRootInfo('kim');
      if (!kimRoot) return null;
      spiritRoot = kimRoot;
    }

    const { basic_stats, growth_rates } = spiritRoot;

    // Tính số tầng luyện khí đã qua
    let luyenKhiTiers = 0;
    if (realm === 'luyen_khi') {
      luyenKhiTiers = level; // 1-13
    } else if (realm === 'truc_co') {
      luyenKhiTiers = 13; // Đã hoàn thành 13 tầng luyện khí
    } else if (realm === 'ket_dan') {
      luyenKhiTiers = 13; // Đã hoàn thành 13 tầng luyện khí
    } else if (realm === 'nguyen_anh') {
      luyenKhiTiers = 13; // Đã hoàn thành 13 tầng luyện khí
    }

    // Tính Stage multiplier
    let stageMultiplier = 1;
    if (realm === 'luyen_khi') {
      stageMultiplier = 1;
    } else if (realm === 'truc_co') {
      stageMultiplier = 5;
    } else if (realm === 'ket_dan') {
      stageMultiplier = 25;
    } else if (realm === 'nguyen_anh') {
      stageMultiplier = 125;
    }

    // Tính Tier multiplier
    let tierMultiplier = 1;
    if (realm === 'luyen_khi') {
      tierMultiplier = 1; // Luyện khí luôn là 1
    } else if (realm === 'truc_co') {
      if (level === 1) tierMultiplier = 1.0; // Sơ Kỳ
      else if (level === 2) tierMultiplier = 1.5; // Trung Kỳ
      else if (level === 3) tierMultiplier = 2.0; // Hậu Kỳ
    } else if (realm === 'ket_dan') {
      if (level === 1) tierMultiplier = 1.0; // Sơ Kỳ
      else if (level === 2) tierMultiplier = 1.5; // Trung Kỳ
      else if (level === 3) tierMultiplier = 2.0; // Hậu Kỳ
    } else if (realm === 'nguyen_anh') {
      if (level === 1) tierMultiplier = 1.0; // Sơ Kỳ
      else if (level === 2) tierMultiplier = 1.5; // Trung Kỳ
      else if (level === 3) tierMultiplier = 2.0; // Hậu Kỳ
    }

    // Công thức: Stat = (Basic + Growth × số tầng luyện khí) × (Stage multiplier × Tier multiplier)
    const rawAttack = (basic_stats.attack + growth_rates.attack * luyenKhiTiers) * (stageMultiplier * tierMultiplier);
    const rawDefense = (basic_stats.defense + growth_rates.defense * luyenKhiTiers) * (stageMultiplier * tierMultiplier);
    const rawHp = (basic_stats.hp + growth_rates.hp * luyenKhiTiers) * (stageMultiplier * tierMultiplier);
    const rawMp = (basic_stats.mana + growth_rates.mana * luyenKhiTiers) * (stageMultiplier * tierMultiplier);
    const rawSpeed = (basic_stats.speed + growth_rates.speed * luyenKhiTiers) * (stageMultiplier * tierMultiplier);
    const rawCritical = (basic_stats.critical + growth_rates.critical * luyenKhiTiers) * (stageMultiplier * tierMultiplier);
    const rawRegen = (basic_stats.regen + growth_rates.regen * luyenKhiTiers) * (stageMultiplier * tierMultiplier);
    const rawEvasion = (basic_stats.evasion + growth_rates.evasion * luyenKhiTiers) * (stageMultiplier * tierMultiplier);

    return {
      attack: rawAttack,
      defense: rawDefense,
      hp: rawHp,
      mp: rawMp,
      speed: rawSpeed,
      critical: rawCritical,
      regen: rawRegen,
      evasion: rawEvasion
    };
  }

  /**
   * Tính chỉ số player dựa trên player object
   * @param {Object} player - Player object
   * @returns {Object} Chỉ số đã tính
   */
  static async calculatePlayerStats(player) {
    return await this.calculateBaseStats(player.spiritRoot, player.realm, player.realmLevel);
  }

  /**
   * Tính chỉ số monster dựa trên hệ và cấp bậc
   * @param {string} element - Hệ của monster
   * @param {string} realm - Cảnh giới của monster
   * @param {number} level - Cấp độ của monster
   * @returns {Object} Chỉ số đã tính
   */
  static async calculateMonsterBaseStats(element, realm, level) {
    return await this.calculateBaseStats(element, realm, level);
  }
}

module.exports = StatsCalculator;
