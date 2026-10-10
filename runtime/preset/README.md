# 免配置预置（本地文件，不入库）

构建「免配置版」APK 用。三个 JSON 在时随包进 assets，首启落盘到对应位置（目标文件已存在则不覆盖，用户配置优先）：

- `pient-models-default.json` → `root/.pi/agent/models.json`（pi 服务商与模型表）
- `pient-auth-default.json` → `root/.pi/agent/auth.json`（API key）
- `pient-state-default.json` → `files/pient_data/state.json`（默认模型选择与思考档位）

**含真实 key，已在 .gitignore 排除**。文件缺失时构建出普通版（无预置），Kotlin 侧自动跳过。
