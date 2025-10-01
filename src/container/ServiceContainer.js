const SpiritRootService = require('../services/SpiritRootService');
const PlayerService = require('../services/PlayerService');
const CombatService = require('../services/CombatService');
const Logger = require('../utils/core/logger');

class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.initializeServices();
  }

  initializeServices() {
    try {
      // Core services
      this.services.set('logger', Logger);

      // Game services
      this.services.set('spiritRootService', new SpiritRootService());
      this.services.set('playerService', new PlayerService(this.get('spiritRootService')));
      this.services.set('combatService', new CombatService());

      Logger.info('Service container initialized', {
        services: Array.from(this.services.keys())
      });
    } catch (error) {
      Logger.error('Failed to initialize service container', { error: error.message });
      throw error;
    }
  }

  get(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      Logger.warn('Service not found', { serviceName });
      throw new Error(`Service '${serviceName}' not found`);
    }
    return service;
  }

  has(serviceName) {
    return this.services.has(serviceName);
  }

  set(serviceName, service) {
    this.services.set(serviceName, service);
  }

  getAll() {
    return Array.from(this.services.entries());
  }

  destroy() {
    // Cleanup services that need it
    const combatService = this.services.get('combatService');
    if (combatService && typeof combatService.destroy === 'function') {
      combatService.destroy();
    }

    this.services.clear();
    Logger.info('Service container destroyed');
  }
}

// Singleton instance
let containerInstance = null;

function getContainer() {
  if (!containerInstance) {
    containerInstance = new ServiceContainer();
  }
  return containerInstance;
}

module.exports = { ServiceContainer, getContainer };
