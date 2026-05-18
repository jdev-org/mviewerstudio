---

## 🤖 Serveur MCP

mviewerstudio fournit un serveur MCP expérimental pour permettre aux assistants IA de créer, prévisualiser et publier des applications mviewer avec les capacités de mviewerstudio.

### Docker Compose

```
docker compose up --build mviewerstudio-mcp www
```

Endpoint MCP HTTP : **http://localhost:8030/mcp**

Ouvrir `http://localhost:8030/mcp` directement dans un navigateur peut retourner
`Not Acceptable: Client must accept text/event-stream`. C'est normal : cet
endpoint doit etre appele par un client MCP avec les en-tetes HTTP attendus.
Le serveur est configure en HTTP stateless par defaut
(`MVIEWERSTUDIO_MCP_STATELESS_HTTP=true`) pour les clients qui ne conservent pas
le header de session `mcp-session-id` entre deux requetes.

Vous pouvez le tester avec le MCP Inspector :

```
npx -y @modelcontextprotocol/inspector
```

Puis connectez l'inspector à `http://localhost:8030/mcp`.

### Configuration MCP

Les parametres specifiques au serveur MCP peuvent etre centralises dans
`/etc/mviewerstudio/mcp_server.conf`. Le depot fournit un exemple commente dans
`src/mcp_server/mcp_server.conf.example`. Ce fichier est au format `KEY=VALUE`
avec commentaires `#`. Les variables d'environnement deja presentes gardent la
priorite, ce qui permet de conserver les surcharges Docker, systemd ou
geOrchestra Gateway.

Le chemin du fichier peut etre surcharge avec :

```
MVIEWERSTUDIO_MCP_CONFIG=/chemin/vers/mcp_server.conf
```

Le parametre `MVIEWER_FQDN` sert d'origine publique pour les tests CORS lorsque
`MVIEWER_PUBLIC_ORIGIN` n'est pas renseigne. Il peut etre donne avec ou sans
schema, par exemple `MVIEWER_FQDN=https://cartes.example.org` ou
`MVIEWER_FQDN=cartes.example.org`.

Par defaut, le MCP appelle aussi l'API backend
`/api/config/mcp` (`MVIEWERSTUDIO_MCP_USE_BACKEND_CONFIG=true`) pour reprendre
les chemins mviewer et les limites d'upload deja configurees dans
mviewerstudio. Les variables MCP comme `MVIEWER_CONF_PATH`,
`MVIEWER_PUBLIC_PATH`, `MVIEWERSTUDIO_MCP_XML_MAX_BYTES` et
`MVIEWERSTUDIO_MCP_SPATIAL_FILE_MAX_BYTES` ne servent alors qu'aux surcharges
locales.

### Logs MCP

Le serveur MCP trace son demarrage, les appels outils principaux, les appels HTTP
vers l'API mviewerstudio et les corrections de connectivite dans un fichier
rotatif. Les parametres sont dans `mcp_server.conf.example` :

```
MVIEWERSTUDIO_MCP_LOG_LEVEL=INFO
MVIEWERSTUDIO_MCP_LOG_FILE=logs/mcp_server.log
MVIEWERSTUDIO_MCP_LOG_MAX_BYTES=10485760
MVIEWERSTUDIO_MCP_LOG_BACKUP_COUNT=5
```

En production sans Docker, utilisez typiquement
`MVIEWERSTUDIO_MCP_LOG_FILE=/var/log/mviewerstudio/mcp_server.log` et assurez
vous que l'utilisateur systemd du service peut ecrire dans ce repertoire.
Mettre `MVIEWERSTUDIO_MCP_LOG_LEVEL=DEBUG` permet de diagnostiquer les requetes
HTTP vers le backend sans journaliser le contenu XML ou les en-tetes
d'authentification.

### Identite et securite

Le LLM ne doit pas choisir l'identite envoyee a MviewerStudio. Les outils MCP
n'exposent pas d'arguments `username` ou `organisation`.

Le serveur MCP construit les headers `sec-*` dans cet ordre :

1. Headers `sec-username`, `sec-org`, `sec-roles`, etc. recus par le MCP,
   uniquement si `MVIEWERSTUDIO_MCP_TRUST_REQUEST_HEADERS=true`.
2. Variables serveur `MCP_DEFAULT_USERNAME` et `MCP_DEFAULT_ORG`.

En local mono-utilisateur, gardez le MCP expose seulement sur `127.0.0.1` et
fixez l'identite du compte de travail :

```
MCP_DEFAULT_USERNAME=pierre
MCP_DEFAULT_ORG=my_org
MVIEWERSTUDIO_MCP_TRUST_REQUEST_HEADERS=false
MVIEWERSTUDIO_MCP_ALLOW_IDENTITY_OVERRIDE=false
```

Derriere geOrchestra Gateway, ne publiez pas le port MCP directement. Faites
passer le client MCP par la gateway, configurez la gateway pour authentifier
l'utilisateur, supprimer/ecraser tout header `sec-*` entrant du client, puis
injecter ses propres headers securises. Dans ce cas seulement :

```
MVIEWERSTUDIO_MCP_TRUST_REQUEST_HEADERS=true
MVIEWERSTUDIO_MCP_ALLOW_IDENTITY_OVERRIDE=false
```

`MVIEWERSTUDIO_MCP_ALLOW_IDENTITY_OVERRIDE=true` ne doit pas etre activee sur
une instance partagee. Elle ne sert qu'aux appels Python internes ou aux tests
de developpement qui utiliseraient encore l'ancien client MCP avec surcharge
d'identite.

L'outil `get_mcp_effective_identity` permet de verifier quelle identite sera
transmise au backend.

### Utilisation avec Codex

Déclarez le serveur MCP HTTP dans Codex :

```
codex mcp add mviewerstudio --url http://127.0.0.1:8030/mcp
```

Vérifiez la déclaration :

```
codex mcp list
```

Les serveurs MCP sont chargés au démarrage d'une session Codex. Après l'ajout, ouvrez une nouvelle session Codex dans ce dépôt pour que les outils `mviewerstudio` soient disponibles à l'assistant.

Exemple de prompt naturel à donner à Codex :

```
Tu as accès au serveur MCP MviewerStudio.

Crée une application mviewer de démonstration sur les lycées en Bretagne.
Utilise un fond OpenStreetMap, cherche une couche WMS pertinente dans le fournisseur Région Bretagne, puis génère une URL de prévisualisation mviewer.

À la fin, donne-moi :
- le titre de l'application créée
- les couches utilisées
- l'URL de prévisualisation
```

Exemple avec centrage geographique et fond ortho :

```
Tu as acces au serveur MCP MviewerStudio.

Cree une carte centree sur Paris avec un fond ortho IGN.
Utilise `prepare_centered_mviewer_app_spec` avec `location="Paris"` et
`baselayer_query="ortho"`, puis `preview_mviewer_app`.
```

Exemple d'analyse des cartes existantes :

```
Tu as acces au serveur MCP MviewerStudio.

Cherche dans les cartes mviewer stockees quelle couche operationnelle est la
plus frequemment utilisee. Appelle `analyze_mviewer_layer_usage` avec
`scope="all"` et resume les premieres couches.
```

Exemple de modification d'une carte existante :

```
Tu as acces au serveur MCP MviewerStudio.

Liste mes cartes avec `list_mviewer_apps`, charge la carte voulue avec
`get_existing_mviewer_app_spec`, modifie le JSON `spec`, puis enregistre avec
`update_existing_mviewer_app` en donnant un message de modification explicite.
```

### Local en stdio

```
pip install -r install/requirements.txt -r install/mcp-requirements.txt
python -m src.mcp_server.server --transport stdio
```

Le serveur MCP utilise le SDK MCP Python, qui nécessite Python >= 3.10.

### Tests

Les tests du serveur MCP sont separes du code runtime dans `tests/mcp_server` :

```
python -m unittest discover -s tests/mcp_server -p 'test_*.py'
```

### Prompt de test

```
Tu as accès au MCP MviewerStudio. Crée une application mviewer de démonstration sur le thème "mobilité".

Procédure attendue :
1. Lis `mviewerstudio://capabilities` ou appelle `get_mviewerstudio_capabilities`.
2. Cherche une couche WMS pertinente avec `search_wms` dans `https://ows.region-bretagne.fr/geoserver/rb/wms`.
3. Construis un `ApplicationSpec` JSON avec un titre explicite, un fond de plan visible, un thème et au moins une couche WMS.
4. Appelle `preview_mviewer_app` pour sauvegarder le brouillon et obtenir une URL de prévisualisation.
5. Donne-moi l'URL de prévisualisation et résume les couches ajoutées.

Ne génère pas de XML à la main sauf pour diagnostiquer avec `build_mviewer_config_xml`.
```

### Outils MCP ajoutes pour l'assistance cartographique

- `get_mcp_effective_identity()` : affiche la source d'identite active et les
  headers `sec-*` qui seront transmis a MviewerStudio.
- `geocode_map_location(query, limit=5)` : resout une ville, adresse ou zone
  francaise avec l'API Adresse et retourne `center` en EPSG:3857, directement
  reutilisable dans `ApplicationSpec.center`.
- `get_baselayer_from_config(query="ortho", visible=true)` : extrait un fond de
  plan configure dans `src/static/config.json` sous forme compatible
  `ApplicationSpec.baselayers`. Par exemple `ortho` retourne le fond IGN
  `ortho_ign`.
- `list_available_mviewer_extensions(query="", include_advanced=true)` :
  liste les addons mviewer installes dans `MVIEWER_ADDONS_PATH` ou dans le
  repertoire `addons` du depot mviewer detecte localement.
- `suggest_mviewer_extensions_for_intent(intent, audience="grand_public")` :
  recommande des extensions existantes selon un besoin metier, par exemple
  impression avancee, plein ecran, recherche dans les couches, Panoramax,
  parcours GPX ou filtres attributaires.
- `apply_mviewer_extensions_to_app_spec(spec, extension_ids, path="addons")` :
  ajoute les declarations `<extension type="component" .../>` dans
  `ApplicationSpec.extensions` sans recopier le code des addons.
- `copy_mviewer_extension_to_app(app_id, extension_id, config_override={})` :
  copie un addon installe dans le repertoire de la carte, sous
  `extensions/<extension_id>`, avec ses dependances `addons/lib` si necessaire.
  L'outil retourne le fragment `extension_spec` a ajouter a la carte.
- `install_mviewer_extensions_to_app_spec(app_id, extension_ids, spec,
  config_overrides={})` : copie plusieurs addons dans la carte et ajoute les
  chemins locaux dans `ApplicationSpec.extensions`.
- `prepare_centered_mviewer_app_spec(title, location, baselayer_query="ortho",
  zoom=13)` : compose directement une specification d'application centree sur
  un lieu geocode avec un fond de plan configure.
- `get_existing_mviewer_app_spec(app_id)` : charge une carte existante visible
  pour l'utilisateur courant et retourne son XML plus une `ApplicationSpec`
  modifiable.
- `update_existing_mviewer_app(app_id, spec, message="MCP update")` : met a jour
  uniquement une carte existante via le meme endpoint `PUT /api/app` que l'IHM,
  avec commit git, mise a jour du registre et nettoyage des previews.
- `analyze_mviewer_layer_usage(scope="all", limit=20, include_previews=false)` :
  parcourt les XML mviewer dans `apps/store` et/ou `apps/public`, ignore les
  previews par defaut, puis retourne les couches les plus utilisees.
- `build_public_mviewer_template(title_field="name",
  description_field="description", fields=[], preset="tourism")` : genere un
  template Mustache `.mst` lisible par un public non expert. Le contenu peut
  ensuite etre stocke avec `store_layer_template` et reference par
  `template_url` dans la couche.
- `build_mviewer_help_page(title, introduction, sections=[])` : genere une
  page HTML statique d'accueil/aide pour une carte grand public.
- `upload_mviewer_help_page_to_app(app_id, filename, html|html_base64)` :
  depose une page HTML dans `help/` avec la carte et retourne le patch
  `ApplicationSpec.help` + `options.showhelp/titlehelp/iconhelp`.
- `install_mviewer_help_page_to_app_spec(app_id, spec, filename,
  html|html_base64)` : depose la page HTML puis retourne une copie de la spec
  deja patchée.
- `recommend_mviewer_vector_style(geometry_type="route")` : rappelle que
  mviewer n'utilise pas les proprietes de style dans un GeoJSON et retourne un
  `layer_patch` avec un style `mviewer.featureStyles` compatible, par exemple
  `highlight`, `elsStyle` ou `circle1`.
- `sanitize_geojson_properties_for_mviewer(content|content_base64)` : supprime
  les proprietes de style GeoJSON (`stroke`, `fill`, `marker-color`, etc.) pour
  eviter qu'elles apparaissent dans les templates sans etre prises en compte a
  l'affichage.
- `upload_spatial_file_to_mviewer_app(app_id, filename, content|content_base64)` :
  depose un fichier spatial dans le repertoire `data` de la carte via l'API
  mviewerstudio. Pour GeoJSON/JSON/KML, l'outil retourne aussi un `layer_spec`
  directement ajoutable a une thematique mviewer. CSV et Shapefile sont stockes,
  mais necessitent une conversion GeoJSON/KML ou une custom layer pour etre
  affiches comme couche standard.

Pour les couches GeoJSON, la symbologie doit donc etre portee par l'attribut de
couche `style`, pas par les proprietes des features. Un style entierement sur
mesure demande une fonction `mviewer.featureStyles` cote mviewer ou une custom
layer.

Les extensions mviewer sont referencees dans le XML de la carte avec un bloc
`extensions`, par exemple :

```xml
<extensions>
  <extension type="component" id="fullscreen" path="addons"/>
</extensions>
```

Le MCP ne genere pas de code d'addon a la volee. Il copie un addon installe et
versionne avec mviewer dans le repertoire de la carte, puis reference ce chemin
local dans `ApplicationSpec.extensions`. C'est plus maintenable : le XML reste
lisible, la carte embarque la version exacte de l'extension qu'elle utilise, et
le `config.json` de l'addon peut etre adapte pour cette carte sans impacter les
autres applications. Les dependances partagees declarees en `../lib/...` sont
copiees dans `extensions/lib`.

Pour un addon configurable (`trackview`, `filter`, `stats`, `label`,
`zoomToArea`), passer les surcharges avec `config_override` ou
`config_overrides`. Le backend versionne la copie dans le depot git de la carte.

Pour une page d'accueil ou d'information, le MCP stocke le fichier HTML dans le
repertoire de la carte sous `help/<filename>.html`, puis renseigne l'attribut
`application help` du XML avec ce chemin. C'est le meme principe que les
templates et les fichiers de donnees : la page voyage avec la carte, elle est
copiee lors de la publication et reste versionnee avec le brouillon. Le HTML
envoye par le MCP doit rester statique ; les balises actives (`script`,
`iframe`, `object`, etc.), les URLs `javascript:` et les attributs `on*` sont
refuses.

Les couches `geojson` ou `kml` peuvent techniquement utiliser une URL `data:`
dans le XML pour de tres petits contenus. Pour eviter des XML lourds et peu
maintenables, le MCP refuse les donnees inline qui depassent
`MVIEWERSTUDIO_MCP_INLINE_DATA_MAX_BYTES` et demande d'utiliser
`upload_spatial_file_to_mviewer_app`. La limite courante est aussi exposee dans
`get_mviewerstudio_capabilities().inline_data_policy`.

Le MCP refuse aussi les XML et fichiers spatiaux depassant
`MVIEWERSTUDIO_MCP_XML_MAX_BYTES` ou
`MVIEWERSTUDIO_MCP_SPATIAL_FILE_MAX_BYTES` avant l'appel HTTP. L'API
mviewerstudio garde ses propres limites avec `MVIEWERSTUDIO_XML_MAX_BYTES` et
`MVIEWERSTUDIO_SPATIAL_FILE_MAX_BYTES`.

La validation de connectivite verifie aussi les fonds de plan
`ApplicationSpec.baselayers`. Les fonds tuiles qui ne renvoient pas
`Access-Control-Allow-Origin` sont signales comme non publiables depuis
l'origine mviewer. Pour les couches operationnelles, le MCP active `useproxy`
si le proxy fonctionne. Pour un fond de plan tuile, le MCP reecrit l'URL vers
le proxy mviewerstudio uniquement si le proxy repond pour l'URL testee ;
sinon il faut choisir un fond configure compatible CORS.
