# Pient 测试与仿真验证指南

Pient 的验证分四层：JVM 单元测试 / Robolectric、Android 模拟器 instrumented 测试、Maestro UI 冒烟、arm64 真机验收。前三层都可以在开源测试栈上自动化；最后一层覆盖 PRoot、系统权限和发布 ABI 的真实设备行为。

## 分层矩阵

| 层级 | 工具 | 覆盖内容 | 命令 |
| --- | --- | --- | --- |
| JVM 快速回归 | JUnit 4 | 纯 Kotlin 数据结构与导出逻辑 | `./gradlew :app:testDebugUnitTest` |
| Android JVM 仿真 | Robolectric | Context/assets、内置定价表 | `./gradlew :app:testDebugUnitTest` |
| 本地假服务商 | MockWebServer | `AiBackend.testModel` 的请求、鉴权与错误解析 | `./gradlew :app:testDebugUnitTest --tests 'com.pient.app.data.AiBackendMockWebServerTest'` |
| 模拟器 instrumented | ActivityScenario + UI Automator | APK 安装、MainActivity 生命周期与前台状态 | `./gradlew :app:connectedDebugAndroidTest` |
| 模拟器 E2E 冒烟 | Maestro | 真实安装并拉起应用 | `maestro test .maestro/smoke.yaml` |
| 发布验收 | arm64 真机 | Rootfs 解包、pi RPC、终端、Shizuku/Root、后台保活 | 手动 / 专用设备流水线 |

## 准备运行时缓存

Android 构建的 `preBuild` 会校验并打包 Ubuntu/PRoot 运行时，因此任何测试前都要先获取对应 ABI 的缓存：

```bash
# 本机 arm64 真机 / 常规构建
python3 runtime/scripts/fetch_rootfs.py --abi aarch64

# x86_64 模拟器
python3 runtime/scripts/fetch_rootfs.py --abi x86_64
```

模拟器构建和测试必须显式传入 ABI，防止把 x86_64 产物误用于 arm64：

```bash
./gradlew :app:connectedDebugAndroidTest -PpientRuntimeAbi=x86_64
```

## 本地运行

```bash
# 1. JVM + Robolectric + MockWebServer
./gradlew :app:testDebugUnitTest -PpientRuntimeAbi=x86_64

# 2. 构建模拟器 APK 与测试 APK
./gradlew :app:assembleDebug :app:assembleDebugAndroidTest -PpientRuntimeAbi=x86_64

# 3. 启动 x86_64 AVD 后执行 instrumented 测试
./gradlew :app:connectedDebugAndroidTest -PpientRuntimeAbi=x86_64

# 4. 安装 Maestro 后执行 UI 冒烟
adb install -r app/build/outputs/apk/debug/app-debug.apk
maestro test .maestro/smoke.yaml
``+

安装 Maestro：

```bash
curl -fsSL https://get.maestro.mobile.dev | bash
export PATH="$HOME/.maestro/bin:$PATH"
```

## 假模型服务商约定

`AiBackendMockWebServerTest` 使用 MockWebServer 暴露本地 OpenAI-compatible 端点，验证真实探测代码会：

- 请求 `{endpoint}/chat/completions`
- 携带 `Authorization: Bearer ...`
- 发送非流式、`max_tokens=16` 的最小探测请求
- 将 HTTP 错误体转换成用户可读的失败信息

后续新增协议时，应优先在 MockWebServer 上固定成功、鉴权失败、协议错误和超时四类响应，再接真实服务商。

## CI

`.github/workflows/tests.yml` 定义两条流水线：

- `unit`: 获取 x86_64 运行时后运行 JVM / Robolectric / MockWebServer 测试。
- `emulator`: 使用 `reactivecircus/android-emulator-runner` 启动 API 35 x86_64 AVD，执行 instrumented 测试和 Maestro 冒烟。

CI 与本地使用相同的 `-PpientRuntimeAbi=x86_64` 构建口径。Google 预置 AVD system image 受 Android SDK 条款约束；需要完全开源镜像时，可后续用 AOSP/QEMU 自建系统镜像替换该步骤。

## 真机验收清单

模拟器通过不代表发布完成。release 前至少在一台 arm64 Android 8+ 真机验证：

1. 首启 Ubuntu rootfs 与 pi 包解包完成。
2. `pi --mode rpc` 能启动、响应并发送会话命令。
3. 终端能执行 Ubuntu 命令，Android shell 回桥可用。
4. Shizuku / Root 权限状态与授权流正确。
5. 前台服务、通知、后台保活和进程恢复符合预期。
6. 文件 SAF 与项目目录绑定在真实存储上可用。
