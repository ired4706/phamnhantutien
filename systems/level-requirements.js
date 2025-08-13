/**
 * Level Requirements - Hệ thống quản lý EXP cần thiết cho mỗi cảnh giới
 * Dựa trên bảng: Level | Tier | Per_Level
 */

class LevelRequirements {
  constructor() {
    // Bảng EXP cần thiết cho mỗi level
    this.levelExpRequirements = {
      1: { tier: 'Luyện Khí', expRequired: 200, realm: 'luyen_khi', realmLevel: 1 },
      2: { tier: 'Luyện Khí', expRequired: 280, realm: 'luyen_khi', realmLevel: 2 },
      3: { tier: 'Luyện Khí', expRequired: 392, realm: 'luyen_khi', realmLevel: 3 },
      4: { tier: 'Luyện Khí', expRequired: 549, realm: 'luyen_khi', realmLevel: 4 },
      5: { tier: 'Luyện Khí', expRequired: 769, realm: 'luyen_khi', realmLevel: 5 },
      6: { tier: 'Luyện Khí', expRequired: 1077, realm: 'luyen_khi', realmLevel: 6 },
      7: { tier: 'Luyện Khí', expRequired: 1508, realm: 'luyen_khi', realmLevel: 7 },
      8: { tier: 'Luyện Khí', expRequired: 2111, realm: 'luyen_khi', realmLevel: 8 },
      9: { tier: 'Luyện Khí', expRequired: 2955, realm: 'luyen_khi', realmLevel: 9 },
      10: { tier: 'Luyện Khí', expRequired: 4137, realm: 'luyen_khi', realmLevel: 10 },
      11: { tier: 'Luyện Khí', expRequired: 5792, realm: 'luyen_khi', realmLevel: 11 },
      12: { tier: 'Luyện Khí', expRequired: 8109, realm: 'luyen_khi', realmLevel: 12 },
      13: { tier: 'Luyện Khí', expRequired: 11353, realm: 'luyen_khi', realmLevel: 13 },
      14: { tier: 'Trúc Cơ', expRequired: 18165, realm: 'truc_co', realmLevel: 1 },
      15: { tier: 'Trúc Cơ', expRequired: 29064, realm: 'truc_co', realmLevel: 2 },
      16: { tier: 'Trúc Cơ', expRequired: 46502, realm: 'truc_co', realmLevel: 3 },
      17: { tier: 'Kết Đan', expRequired: 83703, realm: 'ket_dan', realmLevel: 1 },
      18: { tier: 'Kết Đan', expRequired: 150667, realm: 'ket_dan', realmLevel: 2 },
      19: { tier: 'Kết Đan', expRequired: 271201, realm: 'ket_dan', realmLevel: 3 },
      20: { tier: 'Nguyên Anh', expRequired: 542402, realm: 'nguyen_anh', realmLevel: 1 },
      21: { tier: 'Nguyên Anh', expRequired: 1084804, realm: 'nguyen_anh', realmLevel: 2 },
      22: { tier: 'Nguyên Anh', expRequired: 2169608, realm: 'nguyen_anh', realmLevel: 3 }
    };

    // Thông tin tổng quan về các cảnh giới
    this.realmInfo = {
      'luyen_khi': {
        name: 'Luyện Khí Kỳ',
        emoji: '💨',
        description: 'Cảnh giới đầu tiên, luyện khí trong cơ thể',
        levels: 13,
        totalExp: 44353, // Tổng EXP cần để hoàn thành cảnh giới
        maxLevel: 13
      },
      'truc_co': {
        name: 'Trúc Cơ Kỳ',
        emoji: '🌱',
        description: 'Cảnh giới thứ hai, xây dựng nền tảng tu luyện',
        levels: 3,
        totalExp: 93731, // 18165 + 29064 + 46502
        maxLevel: 3
      },
      'ket_dan': {
        name: 'Kết Đan Kỳ',
        emoji: '🔮',
        description: 'Cảnh giới thứ ba, kết tinh tu vi thành đan',
        levels: 3,
        totalExp: 505571, // 83703 + 150667 + 271201
        maxLevel: 3
      },
      'nguyen_anh': {
        name: 'Nguyên Anh Kỳ',
        emoji: '👶',
        description: 'Cảnh giới thứ tư, tu luyện nguyên thần',
        levels: 3,
        totalExp: 3799814, // 542402 + 1084804 + 2169608
        maxLevel: 3
      }
    };

    // Tổng EXP cần để đạt level tối đa
    this.totalExpToMax = 4443348; // Tổng của tất cả 22 levels
  }

  /**
   * Lấy thông tin level cụ thể
   * @param {number} level - Level cần kiểm tra
   * @returns {Object|null} Thông tin level hoặc null nếu không tồn tại
   */
  getLevelInfo(level) {
    return this.levelExpRequirements[level] || null;
  }

  /**
   * Lấy EXP cần thiết để đạt level cụ thể
   * @param {number} level - Level cần kiểm tra
   * @returns {number|null} EXP cần thiết hoặc null nếu không tồn tại
   */
  getExpRequired(level) {
    const levelInfo = this.getLevelInfo(level);
    return levelInfo ? levelInfo.expRequired : null;
  }

  /**
   * Lấy thông tin cảnh giới theo level
   * @param {number} level - Level cần kiểm tra
   * @returns {Object|null} Thông tin cảnh giới hoặc null nếu không tồn tại
   */
  getRealmByLevel(level) {
    const levelInfo = this.getLevelInfo(level);
    if (!levelInfo) return null;

    return {
      realm: levelInfo.realm,
      realmLevel: levelInfo.realmLevel,
      tier: levelInfo.tier,
      expRequired: levelInfo.expRequired
    };
  }

  /**
   * Lấy thông tin cảnh giới theo realm key
   * @param {string} realmKey - Key của cảnh giới (luyen_khi, truc_co, ket_dan, nguyen_anh)
   * @returns {Object|null} Thông tin cảnh giới hoặc null nếu không tồn tại
   */
  getRealmInfo(realmKey) {
    return this.realmInfo[realmKey] || null;
  }

  /**
   * Lấy tất cả level trong một cảnh giới
   * @param {string} realmKey - Key của cảnh giới
   * @returns {Array} Mảng các level trong cảnh giới
   */
  getLevelsInRealm(realmKey) {
    const levels = [];
    for (const [level, info] of Object.entries(this.levelExpRequirements)) {
      if (info.realm === realmKey) {
        levels.push({
          level: parseInt(level),
          realmLevel: info.realmLevel,
          tier: info.tier,
          expRequired: info.expRequired
        });
      }
    }
    return levels.sort((a, b) => a.level - b.level);
  }

  /**
   * Kiểm tra xem player có thể đột phá lên level tiếp theo không
   * @param {Object} player - Thông tin player
   * @returns {Object} Kết quả kiểm tra
   */
  canBreakthrough(player) {
    const currentLevel = player.level;
    const currentExp = player.experience;

    // Kiểm tra xem có phải level cuối cùng không
    if (currentLevel >= 22) {
      return {
        canBreakthrough: false,
        reason: 'Đã đạt level tối đa (22)',
        nextLevel: null,
        expRequired: null,
        expNeeded: null
      };
    }

    const nextLevel = currentLevel + 1;
    const nextLevelInfo = this.getLevelInfo(nextLevel);

    if (!nextLevelInfo) {
      return {
        canBreakthrough: false,
        reason: 'Level tiếp theo không tồn tại',
        nextLevel: null,
        expRequired: null,
        expNeeded: null
      };
    }

    const expRequired = nextLevelInfo.expRequired;
    const expNeeded = expRequired - currentExp;

    return {
      canBreakthrough: expNeeded <= 0,
      reason: expNeeded <= 0 ? 'Đủ EXP để đột phá' : 'Thiếu EXP để đột phá',
      nextLevel: nextLevel,
      expRequired: expRequired,
      expNeeded: expNeeded > 0 ? expNeeded : 0,
      nextTier: nextLevelInfo.tier,
      nextRealm: nextLevelInfo.realm,
      nextRealmLevel: nextLevelInfo.realmLevel
    };
  }

  /**
   * Lấy thông tin tiến độ tu luyện của player
   * @param {Object} player - Thông tin player
   * @returns {Object} Thông tin tiến độ
   */
  getProgressInfo(player) {
    const currentLevel = player.level;
    const currentExp = player.experience;

    const currentLevelInfo = this.getLevelInfo(currentLevel);
    if (!currentLevelInfo) {
      return {
        currentLevel: currentLevel,
        currentExp: currentExp,
        currentTier: 'Không xác định',
        currentRealm: 'Không xác định',
        currentRealmLevel: 0,
        expRequired: 0,
        expProgress: 0,
        progressPercentage: 0,
        nextLevel: null,
        nextLevelInfo: null
      };
    }

    const nextLevel = currentLevel + 1;
    const nextLevelInfo = this.getLevelInfo(nextLevel);

    let expRequired = 0;
    let expProgress = 0;
    let progressPercentage = 0;

    if (nextLevelInfo) {
      expRequired = nextLevelInfo.expRequired;
      expProgress = currentExp;
      progressPercentage = Math.min((expProgress / expRequired) * 100, 100);
    }

    return {
      currentLevel: currentLevel,
      currentExp: currentExp,
      currentTier: currentLevelInfo.tier,
      currentRealm: currentLevelInfo.realm,
      currentRealmLevel: currentLevelInfo.realmLevel,
      expRequired: expRequired,
      expProgress: expProgress,
      progressPercentage: progressPercentage,
      nextLevel: nextLevel,
      nextLevelInfo: nextLevelInfo
    };
  }

  /**
   * Lấy tổng EXP cần để đạt level cụ thể
   * @param {number} targetLevel - Level mục tiêu
   * @returns {number} Tổng EXP cần thiết
   */
  getTotalExpToLevel(targetLevel) {
    let totalExp = 0;
    for (let level = 1; level <= targetLevel; level++) {
      const levelInfo = this.getLevelInfo(level);
      if (levelInfo) {
        totalExp += levelInfo.expRequired;
      }
    }
    return totalExp;
  }

  /**
   * Lấy thống kê tổng quan về hệ thống level
   * @returns {Object} Thống kê tổng quan
   */
  getSystemStats() {
    return {
      totalLevels: 22,
      totalExpToMax: this.totalExpToMax,
      realms: Object.keys(this.realmInfo).length,
      realmBreakdown: Object.entries(this.realmInfo).map(([key, info]) => ({
        realm: key,
        name: info.name,
        emoji: info.emoji,
        levels: info.levels,
        totalExp: info.totalExp,
        percentageOfTotal: ((info.totalExp / this.totalExpToMax) * 100).toFixed(2) + '%'
      }))
    };
  }

  /**
   * Lấy bảng EXP đầy đủ
   * @returns {Object} Bảng EXP đầy đủ
   */
  getFullExpTable() {
    return this.levelExpRequirements;
  }

  /**
   * Lấy bảng EXP theo cảnh giới
   * @returns {Object} Bảng EXP theo cảnh giới
   */
  getExpTableByRealm() {
    const table = {};
    for (const [realmKey, realmInfo] of Object.entries(this.realmInfo)) {
      table[realmKey] = {
        ...realmInfo,
        levels: this.getLevelsInRealm(realmKey)
      };
    }
    return table;
  }
}

// Export instance để sử dụng
module.exports = new LevelRequirements(); 