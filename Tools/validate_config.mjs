// Config_CSV 校验脚本。
// 运行：node Tools/validate_config.mjs
// 零报错才允许导入 Unity。CI 与本地导入前各跑一次。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSV_DIR = path.join(ROOT, 'Config_CSV');

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// ---------- CSV 读取 ----------
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  while (rows.length && rows[rows.length - 1].every((v) => v === '')) rows.pop();
  return rows;
}

const TABLES = {};
function load(name) {
  const file = path.join(CSV_DIR, name + '.csv');
  if (!fs.existsSync(file)) { err(`缺少表 ${name}.csv`); return []; }
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  if (rows.length < 1) { err(`${name}.csv 为空`); return []; }
  const header = rows[0];
  const data = rows.slice(1).map((r, i) => {
    if (r.length !== header.length) err(`${name}.csv 第 ${i + 2} 行列数 ${r.length} != 表头 ${header.length}`);
    const o = {};
    header.forEach((h, j) => { o[h] = r[j] ?? ''; });
    return o;
  });
  TABLES[name] = data;
  return data;
}

const REQUIRED_TABLES = ['ship', 'captain', 'skill', 'combo', 'equip', 'enemy', 'stage', 'loot', 'port', 'good', 'route', 'gacha', 'building', 'tech', 'buff', 'event', 'task', 'audio', 'localization', 'economy'];
for (const t of REQUIRED_TABLES) load(t);

// ---------- 工具 ----------
const num = (v) => Number(v);
const isNum = (v) => v !== '' && Number.isFinite(Number(v));
const isInt = (v) => isNum(v) && Number.isInteger(Number(v));
const inRange = (v, lo, hi) => isNum(v) && Number(v) >= lo && Number(v) <= hi;
const uniqueIds = (table, rows, label = 'id') => {
  const seen = new Set();
  for (const r of rows) {
    if (!r[label]) { err(`${table}: 存在空 ${label}`); continue; }
    if (seen.has(r[label])) err(`${table}: ${label} 重复 ${r[label]}`);
    seen.add(r[label]);
  }
  return seen;
};
const idSet = (rows, key = 'id') => new Set(rows.map((r) => r[key]));

const shipIds = uniqueIds('ship', TABLES.ship);
const skillIds = uniqueIds('skill', TABLES.skill);
const captainIds = uniqueIds('captain', TABLES.captain);
const comboIds = uniqueIds('combo', TABLES.combo);
const equipIds = uniqueIds('equip', TABLES.equip);
const enemyIds = uniqueIds('enemy', TABLES.enemy);
const stageIds = uniqueIds('stage', TABLES.stage);
const lootIds = new Set(TABLES.loot.map((r) => r.lootTableId));
const portIds = uniqueIds('port', TABLES.port);
const goodIds = uniqueIds('good', TABLES.good);
const routeIds = uniqueIds('route', TABLES.route);
const buffIds = uniqueIds('buff', TABLES.buff);
const techIds = uniqueIds('tech', TABLES.tech);
const taskIds = uniqueIds('task', TABLES.task);
const audioIds = uniqueIds('audio', TABLES.audio);
const locKeys = uniqueIds('localization', TABLES.localization, 'key');

const skillById = Object.fromEntries(TABLES.skill.map((r) => [r.id, r]));
const shipById = Object.fromEntries(TABLES.ship.map((r) => [r.id, r]));

// ---------- 枚举 ----------
const FACTIONS = new Set(['anchor', 'blue', 'red', 'green', 'neutral', 'enemy']);
const PLAYER_FACTIONS = new Set(['anchor', 'blue', 'red', 'green']);
const QUALITIES = new Set(['B', 'A', 'S', 'SS']);
const SKILL_TYPES = new Set(['rage', 'passive', 'flagship', 'combo', 'exclusive']);
const NODE_TYPES = new Set(['normal', 'elite', 'boss', 'event', 'treasure', 'port']);
const ITEM_TYPES = new Set(['gold', 'diamond', 'material', 'blueprint', 'expBook', 'skillBook', 'shard', 'equipBox', 'captainTicket']);
const TASK_TYPES = new Set(['daily', 'weekly', 'achievement', 'milestone']);
const GACHA_TYPES = new Set(['ship', 'captain', 'equip']);

// ---------- ship ----------
{
  const rows = TABLES.ship;
  const warships = rows.filter((r) => r.isTradeShip === '0');
  const tradeShips = rows.filter((r) => r.isTradeShip === '1');
  if (warships.length !== 15) err(`ship: 战舰应为 15 艘，实际 ${warships.length}`);
  if (tradeShips.length !== 3) err(`ship: 贸易船应为 3 艘，实际 ${tradeShips.length}`);
  const qCount = { B: 0, A: 0, S: 0, SS: 0 };
  const factionSS = {};
  const SLOT_COUNT = { B: 3, A: 4, S: 5, SS: 6 };
  for (const r of rows) {
    if (!r.id.startsWith('ship_')) err(`ship: id 前缀错误 ${r.id}`);
    if (!FACTIONS.has(r.faction)) err(`ship ${r.id}: 非法 faction ${r.faction}`);
    if (!QUALITIES.has(r.quality)) err(`ship ${r.id}: 非法 quality ${r.quality}`);
    if (r.isTradeShip !== '0' && r.isTradeShip !== '1') err(`ship ${r.id}: isTradeShip 必须为 0/1`);
    if (r.isTradeShip === '1') {
      if (r.faction !== 'neutral') err(`ship ${r.id}: 贸易船 faction 应为 neutral`);
      if (!(num(r.capacity) > 0)) err(`ship ${r.id}: 贸易船 capacity 必须 >0`);
      if (!(num(r.speed) > 0)) err(`ship ${r.id}: 贸易船 speed 必须 >0`);
      if (r.slots !== '' || r.rageSkillId !== '') err(`ship ${r.id}: 贸易船不应有槽位/技能`);
      continue;
    }
    qCount[r.quality]++;
    if (!PLAYER_FACTIONS.has(r.faction)) err(`ship ${r.id}: 战舰 faction 非法`);
    if (!(num(r.hp) > 0 && num(r.atk) > 0 && num(r.def) > 0)) err(`ship ${r.id}: 基础属性必须 >0`);
    if (!inRange(r.spd, 50, 200)) err(`ship ${r.id}: spd 越界 ${r.spd}`);
    if (num(r.critRate) !== 5 || num(r.critDmg) !== 150) err(`ship ${r.id}: 暴击初始值应为 5/150`);
    if (num(r.growth) !== 0.08) err(`ship ${r.id}: growth 应为 0.08`);
    const slots = r.slots ? r.slots.split('|') : [];
    if (slots.length !== SLOT_COUNT[r.quality]) err(`ship ${r.id}: ${r.quality} 槽位数应为 ${SLOT_COUNT[r.quality]}，实际 ${slots.length}`);
    for (const s of slots) if (!['主炮', '副炮', '防空', '鱼雷', '设备', '舰载机'].includes(s)) err(`ship ${r.id}: 非法槽位 ${s}`);
    if (!skillIds.has(r.rageSkillId)) err(`ship ${r.id}: rageSkillId 不存在 ${r.rageSkillId}`);
    else if (skillById[r.rageSkillId].type !== 'rage') err(`ship ${r.id}: rageSkillId 类型不是 rage`);
    if (r.quality === 'B') {
      if (r.passiveSkillId !== '') err(`ship ${r.id}: B 不应有被动`);
      if (r.exclusiveSkillId !== '') err(`ship ${r.id}: B 不应有专属`);
    } else {
      if (!skillIds.has(r.passiveSkillId)) err(`ship ${r.id}: passiveSkillId 不存在`);
      else if (skillById[r.passiveSkillId].type !== 'passive') err(`ship ${r.id}: passiveSkillId 类型不是 passive`);
    }
    if (r.quality === 'SS') {
      if (!skillIds.has(r.exclusiveSkillId)) err(`ship ${r.id}: SS 必须有专属技能`);
      else if (skillById[r.exclusiveSkillId].type !== 'exclusive') err(`ship ${r.id}: exclusiveSkillId 类型不是 exclusive`);
      if (skillById[r.exclusiveSkillId] && skillById[r.exclusiveSkillId].ownerShipId !== r.id) err(`ship ${r.id}: 专属技能 ownerShipId 不匹配`);
      factionSS[r.faction] = (factionSS[r.faction] || 0) + 1;
    } else if (r.exclusiveSkillId !== '') err(`ship ${r.id}: 非 SS 不应有专属`);
    if (!skillIds.has(r.flagshipSkillId)) err(`ship ${r.id}: flagshipSkillId 不存在`);
    else if (skillById[r.flagshipSkillId].type !== 'flagship') err(`ship ${r.id}: flagshipSkillId 类型不是 flagship`);
  }
  if (qCount.SS !== 4 || qCount.S !== 4 || qCount.A !== 4 || qCount.B !== 3) err(`ship: 品质分布应为 SS4/S4/A4/B3，实际 ${JSON.stringify(qCount)}`);
  for (const f of PLAYER_FACTIONS) if ((factionSS[f] || 0) !== 1) err(`ship: 阵营 ${f} 的 SS 数量应为 1，实际 ${factionSS[f] || 0}`);
  // 基础属性按品质倍率
  const MULT = { B: 1, A: 1.3, S: 1.7, SS: 2.2 };
  for (const r of warships) {
    const m = MULT[r.quality];
    if (Math.abs(num(r.hp) - 1000 * m) > 2) warn(`ship ${r.id}: hp ${r.hp} 偏离品质基准 ${Math.round(1000 * m)}`);
    if (Math.abs(num(r.atk) - 100 * m) > 1) warn(`ship ${r.id}: atk ${r.atk} 偏离品质基准 ${Math.round(100 * m)}`);
    if (Math.abs(num(r.def) - 50 * m) > 1) warn(`ship ${r.id}: def ${r.def} 偏离品质基准 ${Math.round(50 * m)}`);
  }
}

// ---------- skill ----------
{
  for (const r of TABLES.skill) {
    if (!r.id.startsWith('skill_')) err(`skill: id 前缀错误 ${r.id}`);
    if (!SKILL_TYPES.has(r.type)) err(`skill ${r.id}: 非法 type ${r.type}`);
    if (!r.targetRule) err(`skill ${r.id}: targetRule 为空`);
    if (!inRange(r.cost, 0, 1000)) err(`skill ${r.id}: cost 越界`);
    if (!inRange(r.cooldown, 0, 100)) err(`skill ${r.id}: cooldown 越界`);
    if (!inRange(r.power, 0, 1000)) err(`skill ${r.id}: power 越界`);
    if (!inRange(r.chance, 0, 100)) err(`skill ${r.id}: chance 越界`);
    if (r.faction && !FACTIONS.has(r.faction)) err(`skill ${r.id}: 非法 faction ${r.faction}`);
    if (r.ownerShipId && !shipIds.has(r.ownerShipId)) err(`skill ${r.id}: ownerShipId 不存在`);
    if (!inRange(r.durationRounds, 0, 10)) err(`skill ${r.id}: durationRounds 越界`);
    if (r.effectType && !buffIds.has(`buff_${r.effectType.replace(/([A-Z])/g, '_$1').toLowerCase()}`)) {
      // 不强制每个 effectType 都有 buff 行；只提示
      warn(`skill ${r.id}: effectType ${r.effectType} 未在 buff 表找到同名行（若为即时效果可忽略）`);
    }
  }
  const byType = (t) => TABLES.skill.filter((r) => r.type === t).length;
  if (byType('exclusive') !== 4) err(`skill: 专属技能应为 4 个，实际 ${byType('exclusive')}`);
  if (byType('combo') !== 4) err(`skill: 合击技能应为 4 个，实际 ${byType('combo')}`);
  if (byType('flagship') !== 4) err(`skill: 旗舰技能应为 4 个，实际 ${byType('flagship')}`);
  if (byType('rage') < 4) err('skill: 怒气技能不足 4 个');
  if (byType('passive') < 8) err('skill: 被动技能不足 8 个');
}

// ---------- captain ----------
{
  if (TABLES.captain.length !== 8) err(`captain: 应为 8 名，实际 ${TABLES.captain.length}`);
  const perFaction = {};
  for (const r of TABLES.captain) {
    if (!r.id.startsWith('captain_')) err(`captain: id 前缀错误 ${r.id}`);
    if (!PLAYER_FACTIONS.has(r.faction)) err(`captain ${r.id}: 非法 faction`);
    if (!QUALITIES.has(r.quality)) err(`captain ${r.id}: 非法 quality`);
    if (!skillIds.has(r.passiveSkillId)) err(`captain ${r.id}: passiveSkillId 不存在`);
    else if (skillById[r.passiveSkillId].type !== 'passive') err(`captain ${r.id}: passiveSkillId 类型不是 passive`);
    if (!skillIds.has(r.enhanceSkillId)) err(`captain ${r.id}: enhanceSkillId 不存在`);
    else if (skillById[r.enhanceSkillId].type !== 'rage') err(`captain ${r.id}: enhanceSkillId 类型不是 rage`);
    perFaction[r.faction] = (perFaction[r.faction] || 0) + 1;
  }
  for (const f of PLAYER_FACTIONS) if (perFaction[f] !== 2) err(`captain: 阵营 ${f} 应有 2 名，实际 ${perFaction[f] || 0}`);
}

// ---------- combo ----------
{
  if (TABLES.combo.length !== 4) err(`combo: 应为 4 对，实际 ${TABLES.combo.length}`);
  const pairs = new Set();
  for (const r of TABLES.combo) {
    if (!r.id.startsWith('combo_')) err(`combo: id 前缀错误 ${r.id}`);
    if (!shipIds.has(r.shipA)) err(`combo ${r.id}: shipA 不存在`);
    if (!shipIds.has(r.shipB)) err(`combo ${r.id}: shipB 不存在`);
    if (r.shipA === r.shipB) err(`combo ${r.id}: 两艘舰相同`);
    if (!skillIds.has(r.skillId)) err(`combo ${r.id}: skillId 不存在`);
    else if (skillById[r.skillId].type !== 'combo') err(`combo ${r.id}: skillId 类型不是 combo`);
    if (!inRange(r.priority, 1, 3)) err(`combo ${r.id}: priority 应为 1~3`);
    const key = [r.shipA, r.shipB].sort().join('+');
    if (pairs.has(key)) err(`combo ${r.id}: 合击对重复 ${key}`);
    pairs.add(key);
    if (shipById[r.shipA] && shipById[r.shipA].quality !== 'SS' && shipById[r.shipB] && shipById[r.shipB].quality !== 'SS') {
      warn(`combo ${r.id}: 合击对不含 SS`);
    }
  }
}

// ---------- equip ----------
{
  if (TABLES.equip.length !== 24) err(`equip: 应为 24 件，实际 ${TABLES.equip.length}`);
  const slots = new Set();
  for (const r of TABLES.equip) {
    if (!r.id.startsWith('equip_')) err(`equip: id 前缀错误 ${r.id}`);
    if (!QUALITIES.has(r.quality)) err(`equip ${r.id}: 非法 quality`);
    if (!r.slotId || !r.slot) err(`equip ${r.id}: slot 为空`);
    slots.add(r.slotId);
    if (!inRange(r.enhanceGrowth, 0, 1)) err(`equip ${r.id}: enhanceGrowth 越界`);
    for (const k of ['hp', 'atk', 'def', 'spd', 'critRate', 'critDmg']) {
      if (!isNum(r[k]) || num(r[k]) < 0) err(`equip ${r.id}: ${k} 非法`);
    }
  }
  if (slots.size !== 6) err(`equip: 槽位应为 6 种，实际 ${slots.size}`);
  const combos = new Set(TABLES.equip.map((r) => `${r.slotId}|${r.quality}`));
  if (combos.size !== 24) err('equip: 6 槽 × 4 品质组合不完整');
}

// ---------- buff ----------
{
  for (const r of TABLES.buff) {
    if (!r.id.startsWith('buff_')) err(`buff: id 前缀错误 ${r.id}`);
    if (!['buff', 'debuff'].includes(r.type)) err(`buff ${r.id}: 非法 type`);
    if (!isNum(r.value) || num(r.value) < 0) err(`buff ${r.id}: value 非法`);
    if (!inRange(r.durationRounds, 0, 10)) err(`buff ${r.id}: durationRounds 越界`);
    if (!['refresh', 'stack', 'stack_3', 'unique'].includes(r.stackRule)) err(`buff ${r.id}: 非法 stackRule`);
  }
}

// ---------- enemy ----------
{
  const normals = TABLES.enemy.filter((r) => r.isBoss === '0');
  const bosses = TABLES.enemy.filter((r) => r.isBoss === '1');
  if (normals.length !== 10) err(`enemy: 普通敌人应为 10 个，实际 ${normals.length}`);
  if (bosses.length !== 5) err(`enemy: BOSS 应为 5 个，实际 ${bosses.length}`);
  const archetypes = new Set(normals.map((r) => r.archetype));
  if (archetypes.size !== 5) err(`enemy: 普通敌人应有 5 类，实际 ${archetypes.size}`);
  for (const r of TABLES.enemy) {
    if (!r.id.startsWith('enemy_')) err(`enemy: id 前缀错误 ${r.id}`);
    if (!(num(r.hp) > 0 && num(r.atk) > 0 && num(r.def) > 0)) err(`enemy ${r.id}: 属性必须 >0`);
    if (!skillIds.has(r.skillId)) err(`enemy ${r.id}: skillId 不存在`);
    if (r.lootTableId && !lootIds.has(r.lootTableId)) err(`enemy ${r.id}: lootTableId 不存在`);
    if (!isNum(r.power) || num(r.power) <= 0) err(`enemy ${r.id}: power 非法`);
  }
}

// ---------- loot ----------
{
  const byTable = {};
  for (const r of TABLES.loot) {
    if (!r.lootTableId.startsWith('loot_')) err(`loot: 表 id 前缀错误 ${r.lootTableId}`);
    if (!ITEM_TYPES.has(r.itemType)) err(`loot ${r.lootTableId}: 非法 itemType ${r.itemType}`);
    if (!inRange(r.probability, 0, 100)) err(`loot ${r.lootTableId}: probability 越界`);
    if (!isInt(r.minQty) || !isInt(r.maxQty) || num(r.minQty) < 1 || num(r.maxQty) < num(r.minQty)) err(`loot ${r.lootTableId}: 数量范围非法`);
    (byTable[r.lootTableId] ||= []).push(r);
  }
  for (const [id, rows] of Object.entries(byTable)) {
    const sum = rows.reduce((s, r) => s + num(r.probability), 0);
    if (Math.abs(sum - 100) > 0.01) err(`loot ${id}: 概率合计 ${sum} != 100`);
  }
  for (const id of lootIds) if (!byTable[id]) err(`loot: 表 ${id} 没有行`);
}

// ---------- stage ----------
{
  if (TABLES.stage.length !== 60) err(`stage: 应为 5 章 × 12 节点 = 60，实际 ${TABLES.stage.length}`);
  const stageById = Object.fromEntries(TABLES.stage.map((r) => [r.id, r]));
  const chapterIdle = {};
  for (const r of TABLES.stage) {
    if (!/^stage_\d+_\d+$/.test(r.id)) err(`stage: id 格式错误 ${r.id}`);
    if (!inRange(r.chapter, 1, 5)) err(`stage ${r.id}: chapter 越界`);
    if (!inRange(r.nodeIndex, 1, 12)) err(`stage ${r.id}: nodeIndex 越界`);
    if (r.id !== `stage_${r.chapter}_${r.nodeIndex}`) err(`stage ${r.id}: id 与 chapter/nodeIndex 不一致`);
    if (!NODE_TYPES.has(r.nodeType)) err(`stage ${r.id}: 非法 nodeType`);
    if (!(num(r.recommendedPower) > 0)) err(`stage ${r.id}: recommendedPower 必须 >0`);
    if (!lootIds.has(r.lootTableId)) err(`stage ${r.id}: lootTableId 不存在`);
    if (r.unlockCondition !== 'start') {
      if (!stageIds.has(r.unlockCondition)) err(`stage ${r.id}: unlockCondition 不存在 ${r.unlockCondition}`);
    } else if (r.id !== 'stage_1_1') err(`stage ${r.id}: 只有 1-1 可以 start`);
    // 首通奖励格式
    if (r.firstClearReward) {
      for (const part of r.firstClearReward.split('|')) {
        const [item, qty] = part.split(':');
        if (!item || !isInt(qty) || num(qty) <= 0) err(`stage ${r.id}: firstClearReward 格式错误 ${part}`);
      }
    }
    // 挂机产出按章一致
    const key = r.chapter;
    const sig = [r.idleGoldPerHour, r.idleExpPerHour, r.idleMaterialPerHour, r.idleShardPerHour, r.idleSkillPerHour].join('|');
    if (chapterIdle[key] && chapterIdle[key] !== sig) err(`stage ${r.id}: 同章挂机产出不一致`);
    chapterIdle[key] = sig;
    // 战斗节点
    const battle = ['normal', 'elite', 'boss'].includes(r.nodeType);
    const lineup = r.enemyLineup ? r.enemyLineup.split('|') : [];
    if (battle) {
      if (!lineup.length) err(`stage ${r.id}: 战斗节点没有敌人`);
      for (const e of lineup) if (!enemyIds.has(e)) err(`stage ${r.id}: 敌人不存在 ${e}`);
      if (!(num(r.enemyScale) > 0)) err(`stage ${r.id}: enemyScale 必须 >0`);
      if (!inRange(r.targetRounds, 1, 50)) err(`stage ${r.id}: targetRounds 越界`);
      // 敌人战力比例
      const ratio = r.nodeType === 'normal' ? 0.7 : r.nodeType === 'elite' ? 0.9 : 1.2;
      const base = lineup.reduce((s, e) => s + num(TABLES.enemy.find((x) => x.id === e).power), 0);
      const actual = (base * num(r.enemyScale)) / num(r.recommendedPower);
      if (Math.abs(actual - ratio) > 0.02) err(`stage ${r.id}: 敌人战力比 ${actual.toFixed(3)} 偏离目标 ${ratio}`);
    } else {
      if (lineup.length) err(`stage ${r.id}: 非战斗节点不应有敌人`);
      if (num(r.enemyScale) !== 0) err(`stage ${r.id}: 非战斗节点 enemyScale 应为 0`);
      if (num(r.targetRounds) !== 0) err(`stage ${r.id}: 非战斗节点 targetRounds 应为 0`);
    }
    // 章节挂机基数
    const mult = Math.pow(1.4, num(r.chapter) - 1);
    if (Math.abs(num(r.idleGoldPerHour) - Math.round(600 * mult)) > 1) err(`stage ${r.id}: 挂机金币偏离章节基数`);
    if (Math.abs(num(r.idleExpPerHour) - Math.round(10 * mult * 100) / 100) > 0.02) err(`stage ${r.id}: 挂机经验偏离章节基数`);
  }
  // 章节 BOSS 在 12 节点
  for (let ch = 1; ch <= 5; ch++) {
    const boss = stageById[`stage_${ch}_12`];
    if (!boss || boss.nodeType !== 'boss') err(`stage: 第 ${ch} 章 12 节点应为 boss`);
  }
  // M1：1-1 ~ 1-10 必须是战斗节点
  for (let n = 1; n <= 10; n++) {
    const s = stageById[`stage_1_${n}`];
    if (!s || !['normal', 'elite'].includes(s.nodeType)) err(`stage: M1 的 1-${n} 必须是战斗节点`);
  }
}

// ---------- port / good / route ----------
{
  if (TABLES.port.length !== 8) err(`port: 应为 8 个，实际 ${TABLES.port.length}`);
  for (const r of TABLES.port) {
    if (!r.id.startsWith('port_')) err(`port: id 前缀错误 ${r.id}`);
    if (!['start', 'stage', 'tradeLevel'].includes(r.unlockType)) err(`port ${r.id}: 非法 unlockType`);
    if (r.unlockType === 'stage' && !stageIds.has(r.unlockValue)) err(`port ${r.id}: unlockValue 关卡不存在`);
    if (r.unlockType === 'tradeLevel' && !inRange(r.unlockValue, 0, 10)) err(`port ${r.id}: 贸易等级解锁值越界`);
    const sp = r.specialtyGoods ? r.specialtyGoods.split('|') : [];
    const sc = r.scarceGoods ? r.scarceGoods.split('|') : [];
    for (const g of [...sp, ...sc]) if (!goodIds.has(g)) err(`port ${r.id}: 商品不存在 ${g}`);
    if (sp.length < 1 || sp.length > 2) err(`port ${r.id}: 特产应为 1~2 种`);
    if (sc.length !== 2) err(`port ${r.id}: 紧缺品应为 2 种`);
    for (const g of sp) if (sc.includes(g)) err(`port ${r.id}: 商品 ${g} 同时是特产与紧缺品`);
    if (!(num(r.priceFactor) > 0)) err(`port ${r.id}: priceFactor 非法`);
  }
  const startPorts = TABLES.port.filter((r) => r.unlockType === 'start');
  if (startPorts.length !== 2) err(`port: 起始港应恰好 2 个（晨曦港、铁锚港），实际 ${startPorts.length}`);
  for (const id of ['port_dawn', 'port_anchor']) {
    if (!startPorts.some((r) => r.id === id)) err(`port: ${id} 应为起始港`);
  }

  if (TABLES.good.length !== 7) err(`good: 应为 7 种，实际 ${TABLES.good.length}`);
  for (const r of TABLES.good) {
    if (!r.id.startsWith('good_')) err(`good: id 前缀错误 ${r.id}`);
    if (!(num(r.basePrice) > 0)) err(`good ${r.id}: basePrice 必须 >0`);
    if (!(num(r.unitWeight) > 0)) err(`good ${r.id}: unitWeight 必须 >0`);
    if (!inRange(r.volatility, 0, 1)) err(`good ${r.id}: volatility 越界`);
    if (!(num(r.dailyCapacity) > 0)) err(`good ${r.id}: dailyCapacity 必须 >0`);
  }

  const newbie = TABLES.route.filter((r) => r.isNewbie === '1');
  if (newbie.length !== 1) err(`route: 新手航线应恰好 1 条，实际 ${newbie.length}`);
  for (const r of TABLES.route) {
    if (!r.id.startsWith('route_')) err(`route: id 前缀错误 ${r.id}`);
    if (!portIds.has(r.fromPort)) err(`route ${r.id}: fromPort 不存在`);
    if (!portIds.has(r.toPort)) err(`route ${r.id}: toPort 不存在`);
    if (r.fromPort === r.toPort) err(`route ${r.id}: 起终点相同`);
    if (!(num(r.oneWayMinutes) > 0)) err(`route ${r.id}: oneWayMinutes 必须 >0`);
    if (num(r.oneWayMinutes) * 2 > 480) err(`route ${r.id}: 往返超过 8 小时`);
    if (!inRange(r.riskPct, 0, 30)) err(`route ${r.id}: riskPct 越界`);
    if (!(num(r.piratePower) >= 0)) err(`route ${r.id}: piratePower 非法`);
    if (!(num(r.baseFreight) >= 0)) err(`route ${r.id}: baseFreight 非法`);
    if (!inRange(r.minTradeLevel, 0, 10)) err(`route ${r.id}: minTradeLevel 越界`);
    if (r.isNewbie === '1' && (num(r.riskPct) !== 0 || num(r.oneWayMinutes) !== 0.5)) err(`route ${r.id}: 新手航线应为 0.5 分钟单程、0 风险`);
  }
}

// ---------- gacha ----------
{
  if (TABLES.gacha.length !== 5) err(`gacha: 应为 5 个池，实际 ${TABLES.gacha.length}`);
  for (const r of TABLES.gacha) {
    if (!r.poolId.startsWith('gacha_')) err(`gacha: id 前缀错误 ${r.poolId}`);
    if (!GACHA_TYPES.has(r.type)) err(`gacha ${r.poolId}: 非法 type`);
    const sum = num(r.ssRate) + num(r.sRate) + num(r.aRate) + num(r.bRate);
    if (Math.abs(sum - 100) > 0.01) err(`gacha ${r.poolId}: 品质概率合计 ${sum} != 100`);
    if (r.hardPitySS !== '0') {
      if (!(num(r.softPityStartSS) > 0 && num(r.softPityStartSS) < num(r.hardPitySS))) err(`gacha ${r.poolId}: 软保底起点必须小于硬保底`);
    }
    if (!(num(r.hardPityS) > 0) || !(num(r.hardPityA) > 0)) err(`gacha ${r.poolId}: A/S 保底必须 >0`);
    if (!(num(r.costDiamond) >= 0)) err(`gacha ${r.poolId}: costDiamond 非法`);
    if (r.upList) {
      for (const s of r.upList.split('|')) if (!shipIds.has(s)) err(`gacha ${r.poolId}: UP 舰船不存在 ${s}`);
      if (!inRange(r.upChance, 0, 100)) err(`gacha ${r.poolId}: upChance 越界`);
    }
    if (r.newbieCandidates) {
      const c = r.newbieCandidates.split('|');
      if (c.length !== 3) err(`gacha ${r.poolId}: 新手候选应为 3 艘，实际 ${c.length}`);
      for (const s of c) {
        if (!shipIds.has(s)) err(`gacha ${r.poolId}: 新手候选不存在 ${s}`);
        else if (shipById[s].quality !== 'SS') err(`gacha ${r.poolId}: 新手候选必须是 SS ${s}`);
      }
    }
  }
  const newbiePool = TABLES.gacha.find((r) => r.poolId === 'gacha_newbie');
  if (!newbiePool || newbiePool.freeFirstTen !== '1' || num(newbiePool.maxPulls) !== 10) err('gacha: 新手池应为免费 10 连');
  if (newbiePool && newbiePool.tenthGuarantee !== 'S') err('gacha: 新手池第 10 抽应保底 S');
  const limited = TABLES.gacha.find((r) => r.poolId === 'gacha_ship_limited');
  if (!limited || limited.guaranteeUp !== '1') err('gacha: 限定池应开启大保底');
}

// ---------- building ----------
{
  const byBuilding = {};
  for (const r of TABLES.building) {
    if (!r.id.startsWith('building_')) err(`building: id 前缀错误 ${r.id}`);
    if (!inRange(r.level, 1, 10)) err(`building ${r.id}: level 越界`);
    (byBuilding[r.id] ||= []).push(r);
    if (num(r.level) === 1) {
      if (num(r.costGold) !== 0 || num(r.costTimeMinutes) !== 0) err(`building ${r.id}: 1 级不应有消耗`);
    } else {
      const expectGold = Math.round(2000 * Math.pow(1.6, num(r.level) - 2));
      const expectTime = Math.min(720, Math.round(5 * Math.pow(1.8, num(r.level) - 2)));
      if (num(r.costGold) !== expectGold) err(`building ${r.id} L${r.level}: 金币 ${r.costGold} != ${expectGold}`);
      if (num(r.costTimeMinutes) !== expectTime) err(`building ${r.id} L${r.level}: 耗时 ${r.costTimeMinutes} != ${expectTime}`);
    }
    if (!r.effectType) err(`building ${r.id}: effectType 为空`);
    if (!inRange(r.unlockBaseLevel, 1, 10)) err(`building ${r.id}: unlockBaseLevel 越界`);
  }
  if (Object.keys(byBuilding).length !== 5) err(`building: 应为 5 类建筑，实际 ${Object.keys(byBuilding).length}`);
  for (const [id, rows] of Object.entries(byBuilding)) {
    if (rows.length !== 10) err(`building ${id}: 应有 10 级，实际 ${rows.length}`);
    const levels = rows.map((r) => num(r.level)).sort((a, b) => a - b);
    for (let i = 0; i < 10; i++) if (levels[i] !== i + 1) err(`building ${id}: 等级不连续`);
  }
}

// ---------- tech ----------
{
  for (const r of TABLES.tech) {
    if (!r.id.startsWith('tech_')) err(`tech: id 前缀错误 ${r.id}`);
    if (r.prerequisite && !techIds.has(r.prerequisite)) err(`tech ${r.id}: 前置不存在 ${r.prerequisite}`);
    if (!inRange(r.unlockRemodelTier, 0, 4)) err(`tech ${r.id}: unlockRemodelTier 越界`);
    for (const k of ['costGold', 'costMaterial', 'costBlueprint', 'timeMinutes']) {
      if (!(num(r[k]) >= 0)) err(`tech ${r.id}: ${k} 非法`);
    }
  }
  // 环检测
  const byId = Object.fromEntries(TABLES.tech.map((r) => [r.id, r]));
  for (const r of TABLES.tech) {
    const seen = new Set();
    let cur = r;
    while (cur && cur.prerequisite) {
      if (seen.has(cur.id)) { err(`tech: 前置存在环 ${r.id}`); break; }
      seen.add(cur.id);
      cur = byId[cur.prerequisite];
    }
  }
  for (let t = 1; t <= 4; t++) {
    if (!TABLES.tech.some((r) => r.id === `tech_remodel_${t}`)) err(`tech: 缺少改造 ${t} 阶解锁`);
  }
}

// ---------- event ----------
{
  if (TABLES.event.length !== 3) err(`event: 应为 3 类，实际 ${TABLES.event.length}`);
  let weightSum = 0;
  for (const r of TABLES.event) {
    if (!r.id.startsWith('event_')) err(`event: id 前缀错误 ${r.id}`);
    if (!['storm', 'pirate', 'treasure'].includes(r.type)) err(`event ${r.id}: 非法 type`);
    if (!inRange(r.triggerRate, 0, 100)) err(`event ${r.id}: triggerRate 越界`);
    weightSum += num(r.weight);
  }
  if (Math.abs(weightSum - 100) > 0.01) err(`event: 权重合计 ${weightSum} != 100`);
}

// ---------- task ----------
{
  for (const r of TABLES.task) {
    if (!r.id.startsWith('task_')) err(`task: id 前缀错误 ${r.id}`);
    if (!TASK_TYPES.has(r.type)) err(`task ${r.id}: 非法 type`);
    if (!r.conditionType) err(`task ${r.id}: conditionType 为空`);
    if (!(num(r.conditionValue) > 0)) err(`task ${r.id}: conditionValue 必须 >0`);
    if (!(num(r.rewardDiamond) >= 0) || !(num(r.rewardGold) >= 0)) err(`task ${r.id}: 奖励非法`);
    if (r.rewardItem && !/^[A-Za-z]+:\d+$/.test(r.rewardItem)) err(`task ${r.id}: rewardItem 格式错误`);
  }
  const daily = TABLES.task.filter((r) => r.type === 'daily');
  const dailyDiamond = daily.reduce((s, r) => s + num(r.rewardDiamond), 0);
  if (dailyDiamond !== 200) err(`task: 每日任务钻石合计应为 200，实际 ${dailyDiamond}`);
  const weekly = TABLES.task.filter((r) => r.type === 'weekly');
  const weeklyDiamond = weekly.reduce((s, r) => s + num(r.rewardDiamond), 0);
  if (weeklyDiamond !== 600) err(`task: 每周任务钻石合计应为 600，实际 ${weeklyDiamond}`);
  const milestone = TABLES.task.filter((r) => r.type === 'milestone');
  const milestoneDiamond = milestone.reduce((s, r) => s + num(r.rewardDiamond), 0);
  if (milestoneDiamond !== 800) err(`task: 贸易里程碑钻石合计应为 800，实际 ${milestoneDiamond}`);
}

// ---------- audio ----------
{
  if (TABLES.audio.filter((r) => r.type === 'BGM').length !== 4) err('audio: BGM 应为 4 首');
  if (TABLES.audio.filter((r) => r.type === 'SFX').length < 20) err('audio: SFX 至少 20 个');
  for (const r of TABLES.audio) {
    if (!['BGM', 'SFX'].includes(r.type)) err(`audio ${r.id}: 非法 type`);
    if (!r.file) err(`audio ${r.id}: file 为空`);
    if (!inRange(r.volume, 0, 1)) err(`audio ${r.id}: volume 越界`);
  }
}

// ---------- localization ----------
{
  for (const r of TABLES.localization) {
    if (!r.key) err('localization: 空 key');
    if (!r.zh) err(`localization ${r.key}: 中文为空`);
  }
  const screens = ['mainPort', 'offlineReward', 'stageMap', 'formation', 'battle', 'result', 'trade', 'settings', 'shipGrowth', 'equipment', 'gacha', 'base', 'captain', 'tasks'];
  for (const s of screens) if (!locKeys.has(`screen.${s}`)) err(`localization: 缺少界面 key screen.${s}`);
  if (screens.length !== 14) err('localization: 界面数量应为 14');
}

// ---------- economy ----------
{
  const rows = Object.fromEntries(TABLES.economy.map((r) => [r.key, r]));
  const required = [
    'start_gold', 'start_diamond', 'start_expBook', 'start_tradeShip', 'start_port',
    'idle_base_gold', 'idle_base_exp', 'idle_base_material', 'idle_base_shard', 'idle_base_skill',
    'idle_chapter_mult', 'idle_offline_cap_hours', 'idle_power_coef_min', 'idle_power_coef_max',
    'level_growth', 'level_exp_base', 'level_exp_pow', 'star_mult', 'remodel_mult', 'remodel_max',
    'enhance_gold_base', 'enhance_gold_mult', 'enhance_material_per_level', 'enhance_max',
    'power_chapter_base', 'power_chapter_mult',
    'enemy_ratio_normal', 'enemy_ratio_elite', 'enemy_ratio_boss',
    'trade_profit_min', 'trade_profit_max', 'trade_daily_cap_per_level',
    'trade_exp_per_1000', 'trade_level_exp_base', 'trade_level_exp_pow', 'trade_level_max',
    'gacha_price', 'gacha_ten_price', 'event_trigger_rate', 'diamond_weekly_target',
  ];
  for (const k of required) if (!rows[k]) err(`economy: 缺少 key ${k}`);
  for (const r of TABLES.economy) {
    if (!isNum(r.value)) err(`economy ${r.key}: value 非数字`);
    if (!r.category) err(`economy ${r.key}: category 为空`);
  }
  if (rows.idle_offline_cap_hours && num(rows.idle_offline_cap_hours.value) !== 8) err('economy: 离线上限应为 8 小时');
  if (rows.start_port && num(rows.start_port.value) !== 2) err('economy: start_port 应为 2，与 port 表的起始港数量一致');
  if (rows.idle_power_coef_min && rows.idle_power_coef_max && !(num(rows.idle_power_coef_min.value) <= num(rows.idle_power_coef_max.value))) err('economy: 战力系数上下限颠倒');
  if (rows.trade_profit_min && rows.trade_profit_max && !(num(rows.trade_profit_min.value) < num(rows.trade_profit_max.value))) err('economy: 贸易利润率上下限颠倒');
  if (rows.trade_level_exp_pow && !(num(rows.trade_level_exp_pow.value) >= 1)) err('economy: trade_level_exp_pow 必须 ≥1');
  if (rows.trade_level_exp_base && !(num(rows.trade_level_exp_base.value) > 0)) err('economy: trade_level_exp_base 必须 >0');
}

// ---------- 输出 ----------
console.log(`表：${Object.keys(TABLES).length} / ${REQUIRED_TABLES.length}`);
console.log(`行数：${Object.values(TABLES).reduce((s, r) => s + r.length, 0)}`);
if (warnings.length) {
  console.log(`\n警告 ${warnings.length} 条：`);
  for (const w of warnings) console.log('  ! ' + w);
}
if (errors.length) {
  console.log(`\n错误 ${errors.length} 条：`);
  for (const e of errors) console.log('  x ' + e);
  process.exit(1);
}
console.log('\nOK：全部校验通过。');