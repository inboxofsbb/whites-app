import { ImportedDataState } from "@excalidraw/excalidraw/types/data/types";
import { ExcalidrawElement, ExcalidrawImageElement, FileId } from "@excalidraw/excalidraw/types/element/types";
import { ReconciledElements } from "@excalidraw/excalidraw/types/excalidraw-app/collab/reconciliation";
import { AppState, BinaryFileData, BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import throttle from "lodash.throttle";
import { appJotaiStore, collabAPIAtom } from "./app-jotai";
import { LOAD_IMAGES_TIMEOUT } from "./app_constants";
import { compressData, decompressData } from "./encode";
import { decryptElements, encryptElements, IV_LENGTH_BYTES } from "./encryption";
import { encodeFilesForUpload, updateStaleImageStatuses } from "./FileManager";
import { serializeAsJSON } from "./json";
import Portal from "./Portal";
import {  reconcileElementsWithClear } from "./reconciliation";
import { isInitializedImageElement } from "./typeChecks";
import { getSceneVersion } from "./utils";

export const exportToBackend = async (
    excalidrawModule: any,
    elements: any,
    appState: AppState,
    files: BinaryFiles,
    roomKey: string
): Promise<any> => {
    const encryptionKey = roomKey;
    const payload = await compressData(
        new TextEncoder().encode(
            serializeAsJSON(elements, appState, files, "database")
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
            encryptionKey,
            maxBytes: excalidrawModule.FILE_UPLOAD_MAX_BYTES,
        });

        const response = await fetch(`${process.env.NEXT_PUBLIC_HTTP_STORAGE_BACKEND_URL}/api/v2/scenes/`, {
            method: "POST",
            body: payload.buffer,
        });

        const json = await response.json();

        if (json.id) {
            await saveFilesToHttpStorage({
                prefix: `/files/${json.id}`,
                files: filesToUpload,
            });
            return { id: json.id, key: encryptionKey };
        }
        else if (json.error_class === "RequestTooLargeError") {
            window.alert("alerts.couldNotStoreFileTooBig");
        } else {
            window.alert("alerts.couldNotStoreFileError");
        }

    }
    catch (err) { console.log(err) }

}

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


export const loadSceneFromStorage = async (excalidrawAPI: ExcalidrawImperativeAPI, excalidrawModule: any, roomId: string, roomKey: string) => {
    const collabAPI = appJotaiStore.get(collabAPIAtom);
    collabAPI?.updateRoomKeyAndId(roomId, roomKey);
    const appState = excalidrawAPI?.getAppState();
    const elements = excalidrawAPI?.getSceneElementsIncludingDeleted();
    if (!elements)
        return null;
    const data = await loadScene(excalidrawModule, roomId!, roomKey!, {
        appState
    });
    const reconciledElements = reconcileElementsWithClear(data.elements, appState);
    collabAPI?.setLastBroadcastedOrReceivedSceneVersion(getSceneVersion(elements));
    await excalidrawAPI?.resetScene();
    handleRemoteSceneUpdate(excalidrawAPI, reconciledElements, {
        init: true,
    });
}





const handleRemoteSceneUpdate = async (excalidrawAPI: ExcalidrawImperativeAPI,
    elements: ReconciledElements,
    { init = false }: { init?: boolean } = {}
) => {
    const collabAPI = appJotaiStore.get(collabAPIAtom);
    excalidrawAPI.updateScene({
        elements,
        commitToHistory: !!init,
    });
    excalidrawAPI.history.clear();
    await collabAPI?.loadImageFiles(!!init);
}

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


export const importFromBackend = async (
    id: string,
    decryptionKey: string,
): Promise<ImportedDataState> => {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_HTTP_STORAGE_BACKEND_URL}/api/v2/scenes/${id}`);

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



export const updateScenesToHttpStorage = async (
    elements: readonly ExcalidrawElement[],
    pageId: string, pageKey: string, excalidrawAPI: ExcalidrawImperativeAPI) => {
    const collabAPI = appJotaiStore.get(collabAPIAtom);
    if (!pageId)
        return null;
    try {

        const sceneVersion = getSceneVersion(elements);
        const getResponse = await fetch(
            `${process.env.NEXT_PUBLIC_HTTP_STORAGE_BACKEND_URL}/api/v2/scenes/${pageId}`);
        if (!getResponse.ok && getResponse.status !== 404) {
            return false;
        }
        if (getResponse.ok) {
            const buffer = await getResponse.arrayBuffer();

            const { data: decodedBuffer } = await decompressData(
                new Uint8Array(buffer),
                {
                    decryptionKey: pageKey,
                },
            );
            const data: ImportedDataState = JSON.parse(
                new TextDecoder().decode(decodedBuffer),
            );
            if (getSceneVersion(data.elements!) >= sceneVersion) {
                return false;
            }
        }

        const payload = await compressData(
            new TextEncoder().encode(
                serializeAsJSON(elements, excalidrawAPI?.getAppState(), excalidrawAPI?.getFiles(), "database")
            ),
            { encryptionKey: pageKey }
        );


        const putResponse = await fetch(
            `${process.env.NEXT_PUBLIC_HTTP_STORAGE_BACKEND_URL}/api/v2/scenes/${pageId}`,
            {
                method: "PUT",
                body: payload,
            },
        );
        if (putResponse.ok) {
            collabAPI?.portal.queueFileUpload();
            return true;
        }
        return false;
    }
    catch (err) {
        console.log(err)
    }
}
