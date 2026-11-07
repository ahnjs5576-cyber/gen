package com.example.katalkassist.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
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
    if (selected.value == null) {
        RoomListScreen(vm) { room ->
            selected.value = room
            vm.selectRoom(room.roomKey)
        }
    } else {
        ThreadScreen(vm, room = selected.value!!, onBack = {
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
fun RoomListScreen(vm: MainViewModel, onOpen: (MessageEntity) -> Unit) {
    val rooms by vm.rooms.collectAsStateWithLifecycle()
    Scaffold(topBar = { TopAppBar(title = { Text("대화") }) }) { pad ->
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
            Text(
                "답장 제안",
                style = MaterialTheme.typography.labelLarge,
                modifier = Modifier.padding(start = 16.dp, top = 12.dp, bottom = 4.dp)
            )
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

private fun copyToClipboard(context: Context, text: String) {
    val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    cm.setPrimaryClip(ClipData.newPlainText("reply", text))
}

private fun shortTime(epoch: Long): String =
    SimpleDateFormat("a h:mm", Locale.KOREA).format(Date(epoch))
