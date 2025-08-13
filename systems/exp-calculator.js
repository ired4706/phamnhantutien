/**
 * EXP Calculator - Hệ thống tính toán linh khí (EXP) nhận được
 * Công thức: EXP = Base EXP × Tu vi Level Scale × Difficulty × Sự kiện × Random Variance
 */

class ExpCalculator {
  constructor() {
    // Hệ số tăng theo tu vi cho từng cảnh giới
    this.realmScales = {
      'luyen_khi': 1.0,    // Luyện Khí Kỳ
      'truc_co': 1.5,      // Trúc Cơ Kỳ  
      'ket_dan': 2.0,      // Kết Đan Kỳ
      'nguyen_anh': 2.5    // Nguyên Anh Kỳ
    };

    // Hệ số độ khó mặc định CHỈ cho command domain
    this.domainDifficulties = {
      'domain': 1.5,        // Domain - khó hơn bình thường
      'domain_easy': 0.8,   // Domain dễ
      'domain_hard': 2.0,   // Domain khó
      'domain_boss': 3.0    // Domain boss
    };

    // Hệ số sự kiện mặc định
    this.defaultEventMultipliers = {
      'none': 1.0,          // Không có sự kiện
      'double_exp': 2.0,    // X2 EXP
      'triple_exp': 3.0,    // X3 EXP
      'half_exp': 0.5,      // X0.5 EXP
      'weekend_bonus': 1.5, // Bonus cuối tuần
      'holiday_bonus': 2.0, // Bonus ngày lễ
      'cultivation_event': 1.8, // Sự kiện tu luyện
      'hunt_event': 1.6,    // Sự kiện săn yêu thú
      'breakthrough_event': 2.2 // Sự kiện đột phá
    };

    // Cấu hình random variance
    this.randomVarianceConfig = {
      'min': 0.9,           // Giá trị tối thiểu (±10%)
      'max': 1.1,           // Giá trị tối đa (±10%)
      'enabled': true       // Bật/tắt random variance
    };

    // Base EXP và thời gian chờ cho từng command
    this.commandConfigs = {
      'meditate': {
        baseExp: 600,
        cooldown: 3600000,  // 1h = 3600000ms
        description: 'Thiền định tu luyện'
      },
      'hunt': {
        baseExp: 30,
        cooldown: 30000,    // 30s = 30000ms
        description: 'Săn yêu thú lấy tài nguyên'
      },
      'challenge': {
        baseExp: 1200,
        cooldown: 3600000,  // 1h = 3600000ms
        description: 'Thách đấu tu sĩ khác'
      },
      'domain': {
        baseExp: 10000,
        cooldown: 28800000, // 8h = 28800000ms
        description: 'Khám phá bí cảnh domain'
      },
      'daily': {
        baseExp: 6000,
        cooldown: 86400000, // 1d = 86400000ms
        description: 'Nhiệm vụ hàng ngày'
      },
      'weekly': {
        baseExp: 12000,
        cooldown: 604800000, // 1w = 604800000ms
        description: 'Nhiệm vụ hàng tuần'
      },
      'dungeon': {
        baseExp: 6000,
        cooldown: 21600000, // 6h = 21600000ms
        description: 'Khám phá dungeon'
      },
      'mine': {
        baseExp: 0,
        cooldown: 3600000,  // 1h = 3600000ms
        description: 'Khai thác khoáng sản (không có EXP)'
      },
      'pick': {
        baseExp: 45,         // Trung bình 40-50
        cooldown: 300000,   // 5m = 300000ms
        description: 'Thu thập thảo dược',
        randomRange: { min: 40, max: 50 } // EXP ngẫu nhiên từ 40-50
      },
      'explore': {
        baseExp: 135,        // Trung bình 120-150
        cooldown: 600000,   // 10m = 600000ms
        description: 'Khám phá thế giới',
        randomRange: { min: 120, max: 150 } // EXP ngẫu nhiên từ 120-150
      }
    };
  }

  /**
   * Tính toán EXP nhận được theo công thức
   * @param {Object} params - Tham số tính toán
   * @param {number} params.baseExp - Base EXP cơ bản
   * @param {string} params.realm - Cảnh giới tu vi (luyen_khi, truc_co, ket_dan, nguyen_anh)
   * @param {number} params.realmLevel - Cấp độ trong cảnh giới (1-13 cho Luyện Khí, 1-3 cho các kỳ khác)
   * @param {string} params.difficulty - Loại độ khó (domain, domain_easy, domain_hard, domain_boss, hoặc tùy chỉnh)
   * @param {string} params.event - Loại sự kiện (none, double_exp, triple_exp, etc.)
   * @param {boolean} params.enableRandom - Bật/tắt random variance
   * @returns {Object} Kết quả tính toán EXP
   */
  calculateExp(params) {
    const {
      baseExp = 40,
      realm = 'luyen_khi',
      realmLevel = 1,
      difficulty = 'domain',
      event = 'none',
      enableRandom = true
    } = params;

    // 1. Base EXP
    const baseExpValue = baseExp;

    // 2. Tu vi Level Scale
    const realmScale = this.getRealmScale(realm, realmLevel);

    // 3. Difficulty - Chỉ áp dụng cho command domain, còn lại = 1
    const difficultyMultiplier = this.getDifficultyMultiplier(difficulty);

    // 4. Sự kiện
    const eventMultiplier = this.getEventMultiplier(event);

    // 5. Random Variance
    const randomVariance = enableRandom ? this.getRandomVariance() : 1.0;

    // Tính toán EXP cuối cùng
    const finalExp = Math.round(
      baseExpValue *
      realmScale *
      difficultyMultiplier *
      eventMultiplier *
      randomVariance
    );

    // Trả về kết quả chi tiết
    return {
      finalExp: finalExp,
      breakdown: {
        baseExp: baseExpValue,
        realmScale: realmScale,
        difficultyMultiplier: difficultyMultiplier,
        eventMultiplier: eventMultiplier,
        randomVariance: randomVariance,
        calculation: `${baseExpValue} × ${realmScale} × ${difficultyMultiplier} × ${eventMultiplier} × ${randomVariance.toFixed(2)} = ${finalExp}`
      },
      params: {
        realm: realm,
        realmLevel: realmLevel,
        difficulty: difficulty,
        event: event,
        enableRandom: enableRandom
      }
    };
  }

  /**
   * Lấy hệ số tu vi theo cảnh giới và cấp độ
   * @param {string} realm - Cảnh giới
   * @param {number} realmLevel - Cấp độ trong cảnh giới
   * @returns {number} Hệ số tu vi
   */
  getRealmScale(realm, realmLevel) {
    const baseScale = this.realmScales[realm] || 1.0;
    return baseScale;
  }

  /**
   * Lấy hệ số độ khó - CHỈ áp dụng cho command domain
   * @param {string} difficulty - Loại độ khó
   * @returns {number} Hệ số độ khó
   */
  getDifficultyMultiplier(difficulty) {
    // Nếu là command domain thì áp dụng hệ số
    if (this.domainDifficulties.hasOwnProperty(difficulty)) {
      return this.domainDifficulties[difficulty];
    }

    // Các command khác (hunt, explore, cultivate, breakthrough, help, ping, status, etc.) = 1
    return 1.0;
  }

  /**
   * Lấy hệ số sự kiện
   * @param {string} event - Loại sự kiện
   * @returns {number} Hệ số sự kiện
   */
  getEventMultiplier(event) {
    return this.defaultEventMultipliers[event] || 1.0;
  }

  /**
   * Tạo random variance
   * @returns {number} Hệ số random variance
   */
  getRandomVariance() {
    if (!this.randomVarianceConfig.enabled) {
      return 1.0;
    }

    const min = this.randomVarianceConfig.min;
    const max = this.randomVarianceConfig.max;
    return Math.random() * (max - min) + min;
  }

  /**
   * Lấy thông tin command
   * @param {string} commandName - Tên command
   * @returns {Object} Thông tin command
   */
  getCommandInfo(commandName) {
    return this.commandConfigs[commandName] || null;
  }

  /**
   * Lấy tất cả thông tin command
   * @returns {Object} Tất cả thông tin command
   */
  getAllCommands() {
    return this.commandConfigs;
  }

  /**
   * Tính EXP cho lệnh meditate
   * @param {Object} player - Thông tin player
   * @param {string} event - Sự kiện (nếu có)
   * @returns {Object} Kết quả EXP meditate
   */
  calculateMeditateExp(player, event = 'none') {
    return this.calculateExp({
      baseExp: 600, // Base EXP cho meditate
      realm: player.realm,
      realmLevel: player.realmLevel,
      difficulty: 'meditate', // Sẽ tự động = 1.0
      event: event,
      enableRandom: true
    });
  }

  /**
   * Tính EXP cho lệnh hunt
   * @param {Object} player - Thông tin player
   * @param {string} event - Sự kiện (nếu có)
   * @returns {Object} Kết quả EXP hunt
   */
  calculateHuntExp(player, event = 'none') {
    return this.calculateExp({
      baseExp: 30, // Base EXP cho hunt
      realm: player.realm,
      realmLevel: player.realmLevel,
      difficulty: 'hunt', // Sẽ tự động = 1.0
      event: event,
      enableRandom: true
    });
  }

  /**
   * Tính EXP cho lệnh challenge
   * @param {Object} player - Thông tin player
   * @param {string} event - Sự kiện (nếu có)
   * @returns {Object} Kết quả EXP challenge
   */
  calculateChallengeExp(player, event = 'none') {
    return this.calculateExp({
      baseExp: 1200, // Base EXP cho challenge
      realm: player.realm,
      realmLevel: player.realmLevel,
      difficulty: 'challenge', // Sẽ tự động = 1.0
      event: event,
      enableRandom: true
    });
  }

  /**
   * Tính EXP cho lệnh domain
   * @param {Object} player - Thông tin player
   * @param {string} difficulty - Độ khó domain (domain, domain_easy, domain_hard, domain_boss)
   * @param {string} event - Sự kiện (nếu có)
   * @returns {Object} Kết quả EXP domain
   */
  calculateDomainExp(player, difficulty = 'domain', event = 'none') {
    return this.calculateExp({
      baseExp: 10000, // Base EXP cho domain
      realm: player.realm,
      realmLevel: player.realmLevel,
      difficulty: difficulty, // Sẽ áp dụng hệ số độ khó
      event: event,
      enableRandom: true
    });
  }

  /**
   * Tính EXP cho lệnh daily
   * @param {Object} player - Thông tin player
   * @param {string} event - Sự kiện (nếu có)
   * @returns {Object} Kết quả EXP daily
   */
  calculateDailyExp(player, event = 'none') {
    return this.calculateExp({
      baseExp: 6000, // Base EXP cho daily
      realm: player.realm,
      realmLevel: player.realmLevel,
      difficulty: 'daily', // Sẽ tự động = 1.0
      event: event,
      enableRandom: true
    });
  }

  /**
   * Tính EXP cho lệnh weekly
   * @param {Object} player - Thông tin player
   * @param {string} event - Sự kiện (nếu có)
   * @returns {Object} Kết quả EXP weekly
   */
  calculateWeeklyExp(player, event = 'none') {
    return this.calculateExp({
      baseExp: 12000, // Base EXP cho weekly
      realm: player.realm,
      realmLevel: player.realmLevel,
      difficulty: 'weekly', // Sẽ tự động = 1.0
      event: event,
      enableRandom: true
    });
  }

  /**
   * Tính EXP cho lệnh dungeon
   * @param {Object} player - Thông tin player
   * @param {string} event - Sự kiện (nếu có)
   * @returns {Object} Kết quả EXP dungeon
   */
  calculateDungeonExp(player, event = 'none') {
    return this.calculateExp({
      baseExp: 6000, // Base EXP cho dungeon
      realm: player.realm,
      realmLevel: player.realmLevel,
      difficulty: 'dungeon', // Sẽ tự động = 1.0
      event: event,
      enableRandom: true
    });
  }

  /**
   * Tính EXP cho lệnh mine (không có EXP)
   * @param {Object} player - Thông tin player
   * @param {string} event - Sự kiện (nếu có)
   * @returns {Object} Kết quả EXP mine
   */
  calculateMineExp(player, event = 'none') {
    return this.calculateExp({
      baseExp: 0, // Base EXP cho mine = 0
      realm: player.realm,
      realmLevel: player.realmLevel,
      difficulty: 'mine', // Sẽ tự động = 1.0
      event: event,
      enableRandom: false // Không cần random vì EXP = 0
    });
  }

  /**
   * Tính EXP cho lệnh pick (EXP ngẫu nhiên 40-50)
   * @param {Object} player - Thông tin player
   * @param {string} event - Sự kiện (nếu có)
   * @returns {Object} Kết quả EXP pick
   */
  calculatePickExp(player, event = 'none') {
    const randomExp = Math.floor(Math.random() * (50 - 40 + 1)) + 40; // Random 40-50

    return this.calculateExp({
      baseExp: randomExp, // Base EXP ngẫu nhiên cho pick
      realm: player.realm,
      realmLevel: player.realmLevel,
      difficulty: 'pick', // Sẽ tự động = 1.0
      event: event,
      enableRandom: true
    });
  }

  /**
   * Tính EXP cho lệnh explore (EXP ngẫu nhiên 120-150)
   * @param {Object} player - Thông tin player
   * @param {string} event - Sự kiện (nếu có)
   * @returns {Object} Kết quả EXP explore
   */
  calculateExploreExp(player, event = 'none') {
    const randomExp = Math.floor(Math.random() * (150 - 120 + 1)) + 120; // Random 120-150

    return this.calculateExp({
      baseExp: randomExp, // Base EXP ngẫu nhiên cho explore
      realm: player.realm,
      realmLevel: player.realmLevel,
      difficulty: 'explore', // Sẽ tự động = 1.0
      event: event,
      enableRandom: true
    });
  }

  /**
   * Tính EXP cho các command khác (help, ping, status, spiritroot, cultivation, start)
   * @param {Object} player - Thông tin player
   * @param {number} baseExp - Base EXP của command
   * @param {string} event - Sự kiện (nếu có)
   * @returns {Object} Kết quả EXP command
   */
  calculateCommandExp(player, baseExp, event = 'none') {
    return this.calculateExp({
      baseExp: baseExp,
      realm: player.realm,
      realmLevel: player.realmLevel,
      difficulty: 'other', // Sẽ tự động = 1.0
      event: event,
      enableRandom: true
    });
  }

  /**
   * Cập nhật cấu hình random variance
   * @param {Object} config - Cấu hình mới
   */
  updateRandomVarianceConfig(config) {
    this.randomVarianceConfig = { ...this.randomVarianceConfig, ...config };
  }

  /**
   * Thêm hệ số độ khó mới cho command domain
   * @param {string} name - Tên độ khó
   * @param {number} multiplier - Hệ số
   */
  addDomainDifficulty(name, multiplier) {
    this.domainDifficulties[name] = multiplier;
  }

  /**
   * Thêm hệ số sự kiện mới
   * @param {string} name - Tên sự kiện
   * @param {number} multiplier - Hệ số
   */
  addEventMultiplier(name, multiplier) {
    this.defaultEventMultipliers[name] = multiplier;
  }

  /**
   * Lấy thông tin cấu hình hiện tại
   * @returns {Object} Cấu hình hiện tại
   */
  getConfig() {
    return {
      realmScales: this.realmScales,
      domainDifficulties: this.domainDifficulties,
      defaultEventMultipliers: this.defaultEventMultipliers,
      randomVarianceConfig: this.randomVarianceConfig,
      commandConfigs: this.commandConfigs
    };
  }

  /**
   * Kiểm tra xem difficulty có phải là command domain không
   * @param {string} difficulty - Loại độ khó
   * @returns {boolean} True nếu là command domain
   */
  isDomainCommand(difficulty) {
    return this.domainDifficulties.hasOwnProperty(difficulty);
  }
}

// Export instance để sử dụng
module.exports = new ExpCalculator(); 