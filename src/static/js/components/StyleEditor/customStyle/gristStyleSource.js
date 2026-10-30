import GristApiKey from "../../grist/gristApiKey/gristApiKey.js";
import { createGristApiError } from "../../../utils/grist/apiError.js";
import SpinnerGrow from "../../spinnergrow/spinnergrow.js";

let sourceId = 0;

/** Saisie de la clé Grist et chargement des données utilisées par l'éditeur de style. */
export default class GristStyleSource {
  /**
   * @param {Object} options URL CSV Grist et rappel recevant les données PapaParse.
   * @param {string} options.url URL de téléchargement du CSV.
   * @param {Function} options.onLoad Rappel exécuté après un chargement réussi.
   * @param {Function} [options.onReadyChange] Rappel contrôlant l'accès à l'éditeur.
   */
  constructor({ url, onLoad, onReadyChange = () => {} }) {
    this.url = url;
    this.onLoad = onLoad;
    this.onReadyChange = onReadyChange;
    this.ready = false;
    this.element = document.createElement("div");
    this.element.className = "grist-style-source mb-3";
    this.keyDetails = document.createElement("details");
    this.keyDetails.className = "style-config-card mb-3";
    this.keyDetails.open = true;
    const summary = document.createElement("summary");
    summary.textContent = mviewer.tr("grist.api_key.label");
    this.validKeyIndicator = document.createElement("span");
    this.validKeyIndicator.className = "text-success ms-2";
    this.validKeyIndicator.textContent = "✓";
    this.validKeyIndicator.setAttribute("role", "img");
    this.validKeyIndicator.setAttribute("aria-label", mviewer.tr("grist.api_key.valid"));
    this.validKeyIndicator.hidden = true;
    summary.appendChild(this.validKeyIndicator);
    this.keyDetails.appendChild(summary);
    this.status = document.createElement("p");
    this.status.setAttribute("role", "status");
    this.spinner = new SpinnerGrow({
      label: mviewer.tr("modal.layer.grist.preview.loading"),
      visible: false,
      classes: "mb-2",
    });
    const settings = _conf.grist || {};
    sourceId += 1;
    this.apiKey = new GristApiKey(
      settings.api_url || settings.instance_url || "/grist",
      "https://grist.numerique.gouv.fr/account/developer",
      {
        idPrefix: `style-grist-api-key-${sourceId}`,
        onValidApiKey: (key) => this.load(key),
        onInvalidApiKey: () => {
          this.setKeyValid(false);
          this.keyDetails.open = true;
          this.setReady(false);
          this.request = null;
          this.element.setAttribute("aria-busy", "false");
          this.spinner.setVisible(false);
          this.status.textContent = "";
        },
      }
    );
    this.keyDetails.appendChild(this.apiKey.render());
    this.element.append(this.keyDetails, this.spinner.render(), this.status);
  }

  /**
   * Charge les lignes et les en-têtes, même si la table ne contient aucune ligne.
   * @param {string} apiKey Clé validée par le composant Grist.
   * @returns {Promise<void>} Actualise les données ou affiche l'erreur de chargement.
   */
  async load(apiKey) {
    this.setKeyValid(true);
    this.keyDetails.open = false;
    this.setReady(false);
    const request = {};
    this.request = request;
    this.element.setAttribute("aria-busy", "true");
    this.spinner.setVisible(true);
    this.status.className = "text-muted";
    this.status.textContent = mviewer.tr("modal.layer.grist.preview.loading");
    try {
      const response = await fetch(this.url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok) throw await createGristApiError(response);
      const csv = await response.text();
      if (this.request !== request) return;
      const data = Papa.parse(csv, { header: true, skipEmptyLines: true });
      if (data.errors && data.errors.length) {
        throw new Error(mviewer.tr("modal.layer.grist.preview.error"));
      }
      this.onLoad(data);
      this.setReady(true);
      this.status.textContent = "";
    } catch (error) {
      if (this.request !== request) return;
      this.keyDetails.open = true;
      this.status.className = "text-danger";
      this.status.textContent = error.message;
    } finally {
      if (this.request === request) {
        this.element.setAttribute("aria-busy", "false");
        this.spinner.setVisible(false);
      }
    }
  }

  /**
   * Affiche la coche uniquement pour une clé validée par le composant Grist.
   * @param {boolean} valid État de validation de la clé.
   * @returns {void}
   */
  setKeyValid(valid) {
    this.validKeyIndicator.hidden = !valid;
  }

  /**
   * Autorise l'éditeur uniquement après validation de la clé et lecture des données.
   * @param {boolean} ready Données disponibles pour l'édition.
   * @returns {void}
   */
  setReady(ready) {
    this.ready = ready;
    this.onReadyChange(ready);
  }

  /** @returns {HTMLElement} Formulaire conservant la clé saisie lors des rendus. */
  render() {
    return this.element;
  }
}
