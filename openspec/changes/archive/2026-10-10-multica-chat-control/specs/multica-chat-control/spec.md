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
