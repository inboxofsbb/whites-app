import { MIME_TYPES } from "../constants";
import { compressData, decompressData } from "./encode";
import { decryptData, encryptData, generateEncryptionKey, IV_LENGTH_BYTES } from "./encryption";
// import { restoreElements } from "../../data/restore";
// import { getSceneVersion } from "../../element";
import { ExcalidrawElement, FileId } from "@excalidraw/excalidraw/types/element/types";
import { BinaryFileData, BinaryFileMetadata, DataURL } from "@excalidraw/excalidraw/types/types";
import Portal from "../collab/Portal";
import { Socket } from "socket.io-client";
import { loadScene } from ".";

// There is a lot of intentional duplication with the firebase file
// to prevent modifying upstream files and ease futur maintenance of this fork


interface HttpStoredScene {
  sceneVersion: number;
  iv: any;
  ciphertext: any;
}

export const encryptElements = async (
  key: string,
  elements: readonly ExcalidrawElement[],
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> => {
  const json = JSON.stringify(elements);
  const encoded = new TextEncoder().encode(json);
  const { encryptedBuffer, iv } = await encryptData(key, encoded);

  return { ciphertext: encryptedBuffer, iv };
};

export const decryptElements = async (
  key: string,
  iv: Uint8Array,
  ciphertext: ArrayBuffer | Uint8Array,
): Promise<readonly ExcalidrawElement[]> => {
  const decrypted = await decryptData(iv, ciphertext, key);
  const decodedData = new TextDecoder("utf-8").decode(
    new Uint8Array(decrypted),
  );
  return JSON.parse(decodedData);
};

const httpStorageSceneVersionCache = new WeakMap<
  Socket,
  number
>();

export const isSavedToHttpStorage = (
  portal: Portal,
  elements: readonly ExcalidrawElement[],
): boolean => {
  if (portal.socket && portal.roomId && portal.roomKey) {
    const sceneVersion = portal.collab.excalidrawModule.getSceneVersion(elements);

    return httpStorageSceneVersionCache.get(portal.socket) === sceneVersion;
  }
  // if no room exists, consider the room saved so that we don't unnecessarily
  // prevent unload (there's nothing we could do at that point anyway)
  return true;
};

export const saveToHttpStorage = async (
  portal: Portal,
  elements: readonly ExcalidrawElement[],
) => {
  const { roomId, roomKey, socket } = portal;
  if (
    // if no room exists, consider the room saved because there's nothing we can
    // do at this point
    !roomId ||
    !roomKey ||
    !socket ||
    isSavedToHttpStorage(portal, elements)
  ) {
    return true;
  }

  const sceneVersion = portal.collab.excalidrawModule.getSceneVersion(elements);

  const HTTP_STORAGE_BACKEND_URL = `${process.env.NEXT_PUBLIC_HTTP_STORAGE_BACKEND_URL}/api/v2`;
  const getResponse = await fetch(
    `${HTTP_STORAGE_BACKEND_URL}/rooms/${roomId}`,
  );
  if (!getResponse.ok && getResponse.status !== 404) {
    return false;
  }

  // If room already exist, we compare scene versions to check
  // if we're up to date before saving our scene
  if (getResponse.ok) {
    const buffer = await getResponse.arrayBuffer();
    const existingElements = await getElementsFromBuffer(buffer, roomKey);

    if (portal.collab.excalidrawModule.getSceneVersion(existingElements) >= sceneVersion) {
      return false;
    }
  }

  const { ciphertext, iv } = await encryptElements(roomKey, elements);

  // Concatenate IV with encrypted data (IV does not have to be secret).
  const payloadBlob = new Blob([iv.buffer, ciphertext]);
  const payload = await new Response(payloadBlob).arrayBuffer();
  const putResponse = await fetch(
    `${HTTP_STORAGE_BACKEND_URL}/rooms/${roomId}`,
    {
      method: "PUT",
      body: payload,
    },
  );

  if (putResponse.ok) {
    httpStorageSceneVersionCache.set(socket, sceneVersion);
    return true;
  }

  return false;
};

export const saveScenesToStore = async (
  portal: Portal,
  elements: readonly ExcalidrawElement[],
) => {
  const { roomId, roomKey, currentSceneId, socket } = portal;
  if (
    // if no room exists, consider the room saved because there's nothing we can
    // do at this point
    !currentSceneId ||
    !roomId ||
    !roomKey ||
    !socket ||
    isSavedToHttpStorage(portal, elements)
  ) {
    return true;
  }
  const sceneVersion = portal.collab.excalidrawModule.getSceneVersion(elements);
  const HTTP_STORAGE_BACKEND_URL = `${process.env.NEXT_PUBLIC_HTTP_STORAGE_BACKEND_URL}/api/v2`;
  const appState = portal.collab.excalidrawAPI.getAppState();
  const files = portal.collab.excalidrawAPI.getFiles();
  var scenesFromId;
  try {
    scenesFromId = await loadScene(portal.collab.excalidrawModule, currentSceneId, roomKey, { appState });
  }
  catch (e) {
    console.log(e)
  }

  if (!scenesFromId) {
    return false;
  }

  // If room already exist, we compare scene versions to check
  // if we're up to date before saving our scene
  if (scenesFromId) {

    const existingElements = scenesFromId.elements;;

    if (portal.collab.excalidrawModule.getSceneVersion(existingElements) >= sceneVersion) {
      return false;
    }
  }

  const payload = await compressData(
    new TextEncoder().encode(
      portal.collab.excalidrawModule.serializeAsJSON(elements, appState, files, "database")
    ),
    { encryptionKey: roomKey }
  );

  const putResponse = await fetch(
    `${HTTP_STORAGE_BACKEND_URL}/scenes/${currentSceneId}`,
    {
      method: "PUT",
      body: payload,
    },
  );

  if (putResponse.ok) {
    httpStorageSceneVersionCache.set(socket, sceneVersion);
    return true;
  }

  return false;
};

export const loadFromHttpStorage = async (
  excalidrawModule: any,
  roomId: string,
  roomKey: string,
  socket: Socket | null,
): Promise<readonly ExcalidrawElement[] | null> => {
  const HTTP_STORAGE_BACKEND_URL = `${process.env.NEXT_PUBLIC_HTTP_STORAGE_BACKEND_URL}/api/v2`;
  const getResponse = await fetch(
    `${HTTP_STORAGE_BACKEND_URL}/rooms/${roomId}`,
  );

  const buffer = await getResponse.arrayBuffer();
  const elements = await getElementsFromBuffer(buffer, roomKey);

  if (socket) {
    httpStorageSceneVersionCache.set(socket, excalidrawModule.getSceneVersion(elements));
  }

  return excalidrawModule.restoreElements(elements, null);
};

const getElementsFromBuffer = async (
  buffer: ArrayBuffer,
  key: string,
): Promise<readonly ExcalidrawElement[]> => {
  // Buffer should contain both the IV (fixed length) and encrypted data
  const iv = buffer.slice(0, IV_LENGTH_BYTES);
  const encrypted = buffer.slice(IV_LENGTH_BYTES, buffer.byteLength);

  return await decryptElements(
    key,
    new Uint8Array(iv),
    new Uint8Array(encrypted),
  );
};

export const saveFilesToHttpStorage = async ({
  prefix,
  files,
}: {
  prefix: string;
  files: { id: FileId; buffer: Uint8Array }[];
}) => {
  const erroredFiles = new Map<FileId, true>();
  const savedFiles = new Map<FileId, true>();

  const HTTP_STORAGE_BACKEND_URL = `${process.env.NEXT_PUBLIC_HTTP_STORAGE_BACKEND_URL}/api/v2`;

  await Promise.all(
    files.map(async ({ id, buffer }) => {
      try {
        const payloadBlob = new Blob([buffer]);
        const payload = await new Response(payloadBlob).arrayBuffer();
        await fetch(`${HTTP_STORAGE_BACKEND_URL}/files/${id}`, {
          method: "PUT",
          body: payload,
        });
        savedFiles.set(id, true);
      } catch (error: any) {
        erroredFiles.set(id, true);
      }
    }),
  );

  return { savedFiles, erroredFiles };
};

export const loadFilesFromHttpStorage = async (
  prefix: string,
  decryptionKey: string,
  filesIds: readonly FileId[],
) => {
  const loadedFiles: BinaryFileData[] = [];
  const erroredFiles = new Map<FileId, true>();

  //////////////
  await Promise.all(
    [...new Set(filesIds)].map(async (id) => {
      try {
        const HTTP_STORAGE_BACKEND_URL = `${process.env.NEXT_PUBLIC_HTTP_STORAGE_BACKEND_URL}/api/v2`;
        const response = await fetch(`${HTTP_STORAGE_BACKEND_URL}/files/${id}`);
        if (response.status < 400) {
          const arrayBuffer = await response.arrayBuffer();

          const { data, metadata } = await decompressData<BinaryFileMetadata>(
            new Uint8Array(arrayBuffer),
            {
              decryptionKey,
            },
          );

          const dataURL = new TextDecoder().decode(data) as DataURL;

          loadedFiles.push({
            mimeType: metadata.mimeType || MIME_TYPES.binary,
            id,
            dataURL,
            created: metadata?.created || Date.now(),
          });
        } else {
          erroredFiles.set(id, true);
        }
      } catch (error: any) {
        erroredFiles.set(id, true);
        console.error(error);
      }
    }),
  );

  return { loadedFiles, erroredFiles };
};
