import os
from pathlib import Path


_TEST_DB_PATH = Path(__file__).resolve().parents[1] / ".pytest_cache" / "sentinelpay-test.db"
_TEST_DB_PATH.parent.mkdir(exist_ok=True)

try:
    _TEST_DB_PATH.unlink()
except FileNotFoundError:
    pass

os.environ.setdefault("SENTINELPAY_DATABASE_URL", f"sqlite:///{_TEST_DB_PATH.as_posix()}")
