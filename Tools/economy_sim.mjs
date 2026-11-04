// 30 天经济模拟：读取 Config_CSV，输出推图 / 港口 / 抽数 / SS / 金币曲线。
// 运行：node Tools/economy_sim.mjs [--runs 200] [--seed 1]
// 这是校准工具，不参与游戏运行时。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSV_DIR = path.join(ROOT, 'Config_CSV');

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

function readTable(name) {
  const file = path.join(CSV_DIR, name + '.csv');
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const header = rows[0];
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const shipRows = readTable('ship');
const stageRows = readTable('stage');
const lootRows = readTable('loot');
const economyRows = readTable('economy');
const taskRows = readTable('task');
const portRows = readTable('port');
const techRows = readTable('tech');
const goodRows = readTable('good');

const E = Object.fromEntries(economyRows.map((r) => [r.key, Number(r.value)]));
const shipById = Object.fromEntries(shipRows.map((r) => [r.id, r]));
const stageById = Object.fromEntries(stageRows.map((r) => [r.id, r]));
const portById = Object.fromEntries(portRows.map((r) => [r.id, r]));
const techById = Object.fromEntries(techRows.map((r) => [r.id, r]));

const NUM = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmt = (v) => (Math.round(v * 100) / 100).toLocaleString('zh-CN');
const avg = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);

// ---------- 初始阵容 ----------
const INITIAL_MAIN = ['ship_anchor_01', 'ship_blue_01', 'ship_red_01', 'ship_anchor_02', 'ship_blue_02', 'ship_green_01'];
const INITIAL_SS = 'ship_anchor_04';

function newShip(configId) {
  return { configId, level: 1, star: 1, remodel: 0 };
}

const LEVEL_CAP = [30, 50, 70, 85, 100];
const QUALITY_MULT = { B: 0.5, A: 1, S: 1.5, SS: 2 };
const STAR_COST = [0, 20, 40, 80, 160, 320];

function factionOf(configId) { return shipById[configId].faction; }

function formationBonuses(main, flagship) {
  const counts = {};
  for (const s of main) counts[factionOf(s.configId)] = (counts[factionOf(s.configId)] || 0) + 1;
  const hasTier = Object.values(counts).some((c) => c >= 3);
  const mixed = hasTier ? 0 : 0.04;
  const flagQuality = { B: 0.02, A: 0.03, S: 0.04, SS: 0.05 }[shipById[flagship.configId].quality] || 0;
  return { counts, mixed, flagQuality, flagshipFaction: factionOf(flagship.configId) };
}

function shipPower(s, bonuses) {
  const c = shipById[s.configId];
  const lvl = 1 + E.level_growth * (s.level - 1);
  const star = 1 + E.star_mult * (s.star - 1);
  const rem = 1 + E.remodel_mult * s.remodel;
  let hp = NUM(c.hp) * lvl * star * rem;
  let atk = NUM(c.atk) * lvl * star * rem;
  let def = NUM(c.def) * lvl * star * rem;
  const spd = NUM(c.spd);
  const sameFlag = factionOf(s.configId) === bonuses.flagshipFaction;
  const hpAtkBonus = bonuses.mixed + bonuses.flagQuality + (sameFlag ? 0.03 : 0);
  const defBonus = bonuses.mixed;
  hp *= 1 + hpAtkBonus;
  atk *= 1 + hpAtkBonus;
  def *= 1 + defBonus;
  const critRate = 5;
  const critDmg = 150;
  return (hp / 10 + atk + def * 1.2) * (1 + spd / 200) * (1 + (critRate / 100) * (critDmg / 100));
}

function fleetPower(main, flagship) {
  const bonuses = formationBonuses(main, flagship);
  return main.reduce((sum, s) => sum + shipPower(s, bonuses), 0);
}

// ---------- 掉落期望 ----------
const lootExpected = {};
for (const r of lootRows) {
  const key = r.lootTableId;
  const p = NUM(r.probability) / 100;
  const q = (NUM(r.minQty) + NUM(r.maxQty)) / 2;
  lootExpected[key] ||= {};
  lootExpected[key][r.itemType] = (lootExpected[key][r.itemType] || 0) + p * q;
}

function parseReward(text) {
  const out = {};
  if (!text) return out;
  for (const part of text.split('|')) {
    const [item, qty] = part.split(':');
    if (!item || !qty) continue;
    out[item] = (out[item] || 0) + Number(qty);
  }
  return out;
}

// ---------- 贸易 ----------
const AVG_GOOD_PRICE = avg(goodRows.map((r) => NUM(r.basePrice)));
const TRADE_PROFIT_RATE = (E.trade_profit_min + E.trade_profit_max) / 2;

function tradeDailyProfit(level, ports, ships) {
  let gross = 0;
  for (const s of ships) {
    const cap = NUM(shipById[s.configId].capacity);
    gross += cap * AVG_GOOD_PRICE * TRADE_PROFIT_RATE * 2; // 2 趟/天
  }
  const capPerPort = E.trade_daily_cap_per_level * level;
  // 买入+卖出 ≈ 2 × 货值；利润 ≈ 货值 × 利润率
  const profitCap = ports * capPerPort * TRADE_PROFIT_RATE * 0.5;
  return Math.min(gross, profitCap);
}

// ---------- 抽卡 ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ssProbability(n, hardPity, softStart, base = 0.02) {
  if (n <= softStart) return base;
  if (n >= hardPity) return 1;
  return Math.min(1, base + (1 - base) * (n - softStart) / (hardPity - softStart));
}

// ---------- 单次 30 天模拟 ----------
function simulate(seed, options = {}) {
  const rng = mulberry32(seed);
  const main = INITIAL_MAIN.map(newShip);
  const flagship = newShip(INITIAL_SS);
  const allShips = [...main, flagship];

  let gold = E.start_gold;
  let diamond = E.start_diamond;
  let expBooks = E.start_expBook;
  let material = 0;
  let blueprint = 0;
  let shard = 0;
  let skillBook = 0;
  let expPool = 0;
  let techTier = 0;
  let tradeLevel = 1;
  let tradeExp = 0;
  let tradeShips = [{ configId: 'ship_trade_small' }];
  // 开局港口直接读 port 表，避免与 CSV 脱节
  let ports = portRows.filter((p) => p.unlockType === 'start').map((p) => p.id);
  let cleared = 0; // 已通关节点数（按顺序）
  let chapter = 1;
  let maxBattleStage = null;
  let totalPulls = 0;
  let paidPulls = 0;
  let ssCount = 1; // 新手选择券
  let ssPity = 0;
  const claimed = new Set();
  const daily = [];

  const levelCap = () => LEVEL_CAP[Math.min(4, Math.max(0, ...main.map((s) => s.remodel)))];

  function addResources(reward) {
    gold += reward.gold || 0;
    diamond += reward.diamond || 0;
    material += reward.material || 0;
    blueprint += reward.blueprint || 0;
    expBooks += reward.expBook || 0;
    skillBook += reward.skillBook || 0;
    shard += reward.shard || 0;
    expPool += (reward.expBook || 0) * 1000;
  }

  function claimTasks() {
    const add = (id) => {
      if (claimed.has(id)) return;
      const t = taskRows.find((r) => r.id === id);
      if (!t) return;
      claimed.add(id);
      diamond += NUM(t.rewardDiamond);
      gold += NUM(t.rewardGold);
      const item = parseReward(t.rewardItem);
      addResources(item);
    };
    if (chapter >= 2) add('task_ach_ch2');
    if (chapter >= 3) add('task_ach_ch3');
    if (chapter >= 4) add('task_ach_ch4');
    if (chapter >= 5) add('task_ach_ch5');
    if (cleared >= 12) add('task_ach_first_boss');
    if (tradeLevel >= 2) add('task_trade_milestone_1');
    if (tradeLevel >= 4) add('task_trade_milestone_2');
    if (tradeLevel >= 5) add('task_ach_trade5');
    if (tradeLevel >= 6) add('task_trade_milestone_3');
    if (tradeLevel >= 8) add('task_trade_milestone_4');
    if (allShips.length >= 10) add('task_ach_collect10');
    if (totalPulls >= 50) add('task_ach_pull50');
    if (totalPulls >= 100) add('task_ach_pull100');
    if (ssCount >= 3) add('task_ach_ss3');
  }

  function spendExp() {
    let progressed = true;
    while (expPool > 0 && progressed) {
      progressed = false;
      for (const s of main) {
        const cap = LEVEL_CAP[s.remodel];
        if (s.level >= cap) continue;
        const need = Math.ceil(E.level_exp_base * Math.pow(s.level, E.level_exp_pow));
        if (expPool >= need) {
          expPool -= need;
          s.level++;
          progressed = true;
        }
      }
    }
  }

  function spendShards() {
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const s of main) {
        if (s.star >= 6) continue;
        const cost = Math.round(STAR_COST[s.star] * QUALITY_MULT[shipById[s.configId].quality]);
        if (shard >= cost) {
          shard -= cost;
          s.star++;
          progressed = true;
        }
      }
    }
  }

  function payTech() {
    const next = techById[`tech_remodel_${techTier + 1}`];
    if (!next) return;
    if (gold >= NUM(next.costGold) && material >= NUM(next.costMaterial) && blueprint >= NUM(next.costBlueprint)) {
      gold -= NUM(next.costGold);
      material -= NUM(next.costMaterial);
      blueprint -= NUM(next.costBlueprint);
      techTier++;
    }
  }

  function tryRemodel() {
    for (const s of main) {
      if (s.remodel >= 4) continue;
      const target = s.remodel + 1;
      if (techTier < target) continue;
      if (s.level < LEVEL_CAP[s.remodel]) continue;
      const cost = {
        gold: E[`remodel_${target}_gold`],
        material: E[`remodel_${target}_material`],
        blueprint: E[`remodel_${target}_blueprint`],
      };
      if (gold >= cost.gold && material >= cost.material && blueprint >= cost.blueprint) {
        gold -= cost.gold;
        material -= cost.material;
        blueprint -= cost.blueprint;
        s.remodel++;
      }
    }
  }

  function tryBuyTradeShip() {
    if (tradeLevel >= 3 && !tradeShips.some((s) => s.configId === 'ship_trade_medium') && gold >= 50000) {
      gold -= 50000;
      tradeShips.push({ configId: 'ship_trade_medium' });
    }
    if (tradeLevel >= 6 && !tradeShips.some((s) => s.configId === 'ship_trade_large') && gold >= 200000) {
      gold -= 200000;
      tradeShips.push({ configId: 'ship_trade_large' });
    }
  }

  function updatePorts() {
    for (const p of portRows) {
      if (ports.includes(p.id)) continue;
      if (p.unlockType === 'stage' && stageById[p.unlockValue] && isCleared(p.unlockValue)) ports.push(p.id);
      if (p.unlockType === 'tradeLevel' && tradeLevel >= NUM(p.unlockValue)) ports.push(p.id);
    }
  }

  function isCleared(stageId) {
    const s = stageById[stageId];
    if (!s) return false;
    const order = stageRows.map((r) => r.id);
    return order.indexOf(stageId) < cleared;
  }

  function attemptStages(power) {
    let attempts = 0;
    while (cleared < stageRows.length && attempts < 2) {
      const next = stageRows[cleared];
      const battle = ['normal', 'elite', 'boss'].includes(next.nodeType);
      if (battle) {
        const factor = next.nodeType === 'normal' ? 0.8 : next.nodeType === 'elite' ? 0.95 : 1.05;
        if (power < NUM(next.recommendedPower) * factor) break;
      }
      // 通关
      cleared++;
      if (battle) maxBattleStage = next;
      const reward = parseReward(next.firstClearReward);
      const loot = lootExpected[next.lootTableId] || {};
      for (const [k, v] of Object.entries(loot)) reward[k] = (reward[k] || 0) + v;
      addResources(reward);
      chapter = next.chapter;
      attempts++;
      claimTasks();
      updatePorts();
    }
  }

  function pullOnce() {
    if (diamond < E.gacha_price) return false;
    diamond -= E.gacha_price;
    totalPulls++;
    paidPulls++;
    const n = ssPity + 1;
    if (rng() < ssProbability(n, 90, 75)) {
      ssCount++;
      ssPity = 0;
    } else {
      ssPity = n;
    }
    return true;
  }

  // 新手池：免费 10 连，第 10 抽必出 S+（不影响 SS 保底）
  for (let i = 0; i < 10; i++) {
    totalPulls++;
    if (rng() < 0.02) ssCount++;
  }

  for (let day = 1; day <= 30; day++) {
    // 1. 抽卡（先把前一天攒的钻石花掉）
    while (pullOnce()) { /* 抽到不能抽为止 */ }

    // 2. 推图
    const power = fleetPower(main, flagship);
    attemptStages(power);

    // 3. 挂机（离线 8h + 在线 2h）
    if (maxBattleStage) {
      const coef = clamp(power / NUM(maxBattleStage.recommendedPower), E.idle_power_coef_min, E.idle_power_coef_max);
      const hours = E.idle_offline_cap_hours + 2;
      gold += NUM(maxBattleStage.idleGoldPerHour) * hours * coef;
      expBooks += NUM(maxBattleStage.idleExpPerHour) * hours * coef;
      material += NUM(maxBattleStage.idleMaterialPerHour) * hours * coef;
      shard += NUM(maxBattleStage.idleShardPerHour) * hours * coef;
      skillBook += NUM(maxBattleStage.idleSkillPerHour) * hours * coef;
      expPool += NUM(maxBattleStage.idleExpPerHour) * hours * coef * 1000;
    }

    // 4. 贸易
    updatePorts();
    const routeSlots = 1 + (tradeLevel >= 2 ? 1 : 0) + (tradeLevel >= 5 ? 1 : 0);
    const activeShips = tradeShips.slice(0, Math.min(routeSlots, tradeShips.length));
    const tradeProfit = tradeDailyProfit(tradeLevel, ports.length, activeShips);
    gold += tradeProfit;
    // 经验按比例累计，余数保留，避免早期利润不足 1000 时永远拿不到经验
    tradeExp += (tradeProfit / 1000) * E.trade_exp_per_1000;
    const levelExpPow = E.trade_level_exp_pow ?? 1;
    while (
      tradeLevel < E.trade_level_max &&
      tradeExp >= E.trade_level_exp_base * Math.pow(tradeLevel, levelExpPow)
    ) {
      tradeExp -= E.trade_level_exp_base * Math.pow(tradeLevel, levelExpPow);
      tradeLevel++;
      updatePorts();
      claimTasks();
    }

    // 5. 任务钻石
    diamond += 200; // 每日任务
    diamond += 600 / 7; // 每周任务摊平

    // 6. 养成
    spendExp();
    spendShards();
    payTech();
    tryRemodel();
    tryBuyTradeShip();
    claimTasks();
    updatePorts();

    // 7. 记录
    const totalGoldIncome = NUM(maxBattleStage?.idleGoldPerHour || 0) * (E.idle_offline_cap_hours + 2) + tradeProfit;
    daily.push({
      day,
      chapter,
      cleared,
      power: Math.round(fleetPower(main, flagship)),
      gold: Math.round(gold),
      diamond: Math.round(diamond),
      pulls: totalPulls,
      ss: ssCount,
      tradeLevel,
      ports: ports.length,
      tradeShare: totalGoldIncome > 0 ? tradeProfit / totalGoldIncome : 0,
      techTier,
      avgLevel: Math.round(avg(main.map((s) => s.level)) * 10) / 10,
      avgStar: Math.round(avg(main.map((s) => s.star)) * 10) / 10,
    });
  }

  return { daily, paidPulls, totalPulls, ssCount, tradeLevel, ports, chapter, cleared, gold, diamond, claimed };
}

// ---------- 多轮蒙特卡洛 ----------
const args = process.argv.slice(2);
const runsArg = args.indexOf('--runs');
const seedArg = args.indexOf('--seed');
const RUNS = runsArg >= 0 ? Number(args[runsArg + 1]) : 200;
const SEED = seedArg >= 0 ? Number(args[seedArg + 1]) : 1;

const runs = [];
for (let i = 0; i < RUNS; i++) runs.push(simulate(SEED + i));

const base = runs[0];
const pick = (day) => base.daily[day - 1];
const ssValues = runs.map((r) => r.ssCount);
const pullValues = runs.map((r) => r.totalPulls);

function row(d) {
  return `| ${d.day} | ${d.chapter} | ${d.cleared} | ${fmt(d.power)} | ${fmt(d.gold)} | ${fmt(d.diamond)} | ${d.pulls} | ${d.ss} | ${d.tradeLevel} | ${d.ports} | ${(d.tradeShare * 100).toFixed(0)}% | ${d.avgLevel} | ${d.avgStar} |`;
}

console.log('# 《群星海战》30 天经济模拟\n');
console.log(`> 种子 ${SEED}，${RUNS} 轮蒙特卡洛；数值来自 Config_CSV，均为初始值。\n`);
console.log('| 天 | 章节 | 已通关 | 战力 | 金币 | 钻石 | 累计抽 | SS | 贸易等级 | 港口 | 贸易占比 | 平均等级 | 平均星级 |');
console.log('|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const d of [1, 3, 7, 14, 21, 30]) {
  if (base.daily[d - 1]) console.log(row(base.daily[d - 1]));
}

console.log('\n## 目标对照\n');
console.log('| 时间点 | 目标 | 实际 |');
console.log('|---|---|---|');
const targets = [
  [7, '通关第 2 章 / 3 港 / 约 40 抽 / 1-2 SS', `${pick(7).chapter >= 2 ? '第 2 章' : `第 ${pick(7).chapter} 章`} / ${pick(7).ports} 港 / ${pick(7).pulls} 抽 / ${pick(7).ss} SS`],
  [14, '通关第 3 章 / 4 港 / 约 70 抽 / 2-3 SS', `${pick(14).chapter >= 3 ? '第 3 章' : `第 ${pick(14).chapter} 章`} / ${pick(14).ports} 港 / ${pick(14).pulls} 抽 / ${pick(14).ss} SS`],
  [30, '通关第 5 章 / 4 港（P1 范围）/ 约 130 抽 / 3-4 SS', `${pick(30).chapter >= 5 ? '第 5 章' : `第 ${pick(30).chapter} 章`} / ${pick(30).ports} 港（v1 全量）/ ${pick(30).pulls} 抽 / ${pick(30).ss} SS`],
];
for (const [day, target, actual] of targets) console.log(`| 第 ${day} 天 | ${target} | ${actual} |`);

const ssMean = avg(ssValues);
const ssMin = Math.min(...ssValues);
const ssMax = Math.max(...ssValues);
const pullMean = avg(pullValues);
console.log(`\nSS 分布（${RUNS} 轮）：均值 ${ssMean.toFixed(2)}，范围 ${ssMin}–${ssMax}`);
console.log(`累计抽数：均值 ${pullMean.toFixed(1)}，范围 ${Math.min(...pullValues)}–${Math.max(...pullValues)}`);

// ---------- 告警 ----------
const warnings = [];
if (pick(7).chapter < 2) warnings.push('第 7 天未到第 2 章，推图偏慢。');
if (pick(14).chapter < 3) warnings.push('第 14 天未到第 3 章，推图偏慢。');
if (pick(30).chapter < 5) warnings.push('第 30 天未到第 5 章，推图偏慢。');
if (pick(7).ports < 3) warnings.push('第 7 天不足 3 港：贸易等级或推图解锁偏慢。');
if (pick(14).ports < 4) warnings.push('第 14 天不足 4 港。');
if (pullMean < 120) warnings.push(`30 天累计抽数均值 ${pullMean.toFixed(1)}，低于目标约 130。`);
if (ssMean < 3) warnings.push(`30 天 SS 均值 ${ssMean.toFixed(2)}，低于目标 3-4。`);
if (base.daily.some((d) => d.gold < 0)) warnings.push('金币出现负数。');
if (base.daily[29].tradeLevel <= 2) {
  warnings.push(`贸易等级 30 天仅 ${base.daily[29].tradeLevel} 级：按“每 1000 金币 = 1 经验、升级需 1000×n 经验”，升级过慢，与“第 7 天 3 港”冲突。`);
}
if (base.daily[29].tradeShare < 0.3) {
  warnings.push(`贸易收入占比 ${(base.daily[29].tradeShare * 100).toFixed(0)}%，低于 30% 目标；贸易与战斗未形成互相喂养。`);
}

console.log('\n## 告警\n');
if (warnings.length === 0) console.log('无。');
else for (const w of warnings) console.log(`- ${w}`);

console.log('\n## 建议\n');
console.log(`- 贸易经验：当前 base=${E.trade_level_exp_base}、pow=${E.trade_level_exp_pow ?? 1}，n→n+1 需 base×n^pow 经验；若达不到“第 7 天 3 港”，优先调 base，而不是改目标。`);
console.log(`- 每港每日交易额上限 ${E.trade_daily_cap_per_level}×贸易等级；若贸易占比低于 30%，先确认单船载重是否吃满，再考虑提高上限。`);
console.log('- 以上都是【暂】初始值；改表后重跑 `node Tools/economy_sim.mjs`。');
