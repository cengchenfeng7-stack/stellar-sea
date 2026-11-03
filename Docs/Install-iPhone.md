# 没有 Mac，怎么在 iPhone 上安装和游玩

结论：**不需要 Mac**。构建在 GitHub Actions 的 macOS runner 上完成，Windows 电脑只负责把 IPA 签到 iPhone 上。

整体链路：

```text
Windows + Unity Editor 开发
  → git push 到 GitHub
  → GitHub Actions（macOS runner）构建未签名 IPA
  → 下载 IPA 到 Windows
  → Sideloadly 用免费 Apple ID 签名并安装到 iPhone
```

## 一、构建：用 GitHub Actions 的 macOS runner

CI 已经配置好，见 `.github/workflows/ios-build.yml`。它会在 macOS runner 上：

1. 用 GameCI 调 Unity 导出 Xcode 工程。
2. 用 `xcodebuild` 编出未签名 `.app`。
3. 打包成未签名 `StellarSea-unsigned.ipa`，上传为 Actions artifact。

本机不需要安装 Xcode，也不需要 Mac。

前置条件：

- 代码推到 GitHub。
- 仓库配置 `UNITY_LICENSE`、`UNITY_EMAIL`、`UNITY_PASSWORD` 三个 secrets，见 [`CI.md`](./CI.md)。

> GitHub Actions 额度：公开仓库免费；私有仓库每月 2000 分钟，macOS runner 按 10 倍计费，约等于 200 分钟/月。个人项目每个里程碑构建一次通常够用；如果不够，可以把仓库设为公开或购买额外分钟。

## 二、安装：Windows + Sideloadly

### 需要准备

- Windows 电脑（就是现在这台）。
- iPhone 16 和 USB 线。
- 一个免费 Apple ID（建议专门用于自签，不要用主账号）。
- 软件：
  - [iTunes](https://www.apple.com/itunes/)：必须从 Apple 官网下载，**不要用 Microsoft Store 版**。
  - [iCloud](https://support.apple.com/downloads/icloud)：Windows 版。
  - [Sideloadly](https://sideloadly.io/)：免费。

### 步骤

1. 在 iPhone 上开启开发者模式：
   - 设置 → 隐私与安全性 → 开发者模式 → 打开。
   - 重启手机，解锁后确认开启。
2. 用 USB 连接 iPhone 和 Windows，手机上点「信任此电脑」。
3. 打开 Sideloadly，确认顶部已识别到 iPhone。
4. 把 `StellarSea-unsigned.ipa` 拖进 Sideloadly。
5. 输入 Apple ID 和密码，完成双重验证。
6. 点 `Start`，等待安装完成。
7. 在 iPhone 上信任开发者：
   - 设置 → 通用 → VPN 与设备管理 → 开发者 App → 点你的 Apple ID → 信任。
8. 打开游戏。

## 三、两台 iPhone 16

- 两台手机可以用**同一个 Apple ID**，每台各安装一次。
- 免费账号限制是每 7 天最多注册 3 台设备，两台没问题。
- 两台手机上的存档互相独立；游戏内应使用第 23 章的存档导出/导入来迁移。

## 四、免费 Apple ID 的限制

| 限制 | 免费 Apple ID | 付费开发者账号（$99/年） |
|---|---|---|
| 签名有效期 | 7 天 | 1 年 |
| 每台设备同时安装的侧载 App | 3 个 | 无此限制 |
| 每 7 天可注册 App ID | 10 个 | 更多 |
| 每 7 天可注册设备 | 3 台 | 100 台/年 |

对本项目来说，实际影响是：

- 游戏本体占 1 个侧载 App 名额。
- 7 天后 App 会打不开，需要重新签一次。
- 重新签时用**同一个 IPA、同一个 Apple ID、同一个 bundle ID** 覆盖安装，存档通常保留。
- 不要把 bundle ID 改来改去，否则会被当成另一个 App，存档不继承。

## 五、续签

### 手动续签

7 天到期前，用同一个 IPA、同一个 Apple ID 再走一次 Sideloadly，覆盖安装即可。

### 自动续签

Sideloadly 支持自动续签：

- 电脑和手机在同一 Wi-Fi，或保持 USB 连接。
- 在 Sideloadly 里开启自动续签守护进程。
- 电脑需要开机并运行 Sideloadly，手机需要能被发现。

如果嫌每周续签麻烦，可以后面再考虑 $99/年的 Apple Developer Program；它把有效期变成 1 年，并取消 3 个 App 的限制。

## 六、常见问题

**Sideloadly 检测不到手机**

- 确认 iTunes 是 Apple 官网版，不是 Microsoft Store 版。
- 安装 iCloud for Windows。
- 重新插拔 USB，手机上重新点「信任」。
- 仍不行时，可以先用爱思助手连接一次，再回到 Sideloadly。

**提示 “maximum App ID limit”**

免费账号每 7 天只能注册 10 个 App ID。等几天，或换一个 Apple ID。

**提示 “maximum number of installed apps using a free developer profile”**

免费账号每台设备最多 3 个侧载 App。删掉不用的侧载 App 再装。

**App 打不开 / 闪退**

- 确认已在「VPN 与设备管理」里信任开发者证书。
- 确认没有过期；过期后重新签。
- 确认 iPhone 已开启开发者模式。

**换手机或重装后存档没了**

侧载 App 删除后本地存档会一起删除。重要进度先用游戏内导出功能备份。

## 七、可选方案

- **AltStore Classic**：需要 Windows 上运行 AltServer，走 Wi-Fi 刷新；本身也占一个侧载 App 名额。
- **SideStore**：电脑只用一次，之后手机端自动刷新；配置比 Sideloadly 复杂。
- **Apple Developer Program**：$99/年，1 年签名、100 台设备、无 3 App 限制，适合确定长期玩的情况。

对本项目，建议先用 **Sideloadly + 免费 Apple ID** 跑通，确认游戏值得长期玩，再决定是否付费。
