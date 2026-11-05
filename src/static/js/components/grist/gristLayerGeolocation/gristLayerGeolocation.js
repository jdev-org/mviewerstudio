import {
  getGristCsvTableInfo,
  getGristGeocodingConfig,
} from "../../../utils/grist/utils.js";

/**
 * Open the geolocation workflow for an existing Grist layer.
 *
 * @param {Object} options Workflow configuration.
 * @param {Object} options.layer Grist layer being edited.
 * @param {Object} options.mvInstance Application component registry and utilities.
 * @param {Object} options.appConfig Application configuration.
 * @param {Object} options.translator Translation service.
 * @returns {void}
 */
export const openGristLayerGeolocation = ({
  layer,
  mvInstance,
  appConfig,
  translator,
}) => {
  if (!layer.isGrist) {
    return;
  }

  const previewContainer = document.getElementById("layer-grist-data-preview");
  const layerDataContainer = document.getElementById("layer_conf7");
  const workflowContainer = document.getElementById("layer-grist-geolocation-content");
  const GristContent = mvInstance.components.grist.gristContent;
  const hasApiKey = window.sessionStorage.getItem("mviewerstudio.grist.apiKey");
  const gristFields = previewContainer._gristLayerData.meta.fields || [];
  const gristTableInfo = getGristCsvTableInfo(layer.url);
  const gristConfig = appConfig.grist || {};

  if (!gristTableInfo) {
    return;
  }

  const gristSource = new mvInstance.components.grist.gristLayerSource({
    apiUrl: gristConfig.api_url || gristConfig.instance_url,
    instanceUrl: gristConfig.instance_url || gristConfig.api_url,
    orgId: gristConfig.org_id || "Personal",
    docId: gristTableInfo.docId,
    tableId: gristTableInfo.tableId,
    apiKey: hasApiKey,
    data: previewContainer._gristLayerData,
  });
  let addressArea;
  const previousGeometryField = layer.geojsonField;
  const coordinatesArea = new mvInstance.components.grist.gristCoordinatesArea({
    idPrefix: "layer-grist-geolocation-coordinate",
    columns: gristFields,
    xField: layer.xfield,
    yField: layer.yfield,
    projection: layer.srs,
    displayProjection: true,
    onProjectionChange: (projection) => {
      layer.srs = projection;
    },
  });
  const updateGristLayerGeolocation = (geolocType) => {
    layer.geolocType = geolocType;

    if (geolocType === "referential") {
      layer.geojsonField = "geometry";
      delete layer.xfield;
      delete layer.yfield;
      return;
    }

    delete layer.geojsonField;
    layer.xfield = "longitude";
    layer.yfield = "latitude";
    if (geolocType === "coordinates") {
      layer.srs = coordinatesArea.getProjection();
      return;
    }
    layer.srs = getGristGeocodingConfig().srs;
  };
  let gristContent;
  const setWorkflowStep = (step) => gristContent.setStep(step === 4 ? 3 : step);

  gristContent = new GristContent({
    idPrefix: "layer-grist-geolocation",
    hideData: true,
    managedNavigation: true,
    onStepClick: (step) => {
      const backButton = gristContent.element.querySelector(`#${gristContent.ids.back}`);
      const currentStep = parseInt(gristContent.element.dataset.step, 10);
      for (let previousStep = currentStep; previousStep > step; previousStep--) {
        backButton.click();
      }
    },
    state: {
      step: hasApiKey ? 2 : 1,
      apiKeyReady: Boolean(hasApiKey),
      fields: gristFields,
      geolocType: layer.geolocType,
      locationListCard: true,
      locationModes: [
        {
          value: "address",
          tooltip: translator.tr("modal.layer.grist.mode.address.tooltip"),
          label: translator.tr("modal.layer.grist.mode.address.title"),
          description: translator.tr("modal.layer.grist.mode.address.description"),
          createContent: () => {
            layer.srs = getGristGeocodingConfig().srs;
            addressArea = new mvInstance.components.grist.gristAddressArea({
              id: "layer-grist-geolocation-address-fields",
              fields: gristFields,
            });
            return addressArea.render();
          },
        },
        {
          value: "referential",
          tooltip: translator.tr("modal.layer.grist.mode.referential.tooltip"),
          label: translator.tr("modal.layer.grist.mode.referential.title"),
          description: translator.tr("modal.layer.grist.mode.referential.description"),
          createContent: () =>
            new mvInstance.components.grist.gristRefGeoArea({
              idPrefix: "layer-grist-geolocation-ref",
              fields: gristFields,
              matchingField: layer.gristMatchingField,
              referential: layer.gristReferential,
              onReferentialChange: (label) => {
                const referentials = gristConfig.grist_referentials || [];
                const referential = referentials.find((item) => item.label === label);
                if (referential && referential.srs) {
                  layer.srs = referential.srs;
                }
              },
            }).render(),
        },
        {
          value: "coordinates",
          tooltip: translator.tr("modal.layer.grist.mode.coordinates.tooltip"),
          label: translator.tr("modal.layer.grist.mode.coordinates.title"),
          description: translator.tr("modal.layer.grist.mode.coordinates.description"),
          createContent: () => coordinatesArea.render(),
        },
      ],
      onLocationChange: (geolocType) => {
        updateGristLayerGeolocation(geolocType);
      },
    },
    onNext: ({ gristContent: content, currentStep, nextButton }) => {
      if (currentStep === 1) {
        return;
      }

      const resultContainerId = content.ids.result;
      if (content.state.geolocType === "address") {
        mvInstance.utils.grist.geocoding.runGristAddressGeocoding({
          importGristArea: gristSource,
          getAddressFields: () => (addressArea ? addressArea.getFields() : []),
          setWizardStep: setWorkflowStep,
          triggerButton: nextButton,
          resultContainerId,
          updateLayerSelection: false,
        });
        return;
      }

      if (content.state.geolocType === "coordinates") {
        const xField = document.getElementById("layer-grist-geolocation-coordinate-x");
        const yField = document.getElementById("layer-grist-geolocation-coordinate-y");
        const projection = document.getElementById(
          "layer-grist-geolocation-coordinate-projection"
        );

        layer.xfield = xField ? xField.value : "";
        layer.yfield = yField ? yField.value : "";
        layer.srs = projection ? projection.value : "EPSG:4326";
        mvInstance.utils.grist.coordinates.runGristCoordinatesCheck({
          importGristArea: gristSource,
          setWizardStep: setWorkflowStep,
          xFieldId: "layer-grist-geolocation-coordinate-x",
          yFieldId: "layer-grist-geolocation-coordinate-y",
          resultContainerId,
          updateLayerSelection: false,
        });
        return;
      }

      if (content.state.geolocType === "referential") {
        mvInstance.utils.grist.refGeo
          .runGristRefGeoJoin({
            importGristArea: gristSource,
            setWizardStep: setWorkflowStep,
            triggerButton: nextButton,
            resultContainerId,
            matchingFieldId: "layer-grist-geolocation-ref-matching-field",
            referentialId: "layer-grist-geolocation-ref-referential",
            outputFormatId: "layer-grist-geolocation-ref-output-format",
            updateLayerSelection: false,
          })
          .then(() => {
            // Le flux affiche lui-même les erreurs : une promesse résolue ne garantit pas la réussite.
            if (!gristSource.referential) return;
            const referentialChanged =
              layer.gristReferential !== gristSource.referential.layer_name;
            const geometryChanged =
              previousGeometryField !== gristSource.geometryField ||
              (layer.customStyle && layer.customStyle.geometry !== "Polygon");
            const isCustomStyle = layer.styleMode === "custom" || !layer.styleMode;
            const resetStyle =
              layer.type === "csv" &&
              isCustomStyle &&
              (referentialChanged || geometryChanged);
            layer.gristReferential = gristSource.referential.layer_name;
            layer.gristMatchingField = gristSource.matchingField;
            // Grist peut avoir renommé les colonnes ; conserver leurs identifiants réels pour l'export XML.
            layer.gristGeometryField = gristSource.geometryField;
            layer.gristCentroidField = gristSource.centroidField;
            layer.geojsonField = gristSource.geometryField;
            const editor = document.querySelector("#layer-style-editor .style-editor");
            if (editor) {
              let customStyle = layer.customStyle;
              // Le style personnalisé CSV est réinitialisé ; un style existant reste sélectionné.
              if (resetStyle) customStyle = null;
              editor.dispatchEvent(
                new CustomEvent("loadOptions", {
                  detail: {
                    ...layer,
                    layerId: layer.id,
                    fields: gristFields,
                    customStyle,
                    geoStylerStyle: resetStyle ? null : layer.geoStylerStyle,
                    sld: resetStyle ? null : layer.sld,
                    customsld: layer.customsld && !resetStyle,
                    styleMode: layer.styleMode || "custom",
                    geometry: "Polygon",
                    // La jointure vient de modifier Grist : l'ancien CSV ne décrit plus ses géométries.
                    reloadGristSource: true,
                  },
                })
              );
            }
          });
      }
    },
  });
  const GristApiKey = mvInstance.components.grist.gristApiKey;
  const authContent = new GristApiKey(
    gristConfig.api_url || gristConfig.instance_url,
    "https://grist.numerique.gouv.fr/account/developer",
    {
      idPrefix: "layer-grist-geolocation-api-key",
      onValidApiKey: (apiKey) => {
        gristSource.apiKey = apiKey;
        gristContent.state.apiKeyReady = true;
        gristContent.setStep(2);
      },
    }
  ).render();

  gristContent.state.auth = authContent;
  const backButton = document.createElement("button");

  backButton.type = "button";
  backButton.className = "btn btn-link mb-3";
  backButton.innerHTML =
    '<i class="ri-arrow-left-line"></i> ' +
    translator.tr("modal.layer.grist.workflow.cancel_back_to_data");
  backButton.addEventListener("click", () => {
    workflowContainer.replaceChildren();
    workflowContainer.classList.add("d-none");
    layerDataContainer.classList.remove("d-none");
  });

  layerDataContainer.classList.add("d-none");
  workflowContainer.replaceChildren(backButton, gristContent.render());
  workflowContainer.classList.remove("d-none");
};
