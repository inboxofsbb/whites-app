import { ExcalidrawElement, ExcalidrawTextElementWithContainer, FontString } from "@excalidraw/excalidraw/types/element/types";
import { BOUND_TEXT_PADDING } from "./constants";
import Scene from "./Scene";
import { isArrowElement } from "./typeChecks";
import { isTestEnv } from "./utils";

export const getContainerElement = (
  element:
    | (ExcalidrawElement & {
      containerId: ExcalidrawElement["id"] | null;
    })
    | null,
) => {
  if (!element) {
    return null;
  }
  if (element.containerId) {
    return (Scene.getScene(element) as any)?.getElement(element.containerId) || null;
  }
  return null;
};


export const getContainerDims = (element: ExcalidrawElement) => {
  const MIN_WIDTH = 300;
  if (isArrowElement(element)) {
    const width = Math.max(element.width, MIN_WIDTH);
    const height = element.height;
    return { width, height };
  }
  return { width: element.width, height: element.height };
};

export const getMaxContainerWidth = (container: ExcalidrawElement) => {
  const width = getContainerDims(container).width;
  if (isArrowElement(container)) {
    const containerWidth = width - BOUND_TEXT_PADDING * 8 * 2;
    if (containerWidth <= 0) {
      const boundText = getBoundTextElement(container);
      if (boundText) {
        return boundText.width;
      }
      return BOUND_TEXT_PADDING * 8 * 2;
    }
    return containerWidth;
  }

  if (container.type === "ellipse") {
    // The width of the largest rectangle inscribed inside an ellipse is
    // Math.round((ellipse.width / 2) * Math.sqrt(2)) which is derived from
    // equation of an ellipse -https://github.com/excalidraw/excalidraw/pull/6172
    return Math.round((width / 2) * Math.sqrt(2)) - BOUND_TEXT_PADDING * 2;
  }
  if (container.type === "diamond") {
    // The width of the largest rectangle inscribed inside a rhombus is
    // Math.round(width / 2) - https://github.com/excalidraw/excalidraw/pull/6265
    return Math.round(width / 2) - BOUND_TEXT_PADDING * 2;
  }
  return width - BOUND_TEXT_PADDING * 2;
};

export const getBoundTextElement = (element: ExcalidrawElement | null) => {
  if (!element) {
    return null;
  }
  const boundTextElementId = getBoundTextElementId(element);
  if (boundTextElementId) {
    return (
      ((Scene.getScene(element) as any)?.getElement(
        boundTextElementId,
      ) as ExcalidrawTextElementWithContainer) || null
    );
  }
  return null;
};

export const getBoundTextElementId = (container: ExcalidrawElement | null) => {
  return container?.boundElements?.length
    ? container?.boundElements?.filter((ele) => ele.type === "text")[0]?.id ||
    null
    : null;
};

// https://github.com/grassator/canvas-text-editor/blob/master/lib/FontMetrics.js

export const measureText = (text: string, font: FontString) => {
  text = text
    .split("\n")
    // replace empty lines with single space because leading/trailing empty
    // lines would be stripped from computation
    .map((x) => x || " ")
    .join("\n");

  const height = getTextHeight(text, font);
  const width = getTextWidth(text, font);

  return { width, height };
};

export const getTextHeight = (text: string, font: FontString) => {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const lineHeight = getApproxLineHeight(font);
  return lineHeight * lines.length;
};
const cacheApproxLineHeight: { [key: FontString]: number } = {};
export const getApproxLineHeight = (font: FontString) => {
  if (cacheApproxLineHeight[font]) {
    return cacheApproxLineHeight[font];
  }
  const fontSize = parseInt(font);

  // Calculate line height relative to font size
  cacheApproxLineHeight[font] = fontSize * 1.2;
  return cacheApproxLineHeight[font];
};

export const getTextWidth = (text: string, font: FontString) => {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let width = 0;
  lines.forEach((line) => {
    width = Math.max(width, getLineWidth(line, font));
  });
  return width;
};

let canvas: HTMLCanvasElement | undefined;

const getLineWidth = (text: string, font: FontString) => {
  if (!canvas) {
    canvas = document.createElement("canvas");
  }
  const canvas2dContext = canvas.getContext("2d")!;
  canvas2dContext.font = font;
  const width = canvas2dContext.measureText(text).width;

  // since in test env the canvas measureText algo
  // doesn't measure text and instead just returns number of
  // characters hence we assume that each letteris 10px
  if (isTestEnv()) {
    return width * 10;
  }
  return width;
};