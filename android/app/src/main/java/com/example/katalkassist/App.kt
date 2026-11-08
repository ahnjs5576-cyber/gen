package com.example.katalkassist

import android.app.Application
import com.example.katalkassist.data.AppDatabase
import com.example.katalkassist.data.Repository

class App : Application() {

    val database: AppDatabase by lazy { AppDatabase.build(this) }
    val repository: Repository by lazy { Repository(database.messageDao()) }

    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    companion object {
        @Volatile
        lateinit var instance: App
            private set
    }
}
