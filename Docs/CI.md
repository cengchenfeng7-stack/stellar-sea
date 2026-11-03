# iOS CI 配置

CI 在 macOS runner 上做两步：

1. `game-ci/unity-builder` 用 Unity 导出 Xcode 工程到 `build/iOS`。
2. `xcodebuild` 以 `CODE_SIGNING_ALLOWED=NO` 编出未签名 `.app`，再打包成未签名 `.ipa`。

未签名 IPA 不依赖证书和描述文件，下载后用 AltStore / Sideloadly 以免费 Apple ID 自签安装。免费 Apple ID 的签名约 7 天过期，到期重签即可。

没有 Mac 时的完整安装步骤见 [`Install-iPhone.md`](./Install-iPhone.md)。

## 一次性准备：Unity 个人许可证

GameCI 需要三个 GitHub Secrets：

| Secret | 内容 |
|---|---|
| `UNITY_LICENSE` | `Unity_lic.ulf` 文件的完整内容 |
| `UNITY_EMAIL` | Unity 账号邮箱 |
| `UNITY_PASSWORD` | Unity 账号密码 |

生成 `.ulf`：

1. 在本机 Unity Hub 登录 Unity 账号。
2. `Preferences > Licenses`，点 `Add`，选择 `Get a free personal license`。
3. 确认许可证出现在列表后，找到文件：
   - Windows：`C:\ProgramData\Unity\Unity_lic.ulf`
   - macOS：`/Library/Application Support/Unity/Unity_lic.ulf`
   - Linux：`~/.local/share/unity3d/Unity/Unity_lic.ulf`
4. 把文件内容完整复制到 GitHub 仓库的 `Settings > Secrets and variables > Actions > UNITY_LICENSE`。
5. 再添加 `UNITY_EMAIL` 与 `UNITY_PASSWORD`。

> 如果使用 Plus / Pro，可不配 `UNITY_LICENSE`，改配 `UNITY_SERIAL`、`UNITY_EMAIL`、`UNITY_PASSWORD`；workflow 已同时传入 `UNITY_SERIAL`。

## 触发构建

- 推送到 `main` 自动触发。
- 或在 `Actions > iOS Build > Run workflow` 手动触发。

构建完成后，在 run 的 Artifacts 里下载 `StellarSea-unsigned-ipa`。

## 已知注意点

- `projectPath` 必须是 `群星海战`，不是仓库根目录。
- 缓存路径是 `群星海战/Library`。
- Unity 版本从 `群星海战/ProjectSettings/ProjectVersion.txt` 读取，当前为 `6000.3.27f1`。
- 首次构建会安装 Unity Hub 和 Editor，耗时较长；`cacheUnityInstallationOnMac` 会缓存安装。
- 免费 Apple ID 自签有 7 天有效期与同时安装数量限制。
- 如果 CI 报许可证激活失败，优先检查 `.ulf` 是否完整、账号是否开启了两步验证、密码是否含特殊字符。
