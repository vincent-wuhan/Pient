# Proposal: multica-chat-control

## Why

用户需要通过 Pient 对话控制自托管 Multica/OPC 平台（`opc.yueming.xin`）——查看项目/任务与进度、给项目派活，定位是「multica app 端的轻量+智能替代」。探索结论：**现成开源方案成立，无需自研**：

- `@amaster.ai/pi-teamwork`（pi 扩展）：LLM 可调用工具面完整覆盖需求——`listWorkspaces / listProjects / listIssues / getIssue / createIssue / updateIssue / addComment / listComments / status`
- `multica` CLI（github.com/multica-ai/multica，Go 开源，v0.6.1，官方 linux-arm64 release 6MB）：pi-teamwork 的执行后端
- 自托管配置模式现成：`serverUrl + token`（用户 PAT 已就绪，`~/.multica/pient/pat.config`，Mode 3 headless login 正是其文档用法）

## What Changes

在 Pient 完整版 APK 中收录该插件并集成进发布版本：

1. **multica CLI 预置**：`runtime/scripts/fetch_multica.py` 下载 v0.6.1 linux-arm64（含 ABI 映射与校验）；gradle 任务打进 assets（`pient-multica-cli.tgz`）；首启解到 guest `/usr/local/bin/multica`（+x）
2. **pi-teamwork 扩展预装**：自包含包（含依赖闭包）→ assets `pient-piteamwork.tgz` → 首启解到预装目录并 `pi install` 本地路径（同 upup 模式，幂等）
3. **配置注入**：pi settings.json 写入 pi-teamwork 配置块（provider=multica、serverUrl=https://opc.yueming.xin、token 从 plugin_env `MULTICA_PAT`）；**数据源配置页新增「Multica PAT」项**（复用 P0 通用通道，i18n 九语言）
4. **免配置预置**：preset 增 `MULTICA_PAT` 空位 + serverUrl 默认（内置 opc.yueming.xin）
5. 验证：真机对话「列出 benyue 工作区任务」「给 XX 项目建 issue 派活」全链路

## Goals

- 装完即用：CLI + 扩展 + serverUrl 全预置，用户只需在数据源配置页贴 PAT
- 对话能力：查工作区/项目/任务/进度 + 建 issue 派活 + 评论（pi-teamwork 全工具面）
- 版本锁定：CLI v0.6.1 与 pi-teamwork 0.1.24 均为 pinned 预置（符合 pi-teamwork 的 pinned-artifact 安全口径，禁 auto-install）

## Non-Goals

- 不自研 multica 垂域插件（现成扩展满足；若未来需要 OpenMinis 通道再评估 monorepo 垂域包）
- 不做座位模式（`@atoz-project/multica-pi-connector`，平台→手机派活——独立方向，已有半成品分支 `benyue/multica-opc-runtime` 不在本 change 处理）
- 不做 pi-multica-spine（工作代理绑定合同，面向执行侧）
- 不改 multica 服务端

## Impact

- Pient：runtime/scripts 新脚本 ×2、build.gradle 两任务、PiRuntime 预置链扩展（CLI 解包 + 扩展预装 + settings 注入）、DataSourceScreen 增 PAT 项 + i18n ×9
- APK 体积 +~10MB（CLI 6MB + 扩展包）
- 需核验：pi-teamwork 与 CLI 0.6.1 的兼容性（真机验证门）
