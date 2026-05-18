import os


class Config:
    CONF_PATH_FROM_MVIEWER = os.getenv("CONF_PATH_FROM_MVIEWER", "apps/store")
    CONF_PUBLISH_PATH_FROM_MVIEWER = os.getenv(
        "CONF_PUBLISH_PATH_FROM_MVIEWER", "apps/public"
    )
    EXPORT_CONF_FOLDER = os.getenv(
        "EXPORT_CONF_FOLDER", "/home/gaetan/projects/mviewer/mviewer/apps/store"
    )
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

    PROXY_WHITE_LIST = os.getenv(
        "MVIEWERSTUDIO_PROXY_WHITE_LIST",
        "geobretagne.fr,ows.region-bretagne.fr,kartenn.region-bretagne.fr",
    ).split(",")
    MVIEWERSTUDIO_PUBLISH_PATH = os.getenv(
        "MVIEWERSTUDIO_PUBLISH_PATH",
        "/home/gaetan/projects/mviewer/mviewer/apps/public",
    )
    MVIEWER_ADDONS_PATH = os.getenv(
        "MVIEWER_ADDONS_PATH",
        "/home/gaetan/projects/mviewer/mviewer/addons",
    )
    DEFAULT_ORG = os.getenv("DEFAULT_ORG", "public")
    MVIEWERSTUDIO_URL_PATH_PREFIX = os.getenv("MVIEWERSTUDIO_URL_PATH_PREFIX", "")
    SPATIAL_FILE_ALLOWED_EXTENSIONS = os.getenv(
        "MVIEWERSTUDIO_SPATIAL_FILE_ALLOWED_EXTENSIONS",
        "geojson,json,kml,gpx,csv,zip,shp,shx,dbf,prj,cpg",
    ).split(",")
    SPATIAL_FILE_MAX_BYTES = int(
        os.getenv("MVIEWERSTUDIO_SPATIAL_FILE_MAX_BYTES", "10485760")
    )
    HELP_FILE_MAX_BYTES = int(os.getenv("MVIEWERSTUDIO_HELP_FILE_MAX_BYTES", "262144"))
    XML_MAX_BYTES = int(os.getenv("MVIEWERSTUDIO_XML_MAX_BYTES", "1048576"))
