// 一次性生成 Config_CSV 的初始表。
// 生成后以 CSV 为准；本脚本只用于从设计文档 V3.3 批量落地初始值。
// 运行：node Tools/gen_config_bootstrap.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'Config_CSV');
fs.mkdirSync(OUT, { recursive: true });

function esc(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function write(name, columns, rows) {
  const lines = [columns.join(',')];
  for (const r of rows) {
    for (const c of columns) {
      if (r[c] === undefined) throw new Error(`${name}: row missing column ${c} (${JSON.stringify(r).slice(0, 120)})`);
    }
    lines.push(columns.map((c) => esc(r[c])).join(','));
  }
  fs.writeFileSync(path.join(OUT, name + '.csv'), '\ufeff' + lines.join('\r\n') + '\r\n', 'utf8');
  console.log(`${name}.csv  ${rows.length} rows`);
}

// ---------- 通用枚举与系数 ----------
const FACTIONS = ['anchor', 'blue', 'red', 'green'];
const FACTION_NAME = { anchor: '铁锚联邦', blue: '蓝潮同盟', red: '赤潮帝国', green: '翡翠共和国' };
const QUALITY = ['B', 'A', 'S', 'SS'];
const QUALITY_MULT = { B: 1.0, A: 1.3, S: 1.7, SS: 2.2 };
const FACTION_SPD = { anchor: 95, blue: 105, red: 100, green: 110 };
const BASE = { hp: 1000, atk: 100, def: 50 };
const SLOTS = {
  anchor: ['主炮', '副炮', '防空', '鱼雷', '设备', '舰载机'],
  blue: ['主炮', '副炮', '防空', '鱼雷', '设备', '舰载机'],
  red: ['主炮', '副炮', '防空', '鱼雷', '设备', '舰载机'],
  green: ['主炮', '副炮', '防空', '鱼雷', '设备', '舰载机'],
};
const SLOT_COUNT = { B: 3, A: 4, S: 5, SS: 6 };

// ---------- ship ----------
const ships = [
  ['ship_anchor_01', '铁锚号', 'anchor', 'B', '前排承伤', ['主炮', '防空', '设备']],
  ['ship_anchor_02', '堡垒', 'anchor', 'A', '前排嘲讽', ['主炮', '副炮', '防空', '设备']],
  ['ship_anchor_03', '重锤', 'anchor', 'S', '前排反伤', ['主炮', '副炮', '防空', '鱼雷', '设备']],
  ['ship_anchor_04', '铁壁', 'anchor', 'SS', '前排护盾', SLOTS.anchor],
  ['ship_blue_01', '蓝翼', 'blue', 'B', '后排输出', ['主炮', '鱼雷', '设备']],
  ['ship_blue_02', '天空', 'blue', 'A', '后排群攻', ['主炮', '副炮', '鱼雷', '舰载机']],
  ['ship_blue_03', '海鸥', 'blue', 'S', '后排舰载机', ['主炮', '副炮', '防空', '鱼雷', '舰载机']],
  ['ship_blue_04', '苍穹', 'blue', 'SS', '后排制空', SLOTS.blue],
  ['ship_red_01', '赤影', 'red', 'B', '后排爆发', ['主炮', '鱼雷', '设备']],
  ['ship_red_02', '潜伏者', 'red', 'A', '后排单体', ['主炮', '鱼雷', '设备', '舰载机']],
  ['ship_red_03', '匕首', 'red', 'S', '后排暴击', ['主炮', '副炮', '鱼雷', '设备', '舰载机']],
  ['ship_red_04', '血鲨', 'red', 'SS', '后排斩杀', SLOTS.red],
  ['ship_green_01', '翡翠', 'green', 'A', '后排治疗', ['主炮', '防空', '设备', '舰载机']],
  ['ship_green_02', '微风', 'green', 'S', '后排增益', ['主炮', '副炮', '防空', '设备', '舰载机']],
  ['ship_green_03', '晨星', 'green', 'SS', '后排支援', SLOTS.green],
];

const shipRows = ships.map(([id, name, faction, quality, role, slots]) => {
  const m = QUALITY_MULT[quality];
  const isSS = quality === 'SS';
  return {
    id,
    name,
    faction,
    quality,
    role,
    isTradeShip: 0,
    hp: Math.round(BASE.hp * m),
    atk: Math.round(BASE.atk * m),
    def: Math.round(BASE.def * m),
    spd: FACTION_SPD[faction],
    critRate: 5,
    critDmg: 150,
    growth: 0.08,
    slots: slots.join('|'),
    rageSkillId: `skill_${faction}_rage`,
    passiveSkillId: quality === 'B' ? '' : `skill_${faction}_passive`,
    exclusiveSkillId: isSS ? `skill_ss_${faction}` : '',
    flagshipSkillId: `skill_${faction}_flagship`,
    capacity: 0,
    speed: 0,
    buyPrice: 0,
    unlockTradeLevel: 0,
    description: `${FACTION_NAME[faction]} ${quality} ${role}`,
  };
});

const tradeShips = [
  ['ship_trade_small', '小型贸易船', 'B', 100, 1.0, 0, 0],
  ['ship_trade_medium', '中型贸易船', 'A', 250, 0.9, 50000, 3],
  ['ship_trade_large', '大型贸易船', 'S', 600, 0.8, 200000, 6],
].map(([id, name, quality, capacity, speed, buyPrice, unlockTradeLevel]) => ({
  id,
  name,
  faction: 'neutral',
  quality,
  role: '贸易',
  isTradeShip: 1,
  hp: 0,
  atk: 0,
  def: 0,
  spd: 0,
  critRate: 0,
  critDmg: 0,
  growth: 0,
  slots: '',
  rageSkillId: '',
  passiveSkillId: '',
  exclusiveSkillId: '',
  flagshipSkillId: '',
  capacity,
  speed,
  buyPrice,
  unlockTradeLevel,
  description: '贸易船，不参与战斗',
}));

write(
  'ship',
  ['id', 'name', 'faction', 'quality', 'role', 'isTradeShip', 'hp', 'atk', 'def', 'spd', 'critRate', 'critDmg', 'growth', 'slots', 'rageSkillId', 'passiveSkillId', 'exclusiveSkillId', 'flagshipSkillId', 'capacity', 'speed', 'buyPrice', 'unlockTradeLevel', 'description'],
  [...shipRows, ...tradeShips]
);

// ---------- skill ----------
const skillCols = [
  'id', 'name', 'type', 'faction', 'ownerShipId', 'trigger', 'condition', 'conditionValue',
  'chance', 'chancePerLevel', 'cost', 'cooldown', 'targetRule', 'power', 'powerPerLevel',
  'defPenetration', 'durationRounds', 'stackRule', 'dispellable', 'oncePerBattle',
  'effectType', 'effectValue', 'effect2Type', 'effect2Value', 'effect3Type', 'effect3Value',
  'description',
];

function sk(o) {
  return {
    id: '', name: '', type: '', faction: '', ownerShipId: '', trigger: '', condition: '', conditionValue: '',
    chance: 100, chancePerLevel: 0, cost: 0, cooldown: 0, targetRule: '', power: 0, powerPerLevel: 0,
    defPenetration: 0, durationRounds: 0, stackRule: 'refresh', dispellable: 1, oncePerBattle: 0,
    effectType: '', effectValue: 0, effect2Type: '', effect2Value: 0, effect3Type: '', effect3Value: 0,
    description: '', ...o,
  };
}

const skills = [
  // 12 个阵营模板
  sk({ id: 'skill_anchor_rage', name: '钢铁壁垒', type: 'rage', faction: 'anchor', trigger: 'rage_full', cost: 100, targetRule: 'self', durationRounds: 2, effectType: 'taunt', effectValue: 1, effect2Type: 'damageReduction', effect2Value: 30, description: '嘲讽 2 回合，自身减伤 +30%' }),
  sk({ id: 'skill_anchor_passive', name: '厚装甲', type: 'passive', faction: 'anchor', trigger: 'on_hit', chance: 10, chancePerLevel: 1, targetRule: 'self', effectType: 'reflect', effectValue: 30, description: '受击时 10% 概率反伤 30%' }),
  sk({ id: 'skill_anchor_flagship', name: '联邦防线', type: 'flagship', faction: 'anchor', trigger: 'round_3_then_4', targetRule: 'allAllies', durationRounds: 3, effectType: 'damageReduction', effectValue: 10, description: '全队减伤 +10%，3 回合' }),
  sk({ id: 'skill_blue_rage', name: '舰载机空袭', type: 'rage', faction: 'blue', trigger: 'rage_full', cost: 100, targetRule: 'randomEnemy3', power: 120, powerPerLevel: 8, description: '随机 3 个目标各 120%' }),
  sk({ id: 'skill_blue_passive', name: '制空', type: 'passive', faction: 'blue', trigger: 'after_attack', targetRule: 'singleEnemy', power: 40, powerPerLevel: 3, description: '普攻追加一次 40% 的舰载机攻击' }),
  sk({ id: 'skill_blue_flagship', name: '战机起飞', type: 'flagship', faction: 'blue', trigger: 'round_3_then_4', targetRule: 'allEnemies', power: 80, powerPerLevel: 6, description: '立即对全体敌人造成 80% 伤害' }),
  sk({ id: 'skill_red_rage', name: '齐射鱼雷', type: 'rage', faction: 'red', trigger: 'rage_full', cost: 100, targetRule: 'singleEnemy', power: 260, powerPerLevel: 16, defPenetration: 30, description: '单体 260%，无视 30% DEF' }),
  sk({ id: 'skill_red_passive', name: '深潜', type: 'passive', faction: 'red', trigger: 'always', targetRule: 'self', effectType: 'critRate', effectValue: 10, effect2Type: 'damageUp', effect2Value: 15, condition: 'targetHpAbove', conditionValue: 70, description: '暴击率 +10%，对耐久 >70% 的目标增伤 15%' }),
  sk({ id: 'skill_red_flagship', name: '雷幕', type: 'flagship', faction: 'red', trigger: 'round_3_then_4', targetRule: 'allAllies', durationRounds: 3, effectType: 'critDmg', effectValue: 20, description: '全队暴击伤害 +20%，3 回合' }),
  sk({ id: 'skill_green_rage', name: '战地修复', type: 'rage', faction: 'green', trigger: 'rage_full', cost: 100, targetRule: 'lowestAlly', power: 200, powerPerLevel: 12, effectType: 'cleanse', effectValue: 1, description: '治疗最低耐久友军 ATK×200%，净化 1 个负面' }),
  sk({ id: 'skill_green_passive', name: '电子干扰', type: 'passive', faction: 'green', trigger: 'after_action', chance: 20, chancePerLevel: 1, targetRule: 'randomEnemy', durationRounds: 2, effectType: 'spdDown', effectValue: 15, description: '行动后 20% 概率使随机敌人 SPD −15%，2 回合' }),
  sk({ id: 'skill_green_flagship', name: '补给线', type: 'flagship', faction: 'green', trigger: 'round_3_then_4', targetRule: 'allAllies', power: 60, powerPerLevel: 4, effectType: 'rageGain', effectValue: 20, description: '全队回复 ATK×60%，怒气 +20' }),
  // 4 个 SS 专属
  sk({ id: 'skill_ss_anchor', name: '不沉之锚', type: 'exclusive', faction: 'anchor', ownerShipId: 'ship_anchor_04', trigger: 'battle_start', targetRule: 'self', effectType: 'shield', effectValue: 25, effect2Type: 'damageReduction', effect2Value: 15, effect3Type: 'damageReduction', effect3Value: 10, description: '开场护盾 25% 最大耐久；护盾存在时自身减伤 +15%；护盾破碎时全队减伤 +10%，2 回合' }),
  sk({ id: 'skill_ss_blue', name: '制空权', type: 'exclusive', faction: 'blue', ownerShipId: 'ship_blue_04', trigger: 'round_3_6_9', targetRule: 'allEnemies', power: 60, powerPerLevel: 4, durationRounds: 2, effectType: 'spdDown', effectValue: 10, description: '第 3、6、9…回合开始时，对全体敌人造成 60% 攻击伤害，并使其 SPD −10%，持续 2 回合' }),
  sk({ id: 'skill_ss_red', name: '猎杀本能', type: 'exclusive', faction: 'red', ownerShipId: 'ship_red_04', trigger: 'always', condition: 'targetHpBelow', conditionValue: 40, targetRule: 'self', effectType: 'critRate', effectValue: 30, effect2Type: 'critDmg', effect2Value: 50, effect3Type: 'rageGain', effect3Value: 50, description: '对耐久 <40% 的目标暴击率 +30%、暴击伤害 +50%；击杀目标后立即获得 50 怒气' }),
  sk({ id: 'skill_ss_green', name: '潮汐祝福', type: 'exclusive', faction: 'green', ownerShipId: 'ship_green_03', trigger: 'on_heal', targetRule: 'allAllies', effectType: 'damageReduction', effectValue: 5, effect2Type: 'immunity', effect2Value: 1, stackRule: 'stack_3', oncePerBattle: 1, description: '每次治疗使目标获得 5% 减伤，最多 3 层；每场一次，友军首次致命伤害免疫并回复 20% 最大耐久' }),
  // 4 个合击
  sk({ id: 'skill_combo_anchor', name: '铜墙铁壁', type: 'combo', faction: 'anchor', trigger: 'combo', targetRule: 'allAllies', durationRounds: 3, effectType: 'shield', effectValue: 20, effect2Type: 'damageReduction', effect2Value: 15, oncePerBattle: 1, description: '全队每人获得自身最大耐久 20% 的护盾，3 回合；期间全队减伤 +15%' }),
  sk({ id: 'skill_combo_blue', name: '饱和空袭', type: 'combo', faction: 'blue', trigger: 'combo', targetRule: 'allEnemies', power: 120, powerPerLevel: 8, durationRounds: 2, effectType: 'spdDown', effectValue: 10, oncePerBattle: 1, description: '对全体敌人造成 120% 攻击伤害，并使其 SPD −10%，持续 2 回合' }),
  sk({ id: 'skill_combo_red', name: '双雷齐射', type: 'combo', faction: 'red', trigger: 'combo', targetRule: 'highestHpEnemy', power: 380, powerPerLevel: 24, defPenetration: 40, effectType: 'critRate', effectValue: 50, condition: 'targetHpBelow', conditionValue: 40, oncePerBattle: 1, description: '对当前耐久最高的敌人造成 380% 伤害，无视 40% DEF；目标耐久 <40% 时暴击率 +50%' }),
  sk({ id: 'skill_combo_green', name: '生命之潮', type: 'combo', faction: 'green', trigger: 'combo', targetRule: 'allAllies', power: 150, powerPerLevel: 10, effectType: 'cleanse', effectValue: 99, effect2Type: 'rageGain', effect2Value: 20, oncePerBattle: 1, description: '全队回复施放者 ATK×150% 的耐久，净化全部减益，怒气 +20' }),
  // 8 个舰长被动
  sk({ id: 'skill_cap_anchor_01', name: '铁壁指挥', type: 'passive', faction: 'anchor', trigger: 'always', targetRule: 'allAllies', effectType: 'damageReduction', effectValue: 5, description: '全队减伤 +5%' }),
  sk({ id: 'skill_cap_anchor_02', name: '锚定', type: 'passive', faction: 'anchor', trigger: 'always', targetRule: 'self', effectType: 'defUp', effectValue: 10, description: '自身防御 +10%' }),
  sk({ id: 'skill_cap_blue_01', name: '航空指挥', type: 'passive', faction: 'blue', trigger: 'always', targetRule: 'allAllies', effectType: 'atkUp', effectValue: 5, description: '全队攻击 +5%' }),
  sk({ id: 'skill_cap_blue_02', name: '精准空袭', type: 'passive', faction: 'blue', trigger: 'always', targetRule: 'backRowAllies', effectType: 'atkUp', effectValue: 8, description: '后排攻击 +8%' }),
  sk({ id: 'skill_cap_red_01', name: '鱼雷指挥', type: 'passive', faction: 'red', trigger: 'always', targetRule: 'allAllies', effectType: 'critRate', effectValue: 3, description: '全队暴击率 +3%' }),
  sk({ id: 'skill_cap_red_02', name: '猎手', type: 'passive', faction: 'red', trigger: 'always', targetRule: 'self', effectType: 'critDmg', effectValue: 15, description: '自身暴击伤害 +15%' }),
  sk({ id: 'skill_cap_green_01', name: '医疗指挥', type: 'passive', faction: 'green', trigger: 'always', targetRule: 'allAllies', effectType: 'healUp', effectValue: 10, description: '全队治疗量 +10%' }),
  sk({ id: 'skill_cap_green_02', name: '顺风', type: 'passive', faction: 'green', trigger: 'always', targetRule: 'allAllies', effectType: 'spdUp', effectValue: 5, description: '全队速度 +5%' }),
  // 6 个敌方技能
  sk({ id: 'skill_enemy_heavy', name: '重装冲撞', type: 'rage', faction: 'enemy', trigger: 'rage_full', cost: 100, targetRule: 'singleEnemy', power: 150, durationRounds: 2, effectType: 'defUp', effectValue: 20, description: '单体 150%，自身防御 +20%，2 回合' }),
  sk({ id: 'skill_enemy_swarm', name: '集群突袭', type: 'rage', faction: 'enemy', trigger: 'rage_full', cost: 100, targetRule: 'randomEnemy3', power: 80, description: '随机 3 个目标各 80%' }),
  sk({ id: 'skill_enemy_gunboat', name: '速射炮击', type: 'rage', faction: 'enemy', trigger: 'rage_full', cost: 100, targetRule: 'singleEnemy', power: 180, description: '单体 180%' }),
  sk({ id: 'skill_enemy_jammer', name: '干扰脉冲', type: 'rage', faction: 'enemy', trigger: 'rage_full', cost: 100, targetRule: 'allEnemies', durationRounds: 2, effectType: 'spdDown', effectValue: 10, effect2Type: 'dot', effect2Value: 30, description: '全体 SPD −10%，并附加持续伤害，2 回合' }),
  sk({ id: 'skill_enemy_carrier', name: '舰载机支援', type: 'rage', faction: 'enemy', trigger: 'rage_full', cost: 100, targetRule: 'allEnemies', power: 90, description: '全体 90%' }),
  sk({ id: 'skill_enemy_boss', name: '深渊炮击', type: 'rage', faction: 'enemy', trigger: 'rage_full', cost: 100, targetRule: 'allEnemies', power: 140, durationRounds: 1, effectType: 'stun', effectValue: 1, description: '全体 140%，眩晕 1 回合' }),
];

write('skill', skillCols, skills);

// ---------- captain ----------
const captains = [
  ['captain_anchor_01', '霍克', 'anchor', 'S', 'skill_cap_anchor_01', '主推'],
  ['captain_anchor_02', '格雷', 'anchor', 'A', 'skill_cap_anchor_02', '备选'],
  ['captain_blue_01', '艾琳', 'blue', 'S', 'skill_cap_blue_01', '主推'],
  ['captain_blue_02', '海伦', 'blue', 'A', 'skill_cap_blue_02', '备选'],
  ['captain_red_01', '赤羽', 'red', 'S', 'skill_cap_red_01', '主推'],
  ['captain_red_02', '黑潮', 'red', 'A', 'skill_cap_red_02', '备选'],
  ['captain_green_01', '青岚', 'green', 'S', 'skill_cap_green_01', '主推'],
  ['captain_green_02', '森语', 'green', 'A', 'skill_cap_green_02', '备选'],
];

write(
  'captain',
  ['id', 'name', 'faction', 'quality', 'passiveSkillId', 'enhanceSkillId', 'enhanceBonusLevel', 'role', 'description'],
  captains.map(([id, name, faction, quality, passiveSkillId, role]) => ({
    id, name, faction, quality, passiveSkillId,
    enhanceSkillId: `skill_${faction}_rage`,
    enhanceBonusLevel: 1,
    role,
    description: `${FACTION_NAME[faction]} ${quality} 舰长（${role}）`,
  }))
);

// ---------- combo ----------
write(
  'combo',
  ['id', 'skillId', 'shipA', 'shipB', 'priority', 'oncePerBattle', 'description'],
  [
    { id: 'combo_anchor', skillId: 'skill_combo_anchor', shipA: 'ship_anchor_03', shipB: 'ship_anchor_04', priority: 1, oncePerBattle: 1, description: '重锤 + 铁壁：铜墙铁壁' },
    { id: 'combo_blue', skillId: 'skill_combo_blue', shipA: 'ship_blue_03', shipB: 'ship_blue_04', priority: 2, oncePerBattle: 1, description: '海鸥 + 苍穹：饱和空袭' },
    { id: 'combo_red', skillId: 'skill_combo_red', shipA: 'ship_red_03', shipB: 'ship_red_04', priority: 1, oncePerBattle: 1, description: '匕首 + 血鲨：双雷齐射' },
    { id: 'combo_green', skillId: 'skill_combo_green', shipA: 'ship_green_02', shipB: 'ship_green_03', priority: 3, oncePerBattle: 1, description: '微风 + 晨星：生命之潮' },
  ]
);

// ---------- equip ----------
const equipSlots = [
  ['main_gun', '主炮', { atk: 20 }],
  ['secondary_gun', '副炮', { atk: 12, critRate: 1 }],
  ['aa_gun', '防空', { def: 15, hp: 100 }],
  ['torpedo', '鱼雷', { atk: 18, critDmg: 5 }],
  ['device', '设备', { hp: 200, def: 10 }],
  ['aircraft', '舰载机', { atk: 15, spd: 2 }],
];
const equipMult = { B: 1.0, A: 1.6, S: 2.4, SS: 3.5 };
const equipRows = [];
for (const [slotId, slotName, base] of equipSlots) {
  for (const q of QUALITY) {
    const m = equipMult[q];
    equipRows.push({
      id: `equip_${slotId}_${q.toLowerCase()}`,
      name: `${slotName}·${q}`,
      slot: slotName,
      slotId,
      quality: q,
      hp: Math.round((base.hp || 0) * m),
      atk: Math.round((base.atk || 0) * m),
      def: Math.round((base.def || 0) * m),
      spd: Math.round((base.spd || 0) * m),
      critRate: Math.round((base.critRate || 0) * m * 10) / 10,
      critDmg: Math.round((base.critDmg || 0) * m * 10) / 10,
      enhanceGrowth: 0.08,
      icon: `icon_equip_${slotId}_${q.toLowerCase()}`,
    });
  }
}
write(
  'equip',
  ['id', 'name', 'slot', 'slotId', 'quality', 'hp', 'atk', 'def', 'spd', 'critRate', 'critDmg', 'enhanceGrowth', 'icon'],
  equipRows
);

// ---------- buff ----------
write(
  'buff',
  ['id', 'name', 'type', 'stat', 'value', 'durationRounds', 'stackRule', 'dispellable', 'isShield', 'description'],
  [
    { id: 'buff_taunt', name: '嘲讽', type: 'debuff', stat: 'targeting', value: 1, durationRounds: 2, stackRule: 'refresh', dispellable: 0, isShield: 0, description: '敌方单体攻击 100% 选择该目标' },
    { id: 'buff_damage_reduction', name: '减伤', type: 'buff', stat: 'damageReduction', value: 1, durationRounds: 3, stackRule: 'refresh', dispellable: 1, isShield: 0, description: '按层数值减少受到伤害' },
    { id: 'buff_damage_up', name: '增伤', type: 'buff', stat: 'damageUp', value: 1, durationRounds: 3, stackRule: 'refresh', dispellable: 1, isShield: 0, description: '按层数值提高造成伤害' },
    { id: 'buff_crit_rate', name: '暴击率提升', type: 'buff', stat: 'critRate', value: 1, durationRounds: 3, stackRule: 'refresh', dispellable: 1, isShield: 0, description: '提高暴击率' },
    { id: 'buff_crit_dmg', name: '暴击伤害提升', type: 'buff', stat: 'critDmg', value: 1, durationRounds: 3, stackRule: 'refresh', dispellable: 1, isShield: 0, description: '提高暴击伤害' },
    { id: 'buff_atk_up', name: '攻击提升', type: 'buff', stat: 'atkUp', value: 1, durationRounds: 3, stackRule: 'refresh', dispellable: 1, isShield: 0, description: '提高攻击百分比' },
    { id: 'buff_def_up', name: '防御提升', type: 'buff', stat: 'defUp', value: 1, durationRounds: 3, stackRule: 'refresh', dispellable: 1, isShield: 0, description: '提高防御百分比' },
    { id: 'buff_spd_up', name: '速度提升', type: 'buff', stat: 'spdUp', value: 1, durationRounds: 2, stackRule: 'refresh', dispellable: 1, isShield: 0, description: '提高速度百分比' },
    { id: 'buff_spd_down', name: '减速', type: 'debuff', stat: 'spdDown', value: 1, durationRounds: 2, stackRule: 'refresh', dispellable: 1, isShield: 0, description: '降低速度百分比' },
    { id: 'buff_shield', name: '护盾', type: 'buff', stat: 'shield', value: 1, durationRounds: 3, stackRule: 'refresh', dispellable: 0, isShield: 1, description: '优先吸收伤害' },
    { id: 'buff_dot', name: '持续伤害', type: 'debuff', stat: 'dot', value: 1, durationRounds: 2, stackRule: 'refresh', dispellable: 1, isShield: 0, description: '每回合损失耐久' },
    { id: 'buff_stun', name: '眩晕', type: 'debuff', stat: 'stun', value: 1, durationRounds: 1, stackRule: 'refresh', dispellable: 1, isShield: 0, description: '无法行动' },
    { id: 'buff_heal_up', name: '治疗提升', type: 'buff', stat: 'healUp', value: 1, durationRounds: 3, stackRule: 'refresh', dispellable: 1, isShield: 0, description: '提高治疗量' },
    { id: 'buff_immunity', name: '致命免疫', type: 'buff', stat: 'immunity', value: 1, durationRounds: 1, stackRule: 'refresh', dispellable: 0, isShield: 0, description: '免疫一次致命伤害' },
    { id: 'buff_reflect', name: '反伤', type: 'buff', stat: 'reflect', value: 1, durationRounds: 1, stackRule: 'refresh', dispellable: 0, isShield: 0, description: '反弹受到伤害的一定比例' },
    { id: 'buff_rage_gain', name: '怒气获取', type: 'buff', stat: 'rageGain', value: 1, durationRounds: 1, stackRule: 'refresh', dispellable: 0, isShield: 0, description: '立即获得怒气' },
    { id: 'buff_cleanse', name: '净化', type: 'buff', stat: 'cleanse', value: 1, durationRounds: 0, stackRule: 'refresh', dispellable: 0, isShield: 0, description: '立即净化指定数量的负面状态（瞬时效果）' },
  ]
);

// ---------- 战力公式（仅用于推荐战力与敌人标定） ----------
function powerOf(s) {
  return Math.round(
    (s.hp / 10 + s.atk + s.def * 1.2) *
      (1 + s.spd / 200) *
      (1 + (s.critRate / 100) * (s.critDmg / 100))
  );
}

// ---------- enemy ----------
const enemyArchetypes = [
  { key: 'heavy', name: '重装舰', hp: 2600, atk: 90, def: 120, spd: 90, skillId: 'skill_enemy_heavy', role: '前排坦克' },
  { key: 'swarm', name: '集群舰', hp: 900, atk: 70, def: 40, spd: 115, skillId: 'skill_enemy_swarm', role: '数量压制' },
  { key: 'gunboat', name: '炮艇', hp: 1400, atk: 130, def: 60, spd: 105, skillId: 'skill_enemy_gunboat', role: '单体输出' },
  { key: 'jammer', name: '干扰舰', hp: 1200, atk: 80, def: 50, spd: 110, skillId: 'skill_enemy_jammer', role: '减益' },
  { key: 'carrier', name: '航母', hp: 1600, atk: 110, def: 55, spd: 100, skillId: 'skill_enemy_carrier', role: '群攻' },
];

const enemyRows = [];
for (const a of enemyArchetypes) {
  for (const variant of [1, 2]) {
    const m = 1 + 0.15 * (variant - 1);
    enemyRows.push({
      id: `enemy_${a.key}_${variant}`,
      name: `${a.name}·${variant === 1 ? 'I' : 'II'}`,
      archetype: a.key,
      faction: 'enemy',
      hp: Math.round(a.hp * m),
      atk: Math.round(a.atk * m),
      def: Math.round(a.def * m),
      spd: a.spd,
      critRate: 5,
      critDmg: 150,
      skillId: a.skillId,
      lootTableId: 'loot_enemy',
      isBoss: 0,
      role: a.role,
      description: `敌方 ${a.name} ${variant === 1 ? 'I' : 'II'} 型`,
    });
  }
}

const bossDefs = [
  ['enemy_boss_ch1', '深渊巡洋舰', 'skill_enemy_boss'],
  ['enemy_boss_ch2', '深渊战列舰', 'skill_enemy_boss'],
  ['enemy_boss_ch3', '深渊航母', 'skill_enemy_boss'],
  ['enemy_boss_ch4', '深渊要塞', 'skill_enemy_boss'],
  ['enemy_boss_ch5', '深渊旗舰', 'skill_enemy_boss'],
];
for (const [id, name, skillId] of bossDefs) {
  const base = enemyArchetypes[0];
  enemyRows.push({
    id,
    name,
    archetype: 'boss',
    faction: 'enemy',
    hp: Math.round(base.hp * 2.4),
    atk: Math.round(base.atk * 2.4),
    def: Math.round(base.def * 2.4),
    spd: base.spd,
    critRate: 8,
    critDmg: 160,
    skillId,
    lootTableId: 'loot_boss',
    isBoss: 1,
    role: '章节 BOSS',
    description: `第 ${id.slice(-1)} 章 BOSS`,
  });
}

write(
  'enemy',
  ['id', 'name', 'archetype', 'faction', 'hp', 'atk', 'def', 'spd', 'critRate', 'critDmg', 'skillId', 'lootTableId', 'isBoss', 'role', 'power', 'description'],
  enemyRows.map((e) => ({ ...e, power: powerOf(e) }))
);

const enemyById = Object.fromEntries(enemyRows.map((e) => [e.id, e]));

// ---------- loot ----------
const lootRows = [];
function loot(tableId, chapter, entries) {
  const mult = Math.pow(1.4, chapter - 1);
  for (const [itemType, itemId, probability, minQty, maxQty] of entries) {
    lootRows.push({
      lootTableId: tableId,
      chapter,
      itemType,
      itemId,
      probability,
      minQty: Math.max(1, Math.round(minQty * mult)),
      maxQty: Math.max(1, Math.round(maxQty * mult)),
      description: `${tableId} · ${itemId}`,
    });
  }
}

for (let ch = 1; ch <= 5; ch++) {
  loot(`loot_ch${ch}_normal`, ch, [
    ['gold', 'gold', 60, 100, 150],
    ['expBook', 'expBook', 25, 1, 2],
    ['material', 'material', 10, 1, 3],
    ['shard', 'shard', 5, 1, 2],
  ]);
  loot(`loot_ch${ch}_elite`, ch, [
    ['gold', 'gold', 50, 200, 300],
    ['expBook', 'expBook', 20, 2, 3],
    ['material', 'material', 15, 3, 6],
    ['shard', 'shard', 8, 3, 5],
    ['blueprint', 'blueprint', 5, 1, 1],
    ['equipBox', 'equipBox', 2, 1, 1],
  ]);
  loot(`loot_ch${ch}_boss`, ch, [
    ['gold', 'gold', 40, 500, 800],
    ['expBook', 'expBook', 15, 5, 8],
    ['material', 'material', 15, 10, 15],
    ['shard', 'shard', 12, 10, 15],
    ['blueprint', 'blueprint', 10, 2, 3],
    ['equipBox', 'equipBox', 5, 1, 1],
    ['captainTicket', 'captainTicket', 3, 1, 1],
  ]);
}

loot('loot_treasure', 1, [
  ['gold', 'gold', 40, 300, 500],
  ['material', 'material', 20, 5, 10],
  ['shard', 'shard', 15, 5, 10],
  ['blueprint', 'blueprint', 15, 1, 2],
  ['equipBox', 'equipBox', 10, 1, 1],
]);
loot('loot_event', 1, [
  ['gold', 'gold', 50, 150, 250],
  ['expBook', 'expBook', 20, 2, 3],
  ['material', 'material', 20, 2, 5],
  ['shard', 'shard', 10, 2, 4],
]);
loot('loot_enemy', 1, [
  ['gold', 'gold', 70, 30, 60],
  ['material', 'material', 30, 1, 2],
]);
loot('loot_boss', 5, [
  ['gold', 'gold', 40, 800, 1200],
  ['shard', 'shard', 30, 20, 30],
  ['equipBox', 'equipBox', 30, 1, 2],
]);

write(
  'loot',
  ['lootTableId', 'chapter', 'itemType', 'itemId', 'probability', 'minQty', 'maxQty', 'description'],
  lootRows
);

// ---------- stage ----------
const NODE_TYPES = {
  1: 'normal', 2: 'normal', 3: 'normal', 4: 'normal', 5: 'elite',
  6: 'normal', 7: 'normal', 8: 'normal', 9: 'elite', 10: 'normal',
  11: 'treasure', 12: 'boss',
};
const NODE_11_TYPE = { 1: 'treasure', 2: 'port', 3: 'event', 4: 'port', 5: 'treasure' };
const NODE_TYPE_CN = { normal: '普通战斗', elite: '精英', boss: 'BOSS', event: '事件', treasure: '宝箱', port: '港口' };

function lineupFor(ch, nodeType) {
  const variant = ch <= 2 ? 1 : 2;
  if (nodeType === 'boss') {
    return [
      `enemy_boss_ch${ch}`,
      `enemy_heavy_${variant}`,
      `enemy_gunboat_${variant}`,
      `enemy_jammer_${variant}`,
      `enemy_carrier_${variant}`,
    ];
  }
  if (nodeType === 'elite') {
    return [`enemy_heavy_${variant}`, `enemy_gunboat_${variant}`, `enemy_jammer_${variant}`, `enemy_carrier_${variant}`];
  }
  return [`enemy_heavy_${variant}`, `enemy_gunboat_${variant}`, `enemy_swarm_${variant}`];
}

const POWER_RATIO = { normal: 0.7, elite: 0.9, boss: 1.2 };
const stageRows = [];
for (let ch = 1; ch <= 5; ch++) {
  const chapterMult = Math.pow(1.4, ch - 1);
  const idle = {
    gold: Math.round(600 * chapterMult),
    exp: Math.round(10 * chapterMult * 100) / 100,
    material: Math.round(4 * chapterMult * 100) / 100,
    shard: Math.round(5 * chapterMult * 100) / 100,
    skill: Math.round(1 * chapterMult * 100) / 100,
  };
  for (let node = 1; node <= 12; node++) {
    const id = `stage_${ch}_${node}`;
    let nodeType = NODE_TYPES[node];
    if (node === 11) nodeType = NODE_11_TYPE[ch];
    const recommended = Math.round(3000 * chapterMult * (1 + 0.02 * (node - 1)));
    const battle = nodeType === 'normal' || nodeType === 'elite' || nodeType === 'boss';
    const lineup = battle ? lineupFor(ch, nodeType) : [];
    const basePower = lineup.reduce((sum, eid) => sum + powerOf(enemyById[eid]), 0);
    const enemyScale = battle ? Math.round(((recommended * POWER_RATIO[nodeType]) / basePower) * 1000) / 1000 : 0;

    let firstClear = '';
    if (nodeType === 'normal') firstClear = 'diamond:40|gold:200';
    else if (nodeType === 'elite') firstClear = 'diamond:80|blueprint:1';
    else if (nodeType === 'boss') firstClear = 'diamond:400|blueprint:3|equipBox:1';
    else if (nodeType === 'treasure') firstClear = 'diamond:120|material:20';
    else if (nodeType === 'port') firstClear = 'diamond:60';
    else if (nodeType === 'event') firstClear = 'diamond:60|expBook:2';

    let unlock = node === 1 ? (ch === 1 ? 'start' : `stage_${ch - 1}_12`) : `stage_${ch}_${node - 1}`;

    stageRows.push({
      id,
      chapter: ch,
      nodeIndex: node,
      nodeType,
      name: `第 ${ch}-${node} 关${nodeType === 'boss' ? ' · BOSS' : ''}`,
      enemyLineup: lineup.join('|'),
      enemyScale,
      recommendedPower: recommended,
      targetRounds: battle ? (nodeType === 'boss' ? 20 : 15) : 0,
      firstClearReward: firstClear,
      lootTableId: battle ? `loot_ch${ch}_${nodeType === 'normal' ? 'normal' : nodeType === 'elite' ? 'elite' : 'boss'}` : nodeType === 'treasure' ? 'loot_treasure' : 'loot_event',
      idleGoldPerHour: idle.gold,
      idleExpPerHour: idle.exp,
      idleMaterialPerHour: idle.material,
      idleShardPerHour: idle.shard,
      idleSkillPerHour: idle.skill,
      unlockCondition: unlock,
      description: `${NODE_TYPE_CN[nodeType]} · 第 ${ch} 章`,
    });
  }
}

write(
  'stage',
  ['id', 'chapter', 'nodeIndex', 'nodeType', 'name', 'enemyLineup', 'enemyScale', 'recommendedPower', 'targetRounds', 'firstClearReward', 'lootTableId', 'idleGoldPerHour', 'idleExpPerHour', 'idleMaterialPerHour', 'idleShardPerHour', 'idleSkillPerHour', 'unlockCondition', 'description'],
  stageRows
);

// ---------- port / good / route ----------
const ports = [
  { id: 'port_dawn', name: '晨曦港', faction: 'neutral', unlockType: 'start', unlockValue: '0', specialty: 'good_grain|good_wood', scarce: 'good_iron|good_silk', priceFactor: 1.0, description: '起始港，粮食与木材便宜' },
  { id: 'port_anchor', name: '铁锚港', faction: 'anchor', unlockType: 'start', unlockValue: '0', specialty: 'good_iron|good_wood', scarce: 'good_spice|good_powder', priceFactor: 1.0, description: '铁锚联邦军港，铁矿充足；与晨曦港同为起始港' },
  { id: 'port_blue', name: '蓝潮港', faction: 'blue', unlockType: 'tradeLevel', unlockValue: '3', specialty: 'good_silk|good_spice', scarce: 'good_grain|good_arms', priceFactor: 1.05, description: '蓝潮同盟贸易枢纽，丝绸与香料集散地' },
  { id: 'port_red', name: '赤潮港', faction: 'red', unlockType: 'stage', unlockValue: 'stage_2_12', specialty: 'good_powder|good_arms', scarce: 'good_grain|good_wood', priceFactor: 1.1, description: '赤潮帝国军港，火药与军械便宜；通关第 2 章解锁' },
  { id: 'port_green', name: '翡翠港', faction: 'green', unlockType: 'tradeLevel', unlockValue: '5', specialty: 'good_grain|good_silk', scarce: 'good_iron|good_powder', priceFactor: 1.0, description: '翡翠共和国粮仓' },
  { id: 'port_mist', name: '雾隐港', faction: 'neutral', unlockType: 'tradeLevel', unlockValue: '7', specialty: 'good_spice|good_powder', scarce: 'good_silk|good_arms', priceFactor: 1.15, description: '中立走私港，价格波动大' },
  { id: 'port_starfall', name: '星陨港', faction: 'neutral', unlockType: 'stage', unlockValue: 'stage_5_12', specialty: 'good_arms|good_iron', scarce: 'good_spice|good_grain', priceFactor: 1.2, description: '远洋军械港' },
  { id: 'port_abyss', name: '深渊港', faction: 'neutral', unlockType: 'tradeLevel', unlockValue: '10', specialty: 'good_arms|good_spice', scarce: 'good_silk|good_wood', priceFactor: 1.25, description: '终局港口，高利润高风险' },
];
write(
  'port',
  ['id', 'name', 'faction', 'unlockType', 'unlockValue', 'specialtyGoods', 'scarceGoods', 'priceFactor', 'description'],
  ports.map((p) => ({
    id: p.id, name: p.name, faction: p.faction, unlockType: p.unlockType, unlockValue: p.unlockValue,
    specialtyGoods: p.specialty, scarceGoods: p.scarce, priceFactor: p.priceFactor, description: p.description,
  }))
);

const goods = [
  ['good_grain', '粮食', 20, 1, 0.10, 500, '低价值高容量，适合新手航线'],
  ['good_wood', '木材', 35, 2, 0.12, 400, '建筑材料'],
  ['good_iron', '铁矿', 60, 3, 0.15, 300, '重货，单位载重占用高'],
  ['good_silk', '丝绸', 120, 1, 0.18, 200, '轻货，利润稳定'],
  ['good_spice', '香料', 180, 1, 0.20, 150, '高波动轻货'],
  ['good_powder', '火药', 240, 2, 0.22, 120, '危险品，波动大'],
  ['good_arms', '军械', 400, 3, 0.25, 80, '最高价值，容量最小'],
];
write(
  'good',
  ['id', 'name', 'basePrice', 'unitWeight', 'volatility', 'dailyCapacity', 'description'],
  goods.map(([id, name, basePrice, unitWeight, volatility, dailyCapacity, description]) => ({
    id, name, basePrice, unitWeight, volatility, dailyCapacity, description,
  }))
);

const routes = [
  ['route_newbie', 'port_dawn', 'port_anchor', 0.5, 0, 0, 10, 0, 1, '新手航线：往返 60 秒，风险 0'],
  ['route_dawn_anchor', 'port_dawn', 'port_anchor', 30, 5, 800, 50, 0, 0, '起始安全航线'],
  ['route_dawn_blue', 'port_dawn', 'port_blue', 45, 8, 1200, 80, 1, 0, '粮食换丝绸'],
  ['route_anchor_blue', 'port_anchor', 'port_blue', 60, 10, 1600, 120, 2, 0, '铁矿换香料'],
  ['route_anchor_red', 'port_anchor', 'port_red', 90, 15, 2400, 180, 3, 0, '军港航线，风险上升'],
  ['route_blue_green', 'port_blue', 'port_green', 120, 12, 2800, 220, 4, 0, '丝绸换粮食'],
  ['route_red_green', 'port_red', 'port_green', 150, 18, 3600, 260, 5, 0, '火药换粮食'],
  ['route_green_mist', 'port_green', 'port_mist', 180, 20, 4400, 300, 6, 0, '远洋走私线'],
  ['route_mist_starfall', 'port_mist', 'port_starfall', 210, 24, 5600, 360, 7, 0, '高风险高利润'],
  ['route_starfall_abyss', 'port_starfall', 'port_abyss', 240, 30, 7200, 420, 9, 0, '终局航线，往返 8 小时'],
];
write(
  'route',
  ['id', 'fromPort', 'toPort', 'oneWayMinutes', 'riskPct', 'piratePower', 'baseFreight', 'minTradeLevel', 'isNewbie', 'description'],
  routes.map(([id, fromPort, toPort, oneWayMinutes, riskPct, piratePower, baseFreight, minTradeLevel, isNewbie, description]) => ({
    id, fromPort, toPort, oneWayMinutes, riskPct, piratePower, baseFreight, minTradeLevel, isNewbie, description,
  }))
);

// ---------- gacha ----------
const gachaRows = [
  {
    poolId: 'gacha_ship_standard', name: '舰船常驻池', type: 'ship', costDiamond: 150, tenPullCost: 1500,
    ssRate: 2, sRate: 10, aRate: 38, bRate: 50,
    hardPitySS: 90, softPityStartSS: 75, hardPityS: 30, hardPityA: 10,
    upList: '', upChance: 0, guaranteeUp: 0, newbieCandidates: '', freeFirstTen: 0, maxPulls: 0, tenthGuarantee: '',
    description: '常驻舰船池，无 UP',
  },
  {
    poolId: 'gacha_ship_limited', name: '舰船限定池', type: 'ship', costDiamond: 150, tenPullCost: 1500,
    ssRate: 2, sRate: 10, aRate: 38, bRate: 50,
    hardPitySS: 90, softPityStartSS: 75, hardPityS: 30, hardPityA: 10,
    upList: 'ship_red_04', upChance: 50, guaranteeUp: 1, newbieCandidates: '', freeFirstTen: 0, maxPulls: 0, tenthGuarantee: '',
    description: '限定舰船池，UP 为血鲨，歪一次后下一个 SS 必为 UP',
  },
  {
    poolId: 'gacha_captain', name: '舰长池', type: 'captain', costDiamond: 150, tenPullCost: 1500,
    ssRate: 2, sRate: 10, aRate: 38, bRate: 50,
    hardPitySS: 60, softPityStartSS: 50, hardPityS: 30, hardPityA: 10,
    upList: '', upChance: 0, guaranteeUp: 0, newbieCandidates: '', freeFirstTen: 0, maxPulls: 0, tenthGuarantee: '',
    description: '舰长池，无 UP',
  },
  {
    poolId: 'gacha_equip', name: '装备箱池', type: 'equip', costDiamond: 150, tenPullCost: 1500,
    ssRate: 2, sRate: 10, aRate: 38, bRate: 50,
    hardPitySS: 50, softPityStartSS: 42, hardPityS: 30, hardPityA: 10,
    upList: '', upChance: 0, guaranteeUp: 0, newbieCandidates: '', freeFirstTen: 0, maxPulls: 0, tenthGuarantee: '',
    description: '装备箱池，无限定',
  },
  {
    poolId: 'gacha_newbie', name: '新手池', type: 'ship', costDiamond: 0, tenPullCost: 0,
    ssRate: 2, sRate: 10, aRate: 38, bRate: 50,
    hardPitySS: 0, softPityStartSS: 0, hardPityS: 10, hardPityA: 10,
    upList: '', upChance: 0, guaranteeUp: 0,
    newbieCandidates: 'ship_anchor_04|ship_blue_04|ship_green_03',
    freeFirstTen: 1, maxPulls: 10, tenthGuarantee: 'S',
    description: '一次性免费 10 连，第 10 抽必出 S 及以上，不占其他池计数',
  },
];
write(
  'gacha',
  ['poolId', 'name', 'type', 'costDiamond', 'tenPullCost', 'ssRate', 'sRate', 'aRate', 'bRate', 'hardPitySS', 'softPityStartSS', 'hardPityS', 'hardPityA', 'upList', 'upChance', 'guaranteeUp', 'newbieCandidates', 'freeFirstTen', 'maxPulls', 'tenthGuarantee', 'description'],
  gachaRows
);

// ---------- building ----------
const buildingDefs = [
  { id: 'building_base', name: '基地', effect: (lv) => ['buildingLevelCap', lv] },
  { id: 'building_shipyard', name: '船坞', effect: (lv) => ['shipSlots', 20 + 2 * (lv - 1)] },
  { id: 'building_research', name: '研究所', effect: (lv) => ['remodelTierMax', Math.min(4, Math.ceil(lv / 2))] },
  { id: 'building_warehouse', name: '仓库', effect: (lv) => ['storageCap', 10000 * lv] },
  { id: 'building_trade', name: '贸易所', effect: (lv) => ['freightReductionPct', Math.min(20, 2 * lv)] },
];
const buildingRows = [];
for (const b of buildingDefs) {
  for (let lv = 1; lv <= 10; lv++) {
    const [effectType, effectValue] = b.effect(lv);
    buildingRows.push({
      id: b.id,
      name: b.name,
      level: lv,
      costGold: lv === 1 ? 0 : Math.round(2000 * Math.pow(1.6, lv - 2)),
      costMaterial: lv === 1 ? 0 : Math.round(20 * Math.pow(1.6, lv - 2)),
      costTimeMinutes: lv === 1 ? 0 : Math.min(720, Math.round(5 * Math.pow(1.8, lv - 2))),
      effectType,
      effectValue,
      unlockBaseLevel: lv,
      description: `${b.name} ${lv} 级`,
    });
  }
}
write(
  'building',
  ['id', 'name', 'level', 'costGold', 'costMaterial', 'costTimeMinutes', 'effectType', 'effectValue', 'unlockBaseLevel', 'description'],
  buildingRows
);

// ---------- tech ----------
const techRows = [
  { id: 'tech_remodel_1', name: '改造工法 I', branch: 'remodel', tier: 1, prerequisite: '', effectType: 'unlockRemodelTier', effectValue: 1, costGold: 5000, costMaterial: 50, costBlueprint: 5, timeMinutes: 120, unlockRemodelTier: 1, description: '解锁 1 阶改造（等级上限 50）' },
  { id: 'tech_remodel_2', name: '改造工法 II', branch: 'remodel', tier: 2, prerequisite: 'tech_remodel_1', effectType: 'unlockRemodelTier', effectValue: 2, costGold: 20000, costMaterial: 120, costBlueprint: 10, timeMinutes: 360, unlockRemodelTier: 2, description: '解锁 2 阶改造（等级上限 70）' },
  { id: 'tech_remodel_3', name: '改造工法 III', branch: 'remodel', tier: 3, prerequisite: 'tech_remodel_2', effectType: 'unlockRemodelTier', effectValue: 3, costGold: 60000, costMaterial: 300, costBlueprint: 20, timeMinutes: 720, unlockRemodelTier: 3, description: '解锁 3 阶改造（等级上限 85）' },
  { id: 'tech_remodel_4', name: '改造工法 IV', branch: 'remodel', tier: 4, prerequisite: 'tech_remodel_3', effectType: 'unlockRemodelTier', effectValue: 4, costGold: 200000, costMaterial: 800, costBlueprint: 40, timeMinutes: 1440, unlockRemodelTier: 4, description: '解锁 4 阶改造（等级上限 100）' },
  { id: 'tech_hp_1', name: '船体强化 I', branch: 'defense', tier: 1, prerequisite: '', effectType: 'allAlliesHpPct', effectValue: 3, costGold: 3000, costMaterial: 30, costBlueprint: 3, timeMinutes: 60, unlockRemodelTier: 0, description: '全队耐久 +3%' },
  { id: 'tech_hp_2', name: '船体强化 II', branch: 'defense', tier: 2, prerequisite: 'tech_hp_1', effectType: 'allAlliesHpPct', effectValue: 6, costGold: 12000, costMaterial: 100, costBlueprint: 8, timeMinutes: 240, unlockRemodelTier: 0, description: '全队耐久 +6%' },
  { id: 'tech_atk_1', name: '火控校准 I', branch: 'offense', tier: 1, prerequisite: '', effectType: 'allAlliesAtkPct', effectValue: 3, costGold: 3000, costMaterial: 30, costBlueprint: 3, timeMinutes: 60, unlockRemodelTier: 0, description: '全队攻击 +3%' },
  { id: 'tech_atk_2', name: '火控校准 II', branch: 'offense', tier: 2, prerequisite: 'tech_atk_1', effectType: 'allAlliesAtkPct', effectValue: 6, costGold: 12000, costMaterial: 100, costBlueprint: 8, timeMinutes: 240, unlockRemodelTier: 0, description: '全队攻击 +6%' },
  { id: 'tech_def_1', name: '装甲改良 I', branch: 'defense', tier: 1, prerequisite: '', effectType: 'allAlliesDefPct', effectValue: 3, costGold: 3000, costMaterial: 30, costBlueprint: 3, timeMinutes: 60, unlockRemodelTier: 0, description: '全队防御 +3%' },
  { id: 'tech_def_2', name: '装甲改良 II', branch: 'defense', tier: 2, prerequisite: 'tech_def_1', effectType: 'allAlliesDefPct', effectValue: 6, costGold: 12000, costMaterial: 100, costBlueprint: 8, timeMinutes: 240, unlockRemodelTier: 0, description: '全队防御 +6%' },
  { id: 'tech_crit_1', name: '瞄准系统 I', branch: 'offense', tier: 1, prerequisite: '', effectType: 'allAlliesCritRate', effectValue: 2, costGold: 4000, costMaterial: 40, costBlueprint: 4, timeMinutes: 90, unlockRemodelTier: 0, description: '全队暴击率 +2%' },
  { id: 'tech_crit_2', name: '瞄准系统 II', branch: 'offense', tier: 2, prerequisite: 'tech_crit_1', effectType: 'allAlliesCritRate', effectValue: 4, costGold: 16000, costMaterial: 120, costBlueprint: 10, timeMinutes: 300, unlockRemodelTier: 0, description: '全队暴击率 +4%' },
];
write(
  'tech',
  ['id', 'name', 'branch', 'tier', 'prerequisite', 'effectType', 'effectValue', 'costGold', 'costMaterial', 'costBlueprint', 'timeMinutes', 'unlockRemodelTier', 'description'],
  techRows
);

// ---------- event ----------
const eventRows = [
  { id: 'event_storm', name: '风暴', type: 'storm', triggerRate: 15, weight: 40, effectType: 'fleetHpLossPct', effectValue: 20, durationRounds: 0, description: '下一场战斗全队耐久 −20%' },
  { id: 'event_pirate', name: '海盗', type: 'pirate', triggerRate: 15, weight: 40, effectType: 'extraBattle', effectValue: 1, durationRounds: 0, description: '追加一场海盗战斗，胜利后按 loot_event 掉落' },
  { id: 'event_treasure', name: '宝藏', type: 'treasure', triggerRate: 15, weight: 20, effectType: 'grantLoot', effectValue: 1, durationRounds: 0, description: '直接获得 loot_treasure 掉落' },
];
write(
  'event',
  ['id', 'name', 'type', 'triggerRate', 'weight', 'effectType', 'effectValue', 'durationRounds', 'description'],
  eventRows
);

// ---------- task ----------
const taskRows = [
  { id: 'task_daily_login', type: 'daily', name: '每日登录', conditionType: 'login', conditionValue: 1, rewardDiamond: 40, rewardGold: 200, rewardItem: '', refresh: 'daily', description: '登录游戏' },
  { id: 'task_daily_battle', type: 'daily', name: '每日出击', conditionType: 'battleWin', conditionValue: 3, rewardDiamond: 40, rewardGold: 300, rewardItem: '', refresh: 'daily', description: '胜利 3 场战斗' },
  { id: 'task_daily_trade', type: 'daily', name: '每日出航', conditionType: 'tradeDispatch', conditionValue: 1, rewardDiamond: 40, rewardGold: 200, rewardItem: '', refresh: 'daily', description: '派出 1 次贸易船' },
  { id: 'task_daily_idle', type: 'daily', name: '每日收获', conditionType: 'idleClaim', conditionValue: 1, rewardDiamond: 40, rewardGold: 200, rewardItem: '', refresh: 'daily', description: '领取 1 次挂机收益' },
  { id: 'task_daily_gacha', type: 'daily', name: '每日招募', conditionType: 'gachaPull', conditionValue: 1, rewardDiamond: 40, rewardGold: 0, rewardItem: '', refresh: 'daily', description: '抽卡 1 次' },
  { id: 'task_weekly_battle', type: 'weekly', name: '每周出击', conditionType: 'battleWin', conditionValue: 15, rewardDiamond: 200, rewardGold: 1000, rewardItem: '', refresh: 'weekly', description: '本周胜利 15 场' },
  { id: 'task_weekly_trade', type: 'weekly', name: '每周贸易', conditionType: 'tradeProfit', conditionValue: 5000, rewardDiamond: 200, rewardGold: 0, rewardItem: '', refresh: 'weekly', description: '本周贸易累计利润 5000' },
  { id: 'task_weekly_stage', type: 'weekly', name: '每周推图', conditionType: 'stageClear', conditionValue: 5, rewardDiamond: 200, rewardGold: 0, rewardItem: '', refresh: 'weekly', description: '本周通关 5 个新节点' },
  { id: 'task_trade_milestone_1', type: 'milestone', name: '贸易里程碑·初航', conditionType: 'tradeLevel', conditionValue: 2, rewardDiamond: 200, rewardGold: 0, rewardItem: '', refresh: 'milestone', description: '贸易等级达到 2' },
  { id: 'task_trade_milestone_2', type: 'milestone', name: '贸易里程碑·常客', conditionType: 'tradeLevel', conditionValue: 4, rewardDiamond: 200, rewardGold: 0, rewardItem: '', refresh: 'milestone', description: '贸易等级达到 4' },
  { id: 'task_trade_milestone_3', type: 'milestone', name: '贸易里程碑·商队', conditionType: 'tradeLevel', conditionValue: 6, rewardDiamond: 200, rewardGold: 0, rewardItem: '', refresh: 'milestone', description: '贸易等级达到 6' },
  { id: 'task_trade_milestone_4', type: 'milestone', name: '贸易里程碑·远洋', conditionType: 'tradeLevel', conditionValue: 8, rewardDiamond: 200, rewardGold: 0, rewardItem: '', refresh: 'milestone', description: '贸易等级达到 8' },
  { id: 'task_ach_first_boss', type: 'achievement', name: '首个 BOSS', conditionType: 'bossKill', conditionValue: 1, rewardDiamond: 100, rewardGold: 0, rewardItem: 'blueprint:3', refresh: 'none', description: '击败任意章节 BOSS' },
  { id: 'task_ach_ch2', type: 'achievement', name: '通关第 2 章', conditionType: 'chapterClear', conditionValue: 2, rewardDiamond: 200, rewardGold: 0, rewardItem: '', refresh: 'none', description: '通关第 2 章' },
  { id: 'task_ach_ch3', type: 'achievement', name: '通关第 3 章', conditionType: 'chapterClear', conditionValue: 3, rewardDiamond: 300, rewardGold: 0, rewardItem: '', refresh: 'none', description: '通关第 3 章' },
  { id: 'task_ach_ch4', type: 'achievement', name: '通关第 4 章', conditionType: 'chapterClear', conditionValue: 4, rewardDiamond: 300, rewardGold: 0, rewardItem: '', refresh: 'none', description: '通关第 4 章' },
  { id: 'task_ach_ch5', type: 'achievement', name: '通关第 5 章', conditionType: 'chapterClear', conditionValue: 5, rewardDiamond: 300, rewardGold: 0, rewardItem: '', refresh: 'none', description: '通关第 5 章' },
  { id: 'task_ach_trade5', type: 'achievement', name: '贸易等级 5', conditionType: 'tradeLevel', conditionValue: 5, rewardDiamond: 200, rewardGold: 0, rewardItem: '', refresh: 'none', description: '贸易等级达到 5' },
  { id: 'task_ach_collect10', type: 'achievement', name: '舰队扩充', conditionType: 'shipCount', conditionValue: 10, rewardDiamond: 100, rewardGold: 0, rewardItem: '', refresh: 'none', description: '拥有 10 艘战舰' },
  { id: 'task_ach_pull50', type: 'achievement', name: '招募 50 次', conditionType: 'gachaTotal', conditionValue: 50, rewardDiamond: 150, rewardGold: 0, rewardItem: '', refresh: 'none', description: '累计抽卡 50 次' },
  { id: 'task_ach_pull100', type: 'achievement', name: '招募 100 次', conditionType: 'gachaTotal', conditionValue: 100, rewardDiamond: 200, rewardGold: 0, rewardItem: '', refresh: 'none', description: '累计抽卡 100 次' },
  { id: 'task_ach_ss3', type: 'achievement', name: '三艘 SS', conditionType: 'ssCount', conditionValue: 3, rewardDiamond: 250, rewardGold: 0, rewardItem: '', refresh: 'none', description: '拥有 3 艘 SS 战舰' },
];
write(
  'task',
  ['id', 'type', 'name', 'conditionType', 'conditionValue', 'rewardDiamond', 'rewardGold', 'rewardItem', 'refresh', 'description'],
  taskRows
);

// ---------- audio ----------
const audioRows = [
  { id: 'bgm_main', type: 'BGM', file: 'audio/bgm/main.ogg', volume: 0.7, loop: 1, description: '主港' },
  { id: 'bgm_battle', type: 'BGM', file: 'audio/bgm/battle.ogg', volume: 0.6, loop: 1, description: '普通战斗' },
  { id: 'bgm_boss', type: 'BGM', file: 'audio/bgm/boss.ogg', volume: 0.6, loop: 1, description: 'BOSS 战' },
  { id: 'bgm_trade', type: 'BGM', file: 'audio/bgm/trade.ogg', volume: 0.5, loop: 1, description: '贸易' },
];
const sfx = [
  ['click', '按钮点击'], ['back', '返回'], ['confirm', '确认'], ['cancel', '取消'],
  ['coin', '金币入账'], ['reward', '领取奖励'], ['levelup', '升级'], ['starup', '升星'],
  ['remodel', '改造完成'], ['gacha_pull', '抽卡'], ['gacha_ss', 'SS 出货'], ['gacha_s', 'S 出货'],
  ['cannon', '主炮'], ['torpedo', '鱼雷'], ['aircraft', '舰载机'], ['hit', '命中'],
  ['crit', '暴击'], ['sink', '击沉'], ['heal', '治疗'], ['shield', '护盾'],
  ['rage', '怒气满'], ['combo', '合击'], ['victory', '胜利'], ['defeat', '失败'],
];
for (const [key, desc] of sfx) {
  audioRows.push({ id: `sfx_${key}`, type: 'SFX', file: `audio/sfx/${key}.ogg`, volume: 0.8, loop: 0, description: desc });
}
write(
  'audio',
  ['id', 'type', 'file', 'volume', 'loop', 'description'],
  audioRows
);

// ---------- localization ----------
const loc = [
  ['app.name', '群星海战'],
  ['common.confirm', '确认'], ['common.cancel', '取消'], ['common.close', '关闭'],
  ['common.back', '返回'], ['common.ok', '好的'], ['common.skip', '跳过'],
  ['common.loading', '加载中…'], ['common.empty', '暂无内容'], ['common.locked', '未解锁'],
  ['common.level', '等级'], ['common.star', '星级'], ['common.power', '战力'],
  ['common.quality', '品质'], ['common.count', '数量'], ['common.reward', '奖励'],
  ['resource.gold', '金币'], ['resource.diamond', '钻石'], ['resource.material', '材料'],
  ['resource.blueprint', '图纸'], ['resource.expBook', '经验书'], ['resource.skillBook', '技能书'],
  ['resource.shard', '通用碎片'], ['resource.equipBox', '装备箱'], ['resource.captainTicket', '舰长招募券'],
  ['quality.B', 'B'], ['quality.A', 'A'], ['quality.S', 'S'], ['quality.SS', 'SS'],
  ['faction.anchor', '铁锚联邦'], ['faction.blue', '蓝潮同盟'], ['faction.red', '赤潮帝国'], ['faction.green', '翡翠共和国'],
  ['screen.mainPort', '主港'], ['screen.offlineReward', '离线收益'], ['screen.stageMap', '推图地图'],
  ['screen.formation', '编队'], ['screen.battle', '战斗'], ['screen.result', '结算'],
  ['screen.trade', '贸易'], ['screen.settings', '设置'], ['screen.shipGrowth', '舰船养成'],
  ['screen.equipment', '装备管理'], ['screen.gacha', '抽卡'], ['screen.base', '基地'],
  ['screen.captain', '舰长管理'], ['screen.tasks', '每日任务与成就'],
  ['main.trade', '贸易'], ['main.stage', '推图'], ['main.formation', '编队'],
  ['main.gacha', '抽卡'], ['main.base', '基地'], ['main.ships', '舰船'],
  ['main.captains', '舰长'], ['main.tasks', '任务'], ['main.settings', '设置'],
  ['offline.title', '离线收益'], ['offline.duration', '离线时长'], ['offline.claim', '领取'],
  ['stage.chapter', '第 {0} 章'], ['stage.node', '第 {0}-{1} 关'],
  ['stage.star1', '战斗胜利'], ['stage.star2', '无舰沉没'], ['stage.star3', '目标回合内通关'],
  ['battle.auto', '自动'], ['battle.speed', '速度'], ['battle.rage', '怒气'],
  ['formation.front', '前排'], ['formation.back', '后排'], ['formation.flagship', '旗舰'],
  ['formation.escort', '护航'], ['formation.bonus', '同系加成'],
  ['trade.port', '港口'], ['trade.route', '航线'], ['trade.fleet', '船队'],
  ['trade.dispatch', '派出'], ['trade.collect', '收船'], ['trade.profit', '利润'],
  ['trade.risk', '风险'], ['trade.freight', '运费'], ['trade.capacity', '载重'],
  ['gacha.pull1', '单抽'], ['gacha.pull10', '十连'], ['gacha.pity', '保底进度'],
  ['gacha.newbie', '新手池'], ['gacha.coupon', '新手选择券'],
  ['gacha.couponTip', '选择一艘 SS 战舰'],
  ['growth.levelUp', '升级'], ['growth.starUp', '升星'], ['growth.remodel', '改造'],
  ['growth.skill', '技能'], ['equip.equip', '穿戴'], ['equip.enhance', '强化'],
  ['captain.assign', '任命'], ['captain.remove', '卸下'],
  ['base.upgrade', '升级'], ['base.queue', '升级队列'], ['base.buyTradeShip', '购买贸易船'],
  ['task.claim', '领取'], ['task.claimed', '已领取'], ['task.daily', '每日'],
  ['task.weekly', '每周'], ['task.achievement', '成就'],
  ['settings.speed', '战斗速度'], ['settings.volume', '音量'],
  ['settings.export', '导出存档'], ['settings.import', '导入存档'],
  ['msg.goldNotEnough', '金币不足'], ['msg.diamondNotEnough', '钻石不足'],
  ['msg.fleetEmpty', '至少需要 1 艘主战舰'], ['msg.slotOccupied', '该航线已有船队'],
  ['msg.saveExported', '存档已导出'], ['msg.saveImported', '存档已导入'],
];
write('localization', ['key', 'zh', 'description'], loc.map(([key, zh]) => ({ key, zh, description: '' })));

// ---------- economy ----------
const economyRows = [
  ['start_gold', '起始资源', 2000, 'gold', '起始金币'],
  ['start_diamond', '起始资源', 1500, 'diamond', '起始钻石（10 抽）'],
  ['start_expBook', '起始资源', 10, 'expBook', '起始经验书'],
  ['start_tradeShip', '起始资源', 1, 'count', '起始小型贸易船'],
  ['start_port', '起始资源', 2, 'count', '起始解锁港口数'],
  ['idle_base_gold', '挂机', 600, 'gold/hour', '第 1 章每小时金币'],
  ['idle_base_exp', '挂机', 10, 'expBook/hour', '第 1 章每小时经验书'],
  ['idle_base_material', '挂机', 4, 'material/hour', '第 1 章每小时材料'],
  ['idle_base_shard', '挂机', 5, 'shard/hour', '第 1 章每小时碎片'],
  ['idle_base_skill', '挂机', 1, 'skillBook/hour', '第 1 章每小时技能书'],
  ['idle_chapter_mult', '挂机', 1.4, 'x/chapter', '每章产出倍率'],
  ['idle_offline_cap_hours', '挂机', 8, 'hour', '离线结算上限'],
  ['idle_power_coef_min', '挂机', 0.5, 'ratio', '战力系数下限'],
  ['idle_power_coef_max', '挂机', 1.0, 'ratio', '战力系数上限'],
  ['level_growth', '养成', 0.08, 'ratio/level', '每级属性成长'],
  ['level_exp_base', '养成', 100, 'exp', '升级经验基数'],
  ['level_exp_pow', '养成', 1.5, 'pow', '升级经验指数'],
  ['level_cap_0', '养成', 30, 'level', '改造 0 阶等级上限'],
  ['level_cap_1', '养成', 50, 'level', '改造 1 阶等级上限'],
  ['level_cap_2', '养成', 70, 'level', '改造 2 阶等级上限'],
  ['level_cap_3', '养成', 85, 'level', '改造 3 阶等级上限'],
  ['level_cap_4', '养成', 100, 'level', '改造 4 阶等级上限'],
  ['star_mult', '养成', 0.10, 'ratio/star', '每星属性乘区'],
  ['remodel_mult', '养成', 0.05, 'ratio/tier', '每阶改造属性乘区'],
  ['remodel_max', '养成', 4, 'tier', '改造最高阶'],
  ['star_cost_1', '养成', 20, 'shard', '1→2 星碎片'],
  ['star_cost_2', '养成', 40, 'shard', '2→3 星碎片'],
  ['star_cost_3', '养成', 80, 'shard', '3→4 星碎片'],
  ['star_cost_4', '养成', 160, 'shard', '4→5 星碎片'],
  ['star_cost_5', '养成', 320, 'shard', '5→6 星碎片'],
  ['star_quality_B', '养成', 0.5, 'mult', 'B 品质升星系数'],
  ['star_quality_A', '养成', 1.0, 'mult', 'A 品质升星系数'],
  ['star_quality_S', '养成', 1.5, 'mult', 'S 品质升星系数'],
  ['star_quality_SS', '养成', 2.0, 'mult', 'SS 品质升星系数'],
  ['enhance_gold_base', '养成', 200, 'gold', '强化金币基数'],
  ['enhance_gold_mult', '养成', 1.35, 'mult', '强化金币增长'],
  ['enhance_material_per_level', '养成', 2, 'material', '每级强化材料'],
  ['enhance_max', '养成', 15, 'level', '强化上限'],
  ['remodel_1_gold', '养成', 20000, 'gold', '改造 1 阶金币'],
  ['remodel_1_material', '养成', 50, 'material', '改造 1 阶材料'],
  ['remodel_1_blueprint', '养成', 5, 'blueprint', '改造 1 阶图纸'],
  ['remodel_2_gold', '养成', 60000, 'gold', '改造 2 阶金币'],
  ['remodel_2_material', '养成', 120, 'material', '改造 2 阶材料'],
  ['remodel_2_blueprint', '养成', 10, 'blueprint', '改造 2 阶图纸'],
  ['remodel_3_gold', '养成', 150000, 'gold', '改造 3 阶金币'],
  ['remodel_3_material', '养成', 300, 'material', '改造 3 阶材料'],
  ['remodel_3_blueprint', '养成', 20, 'blueprint', '改造 3 阶图纸'],
  ['remodel_4_gold', '养成', 400000, 'gold', '改造 4 阶金币'],
  ['remodel_4_material', '养成', 800, 'material', '改造 4 阶材料'],
  ['remodel_4_blueprint', '养成', 40, 'blueprint', '改造 4 阶图纸'],
  ['power_chapter_base', '战力', 3000, 'power', '第 1 章推荐战力'],
  ['power_chapter_mult', '战力', 1.4, 'x/chapter', '每章推荐战力倍率'],
  ['enemy_ratio_normal', '战力', 0.7, 'ratio', '普通关敌人战力/推荐战力'],
  ['enemy_ratio_elite', '战力', 0.9, 'ratio', '精英关敌人战力/推荐战力'],
  ['enemy_ratio_boss', '战力', 1.2, 'ratio', 'BOSS 关敌人战力/推荐战力'],
  ['trade_profit_min', '贸易', 0.10, 'ratio', '往返利润率下限'],
  ['trade_profit_max', '贸易', 0.30, 'ratio', '往返利润率上限'],
  ['trade_daily_cap_per_level', '贸易', 5000, 'gold/day/level', '每港每日交易额上限系数'],
  ['trade_exp_per_1000', '贸易', 1, 'exp/1000gold', '每 1000 正利润换贸易经验'],
  ['trade_level_exp_base', '贸易', 2, 'exp', '贸易升级经验基数（n→n+1 需 base×n^pow）'],
  ['trade_level_exp_pow', '贸易', 2, 'pow', '贸易升级经验指数'],
  ['trade_level_max', '贸易', 10, 'level', '贸易等级上限'],
  ['trade_slot_1_level', '贸易', 1, 'level', '第 1 条航线槽位解锁等级'],
  ['trade_slot_2_level', '贸易', 2, 'level', '第 2 条航线槽位解锁等级'],
  ['trade_slot_3_level', '贸易', 5, 'level', '第 3 条航线槽位解锁等级'],
  ['trade_route_max_round_hours', '贸易', 8, 'hour', '往返总耗时上限'],
  ['trade_pirate_loss_rate', '贸易', 0.40, 'ratio', '海盗基础货损率'],
  ['trade_pirate_break_ratio', '贸易', 0.60, 'ratio', '护航大破战力阈值'],
  ['trade_break_repair_hours', '贸易', 2, 'hour', '大破修理时间'],
  ['gacha_price', '抽卡', 150, 'diamond', '单抽价格'],
  ['gacha_ten_price', '抽卡', 1500, 'diamond', '十连价格'],
  ['gacha_ss_rate', '抽卡', 0.02, 'ratio', 'SS 基础概率'],
  ['gacha_s_rate', '抽卡', 0.10, 'ratio', 'S 基础概率'],
  ['gacha_a_rate', '抽卡', 0.38, 'ratio', 'A 基础概率'],
  ['gacha_b_rate', '抽卡', 0.50, 'ratio', 'B 基础概率'],
  ['shard_dup_B', '抽卡', 10, 'shard', 'B 重复转碎片'],
  ['shard_dup_A', '抽卡', 25, 'shard', 'A 重复转碎片'],
  ['shard_dup_S', '抽卡', 60, 'shard', 'S 重复转碎片'],
  ['shard_dup_SS', '抽卡', 150, 'shard', 'SS 重复转碎片'],
  ['shard_exchange_S', '抽卡', 300, 'shard', '兑换指定 S'],
  ['shard_exchange_SS', '抽卡', 800, 'shard', '兑换指定 SS'],
  ['event_trigger_rate', '事件', 0.15, 'ratio', '普通战斗后触发随机事件概率'],
  ['event_weight_storm', '事件', 0.40, 'ratio', '风暴权重'],
  ['event_weight_pirate', '事件', 0.40, 'ratio', '海盗权重'],
  ['event_weight_treasure', '事件', 0.20, 'ratio', '宝藏权重'],
  ['storm_hp_loss', '事件', 0.20, 'ratio', '风暴削减耐久比例'],
  ['diamond_weekly_target', '目标', 4500, 'diamond/week', '前 4 周每周钻石目标'],
  ['diamond_longterm_weekly', '目标', 2900, 'diamond/week', '长期每周钻石目标'],
  ['day_target_chapter_7', '目标', 2, 'chapter', '第 7 天目标章节'],
  ['day_target_chapter_14', '目标', 3, 'chapter', '第 14 天目标章节'],
  ['day_target_chapter_30', '目标', 5, 'chapter', '第 30 天目标章节'],
  ['day_target_pulls_7', '目标', 40, 'pull', '第 7 天累计抽数'],
  ['day_target_pulls_14', '目标', 70, 'pull', '第 14 天累计抽数'],
  ['day_target_pulls_30', '目标', 130, 'pull', '第 30 天累计抽数'],
];
write('economy', ['key', 'category', 'value', 'unit', 'description'], economyRows.map(([key, category, value, unit, description]) => ({ key, category, value, unit, description })));

console.log('done.');
