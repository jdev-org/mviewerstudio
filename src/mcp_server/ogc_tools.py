"""OGC discovery helpers used by MCP tools.

For now this module focuses on WMS and CSW because mviewer layers are commonly
added from WMS GetCapabilities documents or discovered through CSW metadata
catalogs. It returns plain dictionaries that can be fed directly into
`LayerSpec.from_dict`.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Optional
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse
import json
import os
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape
import requests


XLINK_HREF = "{http://www.w3.org/1999/xlink}href"
CSW_NS = "http://www.opengis.net/cat/csw/2.0.2"
OGC_NS = "http://www.opengis.net/ogc"
GMD_NS = "http://www.isotc211.org/2005/gmd"


def allowed_ogc_hosts() -> list[str]:
    """Return hosts that MCP OGC tools are allowed to contact.

    The allow-list is generated from `app_conf.data_providers.wms` and
    `app_conf.data_providers.csw` in config.json. Operators can still add
    deployment-specific exceptions with MVIEWERSTUDIO_MCP_ALLOWED_HOSTS.
    """
    return sorted(_allowed_hosts())


def search_csw_records(
    url: str,
    keyword: str = "",
    limit: int = 20,
) -> list[dict[str, Any]]:
    """Search metadata records in a CSW endpoint.

    Returned records keep metadata fields, and when the CSW record advertises a
    WMS resource they also include `id`, `name`, `type` and `url` fields that can
    be reused directly in a LayerSpec.
    """
    root = _fetch_csw_records(url, keyword=keyword, limit=limit)
    metadata_url = _metadata_baseref_for_url(url)
    records = _parse_csw_records(root, url, metadata_url)
    return records[:limit]


def search_wms_layers(url: str, keyword: str = "", limit: int = 20) -> list[dict[str, Any]]:
    """Return WMS named layers matching the optional keyword."""
    root = _fetch_wms_capabilities(url)
    layers = _parse_wms_layers(root, _capabilities_service_url(root, url))
    if keyword:
        lowered = keyword.lower()
        layers = [
            layer
            for layer in layers
            if lowered in layer.get("title", "").lower()
            or lowered in layer.get("abstract", "").lower()
            or lowered in layer.get("id", "").lower()
        ]
    return layers[:limit]


def inspect_wms_layer(url: str, layer_id: str) -> dict[str, Any]:
    """Return one parsed WMS layer by technical layer name."""
    root = _fetch_wms_capabilities(url)
    service_url = _capabilities_service_url(root, url)
    layers = _parse_wms_layers(root, service_url)
    for layer in layers:
        if layer.get("id") == layer_id:
            return layer
    raise ValueError(f"WMS layer not found: {layer_id}")


def _fetch_wms_capabilities(url: str) -> ET.Element:
    """Fetch and parse a WMS 1.3.0 GetCapabilities document."""
    _assert_allowed_url(url)
    capabilities_url = _with_query(
        url,
        {
            "SERVICE": "WMS",
            "REQUEST": "GetCapabilities",
            "VERSION": "1.3.0",
        },
    )
    response = requests.get(capabilities_url, timeout=30)
    response.raise_for_status()
    return ET.fromstring(response.content)


def _fetch_csw_records(url: str, keyword: str = "", limit: int = 20) -> ET.Element:
    """Fetch and parse a CSW GetRecords response."""
    _assert_allowed_url(url)
    response = requests.post(
        url,
        data=_csw_get_records_body(keyword=keyword, limit=limit).encode("utf-8"),
        headers={"Content-Type": "application/xml"},
        timeout=30,
    )
    response.raise_for_status()
    return ET.fromstring(response.content)


def _csw_get_records_body(keyword: str = "", limit: int = 20) -> str:
    """Build a CSW 2.0.2 XML query compatible with GeoNetwork-style catalogs."""
    escaped_keyword = escape(keyword)
    constraint = _csw_keyword_constraint(escaped_keyword) if keyword else ""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<csw:GetRecords
    xmlns:csw="{CSW_NS}"
    xmlns:ogc="{OGC_NS}"
    xmlns:gmd="{GMD_NS}"
    service="CSW"
    version="2.0.2"
    resultType="results"
    outputSchema="csw:IsoRecord"
    startPosition="1"
    maxRecords="{max(1, min(limit, 100))}">
  <csw:Query typeNames="gmd:MD_Metadata">
    <csw:ElementSetName>full</csw:ElementSetName>
    {constraint}
  </csw:Query>
</csw:GetRecords>"""


def _csw_keyword_constraint(keyword: str) -> str:
    """Build a broad keyword filter over common CSW metadata fields."""
    fields = ("Title", "AlternateTitle", "Identifier", "ResourceIdentifier", "Abstract", "Subject")
    filters = "\n".join(
        f"""      <ogc:PropertyIsLike matchCase="false" wildCard="*" singleChar="." escapeChar="!">
        <ogc:PropertyName>{field}</ogc:PropertyName>
        <ogc:Literal>*{keyword}*</ogc:Literal>
      </ogc:PropertyIsLike>"""
        for field in fields
    )
    return f"""<csw:Constraint version="1.1.0">
      <ogc:Filter>
        <ogc:Or>
{filters}
        </ogc:Or>
      </ogc:Filter>
    </csw:Constraint>"""


def _assert_allowed_url(url: str) -> None:
    """Restrict remote OGC calls to configured providers and explicit extras."""
    allowed = _allowed_hosts()
    if not allowed:
        if _allow_unconfigured_hosts():
            return
        raise ValueError(
            "No OGC host is allowed. Configure config.json data_providers, "
            "MVIEWERSTUDIO_MCP_ALLOWED_HOSTS, or set "
            "MVIEWERSTUDIO_MCP_ALLOW_UNCONFIGURED_HOSTS=true for development."
        )
    host = _host_from_url(url)
    if host not in allowed:
        raise ValueError(
            f"Host {host} is not allowed. Add it to config.json data_providers "
            "or MVIEWERSTUDIO_MCP_ALLOWED_HOSTS."
        )


def _allow_unconfigured_hosts() -> bool:
    """Allow unrestricted OGC calls only when explicitly requested."""
    return os.getenv("MVIEWERSTUDIO_MCP_ALLOW_UNCONFIGURED_HOSTS", "").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _metadata_baseref_for_url(url: str) -> str:
    """Return the configured CSW human-readable metadata base URL if available."""
    target_host = _host_from_url(url)
    for provider in _configured_providers("csw"):
        if _host_from_url(provider.get("url", "")) == target_host:
            return str(provider.get("baseref", ""))
    return ""


def _allowed_hosts() -> set[str]:
    """Build the network allow-list from config.json and optional env extras."""
    return _configured_provider_hosts() | _env_allowed_hosts()


def _configured_providers(provider_type: str) -> list[dict[str, Any]]:
    """Read configured providers of one type from config.json."""
    providers = _configured_data_providers()
    return [
        provider
        for provider in providers.get(provider_type, [])
        if isinstance(provider, dict)
    ]


def _configured_data_providers() -> dict[str, Any]:
    """Read the data_providers section from the frontend configuration."""
    config_path = Path(
        os.getenv(
            "MVIEWERSTUDIO_CONFIG_PATH",
            Path(__file__).resolve().parents[1] / "static" / "config.json",
        )
    )
    try:
        with config_path.open(encoding="utf-8") as config_file:
            data = json.load(config_file)
    except (OSError, json.JSONDecodeError):
        return {}
    return data.get("app_conf", {}).get("data_providers", {})


def _configured_provider_hosts() -> set[str]:
    """Extract WMS and CSW provider hosts from the frontend configuration."""
    hosts: set[str] = set()
    for provider_type in ("wms", "csw"):
        for provider in _configured_providers(provider_type):
            host = _host_from_url(provider.get("url", ""))
            if host:
                hosts.add(host)
    return hosts


def _env_allowed_hosts() -> set[str]:
    """Read optional extra hosts for deployments with additional open flows."""
    return {
        host.strip().lower()
        for host in os.getenv("MVIEWERSTUDIO_MCP_ALLOWED_HOSTS", "").split(",")
        if host.strip()
    }


def _host_from_url(url: str) -> str:
    """Normalize a URL or host value into a lowercase hostname."""
    parsed = urlparse(url if "://" in url else f"//{url}")
    return (parsed.hostname or "").lower()


def _with_query(url: str, params: dict[str, str]) -> str:
    """Merge query parameters without dropping provider-specific parameters."""
    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query.update(params)
    return urlunparse(parsed._replace(query=urlencode(query)))


def _parse_csw_records(
    root: ET.Element,
    csw_url: str,
    metadata_url: str = "",
) -> list[dict[str, Any]]:
    """Parse ISO and Dublin Core CSW records into layer-friendly dictionaries."""
    records: list[dict[str, Any]] = []
    iso_records = [
        element for element in root.iter() if _local_name(element.tag) == "MD_Metadata"
    ]
    if iso_records:
        for metadata in iso_records:
            records.extend(_parse_iso_metadata_record(metadata, csw_url, metadata_url))
        return records

    dc_records = [
        element for element in root.iter() if _local_name(element.tag) == "Record"
    ]
    for metadata in dc_records:
        records.extend(_parse_dc_metadata_record(metadata, csw_url, metadata_url))
    return records


def _parse_iso_metadata_record(
    metadata: ET.Element,
    csw_url: str,
    metadata_url: str,
) -> list[dict[str, Any]]:
    """Parse one ISO 19139 metadata document."""
    identifier = _first_descendant_text(metadata, "fileIdentifier")
    resources = _iso_online_resources(metadata)
    record = {
        "metadata_identifier": identifier,
        "title": _first_descendant_text(metadata, "title"),
        "name": _first_descendant_text(metadata, "title") or identifier,
        "abstract": _first_descendant_text(metadata, "abstract"),
        "attribution": _first_descendant_text(metadata, "organisationName"),
        "image": _first_descendant_text(metadata, "fileName"),
        "metadata": f"{metadata_url}{identifier}" if metadata_url and identifier else "",
        "metadata_csw": _csw_get_record_by_id_url(csw_url, identifier) if identifier else "",
        "resources": resources,
    }
    return _records_from_online_resources(record, resources)


def _parse_dc_metadata_record(
    metadata: ET.Element,
    csw_url: str,
    metadata_url: str,
) -> list[dict[str, Any]]:
    """Parse one CSW Dublin Core record."""
    identifier = _first_descendant_text(metadata, "identifier")
    resources = _dc_online_resources(metadata)
    record = {
        "metadata_identifier": identifier,
        "title": _first_descendant_text(metadata, "title"),
        "name": _first_descendant_text(metadata, "title") or identifier,
        "abstract": _first_descendant_text(metadata, "abstract"),
        "attribution": _first_descendant_text(metadata, "publisher"),
        "metadata": f"{metadata_url}{identifier}" if metadata_url and identifier else "",
        "metadata_csw": _csw_get_record_by_id_url(csw_url, identifier) if identifier else "",
        "resources": resources,
    }
    return _records_from_online_resources(record, resources)


def _records_from_online_resources(
    record: dict[str, Any],
    resources: list[dict[str, str]],
) -> list[dict[str, Any]]:
    """Return one layer-ready record per WMS resource, or the metadata record."""
    wms_resources = [
        resource for resource in resources if "OGC:WMS" in resource.get("protocol", "")
    ]
    if not wms_resources:
        return [{**record, "id": record["metadata_identifier"], "type": "metadata", "url": ""}]

    records: list[dict[str, Any]] = []
    for resource in wms_resources:
        layer_id = resource.get("name") or record["metadata_identifier"]
        records.append(
            {
                **record,
                "id": layer_id,
                "layer_id": layer_id,
                "name": record["name"],
                "type": "wms",
                "url": _strip_wms_params(resource.get("url", "")),
                "wms": _strip_wms_params(resource.get("url", "")),
            }
        )
    return records


def _iso_online_resources(metadata: ET.Element) -> list[dict[str, str]]:
    """Extract ISO CI_OnlineResource entries."""
    resources: list[dict[str, str]] = []
    for resource in metadata.iter():
        if _local_name(resource.tag) != "CI_OnlineResource":
            continue
        resources.append(
            {
                "protocol": _first_descendant_text(resource, "protocol"),
                "name": _first_descendant_text(resource, "name"),
                "url": _first_descendant_text(resource, "URL"),
                "description": _first_descendant_text(resource, "description"),
            }
        )
    return [resource for resource in resources if resource.get("url")]


def _dc_online_resources(metadata: ET.Element) -> list[dict[str, str]]:
    """Extract online resources from CSW Dublin Core records."""
    resources: list[dict[str, str]] = []
    for element in metadata.iter():
        protocol = element.get("protocol", "")
        url = _element_text(element)
        if protocol and url:
            resources.append(
                {
                    "protocol": protocol,
                    "name": element.get("name", ""),
                    "url": url,
                    "description": "",
                }
            )
    return resources


def _csw_get_record_by_id_url(csw_url: str, identifier: str) -> str:
    """Build a CSW GetRecordById URL for the raw XML metadata record."""
    return _with_query(
        csw_url,
        {
            "SERVICE": "CSW",
            "VERSION": "2.0.2",
            "REQUEST": "GetRecordById",
            "ELEMENTSETNAME": "full",
            "ID": identifier,
        },
    )


def _parse_wms_layers(root: ET.Element, service_url: str) -> list[dict[str, Any]]:
    """Extract all named layers from the WMS capability tree."""
    capability = _first_child(root, "Capability")
    if capability is None:
        return []
    top_layer = _first_child(capability, "Layer")
    if top_layer is None:
        return []
    results: list[dict[str, Any]] = []
    _walk_layer(top_layer, service_url, results)
    return results


def _walk_layer(
    layer_node: ET.Element,
    service_url: str,
    results: list[dict[str, Any]],
    parent_title: str = "",
) -> None:
    """Depth-first traversal preserving the human-readable parent path."""
    title = _child_text(layer_node, "Title")
    layer_id = _child_text(layer_node, "Name")
    extended_title = " > ".join(part for part in [parent_title, title] if part)
    if layer_id:
        results.append(
            {
                "id": layer_id,
                "name": title or layer_id,
                "title": title or layer_id,
                "extended_title": extended_title or title or layer_id,
                "abstract": _child_text(layer_node, "Abstract"),
                "url": service_url,
                "type": "wms",
                "queryable": layer_node.get("queryable") == "1",
                "attribution": _attribution(layer_node),
                "metadata": _metadata_url(layer_node, "text/html"),
                "metadata_csw": _metadata_url(layer_node, "text/xml")
                or _metadata_url(layer_node, "text/plain"),
                "styles": _styles(layer_node),
                "bbox": _bbox(layer_node),
            }
        )
    for child in _children(layer_node, "Layer"):
        _walk_layer(child, service_url, results, extended_title or parent_title)


def _capabilities_service_url(root: ET.Element, fallback: str) -> str:
    """Prefer the service URL advertised by the server, then sanitize fallback."""
    capability = _first_child(root, "Capability")
    if capability is None:
        return _strip_wms_params(fallback)
    request = _first_child(capability, "Request")
    get_capabilities = _first_child(request, "GetCapabilities") if request is not None else None
    dcp = _first_child(get_capabilities, "DCPType") if get_capabilities is not None else None
    http = _first_child(dcp, "HTTP") if dcp is not None else None
    get = _first_child(http, "Get") if http is not None else None
    online = _first_child(get, "OnlineResource") if get is not None else None
    if online is None:
        return _strip_wms_params(fallback)
    return _strip_wms_params(online.get(XLINK_HREF) or online.get("href") or fallback)


def _strip_wms_params(url: str) -> str:
    """Remove GetCapabilities-only params while keeping custom provider params."""
    parsed = urlparse(url)
    ignored = {"service", "request", "version"}
    params = [
        (key, value)
        for key, value in parse_qsl(parsed.query, keep_blank_values=True)
        if key.lower() not in ignored
    ]
    return urlunparse(parsed._replace(query=urlencode(params)))


def _styles(layer_node: ET.Element) -> list[dict[str, str]]:
    """Extract WMS styles and legend URLs from one layer node."""
    styles: list[dict[str, str]] = []
    for style in _children(layer_node, "Style"):
        legend_url = ""
        legend = _first_child(style, "LegendURL")
        online = _first_child(legend, "OnlineResource") if legend is not None else None
        if online is not None:
            legend_url = online.get(XLINK_HREF) or online.get("href") or ""
        styles.append({"name": _child_text(style, "Name"), "legend_url": legend_url})
    return styles


def _bbox(layer_node: ET.Element) -> dict[str, str]:
    """Return the geographic bbox when available, otherwise the first bbox."""
    bbox = _first_child(layer_node, "EX_GeographicBoundingBox")
    if bbox is not None:
        return {
            "west": _child_text(bbox, "westBoundLongitude"),
            "south": _child_text(bbox, "southBoundLatitude"),
            "east": _child_text(bbox, "eastBoundLongitude"),
            "north": _child_text(bbox, "northBoundLatitude"),
        }
    bbox = _first_child(layer_node, "BoundingBox")
    if bbox is None:
        return {}
    return {
        "crs": bbox.get("CRS") or bbox.get("SRS") or "",
        "minx": bbox.get("minx") or "",
        "miny": bbox.get("miny") or "",
        "maxx": bbox.get("maxx") or "",
        "maxy": bbox.get("maxy") or "",
    }


def _attribution(layer_node: ET.Element) -> str:
    """Return the provider attribution title for one WMS layer."""
    attribution = _first_child(layer_node, "Attribution")
    if attribution is None:
        return ""
    return _child_text(attribution, "Title")


def _metadata_url(layer_node: ET.Element, mime_type: str) -> str:
    """Return the first metadata URL matching a specific MIME type."""
    for metadata in _children(layer_node, "MetadataURL"):
        if _child_text(metadata, "Format") == mime_type:
            online = _first_child(metadata, "OnlineResource")
            if online is not None:
                return online.get(XLINK_HREF) or online.get("href") or ""
    return ""


def _children(node: Optional[ET.Element], name: str) -> list[ET.Element]:
    """Find direct children by local tag name, ignoring XML namespaces."""
    if node is None:
        return []
    return [child for child in list(node) if _local_name(child.tag) == name]


def _first_child(node: Optional[ET.Element], name: str) -> Optional[ET.Element]:
    """Return the first direct child matching a local tag name."""
    children = _children(node, name)
    return children[0] if children else None


def _child_text(node: Optional[ET.Element], name: str) -> str:
    """Return stripped text for a direct child, or an empty string."""
    child = _first_child(node, name)
    if child is None or child.text is None:
        return ""
    return child.text.strip()


def _first_descendant_text(node: ET.Element, name: str) -> str:
    """Return stripped text for the first descendant matching a local tag name."""
    for descendant in node.iter():
        if _local_name(descendant.tag) == name:
            return _element_text(descendant)
    return ""


def _element_text(node: ET.Element) -> str:
    """Return all text contained in an element and its descendants."""
    return " ".join(part.strip() for part in node.itertext() if part.strip())


def _local_name(tag: str) -> str:
    """Return the tag name without its XML namespace."""
    return tag.rsplit("}", 1)[-1]
