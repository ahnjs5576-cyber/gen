package kr.phonebutler

import android.app.Application
import kr.phonebutler.voice.Speaker

class App : Application() {
    override fun onCreate() {
        super.onCreate()
        Prefs.init(this)
        Speaker.init(this)
    }
}
