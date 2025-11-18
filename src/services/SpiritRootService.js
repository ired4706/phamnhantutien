const BaseService = require('./BaseService');
const FileManager = require('../utils/data/file-manager');
const RetryHandler = require('../utils/core/retry-handler');
const CacheManager = require('../utils/data/cache-manager');
const CONSTANTS = require('../../config/constants');
const path = require('path');

class SpiritRootService extends BaseService {
  constructor() {
    super();
    this.cache = new CacheManager();
    this.spiritRoots = null;
  }

  async getSpiritRootInfo(spiritRootType) {
    try {
      if (!this.spiritRoots) {
        await this.loadSpiritRoots();
      }

      const result = this.spiritRoots[spiritRootType];
      if (!result) {
        this.warn('Spirit root not found', { spiritRootType });
        // Return fallback spirit root với format mới (core_stats)
        return {
          emoji: '❓',
          name: 'Không xác định',
          description: 'Linh căn không xác định',
          core_stats: {
            STR: 7,
            INT: 7,
            DEX: 7,
            VIT: 7,
            LUK: 7
          },
          growth_rates: {
            STR: 1.5,
            INT: 1.5,
            DEX: 1.5,
            VIT: 1.5,
            LUK: 1.5
          }
        };
      }
      return result;
    } catch (error) {
      this.handleError(error, 'SpiritRootService.getSpiritRootInfo');
      // Return fallback spirit root on error với format mới (core_stats)
      return {
        emoji: '❓',
        name: 'Không xác định',
        description: 'Linh căn không xác định',
        core_stats: {
          STR: 7,
          INT: 7,
          DEX: 7,
          VIT: 7,
          LUK: 7
        },
        growth_rates: {
          STR: 1.5,
          INT: 1.5,
          DEX: 1.5,
          VIT: 1.5,
          LUK: 1.5
        }
      };
    }
  }

  async loadSpiritRoots() {
    const cacheKey = 'spirit_roots_data';
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.spiritRoots = cached;
      return;
    }

    try {
      const result = await RetryHandler.executeWithRetry(async () => {
        const data = await FileManager.readJson(
          path.join(__dirname, '../../data/core/spirit-roots.json')
        );
        return data;
      }, 3, 200);

      this.spiritRoots = result;
      this.cache.set(cacheKey, result, CONSTANTS.CACHE.DEFAULT_TTL_MS);
      this.info('Spirit roots loaded', { count: Object.keys(result || {}).length });
    } catch (error) {
      this.handleError(error, 'SpiritRootService.loadSpiritRoots');
      this.spiritRoots = {};
    }
  }

  async getAllSpiritRoots() {
    try {
      if (!this.spiritRoots) {
        await this.loadSpiritRoots();
      }
      return this.spiritRoots || {};
    } catch (error) {
      return this.handleError(error, 'SpiritRootService.getAllSpiritRoots');
    }
  }

  getSpiritRootTypes() {
    return ['kim', 'moc', 'thuy', 'hoa', 'tho'];
  }

  isValidSpiritRootType(type) {
    return this.getSpiritRootTypes().includes(type);
  }
}

module.exports = SpiritRootService;
