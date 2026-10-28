/**
 * Build a localized Grist API error using the response body or HTTP status.
 * @param {Response} response Failed API response.
 * @returns {Promise<Error>} Error containing the API message for display.
 */
export const createGristApiError = async (response) => {
  let apiMessage = `HTTP ${response.status}`;
  try {
    const content = (await response.text()).trim();
    if (content) {
      apiMessage = content;
      try {
        const payload = JSON.parse(content);
        if (typeof payload.error === "string") {
          apiMessage = payload.error;
        } else if (payload.error && typeof payload.error.message === "string") {
          apiMessage = payload.error.message;
        } else if (typeof payload.message === "string") {
          apiMessage = payload.message;
        } else if (typeof payload.description === "string") {
          apiMessage = payload.description;
          if (typeof payload.name === "string") {
            apiMessage = `${payload.name}: ${apiMessage}`;
          }
        }
      } catch {
        // Plain-text error responses are also supported.
      }
      const contentType = response.headers.get("Content-Type") || "";
      if (contentType.includes("text/html") || /^<(?:!doctype\s+html|html|head|body)\b/i.test(content)) {
        apiMessage = `HTTP ${response.status}`;
        const incident = content.match(/Incapsula incident ID:\s*([\d-]+)/i);
        if (incident) {
          apiMessage += ` - Request unsuccessful. Incapsula incident ID: ${incident[1]}`;
        }
      }
    }
  } catch {
    // Keep the HTTP status when the response body cannot be read.
  }
  const message = mviewer.tr("grist.api.error").replace("{message}", () => apiMessage);
  const error = new Error(message);
  error.name = "GristApiError";
  return error;
};
