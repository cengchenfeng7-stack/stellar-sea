# iOS CI 配置

CI 在 macOS runner 上做两步：

1. `game-ci/unity-builder@v6`（新版 CLI 封装）用 Unity 导出 Xcode 工程到 `build/iOS`。
2. `xcodebuild` 以 `CODE_SIGNING_ALLOWED=NO` 编出未签名 `.app`，再打包成未签名 `.ipa`。

> 必须用 v6。v4 只认 `UNITY_LICENSE` / `UNITY_SERIAL`，不支持 Unity 6 的账号激活，会直接报 `Missing Unity License File`。

未签名 IPA 不依赖证书和描述文件，下载后用 AltStore / Sideloadly 以免费 Apple ID 自签安装。免费 Apple ID 的签名约 7 天过期，到期重签即可。

没有 Mac 时的完整安装步骤见 [`Install-iPhone.md`](./Install-iPhone.md)。

## 一次性准备：Unity 许可证

Unity 6（本项目 `6000.3.27f1`）的 Personal 许可证由 Unity Licensing Client 管理，不再生成传统的 `Unity_lic.ulf`。本机对应文件是：

```text
C:\Users\<用户名>\AppData\Local\Unity\licenses\UnityEntitlementLicense.xml
```

这个文件绑定本机，不能直接给 CI 用。因此 CI 采用**账号激活**，只需要两个 GitHub Secrets：

| Secret | 内容 | 必需 |
|---|---|---|
| `UNITY_EMAIL` | Unity 账号邮箱 | 是 |
| `UNITY_PASSWORD` | Unity 账号密码 | 是 |
| `UNITY_LICENSE` | 旧版 `.ulf` 全文（如果有） | 否 |
| `UNITY_SERIAL` | Plus / Pro 序列号 | 否 |

配置位置：

```text
https://github.com/cengchenfeng7-stack/stellar-sea/settings/secrets/actions
```

### 账号要求

- Unity 账号需先在本机 Unity Hub 登录并领取过 Personal 许可证。
- **关闭两步验证（2FA）**。CI 无法完成手机验证码，开启 2FA 会直接激活失败。
- 密码建议只用大小写字母和数字，避免特殊字符（GameCI 已知问题）。
- 第一次从 GitHub runner 登录时，Unity 可能发一封「新设备」确认邮件；点确认后重新跑一次 workflow。

> 如果以后买了 Plus / Pro，改配 `UNITY_SERIAL` 即可，workflow 已同时传入。

## 触发构建

- 推送到 `main` 自动触发。
- 或在 `Actions > iOS Build > Run workflow` 手动触发。

构建完成后，在 run 的 Artifacts 里下载 `StellarSea-unsigned-ipa`。

## 已知注意点

- 仓库根目录是 `F:\群星海战`，Unity 工程在 `群星海战/` 子目录。
- `projectPath` 必须是 `群星海战`，不是仓库根目录。
- game-ci 会把导出目录整体放进 `buildsPath`，实际 Xcode 工程在 `build/iOS/iOS/Unity-iPhone.xcodeproj`；workflow 用 `find` 递归定位，不要写死单层路径。
- 缓存路径是 `群星海战/Library`。
- Unity 版本从 `群星海战/ProjectSettings/ProjectVersion.txt` 读取，当前为 `6000.3.27f1`。
- 首次构建会安装 Unity Hub 和 Editor，耗时较长；`cacheUnityInstallationOnMac` 会缓存安装。
- 免费 Apple ID 自签有 7 天有效期与同时安装数量限制。
- 如果 CI 报许可证激活失败，按顺序检查：2FA 是否关闭、密码是否含特殊字符、Unity 是否发了新设备确认邮件、账号是否领取过 Personal 许可证。
