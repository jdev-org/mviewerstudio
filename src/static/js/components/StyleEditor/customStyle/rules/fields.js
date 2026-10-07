/** Construit un champ étiqueté à partir d'une définition et d'une valeur. */
export function createField(definition, value) {
  const label = document.createElement("label");

  label.innerHTML = `${definition.label}<input class="form-control" name="${definition.name}" type="${definition.type || "text"}">`;

  if (definition.options) {
    label.innerHTML = `${definition.label}<select class="form-control" name="${definition.name}"></select>`;

    const select = label.querySelector("select");

    definition.options.forEach((option) =>
      select.add(new Option(option.label, option.value))
    );
  }

  const input = label.querySelector("input, select");

  input.value = value;

  if (input.type === "number") input.required = true;

  for (const key of ["min", "max", "step"]) {
    if (definition[key] !== undefined) input[key] = definition[key];
  }

  return label;
}

/** Carte repliable de paramètres. Les valeurs sont lues après validation du formulaire. */
export class FieldsPanel {
  constructor(title, definitions, values) {
    this.title = title;

    this.definitions = definitions;

    this.values = values;

    this.element = document.createElement("details");

    this.element.className = "style-config-card";

    this.element.open = true;
  }

  /** @returns {HTMLElement} Carte contenant les champs configurés. */
  render() {
    this.element.innerHTML = `<summary>${this.title}</summary><div class="style-fields"></div>`;

    const content = this.element.querySelector(".style-fields");

    this.definitions.forEach((definition) => {
      content.appendChild(createField(definition, this.values[definition.name]));
    });

    return this.element;
  }

  /** @returns {Object} Valeurs saisies, avec nombres pour les champs numériques. */
  getValue() {
    const values = {};

    this.element.querySelectorAll("input, select").forEach((input) => {
      values[input.name] = input.value;

      if (input.type === "number") values[input.name] = input.valueAsNumber;
    });

    return values;
  }
}
