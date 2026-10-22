# mviewerstudio avec Docker

## Image

Seule l'image Docker du backend Python est maintenue ; le backend PHP est abandonné.
Exécutez les commandes de ce guide depuis la racine du dépôt.

## Keycloak sans oauth2-proxy

Studio peut gérer directement la connexion OIDC avec Authlib. Transmettez ces
variables au conteneur (bloc `environment:` de Compose ou `docker run --env-file`) :

```dotenv
MVIEWERSTUDIO_AUTH_MODE=authlib
MVIEWERSTUDIO_AUTHLIB_ISSUER=https://sso.example.org/realms/mon-realm
MVIEWERSTUDIO_AUTHLIB_CLIENT_ID=mviewerstudio
MVIEWERSTUDIO_AUTHLIB_CLIENT_SECRET=remplacer-par-le-secret-du-client
MVIEWERSTUDIO_AUTHLIB_SCOPE=openid profile email
MVIEWERSTUDIO_URL_PATH_PREFIX=mviewerstudio
SECRET_KEY=remplacer-par-une-cle-aleatoire-longue-et-stable
```

Dans Keycloak, configurez un client OpenID Connect avec **Client authentication**
et **Standard flow** activés, puis ajoutez cette **Valid redirect URI** :
`https://studio.example.org/mviewerstudio/auth/callback`.
Adaptez le domaine et le préfixe à votre installation. Le code utilise HTTPS pour
le callback ; le reverse proxy doit transmettre le domaine et le protocole publics.
L'issuer doit être accessible depuis le conteneur et le navigateur.

Un visiteur non connecté est redirigé de `/mviewerstudio/index.html` vers
`/mviewerstudio/auth/login`, puis vers Keycloak. Après connexion, il revient dans
Studio. Les API renvoient un statut 401 avec `login_url` ; le frontend utilise
cette URL pour relancer la connexion.

Définissez explicitement `MVIEWERSTUDIO_AUTH_MODE=authlib` : la valeur historique
`MVIEWERSTUDIO_AUTH_TYPE=keycloak` sélectionne le mode proxy. Le tag Docker
`mviewerstudio:keycloak` ne configure pas l'authentification. Dans Compose, un
fichier `.env` seul ne transmet pas ces variables : utilisez `environment:` ou
`env_file:` et recréez le conteneur après modification.

## Permissions Docker à préparer manuellement

Le conteneur ne modifie pas automatiquement les propriétaires ni les permissions.

Compose utilise `user:` avec `MVIEWERSTUDIO_UID` et `MVIEWERSTUDIO_GID` (valeurs par défaut : `1000:1000`).

Pour une instance existante utilisant `999:999`, ajoutez ces lignes au fichier `.env` :

```dotenv
MVIEWERSTUDIO_UID=999
MVIEWERSTUDIO_GID=999
```

Avant le démarrage, préparez les dossiers sur l'hôte avec les mêmes identifiants :

```bash
sudo mkdir -p apps/store apps/public
sudo chown -R 999:999 apps/store apps/public
sudo chmod -R u+rwX apps/store apps/public
docker compose up -d --build --force-recreate mviewerstudio
```

Adaptez les chemins aux volumes montés pour `EXPORT_CONF_FOLDER` et `MVIEWERSTUDIO_PUBLISH_PATH`. Les répertoires parents doivent permettre leur traversée par cet utilisateur.

Les commandes récursives changent les fichiers existants : conservez leurs propriétaires si les droits actuels suffisent déjà.
Les volumes nommés doivent également être préparés avec les identifiants choisis.

Pour un accès SFTP, vérifiez les identifiants réels du compte sur l'hôte :

```bash
id nom_du_compte_sftp
ls -ldn apps/store apps/public
```

Le GID peut différer de l'UID. Pour un SFTP avec chroot, conservez la racine du
chroot sous la propriété de root et non modifiable par le compte SFTP ; appliquez
les permissions uniquement aux sous-dossiers de données.

Avec `docker run`, utilisez `--user 999:999`. Les variables `UID` et `GID` seules ne changent pas l'utilisateur au runtime. Après intégration de cette modification, les changements d'identifiants nécessitent seulement de recréer le conteneur.

### Personnaliser les identifiants au build ou au runtime

`1000` est uniquement la valeur par défaut. Dans Compose, les variables `MVIEWERSTUDIO_UID` et `MVIEWERSTUDIO_GID` alimentent les arguments de build `UID`/`GID` et la propriété `user:` au runtime.

Pour définir l'utilisateur par défaut de l'image à la construction :

```bash
docker build -f docker/Dockerfile --build-arg UID=999 --build-arg GID=999 -t mviewerstudio:local .
```

Pour choisir d'autres identifiants au lancement, sans reconstruire l'image :

```bash
docker run --rm --user 1001:1002 -v "$PWD/apps:/home/mvuser/apps" mviewerstudio:local
```

Pour télécharger une image publiée puis lancer le service sans build, configurez `.env` et exécutez :

```bash
docker compose pull mviewerstudio
docker compose up -d --no-build --pull never --force-recreate mviewerstudio
```

L'utilisateur au runtime prime sur celui défini au build. Préparez manuellement les permissions des données pour les identifiants utilisés au runtime.

L’image publiée doit intégrer les droits de lecture du code nécessaires à un UID différent de celui utilisé au build.

## Variables d'environnement

| Variable | Description | Exemple |
| --- | --- | --- |
| `EXPORT_CONF_FOLDER` | Dossier dans lequel Studio stocke les brouillons et les configurations en cours. | `/home/mvuser/apps/store` |
| `CONF_PATH_FROM_MVIEWER` | Chemin URL utilisé par mviewer pour accéder aux fichiers des brouillons. | `apps/store` |
| `MVIEWERSTUDIO_PUBLISH_PATH` | Dossier dans lequel Studio copie les fichiers lors de la publication. | `/home/mvuser/apps/public` |
| `CONF_PUBLISH_PATH_FROM_MVIEWER` | Chemin URL utilisé par mviewer pour accéder aux fichiers publiés. | `apps/public` |
| `MVIEWERSTUDIO_URL_PATH_PREFIX` | Préfixe d’URL pour servir Studio sous un sous-chemin ; voir [#271](https://github.com/mviewer/mviewerstudio/pull/271). | `mviewerstudio` |
| `MVIEWERSTUDIO_AUTH_MODE` | Mode d’authentification. Utilisez `authlib` pour une connexion OAuth2/OIDC directe gérée par mviewerstudio. | `authlib` |
| `MVIEWERSTUDIO_AUTHLIB_ISSUER` | URL de l’émetteur OIDC utilisée pour déterminer les métadonnées de découverte lorsque `MVIEWERSTUDIO_AUTHLIB_METADATA_URL` n’est pas définie. | `https://geonode.example.com/o` |
| `MVIEWERSTUDIO_AUTHLIB_METADATA_URL` | URL explicite des métadonnées de découverte OIDC. | `https://geonode.example.com/.well-known/openid-configuration` |
| `MVIEWERSTUDIO_AUTHLIB_CLIENT_ID` | Identifiant du client OAuth2/OIDC utilisé par mviewerstudio. | `mviewerstudio` |
| `MVIEWERSTUDIO_AUTHLIB_CLIENT_SECRET` | Secret du client OAuth2/OIDC utilisé par mviewerstudio. | `change-me` |
| `MVIEWERSTUDIO_AUTHLIB_SCOPE` | Portées OAuth2/OIDC demandées lors de la connexion. | `openid profile email` |
| `OIDC_END_SESSION_ENDPOINT` | URL facultative remplaçant le point de terminaison de déconnexion OAuth2/OIDC du backend. Si elle est vide, mviewerstudio utilise celui découvert dans les métadonnées de l’émetteur Authlib. | `https://locus-test2.udcpp.priv/account/logout/` |
| `MVIEWERSTUDIO_AUTHLIB_GROUPS_CLAIM` | Nom facultatif du claim contenant les groupes ou rôles, ou liste d’alias séparés par des virgules. Si ce champ est vide, mviewerstudio utilise les claims standards tels que `roles`, `groups`, `group_list_all`. | `member_of` |
| `MVIEWERSTUDIO_AUTHLIB_CLAIMS_MAPPING` | Objet JSON associant les champs utilisateur à des chemins dans les claims bruts. Voir l’exemple ci-dessous. | `{"organization":"organization[0]"}` |
| `MVIEWERSTUDIO_AUTHLIB_ALLOWED_GROUPS` | Liste facultative des groupes autorisés à accéder à mviewerstudio, séparés par des virgules ou des points-virgules. Si elle est vide, tout utilisateur authentifié peut accéder à l’application. | `UMRLISA,MVIEWER_ADMIN` |
| `MVIEWERSTUDIO_AUTHLIB_ANONYMOUS_REDIRECT_URL` | URL facultative de redirection des utilisateurs anonymes dans les anciens parcours. | `https://example.org/` |

### Mapping des claims Authlib

```dotenv
MVIEWERSTUDIO_AUTHLIB_CLAIMS_MAPPING='{"organization":"organization[0]","roles":"realm_access.roles"}'
```

Avec `organization: ["public", {"public": {}}]`, le chemin `organization[0]` donne `public`. Si le claim est une chaîne, utilisez `"organization":"organization"`. Les chemins acceptent les clés imbriquées (`profile.organization`), les indices de liste (`organization[0]`) et les clés entre crochets (`profile["organization"]`). Aucune expression Python n’est exécutée.

Champs configurables : `preferred_username`, `email`, `name`, `given_name`, `family_name`, `organization`, `roles`, `sub`. Les champs omis gardent leur normalisation habituelle. Un chemin absent donne `null` (ou `[]` pour les rôles) ; une organisation absente utilise `DEFAULT_ORG`. Un mapping invalide provoque une erreur de configuration lors de la connexion. Redémarrez le service après modification et reconnectez-vous pour renouveler les claims en session.

## Configuration par défaut

Le fichier Compose monte `apps` dans `/home/mvuser/apps`.
Préparez manuellement `apps/store` et `apps/public` avec les identifiants choisis.
Adaptez `src/static/config.json` à votre environnement ; ce fichier est monté dans
le conteneur. Gunicorn et Flask servent également les fichiers du frontend.

## Communication sur le réseau Docker

Le chargement via `api/app/load` utilise une URL absolue. Une URL interne au
réseau Docker permet au backend de récupérer les XML sans passer par le domaine
public et son éventuel certificat autosigné.

Par exemple, si mviewer écoute sur le port interne `8080`, son adresse est
`http://mviewer:8080/`, et un XML est accessible à :

```text
http://mviewer:8080/apps/store/my_org/<app-id>/<app-id>.xml
```

L'appel de chargement correspondant est :

```text
https://mywebsite.org/mviewerstudio/api/app/load?url=http%3A%2F%2Fmviewer%3A8080%2Fapps%2Fstore%2Fmy_org%2F<app-id>%2F<app-id>.xml
```

Exemple de configuration pour cet environnement :

```json
{
  "app_conf": {
    "mviewer_instance": "http://mviewer:8080/",
    "publish_url": "http://mviewer:8080/?config=apps/public/{{config}}.xml"
  }
}
```

`mviewer` est le nom du service Compose, résolu par le DNS interne de Docker.
Adaptez le port à celui du service. Ces adresses servent à la communication entre
conteneurs : elles ne sont pas accessibles depuis le navigateur de l'utilisateur.
Conservez des URL publiques pour les liens utilisés par le frontend et séparez
la configuration interne si nécessaire.

## Construire l'image

```bash
docker compose build mviewerstudio
```
