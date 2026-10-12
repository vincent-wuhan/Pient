---
comet_change: multica-chat-control
role: technical-design
canonical_spec: openspec
---

# Technical Design: multica-chat-control

上游事实源：本 change 的 proposal/design/tasks 与 delta spec（multica-chat-control）。本文记录实现层决策与验证事实。

## 已验证事实（探索期实测）

| 事实 | 证据 |
|---|---|
| opc.yueming.xin REST API + PAT 鉴权 | /api/me、/api/workspaces（benyue，含仓库）、/api/agents、/api/projects（19 个）实测 200 |
| PAT 就绪 | ~/.multica/pient/pat.config（mul_ 前缀 + multica login 用法） |
| multica CLI 官方 arm64 资产 | releases/latest v0.6.1：multica-cli-0.6.1-linux-arm64.tar.gz（6MB） |
| pi-teamwork 工具面 | MulticaAdapter：listWorkspaces/listProjects/listIssues/getIssue/createIssue/updateIssue/addComment/listComments/status（dist/adapters/multica.d.ts 实读） |
| pi-teamwork 自托管配置 | Mode 1 {serverUrl,appUrl,token} / Mode 3 headless login（README 实读） |

## 实现决策

1. **两个开放问题定案**：预装即 enabled（免配置口径）；appUrl=serverUrl= `https://opc.yueming.xin`（前端与 API 同源实测）。
2. **fetch_multica.py**：直连 github release（备 ghproxy 镜像参数）；tar.gz→tgz 重打包（aapt gz 规避，同 fetch_node）；核对 tar 成员名含 `linux-arm64/multica`。
3. **pack_piteamwork_asset.py**：staging `npm install @amaster.ai/pi-teamwork@0.1.24 --omit=dev`；整目录 tar；monorepo 无关（独立 staging，缓存 runtime/cache/piteamwork/）。
4. **Kotlin 链**（PiRuntime）：
   - `ensureMulticaCliAsync`：rootfsReady 后解包 strip 顶层 + chmod；`MULTICA_BIN=rootfs/usr/local/bin/multica` 判据
   - `ensurePiteamworkPreloadAsync`：multicaBin && piReady 后解 `.pient-preload/piteamwork` → runPi `pi install` 路径；幂等 = settings.json（转义归一后）含 `pient-preload/piteamwork`
   - 触发点：MainActivity 启动 + rootfs 解包成功链 + pi 解包完成链（与 upup 预装同模式）
5. **settings 注入**（PiAgentFiles 新函数 `mergePiteamworkConfig(context, pat|null)`）：JSONObject 读改写；pat 非空→置 `pi-teamwork` 块（enabled/provider/serverUrl/appUrl/token）；空→remove；原子写。token 变更后 markConfigDirty。
6. **DataSourceScreen**：第二张卡（Multica PAT），保存回调调 mergePiteamworkConfig + plugin_env 写 MULTICA_PAT；i18n 新 key 约 8 个 ×9 语言。

## 测试与验证

- 单测：mergePiteamworkConfig 合并/移除/不踩键三态；fetch 脚本 dry-run（成员名校验）
- 真机门：guest `multica --version`；对话 listIssues/createIssue 实测 + 网页侧核对
- 兼容结论落 tasks 4.5（不兼容回锁 CLI 版本）

## 风险与缓解

见 change design.md §4；补充：pi-teamwork 在 pi 0.85 的扩展 API 兼容性由「预装后 pi install 成功 + 会话工具可见」双门验证。
