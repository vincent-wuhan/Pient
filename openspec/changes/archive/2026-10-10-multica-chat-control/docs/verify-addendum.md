# 验证附录：派活路径实测（2026-10-11）· 已定案

## 最终结论（推翻初判）
- **派活闭环已通**：对话「创建 issue」经 bash+curl（MULTICA_PAT 自动来自 pi env）→ API 201 → BENY-637 真实落库
- 早期"未创建"判断全部是**假阴性**：/api/issues 默认列表不含新 issue（过滤/缓存口径），按 id 直查 200 确凿存在（BENY-635/637）
- PAT 读写权限完整；env 注入链（数据源配置页→plugin_env→pi env→bash）端到端验证
- teamwork_create_issue 工具面存在但其 CLI create 子命令执行失败（读命令兼容、写命令疑似版本错配）——bash+curl 为当前可用派活路径；wave2 修 CLI 写路径或换扩展版本
- 测试残留：BENY-635 / BENY-637 两个测试 issue 待用户在网页关闭

## 初判存档（现象与排查过程）

## 现象
- 读路径（listProjects/listIssues/进度）多次真机验证 ✅
- 写路径（createIssue）未落库：模型先走 bash 直呼 multica CLI（无登录态失败）；纠正后陷入澄清循环
- 服务器侧核对（/api/issues 过滤）确认 0 命中

## 疑似根因（待 wave2 排查）
pi-teamwork 的 MulticaAdapter 定义了 createIssue/updateIssue/addComment，
但 **pi 扩展注册的工具面可能只含 list 类**（读工具）。确认方法：pi 会话中看 teamwork
实际注册的工具名（/pi tools 或对话内直接问 "what teamwork tools do you have"）。

## 候选修复方向
1. 若工具面缺失：pi 会话内先跑一次 `multica login --token <PAT>`（PAT 已在 pi env），
   之后 bash 直呼 CLI 即可写
2. 或扩展配置块加显式 tool 开关（查 pi-teamwork 文档 advanced 配置）
3. 或升级/更换扩展版本
