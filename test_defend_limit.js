const combatSystem = require('./src/systems/combat.js');

console.log('🧪 Testing Defend Limit System');

async function testDefendLimit() {
  // Test 1: Solo Combat
  console.log('\n=== TEST 1: Solo Combat Defend Limit ===');

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
    cooldowns: {},
    statusEffects: []
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

  // Khởi tạo solo combat
  const soloCombat = combatSystem.startCombat(mockPlayer, mockMonster, mockInteraction);
  console.log('Solo combat initialized with AP:', soloCombat.playerAp, '/', soloCombat.playerApMax);

  // Thử phòng thủ lần 1
  console.log('\n--- Defend Attempt 1 ---');
  console.log('Before defend - AP:', soloCombat.playerAp, 'Defended:', soloCombat.turnActions?.defended);
  const result1 = combatSystem.performDefend(soloCombat.player, soloCombat);
  console.log('Result:', result1);
  console.log('After defend - AP:', soloCombat.playerAp, 'Defended:', soloCombat.turnActions?.defended);

  // Thử phòng thủ lần 2 (sẽ bị từ chối)
  console.log('\n--- Defend Attempt 2 (Should be rejected) ---');
  console.log('Before defend - AP:', soloCombat.playerAp, 'Defended:', soloCombat.turnActions?.defended);
  const result2 = combatSystem.performDefend(soloCombat.player, soloCombat);
  console.log('Result:', result2);
  console.log('After defend - AP:', soloCombat.playerAp, 'Defended:', soloCombat.turnActions?.defended);

  // Test 2: Raid Combat
  console.log('\n=== TEST 2: Raid Combat Defend Limit ===');

  const mockPlayer1 = { ...mockPlayer, id: 'player1', username: 'Player1', statusEffects: [] };
  const mockPlayer2 = { ...mockPlayer, id: 'player2', username: 'Player2', statusEffects: [] };
  const mockMonster1 = { ...mockMonster, id: 'monster1', name: 'Monster1' };
  const mockMonster2 = { ...mockMonster, id: 'monster2', name: 'Monster2' };

  const raidCombat = combatSystem.startRaidCombat([mockPlayer1, mockPlayer2], [[mockMonster1, mockMonster2]], mockInteraction);
  console.log('Raid combat initialized with AP:', raidCombat.playerAp, '/', raidCombat.playerApMax);

  // Lấy entity từ combat party
  const player1Entity = raidCombat.party[0];
  const player2Entity = raidCombat.party[1];

  // Thử phòng thủ với player1 lần 1
  console.log('\n--- Player1 Defend Attempt 1 ---');
  console.log('Before defend - AP:', raidCombat.playerAp, 'Player1 defended:', player1Entity.defended);
  const raidResult1 = combatSystem.performDefend(player1Entity, raidCombat);
  console.log('Result:', raidResult1);
  console.log('After defend - AP:', raidCombat.playerAp, 'Player1 defended:', player1Entity.defended);

  // Thử phòng thủ với player1 lần 2 (sẽ bị từ chối)
  console.log('\n--- Player1 Defend Attempt 2 (Should be rejected) ---');
  console.log('Before defend - AP:', raidCombat.playerAp, 'Player1 defended:', player1Entity.defended);
  const raidResult2 = combatSystem.performDefend(player1Entity, raidCombat);
  console.log('Result:', raidResult2);
  console.log('After defend - AP:', raidCombat.playerAp, 'Player1 defended:', player1Entity.defended);

  // Thử phòng thủ với player2 (sẽ thành công)
  console.log('\n--- Player2 Defend Attempt 1 (Should work) ---');
  console.log('Before defend - AP:', raidCombat.playerAp, 'Player2 defended:', player2Entity.defended);
  const raidResult3 = combatSystem.performDefend(player2Entity, raidCombat);
  console.log('Result:', raidResult3);
  console.log('After defend - AP:', raidCombat.playerAp, 'Player2 defended:', player2Entity.defended);

  console.log('\n✅ Defend Limit Test Complete!');
}

testDefendLimit().catch(console.error);
