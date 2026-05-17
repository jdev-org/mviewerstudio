.. Authors :
.. mviewer team

.. _install_vm_production:

Déploiement production sur VM Linux sans Docker
###############################################

Cette page décrit un déploiement de production de mviewerstudio et de son
serveur MCP sur une VM Debian 12/13 ou Ubuntu 24.04, sans Docker.

L'architecture cible est la suivante :

- mviewer est servi par le serveur web sous ``/mviewer/`` ;
- mviewerstudio est exécuté par Gunicorn sur ``127.0.0.1:5007`` ;
- le serveur MCP est exécuté sur ``127.0.0.1:8030`` ;
- Nginx expose ``/mviewerstudio/`` et, si besoin, ``/mcp/`` ;
- les brouillons et les cartes publiées sont stockés dans ``/var/www/mviewer/apps``.

.. warning::

   Le serveur MCP donne à un assistant la capacité de créer, modifier, publier
   ou supprimer des cartes. En production, il ne doit pas être exposé
   directement sur Internet sans authentification forte. Derrière geOrchestra
   Gateway, laissez la gateway authentifier l'utilisateur et injecter les
   en-têtes ``sec-*``.


Pré-requis système
******************

Installez les paquets système :

.. code-block:: sh

   sudo apt update
   sudo apt install -y \
     git curl ca-certificates \
     python3 python3-pip python3-venv python3-dev \
     build-essential libxml2-dev libxslt1-dev \
     nginx

Créez un utilisateur de service et les répertoires applicatifs :

.. code-block:: sh

   sudo adduser --system --group --home /var/mviewerstudio mviewerstudio
   sudo mkdir -p /var/mviewerstudio /var/log/mviewerstudio /etc/mviewerstudio
   sudo mkdir -p /var/www/mviewer/apps/store /var/www/mviewer/apps/public
   sudo chown -R mviewerstudio:mviewerstudio \
     /var/mviewerstudio \
     /var/log/mviewerstudio \
     /var/www/mviewer/apps/store \
     /var/www/mviewer/apps/public


Installation du code
********************

Clonez le dépôt et installez les dépendances Python, MCP inclus :

.. code-block:: sh

   sudo -u mviewerstudio git clone https://github.com/mviewer/mviewerstudio.git /var/mviewerstudio
   cd /var/mviewerstudio
   sudo -u mviewerstudio python3 -m venv .venv
   sudo -u mviewerstudio .venv/bin/pip install --upgrade pip
   sudo -u mviewerstudio .venv/bin/pip install \
     -r install/requirements.txt \
     -r install/mcp-requirements.txt
   sudo -u mviewerstudio .venv/bin/pip install -e src

Adaptez ensuite la configuration front :

.. code-block:: sh

   sudo -u mviewerstudio nano /var/mviewerstudio/src/static/config.json

Points à vérifier dans ``config.json`` :

- ``mviewer_instance`` doit pointer vers l'instance mviewer publique et finir
  par ``/`` ;
- les fournisseurs WMS/CSW utilisés par les utilisateurs doivent être déclarés ;
- le proxy front peut pointer vers ``/mviewer/proxy/?url=`` ou ``/proxy/?url=``
  selon la configuration Nginx retenue.


Configuration backend
*********************

Créez un fichier d'environnement pour mviewerstudio :

.. code-block:: sh

   sudo tee /etc/mviewerstudio/backend.env >/dev/null <<'EOF'
   CONF_PATH_FROM_MVIEWER=apps/store
   CONF_PUBLISH_PATH_FROM_MVIEWER=apps/public
   EXPORT_CONF_FOLDER=/var/www/mviewer/apps/store
   MVIEWERSTUDIO_PUBLISH_PATH=/var/www/mviewer/apps/public
   DEFAULT_ORG=public
   LOG_LEVEL=INFO

   # Liste blanche du proxy interne mviewerstudio.
   # Ajouter ici les domaines des flux OGC qui pourront passer par le proxy.
   MVIEWERSTUDIO_PROXY_WHITE_LIST=ows.region-bretagne.fr,geobretagne.fr

   # Depot de fichiers spatiaux via le MCP et l'API mviewerstudio.
   MVIEWERSTUDIO_SPATIAL_FILE_ALLOWED_EXTENSIONS=geojson,json,kml,gpx,csv,zip,shp,shx,dbf,prj,cpg
   MVIEWERSTUDIO_SPATIAL_FILE_MAX_BYTES=10485760
   MVIEWERSTUDIO_XML_MAX_BYTES=1048576

   # Si mviewerstudio est publié sous /mviewerstudio/.
   MVIEWERSTUDIO_URL_PATH_PREFIX=mviewerstudio
   EOF

   sudo chown root:mviewerstudio /etc/mviewerstudio/backend.env
   sudo chmod 640 /etc/mviewerstudio/backend.env

Installez le service systemd :

.. code-block:: sh

   sudo tee /etc/systemd/system/mviewerstudio.service >/dev/null <<'EOF'
   [Unit]
   Description=mviewerstudio
   After=network.target

   [Service]
   User=mviewerstudio
   Group=mviewerstudio
   WorkingDirectory=/var/mviewerstudio
   EnvironmentFile=/etc/mviewerstudio/backend.env
   ExecStart=/var/mviewerstudio/.venv/bin/gunicorn \
       -b 127.0.0.1:5007 \
       --workers=2 \
       --access-logfile /var/log/mviewerstudio/gunicorn-access.log \
       --error-logfile /var/log/mviewerstudio/gunicorn-error.log \
       --log-level info \
       src.app:app

   Restart=on-failure
   RestartSec=5
   StandardOutput=append:/var/log/mviewerstudio/mviewerstudio.log
   StandardError=append:/var/log/mviewerstudio/mviewerstudio.log

   [Install]
   WantedBy=multi-user.target
   EOF


Configuration du serveur MCP
****************************

Copiez le fichier de configuration MCP exemple, puis adaptez-le :

.. code-block:: sh

   sudo cp /var/mviewerstudio/src/mcp_server/mcp_server.conf.example /etc/mviewerstudio/mcp_server.conf
   sudo chown root:mviewerstudio /etc/mviewerstudio/mcp_server.conf
   sudo chmod 640 /etc/mviewerstudio/mcp_server.conf
   sudo nano /etc/mviewerstudio/mcp_server.conf

Exemple minimal pour une instance publique ``https://cartes.example.org`` :

.. code-block:: ini

   MCP_TRANSPORT=streamable-http
   FASTMCP_HOST=127.0.0.1
   FASTMCP_PORT=8030
   MVIEWERSTUDIO_MCP_STATELESS_HTTP=true

   MVIEWERSTUDIO_BASE_URL=http://127.0.0.1:5007/mviewerstudio
   MVIEWERSTUDIO_MCP_USE_BACKEND_CONFIG=true
   MVIEWERSTUDIO_MCP_BACKEND_CONFIG_TIMEOUT=0.5
   MVIEWER_BASE_URL=https://cartes.example.org/mviewer/
   MVIEWER_FQDN=https://cartes.example.org
   MVIEWER_INSTANCE_PATH=/mviewer/
   MVIEWER_APPS_ROOT=/var/www/mviewer/apps
   MVIEWERSTUDIO_CONFIG_PATH=/var/mviewerstudio/src/static/config.json

   MCP_DEFAULT_USERNAME=assistant
   MCP_DEFAULT_ORG=public
   MVIEWERSTUDIO_MCP_TRUST_REQUEST_HEADERS=false
   MVIEWERSTUDIO_MCP_ALLOW_IDENTITY_OVERRIDE=false

   MVIEWERSTUDIO_MCP_ALLOWED_HOSTS=ows.region-bretagne.fr,geobretagne.fr
   MVIEWERSTUDIO_MCP_ALLOW_UNCONFIGURED_HOSTS=false
   MVIEWERSTUDIO_MCP_INLINE_DATA_MAX_BYTES=8192

``MVIEWER_FQDN`` est utilisé par les tests CORS du MCP lorsque
``MVIEWER_PUBLIC_ORIGIN`` n'est pas défini. Si vous êtes derrière un reverse
proxy ou une gateway avec une origine publique différente, renseignez
explicitement ``MVIEWER_PUBLIC_ORIGIN``.

``MVIEWERSTUDIO_MCP_INLINE_DATA_MAX_BYTES`` limite la taille des URL ``data:``
dans les couches. Au-delà, le MCP demande de déposer le GeoJSON/KML avec
``upload_spatial_file_to_mviewer_app`` pour garder les XML mviewer légers.
Avec ``MVIEWERSTUDIO_MCP_USE_BACKEND_CONFIG=true``, les chemins mviewer et les
limites d'upload sont repris depuis l'API backend ``/api/config/mcp``. Les
variables ``MVIEWER_CONF_PATH``, ``MVIEWER_PUBLIC_PATH``,
``MVIEWERSTUDIO_MCP_XML_MAX_BYTES`` et
``MVIEWERSTUDIO_MCP_SPATIAL_FILE_MAX_BYTES`` ne sont donc nécessaires que pour
forcer une valeur différente côté MCP.

Installez le service MCP :

.. code-block:: sh

   sudo cp /var/mviewerstudio/install/mviewerstudio-mcp.service \
     /etc/systemd/system/mviewerstudio-mcp.service
   sudo sed -i 's/User=monuser/User=mviewerstudio/' \
     /etc/systemd/system/mviewerstudio-mcp.service

Si le dépôt n'est pas installé dans ``/var/mviewerstudio``, adaptez également
``WorkingDirectory`` et ``ExecStart`` dans le service.


Configuration Nginx
*******************

Exemple de vhost Nginx pour publier mviewer, mviewerstudio et le MCP :

.. code-block:: nginx

   server {
       listen 80;
       server_name cartes.example.org;

       client_max_body_size 20m;

       location = /mviewer {
           return 302 /mviewer/$is_args$args;
       }

       location /mviewer/ {
           alias /var/www/mviewer/;
           try_files $uri $uri/ =404;
       }

       location /apps/ {
           alias /var/www/mviewer/apps/;
       }

       # Proxy même origine utilisé par les cartes mviewer générées.
       location /mviewer/proxy/ {
           proxy_pass http://127.0.0.1:5007/mviewerstudio/proxy/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Variante pratique si une configuration mviewer contient /proxy/?url=.
       location /proxy/ {
           proxy_pass http://127.0.0.1:5007/mviewerstudio/proxy/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       location = /mviewerstudio {
           return 302 /mviewerstudio/;
       }

       location /mviewerstudio/ {
           proxy_pass http://127.0.0.1:5007/mviewerstudio/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # A ne publier que derriere une authentification ou une gateway.
       location /mcp/ {
           proxy_pass http://127.0.0.1:8030/mcp/;
           proxy_http_version 1.1;
           proxy_buffering off;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }

Activez la configuration :

.. code-block:: sh

   sudo ln -s /etc/nginx/sites-available/mviewerstudio.conf \
     /etc/nginx/sites-enabled/mviewerstudio.conf
   sudo nginx -t
   sudo systemctl reload nginx

En production, ajoutez TLS. Avec certbot par exemple :

.. code-block:: sh

   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d cartes.example.org


Cas geOrchestra Gateway
***********************

Si le MCP est publié derrière geOrchestra Gateway :

- ne laissez pas l'utilisateur final atteindre directement ``127.0.0.1:8030`` ;
- faites transiter ``/mcp/`` par la gateway ;
- configurez la gateway pour supprimer tout en-tête ``sec-*`` entrant du client ;
- laissez la gateway injecter ses propres en-têtes ``sec-username``,
  ``sec-firstname``, ``sec-lastname``, ``sec-org`` et ``sec-roles`` ;
- activez uniquement dans ce cas :

.. code-block:: ini

   MVIEWERSTUDIO_MCP_TRUST_REQUEST_HEADERS=true
   MVIEWERSTUDIO_MCP_ALLOW_IDENTITY_OVERRIDE=false


Démarrage et vérifications
**************************

Rechargez systemd puis démarrez les services :

.. code-block:: sh

   sudo systemctl daemon-reload
   sudo systemctl enable --now mviewerstudio.service
   sudo systemctl enable --now mviewerstudio-mcp.service

Contrôlez l'état :

.. code-block:: sh

   sudo systemctl status mviewerstudio.service
   sudo systemctl status mviewerstudio-mcp.service
   sudo journalctl -u mviewerstudio.service -f
   sudo journalctl -u mviewerstudio-mcp.service -f

Tests rapides :

.. code-block:: sh

   curl -I http://127.0.0.1:5007/mviewerstudio/
   curl -I http://127.0.0.1:8030/mcp
   curl -I https://cartes.example.org/mviewerstudio/

L'endpoint MCP peut répondre ``Not Acceptable`` dans un navigateur ou avec un
``curl`` simple : c'est normal si la requête n'utilise pas les en-têtes attendus
par un client MCP.

Depuis un poste d'administration, déclarez ensuite le MCP dans votre client :

.. code-block:: sh

   codex mcp add mviewerstudio --url https://cartes.example.org/mcp


Mise à jour
***********

Pour mettre à jour le code :

.. code-block:: sh

   cd /var/mviewerstudio
   sudo -u mviewerstudio git pull
   sudo -u mviewerstudio .venv/bin/pip install \
     -r install/requirements.txt \
     -r install/mcp-requirements.txt
   sudo -u mviewerstudio .venv/bin/pip install -e src
   sudo systemctl restart mviewerstudio.service mviewerstudio-mcp.service

Après chaque mise à jour, comparez votre ``src/static/config.json`` et
``/etc/mviewerstudio/mcp_server.conf`` avec les exemples du dépôt, notamment
``src/mcp_server/mcp_server.conf.example``, afin de repérer les nouveaux
paramètres disponibles.
