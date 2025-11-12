/**
 * Combat System - Main exports
 * Exports all combat modules for use in the main CombatSystem
 */

const CombatHelpers = require('./CombatHelpers');
const DamageCalculator = require('./DamageCalculator');
const StatusEffects = require('./StatusEffects');
const TurnManager = require('./TurnManager');
const CombatActions = require('./CombatActions');
const SkillSystem = require('./SkillSystem');
const WeaponSystem = require('./WeaponSystem');
const MonsterAI = require('./MonsterAI');
const RaidSystem = require('./RaidSystem');

module.exports = {
  CombatHelpers,
  DamageCalculator,
  StatusEffects,
  TurnManager,
  CombatActions,
  SkillSystem,
  WeaponSystem,
  MonsterAI,
  RaidSystem
};

