const combatSystem = require('./src/systems/combat.js');

console.log('🧪 Testing Skill Cooldown System');

async function testSkillCooldown() {
  // Tạo mock player với skill
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
      mp: 100
    },
    currentHp: 100,
    currentMp: 100,
    inventory: { items: [] },
    skills: ['kim_luyen_khi_1'], // Skill có cooldown
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
  console.log('Combat initialized with AP:', combat.playerAp, '/', combat.playerApMax);

  // Test 2: Sử dụng skill lần đầu (sẽ thành công)
  console.log('\n=== TEST 2: Use Skill First Time ===');
  console.log('Before skill - AP:', combat.playerAp, 'MP:', combat.player.currentMp);
  console.log('Player cooldowns:', combat.playerCooldowns);
  
  await combatSystem.handlePlayerAction(combat.id, 'skill', mockInteraction);
  
  console.log('After skill - AP:', combat.playerAp, 'MP:', combat.player.currentMp);
  console.log('Player cooldowns:', combat.playerCooldowns);

  // Test 3: Thử sử dụng skill lần 2 (sẽ bị cooldown)
  console.log('\n=== TEST 3: Try to Use Skill Again (Should be on cooldown) ===');
  console.log('Before skill - AP:', combat.playerAp, 'MP:', combat.player.currentMp);
  console.log('Player cooldowns:', combat.playerCooldowns);
  
  await combatSystem.handlePlayerAction(combat.id, 'skill', mockInteraction);
  
  console.log('After skill - AP:', combat.playerAp, 'MP:', combat.player.currentMp);
  console.log('Player cooldowns:', combat.playerCooldowns);

  // Test 4: Chuyển turn để giảm cooldown
  console.log('\n=== TEST 4: Next Turn (Reduce Cooldown) ===');
  combatSystem.nextTurn(combat);
  console.log('After nextTurn - Player cooldowns:', combat.playerCooldowns);

  // Test 5: Thử sử dụng skill lần 3 (sẽ thành công)
  console.log('\n=== TEST 5: Try to Use Skill Again (Should work now) ===');
  console.log('Before skill - AP:', combat.playerAp, 'MP:', combat.player.currentMp);
  console.log('Player cooldowns:', combat.playerCooldowns);
  
  await combatSystem.handlePlayerAction(combat.id, 'skill', mockInteraction);
  
  console.log('After skill - AP:', combat.playerAp, 'MP:', combat.player.currentMp);
  console.log('Player cooldowns:', combat.playerCooldowns);

  console.log('\n✅ Skill Cooldown Test Complete!');
}

testSkillCooldown().catch(console.error);

