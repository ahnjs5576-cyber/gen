package com.example.katalkassist.util

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Settings + the secure key store.
 *
 * Non-secret toggles live in plain SharedPreferences. Any secret (e.g. an LLM
 * API key the user chooses to add) goes into EncryptedSharedPreferences, which
 * is backed by the Android Keystore — this is the "OS secure secret store" the
 * design calls for. We never write a key to plain prefs, logs, or the DB.
 */
class Prefs(context: Context) {

    private val plain: SharedPreferences =
        context.getSharedPreferences("settings", Context.MODE_PRIVATE)

    private val secure: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "secure_settings",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    /** Retention window for stored messages. Default: 24h. 0 = ephemeral (don't persist). */
    var retentionHours: Int
        get() = plain.getInt(KEY_RETENTION, 24)
        set(v) = plain.edit().putInt(KEY_RETENTION, v).apply()

    /** Capture only rooms the user opted in to (empty = capture all). */
    var allowedRooms: Set<String>
        get() = plain.getStringSet(KEY_ROOMS, emptySet()) ?: emptySet()
        set(v) = plain.edit().putStringSet(KEY_ROOMS, v).apply()

    /** If true, never auto-send; only prepare a draft the user sends manually. */
    var manualSendOnly: Boolean
        get() = plain.getBoolean(KEY_MANUAL_SEND, true)
        set(v) = plain.edit().putBoolean(KEY_MANUAL_SEND, v).apply()

    /** Turn the LLM drafter on. Off => offline template drafter (no network). */
    var useLlm: Boolean
        get() = plain.getBoolean(KEY_USE_LLM, false)
        set(v) = plain.edit().putBoolean(KEY_USE_LLM, v).apply()

    /**
     * Replace real names with stable labels (상대, 상대2, 상대3 …) before sending
     * context to the LLM. Default ON — minimize identifying data leaving the device.
     */
    var pseudonymize: Boolean
        get() = plain.getBoolean(KEY_PSEUDO, true)
        set(v) = plain.edit().putBoolean(KEY_PSEUDO, v).apply()

    /** Claude model id. Default opus-5-5; haiku-5-5 is cheaper/faster for this. */
    var modelId: String
        get() = plain.getString(KEY_MODEL, "claude-opus-5-5") ?: "claude-opus-5-5"
        set(v) = plain.edit().putString(KEY_MODEL, v).apply()

    /** The user's own KakaoTalk display name — used to mark imported messages as "me". */
    var myDisplayName: String
        get() = plain.getString(KEY_MYNAME, "") ?: ""
        set(v) = plain.edit().putString(KEY_MYNAME, v).apply()

    // --- secrets ---

    var llmApiKey: String?
        get() = secure.getString(KEY_LLM, null)
        set(v) = secure.edit().putString(KEY_LLM, v).apply()

    /** True when the LLM path is both enabled and has a key. */
    fun llmReady(): Boolean = useLlm && !llmApiKey.isNullOrBlank()

    companion object {
        private const val KEY_RETENTION = "retention_hours"
        private const val KEY_ROOMS = "allowed_rooms"
        private const val KEY_MANUAL_SEND = "manual_send_only"
        private const val KEY_USE_LLM = "use_llm"
        private const val KEY_PSEUDO = "pseudonymize"
        private const val KEY_MODEL = "model_id"
        private const val KEY_MYNAME = "my_display_name"
        private const val KEY_LLM = "llm_api_key"
    }
}
