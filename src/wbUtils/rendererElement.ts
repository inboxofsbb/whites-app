import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";

type ElementShape = any | any[] | null;
const shapeCache = new WeakMap<ExcalidrawElement, ElementShape>();

type ElementShapes = {
  freedraw: any | null;
  arrow: any[];
  line: any[];
  text: null;
  image: null;
};
export const getShapeForElement = <T extends ExcalidrawElement>(element: T) =>
  shapeCache.get(element) as T["type"] extends keyof ElementShapes
    ? ElementShapes[T["type"]] | undefined
    : any | null | undefined;
