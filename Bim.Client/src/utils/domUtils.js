/**
 * @param {Element} element
 * @returns {element is HTMLElement}
 */
const isHTMLElement = (element) => {
  return element instanceof HTMLElement;
};

/**
 * @param {Element | null} element
 * @param {string} property
 * @param {string} value
 */
export const setStyle = (element, property, value) => {
  if (element && isHTMLElement(element)) {
    element.style[property] = value;
  }
};

/**
 * @param {Element | null} element
 * @returns {number}
 */
export const getOffsetWidth = (element) => {
  if (element && isHTMLElement(element)) {
    return element.offsetWidth;
  }
  return 0;
};

/**
 * @param {Element | null} element
 * @returns {HTMLElement}
 * @throws {Error} If element is not an HTMLElement
 */
export const asHTMLElement = (element) => {
  if (element && isHTMLElement(element)) {
    return element;
  }
  throw new Error('Element is not an HTMLElement');
};
