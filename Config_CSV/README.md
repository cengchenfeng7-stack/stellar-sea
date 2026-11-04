# Config_CSV

《群星海战》v1 的全部数值配置。按设计文档 V3.3 第 20 章的表清单建立，**数值均为【暂】初始值**，用于 M0 管线与 M2 经济模拟，原型验证后再调。

## 约定

- 编码：UTF-8 **带 BOM**，行尾 CRLF；首行是表头，没有注释行。
- 一行为一个配置对象；`id` 全局唯一，用带前缀的字符串（`ship_`、`skill_`、`stage_`…）。
- 列表字段用 `|` 分隔（如 `slots`、`enemyLineup`、`specialtyGoods`）。
- 外键字段直接写目标表的 `id`；没有值写空字符串，不写 `null`。
- 布尔值用 `0` / `1`。
- 百分比字段统一用**百分数**（`5` 表示 5%），概率同理；倍率字段用小数（`0.08` 表示 8%）。
- 时间统一用**分钟**（`oneWayMinutes`、`costTimeMinutes`、`timeMinutes`）。
- 奖励字段格式：`物品:数量|物品:数量`，例如 `diamond:40|blueprint:1`。
- 枚举：
  - 品质 `B / A / S / SS`
  - 阵营 `anchor / blue / red / green / neutral / enemy`
  - 技能类型 `rage / passive / flagship / combo / exclusive`
  - 节点类型 `normal / elite / boss / event / treasure / port`
  - 任务类型 `daily / weekly / achievement / milestone`

## 表清单（20 张，631 行）

| 文件 | 行数 | 说明 |
|---|---:|---|
| `ship.csv` | 18 | 15 艘战舰 + 3 艘贸易船，用 `isTradeShip` 区分 |
| `skill.csv` | 34 | 4 阵营 ×3 模板 + 4 SS 专属 + 4 合击 + 8 舰长被动 + 6 敌方技能 |
| `captain.csv` | 8 | 每阵营 2 名（1 主推 + 1 备选） |
| `combo.csv` | 4 | 每阵营 1 对合击 |
| `equip.csv` | 24 | 6 槽 × 4 品质 |
| `buff.csv` | 17 | 战斗状态与瞬时效果标记 |
| `enemy.csv` | 15 | 5 类 ×2 变体 + 5 个章节 BOSS |
| `stage.csv` | 60 | 5 章 ×12 节点；1-1～1-10 为 M1 战斗关 |
| `loot.csv` | 99 | 每章普通/精英/BOSS 掉落 + 宝箱/事件/通用敌人/BOSS |
| `port.csv` | 8 | P1 先启用前 4 个 |
| `good.csv` | 7 | 粮食/木材/铁矿/丝绸/香料/火药/军械 |
| `route.csv` | 10 | 往返均 ≤8 小时；`route_newbie` 为 M1 演示航线 |
| `gacha.csv` | 5 | 舰船常驻/限定、舰长、装备箱、新手池 |
| `building.csv` | 50 | 5 类建筑 ×10 级 |
| `tech.csv` | 12 | 4 阶改造解锁 + 8 个全队被动 |
| `event.csv` | 3 | 风暴/海盗/宝藏 |
| `task.csv` | 22 | 每日 5 + 每周 3 + 贸易里程碑 4 + 成就 10 |
| `audio.csv` | 28 | 4 BGM + 24 SFX |
| `localization.csv` | 113 | 仅中文；含 14 个界面的 `screen.*` key |
| `economy.csv` | 94 | 起始资源、挂机、养成、战力、贸易、抽卡、目标曲线 |

## 校验

```powershell
node Tools/validate_config.mjs
```

检查内容：表完整性、id 唯一、外键、枚举、数值范围、掉落概率合计、技能槽位规则（B 1 / A-S 2 / SS 3）、合击对唯一性、15 战舰 / 3 贸易船 / 8 舰长 / 4 合击、品质分布 SS4/S4/A4/B3、每阵营 1 艘 SS、关卡敌人战力比（普通 70% / 精英 90% / BOSS 120%）、建筑成本与耗时曲线、科技前置无环、航线往返 ≤8 小时、抽卡概率合计与保底顺序、每日/每周/里程碑钻石合计。

**零报错才允许导入 Unity。** CI 与本地导入前各跑一次。

## 生成与修改

`Tools/gen_config_bootstrap.mjs` 只用于把 V3.3 的初始值一次性落成 CSV：

```powershell
node Tools/gen_config_bootstrap.mjs
```

> ⚠️ 该脚本会**覆盖** `Config_CSV/` 下的同名文件。开始手工调表后，以 CSV 为唯一事实来源：要么同步改脚本，要么不再运行脚本。建议 M1 起直接改 CSV，脚本保留作历史基线。

## 与其他文件的关系

- 规则与公式：`《群星海战》统一设计文档 V3.3.md`。
- 经济模拟：`Tools/economy_sim.mjs`（读取 `economy / stage / gacha / route / good / port`）。
- Unity 导入：CSV → ScriptableObject，导入前跑校验脚本。
