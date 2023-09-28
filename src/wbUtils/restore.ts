import { ImportedDataState } from "@excalidraw/excalidraw/types/data/types";
import { ExcalidrawElement, ExcalidrawSelectionElement, ExcalidrawTextElement, FontFamilyValues, StrokeRoundness } from "@excalidraw/excalidraw/types/element/types";
import { DEFAULT_FONT_FAMILY, DEFAULT_TEXT_ALIGN, DEFAULT_VERTICAL_ALIGN, FONT_FAMILY, PRECEDING_ELEMENT_KEY, ROUNDNESS } from "./constants";
import { bumpVersion } from "./mutateElement";
import { randomId } from "./random";
import { getNormalizedDimensions, isInvisiblySmallElement } from "./sizeHelpers";
import oc from "open-color";
import { arrayToMap, getUpdatedTimestamp, Mutable } from "./utils";
import { refreshTextDimensions } from "./newElement";
import { LinearElementEditor } from "./linearElementEditor";
import { isTextElement, isUsingAdaptiveRadius } from "./typeChecks";

export const restoreElements = (
    elements: ImportedDataState["elements"],
    /** NOTE doesn't serve for reconciliation */
    localElements: readonly ExcalidrawElement[] | null | undefined,
    opts?: { refreshDimensions?: boolean; repairBindings?: boolean } | undefined,
  ): ExcalidrawElement[] => {
    const localElementsMap = localElements ? arrayToMap(localElements) : null;
    const restoredElements = (elements || []).reduce((elements, element) => {
      // filtering out selection, which is legacy, no longer kept in elements,
      // and causing issues if retained
      if (element.type !== "selection" && !isInvisiblySmallElement(element)) {
        let migratedElement: ExcalidrawElement | null = restoreElement(
          element,
          opts?.refreshDimensions,
        );
        if (migratedElement) {
          const localElement = localElementsMap?.get(element.id);
          if (localElement && localElement.version > migratedElement.version) {
            migratedElement = bumpVersion(migratedElement, localElement.version);
          }
          elements.push(migratedElement);
        }
      }
      return elements;
    }, [] as ExcalidrawElement[]);
  
    if (!opts?.repairBindings) {
      return restoredElements;
    }
  
    // repair binding. Mutates elements.
    const restoredElementsMap = arrayToMap(restoredElements);
    for (const element of restoredElements) {
      if (isTextElement(element) && element.containerId) {
        repairBoundElement(element, restoredElementsMap);
      } else if (element.boundElements) {
        repairContainerElement(element, restoredElementsMap);
      }
    }
  
    return restoredElements;
  };

  const restoreElement = (
    element: Exclude<ExcalidrawElement, ExcalidrawSelectionElement>,
    refreshDimensions = false,
  ): typeof element | null => {
    switch (element.type) {
      case "text":
        let fontSize = element.fontSize;
        let fontFamily = element.fontFamily;
        if ("font" in element) {
          const [fontPx, _fontFamily]: [string, string] = (
            element as any
          ).font.split(" ");
          fontSize = parseInt(fontPx, 10);
          fontFamily = getFontFamilyByName(_fontFamily);
        }
        element = restoreElementWithProperties(element, {
          fontSize,
          fontFamily,
          text: element.text ?? "",
          textAlign: element.textAlign || DEFAULT_TEXT_ALIGN,
          verticalAlign: element.verticalAlign || DEFAULT_VERTICAL_ALIGN,
          containerId: element.containerId ?? null,
          originalText: element.originalText || element.text,
          baseline:22,
          lineHeight:element.lineHeight
        });
  
        if (refreshDimensions) {
          element = { ...element, ...refreshTextDimensions(element) };
        }
        return element;
      case "freedraw": {
        return restoreElementWithProperties(element, {
          points: element.points,
          lastCommittedPoint: null,
          simulatePressure: element.simulatePressure,
          pressures: element.pressures,
        });
      }
      case "image":
        return restoreElementWithProperties(element, {
          status: element.status || "pending",
          fileId: element.fileId,
          scale: element.scale || [1, 1],
        });
      case "line":
      // @ts-ignore LEGACY type
      // eslint-disable-next-line no-fallthrough
      case "draw":
      case "arrow": {
        const {
          startArrowhead = null,
          endArrowhead = element.type === "arrow" ? "arrow" : null,
        } = element;
  
        let x = element.x;
        let y = element.y;
        let points = // migrate old arrow model to new one
          !Array.isArray(element.points) || element.points.length < 2
            ? [
                [0, 0],
                [element.width, element.height],
              ]
            : element.points;
  
        if (points[0][0] !== 0 || points[0][1] !== 0) {
          ({ points, x, y } = LinearElementEditor.getNormalizedPoints(element));
        }
  
        return restoreElementWithProperties(element, {
          type:
            (element.type as ExcalidrawElement["type"] | "draw") === "draw"
              ? "line"
              : element.type,
          startBinding: element.startBinding,
          endBinding: element.endBinding,
          lastCommittedPoint: null,
          startArrowhead,
          endArrowhead,
          points,
          x,
          y,
        });
      }
  
      // generic elements
      case "ellipse":
        return restoreElementWithProperties(element, {});
      case "rectangle":
        return restoreElementWithProperties(element, {});
      case "diamond":
        return restoreElementWithProperties(element, {});
  
      // Don't use default case so as to catch a missing an element type case.
      // We also don't want to throw, but instead return void so we filter
      // out these unsupported elements from the restored array.
    }
  };

  const getFontFamilyByName = (fontFamilyName: string): FontFamilyValues => {
    if (Object.keys(FONT_FAMILY).includes(fontFamilyName)) {
      return FONT_FAMILY[
        fontFamilyName as keyof typeof FONT_FAMILY
      ] as FontFamilyValues;
    }
    return DEFAULT_FONT_FAMILY;
  };

  /**
 * Repairs target bound element's container's boundElements array,
 * or removes contaienrId if container does not exist.
 *
 * NOTE mutates elements.
 */
const repairBoundElement = (
    boundElement: Mutable<ExcalidrawTextElement>,
    elementsMap: Map<string, Mutable<ExcalidrawElement>>,
  ) => {
    const container = boundElement.containerId
      ? elementsMap.get(boundElement.containerId)
      : null;
  
    if (!container) {
      boundElement.containerId = null;
      return;
    }
  
    if (boundElement.isDeleted) {
      return;
    }
  
    if (
      container.boundElements &&
      !container.boundElements.find((binding) => binding.id === boundElement.id)
    ) {
      // copy because we're not cloning on restore, and we don't want to mutate upstream
      const boundElements = (
        container.boundElements || (container.boundElements = [])
      ).slice();
      boundElements.push({ type: "text", id: boundElement.id });
      container.boundElements = boundElements;
    }
  };

  /**
 * Repairs contaienr element's boundElements array by removing duplicates and
 * fixing containerId of bound elements if not present. Also removes any
 * bound elements that do not exist in the elements array.
 *
 * NOTE mutates elements.
 */
const repairContainerElement = (
    container: Mutable<ExcalidrawElement>,
    elementsMap: Map<string, Mutable<ExcalidrawElement>>,
  ) => {
    if (container.boundElements) {
      // copy because we're not cloning on restore, and we don't want to mutate upstream
      const boundElements = container.boundElements.slice();
  
      // dedupe bindings & fix boundElement.containerId if not set already
      const boundIds = new Set<ExcalidrawElement["id"]>();
      container.boundElements = boundElements.reduce(
        (
          acc: Mutable<NonNullable<ExcalidrawElement["boundElements"]>>,
          binding,
        ) => {
          const boundElement = elementsMap.get(binding.id);
          if (boundElement && !boundIds.has(binding.id)) {
            boundIds.add(binding.id);
  
            if (boundElement.isDeleted) {
              return acc;
            }
  
            acc.push(binding);
  
            if (
              isTextElement(boundElement) &&
              // being slightly conservative here, preserving existing containerId
              // if defined, lest boundElements is stale
              !boundElement.containerId
            ) {
              (boundElement as Mutable<ExcalidrawTextElement>).containerId =
                container.id;
            }
          }
          return acc;
        },
        [],
      );
    }
  };

  const restoreElementWithProperties = <
  T extends Required<Omit<ExcalidrawElement, "customData">> & {
    customData?: ExcalidrawElement["customData"];
    /** @deprecated */
    boundElementIds?: readonly ExcalidrawElement["id"][];
    /** @deprecated */
    strokeSharpness?: StrokeRoundness;
    /** metadata that may be present in elements during collaboration */
    [PRECEDING_ELEMENT_KEY]?: string;
  },
  K extends Pick<T, keyof Omit<Required<T>, keyof ExcalidrawElement>>,
>(
  element: T,
  extra: Pick<
    T,
    // This extra Pick<T, keyof K> ensure no excess properties are passed.
    // @ts-ignore TS complains here but type checks the call sites fine.
    keyof K
  > &
    Partial<Pick<ExcalidrawElement, "type" | "x" | "y">>,
): T => {
  const base: Pick<T, keyof ExcalidrawElement> & {
    [PRECEDING_ELEMENT_KEY]?: string;
  } = {
    type: extra.type || element.type,
    // all elements must have version > 0 so getSceneVersion() will pick up
    // newly added elements
    version: element.version || 1,
    versionNonce: element.versionNonce ?? 0,
    isDeleted: element.isDeleted ?? false,
    id: element.id || randomId(),
    fillStyle: element.fillStyle || "hachure",
    strokeWidth: element.strokeWidth || 1,
    strokeStyle: element.strokeStyle ?? "solid",
    roughness: element.roughness ?? 1,
    opacity: element.opacity == null ? 100 : element.opacity,
    angle: element.angle || 0,
    x: extra.x ?? element.x ?? 0,
    y: extra.y ?? element.y ?? 0,
    strokeColor: element.strokeColor || oc.black,
    backgroundColor: element.backgroundColor || "transparent",
    width: element.width || 0,
    height: element.height || 0,
    seed: element.seed ?? 1,
    groupIds: element.groupIds ?? [],
    roundness: element.roundness
      ? element.roundness
      : element.strokeSharpness === "round"
      ? {
          // for old elements that would now use adaptive radius algo,
          // use legacy algo instead
          type: isUsingAdaptiveRadius(element.type)
            ? ROUNDNESS.LEGACY
            : ROUNDNESS.PROPORTIONAL_RADIUS,
        }
      : null,
    boundElements: element.boundElementIds
      ? element.boundElementIds.map((id) => ({ type: "arrow", id }))
      : element.boundElements ?? [],
    updated: element.updated ?? getUpdatedTimestamp(),
    link: element.link ?? null,
    locked: element.locked ?? false,
  };

  if ("customData" in element) {
    base.customData = element.customData;
  }

  if (PRECEDING_ELEMENT_KEY in element) {
    base[PRECEDING_ELEMENT_KEY] = element[PRECEDING_ELEMENT_KEY];
  }

  return {
    ...base,
    ...getNormalizedDimensions(base),
    ...extra,
  } as unknown as T;
};