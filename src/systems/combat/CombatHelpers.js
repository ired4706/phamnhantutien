/**
 * Combat Helpers - Utility functions for combat system
 * Pure utility functions with no dependencies
 */

// Realm-based config for crit and penetration baselines
const REALM_CONFIG = {
  luyen_khi: { Kcrit: 200, PEN_BASE: 150 },
  truc_co: { Kcrit: 800, PEN_BASE: 500 },
  ket_dan: { Kcrit: 2000, PEN_BASE: 1500 },
  nguyen_anh: { Kcrit: 3000, PEN_BASE: 3500 }
};

/**
 * Get stat icons mapping
 */
function getStatIcons() {
  return {
    hp: '❤️',
    mp: '🔵',
    atk: '⚔️',
    def: '🛡️',
    spd: '🏃',
    crit: '🎯',
    eva: '💨',
    regen: '♻️',
    ap: '🔶',
    apBonus: '⚡'
  };
}

/**
 * Render text progress bar
 * @param {number} current - Current value
 * @param {number} max - Maximum value
 * @param {number} width - Bar width (default: 14)
 * @returns {string} Progress bar string
 */
function renderTextBar(current, max, width = 14) {
  const cur = Math.max(0, Number(current || 0));
  const m = Math.max(1, Number(max || 1));
  const ratio = Math.max(0, Math.min(1, cur / m));
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return '▰'.repeat(filled) + '▱'.repeat(empty);
}

/**
 * Get variant name in Vietnamese
 * @param {string} variant - Variant type
 * @returns {string} Vietnamese variant name
 */
function getVariantName(variant) {
  if (variant === 'mutated') return 'Biến dị';
  if (variant === 'super_mutated') return 'Siêu biến dị';
  return 'Thường';
}

/**
 * Get difficulty stars for variant
 * @param {string} variant - Variant type
 * @returns {string} Stars string
 */
function getDifficultyStars(variant) {
  if (variant === 'mutated') return '⭐⭐';
  if (variant === 'super_mutated') return '⭐⭐⭐';
  return '⭐';
}

/**
 * Get base AP for realm
 * @param {string} realm - Realm name
 * @returns {number} Base AP (currently always 1)
 */
function getApForRealm(realm) {
  // Base AP cố định = 1 cho mọi tu vi
  return 1;
}

/**
 * Get element name in Vietnamese
 * @param {string} code - Element code
 * @returns {string} Vietnamese element name
 */
function getElementViName(code) {
  const map = {
    kim: 'Kim',
    moc: 'Mộc',
    thuy: 'Thủy',
    hoa: 'Hỏa',
    tho: 'Thổ',
    phong: 'Phong',
    loi: 'Lôi',
    vo_he: 'Vô Hệ'
  };
  return map[code] || 'Vô Hệ';
}

/**
 * Get element name in Vietnamese or "Không" if none
 * @param {string} code - Element code
 * @returns {string} Vietnamese element name or "Không"
 */
function getElementViNameOrNone(code) {
  if (!code || code === 'none' || code === 'vo_he') return 'Không';
  return getElementViName(code);
}

/**
 * Get tier name in Vietnamese
 * @param {string} key - Tier key
 * @returns {string} Vietnamese tier name
 */
function getTierViName(key) {
  const map = {
    nhat_cap: 'Nhất Cấp',
    nhi_cap: 'Nhị Cấp',
    tam_cap: 'Tam Cấp',
    tu_cap: 'Tứ Cấp',
    ngu_cap: 'Ngũ Cấp',
    luc_cap: 'Lục Cấp',
    that_cap: 'Thất Cấp',
    bat_cap: 'Bát Cấp',
    cuu_cap: 'Cửu Cấp',
    thap_cap: 'Thập Cấp'
  };
  return map[key] || (key ? key.replace(/_/g, ' ').toUpperCase() : '');
}

/**
 * Get element emoji
 * @param {string} element - Element code
 * @returns {string} Element emoji
 */
function getElementEmoji(element) {
  const map = {
    kim: '⚔️',
    moc: '🌿',
    thuy: '💧',
    hoa: '🔥',
    tho: '🏔️',
    phong: '🌪️',
    loi: '⚡',
    vo_he: '🌀'
  };
  return map[element] || '⚫';
}

/**
 * Get variant rarity icon
 * @param {string} variant - Variant type
 * @param {boolean} isBoss - Is boss monster
 * @returns {string} Rarity icon
 */
function getVariantRarityIcon(variant, isBoss = false) {
  if (isBoss) return '👑'; // Boss
  if (!variant || variant === 'normal') return '✦'; // Normal
  if (variant === 'mutated') return '✧'; // Mutated
  if (variant === 'super_mutated') return '✸'; // Super Mutated
  return '✦'; // Mặc định
}

module.exports = {
  REALM_CONFIG,
  getStatIcons,
  renderTextBar,
  getVariantName,
  getDifficultyStars,
  getApForRealm,
  getElementViName,
  getElementViNameOrNone,
  getTierViName,
  getElementEmoji,
  getVariantRarityIcon
};

