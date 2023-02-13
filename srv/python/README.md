# MViewerStudio Backend v2

Ce dossier contient la version 2 du backend de mviewerstudio. Cette version est
écrite en python (3.7+) et utilise le framework Flask. Il n'y aucune base de
données, les données sont stockées dans des fichiers json.

## Installation

Vous pouvez installer mviewerstudio selon 3 méthodes :
- Via un script sh
- Via Docker
- Manuellement Pas à pas en suivant la séction `Développement`

### Via le Script SH

- Récupérer le fichier `/srv/python/install.sh`:

```bash
curl -O https://raw.githubusercontent.com/mviewer/mviewerstudio/master/srv/python/install_backend_python.sh
```

- Exécuter la commande en remplacant `/<full>/<path>` par le chemin absolu (**complet**) dans lequel sera installé mviewerstudio et `<branch>` par la branche à utiliser (`master` par défaut - paramètre non obligatoire):

```bash
sh install_backend_python.sh /<full>/<path> <branch>
```

Exemple :
```bash
sh install_backend_python.sh /home/user/git develop
```

Exemple sans préciser le chemin mais en utilisant la branche `develop`: 
```bash
sh install_backend_python.sh "" develop
```

Le script va alors :
- cloner le dépôt dans le répertoire indiqué (`/<full>/<path>`)
- Changer de branche (si indiqué dans la commande)
- installer les paquets (Debian)
- Créer les répertoires du backend dans `/srv/python/mviewerstudio_backend`
- créer l'environnement virtuel (venv) Python
- installer les dépendances (fichiers `requirements`)

Il vous restera à 

- créer le lien symbolique entre mviewer et mviewerstudio :

```bash
ln -s /<full_path>/mviewerstudio/srv/python/mviewerstudio_backend/store /<full_path>/mviewer/apps/store
```

- modifier le paramètre `mviewer_instance` dans `/srv/python/mviewerstudio_backend/static/apps/config.json` pour y ajouter l'URL de votre mviewer (avec un `/` à la fin).

Exemple avec un mviewer local sur le port `5051` :

```bash
"mviewer_instance": "http://localhost:5051/"
```

- Modifier la liste [PROXY_WHITE_LIST](https://github.com/jdev-org/mviewerstudio/tree/develop/srv/python#proxy) (pour les développements uniquement) afin d'y ajouter les FQDN des services OGC à utiliser.

### Via Docker

Vous pouvez utiliser la composition docker présente à la racine du dépot. Le
`Dockerfile` permet de construire l'image pour un usage de production.


## Développement

Vous devrez d'abord copier les ressources statiques de la partie cliente de `mviewerstudio`:

### Prérequis

Python et son gestionnaire de paquets (pip) doivent être déjà installés.

Installer ensuite ces dépendances :

```bash
sudo apt install libxslt1-dev libxml2-dev
pip install virtualenv
```

Ainsi qu'une instance mviewer fonctionnelle (/mviewer)


```bash
mkdir -p mviewerstudio_backend/static/apps
cp -r ../../css ../../img ../../index.html ../../js ../../lib mviewerstudio_backend/static/
cp ../../mviewerstudio.i18n.json mviewerstudio_backend/static/mviewerstudio.i18n.json
```

Et également fournir une configuration JSON. Une configuration d'exemple est disponible à la racine du dépot:

```bash
cp ../../config-python-sample.json mviewerstudio_backend/static/apps/config.json

```

Les xml des applications sont donc stockés dans le répertoire (mviewerstudio/srv/python/store/).

Il faut donc créer un lien symbolique entre le store xml mviewer studio et mviewer, poru que mviewer sache où retrouver les cartes réalisées avec mviewer studio.

Pour créer le lien dans le dépôt mviewer (répertoire /apps) :

```bash
ln -s /<full_path>/mviewerstudio/srv/python/mviewerstudio_backend/store /<full_path>/mviewer/apps/store
```

Modifier ensuite la configuration /srv/python/mviewerstudio_backend/apps/config.json pour indiquer l'URL du mviewer.

Pour un mviewer en local qui fonctionne ssur un serveur web disponible sur le port `5051` on aura cette configuration :

```bash
"mviewer_instance": "http://localhost:5051/",`
```

```bash
# mettez vous dans un .venv, ex: python -m venv .venv && source .venv/bin/activate, ou via pew ou pyenv, par exemple:
cd srv/python
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r dev-requirements.txt
pip install -e .
cd  mviewerstudio_backend
flask run
```
### Gestion des Paramètres

Les paramètres à utiliser par le front sont disponibles dans le fichier :

`/srv/python/mviewerstudio_backend/static/apps/config.json`

Les paramètres du backend sont dans le fichier :

`/srv/python/mviewerstudio_backend/settings.py`

Le chargement de la configuration backend est géré par le fichier `/srv/python/mviewerstudio_backend/app_factry.py` :

https://github.com/jdev-org/mviewerstudio/blob/af30b1ca9706266bdfe9cde4b255fd4b3faa7bb5/srv/python/mviewerstudio_backend/app_factory.py#L21-L23


### Proxy

Pour déveloper avec mviewerstudio et pouvoir utiliser les plateformes extérieures sans problèmes CORS, il est nécessaire de passer par un proxy disponible dans le backend python.

Ouvrez donc le fichier `/srv/python/mviewerstudio_backend/settings.py` et compléter la liste du paramètre PROXY_WHITE_LIST avec les domaines que vous avez besoin d'utiliser.

### tests

* Lancer les tests unitaires : `pytest mviewerstudio_backend/test.py`
* Vérifier les types : `mypy --ignore-missing mviewerstudio_backend`


## Production

Il vous faudra un serveur wsgi pour servir les pages. Exemple de serveur : gunicorn, waitress,
uwsgi. Le fichier `docker/Dockerfile-python-backend` propose d'utiliser gunicorn.

```
# installer les requirements, dans un environnements virtuel par exemple. La méthode dépend de vous.
# mais est similaire à celle en dév.
#
# lancer le serveur:
gunicorn mviewerstudio_backend.app:app
```
