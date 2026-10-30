/**
 * Fetch an SLD URL when needed and validate XML with the bundled GeoStyler parser.
 * @param {string} sld XML content or a URL relative to the document.
 * @returns {Promise<string>} Original XML, preserving vendor options for the WMS server.
 */
export async function readSld(sld) {
  const { xml } = await parseSld(sld);
  return xml;
}

/** Charge et parse un SLD pour les rendus WMS et vectoriels.
 * @param {string} sld XML ou URL du SLD.
 * @returns {Promise<Object>} XML original et style GeoStyler.
 */
export async function parseSld(sld) {
  let xml = sld;
  if (!sld.trimStart().startsWith("<")) {
    const url = new URL(sld, document.baseURI);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("The SLD URL must use HTTP or HTTPS.");
    }
    const response = await fetch(url.href);
    if (!response.ok) throw new Error(`Could not load SLD (HTTP ${response.status}).`);
    xml = await response.text();
  }
  const parser = new globalThis.GeoStylerSLDParser.SldStyleParser();
  const { output, errors } = await parser.readStyle(xml);
  // GeoStyler peut résoudre la promesse avec des erreurs au lieu de la rejeter.
  if (errors && errors.length) {
    throw new Error(errors.map((error) => error.message || error).join("\n"));
  }
  if (!output) throw new Error("SLD conversion produced no output.");
  // Conserver le XML original pour le WMS, notamment ses options propres au serveur.
  return { xml, style: output };
}
