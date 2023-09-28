// Checks if the first and last point are close enough

import { ExcalidrawLinearElement, NonDeleted } from "@excalidraw/excalidraw/types/element/types";
import { NormalizedZoomValue, Point, Zoom } from "@excalidraw/excalidraw/types/types";
import { getCurvePathOps } from "./bounds";
import { LINE_CONFIRM_THRESHOLD } from "./constants";
import { getShapeForElement } from "./rendererElement";
import { Mutable } from "./utils";

export const distance2d = (x1: number, y1: number, x2: number, y2: number) => {
    const xd = x2 - x1;
    const yd = y2 - y1;
    return Math.hypot(xd, yd);
  };

  export const rotate = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    angle: number,
  ): [number, number] =>
    // 𝑎′𝑥=(𝑎𝑥−𝑐𝑥)cos𝜃−(𝑎𝑦−𝑐𝑦)sin𝜃+𝑐𝑥
    // 𝑎′𝑦=(𝑎𝑥−𝑐𝑥)sin𝜃+(𝑎𝑦−𝑐𝑦)cos𝜃+𝑐𝑦.
    // https://math.stackexchange.com/questions/2204520/how-do-i-rotate-a-line-segment-in-a-specific-point-on-the-line
    [
      (x1 - x2) * Math.cos(angle) - (y1 - y2) * Math.sin(angle) + x2,
      (x1 - x2) * Math.sin(angle) + (y1 - y2) * Math.cos(angle) + y2,
    ];
    
  export const rotatePoint = (
    point: Point,
    center: Point,
    angle: number,
  ): [number, number] => rotate(point[0], point[1], center[0], center[1], angle);

  export const centerPoint = (a: Point, b: Point): Point => {
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };


  export const getControlPointsForBezierCurve = (
    element: NonDeleted<ExcalidrawLinearElement>,
    endPoint: Point,
  ) => {
    const shape = getShapeForElement(element as ExcalidrawLinearElement);
    if (!shape) {
      return null;
    }
  
    const ops = getCurvePathOps(shape[0]);
    let currentP: Mutable<Point> = [0, 0];
    let index = 0;
    let minDistance = Infinity;
    let controlPoints: Mutable<Point>[] | null = null;
  
    while (index < ops.length) {
      const { op, data } = ops[index];
      if (op === "move") {
        currentP = data as unknown as Mutable<Point>;
      }
      if (op === "bcurveTo") {
        const p0 = currentP;
        const p1 = [data[0], data[1]] as Mutable<Point>;
        const p2 = [data[2], data[3]] as Mutable<Point>;
        const p3 = [data[4], data[5]] as Mutable<Point>;
        const distance = distance2d(p3[0], p3[1], endPoint[0], endPoint[1]);
        if (distance < minDistance) {
          minDistance = distance;
          controlPoints = [p0, p1, p2, p3];
        }
        currentP = p3;
      }
      index++;
    }
  
    return controlPoints;
  };

// to be considered a loop
export const isPathALoop = (
    points: ExcalidrawLinearElement["points"],
    /** supply if you want the loop detection to account for current zoom */
    zoomValue: Zoom["value"] = 1 as NormalizedZoomValue,
  ): boolean => {
    if (points.length >= 3) {
      const [first, last] = [points[0], points[points.length - 1]];
      const distance = distance2d(first[0], first[1], last[0], last[1]);
  
      // Adjusting LINE_CONFIRM_THRESHOLD to current zoom so that when zoomed in
      // really close we make the threshold smaller, and vice versa.
      return distance <= LINE_CONFIRM_THRESHOLD / zoomValue;
    }
    return false;
  };

  // This maps interval to actual interval t on the curve so that when t = 0.5, its actually the point at 50% of the length
export const mapIntervalToBezierT = (
  element: NonDeleted<ExcalidrawLinearElement>,
  endPoint: Point,
  interval: number, // The interval between 0 to 1 for which you want to find the point on the curve,
) => {
  const arcLengths = getBezierCurveArcLengths(element, endPoint);
  const pointsCount = arcLengths.length - 1;
  const curveLength = arcLengths.at(-1) as number;
  const targetLength = interval * curveLength;
  let low = 0;
  let high = pointsCount;
  let index = 0;
  // Doing a binary search to find the largest length that is less than the target length
  while (low < high) {
    index = Math.floor(low + (high - low) / 2);
    if (arcLengths[index] < targetLength) {
      low = index + 1;
    } else {
      high = index;
    }
  }
  if (arcLengths[index] > targetLength) {
    index--;
  }
  if (arcLengths[index] === targetLength) {
    return index / pointsCount;
  }

  return (
    1 -
    (index +
      (targetLength - arcLengths[index]) /
        (arcLengths[index + 1] - arcLengths[index])) /
      pointsCount
  );
};

export const arePointsEqual = (p1: Point, p2: Point) => {
  return p1[0] === p2[0] && p1[1] === p2[1];
};

export const getBezierCurveArcLengths = (
  element: NonDeleted<ExcalidrawLinearElement>,
  endPoint: Point,
) => {
  const arcLengths: number[] = [];
  arcLengths[0] = 0;
  const points = getPointsInBezierCurve(element, endPoint);
  let index = 0;
  let distance = 0;
  while (index < points.length - 1) {
    const segmentDistance = distance2d(
      points[index][0],
      points[index][1],
      points[index + 1][0],
      points[index + 1][1],
    );
    distance += segmentDistance;
    arcLengths.push(distance);
    index++;
  }

  return arcLengths;
};

export const getPointsInBezierCurve = (
  element: NonDeleted<ExcalidrawLinearElement>,
  endPoint: Point,
) => {
  const controlPoints: Mutable<Point>[] = getControlPointsForBezierCurve(
    element,
    endPoint,
  )!;
  if (!controlPoints) {
    return [];
  }
  const pointsOnCurve: Mutable<Point>[] = [];
  let t = 1;
  // Take 20 points on curve for better accuracy
  while (t > 0) {
    const point = getBezierXY(
      controlPoints[0],
      controlPoints[1],
      controlPoints[2],
      controlPoints[3],
      t,
    );
    pointsOnCurve.push([point[0], point[1]]);
    t -= 0.05;
  }
  if (pointsOnCurve.length) {
    if (arePointsEqual(pointsOnCurve.at(-1)!, endPoint)) {
      pointsOnCurve.push([endPoint[0], endPoint[1]]);
    }
  }
  return pointsOnCurve;
};


export const getBezierXY = (
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number,
) => {
  const equation = (t: number, idx: number) =>
    Math.pow(1 - t, 3) * p3[idx] +
    3 * t * Math.pow(1 - t, 2) * p2[idx] +
    3 * Math.pow(t, 2) * (1 - t) * p1[idx] +
    p0[idx] * Math.pow(t, 3);
  const tx = equation(t, 0);
  const ty = equation(t, 1);
  return [tx, ty];
};


  export const adjustXYWithRotation = (
    sides: {
      n?: boolean;
      e?: boolean;
      s?: boolean;
      w?: boolean;
    },
    x: number,
    y: number,
    angle: number,
    deltaX1: number,
    deltaY1: number,
    deltaX2: number,
    deltaY2: number,
  ): [number, number] => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    if (sides.e && sides.w) {
      x += deltaX1 + deltaX2;
    } else if (sides.e) {
      x += deltaX1 * (1 + cos);
      y += deltaX1 * sin;
      x += deltaX2 * (1 - cos);
      y += deltaX2 * -sin;
    } else if (sides.w) {
      x += deltaX1 * (1 - cos);
      y += deltaX1 * -sin;
      x += deltaX2 * (1 + cos);
      y += deltaX2 * sin;
    }
  
    if (sides.n && sides.s) {
      y += deltaY1 + deltaY2;
    } else if (sides.n) {
      x += deltaY1 * sin;
      y += deltaY1 * (1 - cos);
      x += deltaY2 * -sin;
      y += deltaY2 * (1 + cos);
    } else if (sides.s) {
      x += deltaY1 * -sin;
      y += deltaY1 * (1 + cos);
      x += deltaY2 * sin;
      y += deltaY2 * (1 - cos);
    }
    return [x, y];
  };
  