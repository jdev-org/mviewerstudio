/**
 * Envoie un fichier de style dans le répertoire de la carte.
 * @param {string} mapId Identifiant de la carte.
 * @param {string|number} styleId Identifiant unique commun aux deux fichiers, sans extension.
 * @param {string} content Contenu du fichier.
 * @param {string} extension Extension attendue.
 * @param {string} contentType Type MIME du contenu.
 * @returns {Promise<Object>} Nom et URL du fichier enregistré.
 * @throws {Error} Si le nom est invalide ou si le serveur refuse la sauvegarde.
 */
const sendStyleFile = async (mapId, styleId, content, extension, contentType) => {
  if (
    !mapId ||
    (typeof styleId !== "string" && typeof styleId !== "number") ||
    !/^[a-zA-Z0-9_-]+$/.test(styleId)
  ) {
    throw new Error(
      "A map identifier and a style identifier without an extension are required."
    );
  }
  const filename = `${styleId}.${extension}`;
  const params = new URLSearchParams({ filename });
  const response = await fetch(`api/styles/${encodeURIComponent(mapId)}?${params}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": contentType },
    body: content,
  });
  if (!response.ok) {
    throw new Error(`Could not save ${filename} (HTTP ${response.status}).`);
  }
  return response.json();
};

/**
 * Sauvegarde un document SLD sous <styleId>.sld.
 * @param {string} mapId Identifiant de la carte.
 * @param {string|number} styleId Identifiant unique commun aux fichiers SLD et JSON.
 * @param {string} sld Document SLD.
 * @returns {Promise<Object>} Nom et URL du fichier SLD enregistré.
 */
export const sendSldFile = (mapId, styleId, sld) =>
  sendStyleFile(mapId, styleId, sld, "sld", "application/vnd.ogc.sld+xml");

/**
 * Sauvegarde l'objet GeoStyler sous <styleId>.json, associé au SLD de même nom.
 * @param {string} mapId Identifiant de la carte.
 * @param {string|number} styleId Identifiant unique commun aux fichiers SLD et JSON.
 * @param {Object} style Objet GeoStyler.
 * @returns {Promise<Object>} Nom et URL du fichier JSON enregistré.
 */
export const sendJsonStyleStyle = (mapId, styleId, style) =>
  sendStyleFile(
    mapId,
    styleId,
    JSON.stringify(style, null, 2),
    "json",
    "application/json"
  );
