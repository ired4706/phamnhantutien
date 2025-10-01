const fs = require('fs');
const path = require('path');

// Find all command files
const commandFiles = [];
function findCommandFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findCommandFiles(filePath);
    } else if (file.endsWith('.js')) {
      commandFiles.push(filePath);
    }
  }
}

findCommandFiles('./src/commands');

// Update each file
for (const filePath of commandFiles) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Replace playerManager.hasStartedGame with await
    if (content.includes('playerManager.hasStartedGame(')) {
      content = content.replace(
        /if\s*\(\s*!playerManager\.hasStartedGame\(/g,
        'if (!(await playerManager.hasStartedGame('
      );
      updated = true;
    }

    // Replace playerManager.getPlayer with await
    if (content.includes('playerManager.getPlayer(')) {
      content = content.replace(
        /const\s+player\s*=\s*playerManager\.getPlayer\(/g,
        'const player = await playerManager.getPlayer('
      );
      content = content.replace(
        /let\s+player\s*=\s*playerManager\.getPlayer\(/g,
        'let player = await playerManager.getPlayer('
      );
      content = content.replace(
        /player\s*=\s*playerManager\.getPlayer\(/g,
        'player = await playerManager.getPlayer('
      );
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

console.log('✅ All command files updated!');
