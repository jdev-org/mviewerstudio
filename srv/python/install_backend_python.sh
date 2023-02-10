#!/bin/bash

apt install libxslt1-dev libxml2-dev
pip install virtualenv

# FULL PATH - WILL CLONE REPO TO THIS LOCATION
# EX : /home/<user>/git
WORKING_PATH="$1"

# To use a specific branch - will use master if no set
BRANCH="$2"

MVIEWERSTUDIO_DIR="mviewerstudio"


if [ "${WORKING_PATH}" ]; then
    cd "${WORKING_PATH}"
    MVIEWERSTUDIO_DIR="$1/mviewerstudio"
fi


STATIC_DIR="${MVIEWERSTUDIO_DIR}/srv/python/mviewerstudio_backend/static"


if [ ! -d "${MVIEWERSTUDIO_DIR}" ]; then
    git clone https://github.com/jdev-org/mviewerstudio.git
    if [ "${BRANCH}" ]; then
        cd "${MVIEWERSTUDIO_DIR}"
        git checkout "${BRANCH}"
    fi
fi

mkdir -p "${MVIEWERSTUDIO_DIR}/srv/python/mviewerstudio_backend/static/apps"
cp -r "${MVIEWERSTUDIO_DIR}/css" "${STATIC_DIR}"
cp -r "${MVIEWERSTUDIO_DIR}/img" "${STATIC_DIR}"
cp -r "${MVIEWERSTUDIO_DIR}/js" "${STATIC_DIR}"
cp -r "${MVIEWERSTUDIO_DIR}/lib" "${STATIC_DIR}"
cp -r "${MVIEWERSTUDIO_DIR}/index.html" "${STATIC_DIR}"

cp "${MVIEWERSTUDIO_DIR}/mviewerstudio.i18n.json" "${STATIC_DIR}/mviewerstudio.i18n.json"
cp "${MVIEWERSTUDIO_DIR}/config-python-sample.json" "${STATIC_DIR}/apps/config.json"

cd "${MVIEWERSTUDIO_DIR}/srv/python"

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r dev-requirements.txt
pip install -e .

echo "mviewerstudio | Install success !"
exit 0
