const combatSystem = require('./src/systems/combat.js');

console.log('🧪 Testing Combat AP Issue');

async function testCombat() {
// Tạo mock player và monster
const mockPlayer = {
  id: 'test_player',
  username: 'TestPlayer',
  realm: 'luyen_khi',
  realmLevel: 1,
  stats: {
    hp: 100,
    attack: 50,
    defense: 30,
    speed: 6,
    critical: 10,
    evasion: 5,
    regen: 2,
    mp: 50
  },
  currentHp: 100,
  currentMp: 50,
  inventory: { items: [] },
  skills: [],
  cooldowns: {}
};

const mockMonster = {
  id: 'test_monster',
  name: 'Test Monster',
  stats: {
    hp: 80,
    attack: 40,
    defense: 20,
    speed: 3,
    critical: 5,
    evasion: 3,
    regen: 1,
    mp: 30
  },
  currentHp: 80,
  currentMp: 30,
  statusEffects: [],
  cooldowns: {}
};

const mockInteraction = {
  reply: async (content) => console.log('Reply:', content),
  editReply: async (content) => console.log('Edit Reply:', content),
  user: { id: 'test_player' }
};

// Test 1: Khởi tạo combat
console.log('\n=== TEST 1: Initialize Combat ===');
const combat = combatSystem.startCombat(mockPlayer, mockMonster, mockInteraction);

console.log('Combat initialized:');
console.log('- Player AP:', combat.playerAp, '/', combat.playerApMax);
console.log('- Player AP Bonus:', combat.playerApBonus);
console.log('- Monster Action Bonus:', combat.monsterActionBonus);
console.log('- Current Turn:', combat.currentTurn);
console.log('- Turn Actions:', combat.turnActions);

// Test 2: Thực hiện attack
console.log('\n=== TEST 2: Perform Attack ===');
console.log('Before attack - AP:', combat.playerAp);
await combatSystem.handlePlayerAction(combat.id, 'attack', mockInteraction);
console.log('After attack - AP:', combat.playerAp);
console.log('Turn Actions:', combat.turnActions);

// Test 3: Kiểm tra maybeAdvanceTurn
console.log('\n=== TEST 3: Check maybeAdvanceTurn ===');
await combatSystem.maybeAdvanceTurn(combat, mockInteraction);

console.log('\n✅ Test Complete!');
}

testCombat().catch(console.error);
