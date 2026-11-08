package com.example.katalkassist.importer

import android.content.Context
import android.net.Uri
import com.example.katalkassist.data.MessageEntity
import com.example.katalkassist.data.Repository
import com.example.katalkassist.util.Prefs
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader

class ImportManager(
    private val context: Context,
    private val repo: Repository,
    private val prefs: Prefs
) {

    data class Outcome(val roomName: String, val imported: Int)

    /**
     * Reads a KakaoTalk export .txt from [uri] (picked via the system file
     * picker), parses it, and stores the messages. Messages whose sender matches
     * the user's configured display name are marked as "me".
     */
    suspend fun importFrom(uri: Uri): Outcome = withContext(Dispatchers.IO) {
        val myName = prefs.myDisplayName.trim()

        val result = context.contentResolver.openInputStream(uri).use { stream ->
            requireNotNull(stream) { "파일을 열 수 없어요" }
            BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).useLines { lines ->
                KakaoExportParser.parse(lines)
            }
        }

        for (msg in result.messages) {
            val isMine = myName.isNotBlank() && msg.sender == myName
            repo.add(
                MessageEntity(
                    // Key by room name (no "import:" prefix) so imported history
                    // merges into the SAME room as live notifications when the
                    // conversation title matches — past context then feeds the drafter.
                    roomKey = result.roomName,
                    roomName = result.roomName,
                    sender = if (isMine) "나" else msg.sender,
                    text = msg.text,
                    receivedAt = msg.epochMillis,
                    canReply = false,   // imported history can't be replied to directly
                    isMine = isMine
                )
            )
        }
        Outcome(result.roomName, result.messages.size)
    }
}
