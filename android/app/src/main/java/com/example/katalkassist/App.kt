package com.example.katalkassist

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.example.katalkassist.data.AppDatabase
import com.example.katalkassist.data.Repository

class App : Application() {

    val database: AppDatabase by lazy { AppDatabase.build(this) }
    val repository: Repository by lazy { Repository(database.messageDao()) }

    override fun onCreate() {
        super.onCreate()
        instance = this
        createStatusChannel()
    }

    private fun createStatusChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_STATUS,
                getString(R.string.channel_status),
                NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }
    }

    companion object {
        const val CHANNEL_STATUS = "status"

        @Volatile
        lateinit var instance: App
            private set
    }
}
