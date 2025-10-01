const CONSTANTS = {
  COMBAT: {
    TIMEOUT_MS: 10 * 60 * 1000,
    CLEANUP_INTERVAL_MS: 60 * 1000
  },
  CACHE: {
    DEFAULT_TTL_MS: 5 * 60 * 1000,
    MONSTERS_TTL_MS: 10 * 60 * 1000
  },
  FILES: {
    MONSTERS: 'data/monsters.json',
    SKILLS: 'data/skills.json',
    SPIRIT_ROOTS: 'data/spirit-roots.json'
  }
};

module.exports = CONSTANTS;


