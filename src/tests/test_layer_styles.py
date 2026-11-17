"""Exercise application SLD storage through the Flask API."""

import hashlib
from types import SimpleNamespace

import pytest
from flask import Flask

from ..route import basic_store

SLD = '<sld:StyledLayerDescriptor xmlns:sld="http://www.opengis.net/sld" version="1.0.0"><sld:NamedLayer><sld:Name>Été</sld:Name></sld:NamedLayer></sld:StyledLayerDescriptor>'


@pytest.fixture
def storage(tmp_path):
    app = Flask(__name__)
    app.config.update(
        TESTING=True,
        EXPORT_CONF_FOLDER=str(tmp_path),
        CONF_PATH_FROM_MVIEWER="https://example.org/configs",
        DEFAULT_ORG="Example",
    )
    configs = {
        "app": {
            "id": "app",
            "publisher": "example",
            "creator": "alice",
            "directory": "resources",
        }
    }
    app.register = SimpleNamespace(
        read_json=lambda id: [configs[id]] if id in configs else []
    )
    app.register_blueprint(basic_store)
    client = app.test_client()
    client.environ_base.update(HTTP_SEC_USERNAME="alice", HTTP_SEC_ORG="Example")
    return client, tmp_path / "example" / "app" / "styles", configs


def test_save_list_and_read_style(storage):
    client, directory, _ = storage
    response = client.post(
        "/api/styles/app", data=SLD.encode("utf-8"), content_type="application/xml"
    )
    assert response.status_code == 200
    filename = hashlib.sha256(SLD.encode("utf-8")).hexdigest() + ".sld"
    entry = response.get_json()
    assert entry["filename"] == filename
    assert (
        entry["filepath"]
        == f"https://example.org/configs/example/app/styles/{filename}"
    )
    assert (directory / filename).read_text(encoding="utf-8") == SLD
    listing = client.get("/api/styles/app").get_json()
    assert listing == {
        "success": True,
        "styles": [{"filename": filename, "filepath": entry["filepath"]}],
    }
    read = client.get("/api/styles/app", query_string={"filename": filename})
    assert read.status_code == 200
    assert read.mimetype == "application/vnd.ogc.sld+xml"
    assert read.data.decode("utf-8") == SLD
    read.close()
    assert client.post("/api/styles/app", data=SLD.encode("utf-8")).get_json() == entry
    assert len(list(directory.iterdir())) == 1


@pytest.mark.parametrize("username", [None, "", "   ", "anonymous", " anonymous "])
def test_save_requires_authenticated_user(storage, username):
    client, directory, configs = storage
    client.environ_base.pop("HTTP_SEC_USERNAME")
    configs["app"]["creator"] = "anonymous"
    headers = {}
    if username is not None:
        headers["sec-username"] = username
    response = client.post("/api/styles/app", headers=headers, data=SLD.encode("utf-8"))
    assert response.status_code == 401
    assert not directory.exists()


def test_empty_list_and_missing_file(storage):
    client, directory, _ = storage
    assert client.get("/api/styles/app").get_json() == {"success": True, "styles": []}
    assert not directory.exists()
    assert client.get("/api/styles/app?filename=missing.sld").status_code == 404


def test_named_style_can_be_updated(storage):
    client, directory, _ = storage
    for name in ("Été", "Hiver"):
        content = SLD.replace("Été", name)
        assert (
            client.post(
                "/api/styles/app?filename=layer.sld", data=content.encode("utf-8")
            ).status_code
            == 200
        )
        assert (directory / "layer.sld").read_text(encoding="utf-8") == content
    assert len(list(directory.iterdir())) == 1


@pytest.mark.parametrize("payload", [b"", b" ", b"<invalid", b"<html/>", b"\xff"])
def test_invalid_payload_does_not_create_files(storage, payload):
    client, directory, _ = storage
    assert client.post("/api/styles/app", data=payload).status_code == 400
    assert not directory.exists()


@pytest.mark.parametrize(
    "filename",
    [
        "../outside.sld",
        "/tmp/outside.sld",
        "folder/style.sld",
        "folder\\style.sld",
        "style.xml",
        "nul\x00.sld",
    ],
)
def test_invalid_filename(storage, filename):
    client, directory, _ = storage
    assert (
        client.post(
            "/api/styles/app",
            query_string={"filename": filename},
            data=SLD.encode("utf-8"),
        ).status_code
        == 400
    )
    assert (
        client.get("/api/styles/app", query_string={"filename": filename}).status_code
        == 400
    )
    assert not directory.exists()


@pytest.mark.parametrize("method", ["get", "post"])
def test_unknown_or_foreign_application(storage, method):
    client, directory, configs = storage
    call = getattr(client, method)
    assert call("/api/styles/missing").status_code == 400
    configs["app"]["publisher"] = "other"
    assert call("/api/styles/app", data=SLD.encode("utf-8")).status_code == 403
    assert not directory.exists()


def test_organization_member_can_save_another_creators_style(storage):
    client, directory, _ = storage
    response = client.post(
        "/api/styles/app?filename=shared.sld",
        headers={"sec-username": "bob", "sec-org": "Example"},
        data=SLD.encode("utf-8"),
    )
    assert response.status_code == 200
    assert (directory / "shared.sld").read_text(encoding="utf-8") == SLD


def test_creator_cannot_save_from_a_different_organization(storage):
    client, directory, _ = storage
    response = client.post(
        "/api/styles/app",
        headers={"sec-username": "alice", "sec-org": "Other"},
        data=SLD.encode("utf-8"),
    )
    assert response.status_code == 403
    assert not directory.exists()


def test_only_sld_files_are_listed_and_symlinks_are_rejected(storage, tmp_path):
    client, directory, _ = storage
    directory.mkdir(parents=True)
    (directory / "b.sld").write_text(SLD, encoding="utf-8")
    (directory / "a.sld").write_text(SLD, encoding="utf-8")
    (directory / "notes.txt").write_text("not a style")
    (directory / "subdirectory.sld").mkdir()
    outside = tmp_path / "outside.sld"
    outside.write_text("original")
    (directory / "link.sld").symlink_to(outside)
    names = [
        entry["filename"]
        for entry in client.get("/api/styles/app").get_json()["styles"]
    ]
    assert names == ["a.sld", "b.sld"]
    assert client.get("/api/styles/app?filename=link.sld").status_code == 400
    assert (
        client.post(
            "/api/styles/app?filename=link.sld", data=SLD.encode("utf-8")
        ).status_code
        == 400
    )
    assert outside.read_text() == "original"


def test_directory_cannot_escape_application(storage, tmp_path):
    client, directory, _ = storage
    outside = tmp_path / "other"
    outside.mkdir()
    directory.parent.mkdir(parents=True)
    directory.symlink_to(outside, target_is_directory=True)
    assert client.get("/api/styles/app").status_code == 400
    assert client.post("/api/styles/app", data=SLD.encode("utf-8")).status_code == 400
    assert list(outside.iterdir()) == []
