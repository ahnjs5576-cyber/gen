package com.example.katalkassist.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [MessageEntity::class], version = 2, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun messageDao(): MessageDao

    companion object {
        fun build(context: Context): AppDatabase =
            Room.databaseBuilder(
                context.applicationContext,
                AppDatabase::class.java,
                "katalk-assist.db"
            )
                // The DB only caches recent/imported messages — all reconstructable
                // from notifications or a re-import — so a destructive upgrade is fine
                // here and avoids shipping migrations for a local-only cache.
                .fallbackToDestructiveMigration()
                .build()
    }
}
