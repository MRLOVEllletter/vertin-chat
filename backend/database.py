import os
from contextlib import asynccontextmanager
import aiosqlite
from backend.config import settings


async def init_db():
    """Create database directory, open connection, run pending migrations."""
    db_dir = os.path.dirname(settings.database_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    async with aiosqlite.connect(settings.database_path) as db:
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA foreign_keys=ON")

        # Get applied version
        cursor = await db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
        )
        has_version_table = await cursor.fetchone()

        current_version = 0
        if has_version_table:
            cursor = await db.execute("SELECT MAX(version) FROM schema_version")
            row = await cursor.fetchone()
            if row and row[0] is not None:
                current_version = row[0]

        # Run pending migrations
        migrations_dir = os.path.join(os.path.dirname(__file__), "migrations")
        if os.path.isdir(migrations_dir):
            files = sorted(
                f for f in os.listdir(migrations_dir)
                if f.endswith(".sql") and f[0].isdigit()
            )
            for filename in files:
                version = int(filename.split("_")[0])
                if version > current_version:
                    path = os.path.join(migrations_dir, filename)
                    with open(path, encoding="utf-8") as f:
                        sql = f.read()
                    await db.executescript(sql)
                    await db.execute(
                        "INSERT INTO schema_version (version) VALUES (?)", (version,)
                    )
        await db.commit()


@asynccontextmanager
async def get_db():
    """Async context manager yielding an aiosqlite connection."""
    async with aiosqlite.connect(settings.database_path) as db:
        await db.execute("PRAGMA foreign_keys=ON")
        db.row_factory = aiosqlite.Row
        yield db
