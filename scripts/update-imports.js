const fs = require('fs');
const path = require('path');

// Mapping cũ -> mới
const pathMappings = {
  // Utils
  '../utils/logger': '../../utils/core/logger',
  '../utils/error-handler': '../../utils/core/error-handler',
  '../utils/retry-handler': '../../utils/core/retry-handler',
  '../utils/shared-utils': '../../utils/core/shared-utils',
  '../utils/file-manager': '../../utils/data/file-manager',
  '../utils/cache-manager': '../../utils/data/cache-manager',
  '../utils/item-loader': '../../utils/data/item-loader',
  '../utils/cooldown': '../../utils/game/cooldown',
  '../utils/item-drop-calculator': '../../utils/game/item-drop-calculator',
  '../utils/spirit-stones-calculator': '../../utils/game/spirit-stones-calculator',
  '../utils/emoji-loader': '../../utils/game/emoji-loader',

  // Services
  '../services/': '../../services/',
  './services/': '../services/',

  // Systems
  '../systems/': '../../systems/',
  './systems/': '../systems/',

  // Container
  '../container/': '../../container/',
  './container/': '../container/',

  // Data
  '../data/players.json': '../../data/core/players.json',
  '../data/realms.json': '../../data/core/realms.json',
  '../data/spirit-roots.json': '../../data/core/spirit-roots.json',
  '../data/skills.json': '../../data/core/skills.json',
  '../data/monsters.json': '../../data/monsters/monsters.json',
  '../data/guilds.json': '../../data/guilds/guilds.json',
  '../data/items/': '../../data/items/',

  // Config
  '../config/': '../../config/',
  './config/': '../config/',

  // Commands
  '../commands/': '../../commands/',
  './commands/': '../commands/'
};

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    for (const [oldPath, newPath] of Object.entries(pathMappings)) {
      const regex = new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (content.includes(oldPath)) {
        content = content.replace(regex, newPath);
        updated = true;
      }
    }

    if (updated) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDirectory(filePath);
    } else if (file.endsWith('.js')) {
      updateFile(filePath);
    }
  }
}

console.log('🔄 Updating import paths...');
walkDirectory('./src');
console.log('✅ Import paths updated!');
