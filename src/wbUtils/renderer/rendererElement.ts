import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { isPathALoop } from "../math";


const getDashArrayDashed = (strokeWidth: number) => [8, 8 + strokeWidth];

const getDashArrayDotted = (strokeWidth: number) => [1.5, 6 + strokeWidth];

const getCanvasPadding = (element: ExcalidrawElement) =>
  element.type === "freedraw" ? element.strokeWidth * 12 : 20;

  
export const generateRoughOptions = (
    element: ExcalidrawElement,
    continuousPath = false,
  ): any => {
    const options: any = {
      seed: element.seed,
      strokeLineDash:
        element.strokeStyle === "dashed"
          ? getDashArrayDashed(element.strokeWidth)
          : element.strokeStyle === "dotted"
          ? getDashArrayDotted(element.strokeWidth)
          : undefined,
      // for non-solid strokes, disable multiStroke because it tends to make
      // dashes/dots overlay each other
      disableMultiStroke: element.strokeStyle !== "solid",
      // for non-solid strokes, increase the width a bit to make it visually
      // similar to solid strokes, because we're also disabling multiStroke
      strokeWidth:
        element.strokeStyle !== "solid"
          ? element.strokeWidth + 0.5
          : element.strokeWidth,
      // when increasing strokeWidth, we must explicitly set fillWeight and
      // hachureGap because if not specified,  uses strokeWidth to
      // calculate them (and we don't want the fills to be modified)
      fillWeight: element.strokeWidth / 2,
      hachureGap: element.strokeWidth * 4,
      roughness: element.roughness,
      stroke: element.strokeColor,
      preserveVertices: continuousPath,
    };
  
    switch (element.type) {
      case "rectangle":
      case "diamond":
      case "ellipse": {
        options.fillStyle = element.fillStyle;
        options.fill =
          element.backgroundColor === "transparent"
            ? undefined
            : element.backgroundColor;
        if (element.type === "ellipse") {
          options.curveFitting = 1;
        }
        return options;
      }
      case "line":
      case "freedraw": {
        if (isPathALoop(element.points)) {
          options.fillStyle = element.fillStyle;
          options.fill =
            element.backgroundColor === "transparent"
              ? undefined
              : element.backgroundColor;
        }
        return options;
      }
      case "arrow":
        return options;
      default: {
        throw new Error(`Unimplemented type ${element.type}`);
      }
    }
  };