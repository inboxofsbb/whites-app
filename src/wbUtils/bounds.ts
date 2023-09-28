// If the element is created from right to left, the width is going to be negative

import { ExcalidrawElement, ExcalidrawFreeDrawElement, ExcalidrawTextElementWithContainer } from "@excalidraw/excalidraw/types/element/types";
import { rescalePoints } from "./points";
import { getContainerElement } from "./textElement";
import { isArrowElement, isFreeDrawElement, isLinearElement, isTextElement } from "./typeChecks";
import { generateRoughOptions } from "./renderer/rendererElement";
import { Point } from "@excalidraw/excalidraw/types/types";
import { Bounds } from "@excalidraw/excalidraw/types/element/bounds";
import { LinearElementEditor } from "./linearElementEditor";


type MaybeQuadraticSolution = [number | null, number | null] | false;

export const getCurvePathOps = (shape: any): any[] => {
    for (const set of shape.sets) {
      if (set.type === "path") {
        return set.ops;
      }
    }
    return shape.sets[0].ops;
  };

  

  export const getMinMaxXYFromCurvePathOps = (
    ops: any[],
    transformXY?: any,
  ): [number, number, number, number] => {
    let currentP: Point = [0, 0];
  
    const { minX, minY, maxX, maxY } = ops.reduce(
      (limits, { op, data }) => {
        // There are only four operation types:
        // move, bcurveTo, lineTo, and curveTo
        if (op === "move") {
          // change starting point
          currentP = data as unknown as Point;
          // move operation does not draw anything; so, it always
          // returns false
        } else if (op === "bcurveTo") {
          const _p1 = [data[0], data[1]] as Point;
          const _p2 = [data[2], data[3]] as Point;
          const _p3 = [data[4], data[5]] as Point;
  
          const p1 = transformXY ? transformXY(..._p1) : _p1;
          const p2 = transformXY ? transformXY(..._p2) : _p2;
          const p3 = transformXY ? transformXY(..._p3) : _p3;
  
          const p0 = transformXY ? transformXY(...currentP) : currentP;
          currentP = _p3;
  
          const [minX, minY, maxX, maxY] = getCubicBezierCurveBound(
            p0,
            p1,
            p2,
            p3,
          );
  
          limits.minX = Math.min(limits.minX, minX);
          limits.minY = Math.min(limits.minY, minY);
  
          limits.maxX = Math.max(limits.maxX, maxX);
          limits.maxY = Math.max(limits.maxY, maxY);
        } else if (op === "lineTo") {
          // TODO: Implement this
        } else if (op === "qcurveTo") {
          // TODO: Implement this
        }
        return limits;
      },
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
    );
    return [minX, minY, maxX, maxY];
  };


  // reference: https://eliot-jones.com/2019/12/cubic-bezier-curve-bounding-boxes
const getBezierValueForT = (
    t: number,
    p0: number,
    p1: number,
    p2: number,
    p3: number,
  ) => {
    const oneMinusT = 1 - t;
    return (
      Math.pow(oneMinusT, 3) * p0 +
      3 * Math.pow(oneMinusT, 2) * t * p1 +
      3 * oneMinusT * Math.pow(t, 2) * p2 +
      Math.pow(t, 3) * p3
    );
  };

  const solveQuadratic = (
    p0: number,
    p1: number,
    p2: number,
    p3: number,
  ): MaybeQuadraticSolution => {
    const i = p1 - p0;
    const j = p2 - p1;
    const k = p3 - p2;
  
    const a = 3 * i - 6 * j + 3 * k;
    const b = 6 * j - 6 * i;
    const c = 3 * i;
  
    const sqrtPart = b * b - 4 * a * c;
    const hasSolution = sqrtPart >= 0;
  
    if (!hasSolution) {
      return false;
    }
  
    let s1 = null;
    let s2 = null;
  
    let t1 = Infinity;
    let t2 = Infinity;
  
    if (a === 0) {
      t1 = t2 = -c / b;
    } else {
      t1 = (-b + Math.sqrt(sqrtPart)) / (2 * a);
      t2 = (-b - Math.sqrt(sqrtPart)) / (2 * a);
    }
  
    if (t1 >= 0 && t1 <= 1) {
      s1 = getBezierValueForT(t1, p0, p1, p2, p3);
    }
  
    if (t2 >= 0 && t2 <= 1) {
      s2 = getBezierValueForT(t2, p0, p1, p2, p3);
    }
  
    return [s1, s2];
  };

// This set of functions retrieves the absolute position of the 4 points.

const getCubicBezierCurveBound = (
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point,
  ): Bounds => {
    const solX = solveQuadratic(p0[0], p1[0], p2[0], p3[0]);
    const solY = solveQuadratic(p0[1], p1[1], p2[1], p3[1]);
  
    let minX = Math.min(p0[0], p3[0]);
    let maxX = Math.max(p0[0], p3[0]);
  
    if (solX) {
      const xs = solX.filter((x) => x !== null) as number[];
      minX = Math.min(minX, ...xs);
      maxX = Math.max(maxX, ...xs);
    }
  
    let minY = Math.min(p0[1], p3[1]);
    let maxY = Math.max(p0[1], p3[1]);
    if (solY) {
      const ys = solY.filter((y) => y !== null) as number[];
      minY = Math.min(minY, ...ys);
      maxY = Math.max(maxY, ...ys);
    }
    return [minX, minY, maxX, maxY];
  };

  // If the element is created from right to left, the width is going to be negative
// This set of functions retrieves the absolute position of the 4 points.
export const getElementAbsoluteCoords = (
    element: ExcalidrawElement,
    includeBoundText: boolean = false,
  ): [number, number, number, number, number, number] => {
    if (isFreeDrawElement(element)) {
      return getFreeDrawElementAbsoluteCoords(element);
    } else if (isLinearElement(element)) {
      return LinearElementEditor.getElementAbsoluteCoords(
        element,
        includeBoundText,
      );
    } else if (isTextElement(element)) {
      const container = getContainerElement(element);
      if (isArrowElement(container)) {
        const coords = LinearElementEditor.getBoundTextElementPosition(
          container,
          element as ExcalidrawTextElementWithContainer,
        );
        return [
          coords.x,
          coords.y,
          coords.x + element.width,
          coords.y + element.height,
          coords.x + element.width / 2,
          coords.y + element.height / 2,
        ];
      }
    }
    return [
      element.x,
      element.y,
      element.x + element.width,
      element.y + element.height,
      element.x + element.width / 2,
      element.y + element.height / 2,
    ];
  };

  


  const getBoundsFromPoints = (
    points: ExcalidrawFreeDrawElement["points"],
  ): [number, number, number, number] => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
  
    for (const [x, y] of points) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  
    return [minX, minY, maxX, maxY];
  };

  const getFreeDrawElementAbsoluteCoords = (
    element: ExcalidrawFreeDrawElement,
  ): [number, number, number, number, number, number] => {
    const [minX, minY, maxX, maxY] = getBoundsFromPoints(element.points);
    const x1 = minX + element.x;
    const y1 = minY + element.y;
    const x2 = maxX + element.x;
    const y2 = maxY + element.y;
    return [x1, y1, x2, y2, (x1 + x2) / 2, (y1 + y2) / 2];
  };

  export const getResizedElementAbsoluteCoords = (
    element: ExcalidrawElement,
    nextWidth: number,
    nextHeight: number,
    normalizePoints: boolean,
  ): [number, number, number, number] => {
    if (!(isLinearElement(element) || isFreeDrawElement(element))) {
      return [
        element.x,
        element.y,
        element.x + nextWidth,
        element.y + nextHeight,
      ];
    }
  
    const points = rescalePoints(
      0,
      nextWidth,
      rescalePoints(1, nextHeight, element.points, normalizePoints),
      normalizePoints,
    );
  
    let bounds: [number, number, number, number];
  
    if (isFreeDrawElement(element)) {
      // Free Draw
      bounds = getBoundsFromPoints(points);
    } else {
      // Line
      // const gen = rough.generator();
      const curve = !element.roundness;
  
  
      const ops = getCurvePathOps(curve);
      bounds = getMinMaxXYFromCurvePathOps(ops);
    }
  
    const [minX, minY, maxX, maxY] = bounds;
    return [
      minX + element.x,
      minY + element.y,
      maxX + element.x,
      maxY + element.y,
    ];
  };