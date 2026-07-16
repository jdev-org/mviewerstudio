# create a fixture with 3 files, 2 belong to user1 and the other belong to user2.
from .utils.login_utils import _get_current_user, User
import pytest
from .app_factory import create_app
import hashlib
import os
from pathlib import Path
import shutil

test_xml = """<?xml version="1.0" encoding="UTF-8"?>
<config mviewerstudioversion="3.1">
<metadata>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/">
<rdf:Description rdf:about="http://www.ilrt.bristol.ac.uk/people/cmdjb/">
<dc:title>{title}</dc:title>
<dc:creator>{creator}</dc:creator>
<dc:publisher>{publisher}</dc:publisher>

<dc:date>2020-01-03T14:23:51.018Z</dc:date>
</rdf:Description>
</rdf:RDF>
</metadata>
<application
    title="testapp"
    logo=""
    help=""
    style="css/themes/default.css"
    exportpng="false"
    showhelp="false"
    coordinates="false"
    measuretools="false"
    togglealllayersfromtheme="false">
</application>
<mapoptions maxzoom="20" projection="EPSG:3857" center="-307903.74898791354,6141345.088741366" zoom="7" />
<proxy url='../proxy/?url='/>
<searchparameters bbox="false" localities="false" features="false" static="false"/>
<baselayers style="default">
    <baselayer visible="true" id="positron" thumbgallery="img/basemap/positron.png" title="CartoDb" label="Positron" type="OSM" url="https://basemaps.cartocdn.com/light_all.png" attribution="Map tiles by  &lt;a href=&quot;https://cartodb.com/attributions&quot;&gt;CartoDb&lt;/a&gt;, under  &lt;a href=&quot;https://creativecommons.org/licenses/by/3.0/&quot;&gt;CC BY 3.0 &lt;/a&gt;"  ></baselayer>
    <baselayer visible="false" id="esriworldimagery" thumbgallery="img/basemap/esriworldwide.jpg" title="Esri" label="Esri world imagery" type="OSM" url="http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile" attribution="Esri world imagery"  ></baselayer>
</baselayers>
<themes mini="false">
</themes>
</config>
"""


@pytest.fixture
def cleandir():
    yield
    shutil.rmtree(Path("./store"), ignore_errors=True)


@pytest.fixture
def client():
    app = create_app()
    app.testing = True
    with app.test_client() as c:
        yield c


@pytest.fixture
def header_client1():
    return {
        "sec-username": "foo",
        "sec-org": "bar",
        "sec-roles": "USER;SUPERUSER",
        "sec-firstname": "baz",
        "sec-lastname": "baf",
    }


@pytest.fixture
def header_client2():
    return {
        "sec-username": "toto",
        "sec-org": "titi",
        "sec-roles": "USER;SUPERUSER",
        "sec-firstname": "tata",
        "sec-lastname": "bibi",
    }


@pytest.mark.usefixtures("cleandir")
class TestAuthenticationUser:
    def test_no_headers(self):
        app = create_app()
        app.testing = True
        with app.test_request_context("/"):
            c = _get_current_user()
            assert isinstance(c, User)
            assert c.username == "anonymous"
            assert c.firstname == "anonymous"
            assert c.lastname == "anonymous"
            assert c.organisation == "public"
            assert c.roles == [""]

    def test_headers(self):
        app = create_app()
        app.testing = True
        headers = {
            "sec-username": "foo",
            "sec-org": "bar",
            "sec-roles": "USER;SUPERUSER",
            "sec-firstname": "baz",
        }
        with app.test_request_context("/", headers=headers):
            c = _get_current_user()
            assert isinstance(c, User)
            assert c.username == "foo"
            assert c.organisation == "bar"
            assert c.roles == ["USER", "SUPERUSER"]
            assert c.firstname == "baz"
            # this should not happened IRL.
            assert c.lastname == "anonymous"

    def test_keycloak_headers(self):
        app = create_app()
        app.testing = True
        app.config["MVIEWERSTUDIO_AUTH_TYPE"] = "keycloak"
        headers = {
            "X-Forwarded-Preferred-Username": "foo",
            "X-Forwarded-Given-Name": "baz",
            "X-Forwarded-Family-Name": "baf",
            "X-Forwarded-Org": "bar",
            "X-Forwarded-Roles": "USER,ADMIN",
        }
        with app.test_request_context("/", headers=headers):
            c = _get_current_user()
            assert isinstance(c, User)
            assert c.username == "foo"
            assert c.organisation == "bar"
            assert c.roles == ["USER", "ADMIN"]
            assert c.firstname == "baz"
            assert c.lastname == "baf"


class TestUserInfos:
    def test_anonymous(self, client):
        r = client.get("/srv/user_info")
        assert r.status_code == 200
        assert isinstance(r.json, dict)
        assert r.json == {
            "first_name": "anonymous",
            "last_name": "anonymous",
            "organisation": {"legal_name": None},
            "roles": [""],
            "user_name": "anonymous",
        }

    def test_client1(self, client, header_client1):
        r = client.get("/srv/user_info", headers=header_client1)
        assert r.status_code == 200
        assert isinstance(r.json, dict)
        assert r.json == {
            "first_name": "baz",
            "last_name": "baf",
            "organisation": {"legal_name": "bar"},
            "roles": ["USER", "SUPERUSER"],
            "user_name": "foo",
        }


class TestKeycloakAccessProtection:
    def test_keycloak_access_requires_authenticated_user(self):
        app = create_app()
        app.testing = True
        app.config["MVIEWERSTUDIO_AUTH_TYPE"] = "keycloak"
        with app.test_client() as client:
            r = client.get("/api/user")
            assert r.status_code == 401

    def test_keycloak_access_allows_authenticated_user(self):
        app = create_app()
        app.testing = True
        app.config["MVIEWERSTUDIO_AUTH_TYPE"] = "keycloak"
        with app.test_client() as client:
            r = client.get(
                "/api/user",
                headers={
                    "X-Forwarded-Preferred-Username": "foo",
                    "X-Forwarded-Roles": "VIEWER",
                },
            )
            assert r.status_code == 200
            assert r.json["user_name"] == "foo"

    def test_oidc_alias_requires_authenticated_user(self):
        app = create_app()
        app.testing = True
        app.config["MVIEWERSTUDIO_AUTH_TYPE"] = "oidc"
        with app.test_client() as client:
            r = client.get("/api/user")
            assert r.status_code == 401


class TestAuthenticationModes:
    def test_public_mode_keeps_api_user_public(self):
        app = create_app()
        app.testing = True
        app.config["MVIEWERSTUDIO_AUTH_MODE"] = "public"
        with app.test_client() as client:
            response = client.get("/api/user")
            assert response.status_code == 200
            assert response.json["user_name"] == "anonymous"

    def test_proxy_mode_requires_forwarded_identity(self):
        app = create_app()
        app.testing = True
        app.config["MVIEWERSTUDIO_AUTH_MODE"] = "proxy"
        with app.test_client() as client:
            response = client.get("/api/user")
            assert response.status_code == 401

    def test_authlib_mode_uses_session_claims(self):
        app = create_app()
        app.testing = True
        app.config["MVIEWERSTUDIO_AUTH_MODE"] = "authlib"
        with app.test_client() as client:
            with client.session_transaction() as flask_session:
                flask_session["mviewerstudio.auth.claims"] = {
                    "preferred_username": "alice",
                    "given_name": "Alice",
                    "family_name": "Martin",
                    "organization": "acme",
                    "roles": ["EDITOR"],
                }

            response = client.get("/api/user")
            assert response.status_code == 200
            assert response.json["user_name"] == "alice"
            assert response.json["roles"] == ["EDITOR"]

    def test_authlib_mode_api_user_returns_login_url_when_anonymous(self):
        app = create_app()
        app.testing = True
        app.config["MVIEWERSTUDIO_AUTH_MODE"] = "authlib"
        with app.test_client() as client:
            response = client.get(
                "/api/user",
                headers={"X-Auth-Return-To": "https://example.test/mviewerstudio/index.html"},
            )
            assert response.status_code == 401
            assert response.json["error"] == "authentication_required"
            assert response.json["redirect_url"] == "http://localhost/"
            assert (
                response.json["login_url"]
                == "/auth/login?next=https://example.test/mviewerstudio/index.html"
            )

    def test_authlib_mode_root_redirects_anonymous_user_outside_studio(self):
        app = create_app()
        app.testing = True
        app.config["MVIEWERSTUDIO_AUTH_MODE"] = "authlib"
        app.config["MVIEWERSTUDIO_URL_PATH_PREFIX"] = "mviewerstudio"
        app.config["MVIEWERSTUDIO_AUTHLIB_ANONYMOUS_REDIRECT_URL"] = "https://example.test/"
        with app.test_client() as client:
            response = client.get("/mviewerstudio")
            assert response.status_code == 302
            assert response.headers["Location"] == "https://example.test/"


@pytest.mark.usefixtures("cleandir")
class TestStoreMviewerConfig:
    def test_store(self, client, header_client1):
        client_data = test_xml.format(
            title="test_store1", creator="test_user", publisher="test_publisher"
        )
        filehash = hashlib.md5()
        filehash.update(client_data.encode("utf-8"))
        filehash = filehash.hexdigest()
        p = client.post("/srv/store", data=client_data, headers=header_client1)
        assert p.status_code == 200
        assert p.json == {"filepath": f"{filehash}.xml", "success": True}
        assert len(os.listdir("./store")) == 2
        assert f"{filehash}.xml" in os.listdir("./store")


@pytest.mark.usefixtures("cleandir")
class TestListStoredMviewerConfig:
    def test_list_one(self, client, header_client1):
        """
        create a file and list it.
        """
        client_data = test_xml.format(
            title="test_store2", creator="foo", publisher="test_publisher"
        )
        client.post("/srv/store", data=client_data, headers=header_client1)
        r = client.get("/srv/list", headers=header_client1)
        assert r.status_code == 200
        assert r.json == [
            {
                "creator": "foo",
                "date": "2020-01-03T14:23:51.018Z",
                "subjects": None,
                "title": "test_store2",
                "url": "apps/store//96b9de867f1f367c2aadabf02c96f626.xml",
            }
        ]

    def test_list_different_user(self, client, header_client1, header_client2):
        """
        Create a file with user1, and listing with user2 should return no file created
        by user2
        """
        client_data = test_xml.format(
            title="test_store3", creator="test_user", publisher="test_publisher"
        )
        client.post("/srv/store", data=client_data, headers=header_client1)
        r = client.get("/srv/list", headers=header_client2)
        assert r.status_code == 200
        assert r.json == []

    def test_wrong_file_type(self, client, header_client1):
        """
        Wrong configuration can sometime lead to wrongly formated xml file.
        """
        with open("./store/wrongfile", "w") as f:
            f.write("this is wrong content")
        client_data = test_xml.format(
            title="test_store3", creator="foo", publisher="test_publisher"
        )
        client.post("/srv/store", data=client_data, headers=header_client1)
        r = client.get("/srv/list", headers=header_client1)
        assert r.status_code == 200
        assert len(os.listdir("./store")) == 3
        assert r.json == [
            {
                "creator": "foo",
                "date": "2020-01-03T14:23:51.018Z",
                "subjects": None,
                "title": "test_store3",
                "url": "apps/store//771b7365e54bb9bb29ee129ff8198188.xml",
            }
        ]


@pytest.mark.usefixtures("cleandir")
class TestDeleteMviewerConfig:
    def test_delete_one(self, client, header_client1, header_client2):
        """
        Create two file, with 2 users, call `delete` endpoint, with user 1.
        It should only delete 1 file.
        """
        client1_data = test_xml.format(
            title="test_store4", creator="foo", publisher="test_publisher"
        )
        client.post("/srv/store", data=client1_data, headers=header_client1)
        client2_data = test_xml.format(
            title="test_store5", creator="toto", publisher="test_publisher"
        )
        client.post("/srv/store", data=client2_data, headers=header_client2)
        r = client.get("/srv/delete", headers=header_client1)
        assert r.status_code == 200
        assert r.json == {"deleted_files": 1}
        # file of user2 should remain.
        assert len(os.listdir("./store")) == 2
