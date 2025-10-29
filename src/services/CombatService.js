const BaseService = require('./BaseService');
const FileManager = require('../utils/data/file-manager');
const RetryHandler = require('../utils/core/retry-handler');
const CacheManager = require('../utils/data/cache-manager');
const CONSTANTS = require('../../config/constants');
const path = require('path');

class CombatService extends BaseService {
  constructor() {
    super();
    this.activeCombats = new Map();
    this.cache = new CacheManager();
    this.skillsData = null;
    this._cleanupInterval = setInterval(() => {
      try {
        this.cleanupExpiredCombats();
      } catch (e) {
        this.handleError(e, 'CombatService.cleanupExpiredCombats');
      }
    }, CONSTANTS.COMBAT.CLEANUP_INTERVAL_MS);

    this.loadSkillsData();
  }

  async loadSkillsData() {
    const cacheKey = 'skills_data';
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.skillsData = cached;
      return;
    }

    try {
      const result = await RetryHandler.executeWithRetry(async () => {
        const data = await FileManager.readJson(
          path.join(__dirname, '../../data/core/skills.json')
        );
        return data;
      }, 3, 200);

      this.skillsData = result;
      this.cache.set(cacheKey, result, CONSTANTS.CACHE.DEFAULT_TTL_MS);
      this.info('Skills data loaded', { count: Object.keys(result || {}).length });
    } catch (error) {
      this.handleError(error, 'CombatService.loadSkillsData');
      this.skillsData = {};
    }
  }

  startCombat(player, monster, interaction) {
    const combatId = `${player.id}_${Date.now()}`;

    const combat = {
      id: combatId,
      player: {
        ...player,
        userId: player.id,
        name: player.username || 'Bạn',
        currentHp: parseFloat(player.stats.hp),
        currentMp: parseFloat(player.stats.mp),
        statusEffects: [],
        cooldowns: {}
      },
      monster: {
        ...monster,
        currentHp: isNaN(parseFloat(monster.stats.hp)) ? 0 : parseFloat(monster.stats.hp),
        currentMp: isNaN(parseFloat(monster.stats.mp)) ? 0 : parseFloat(monster.stats.mp),
        statusEffects: [],
        cooldowns: {}
      },
      turn: 1,
      currentTurn: 'player',
      battleLog: [],
      interaction: interaction,
      channel: interaction.channel,
      isActive: true,
      createdAt: Date.now()
    };

    this.activeCombats.set(combatId, combat);
    this.info('Combat started', { combatId, active: this.activeCombats.size });

    // Calculate initiative
    this.calculateInitiative(combat);

    // Initialize Action Points
    combat.playerApMax = this.getApForRealm(player.realm);
    combat.playerAp = combat.playerApMax;
    combat.monsterAp = 1;
    combat.turnActions = { attacked: false, usedSkill: false, usedWeaponSkill: false };
    combat.playerCooldowns = {};
    combat.monsterCooldowns = {};

    // Auto cleanup after timeout
    setTimeout(() => {
      if (this.activeCombats.has(combatId)) {
        this.warn('Combat timed out, ending', { combatId });
        this.activeCombats.delete(combatId);
      }
    }, CONSTANTS.COMBAT.TIMEOUT_MS);

    return combat;
  }

  calculateInitiative(combat) {
    const playerSpeed = parseFloat(combat.player.stats.speed);
    const monsterSpeed = parseFloat(combat.monster.stats.speed);

    const playerRoll = playerSpeed + Math.random() * 10;
    const monsterRoll = monsterSpeed + Math.random() * 10;

    combat.currentTurn = playerRoll >= monsterRoll ? 'player' : 'monster';

    combat.battleLog.push(`🎲 **Initiative**: ${combat.currentTurn === 'player' ? 'Bạn' : combat.monster.name} đi trước!`);

    if (combat.currentTurn === 'player') {
      combat.playerAp = combat.playerApMax;
    } else {
      combat.monsterAp = 1;
    }
  }

  getApForRealm(realm) {
    // Base AP cố định = 1 cho mọi tu vi
    return 1;
  }

  getCombat(combatId) {
    return this.activeCombats.get(combatId);
  }

  endCombat(combatId) {
    const combat = this.activeCombats.get(combatId);
    if (combat) {
      combat.isActive = false;
      this.activeCombats.delete(combatId);
      this.info('Combat ended', { combatId });
    }
  }

  cleanupExpiredCombats() {
    const now = Date.now();
    for (const [combatId, combat] of this.activeCombats.entries()) {
      if (!combat || !combat.isActive) {
        this.activeCombats.delete(combatId);
        continue;
      }

      const createdAt = combat.createdAt || 0;
      if (createdAt && now - createdAt > CONSTANTS.COMBAT.TIMEOUT_MS) {
        this.warn('Cleaning up expired combat', { combatId });
        this.activeCombats.delete(combatId);
      }
    }
  }

  getActiveCombatsCount() {
    return this.activeCombats.size;
  }

  destroy() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
    }
    this.activeCombats.clear();
  }
}

module.exports = CombatService;
