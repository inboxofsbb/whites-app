import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { isFreeDrawElement, isLinearElement } from "./typeChecks";

export const isInvisiblySmallElement = (
    element: ExcalidrawElement,
  ): boolean => {
    if (isLinearElement(element) || isFreeDrawElement(element)) {
      return element.points.length < 2;
    }
    return element.width === 0 && element.height === 0;
  };

  export const getNormalizedDimensions = (
    element: Pick<ExcalidrawElement, "width" | "height" | "x" | "y">,
  ): {
    width: ExcalidrawElement["width"];
    height: ExcalidrawElement["height"];
    x: ExcalidrawElement["x"];
    y: ExcalidrawElement["y"];
  } => {
    const ret = {
      width: element.width,
      height: element.height,
      x: element.x,
      y: element.y,
    };
  
    if (element.width < 0) {
      const nextWidth = Math.abs(element.width);
      ret.width = nextWidth;
      ret.x = element.x - nextWidth;
    }
  
    if (element.height < 0) {
      const nextHeight = Math.abs(element.height);
      ret.height = nextHeight;
      ret.y = element.y - nextHeight;
    }
  
    return ret;
  };