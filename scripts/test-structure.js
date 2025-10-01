const fs = require('fs');
const path = require('path');

console.log('🧪 Testing new project structure...\n');

// Test 1: Check if all directories exist
const requiredDirs = [
  'src/commands/core',
  'src/commands/cultivation',
  'src/commands/combat',
  'src/commands/crafting',
  'src/commands/exploration',
  'src/commands/management',
  'src/commands/quests',
  'src/services',
  'src/systems',
  'src/utils/core',
  'src/utils/data',
  'src/utils/game',
  'src/container',
  'data/core',
  'data/items',
  'data/monsters',
  'data/guilds',
  'config',
  'docs'
];

console.log('📁 Checking directories...');
for (const dir of requiredDirs) {
  if (fs.existsSync(dir)) {
    console.log(`✅ ${dir}`);
  } else {
    console.log(`❌ ${dir} - MISSING`);
  }
}

// Test 2: Check if all commands are in correct categories
console.log('\n📋 Checking command categories...');
const commandCategories = {
  'core': ['start.js', 'status.js', 'help.js', 'ping.js', 'test.js'],
  'cultivation': ['cultivation.js', 'breakthrough.js', 'meditate.js', 'spiritroot.js'],
  'combat': ['hunt.js', 'challenge.js', 'dungeon.js'],
  'crafting': ['alchemy.js', 'forge.js', 'craft.js', 'equipment.js'],
  'exploration': ['explore.js', 'mine.js', 'pick.js', 'domain.js'],
  'management': ['inventory.js', 'skills.js', 'wallet.js', 'item.js', 'rarity.js'],
  'quests': ['daily.js', 'weekly.js', 'guild.js']
};

for (const [category, files] of Object.entries(commandCategories)) {
  const categoryPath = `src/commands/${category}`;
  if (fs.existsSync(categoryPath)) {
    const actualFiles = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
      if (actualFiles.includes(file)) {
        console.log(`✅ ${category}/${file}`);
      } else {
        console.log(`❌ ${category}/${file} - MISSING`);
      }
    }
  }
}

// Test 3: Check if services exist
console.log('\n🔧 Checking services...');
const services = ['BaseService.js', 'PlayerService.js', 'CombatService.js', 'SpiritRootService.js'];
for (const service of services) {
  if (fs.existsSync(`src/services/${service}`)) {
    console.log(`✅ ${service}`);
  } else {
    console.log(`❌ ${service} - MISSING`);
  }
}

// Test 4: Check if utils are categorized correctly
console.log('\n🛠️ Checking utils categorization...');
const utils = {
  'core': ['logger.js', 'error-handler.js', 'retry-handler.js', 'shared-utils.js'],
  'data': ['file-manager.js', 'cache-manager.js', 'item-loader.js'],
  'game': ['cooldown.js', 'item-drop-calculator.js', 'spirit-stones-calculator.js', 'emoji-loader.js']
};

for (const [category, files] of Object.entries(utils)) {
  const categoryPath = `src/utils/${category}`;
  if (fs.existsSync(categoryPath)) {
    const actualFiles = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
      if (actualFiles.includes(file)) {
        console.log(`✅ utils/${category}/${file}`);
      } else {
        console.log(`❌ utils/${category}/${file} - MISSING`);
      }
    }
  }
}

// Test 5: Check if data files are organized
console.log('\n📊 Checking data organization...');
const dataFiles = {
  'core': ['players.json', 'realms.json', 'spirit-roots.json', 'skills.json'],
  'items': ['artifacts.json', 'currency.json', 'elixirs.json', 'equipment.json', 'herbs.json', 'hunt_loot.json', 'index.json', 'minerals.json', 'rarity_levels.json', 'special_items.json', 'weapons.json'],
  'monsters': ['monsters.json'],
  'guilds': ['guilds.json']
};

for (const [category, files] of Object.entries(dataFiles)) {
  const categoryPath = `data/${category}`;
  if (fs.existsSync(categoryPath)) {
    const actualFiles = fs.readdirSync(categoryPath).filter(f => f.endsWith('.json'));
    for (const file of files) {
      if (actualFiles.includes(file)) {
        console.log(`✅ data/${category}/${file}`);
      } else {
        console.log(`❌ data/${category}/${file} - MISSING`);
      }
    }
  }
}

// Test 6: Check if documentation is organized
console.log('\n📚 Checking documentation...');
const docFiles = [
  'README.md', 'PROJECT_STRUCTURE.md', 'ALCHEMY_SYSTEM.md',
  'DISCORD_EMOJI_INTEGRATION.md', 'EQUIPMENT_CRAFTING_UPDATE.md',
  'GAME_BALANCE_UPDATE.md', 'HUNT_LOOT_SYSTEM.md', 'ITEM_COMMAND_MAPPING.md',
  'MINE_DROP_SYSTEM.md', 'NEW_MINERALS_UPDATE.md', 'NEW_SPECIAL_ITEMS_UPDATE.md',
  'QUICK_ITEM_MAPPING.md', 'SPIRIT_STONES_SYSTEM.md'
];

for (const doc of docFiles) {
  if (fs.existsSync(`docs/${doc}`)) {
    console.log(`✅ docs/${doc}`);
  } else {
    console.log(`❌ docs/${doc} - MISSING`);
  }
}

console.log('\n🎉 Structure test completed!');
