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
