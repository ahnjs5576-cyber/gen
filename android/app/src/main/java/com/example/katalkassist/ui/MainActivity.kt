package com.example.katalkassist.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.katalkassist.data.MessageEntity
import com.example.katalkassist.service.KatalkNotificationListener
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {

    private val vm: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = dynamicOrDefault()) {
                Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    AppRoot(vm)
                }
            }
        }
    }

    @Composable
    private fun dynamicOrDefault(): ColorScheme {
        val ctx = LocalContext.current
        return if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            if (isSystemInDarkTheme()) dynamicDarkColorScheme(ctx) else dynamicLightColorScheme(ctx)
        } else {
            if (isSystemInDarkTheme()) darkColorScheme() else lightColorScheme()
        }
    }
}

@Composable
private fun isSystemInDarkTheme(): Boolean =
    androidx.compose.foundation.isSystemInDarkTheme()

@Composable
fun AppRoot(vm: MainViewModel) {
    val context = LocalContext.current
    var listenerOn by remember { mutableStateOf(KatalkNotificationListener.isEnabled(context)) }

    // Re-check permission when returning from system settings.
    val lifecycle = androidx.lifecycle.compose.LocalLifecycleOwner.current.lifecycle
    DisposableEffect(lifecycle) {
        val obs = androidx.lifecycle.LifecycleEventObserver { _, event ->
            if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) {
                listenerOn = KatalkNotificationListener.isEnabled(context)
            }
        }
        lifecycle.addObserver(obs)
        onDispose { lifecycle.removeObserver(obs) }
    }

    if (!listenerOn) {
        PermissionGate(onGrant = { context.startActivity(KatalkNotificationListener.settingsIntent()) })
        return
    }

    val selected = remember { mutableStateOf<MessageEntity?>(null) }
    val showSettings = remember { mutableStateOf(false) }

    when {
        showSettings.value -> SettingsScreen(vm, onBack = { showSettings.value = false })
        selected.value == null -> RoomListScreen(
            vm,
            onOpen = { room -> selected.value = room; vm.selectRoom(room.roomKey) },
            onSettings = { showSettings.value = true }
        )
        else -> ThreadScreen(vm, room = selected.value!!, onBack = {
            selected.value = null
            vm.selectRoom(null)
        })
    }
}

@Composable
fun PermissionGate(onGrant: () -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("알림 접근 권한이 필요해요", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(12.dp))
        Text(
            "이 앱은 카카오톡의 데이터베이스를 읽지 않습니다. 대신 안드로이드가 공식 제공하는 " +
                "'알림 접근' 권한으로, 알림에 표시되는 메시지만 읽어 답장을 도와줍니다. " +
                "권한은 설정에서 언제든 끌 수 있어요.",
            style = MaterialTheme.typography.bodyMedium
        )
        Spacer(Modifier.height(24.dp))
        Button(onClick = onGrant) { Text("설정에서 알림 접근 켜기") }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoomListScreen(vm: MainViewModel, onOpen: (MessageEntity) -> Unit, onSettings: () -> Unit) {
    val rooms by vm.rooms.collectAsStateWithLifecycle()
    Scaffold(topBar = {
        TopAppBar(
            title = { Text("대화") },
            actions = {
                IconButton(onClick = onSettings) {
                    Icon(Icons.Filled.Settings, contentDescription = "설정")
                }
            }
        )
    }) { pad ->
        if (rooms.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(pad), contentAlignment = Alignment.Center) {
                Text(
                    "아직 수신한 메시지가 없어요.\n카카오톡으로 새 메시지가 오면 여기에 나타납니다.",
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        } else {
            LazyColumn(Modifier.padding(pad).fillMaxSize()) {
                items(rooms, key = { it.roomKey }) { room ->
                    ListItem(
                        headlineContent = { Text(room.roomName, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                        supportingContent = {
                            val prefix = if (room.isMine) "나: " else ""
                            Text(prefix + room.text, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        },
                        trailingContent = { Text(shortTime(room.receivedAt), style = MaterialTheme.typography.labelSmall) },
                        modifier = Modifier.clickable { onOpen(room) }
                    )
                    HorizontalDivider()
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ThreadScreen(vm: MainViewModel, room: MessageEntity, onBack: () -> Unit) {
    val context = LocalContext.current
    val thread by vm.thread.collectAsStateWithLifecycle()
    val suggestions by vm.suggestions.collectAsStateWithLifecycle()
    val loading by vm.loadingSuggestions.collectAsStateWithLifecycle()
    var snackbar by remember { mutableStateOf<String?>(null) }
    val snackState = remember { SnackbarHostState() }

    LaunchedEffect(snackbar) {
        snackbar?.let { snackState.showSnackbar(it); snackbar = null }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(room.roomName, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "뒤로")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackState) }
    ) { pad ->
        Column(Modifier.padding(pad).fillMaxSize()) {
            LazyColumn(Modifier.weight(1f).fillMaxWidth().padding(horizontal = 12.dp)) {
                items(thread, key = { it.id }) { m -> MessageBubble(m) }
            }

            HorizontalDivider()
            Row(
                Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("답장 제안", style = MaterialTheme.typography.labelLarge, modifier = Modifier.weight(1f))
                if (loading) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
            }
            val canSend = vm.canSend(room.roomKey)
            suggestions.forEach { s ->
                SuggestionRow(
                    suggestion = s.text,
                    tone = s.tone,
                    canSend = canSend,
                    onSend = {
                        val ok = vm.send(context, room.roomKey, s.text)
                        snackbar = if (ok) "전송했어요" else "답장 창이 만료됐어요. 복사해서 직접 보내주세요."
                    },
                    onCopy = {
                        copyToClipboard(context, s.text)
                        snackbar = "복사했어요. 카카오톡에 붙여넣어 보내세요."
                    }
                )
            }
            if (!canSend) {
                Text(
                    "이 방은 지금 직접 답장이 불가능해요(알림이 닫혔거나 만료됨). '복사'로 보내주세요.",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline,
                    modifier = Modifier.padding(16.dp)
                )
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
fun MessageBubble(m: MessageEntity) {
    val mine = m.isMine
    Row(
        Modifier.fillMaxWidth().padding(vertical = 3.dp),
        horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start
    ) {
        Surface(
            color = if (mine) MaterialTheme.colorScheme.primaryContainer
            else MaterialTheme.colorScheme.surfaceVariant,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.widthIn(max = 280.dp)
        ) {
            Column(Modifier.padding(10.dp)) {
                if (!mine && m.sender.isNotBlank() && m.sender != m.roomName) {
                    Text(m.sender, style = MaterialTheme.typography.labelSmall)
                }
                Text(m.text, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@Composable
fun SuggestionRow(
    suggestion: String,
    tone: String,
    canSend: Boolean,
    onSend: () -> Unit,
    onCopy: () -> Unit
) {
    Card(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp)) {
        Row(
            Modifier.padding(12.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f)) {
                AssistChip(onClick = {}, label = { Text(tone) }, enabled = false)
                Spacer(Modifier.height(4.dp))
                Text(suggestion, style = MaterialTheme.typography.bodyMedium)
            }
            TextButton(onClick = onCopy) { Text("복사") }
            if (canSend) {
                FilledTonalButton(onClick = onSend) { Text("전송") }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(vm: MainViewModel, onBack: () -> Unit) {
    val p = vm.prefs
    var apiKey by remember { mutableStateOf("") }        // blank = leave existing key unchanged
    var useLlm by remember { mutableStateOf(p.useLlm) }
    var model by remember { mutableStateOf(p.modelId) }
    var pseudonymize by remember { mutableStateOf(p.pseudonymize) }
    var retention by remember { mutableStateOf(p.retentionHours.toString()) }
    var myName by remember { mutableStateOf(p.myDisplayName) }
    var snack by remember { mutableStateOf<String?>(null) }
    val snackState = remember { SnackbarHostState() }
    LaunchedEffect(snack) { snack?.let { snackState.showSnackbar(it); snack = null } }

    val picker = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri -> if (uri != null) vm.importExport(uri) { snack = it } }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("설정") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "뒤로")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackState) }
    ) { pad ->
        Column(
            Modifier.padding(pad).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text("답장 생성 (LLM)", style = MaterialTheme.typography.titleMedium)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Switch(checked = useLlm, onCheckedChange = { useLlm = it })
                Spacer(Modifier.width(8.dp))
                Text("Claude로 답장 생성 (끄면 오프라인 템플릿)")
            }
            OutlinedTextField(
                value = apiKey, onValueChange = { apiKey = it },
                label = { Text("Anthropic API 키 (비워두면 기존 키 유지)") },
                visualTransformation = PasswordVisualTransformation(),
                singleLine = true, modifier = Modifier.fillMaxWidth()
            )
            Text("모델", style = MaterialTheme.typography.labelLarge)
            Column {
                listOf(
                    "claude-opus-5-5" to "Opus 5.5 (기본·고품질)",
                    "claude-haiku-5-5" to "Haiku 5.5 (저렴·빠름, 이 용도 추천)",
                    "claude-sonnet-5-5" to "Sonnet 5.5 (중간)"
                ).forEach { (id, label) ->
                    Row(
                        Modifier.fillMaxWidth().clickable { model = id },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(selected = model == id, onClick = { model = id })
                        Text(label)
                    }
                }
            }

            HorizontalDivider()
            Text("개인정보", style = MaterialTheme.typography.titleMedium)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Switch(checked = pseudonymize, onCheckedChange = { pseudonymize = it })
                Spacer(Modifier.width(8.dp))
                Text("LLM에 보낼 때 이름 가리기 (상대/상대2…)")
            }
            OutlinedTextField(
                value = retention, onValueChange = { retention = it.filter(Char::isDigit) },
                label = { Text("메시지 보존 시간 (0 = 저장 안 함)") },
                singleLine = true, modifier = Modifier.fillMaxWidth()
            )

            HorizontalDivider()
            Text("대화 내보내기 가져오기", style = MaterialTheme.typography.titleMedium)
            OutlinedTextField(
                value = myName, onValueChange = { myName = it },
                label = { Text("내 카카오톡 이름 (가져온 대화에서 '나' 구분용)") },
                singleLine = true, modifier = Modifier.fillMaxWidth()
            )
            OutlinedButton(
                onClick = { picker.launch(arrayOf("text/*")) },
                modifier = Modifier.fillMaxWidth()
            ) { Text("카카오톡 내보내기 .txt 가져오기") }
            Text(
                "카카오톡 채팅방 → 메뉴 → 대화 내보내기 → 텍스트로 저장한 파일을 선택하세요. " +
                    "과거 대화 전체 맥락을 답장 생성에 사용합니다.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.outline
            )

            HorizontalDivider()
            Button(
                onClick = {
                    vm.saveSettings(
                        apiKey = apiKey.ifBlank { null },
                        useLlm = useLlm, model = model, pseudonymize = pseudonymize,
                        retentionHours = retention.toIntOrNull() ?: 24, myName = myName
                    )
                    apiKey = ""
                    snack = "저장했어요"
                },
                modifier = Modifier.fillMaxWidth()
            ) { Text("저장") }
            TextButton(
                onClick = { vm.clearAll(); snack = "저장된 대화를 모두 지웠어요" },
                modifier = Modifier.fillMaxWidth()
            ) { Text("저장된 대화 전체 삭제") }
        }
    }
}

private fun copyToClipboard(context: Context, text: String) {
    val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    cm.setPrimaryClip(ClipData.newPlainText("reply", text))
}

private fun shortTime(epoch: Long): String =
    SimpleDateFormat("a h:mm", Locale.KOREA).format(Date(epoch))
