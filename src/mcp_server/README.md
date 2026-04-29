---

## 🤖 Serveur MCP

mviewerstudio fournit un serveur MCP expérimental pour permettre aux assistants IA de créer, prévisualiser et publier des applications mviewer avec les capacités de mviewerstudio.

### Docker Compose

```
docker compose up --build mviewerstudio-mcp www
```

Endpoint MCP HTTP : **http://localhost:8030/mcp**

Vous pouvez le tester avec le MCP Inspector :

```
npx -y @modelcontextprotocol/inspector
```

Puis connectez l'inspector à `http://localhost:8030/mcp`.

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

### Local en stdio

```
pip install -r install/requirements.txt -r install/mcp-requirements.txt
python -m src.mcp_server.server --transport stdio
```

Le serveur MCP utilise le SDK MCP Python, qui nécessite Python >= 3.10.

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