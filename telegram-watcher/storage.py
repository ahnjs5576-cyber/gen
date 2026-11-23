"""로컬 SQLite 저장소: 수신 메시지 로그, 감시 대화방, 알림 키워드."""
from __future__ import annotations

import sqlite3
import time
from pathlib import Path


class Storage:
    def __init__(self, path: Path):
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.executescript(
            """
            CREATE TABLE IF NOT EXISTS messages (
                chat_id   INTEGER NOT NULL,
                msg_id    INTEGER NOT NULL,
                chat_name TEXT,
                sender    TEXT,
                text      TEXT,
                ts        INTEGER NOT NULL,
                PRIMARY KEY (chat_id, msg_id)
            );
            CREATE INDEX IF NOT EXISTS idx_messages_ts ON messages(ts);
            CREATE TABLE IF NOT EXISTS watch (
                chat_id INTEGER PRIMARY KEY,
                name    TEXT
            );
            CREATE TABLE IF NOT EXISTS keywords (
                word TEXT PRIMARY KEY
            );
            """
        )
        self.db.commit()

    # ── 메시지 로그 ──────────────────────────────────
    def log_message(self, chat_id: int, msg_id: int, chat_name: str,
                    sender: str, text: str, ts: int) -> None:
        self.db.execute(
            "INSERT OR REPLACE INTO messages VALUES (?,?,?,?,?,?)",
            (chat_id, msg_id, chat_name, sender, text, ts),
        )
        self.db.commit()

    def query_log(self, chat_id: int | None = None, hours: float = 24,
                  limit: int = 200) -> list[sqlite3.Row]:
        since = int(time.time() - hours * 3600)
        if chat_id is None:
            rows = self.db.execute(
                "SELECT * FROM messages WHERE ts >= ? ORDER BY ts DESC LIMIT ?",
                (since, limit),
            )
        else:
            rows = self.db.execute(
                "SELECT * FROM messages WHERE chat_id = ? AND ts >= ? "
                "ORDER BY ts DESC LIMIT ?",
                (chat_id, since, limit),
            )
        return list(reversed(rows.fetchall()))

    # ── 감시 대화방 ──────────────────────────────────
    def add_watch(self, chat_id: int, name: str) -> None:
        self.db.execute("INSERT OR REPLACE INTO watch VALUES (?,?)", (chat_id, name))
        self.db.commit()

    def remove_watch(self, chat_id: int) -> bool:
        cur = self.db.execute("DELETE FROM watch WHERE chat_id = ?", (chat_id,))
        self.db.commit()
        return cur.rowcount > 0

    def watched(self) -> dict[int, str]:
        return {r["chat_id"]: r["name"] for r in self.db.execute("SELECT * FROM watch")}

    # ── 키워드 ───────────────────────────────────────
    def add_keyword(self, word: str) -> None:
        self.db.execute("INSERT OR IGNORE INTO keywords VALUES (?)", (word,))
        self.db.commit()

    def remove_keyword(self, word: str) -> bool:
        cur = self.db.execute("DELETE FROM keywords WHERE word = ?", (word,))
        self.db.commit()
        return cur.rowcount > 0

    def keywords(self) -> list[str]:
        return [r["word"] for r in self.db.execute("SELECT word FROM keywords")]
