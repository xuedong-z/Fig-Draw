from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_PATH = ROOT / "templates" / "reference_templates.json"
JOURNAL_PATH = ROOT / "templates" / "journal_presets.json"


@lru_cache(maxsize=1)
def load_reference_templates() -> List[Dict[str, Any]]:
    with TEMPLATE_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


@lru_cache(maxsize=1)
def load_journal_presets() -> List[Dict[str, Any]]:
    with JOURNAL_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def get_reference_template(template_id: str) -> Dict[str, Any]:
    for template in load_reference_templates():
        if template["id"] == template_id:
            return template
    raise KeyError(f"Reference template '{template_id}' was not found.")
