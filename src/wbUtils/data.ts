import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { DELETED_ELEMENT_TIMEOUT } from "./app_constants";
import { isInvisiblySmallElement } from "./sizeHelpers";


export type SyncableExcalidrawElement = ExcalidrawElement & {
    _brand: "SyncableExcalidrawElement";
  };

export const isSyncableElement = (
    element: ExcalidrawElement,
  ): element is SyncableExcalidrawElement => {
    if (element.isDeleted) {
      if (element.updated > Date.now() - DELETED_ELEMENT_TIMEOUT) {
        return true;
      }
      return false;
    }
    return !isInvisiblySmallElement(element);
  };


export const getSyncableElements = (elements: readonly ExcalidrawElement[]) =>
  elements.filter((element) =>
    isSyncableElement(element),
  ) as SyncableExcalidrawElement[];