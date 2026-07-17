# mviewerstudio Dockerfile

## Image
Only python Dockerfile will be maintained (PHP backend is fully deprecated).

## Environment variables

| Variable | Description | Example |
| --- | --- | --- |
| `EXPORT_CONF_FOLDER` | Staging folder where Studio stores draft configs and work in progress. | `/home/mvuser/apps/store` |
| `CONF_PATH_FROM_MVIEWER` | URL path used by mviewer to access draft map files. | `apps/store` |
| `MVIEWERSTUDIO_PUBLISH_PATH` | Production folder where Studio copies map files when a config is published. | `/home/mvuser/apps/public` |
| `CONF_PUBLISH_PATH_FROM_MVIEWER` | URL path used by mviewer to access published map files. | `apps/public` |
| `MVIEWERSTUDIO_URL_PATH_PREFIX` | Serves Studio under a non-root path, see [#271](https://github.com/mviewer/mviewerstudio/pull/271). | `mviewerstudio` |
| `MVIEWERSTUDIO_AUTH_MODE` | Authentication mode. Use `authlib` for direct OAuth2/OIDC login handled by mviewerstudio. | `authlib` |
| `MVIEWERSTUDIO_AUTHLIB_ISSUER` | OIDC issuer URL used to derive discovery metadata when `MVIEWERSTUDIO_AUTHLIB_METADATA_URL` is not set. | `https://geonode.example.com/o` |
| `MVIEWERSTUDIO_AUTHLIB_METADATA_URL` | Explicit OIDC discovery metadata URL. | `https://geonode.example.com/.well-known/openid-configuration` |
| `MVIEWERSTUDIO_AUTHLIB_CLIENT_ID` | OAuth2/OIDC client ID used by mviewerstudio. | `mviewerstudio` |
| `MVIEWERSTUDIO_AUTHLIB_CLIENT_SECRET` | OAuth2/OIDC client secret used by mviewerstudio. | `change-me` |
| `MVIEWERSTUDIO_AUTHLIB_SCOPE` | Requested OAuth2/OIDC scopes during login. | `openid profile email` |
| `OIDC_END_SESSION_ENDPOINT` | Optional OAuth2/OIDC logout endpoint override used by the backend logout route. If empty, mviewerstudio uses the endpoint discovered from the Authlib issuer metadata. | `https://locus-test2.udcpp.priv/account/logout/` |
| `MVIEWERSTUDIO_AUTHLIB_GROUPS_CLAIM` | Optional claim name, or comma-separated claim aliases, containing user groups or roles. If empty, mviewerstudio falls back to standard claims such as `roles`, `groups`, `group_list_all`. | `member_of` |
| `MVIEWERSTUDIO_AUTHLIB_ALLOWED_GROUPS` | Optional comma- or semicolon-separated list of groups allowed to access mviewerstudio. If empty, any authenticated user can access. | `UMRLISA,MVIEWER_ADMIN` |
| `MVIEWERSTUDIO_AUTHLIB_ANONYMOUS_REDIRECT_URL` | Optional redirect target for anonymous users in legacy flows. | `https://example.org/` |

## Default configuration

The default configuration (env vars defined in the dockerfile and json config file present in `src/static/config.json`) assume that:
- the mviewer _apps_ folder is mounted at EXPORT_CONF_FOLDER=/home/apprunner/apps
- /home/apprunner/apps/store and /home/apprunner/apps/prod are existing folders (you might need to create them manually beforehand)
- it is using `src/static/config.json`, which you will probably want to adapt to your own environment.


It is also configured to serve the frontend (static files) with gunicorn, which is usually not recommended. Later versions might use an nginx container to serve the frontend.

**Starting with version 4.3, the docker image assumes that the `EXPORT_CONF_FOLDER` directory is writeable for user 1000:1000.**

## Build mviewerstudio image

Use docker compose to build image :

`docker compose build mviewerstudio`
