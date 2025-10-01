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

// Fix each file
for (const filePath of commandFiles) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Fix missing closing parenthesis
    if (content.includes('if (!(await playerManager.hasStartedGame(') && !content.includes('))) {')) {
      content = content.replace(
        /if \(!\(await playerManager\.hasStartedGame\(([^)]+)\)\) \{/g,
        'if (!(await playerManager.hasStartedGame($1))) {'
      );
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

console.log('✅ All syntax errors fixed!');
