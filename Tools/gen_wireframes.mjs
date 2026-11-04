// 生成 14 个 UI 线框（SVG）与索引。运行：node Tools/gen_wireframes.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'Docs', 'wireframes');
fs.mkdirSync(OUT, { recursive: true });

const W = 390;
const H = 844;
const C = {
  bg: '#0B1B2B',
  panel: '#12293F',
  panel2: '#173650',
  line: '#2A4A66',
  text: '#E6F1FF',
  dim: '#8FB3CC',
  accent: '#4FC3F7',
  gold: '#F2C14E',
  red: '#FF6B6B',
  green: '#5FD38D',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function rect(x, y, w, h, fill = C.panel, stroke = C.line, r = 8) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
}
function text(x, y, s, size = 14, fill = C.text, weight = 400, anchor = 'start') {
  return `<text x="${x}" y="${y}" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}">${esc(s)}</text>`;
}
function line(x1, y1, x2, y2, stroke = C.line) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="1"/>`;
}
function button(x, y, w, h, label, fill = C.accent, color = '#062033') {
  return `${rect(x, y, w, h, fill, fill, 10)}${text(x + w / 2, y + h / 2 + 5, label, 15, color, 700, 'middle')}`;
}
function bar(x, y, w, h, pct, fill = C.accent) {
  return `${rect(x, y, w, h, C.panel2, C.line, h / 2)}${rect(x, y, Math.max(2, w * pct), h, fill, fill, h / 2)}`;
}

function frame(title, subtitle, blocks, nav = true) {
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  parts.push(rect(0, 0, W, H, C.bg, C.bg, 0));
  parts.push(text(20, 44, title, 20, C.text, 700));
  if (subtitle) parts.push(text(20, 66, subtitle, 12, C.dim));
  parts.push(line(0, 78, W, 78));
  for (const b of blocks) parts.push(b);
  if (nav) {
    parts.push(line(0, 780, W, 780));
    const items = ['主港', '推图', '贸易', '抽卡', '基地'];
    items.forEach((label, i) => {
      const x = 20 + i * 74;
      parts.push(rect(x, 794, 54, 34, i === 0 ? C.panel2 : C.panel, C.line, 8));
      parts.push(text(x + 27, 816, label, 12, i === 0 ? C.accent : C.dim, i === 0 ? 700 : 400, 'middle'));
    });
  }
  parts.push('</svg>');
  return parts.join('\n');
}

const screens = [];

// 1 主港
screens.push({
  file: '01-main-port.svg',
  title: '主港',
  subtitle: '启动后 · 系统入口 / 红点 / 离线收益弹窗',
  blocks: [
    rect(20, 92, 350, 54, C.panel2),
    text(34, 116, '金币 12,480', 14, C.gold, 700),
    text(160, 116, '钻石 1,500', 14, C.accent, 700),
    text(280, 116, '材料 320', 13, C.dim),
    text(34, 136, '基地 Lv.3 · 贸易 Lv.2 · 战力 8,420', 11, C.dim),
    rect(20, 160, 170, 110, C.panel2), text(34, 188, '推图', 18, C.text, 700), text(34, 212, '第 2 章 · 1-4', 12, C.dim), text(34, 248, '继续 →', 13, C.accent),
    rect(200, 160, 170, 110, C.panel2), text(214, 188, '贸易', 18, C.text, 700), text(214, 212, '2 艘待收', 12, C.gold), text(214, 248, '收船 →', 13, C.accent),
    rect(20, 284, 170, 110, C.panel2), text(34, 312, '抽卡', 18, C.text, 700), text(34, 336, '保底 62 / 90', 12, C.dim), text(34, 372, '招募 →', 13, C.accent),
    rect(200, 284, 170, 110, C.panel2), text(214, 312, '基地', 18, C.text, 700), text(214, 336, '升级完成', 12, C.green), text(214, 372, '查看 →', 13, C.accent),
    rect(20, 408, 110, 74), text(75, 438, '舰船', 15, C.text, 700, 'middle'), text(75, 460, '养成', 11, C.dim, 400, 'middle'),
    rect(140, 408, 110, 74), text(195, 438, '舰长', 15, C.text, 700, 'middle'), text(195, 460, '6 / 8', 11, C.dim, 400, 'middle'),
    rect(260, 408, 110, 74), text(315, 438, '任务', 15, C.text, 700, 'middle'), text(315, 460, '3 个红点', 11, C.red, 400, 'middle'),
    rect(20, 496, 350, 120, C.panel2),
    text(34, 524, '图鉴 / 合击', 16, C.text, 700),
    text(34, 550, '图鉴：15 艘战舰 · 8 名舰长', 12, C.dim),
    text(34, 572, '合击：4 对 · 已激活 1 对', 12, C.dim),
    button(250, 536, 100, 36, '打开', C.panel, C.accent),
    rect(20, 630, 350, 70, C.panel, C.red),
    text(34, 658, '离线收益待领取', 15, C.red, 700),
    text(34, 680, '离开 2 小时 14 分', 12, C.dim),
    button(250, 646, 100, 36, '领取', C.gold),
  ],
});

// 2 离线收益
screens.push({
  file: '02-offline-reward.svg',
  title: '离线收益',
  subtitle: '启动时 · 离线时长 / 产出 / 领取',
  blocks: [
    rect(20, 100, 350, 560, C.panel2),
    text(195, 140, '欢迎回港', 22, C.text, 700, 'middle'),
    text(195, 168, '离线时长 2 小时 14 分', 13, C.dim, 400, 'middle'),
    text(195, 192, '（8 小时上限内）', 11, C.dim, 400, 'middle'),
    line(40, 210, 350, 210),
    ...[
      ['金币', '+13,420', C.gold],
      ['经验书', '+224', C.text],
      ['材料', '+89', C.text],
      ['通用碎片', '+112', C.text],
      ['技能书', '+22', C.text],
    ].map(([k, v, col], i) => {
      const y = 240 + i * 52;
      return `${text(48, y, k, 15, C.dim)}${text(340, y, v, 17, col, 700, 'end')}`;
    }),
    text(195, 530, '战力系数 0.86 · 挂机关卡 2-4', 12, C.dim, 400, 'middle'),
    button(60, 570, 270, 52, '领取', C.gold),
    text(195, 640, '提示：在线挂机不受 8 小时上限限制', 11, C.dim, 400, 'middle'),
  ],
});

// 3 推图地图
screens.push({
  file: '03-stage-map.svg',
  title: '推图地图',
  subtitle: '主港 · 章节 / 节点 / 星级',
  blocks: [
    ...[1, 2, 3, 4, 5].map((n, i) => {
      const x = 20 + i * 70;
      return `${rect(x, 92, 62, 40, n === 2 ? C.panel2 : C.panel, n === 2 ? C.accent : C.line, 8)}${text(x + 31, 117, `第 ${n} 章`, 12, n === 2 ? C.accent : C.dim, n === 2 ? 700 : 400, 'middle')}`;
    }),
    text(20, 160, '第 2 章 · 迷雾航线', 16, C.text, 700),
    text(20, 180, '推荐战力 4,200', 12, C.dim),
    ...[
      [1, 2, 3], [2, 3, 0], [3, 1, 0], [4, 0, 0], [5, 0, 0], [6, 0, 0],
    ].map(([node, stars, elite], i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 30 + col * 115;
      const y = 210 + row * 120;
      const fill = stars > 0 ? C.panel2 : C.panel;
      return `${rect(x, y, 100, 92, fill, stars > 0 ? C.accent : C.line, 10)}
        ${text(x + 50, y + 30, `${2}-${node}`, 16, C.text, 700, 'middle')}
        ${text(x + 50, y + 52, elite ? '精英' : '战斗', 11, elite ? C.gold : C.dim, 400, 'middle')}
        ${text(x + 50, y + 76, '★'.repeat(stars) + '☆'.repeat(3 - stars), 15, C.gold, 400, 'middle')}`;
    }),
    rect(20, 470, 350, 120, C.panel2),
    text(34, 498, '节点 2-7 · BOSS', 16, C.text, 700),
    text(34, 522, '敌方战力 5,040 · 目标 20 回合', 12, C.dim),
    text(34, 544, '首通：钻石 400 · 图纸 3', 12, C.gold),
    button(250, 520, 100, 40, '挑战', C.accent),
    rect(20, 606, 350, 90, C.panel),
    text(34, 634, '挂机关卡：2-4', 14, C.text, 700),
    text(34, 656, '每小时 金币 1,176 · 经验 20 · 材料 8', 11, C.dim),
    button(250, 630, 100, 36, '切换', C.panel, C.accent),
    text(20, 724, '3★ 后可扫荡 · 每日 10 次', 11, C.dim),
  ],
});

// 4 编队
screens.push({
  file: '04-formation.svg',
  title: '编队',
  subtitle: '6+1 站位 / 同系加成 / 战力',
  blocks: [
    text(20, 104, '前排', 13, C.dim, 700),
    ...[0, 1, 2].map((i) => `${rect(20 + i * 118, 116, 108, 100, C.panel2)}${text(74 + i * 118, 152, ['铁锚号', '堡垒', '重锤'][i], 14, C.text, 700, 'middle')}${text(74 + i * 118, 176, 'Lv.12 · 3★', 11, C.dim, 400, 'middle')}${text(74 + i * 118, 198, '战力 1,240', 11, C.accent, 400, 'middle')}`),
    text(20, 246, '后排', 13, C.dim, 700),
    ...[0, 1, 2].map((i) => `${rect(20 + i * 118, 258, 108, 100, C.panel2)}${text(74 + i * 118, 294, ['蓝翼', '天空', '翡翠'][i], 14, C.text, 700, 'middle')}${text(74 + i * 118, 318, 'Lv.12 · 3★', 11, C.dim, 400, 'middle')}${text(74 + i * 118, 340, '战力 1,120', 11, C.accent, 400, 'middle')}`),
    rect(20, 376, 350, 84, C.panel),
    text(34, 402, '旗舰位', 14, C.gold, 700),
    text(34, 426, '铁壁（SS）· 全队 HP/ATK +5%', 12, C.text),
    text(34, 446, '旗舰不配舰长，不参与战斗', 11, C.dim),
    rect(20, 476, 350, 96, C.panel2),
    text(34, 502, '同系加成', 14, C.text, 700),
    text(34, 526, '铁锚 2 / 蓝潮 2 / 赤潮 1 / 翡翠 1', 12, C.dim),
    text(34, 548, '未达 3 人 → 混编：全队 HP/ATK/DEF +4%', 12, C.green),
    rect(20, 588, 350, 72, C.panel),
    text(34, 616, '总战力', 14, C.dim),
    text(340, 620, '8,420', 24, C.accent, 700, 'end'),
    text(34, 642, '推荐战力 4,200 · 可通关', 11, C.green),
    button(20, 690, 170, 48, '保存编队', C.accent),
    button(200, 690, 170, 48, '一键上阵', C.panel, C.accent),
  ],
});

// 5 战斗
screens.push({
  file: '05-battle.svg',
  title: '战斗',
  subtitle: '行动条 / 怒气 / 速度键 / 自动开关',
  blocks: [
    rect(20, 92, 350, 18, C.panel2), rect(20, 92, 210, 18, C.green, C.green, 9),
    text(20, 128, '我方 6 / 6', 12, C.green),
    text(370, 128, '敌方 3 / 3', 12, C.red, 400, 'end'),
    ...[0, 1, 2].map((i) => `${rect(30 + i * 112, 150, 96, 70, C.panel2)}${text(78 + i * 112, 180, ['铁锚号', '堡垒', '重锤'][i], 12, C.text, 700, 'middle')}${bar(44 + i * 112, 196, 68, 8, 0.8, C.green)}`),
    ...[0, 1, 2].map((i) => `${rect(30 + i * 112, 300, 96, 70, C.panel, C.red)}${text(78 + i * 112, 330, ['重装舰', '炮艇', '集群舰'][i], 12, C.text, 700, 'middle')}${bar(44 + i * 112, 346, 68, 8, 0.55, C.red)}`),
    rect(20, 410, 350, 120, C.panel2),
    text(34, 438, '行动条', 13, C.dim, 700),
    ...[0, 1, 2, 3, 4].map((i) => `${rect(34 + i * 66, 452, 54, 54, C.panel, i === 0 ? C.accent : C.line, 8)}${text(61 + i * 66, 486, i === 0 ? '铁锚' : '—', 10, i === 0 ? C.accent : C.dim, 400, 'middle')}`),
    text(34, 520, '下一位：铁锚号 · 怒气 100 / 100', 11, C.dim),
    rect(20, 546, 350, 100, C.panel),
    text(34, 574, '怒气技能', 13, C.dim, 700),
    text(34, 600, '钢铁壁垒：嘲讽 2 回合，减伤 +30%', 12, C.text),
    bar(34, 616, 322, 10, 1, C.gold),
    text(34, 646, '点击释放 · 自动战斗中自动施放', 11, C.dim),
    button(20, 670, 80, 44, '×1', C.panel, C.dim),
    button(110, 670, 80, 44, '×2', C.panel, C.dim),
    button(200, 670, 80, 44, '×3', C.accent),
    button(290, 670, 80, 44, '自动', C.green),
    text(20, 742, '回合 4 / 30 · 目标 15 回合内通关', 12, C.dim),
  ],
});

// 6 结算
screens.push({
  file: '06-result.svg',
  title: '结算',
  subtitle: '战斗后 · 星级 / 掉落 / 升级',
  blocks: [
    text(195, 150, '★★★', 42, C.gold, 700, 'middle'),
    text(195, 184, '战斗胜利', 22, C.text, 700, 'middle'),
    text(195, 210, '第 2-4 关 · 12 回合', 12, C.dim, 400, 'middle'),
    rect(20, 236, 350, 250, C.panel2),
    text(34, 264, '掉落', 15, C.text, 700),
    ...[
      ['金币', '+1,240'],
      ['经验书', '+6'],
      ['材料', '+8'],
      ['通用碎片', '+4'],
      ['装备箱', '+1'],
    ].map(([k, v], i) => `${text(48, 296 + i * 34, k, 13, C.dim)}${text(340, 296 + i * 34, v, 14, C.text, 700, 'end')}`),
    rect(20, 502, 350, 100, C.panel),
    text(34, 530, '舰船升级', 14, C.text, 700),
    text(34, 554, '铁锚号 Lv.12 → Lv.13', 12, C.dim),
    bar(34, 570, 322, 10, 0.72, C.accent),
    text(34, 596, '经验 7,200 / 10,000', 11, C.dim),
    button(20, 630, 170, 50, '再次挑战', C.accent),
    button(200, 630, 170, 50, '返回地图', C.panel, C.accent),
    text(195, 712, '首通奖励已领取 · 3★ 解锁扫荡', 11, C.green, 400, 'middle'),
  ],
});

// 7 贸易
screens.push({
  file: '07-trade.svg',
  title: '贸易',
  subtitle: '港口 / 航线 / 船队 / 价格 / 收船',
  blocks: [
    ...[0, 1, 2].map((i) => `${rect(20 + i * 118, 92, 108, 38, i === 0 ? C.panel2 : C.panel, i === 0 ? C.accent : C.line, 8)}${text(74 + i * 118, 116, ['晨曦港', '铁锚港', '蓝潮港'][i], 12, i === 0 ? C.accent : C.dim, 400, 'middle')}`),
    text(20, 158, '晨曦港 · 特产 粮食 / 木材', 14, C.text, 700),
    text(20, 178, '紧缺 铁矿 / 丝绸 · 今日交易额 1,200 / 5,000', 11, C.dim),
    rect(20, 196, 350, 150, C.panel2),
    text(34, 222, '航线：晨曦港 ⇄ 铁锚港', 14, C.text, 700),
    text(34, 246, '单程 30 分 · 往返 60 分 · 风险 5%', 11, C.dim),
    text(34, 268, '海盗战力 800 · 基础运费 50', 11, C.dim),
    text(34, 296, '去程货：粮食 ×100', 12, C.text),
    text(34, 318, '返程预算：5,000 金币', 12, C.text),
    text(34, 338, '护航：堡垒（战力 1,120）', 12, C.green),
    rect(20, 360, 350, 80, C.panel),
    text(34, 388, '贸易船 1 / 3 · 航线槽位 1 / 3', 13, C.text, 700),
    text(34, 412, '小型贸易船 · 载重 100 · 航速 1.0', 11, C.dim),
    button(250, 382, 100, 36, '派出', C.accent),
    rect(20, 456, 350, 120, C.panel2, C.gold),
    text(34, 484, '待收船', 15, C.gold, 700),
    text(34, 508, '中型贸易船 · 已回港', 12, C.text),
    text(34, 530, '预计利润 +2,480 金币', 12, C.green),
    button(250, 492, 100, 40, '收船', C.gold),
    text(20, 606, '其他航线', 13, C.dim, 700),
    ...[0, 1].map((i) => `${rect(20, 620 + i * 58, 350, 48, C.panel)}${text(34, 650 + i * 58, ['铁锚港 ⇄ 蓝潮港', '晨曦港 ⇄ 蓝潮港'][i], 12, C.text)}${text(340, 650 + i * 58, ['风险 10%', '风险 8%'][i], 11, C.dim, 400, 'end')}`),
    text(20, 752, '一次往返后需手动收船，不自动循环', 11, C.dim),
  ],
});

// 8 设置
screens.push({
  file: '08-settings.svg',
  title: '设置',
  subtitle: '速度与音量 / 存档导出与导入',
  blocks: [
    rect(20, 100, 350, 90, C.panel2),
    text(34, 128, '战斗速度', 14, C.text, 700),
    ...[0, 1, 2].map((i) => button(160 + i * 66, 112, 56, 36, ['×1', '×2', '×3'][i], i === 2 ? C.accent : C.panel, i === 2 ? '#062033' : C.dim)),
    text(34, 172, '默认 ×3，可在战斗中随时切换', 11, C.dim),
    rect(20, 204, 350, 110, C.panel2),
    text(34, 232, '音量', 14, C.text, 700),
    text(34, 258, 'BGM', 12, C.dim),
    bar(90, 250, 250, 10, 0.7, C.accent),
    text(34, 292, 'SFX', 12, C.dim),
    bar(90, 284, 250, 10, 0.8, C.accent),
    rect(20, 328, 350, 160, C.panel2),
    text(34, 356, '存档', 14, C.text, 700),
    text(34, 382, '上次保存：2026-11-03 15:42', 11, C.dim),
    button(34, 400, 150, 40, '导出存档', C.panel, C.accent),
    button(200, 400, 150, 40, '导入存档', C.panel, C.accent),
    text(34, 466, '导入前会自动备份当前存档', 11, C.dim),
    rect(20, 502, 350, 110, C.panel),
    text(34, 530, '关于', 14, C.text, 700),
    text(34, 554, '《群星海战》v0.1.0 · 单机离线', 12, C.dim),
    text(34, 576, '存档 schema v1 · 构建 2026-11-03', 11, C.dim),
    text(34, 598, '免费 Apple ID 自签，7 天需重签', 11, C.gold),
  ],
});

// 9 舰船养成
screens.push({
  file: '09-ship-growth.svg',
  title: '舰船养成',
  subtitle: '主港 · 等级 / 星级 / 改造 / 技能',
  blocks: [
    rect(20, 96, 110, 130, C.panel2),
    text(75, 150, '铁锚号', 14, C.text, 700, 'middle'),
    text(75, 174, 'B · 铁锚联邦', 11, C.dim, 400, 'middle'),
    text(75, 200, 'Lv.12 · 3★', 11, C.accent, 400, 'middle'),
    rect(146, 96, 224, 130, C.panel2),
    text(162, 122, '战力 1,240', 18, C.accent, 700),
    text(162, 148, 'HP 2,080 / ATK 208 / DEF 104', 11, C.dim),
    text(162, 170, 'SPD 95 / 暴击 5% / 暴伤 150%', 11, C.dim),
    text(162, 196, '改造 0 阶 · 等级上限 30', 11, C.gold),
    ...[0, 1, 2, 3].map((i) => `${rect(20 + i * 88, 242, 80, 38, i === 0 ? C.panel2 : C.panel, i === 0 ? C.accent : C.line, 8)}${text(60 + i * 88, 266, ['等级', '星级', '改造', '技能'][i], 12, i === 0 ? C.accent : C.dim, 400, 'middle')}`),
    rect(20, 296, 350, 150, C.panel2),
    text(34, 324, '等级 12 → 13', 15, C.text, 700),
    bar(34, 340, 322, 12, 0.72, C.accent),
    text(34, 372, '经验 7,200 / 10,000', 12, C.dim),
    text(34, 398, '经验书 ×34（每本 1,000 经验）', 12, C.text),
    button(34, 414, 150, 40, '使用 1 本', C.panel, C.accent),
    button(200, 414, 150, 40, '升到上限', C.accent),
    rect(20, 466, 350, 110, C.panel),
    text(34, 494, '技能', 14, C.text, 700),
    text(34, 518, '钢铁壁垒 · Lv.3 / 10', 12, C.text),
    text(34, 540, '嘲讽 2 回合，自身减伤 +30%', 11, C.dim),
    text(34, 562, '技能书 ×22 · 升级需 3 本', 11, C.gold),
    button(20, 600, 170, 48, '升星', C.panel, C.accent),
    button(200, 600, 170, 48, '改造', C.panel, C.accent),
    text(20, 680, '升星碎片：20 × B 0.5 = 10', 11, C.dim),
    text(20, 702, '改造 1 阶：图纸 5 / 金币 2 万 / 材料 50', 11, C.dim),
  ],
});

// 10 装备管理
screens.push({
  file: '10-equipment.svg',
  title: '装备管理',
  subtitle: '舰船养成 · 穿戴 / 强化 / 背包容量',
  blocks: [
    text(20, 104, '铁锚号 · 槽位 3 / 6', 15, C.text, 700),
    ...[0, 1, 2, 3, 4, 5].map((i) => {
      const x = 20 + (i % 3) * 118;
      const y = 118 + Math.floor(i / 3) * 90;
      const filled = i < 3;
      return `${rect(x, y, 108, 78, filled ? C.panel2 : C.panel, filled ? C.accent : C.line, 8)}${text(x + 54, y + 30, ['主炮', '副炮', '防空', '鱼雷', '设备', '舰载机'][i], 12, filled ? C.text : C.dim, 400, 'middle')}${text(x + 54, y + 52, filled ? ['主炮·A +5', '副炮·B +3', '防空·A +2'][i] : '空', 10, filled ? C.accent : C.dim, 400, 'middle')}`;
    }),
    rect(20, 310, 350, 120, C.panel2),
    text(34, 338, '主炮·A +5', 16, C.text, 700),
    text(34, 362, 'ATK +32 · 暴击率 +1.6%', 12, C.accent),
    text(34, 384, '强化 +5 → +6：金币 1,240 · 材料 10', 12, C.dim),
    button(250, 348, 100, 40, '强化', C.accent),
    text(34, 412, '替换装备会返还旧装备，不消耗', 11, C.dim),
    text(20, 460, '背包 24 / 100', 13, C.dim, 700),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const x = 20 + (i % 4) * 88;
      const y = 476 + Math.floor(i / 4) * 84;
      return `${rect(x, y, 78, 72, C.panel)}${text(x + 39, y + 30, ['主炮', '鱼雷', '设备', '舰载机', '副炮', '防空', '主炮', '设备'][i], 10, C.dim, 400, 'middle')}${text(x + 39, y + 50, ['B', 'A', 'B', 'S', 'B', 'A', 'B', 'A'][i], 11, C.accent, 700, 'middle')}`;
    }),
    text(20, 690, '装备箱：抽卡 / 推图掉落 · 重复转强化材料', 11, C.dim),
  ],
});

// 11 抽卡
screens.push({
  file: '11-gacha.svg',
  title: '抽卡',
  subtitle: '三个卡池 / 保底进度 / 记录',
  blocks: [
    ...[0, 1, 2].map((i) => `${rect(20 + i * 118, 92, 108, 38, i === 0 ? C.panel2 : C.panel, i === 0 ? C.accent : C.line, 8)}${text(74 + i * 118, 116, ['舰船', '舰长', '装备箱'][i], 12, i === 0 ? C.accent : C.dim, 400, 'middle')}`),
    rect(20, 144, 350, 170, C.panel2),
    text(195, 186, '舰船常驻池', 20, C.text, 700, 'middle'),
    text(195, 212, 'SS 2% · S 10% · A 38% · B 50%', 11, C.dim, 400, 'middle'),
    text(195, 252, '保底进度 62 / 90', 14, C.gold, 700, 'middle'),
    bar(50, 266, 290, 12, 62 / 90, C.gold),
    text(195, 300, '75 抽起 SS 概率逐抽上升', 11, C.dim, 400, 'middle'),
    rect(20, 330, 350, 100, C.panel),
    text(34, 358, 'UP：血鲨（限定池）', 14, C.text, 700),
    text(34, 382, '出 SS 时 50% 为 UP，歪了下一个 SS 必为 UP', 11, C.dim),
    text(34, 404, '大保底：未触发', 11, C.green),
    button(20, 452, 170, 56, '单抽 150 钻', C.panel, C.accent),
    button(200, 452, 170, 56, '十连 1,500 钻', C.accent),
    rect(20, 530, 350, 90, C.panel2, C.gold),
    text(34, 558, '新手选择券', 15, C.gold, 700),
    text(34, 582, '3 选 1：铁壁 / 苍穹 / 晨星', 12, C.text),
    text(34, 604, '血鲨仅卡池获取', 11, C.dim),
    button(250, 556, 100, 40, '选择', C.gold),
    text(20, 650, '新手池：免费 10 连 · 第 10 抽必出 S+', 12, C.green),
    text(20, 674, '各池保底计数独立，写入存档', 11, C.dim),
    text(20, 696, '最近记录：A 天空 · B 赤影 · S 海鸥', 11, C.dim),
  ],
});

// 12 基地
screens.push({
  file: '12-base.svg',
  title: '基地',
  subtitle: '四类建筑 / 升级队列 / 贸易船购买',
  blocks: [
    rect(20, 96, 350, 60, C.panel2),
    text(34, 122, '基地 Lv.3', 16, C.text, 700),
    text(34, 144, '建筑等级上限 3 · 升级队列 1 / 1', 11, C.dim),
    ...[
      ['船坞', 'Lv.3', '船位 24 · 可购买中型贸易船'],
      ['研究所', 'Lv.2', '改造 1 阶 · 科技 2 项'],
      ['仓库', 'Lv.3', '资源上限 30,000'],
      ['贸易所', 'Lv.2', '运费 −4% · 港口解锁'],
    ].map(([name, lv, desc], i) => {
      const y = 172 + i * 96;
      return `${rect(20, y, 350, 84, C.panel2)}${text(34, y + 28, name, 15, C.text, 700)}${text(120, y + 28, lv, 12, C.accent, 700)}${text(34, y + 52, desc, 11, C.dim)}${button(260, y + 22, 96, 36, '升级', C.panel, C.accent)}`;
    }),
    rect(20, 564, 350, 100, C.panel, C.gold),
    text(34, 592, '升级队列', 14, C.gold, 700),
    text(34, 616, '船坞 Lv.3 → Lv.4 · 剩余 12:34', 12, C.text),
    bar(34, 632, 322, 10, 0.62, C.gold),
    text(34, 658, '同时只能升级 1 座建筑 · 离线继续', 11, C.dim),
    rect(20, 680, 350, 70, C.panel2),
    text(34, 708, '购买贸易船', 14, C.text, 700),
    text(34, 730, '中型 5 万金币（贸易 Lv.3 解锁）', 11, C.dim),
    button(260, 696, 96, 36, '购买', C.panel, C.accent),
  ],
});

// 13 舰长管理
screens.push({
  file: '13-captain.svg',
  title: '舰长管理',
  subtitle: '舰船养成 · 分配 / 升级 / 星级',
  blocks: [
    text(20, 104, '已上阵 6 / 8 · 旗舰无舰长', 13, C.dim),
    ...[
      ['霍克', 'S · 铁锚', '铁壁指挥 · 全队减伤 +5%'],
      ['艾琳', 'S · 蓝潮', '航空指挥 · 全队攻击 +5%'],
      ['赤羽', 'S · 赤潮', '鱼雷指挥 · 全队暴击 +3%'],
      ['青岚', 'S · 翡翠', '医疗指挥 · 全队治疗 +10%'],
    ].map(([name, q, skill], i) => {
      const y = 124 + i * 92;
      return `${rect(20, y, 350, 80, C.panel2)}${rect(34, y + 14, 52, 52, C.panel)}${text(60, y + 46, name[0], 20, C.accent, 700, 'middle')}${text(100, y + 28, name, 14, C.text, 700)}${text(160, y + 28, q, 11, C.dim)}${text(100, y + 50, skill, 11, C.dim)}${text(340, y + 28, 'Lv.4 · 2★', 11, C.gold, 400, 'end')}${button(270, y + 42, 86, 28, '查看', C.panel, C.accent)}`;
    }),
    rect(20, 504, 350, 110, C.panel),
    text(34, 532, '备选舰长 2 / 8', 14, C.text, 700),
    text(34, 556, '格雷（A · 铁锚）· 锚定：自身防御 +10%', 11, C.dim),
    text(34, 578, '海伦（A · 蓝潮）· 精准空袭：后排攻击 +8%', 11, C.dim),
    text(34, 600, '同阵营 +5% · 等级上限 10 · 星级 6★', 11, C.gold),
    button(20, 636, 170, 48, '分配舰长', C.accent),
    button(200, 636, 170, 48, '升级', C.panel, C.accent),
    text(20, 714, '换舰长时技能强化失效，不消耗技能书', 11, C.dim),
  ],
});

// 14 每日任务与成就
screens.push({
  file: '14-tasks.svg',
  title: '每日任务与成就',
  subtitle: '主港 · 任务进度 / 领奖',
  blocks: [
    ...[0, 1, 2].map((i) => `${rect(20 + i * 118, 92, 108, 38, i === 0 ? C.panel2 : C.panel, i === 0 ? C.accent : C.line, 8)}${text(74 + i * 118, 116, ['每日', '每周', '成就'][i], 12, i === 0 ? C.accent : C.dim, 400, 'middle')}`),
    text(20, 156, '每日任务 · 200 钻 / 天', 14, C.text, 700),
    text(340, 156, '04:00 重置', 11, C.dim, 400, 'end'),
    ...[
      ['每日登录', '1 / 1', '40 钻', true],
      ['每日出击', '3 / 3', '40 钻', true],
      ['每日出航', '1 / 1', '40 钻', true],
      ['每日收获', '0 / 1', '40 钻', false],
      ['每日招募', '1 / 1', '40 钻', true],
    ].map(([name, prog, reward, done], i) => {
      const y = 174 + i * 70;
      return `${rect(20, y, 350, 60, C.panel2)}${text(34, y + 24, name, 13, C.text, 700)}${text(34, y + 44, prog, 11, done ? C.green : C.dim)}${text(180, y + 34, reward, 12, C.gold)}${button(270, y + 14, 86, 32, done ? '领取' : '进行中', done ? C.gold : C.panel, done ? '#062033' : C.dim)}`;
    }),
    rect(20, 536, 350, 90, C.panel),
    text(34, 564, '每周任务 · 600 钻 / 周', 14, C.text, 700),
    text(34, 588, '本周出击 9 / 15 · 贸易利润 3,200 / 5,000', 11, C.dim),
    text(34, 610, '每周推图 2 / 5', 11, C.dim),
    rect(20, 640, 350, 100, C.panel2),
    text(34, 668, '成就', 14, C.text, 700),
    text(34, 692, '通关第 2 章 · 200 钻（已领取）', 11, C.green),
    text(34, 714, '招募 50 次 · 150 钻（12 / 50）', 11, C.dim),
    button(20, 754, 350, 0, '', C.panel, C.panel),
  ],
});

const index = ['# UI 线框（14 个界面）\n', 'M0 线框基线，先画再做。每个文件是 390×844 的 iPhone 竖屏线框，深色海战风。\n', '| # | 界面 | 文件 |', '|---:|---|---|'];
for (const s of screens) {
  const svg = frame(s.title, s.subtitle, s.blocks, s.file !== '02-offline-reward.svg');
  fs.writeFileSync(path.join(OUT, s.file), svg, 'utf8');
  index.push(`| ${Number(s.file.slice(0, 2))} | ${s.title} | [${s.file}](${s.file}) |`);
}
index.push('\n> 新手选择券是弹窗、图鉴/合击是主港子面板，不单列界面。');
index.push('> 线框只表达信息层级与操作位置，不代表最终视觉。');
fs.writeFileSync(path.join(OUT, 'index.md'), index.join('\n') + '\n', 'utf8');
console.log(`generated ${screens.length} wireframes -> Docs/wireframes/`);
