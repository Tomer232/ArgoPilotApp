"""config.py: a missing or invalid setting stops the service at startup with a clear message."""

import os
import shutil
import subprocess
import sys
from pathlib import Path

from helpers import TEST_SETTINGS

SERVICE_DIR = Path(__file__).parent.parent


def import_config_in(folder: Path, settings: dict) -> subprocess.CompletedProcess:
    """Copy config.py into `folder` (so no real .env is next to it) and import it there
    with exactly these settings in the environment."""
    shutil.copy(SERVICE_DIR / "config.py", folder / "config.py")
    env = {k: v for k, v in os.environ.items() if k not in TEST_SETTINGS} | settings
    return subprocess.run(
        [sys.executable, "-c", "import config"],
        cwd=folder,
        env=env,
        capture_output=True,
        text=True,
    )


def test_all_settings_present_starts(tmp_path):
    result = import_config_in(tmp_path, TEST_SETTINGS)
    assert result.returncode == 0, result.stderr


def test_missing_setting_stops_with_clear_message(tmp_path):
    """One setting missing: exit code 1, its name in one readable line, no traceback."""
    settings = {k: v for k, v in TEST_SETTINGS.items() if k != "WEATHER_URL"}
    result = import_config_in(tmp_path, settings)
    assert result.returncode == 1
    assert "WEATHER_URL" in result.stderr
    assert ".env.example" in result.stderr
    assert "Traceback" not in result.stderr


def test_invalid_setting_stops_with_clear_message(tmp_path):
    """A setting out of range (a zero timeout) is caught at startup, not on the first request."""
    result = import_config_in(tmp_path, TEST_SETTINGS | {"REGISTRY_TIMEOUT_SECONDS": "0"})
    assert result.returncode == 1
    assert "REGISTRY_TIMEOUT_SECONDS" in result.stderr
    assert "Traceback" not in result.stderr


def test_settings_from_env_file(tmp_path):
    """A .env next to config.py is enough to start."""
    (tmp_path / ".env").write_text("".join(f"{k}={v}\n" for k, v in TEST_SETTINGS.items()))
    result = import_config_in(tmp_path, {})
    assert result.returncode == 0, result.stderr
