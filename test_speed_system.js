// Test script cho hệ thống speed advantage mới
const combatSystem = require('./src/systems/combat.js');

// Test data
const testPlayer = {
  id: 'test_player',
  username: 'TestPlayer',
  realm: 'luyen_khi',
  realmLevel: 5,
  stats: {
    hp: 100,
    mp: 50,
    attack: 20,
    defense: 15,
    speed: 6, // Speed cao
    critical: 10,
    evasion: 5,
    regen: 2
  }
};

const testMonster = {
  id: 'test_monster',
  name: 'Test Monster',
  stats: {
    hp: 80,
    mp: 30,
    attack: 18,
    defense: 12,
    speed: 3, // Speed thấp hơn
    critical: 8,
    evasion: 3,
    regen: 1
  }
};

const testRaidParty = [
  {
    id: 'player1',
    username: 'Player1',
    realm: 'luyen_khi',
    realmLevel: 5,
    stats: { speed: 6, hp: 100, mp: 50, attack: 20, defense: 15, critical: 10, evasion: 5, regen: 2 }
  },
  {
    id: 'player2', 
    username: 'Player2',
    realm: 'luyen_khi',
    realmLevel: 5,
    stats: { speed: 1.5, hp: 100, mp: 50, attack: 20, defense: 15, critical: 10, evasion: 5, regen: 2 }
  },
  {
    id: 'player3',
    username: 'Player3', 
    realm: 'luyen_khi',
    realmLevel: 5,
    stats: { speed: 2, hp: 100, mp: 50, attack: 20, defense: 15, critical: 10, evasion: 5, regen: 2 }
  }
];

const testRaidMonsters = [
  {
    id: 'monster1',
    name: 'Monster1',
    stats: { speed: 3, hp: 80, mp: 30, attack: 18, defense: 12, critical: 8, evasion: 3, regen: 1 }
  },
  {
    id: 'monster2',
    name: 'Monster2', 
    stats: { speed: 6, hp: 80, mp: 30, attack: 18, defense: 12, critical: 8, evasion: 3, regen: 1 }
  },
  {
    id: 'monster3',
    name: 'Monster3',
    stats: { speed: 2, hp: 80, mp: 30, attack: 18, defense: 12, critical: 8, evasion: 3, regen: 1 }
  }
];

console.log('🧪 Testing Speed Advantage System\n');

// Test 1: Solo Combat
console.log('=== TEST 1: Solo Combat ===');
const mockInteraction = {
  user: { id: 'test_user' },
  channel: { id: 'test_channel' }
};

const soloCombat = combatSystem.startCombat(testPlayer, testMonster, mockInteraction);
console.log('Solo Combat Results:');
console.log(`- Player Speed: ${testPlayer.stats.speed}`);
console.log(`- Monster Speed: ${testMonster.stats.speed}`);
console.log(`- Player AP: ${soloCombat.playerAp}/${soloCombat.playerApMax}`);
console.log(`- Player AP Bonus: ${soloCombat.playerApBonus}`);
console.log(`- Monster Action Bonus: ${soloCombat.monsterActionBonus}`);
console.log(`- Current Turn: ${soloCombat.currentTurn}`);
console.log(`- Player Object AP: ${soloCombat.player.ap}/${soloCombat.player.apMax} (Bonus: +${soloCombat.player.apBonus})`);
console.log('');

// Test 2: Raid Combat
console.log('=== TEST 2: Raid Combat ===');
const raidCombat = combatSystem.startRaidCombat(testRaidParty, [testRaidMonsters], mockInteraction);
console.log('Raid Combat Results:');
console.log('Initiative Order:');
if (raidCombat.initiative && raidCombat.initiative.length > 0) {
  raidCombat.initiative.forEach((entity, index) => {
    console.log(`${index + 1}. ${entity.name} (${entity.type}) - Speed: ${entity.speed}, Ratio: ${entity.speedRatio.toFixed(2)}, AP Bonus: ${entity.apBonus}, Action Bonus: ${entity.actionBonus}`);
  });
} else {
  console.log('Initiative not built yet');
}
console.log('');

// Test 3: Speed Calculations
console.log('=== TEST 3: Speed Calculations ===');
const minSpeed = Math.min(...testRaidParty.map(p => p.stats.speed), ...testRaidMonsters.map(m => m.stats.speed));
console.log(`Minimum Speed: ${minSpeed}`);

testRaidParty.forEach((player, index) => {
  const ratio = player.stats.speed / minSpeed;
  const apBonus = ratio >= 3 ? 2 : ratio >= 2 ? 1 : 0;
  console.log(`Player${index + 1}: Speed ${player.stats.speed}, Ratio ${ratio.toFixed(2)}, AP Bonus +${apBonus}`);
});

testRaidMonsters.forEach((monster, index) => {
  const ratio = monster.stats.speed / minSpeed;
  const actionBonus = ratio >= 3 ? 2 : ratio >= 2 ? 1 : 0;
  console.log(`Monster${index + 1}: Speed ${monster.stats.speed}, Ratio ${ratio.toFixed(2)}, Action Bonus +${actionBonus}`);
});

console.log('\n✅ Speed Advantage System Test Complete!');
