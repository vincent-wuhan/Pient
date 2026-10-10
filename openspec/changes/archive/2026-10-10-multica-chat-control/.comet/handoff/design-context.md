# Comet Design Handoff

- Change: multica-chat-control
- Phase: design
- Mode: compact
- Context hash: 6d7b218f5fe862d68ac4544e2f7ed896efdda0458a792af2c63150fe68dcecff

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/multica-chat-control/proposal.md

- Source: openspec/changes/multica-chat-control/proposal.md
- Lines: 1-38
- SHA256: e5db0a035e4c8309e34b591b947e1bb15296072170e39f5e9bfe102612966a34

```md
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
```

## openspec/changes/multica-chat-control/design.md

- Source: openspec/changes/multica-chat-control/design.md
- Lines: 1-64
- SHA256: b334979477a4182369872272f474cb202a13b63cbc97570e89875b24ca028a71

```md
# Design: multica-chat-control

## 1. 架构

```
Pient 对话 ──pi 扩展工具──▶ @amaster.ai/pi-teamwork
                               │ exec multica CLI（guest 内）
                               ▼
                          multica v0.6.1 ──HTTPS+PAT──▶ opc.yueming.xin
（查工作区/项目/issue/进度 · 建 issue 派活 · 评论）
```

三层均为 pinned 预置（APK assets → 首启落 guest），PAT 经 Pient 数据源配置页（plugin_env.json → pi 进程 env → settings 注入）。

## 2. 关键决策

### D1: 收录现成扩展而非自研
pi-teamwork 的 MulticaAdapter 工具面（list/create/update issue + comment + projects/workspaces/status）完整命中「查任务+派活」；multica CLI 开源且官方发布 linux-arm64。自研无增量价值；若未来需要 OpenMinis 通道，再按 monorepo 垂域包模板评估。

### D2: CLI 预置走 node 同款链
`fetch_multica.py`（npmmirror 兜底直连 github release；下载 tar.gz 重打包 .tgz 规避 aapt gz 解压）→ `syncPientMulticaCli`（Copy 任务，缺文件出声失败）→ assets `pient-multica-cli.tgz` → `ensureMulticaCliAsync`（首启解到 rootfs `usr/local/bin/`，chmod +x，幂等：multica 二进制存在即跳过）。ABI：arm64-v8a→linux-arm64；x86_64 不在本轮（与 rootfs 同步扩展）。

### D3: 扩展预装走 upup 同款链
`pack_piteamwork_asset.py`：临时目录 `npm install @amaster.ai/pi-teamwork@0.1.24`（带依赖闭包）→ tar 成自包含包 → assets `pient-piteamwork.tgz` → `ensurePiteamworkPreloadAsync`（解到 `.pient-preload/piteamwork` → `pi install` 本地路径；幂等判据 settings.json 含该源）。

### D4: 配置注入（pi settings.json）
pi-teamwork 配置块写入 `root/.pi/agent/settings.json`：
```json
"pi-teamwork": {"enabled": true, "provider": "multica",
  "multica": {"serverUrl": "https://opc.yueming.xin",
               "appUrl": "https://opc.yueming.xin", "token": "<MULTICA_PAT>"}}
```
- 写入时机：数据源配置页保存 MULTICA_PAT 时（合并写，不踩 pi 自己的 packages 键——沿用 PiAgentFiles 合并写模式）；token 为空不写块
- token 来源：`plugin_env.json` 的 `MULTICA_PAT`（与 UPUP_TUSHARE_TOKEN 同通道同页面）
- 免配置预置：preset env 增 `MULTICA_PAT: ""` 空位；serverUrl 常量内置

### D5: 数据源配置页扩展
DataSourceScreen 增第二张卡「Multica PAT」（掩码输入 + 保存即写 plugin_env + 同步 settings.json 注入 + 打脏标记）；注册入口（multica.ai / 自托管控制台生成 PAT 的提示文案）。i18n 九语言。

## 3. 数据流（派活示例）

```
用户：「给 benyue 工作区 XX 项目建个 issue：修复登录页崩溃，优先级高」
pi → pi-teamwork: createIssue({project, title, priority})
     → exec: multica issue create ...（guest 内 CLI）
     → opc.yueming.xin REST（PAT）
     ← issue URL/ID
pi → 对话回报确认
```

## 4. 风险

| 风险 | 缓解 |
|---|---|
| pi-teamwork 0.1.24 与 CLI 0.6.1 兼容口径未知 | 真机验证门：listIssues/createIssue 实测；不兼容则锁 CLI 版本到扩展文档口径 |
| multica CLI 依赖 glibc 版本 | Ubuntu 24.04 rootfs（glibc 2.39）远超 Go 静态编译需求；实测 `multica --version` 门 |
| CLI 6MB 增重 | 接受（相对 APK 136M 可忽略） |
| settings.json 合并写踩键 | 复用 PiAgentFiles 合并写（packages 键由 pi 管理，我们只增 pi-teamwork 块） |
| PAT 泄漏面 | 与 UPUP_TUSHARE_TOKEN 同规范：仅 plugin_env/settings 落盘（应用私有目录）、不进日志/错误/prompt |

## 5. 开放问题（build 前定案）

1. pi-teamwork 预装是否需用户显式开启（pi 包 enabled 默认值）——倾向预装即 enabled（免配置口径）
2. appUrl 与 serverUrl 是否同址（opc.yueming.xin 前端探测 API 同源——倾向同址）
```

## openspec/changes/multica-chat-control/tasks.md

- Source: openspec/changes/multica-chat-control/tasks.md
- Lines: 1-34
- SHA256: a7b4f687a0e723a09d2c6fcb060be2464af731bb1cb54b45b593920771c8f296

```md
# Tasks: multica-chat-control

## 阶段 1: 资产获取与打包

- [ ] 1.1 `runtime/scripts/fetch_multica.py`：下载 multica-cli v0.6.1 linux-arm64 tar.gz（github release，网络失败重试/镜像说明）→ 重打包 `.tgz` → `runtime/cache/multica/`；核验解包后 `multica --version` 可执行（本机 darwin 无法跑 linux 二进制，改为核对 tar 内文件名与大小）
- [ ] 1.2 `runtime/scripts/pack_piteamwork_asset.py`：npm 装 `@amaster.ai/pi-teamwork@0.1.24`（含依赖闭包）→ 自包含 tar.gz → 指定输出
- [ ] 1.3 gradle：`syncPientMulticaCli`（Copy + 缺文件出声）与 `packPientPiteamwork`（Exec）→ assets `pient-multica-cli.tgz` / `pient-piteamwork.tgz`；挂 preBuild

## 阶段 2: 首启预置链（Kotlin）

- [ ] 2.1 `ensureMulticaCliAsync`：rootfs 就绪后解 CLI 到 `usr/local/bin/`（strip 顶层目录）+ chmod 755；幂等（二进制存在跳过）；日志 `multica 预置完成`
- [ ] 2.2 `ensurePiteamworkPreloadAsync`：CLI+pi 就绪后解扩展到 `.pient-preload/piteamwork` → `pi install` 本地路径（runPi）；幂等（settings.json 含源路径，容错 JSON 转义斜杠——沿用 upup 判据修正）
- [ ] 2.3 挂链：MainActivity 启动链 + rootfs/pi 解包完成的链式触发点
- [ ] 2.4 PiRpc 就绪判据不变（multica CLI 不阻塞 pi 通道；扩展按需发现）

## 阶段 3: 配置注入与 UI

- [ ] 3.1 数据源配置页增「Multica PAT」卡（掩码/明文/保存；保存 = plugin_env 写 MULTICA_PAT + settings.json 注入/清除 pi-teamwork 块 + 打脏标记）
- [ ] 3.2 `PiAgentFiles` 增合并写 `pi-teamwork` 配置块的工具函数（token 空则移除块）
- [ ] 3.3 免配置预置：preset env 增 `MULTICA_PAT` 空位；serverUrl/appUrl 常量（`https://opc.yueming.xin`）
- [ ] 3.4 i18n 九语言：Multica 卡标题/提示/PAT 申请指引文案

## 阶段 4: 构建与真机验证

- [ ] 4.1 assembleDebug 快速验证：assets 齐（CLI/扩展/预置 env）；首启链日志三行（multica 预置完成 / piteamwork Installed / 注入成功）
- [ ] 4.2 真机 guest 内核验：`multica --version`；PAT 配置后 `multica` 登录态（Mode 3 由扩展 session_start 处理）
- [ ] 4.3 真机对话验证（用户 PAT）：「列出 benyue 工作区的项目」「列出 XX 项目 open 状态的 issue」「给 XX 建一个 issue：标题/优先级」→ 工具调用与结构化回报；在 opc.yueming.xin 网页核对 issue 真实创建
- [ ] 4.4 assembleRelease 出正式版 + dist 发布 + SHA256SUMS
- [ ] 4.5 兼容性结论记录（pi-teamwork 0.1.24 × CLI 0.6.1；不兼容则回锁版本重测）

## 阶段 5: 收尾

- [ ] 5.1 README/文档：multica 对话控制能力说明 + PAT 配置指引
- [ ] 5.2 签名正式版推送手机；用户验收
```

## openspec/changes/multica-chat-control/specs/multica-chat-control/spec.md

- Source: openspec/changes/multica-chat-control/specs/multica-chat-control/spec.md
- Lines: 1-46
- SHA256: 6fcf3a77346744576a2bb868ff1e586fd2ebeae314a9d72c31872ee933dd823c

```md
# multica-chat-control Specification

## ADDED Requirements

### Requirement: multica CLI 预置
Pient SHALL 随 APK 预置 multica CLI（pinned v0.6.1，linux-arm64），首启自动解到 guest `/usr/local/bin/multica` 并可执行；幂等（二进制存在即跳过）。

#### Scenario: 首启解包
- **WHEN** 完整版 APK 首启且 rootfs 就绪
- **THEN** guest 内 `multica --version` 返回 0.6.1，无需用户安装

#### Scenario: 幂等跳过
- **WHEN** 二进制已存在再次启动
- **THEN** 不重复解包，日志无副作用

### Requirement: pi-teamwork 扩展预装
Pient SHALL 预装 `@amaster.ai/pi-teamwork`（pinned 0.1.24，自包含依赖闭包）为 pi 包；注册经 `pi install` 本地路径（与用户手动装同源），幂等。

#### Scenario: 预装注册
- **WHEN** CLI 与 pi 均就绪后首启
- **THEN** settings.json 登记该包源，pi 对话可调用 teamwork 工具

### Requirement: PAT 配置与注入
数据源配置页 SHALL 提供「Multica PAT」项；保存时 SHALL 同步写入 plugin_env（MULTICA_PAT）并**合并**注入 pi settings.json 的 `pi-teamwork.multica` 配置块（serverUrl 固定 `https://opc.yueming.xin`，token 为 PAT）；PAT 清空时 SHALL 移除该配置块；合并写 SHALL NOT 覆盖 pi 自管的键（如 packages）。

#### Scenario: 保存后对话生效
- **WHEN** 用户粘贴 PAT 保存并开始新对话
- **THEN** teamwork 工具可用且不再要求配置（下轮 pi 通道重启生效）

#### Scenario: 合并写不踩键
- **WHEN** settings.json 已有 packages 等键
- **THEN** 注入后其余键原样保留

### Requirement: 对话控制能力
配置完成后，用户 SHALL 能通过对话完成：列出工作区/项目、列出与查询 issue（含进度状态）、创建 issue（派活）、更新 issue、添加/查看评论——即 pi-teamwork MulticaAdapter 全工具面。

#### Scenario: 派活闭环
- **WHEN** 用户对话要求「给项目 X 创建 issue：标题 Y，优先级高」
- **THEN** 平台真实创建该 issue（opc.yueming.xin 网页可核对），对话回报标识

### Requirement: 安全约束
PAT SHALL 仅存于应用私有目录（plugin_env.json / settings.json），不进日志、错误文本与提示词；CLI 与扩展版本 SHALL 锁定（无 auto-install）。

#### Scenario: 凭证不泄漏
- **WHEN** multica 调用失败产生错误
- **THEN** 错误文本不含 PAT 任何子串
```

