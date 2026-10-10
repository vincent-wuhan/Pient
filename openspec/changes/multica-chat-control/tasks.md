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
