/**
 * Échappe une valeur textuelle pour l'insérer dans un template HTML.
 * @param {string} value Texte à afficher.
 * @returns {string} Texte échappé, utilisable dans un attribut entre guillemets.
 */
const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export default escapeHtml;
