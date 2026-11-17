package com.malophone.agent

import android.app.Application
import com.malophone.agent.core.AppSettings
import com.malophone.agent.voice.Speaker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

class App : Application() {

    /** 화면(Activity)이 닫혀도 계속 돌아야 하는 명령 실행용 스코프. */
    val appScope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    lateinit var settings: AppSettings
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this
        settings = AppSettings(this)
        Speaker.init(this)
    }

    companion object {
        lateinit var instance: App
            private set
    }
}
