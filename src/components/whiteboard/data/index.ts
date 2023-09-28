import { ImportedDataState } from "@excalidraw/excalidraw/types/data/types";
import {
  ExcalidrawElement,
  FileId,
} from "@excalidraw/excalidraw/types/element/types";
import {
  AppState,
  BinaryFileData,
  BinaryFiles,
  UserIdleState,
} from "@excalidraw/excalidraw/types/types";
import { bytesToHexString } from "../utils";
import {
  DELETED_ELEMENT_TIMEOUT,
  FILE_UPLOAD_MAX_BYTES,
  ROOM_ID_BYTES,
} from "../app_constants";
import { encodeFilesForUpload } from "./FileManager";
import { generateEncryptionKey } from "./encryption";
import { compressData, decompressData } from "./encode";
import { storageBackend } from "./config";
import {
  isFreeDrawElement,
  isInitializedImageElement,
  isLinearElement,
} from "./typeChecks";
import { CollabAPI, CollabState } from "../collab/Collab";

export type SyncableExcalidrawElement = ExcalidrawElement & {
  _brand: "SyncableExcalidrawElement";
};

export const isInvisiblySmallElement = (
  element: ExcalidrawElement
): boolean => {
  if (isLinearElement(element) || isFreeDrawElement(element)) {
    return element.points.length < 2;
  }
  return element.width === 0 && element.height === 0;
};

export const isSyncableElement = (
  element: ExcalidrawElement
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
    isSyncableElement(element)
  ) as SyncableExcalidrawElement[];

const BACKEND_V2_GET = `${process.env.NEXT_PUBLIC_HTTP_STORAGE_BACKEND_URL}/api/v2/scenes/`;
const BACKEND_V2_POST = `${process.env.NEXT_PUBLIC_HTTP_STORAGE_BACKEND_URL}/api/v2/scenes/`;

const generateRoomId = async () => {
  const buffer = new Uint8Array(ROOM_ID_BYTES);
  window.crypto.getRandomValues(buffer);
  return bytesToHexString(buffer);
};

/**
 * Right now the reason why we resolve connection params (url, polling...)
 * from upstream is to allow changing the params immediately when needed without
 * having to wait for clients to update the SW.
 *
 * If REACT_APP_WS_SERVER_URL env is set, we use that instead (useful for forks)
 */
export const getCollabServer = async (): Promise<{
  url: string;
  polling: boolean;
}> => {
  if (process.env.NEXT_PUBLIC_WS_SERVER_URL) {
    return {
      url: process.env.NEXT_PUBLIC_WS_SERVER_URL,
      polling: true,
    };
  } else {
    throw new Error("errors.cannotResolveCollabServer");
  }
};

export type EncryptedData = {
  data: ArrayBuffer;
  iv: Uint8Array;
};

export type SocketUpdateDataSource = {
  SCENE_INIT: {
    type: "SCENE_INIT";
    payload: {
      boardData: CollabState['boardData']
      elements: readonly ExcalidrawElement[];
    };
  };
  BOARD_DATA_CHANGE: {
    type: "BOARD_DATA_CHANGE";
    payload: {
      boardData: CollabState['boardData']
      elements: readonly ExcalidrawElement[];

    };
  };

  SCENE_UPDATE: {
    type: "SCENE_UPDATE";
    payload: {
      boardData: CollabState['boardData']
      elements: readonly ExcalidrawElement[];
    };
  };
  MOUSE_LOCATION: {
    type: "MOUSE_LOCATION";
    payload: {
      socketId: string;
      pointer: { x: number; y: number };
      boardData: CollabState['boardData']
      button: "down" | "up";
      selectedElementIds: AppState["selectedElementIds"];
      username: string;
    };
  };
  IDLE_STATUS: {
    type: "IDLE_STATUS";
    payload: {
      socketId: string;
      boardData: CollabState['boardData']
      userState: UserIdleState;
      username: string;
    };
  };
};

export type SocketUpdateDataIncoming =
  | SocketUpdateDataSource[keyof SocketUpdateDataSource]
  | {
    type: "INVALID_RESPONSE";
  };

export type SocketUpdateData =
  SocketUpdateDataSource[keyof SocketUpdateDataSource] & {
    _brand: "socketUpdateData";
  };

export const generateCollaborationLinkData = async () => {
  const roomId = await generateRoomId();
  const roomKey = await generateEncryptionKey();

  if (!roomKey) {
    throw new Error("Couldn't generate room key");
  }
  return { roomId, roomKey };
};

const importFromBackend = async (
  id: string,
  decryptionKey: string
): Promise<ImportedDataState> => {
  try {
    const response = await fetch(`${BACKEND_V2_GET}${id}`);

    if (!response.ok) {

      return {};
    }
    const buffer = await response.arrayBuffer();

    try {
      const { data: decodedBuffer } = await decompressData(
        new Uint8Array(buffer),
        {
          decryptionKey,
        }
      );
      const data: ImportedDataState = JSON.parse(
        new TextDecoder().decode(decodedBuffer)
      );

      return {
        elements: data.elements || null,
        appState: data.appState || null,
      };
    } catch (error: any) {
      console.warn(
        "error when decoding shareLink data using the new format:",
        error
      );
      return {};
    }
  } catch (error: any) {

    console.error(error);
    return {};
  }
};

export const loadScene = async (
  excalidrawModule: any,
  id: string,
  privateKey: string,
  // Supply local state even if importing from backend to ensure we restore
  // localStorage user settings which we do not persist on server.
  // Non-optional so we don't forget to pass it even if `undefined`.
  localDataState: ImportedDataState | undefined | null
) => {

  let data;
  if (id != null && privateKey != null) {
    // the private key is used to decrypt the content from the server, take
    // extra care not to leak it
    data = excalidrawModule.restore(
      await importFromBackend(id, privateKey),
      localDataState?.appState,
      localDataState?.elements
    );
  } else {
    data = excalidrawModule.restore(localDataState || null, null, null);
  }
  return {
    elements: data.elements,
    appState: data.appState,
    // note: this will always be empty because we're not storing files
    // in the scene database/localStorage, and instead fetch them async
    // from a different database
    files: data.files,
    commitToHistory: false,
  };
};

export const exportToBackend = async (
  excalidrawModule: any,
  elements: readonly ExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
  roomKey: string
): Promise<{ id: string; key: string } | undefined> => {
  const encryptionKey = roomKey;
  const encryptionImageKey = encryptionKey;

  const payload = await compressData(
    new TextEncoder().encode(
      excalidrawModule.serializeAsJSON(elements, appState, files, "database")
    ),
    { encryptionKey }
  );

  try {
    const filesMap = new Map<FileId, BinaryFileData>();
    for (const element of elements) {
      if (isInitializedImageElement(element) && files[element.fileId]) {
        filesMap.set(element.fileId, files[element.fileId]);
      }
    }

    const filesToUpload = await encodeFilesForUpload({
      files: filesMap,
      encryptionKey: encryptionImageKey,
      maxBytes: FILE_UPLOAD_MAX_BYTES,
    });

    const response = await fetch(`${BACKEND_V2_POST}`, {
      method: "POST",
      body: payload.buffer,
    });
    const json = await response.json();
    if (json.id) {
      // const url = new URL(window.location.href);
      // // We need to store the key (and less importantly the id) as hash instead
      // // of queryParam in order to never send it to the server
      // url.hash = `json=${json.id},${encryptionKey}`;
      // const urlString = url.toString();

      await storageBackend?.saveFilesToStorageBackend({
        prefix: `/files/${json.id}`,
        files: filesToUpload,
      });
      return { id: json.id, key: encryptionKey };
      // window.prompt(`${"alerts.uploadedSecurly"}`, urlString);
    } else if (json.error_class === "RequestTooLargeError") {
      window.alert("alerts.couldNotStoreFileTooBig");
    } else {
      window.alert("alerts.couldNotStoreFileError");
    }
  } catch (error: any) {
    console.error(error);
    window.alert("alerts.couldNotStoreFile");
  }
};
