package com.pient.app.ui.settings

import com.pient.app.data.PiAgentFiles
import com.pient.app.data.i18n.L
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.pient.app.runtime.PiRpc
import com.pient.app.runtime.PiRuntime
import kotlinx.coroutines.launch
import org.json.JSONObject

/** Tushare 注册入口（带推荐码）：pi 的 upup 工具用 Tushare 读 A 股行情/财报 */
private const val TUSHARE_REGISTER_URL =
    "https://tushare.pro/weborder/#/login?reg=1284148"

/**
 * 数据源配置页：垂域数据凭证（当前 Tushare）的统一入口。
 *
 * 为什么在宿主而不是插件里：环境变量注入是宿主能力（pi 进程由 Pient 起），
 * 插件只按 SDK 约定从 ctx.env 读。保存 → [PiRuntime.pluginEnvFile]（JSON 键值），
 * pi 通道启动时经 [PiRuntime.environment] 合入进程环境——对齐桌面 pi 的 `export` 语义。
 * 凭证只存本地应用私有目录，随进程环境传递，不上传、不进日志。
 */
@Composable
fun DataSourceScreen(nav: NavController) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var token by remember {
        mutableStateOf(
            runCatching {
                JSONObject(PiRuntime.pluginEnvFile(context).readText())
                    .optString("UPUP_TUSHARE_TOKEN", "")
            }.getOrDefault("")
        )
    }
    var showToken by remember { mutableStateOf(false) }
    var multicaPat by remember {
        mutableStateOf(
            runCatching {
                JSONObject(PiRuntime.pluginEnvFile(context).readText())
                    .optString("MULTICA_PAT", "")
            }.getOrDefault("")
        )
    }
    var showPat by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxSize()) {
        // 顶部栏（与用量页同款）
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 8.dp, vertical = 6.dp),
        ) {
            Icon(
                Icons.Outlined.ArrowBack, L.common.back,
                tint = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier
                    .size(24.dp)
                    .clickable(onClick = { nav.popBackStack() }),
            )
            Text(
                L.settings.dataSources,
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(start = 12.dp),
            )
        }

        Column(
            Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Card(colors = CardDefaults.cardColors()) {
                Column(
                    Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text(
                        L.settings.dataSourceTushareTitle,
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Text(
                        L.settings.dataSourceTushareHint,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    OutlinedTextField(
                        value = token,
                        onValueChange = { token = it.trim() },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        placeholder = { Text(L.settings.dataSourceTusharePlaceholder) },
                        visualTransformation =
                            if (showToken) VisualTransformation.None
                            else PasswordVisualTransformation(),
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedButton(onClick = { showToken = !showToken }) {
                            Text(if (showToken) "🙈" else "👁")
                        }
                        Button(
                            onClick = {
                                runCatching {
                                    val f = PiRuntime.pluginEnvFile(context)
                                    f.parentFile?.mkdirs()
                                    val obj = runCatching { JSONObject(f.readText()) }
                                        .getOrElse { JSONObject() }
                                    obj.put("UPUP_TUSHARE_TOKEN", token)
                                    f.writeText(obj.toString(2))
                                }
                                // pi 只在进程启动时读 env → 打脏标记让下轮对话前重启通道生效
                                PiRpc.markConfigDirty()
                                scope.launch { snackbar.showSnackbar(L.settings.dataSourceSaved) }
                            },
                        ) {
                            Text(L.settings.dataSourceSave)
                        }
                    }
                }
            }

            // ── Multica PAT（自托管 opc.yueming.xin 的项目管理）──
            // 无注册链接卡：PAT 由用户在 Multica 控制台自行生成（自托管服务没有推广注册入口），
            // 怎么生成写在 multicaPatHint 文案里。
            Card(colors = CardDefaults.cardColors()) {
                Column(
                    Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text(
                        L.settings.multicaPatTitle,
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Text(
                        L.settings.multicaPatHint,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    OutlinedTextField(
                        value = multicaPat,
                        onValueChange = { multicaPat = it.trim() },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        placeholder = { Text(L.settings.multicaPatPlaceholder) },
                        visualTransformation =
                            if (showPat) VisualTransformation.None
                            else PasswordVisualTransformation(),
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedButton(onClick = { showPat = !showPat }) {
                            Text(if (showPat) "🙈" else "👁")
                        }
                        Button(
                            onClick = {
                                runCatching {
                                    // ① 环境变量（pi-teamwork 插件从 ctx.env 读 MULTICA_PAT）
                                    val f = PiRuntime.pluginEnvFile(context)
                                    f.parentFile?.mkdirs()
                                    val obj = runCatching { JSONObject(f.readText()) }
                                        .getOrElse { JSONObject() }
                                    obj.put("MULTICA_PAT", multicaPat)
                                    f.writeText(obj.toString(2))
                                    // ② settings.json 的 pi-teamwork 块（provider/multica/token）——
                                    // 只增删这一个键，pi 自管的其余键原样保留
                                    PiAgentFiles.mergePiteamworkConfig(context, multicaPat.ifBlank { null })
                                }
                                PiRpc.markConfigDirty()
                                scope.launch { snackbar.showSnackbar(L.settings.dataSourceSaved) }
                            },
                        ) {
                            Text(L.settings.dataSourceSave)
                        }
                    }
                }
            }

            Card(colors = CardDefaults.cardColors()) {
                Column(
                    Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        L.settings.dataSourceRegister,
                        style = MaterialTheme.typography.titleSmall,
                    )
                    Text(
                        L.settings.dataSourcePointsHint,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Button(
                        onClick = {
                            runCatching {
                                context.startActivity(
                                    Intent(Intent.ACTION_VIEW, Uri.parse(TUSHARE_REGISTER_URL))
                                )
                            }
                        },
                    ) {
                        Text("tushare.pro ↗")
                    }
                }
            }
        }
        SnackbarHost(snackbar)
    }
}
