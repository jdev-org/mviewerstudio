#!/bin/bash

#==========================================================================================
# Script name   : install_backend_python.sh
# Autor         : PSC mviewer
# Description   : This script ease mviewerstudio install
# Usage         : ./install_backend_python.sh [parent_directory] [branch] [directory_name]
# Documentation : https://mviewerstudio.readthedocs.io/fr/stable/doc_tech/install_python.html
#==========================================================================================

# Install required packages
apt install libxslt1-dev libxml2-dev python3 python3-pip python3-venv
pip install virtualenv

# FULL PATH - WILL CLONE REPO TO THIS LOCATION
# EX : /home/<user>/git
WORKING_PATH="$1"

# To use a specific branch - will use master if no set
BRANCH="$2"

MVIEWERSTUDIO_DIR="$3"

# Adapt this repo URL to get source from your own Git space
REPO_URL="https://github.com/mviewer/mviewerstudio.git"

# use default mviewerstudio dir name if not set from param
if [ -z "${MVIEWERSTUDIO_DIR}" ]; then
    MVIEWERSTUDIO_DIR="mviewerstudio"
fi

# custom install path
if [ "${WORKING_PATH}" ]; then
    cd "${WORKING_PATH}"
    MVIEWERSTUDIO_DIR="${WORKING_PATH}/${MVIEWERSTUDIO_DIR}"
else
    MVIEWERSTUDIO_DIR="$(pwd)/${MVIEWERSTUDIO_DIR}"
fi

STATIC_DIR="${MVIEWERSTUDIO_DIR}/srv/python/mviewerstudio_backend/static"

# Clone repo and change branch if needed

if [ ! -d "${MVIEWERSTUDIO_DIR}" ]; then
    git clone "${REPO_URL}" "${MVIEWERSTUDIO_DIR}"
    if [ "${BRANCH}" ]; then
        cd "${MVIEWERSTUDIO_DIR}"
        git checkout "${BRANCH}"
    fi
fi

# Copy front resources

mkdir -p "${MVIEWERSTUDIO_DIR}/srv/python/mviewerstudio_backend/static/apps"
cp -r "${MVIEWERSTUDIO_DIR}/css" "${STATIC_DIR}"
cp -r "${MVIEWERSTUDIO_DIR}/img" "${STATIC_DIR}"
cp -r "${MVIEWERSTUDIO_DIR}/js" "${STATIC_DIR}"
cp -r "${MVIEWERSTUDIO_DIR}/lib" "${STATIC_DIR}"
cp -r "${MVIEWERSTUDIO_DIR}/index.html" "${STATIC_DIR}"

cp "${MVIEWERSTUDIO_DIR}/mviewerstudio.i18n.json" "${STATIC_DIR}/mviewerstudio.i18n.json"
cp "${MVIEWERSTUDIO_DIR}/config-python-sample.json" "${STATIC_DIR}/apps/config.json"

cd "${MVIEWERSTUDIO_DIR}/srv/python"

# install python venv and requirements

python3 -m venv .venv
. "${MVIEWERSTUDIO_DIR}/srv/python/.venv/bin/activate"
pip install -r requirements.txt -r dev-requirements.txt
pip install -e .
