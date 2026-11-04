# 群星海战

单机离线 iOS 放置卡牌海战游戏。设计基线见 [`《群星海战》统一设计文档 V3.3.md`](./《群星海战》统一设计文档%20V3.3.md)。

## 目录

| 目录 | 内容 |
|---|---|
| `群星海战/` | Unity 工程（Unity 6.3 LTS，Universal 2D，URP 17.3.0） |
| `Config_CSV/` | 配置表，按设计文档第 20 章 schema |
| `Tools/` | 配置校验与经济模拟脚本 |
| `Docs/` | 线框与补充文档 |
| `.github/workflows/` | iOS 构建 CI |

## 打开工程

1. 用 Unity Hub 添加 `群星海战/`。
2. 编辑器版本：`6000.3.27f1`。
3. 渲染管线：Universal RP + 2D Renderer（`Assets/Settings/Renderer2D.asset`）。

Windows 只做 Editor 验证；iOS 构建走 GitHub Actions 的 macOS runner，**本机不需要 Mac**。

## 仓库

- GitHub：`https://github.com/cengchenfeng7-stack/stellar-sea`（公开）
- 默认分支：`main`
- 推送即触发 iOS 构建。

## 当前状态

- M0 进行中。
- 工程已从 3D URP 模板重建为干净的 Universal 2D 工程，旧的 3D 模板资产与 AI/导航等无关包已移除。
- `Config_CSV/`：20 张表 / 631 行初始值；`node Tools/validate_config.mjs` 全部通过。
- `Tools/economy_sim.mjs`：30 天经济模拟，第 7/14/30 天目标全部命中，无告警。
- `Docs/wireframes/`：14 张界面线框图（SVG）。
- Unity 侧：存档系统（含 schema 迁移与未知字段保留）+ 配置表运行时/导入管线；EditMode 测试 10/10 通过。
- iOS CI：Unity 许可证账号激活已跑通，Xcode 工程导出成功；未签名 IPA 打包在修路径后待验证。

没有 Mac 也能玩：

- 构建：GitHub Actions macOS runner。
- 安装：Windows + Sideloadly + 免费 Apple ID，见 [`Docs/Install-iPhone.md`](./Docs/Install-iPhone.md)。
- CI secrets：见 [`Docs/CI.md`](./Docs/CI.md)。

## 约定

- 所有数值最终落在 `Config_CSV`，文档只写规则与初始值。
- 修改设计必须升版本号并写入设计文档附录 B。
