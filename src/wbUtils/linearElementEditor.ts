import { ExcalidrawElement, ExcalidrawLinearElement, ExcalidrawTextElementWithContainer, NonDeleted } from "@excalidraw/excalidraw/types/element/types";
import { getCurvePathOps, getElementAbsoluteCoords, getMinMaxXYFromCurvePathOps } from "./bounds";
import { centerPoint, getBezierXY, getControlPointsForBezierCurve, mapIntervalToBezierT, rotate, rotatePoint } from "./math";
import { getShapeForElement } from "./rendererElement";
import { getBoundTextElement } from "./textElement";
import Scene from "./Scene";
import { mutateElement } from "./mutateElement";
import { Point } from "@excalidraw/excalidraw/types/types";


const editorMidPointsCache: {
    version: number | null;
    points: (Point | null)[];
    zoom: number | null;
} = { version: null, points: [], zoom: null };

export class LinearElementEditor {
    public readonly elementId: ExcalidrawElement["id"] & {
        _brand: "excalidrawLinearElementId";
    };
    constructor(element: NonDeleted<ExcalidrawLinearElement>, scene: Scene) {
        this.elementId = element.id as string & {
            _brand: "excalidrawLinearElementId";
        };
    }
    /** scene coords */
    static getPointsGlobalCoordinates(
        element: NonDeleted<ExcalidrawLinearElement>,
    ): any {
        const [x1, y1, x2, y2] = getElementAbsoluteCoords(element);
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        return element.points.map((point) => {
            let { x, y } = element;
            [x, y] = rotate(x + point[0], y + point[1], cx, cy, element.angle);
            return [x, y] as const;
        });
    }

    /** scene coords */
    static getPointGlobalCoordinates(
        element: NonDeleted<ExcalidrawLinearElement>,
        point: Point,
    ) {
        const [x1, y1, x2, y2] = getElementAbsoluteCoords(element);
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;

        let { x, y } = element;
        [x, y] = rotate(x + point[0], y + point[1], cx, cy, element.angle);
        return [x, y] as const;
    }

    static getBoundTextElementPosition = (
        element: ExcalidrawLinearElement,
        boundTextElement: ExcalidrawTextElementWithContainer,
    ): { x: number; y: number } => {
        const points = LinearElementEditor.getPointsGlobalCoordinates(element);
        if (points.length < 2) {
            mutateElement(boundTextElement, { isDeleted: true });
        }
        let x = 0;
        let y = 0;
        if (element.points.length % 2 === 1) {
            const index = Math.floor(element.points.length / 2);
            const midPoint = LinearElementEditor.getPointGlobalCoordinates(
                element,
                element.points[index] as any,
            );
            x = midPoint[0] - boundTextElement.width / 2;
            y = midPoint[1] - boundTextElement.height / 2;
        } else {
            const index = element.points.length / 2 - 1;

            let midSegmentMidpoint: any = editorMidPointsCache.points[index];
            if (element.points.length === 2) {
                midSegmentMidpoint = centerPoint(points[0], points[1]);
            }
            if (
                !midSegmentMidpoint ||
                editorMidPointsCache.version !== element.version
            ) {
                midSegmentMidpoint = LinearElementEditor.getSegmentMidPoint(
                    element,
                    points[index],
                    points[index + 1],
                    index + 1,
                );
            }
            x = midSegmentMidpoint[0] - boundTextElement.width / 2;
            y = midSegmentMidpoint[1] - boundTextElement.height / 2;
        }
        return { x, y };
    };

    static getSegmentMidPoint(
        element: any,
        startPoint: Point,
        endPoint: Point,
        endPointIndex: number,
    ) {
        let segmentMidPoint: any = centerPoint(startPoint, endPoint);
        if (element.points.length > 2 && element.roundness) {
            const controlPoints = getControlPointsForBezierCurve(
                element,
                element.points[endPointIndex],
            );
            if (controlPoints) {
                const t = mapIntervalToBezierT(
                    element,
                    element.points[endPointIndex],
                    0.5,
                );

                const [tx, ty] = getBezierXY(
                    controlPoints[0],
                    controlPoints[1],
                    controlPoints[2],
                    controlPoints[3],
                    t,
                );
                segmentMidPoint = LinearElementEditor.getPointGlobalCoordinates(
                    element,
                    [tx, ty],
                );
            }
        }

        return segmentMidPoint;
    }

    static getElementAbsoluteCoords = (
        element: ExcalidrawLinearElement,
        includeBoundText: boolean = false,
    ): [number, number, number, number, number, number] => {
        let coords: [number, number, number, number, number, number];
        let x1;
        let y1;
        let x2;
        let y2;
        if (element.points.length < 2 || !getShapeForElement(element)) {
            // XXX this is just a poor estimate and not very useful
            const { minX, minY, maxX, maxY } = element.points.reduce(
                (limits, [x, y]) => {
                    limits.minY = Math.min(limits.minY, y);
                    limits.minX = Math.min(limits.minX, x);

                    limits.maxX = Math.max(limits.maxX, x);
                    limits.maxY = Math.max(limits.maxY, y);

                    return limits;
                },
                { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
            );
            x1 = minX + element.x;
            y1 = minY + element.y;
            x2 = maxX + element.x;
            y2 = maxY + element.y;
        } else {
            const shape = getShapeForElement(element)!;

            // first element is always the curve
            const ops = getCurvePathOps(shape[0]);

            const [minX, minY, maxX, maxY] = getMinMaxXYFromCurvePathOps(ops);
            x1 = minX + element.x;
            y1 = minY + element.y;
            x2 = maxX + element.x;
            y2 = maxY + element.y;
        }
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        coords = [x1, y1, x2, y2, cx, cy];

        if (!includeBoundText) {
            return coords;
        }
        const boundTextElement = getBoundTextElement(element);
        if (boundTextElement) {
            coords = LinearElementEditor.getMinMaxXYWithBoundText(
                element,
                [x1, y1, x2, y2],
                boundTextElement,
            );
        }

        return coords;
    };



    static getMinMaxXYWithBoundText = (
        element: ExcalidrawLinearElement,
        elementBounds: [number, number, number, number],
        boundTextElement: ExcalidrawTextElementWithContainer,
    ): [number, number, number, number, number, number] => {
        let [x1, y1, x2, y2] = elementBounds;
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const { x: boundTextX1, y: boundTextY1 } =
            LinearElementEditor.getBoundTextElementPosition(
                element,
                boundTextElement,
            );
        const boundTextX2 = boundTextX1 + boundTextElement.width;
        const boundTextY2 = boundTextY1 + boundTextElement.height;

        const topLeftRotatedPoint = rotatePoint([x1, y1], [cx, cy], element.angle);
        const topRightRotatedPoint = rotatePoint([x2, y1], [cx, cy], element.angle);

        const counterRotateBoundTextTopLeft = rotatePoint(
            [boundTextX1, boundTextY1],

            [cx, cy],

            -element.angle,
        );
        const counterRotateBoundTextTopRight = rotatePoint(
            [boundTextX2, boundTextY1],

            [cx, cy],

            -element.angle,
        );
        const counterRotateBoundTextBottomLeft = rotatePoint(
            [boundTextX1, boundTextY2],

            [cx, cy],

            -element.angle,
        );
        const counterRotateBoundTextBottomRight = rotatePoint(
            [boundTextX2, boundTextY2],

            [cx, cy],

            -element.angle,
        );

        if (
            topLeftRotatedPoint[0] < topRightRotatedPoint[0] &&
            topLeftRotatedPoint[1] >= topRightRotatedPoint[1]
        ) {
            x1 = Math.min(x1, counterRotateBoundTextBottomLeft[0]);
            x2 = Math.max(
                x2,
                Math.max(
                    counterRotateBoundTextTopRight[0],
                    counterRotateBoundTextBottomRight[0],
                ),
            );
            y1 = Math.min(y1, counterRotateBoundTextTopLeft[1]);

            y2 = Math.max(y2, counterRotateBoundTextBottomRight[1]);
        } else if (
            topLeftRotatedPoint[0] >= topRightRotatedPoint[0] &&
            topLeftRotatedPoint[1] > topRightRotatedPoint[1]
        ) {
            x1 = Math.min(x1, counterRotateBoundTextBottomRight[0]);
            x2 = Math.max(
                x2,
                Math.max(
                    counterRotateBoundTextTopLeft[0],
                    counterRotateBoundTextTopRight[0],
                ),
            );
            y1 = Math.min(y1, counterRotateBoundTextBottomLeft[1]);

            y2 = Math.max(y2, counterRotateBoundTextTopRight[1]);
        } else if (topLeftRotatedPoint[0] >= topRightRotatedPoint[0]) {
            x1 = Math.min(x1, counterRotateBoundTextTopRight[0]);
            x2 = Math.max(x2, counterRotateBoundTextBottomLeft[0]);
            y1 = Math.min(y1, counterRotateBoundTextBottomRight[1]);

            y2 = Math.max(y2, counterRotateBoundTextTopLeft[1]);
        } else if (topLeftRotatedPoint[1] <= topRightRotatedPoint[1]) {
            x1 = Math.min(
                x1,
                Math.min(
                    counterRotateBoundTextTopRight[0],
                    counterRotateBoundTextTopLeft[0],
                ),
            );

            x2 = Math.max(x2, counterRotateBoundTextBottomRight[0]);
            y1 = Math.min(y1, counterRotateBoundTextTopRight[1]);
            y2 = Math.max(y2, counterRotateBoundTextBottomLeft[1]);
        }

        return [x1, y1, x2, y2, cx, cy];
    };

    /**
  * Normalizes line points so that the start point is at [0,0]. This is
  * expected in various parts of the codebase. Also returns new x/y to account
  * for the potential normalization.
  */
    static getNormalizedPoints(element: ExcalidrawLinearElement) {
        const { points } = element;

        const offsetX = points[0][0];
        const offsetY = points[0][1];

        return {
            points: points.map((point, _idx) => {
                return [point[0] - offsetX, point[1] - offsetY] as const;
            }),
            x: element.x + offsetX,
            y: element.y + offsetY,
        };
    }
}