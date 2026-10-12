---
change: multica-chat-control
design-doc: docs/superpowers/specs/2026-10-10-multica-chat-control-design.md
base-ref: HEAD
---

# multica-chat-control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: subagent-driven-development 或 executing-plans 逐任务执行。

**Goal:** Pient 完整版收录 pi-teamwork + multica CLI，对话控制 opc.yueming.xin（查任务/派活）。

**既有模式复用**：CLI 预置=fetch_node/ensureNodeAsync 同款；扩展预装=pack_upup_asset/ensureUpupPreloadAsync 同款；配置注入=DataSourceScreen/mergePiteamworkConfig；i18n 九语言注入脚本模式同 P0。

## Task 1: 资产脚本 + gradle

- `runtime/scripts/fetch_multica.py`：下载 v0.6.1 linux-arm64 tar.gz → 重打包 tgz → `runtime/cache/multica/multica-cli.tgz`；成员名校验（含 `multica` 可执行）；--mirror 参数（ghproxy 前缀）
- `runtime/scripts/pack_piteamwork_asset.py`：staging（独立于 monorepo）`npm install @amaster.ai/pi-teamwork@0.1.24 --omit=dev --ignore-scripts` → tar 自包含 → `--out`；缓存 staging 供 gradle 复用
- gradle：`syncPientMulticaCli`（Copy + doFirst 校验）+ `packPientPiteamwork`（Exec，输出 generated/pientAssets）→ preBuild dependsOn
- 验证：两个任务跑通，assets 目录见 `pient-multica-cli.tgz`（~6MB）与 `pient-piteamwork.tgz`
- Commit: `build(assets): multica cli + piteamwork pack tasks`

## Task 2: Kotlin 预置链

- PiRuntime：`MULTICA_CLI_ASSET`/`PITEAMWORK_ASSET` 常量、`multicaBin()`、`ensureMulticaCliAsync`（rootfsReady 门 + strip 顶层 + chmod 0755 + 幂等 + 链式触发 piteamwork）、`ensurePiteamworkPreloadAsync`（multicaBin+piReady 门 + 解 `.pient-preload/piteamwork` + runPi `pi install` + 幂等判据转义归一）
- 挂链：MainActivity（ensureMulticaCliAsync/ensurePiteamworkPreloadAsync）、extractRootfs 成功链、pi 解包完成 finally
- 日志行：`multica 预置完成 ok=`、`piteamwork 预装完成 rc=`
- Commit: `feat(runtime): multica cli + piteamwork first-boot provisioning`

## Task 3: 配置注入 + 配置页 + i18n

- PiAgentFiles.`mergePiteamworkConfig(context, pat: String?)`：合并写 settings.json（pat 非空置块/空移除/原子写/不踩他键）+ 单测三态（纯 JVM 可测则加 app 单测，否则以真机验证门覆盖并注明）
- DataSourceScreen 第二张卡：Multica PAT（掩码/保存→plugin_env 写 MULTICA_PAT + mergePiteamworkConfig + markConfigDirty + snackbar）；申请指引文案（自托管控制台生成）
- preset `pient-env-default.json` 增 `"MULTICA_PAT": ""`
- i18n 九语言 ×~8 key（模式同 P0 的 python 批量注入）
- Commit: `feat(datasource): multica PAT config + settings injection (i18n ×9)`

## Task 4: 构建 + 真机验证

- assembleDebug：assets 齐全；安装真机首启链日志三行验证
- 真机 guest 核验 `multica --version`（经 pi 对话 `!multica --version` 或终端页）
- 数据源配置页贴 PAT → 对话验证：「列出 benyue 工作区项目」「列出 open issues」「给 XX 建 issue」→ 网页侧核对
- 兼容性结论（4.5）：pi-teamwork 0.1.24 × CLI 0.6.1；不兼容则锁版本重测
- assembleRelease → dist → SHA256SUMS → 推送手机
- Commit: `docs(multica): capability notes + verify record`

## 验收对照

delta spec 全 Requirement：CLI 预置（首启/幂等）/扩展预装/PAT 注入（生效/不踩键）/对话控制（派活闭环网页核对）/安全（PAT 不泄漏）。
