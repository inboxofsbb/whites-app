import { ExportedDataState } from "@excalidraw/excalidraw/types/data/types";
import { ExcalidrawElement, NonDeletedExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { AppState, BinaryFiles } from "@excalidraw/excalidraw/types/types";
import { cleanAppStateForExport, clearAppStateForDatabase } from "./appState";
import { EXPORT_DATA_TYPES, EXPORT_SOURCE, VERSIONS } from "./constants";
import { isLinearElementType } from "./typeChecks";

export const serializeAsJSON = (
    elements: readonly ExcalidrawElement[],
    appState: Partial<AppState>,
    files: BinaryFiles,
    type: "local" | "database",
  ): string => {
    const data: ExportedDataState = {
      type: EXPORT_DATA_TYPES.excalidraw,
      version: VERSIONS.excalidraw,
      source: EXPORT_SOURCE,
      elements:
        type === "local"
          ? clearElementsForExport(elements)
          : clearElementsForDatabase(elements),
      appState:
        type === "local"
          ? cleanAppStateForExport(appState)
          : clearAppStateForDatabase(appState),
      files:
        type === "local"
          ? filterOutDeletedFiles(elements, files)
          : // will be stripped from JSON
            undefined,
    };
  
    return JSON.stringify(data, null, 2);
  };

  /**
 * Strips out files which are only referenced by deleted elements
 */
const filterOutDeletedFiles = (
    elements: readonly ExcalidrawElement[],
    files: BinaryFiles,
  ) => {
    const nextFiles: BinaryFiles = {};
    for (const element of elements) {
      if (
        !element.isDeleted &&
        "fileId" in element &&
        element.fileId &&
        files[element.fileId]
      ) {
        nextFiles[element.fileId] = files[element.fileId];
      }
    }
    return nextFiles;
  };
  

  export const getNonDeletedElements = (elements: readonly ExcalidrawElement[]) =>
  elements.filter(
    (element) => !element.isDeleted,
  ) as readonly NonDeletedExcalidrawElement[];



  export const clearElementsForDatabase = (
    elements: readonly ExcalidrawElement[],
  ) => _clearElements(elements);
  
  export const clearElementsForExport = (
    elements: readonly ExcalidrawElement[],
  ) => _clearElements(elements);
  


const _clearElements = (
    elements: readonly ExcalidrawElement[],
  ): ExcalidrawElement[] =>
    getNonDeletedElements(elements).map((element) =>
      isLinearElementType(element.type)
        ? { ...element, lastCommittedPoint: null }
        : element,
    );