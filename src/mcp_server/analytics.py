"""Local mviewer XML analytics used by MCP tools."""

from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path
from typing import Any
import os
import xml.etree.ElementTree as ET

from .mcp_config import load_mcp_config


load_mcp_config()


def layer_usage(
    root_dir: str | Path | None = None,
    scope: str = "all",
    limit: int = 20,
    include_previews: bool = False,
) -> dict[str, Any]:
    """Count operational layer usage across stored and published mviewer configs."""
    base = Path(root_dir) if root_dir else _apps_root()
    files = _xml_files(base, scope=scope, include_previews=include_previews)
    counter: Counter[str] = Counter()
    details: dict[str, dict[str, Any]] = {}
    apps_by_layer: dict[str, set[str]] = defaultdict(set)
    parsed_files = 0

    for xml_file in files:
        try:
            root = ET.parse(xml_file).getroot()
        except ET.ParseError:
            continue
        parsed_files += 1
        app_title = _application_title(root) or xml_file.stem
        app_ref = _relative_ref(xml_file, base)
        for layer in root.iter("layer"):
            key = _layer_key(layer)
            if not key:
                continue
            counter[key] += 1
            apps_by_layer[key].add(f"{app_title} ({app_ref})")
            details.setdefault(
                key,
                {
                    "id": layer.get("id", ""),
                    "name": layer.get("name", ""),
                    "url": layer.get("url", ""),
                    "type": layer.get("type", ""),
                },
            )

    ranked = []
    for key, count in counter.most_common(max(1, limit)):
        ranked.append(
            {
                **details[key],
                "usage_count": count,
                "usage_key": key,
                "applications": sorted(apps_by_layer[key]),
            }
        )

    return {
        "scope": scope,
        "root_dir": str(base),
        "xml_files_scanned": len(files),
        "xml_files_parsed": parsed_files,
        "unique_layers": len(counter),
        "layers": ranked,
    }


def _apps_root() -> Path:
    return Path(os.getenv("MVIEWER_APPS_ROOT", Path.cwd() / "apps"))


def _xml_files(base: Path, scope: str, include_previews: bool) -> list[Path]:
    if scope not in {"all", "store", "public"}:
        raise ValueError("scope must be one of: all, store, public")
    roots: list[Path] = []
    if scope in {"all", "store"}:
        roots.append(base / "store")
    if scope in {"all", "public"}:
        roots.append(base / "public")
    files: list[Path] = []
    for root in roots:
        if not root.exists():
            continue
        for xml_file in root.rglob("*.xml"):
            if not include_previews and "preview" in xml_file.parts:
                continue
            files.append(xml_file)
    return sorted(files)


def _application_title(root: ET.Element) -> str:
    application = root.find("./application")
    return application.get("title", "") if application is not None else ""


def _layer_key(layer: ET.Element) -> str:
    layer_id = layer.get("id", "").strip()
    url = layer.get("url", "").strip()
    if layer_id and url:
        return f"{url}#{layer_id}"
    return layer_id or layer.get("name", "").strip()


def _relative_ref(path: Path, base: Path) -> str:
    try:
        return str(path.relative_to(base))
    except ValueError:
        return str(path)
