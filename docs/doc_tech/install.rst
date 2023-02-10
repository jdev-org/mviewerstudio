.. Authors :
.. mviewer team

.. _install:

Installer mviewerstudio
=======================

Mviewerstudio est une application web développée en HTML / CSS / PHP / Python. Elle nécessite simplement d'être déployée sur un serveur WEB qui peut être APACHE, NGINX, TOMCAT…

mviewerstudio peut fonctionner avec 2 backends différents

* PHP
* Python

En fonction du backend retenu, l'installation diffère.

Backend PHP
~~~~~~~~~~~

Prérequis
*********
Apache 2, PHP 7

Ainsi qu'une instance mviewer fonctionnelle (/mviewer)

Install
*********

Clone du projet dans le répertoire apache :
git clone https://github.com/mviewer/mviewerstudio

Copie du fichier de conf :
cp config-sample.json apps/config.json

Modification des chemins d'accès dans le config.json :

.. code-block:: json

    "upload_service": "srv/php/store.php",
    "delete_service": "srv/php/delete.php",
    "list_service": "srv/php/list.php",
    "store_style_service": "srv/php/store/style.php",
    "user_info": "srv/php/user_info.php",


Backend Python
~~~~~~~~~~~~~~

Prérequis
*********

Vous aurez besoin :

-  d'installer les dépendances (Linux/Debian):

.. code-block:: sh

    sudo apt install libxslt1-dev libxml2-dev python3 python3-pip
    pip install virtualenv

- d'une instance mviewer fonctionnelle (/mviewer)

Installation via le script
**************************

1. Récupérer le script d'installation :

.. code-block:: sh

    sudo apt install curl
    curl -O https://raw.githubusercontent.com/mviewer/mviewerstudio/master/srv/python/install_backend_python.sh

Le script utilise 2 paramètres optionnels :

- ``<branch>`` : Le chemin dans lequel installer mviewerstudio (par défaut le répertoire d'exécution du script)
- ``<path>`` : La branche à installer (par défaut master)

Exemple avec ces paramètres :

.. code-block:: sh

    sh install_backend_python.sh /home/user/git develop

2. Ajouter un lien symbolique pour dans le répertoire /apps de votre mviewer :

.. code-block:: sh

    ln -s /<full_path>/mviewerstudio/srv/python/mviewerstudio_backend/store /<full_path>/mviewer/apps/store

3. Modifier le paramètre ``mviewer_instance`` dans `/srv/python/mviewerstudio_backend/apps/config.json`


Installation manuelle
*********************

Cette installation vous permet d'exécuter les commandes du script d'installation les unes après les autres.

.. code-block:: sh

    mkdir -p mviewerstudio_backend/static/apps
    cp -r ../../css ../../img ../../index.html ../../js ../../lib mviewerstudio_backend/static/
    cp ../../mviewerstudio.i18n.json mviewerstudio_backend/static/mviewerstudio.i18n.json


Et également fournir une configuration JSON. Une configuration d'exemple est disponible
à la racine du dépot:

.. code-block:: sh

    cp ../../config-python-sample.json mviewerstudio_backend/static/apps/config.json



Attention, il semble que le paramètre `export_conf_folder` ne soit pas pris en compte. Les xml des applications sont donc stockés dans le répertoire (mviewerstudio/srv/python/store/).

Dans mon cas, j'ai dû exécuter la commande suivante pour faire le lien entre le store xml et mviewer

Création du lien dans le dépôt mviewer (répertoire /apps) :

.. code-block:: sh

    ln -s /<full_path>/mviewerstudio/srv/python/store/ /<full_path>/mviewer/apps/store


.. code-block:: sh

    cd srv/python
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt -r dev-requirements.txt
    pip install -e .
    cd  mviewerstudio_backend
    flask run


Docker
~~~~~~~

Vous pouvez utiliser la composition docker présente à la racine du dépot. Le Dockerfile permet de construire l'image pour un usage de production.


Développer avec le backend mviewerstudio
****************************************

Configuration
~~~~~~~~~~~~~~

La configuration front est localisée dans les fichiers :

- ``/srv/python/mviewerstudio_backend/static/apps/config.json``

La configuration back est localisée dans les fichiers :

- ``/srv/python/mviewerstudio_backend/settings.py``


Proxy
~~~~~

Pour utiliser les services types OGC (catalogue ou serveurs cartographiques), vous aurez besoin d'utiliser le proxy.

Le Proxy utilise un paramètre ``PROXY_WHITE_LIST`` qui doit être complété par tous les domaines (FQDN) des services que vous utiliserez.

Ce paramètre est accessible dans : 

- /srv/python/mviewerstudio_backend/settings.py

