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

    // Hỗ trợ cấu trúc mới: core_stats (STR/INT/DEX/VIT/LUK) + growth_rates tương ứng
    const core = spiritRoot.core_stats || spiritRoot.basic_stats || {};
    const growth = spiritRoot.growth_rates || {};

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

    // Tính Stage multiplier (mới): 1, 4, 16, 64
    let stageMultiplier = 1;
    if (realm === 'luyen_khi') {
      stageMultiplier = 1;
    } else if (realm === 'truc_co') {
      stageMultiplier = 4;
    } else if (realm === 'ket_dan') {
      stageMultiplier = 16;
    } else if (realm === 'nguyen_anh') {
      stageMultiplier = 64;
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

    // Bước 1: Tính 5 chỉ số chính theo công thức mới
    const STR = ((core.STR || 0) + (growth.STR || 0) * luyenKhiTiers) * (stageMultiplier * tierMultiplier);
    const INT = ((core.INT || 0) + (growth.INT || 0) * luyenKhiTiers) * (stageMultiplier * tierMultiplier);
    const DEX = ((core.DEX || 0) + (growth.DEX || 0) * luyenKhiTiers) * (stageMultiplier * tierMultiplier);
    const VIT = ((core.VIT || 0) + (growth.VIT || 0) * luyenKhiTiers) * (stageMultiplier * tierMultiplier);
    const LUK = ((core.LUK || 0) + (growth.LUK || 0) * luyenKhiTiers) * (stageMultiplier * tierMultiplier);

    // Bước 2: Quy đổi sang combat stats
    const rawAttack = STR * 1.8 + INT * 0.6 + LUK * 0.3;
    const rawDefense = VIT * 2.0 + STR * 0.5;
    const rawHp = VIT * 20 + STR * 5;
    const rawMp = INT * 15 + LUK * 3;
    const rawSpeed = DEX * 1.5 + LUK * 0.5;
    const rawRegen = INT * 0.4 + VIT * 0.2;
    const rawCritical = LUK * 0.4 + DEX * 0.2;
    const rawEvasion = DEX * 0.3 + LUK * 0.3;
    const rawAccuracy = DEX * 0.6;
    const rawPenetration = STR * 0.4 + INT * 0.2;

    return {
      // Core (tham khảo nếu cần debug)
      STR,
      INT,
      DEX,
      VIT,
      LUK,
      // Combat raws
      attack: rawAttack,
      defense: rawDefense,
      hp: rawHp,
      mp: rawMp,
      speed: rawSpeed,
      critical: rawCritical,
      regen: rawRegen,
      evasion: rawEvasion,
      accuracy: rawAccuracy,
      penetration: rawPenetration
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
