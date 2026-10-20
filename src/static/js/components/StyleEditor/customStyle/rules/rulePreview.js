import { RULE_PREVIEW } from "../../constants.js";

/** Aperçu SVG des paramètres de remplissage, contour et symbole d'une règle. */
export default class RulePreview {
  /** @param {Object} options Règle, géométrie et dimensions de l'aperçu ponctuel. */
  constructor({
    rule,
    geometry,
    symbolSize = RULE_PREVIEW.symbolSize,
    maxSymbolSize = symbolSize,
  }) {
    this.rule = rule;
    this.geometry = geometry;
    this.symbolSize = symbolSize;
    this.maxSymbolSize = maxSymbolSize;
  }

  /**
   * Crée un élément SVG sans interpoler les valeurs de la règle dans du HTML.
   * @param {string} tag Balise SVG.
   * @param {Object} attributes Attributs de l'élément.
   * @returns {SVGElement} Élément créé.
   */
  createElement(tag, attributes) {
    const element = document.createElementNS(RULE_PREVIEW.svgNamespace, tag);
    Object.entries(attributes).forEach(([name, value]) =>
      element.setAttribute(name, value)
    );
    return element;
  }

  /**
   * Applique séparément le remplissage et le contour, avec leurs opacités.
   * @param {SVGElement} element Forme à styliser.
   * @returns {void}
   */
  applyStyle(element) {
    const { fill, stroke } = this.rule;
    element.setAttribute("fill", fill.color);
    element.setAttribute("fill-opacity", fill.opacity);
    element.setAttribute("stroke", stroke.color);
    element.setAttribute("stroke-opacity", stroke.opacity);
    element.setAttribute("stroke-width", stroke.width);
    element.setAttribute("stroke-linejoin", "round");
    if (stroke.lineStyle === "dashed") {
      element.setAttribute("stroke-dasharray", `${stroke.width * 4} ${stroke.width * 2}`);
    }
    if (stroke.lineStyle === "dotted") {
      element.setAttribute("stroke-dasharray", `0 ${stroke.width * 3}`);
      element.setAttribute("stroke-linecap", "round");
    }
  }

  /**
   * Dessine un symbole ponctuel à la position et à la taille indiquées.
   * @param {number} x Centre horizontal.
   * @param {number} size Taille du symbole en pixels.
   * @returns {SVGElement} Symbole ou image externe.
   */
  createSymbol(x, size) {
    const y = RULE_PREVIEW.height / 2;
    const half = size / 2;
    const { symbol } = this.rule;
    if (symbol.shape === "external" && symbol.externalGraphic) {
      return this.createElement("image", {
        href: symbol.externalGraphic,
        x: x - half,
        y: y - half,
        width: size,
        height: size,
        preserveAspectRatio: "xMidYMid meet",
      });
    }
    let shape;
    if (symbol.shape === "square") {
      shape = this.createElement("rect", {
        x: x - half,
        y: y - half,
        width: size,
        height: size,
      });
    } else if (symbol.shape === "triangle") {
      shape = this.createElement("polygon", {
        points: `${x},${y - half} ${x + half},${y + half} ${x - half},${y + half}`,
      });
    } else {
      shape = this.createElement("circle", { cx: x, cy: y, r: half });
    }
    this.applyStyle(shape);
    return shape;
  }

  /** @returns {SVGElement} Un aperçu du remplissage, du contour et du symbole. */
  render() {
    const { width, height, padding } = RULE_PREVIEW;
    const svg = this.createElement("svg", {
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      "aria-hidden": "true",
      focusable: "false",
    });
    if (this.geometry === "Point") {
      const strokeWidth = this.rule.stroke.width;
      const scale = Math.min(
        1,
        (height - padding * 2) / (this.maxSymbolSize + strokeWidth),
        (width - padding * 2) / (this.maxSymbolSize + strokeWidth)
      );
      const group = this.createElement("g", {
        transform: `translate(${width / 2} ${height / 2}) scale(${scale}) translate(${-width / 2} ${-height / 2})`,
      });
      group.appendChild(this.createSymbol(width / 2, this.symbolSize));
      svg.appendChild(group);
    } else {
      const inset = padding + this.rule.stroke.width / 2;
      let shape;
      if (this.geometry === "LineString") {
        shape = this.createElement("path", {
          d: `M ${inset} ${height - inset} L ${width / 2} ${inset} L ${width - inset} ${height - inset}`,
        });
      } else {
        shape = this.createElement("rect", {
          x: inset,
          y: inset,
          width: Math.max(0, width - inset * 2),
          height: Math.max(0, height - inset * 2),
        });
      }
      this.applyStyle(shape);
      if (this.geometry === "LineString") shape.setAttribute("fill", "none");
      svg.appendChild(shape);
    }
    return svg;
  }
}
