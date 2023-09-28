import { ExcalidrawElement, FileId } from "@excalidraw/excalidraw/types/element/types";
import { BinaryFileData } from "@excalidraw/excalidraw/types/types";
import Portal from "../collab/Portal";
import { Socket } from "socket.io-client";

export interface StorageBackend {
  isSaved: (portal: Portal, elements: readonly ExcalidrawElement[]) => boolean;
  saveToStorageBackend: (
    portal: Portal,
    elements: readonly ExcalidrawElement[],
  ) => Promise<boolean>;
  saveScenesToStore: (
    portal: Portal,
    elements: readonly ExcalidrawElement[],
  ) => Promise<boolean>;

  loadFromStorageBackend: (
    excalidrawModule: any,
    roomId: string,
    roomKey: string,
    socket: Socket | null,
  ) => Promise<readonly ExcalidrawElement[] | null>;
  saveFilesToStorageBackend: ({
    prefix,
    files,
  }: {
    prefix: string;
    files: {
      id: FileId;
      buffer: Uint8Array;
    }[];
  }) => Promise<{
    savedFiles: Map<FileId, true>;
    erroredFiles: Map<FileId, true>;
  }>;
  loadFilesFromStorageBackend: (
    prefix: string,
    decryptionKey: string,
    filesIds: readonly FileId[],
  ) => Promise<{
    loadedFiles: BinaryFileData[];
    erroredFiles: Map<FileId, true>;
  }>;
}
