import { ExcalidrawElement, ExcalidrawImageElement, InitializedExcalidrawImageElement } from "@excalidraw/excalidraw/types/element/types";
import { BinaryFileData, BinaryFiles, Collaborator, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import { atom } from "jotai";
import throttle from "lodash.throttle";
import { PureComponent } from "react";
import { appJotaiStore, collabAPIAtom } from "./app-jotai";
import { FILE_UPLOAD_MAX_BYTES, INITIAL_SCENE_UPDATE_TIMEOUT, LOAD_IMAGES_TIMEOUT, SYNC_FULL_SCENE_INTERVAL_MS, WS_SCENE_EVENT_TYPES } from "./app_constants";
import { ACTIVE_THRESHOLD, APP_NAME, ENV, EVENT, IDLE_THRESHOLD, UserIdleState } from "./constants";
import { encodeFilesForUpload, FileManager, updateStaleImageStatuses } from "./FileManager";
import { newElementWith } from "./mutateElement";
import Portal from "./Portal";
import { restoreElements } from "./restore";
import { loadFilesFromHttpStorage, saveFilesToHttpStorage } from "./storage";
import { isImageElement, isInitializedImageElement } from "./typeChecks";
import { getCollabServer, getSceneVersion, resolvablePromise, SocketUpdateDataSource } from "./utils";
import { t } from "./i18n";

import {
    ReconciledElements,
    reconcileElements as _reconcileElements,
} from "./reconciliation";
import { getSyncableElements, SyncableExcalidrawElement } from "./data";
import { ImportedDataState } from "@excalidraw/excalidraw/types/data/types";
import { resetBrowserStateVersions } from "./tabSync";
import { decryptData } from "./encryption";
import { importFromBackend, updateScenesToHttpStorage } from "./exportImport";
export const collabDialogShownAtom = atom(false);
export const isCollaboratingAtom = atom(false);
export const isOfflineAtom = atom(false);

interface CollabState {
    username: string;
    errorMessage: string;
    activeRoomLink: string;
    slideId: number;
}
type CollabInstance = InstanceType<typeof Collab>;

declare global {
    interface Window {
        collab: InstanceType<typeof Collab>;
    }
}


export interface CollabAPI {
    changeSlideId: CollabInstance["changeSlideId"];
    fetchImageFilesFromHttpStorage: CollabInstance["fetchImageFilesFromHttpStorage"];
    loadImageFiles: CollabInstance["loadImageFiles"];
    updateRoomKeyAndId: CollabInstance["updateRoomKeyAndId"];
    portal: CollabInstance["portal"];
    startCollaboration: CollabInstance['startCollaboration'];
    syncElements: CollabInstance["syncElements"];
    setLastBroadcastedOrReceivedSceneVersion: CollabInstance["setLastBroadcastedOrReceivedSceneVersion"];
    getSlideId: CollabInstance["getSlideId"];
    fetchAllImageFilesFromHttpStorage: CollabInstance["fetchAllImageFilesFromHttpStorage"];
}

interface PublicProps {
    excalidrawAPI: ExcalidrawImperativeAPI;
}

type Props = PublicProps;

class Collab extends PureComponent<Props, CollabState> {

    portal: Portal;
    fileManager: FileManager;
    excalidrawAPI: Props["excalidrawAPI"];
    activeIntervalId: number | null;
    idleTimeoutId: number | null;

    private socketInitializationTimer?: number;
    private lastBroadcastedOrReceivedSceneVersion: number = -1;
    private collaborators = new Map<string, Collaborator>();

    constructor(props: Props) {
        super(props);
        this.state = {
            errorMessage: "",
            username: "",
            activeRoomLink: "",
            slideId: 0
        }
        this.portal = new Portal(this);
        this.excalidrawAPI = props.excalidrawAPI;
        this.activeIntervalId = null;
        this.idleTimeoutId = null;
        this.fileManager = new FileManager({
            getFiles: async (fileIds) => {
                const { roomId, roomKey } = this.portal;
                if (!roomId || !roomKey) {
                    throw new Error();
                }
                return loadFilesFromHttpStorage(roomKey, fileIds);
            },
            saveFiles: async ({ addedFiles }) => {
                const { roomId, roomKey } = this.portal;
                if (!roomId || !roomKey) {
                    throw new Error();
                }

                return saveFilesToHttpStorage({
                    files: await encodeFilesForUpload({
                        files: addedFiles,
                        encryptionKey: roomKey,
                        maxBytes: FILE_UPLOAD_MAX_BYTES,
                    }),
                });
            },
        });
    }

    componentWillUnmount() {
        window.removeEventListener(EVENT.UNLOAD, this.onUnload);
        window.removeEventListener(EVENT.POINTER_MOVE, this.onPointerMove);
        window.removeEventListener(
            EVENT.VISIBILITY_CHANGE,
            this.onVisibilityChange
        );
        if (this.activeIntervalId) {
            window.clearInterval(this.activeIntervalId);
            this.activeIntervalId = null;
        }
        if (this.idleTimeoutId) {
            window.clearTimeout(this.idleTimeoutId);
            this.idleTimeoutId = null;
        }
    }

    componentDidMount() {
        const collabAPI: CollabAPI = {
            portal: this.portal,
            fetchImageFilesFromHttpStorage: this.fetchImageFilesFromHttpStorage,
            loadImageFiles: this.loadImageFiles,
            updateRoomKeyAndId: this.updateRoomKeyAndId,
            startCollaboration: this.startCollaboration,
            syncElements: this.syncElements,
            setLastBroadcastedOrReceivedSceneVersion: this.setLastBroadcastedOrReceivedSceneVersion,
            changeSlideId: this.changeSlideId,
            getSlideId: this.getSlideId,
            fetchAllImageFilesFromHttpStorage: this.fetchAllImageFilesFromHttpStorage

        }
        appJotaiStore.set(collabAPIAtom, collabAPI);
        this.onOfflineStatusToggle();

        if (
            process.env.NODE_ENV === ENV.TEST ||
            process.env.NODE_ENV === ENV.DEVELOPMENT
        ) {
            window.collab = window.collab || ({} as Window["collab"]);
            Object.defineProperties(window, {
                collab: {
                    configurable: true,
                    value: this,
                },
            });
        }
    }


    private onUnload = () => {
        this.destroySocketClient({ isUnload: true });
    };

    private fetchAllImageFilesFromHttpStorage = async (scene: {
        elements: readonly ExcalidrawElement[];
    }) => {
        const unfetchedImages: any = scene.elements
            .filter((element) => {
                return (
                    isInitializedImageElement(element) &&
                    !element.isDeleted && element.type === "image" &&
                    element.status === "saved"
                );
            })
            .map((element) => (element as ExcalidrawImageElement).fileId);

        const files = await this.fileManager.getFiles(unfetchedImages);
        const loadedFiles = files?.loadedFiles;
        const binaryFiles: BinaryFiles = {};
        loadedFiles?.map((item: BinaryFileData) => {
            binaryFiles[item.id] = item;
        })
        return binaryFiles;
    };
    changeSlideId = (slideId: number) => {
        this.setState({ slideId });
    }

    getSlideId = () => {
        return this.state.slideId;
    }
    broadcastElements = (elements: readonly ExcalidrawElement[]) => {

        if (
            getSceneVersion(elements) >
            this.getLastBroadcastedOrReceivedSceneVersion()
        ) {
            this.portal.broadcastScene(WS_SCENE_EVENT_TYPES.UPDATE, elements, false);
            this.lastBroadcastedOrReceivedSceneVersion = getSceneVersion(elements);
            this.queueBroadcastAllElements();
        }
    };

    syncElements = (elements: readonly ExcalidrawElement[]) => {
        this.broadcastElements(elements);
        // this.queueSaveToFirebase();
    };

    onOfflineStatusToggle = () => {
        appJotaiStore.set(isOfflineAtom, !window.navigator.onLine);
    };
    private fetchImageFilesFromHttpStorage = async (opts: {
        elements: readonly ExcalidrawElement[];
        /**
         * Indicates whether to fetch files that are errored or pending and older
         * than 10 seconds.
         *
         * Use this as a machanism to fetch files which may be ok but for some
         * reason their status was not updated correctly.
         */
        forceFetchFiles?: boolean;
    }) => {
        const unfetchedImages = opts.elements
            .filter((element: any) => {
                return (
                    isInitializedImageElement(element) &&
                    !this.fileManager.isFileHandled(element.fileId) &&
                    !element.isDeleted &&
                    (opts.forceFetchFiles
                        ? element.status !== "pending" ||
                        Date.now() - element.updated > 10000
                        : element.status === "saved")
                );
            })
            .map((element) => (element as InitializedExcalidrawImageElement).fileId);
        return await this.fileManager.getFiles(unfetchedImages);
    };

    queueSaveToHttpStorage = throttle(
        () => {
            if (this.portal.socketInitialized) {
                this.saveCollabRoomToFirebase(
                    getSyncableElements(
                        this.excalidrawAPI.getSceneElementsIncludingDeleted(),
                    ),
                );
            }
        },
        SYNC_FULL_SCENE_INTERVAL_MS,
        { leading: false },
    );


    setCollaborators(sockets: string[]) {
        const collaborators: InstanceType<typeof Collab>["collaborators"] =
            new Map();
        for (const socketId of sockets) {
            if (this.collaborators.has(socketId)) {
                collaborators.set(socketId, this.collaborators.get(socketId)!);
            } else {
                collaborators.set(socketId, {});
            }
        }
        this.collaborators = collaborators;
        this.excalidrawAPI.updateScene({ collaborators });
    }



    saveCollabRoomToFirebase = async (
        syncableElements: readonly SyncableExcalidrawElement[],
    ) => {
        try {
            await updateScenesToHttpStorage(
                this.excalidrawAPI.getSceneElementsIncludingDeleted(),
                this.portal.roomId!, this.portal.roomKey!,
                this.excalidrawAPI,
            );


        } catch (error: any) {
            this.setState({
                // firestore doesn't return a specific error code when size exceeded
                errorMessage: /is longer than.*?bytes/.test(error.message)
                    ? t("errors.collabSaveFailed_sizeExceeded")
                    : t("errors.collabSaveFailed"),
            });
            console.error(error);
        }
    };

    stopCollaboration = (keepRemoteState = true) => {
        this.queueBroadcastAllElements.cancel();
        this.queueSaveToHttpStorage.cancel();
        this.loadImageFiles.cancel();

        // this.saveCollabRoomToFirebase(
        //     getSyncableElements(
        //         this.excalidrawAPI.getSceneElementsIncludingDeleted(),
        //     ),
        // );

        if (this.portal.socket && this.fallbackInitializationHandler) {
            this.portal.socket.off(
                "connect_error",
                this.fallbackInitializationHandler,
            );
        }

        if (!keepRemoteState) {
            // LocalData.fileStorage.reset();
            this.destroySocketClient();
        } else if (window.confirm(t("alerts.collabStopOverridePrompt"))) {
            // hack to ensure that we prefer we disregard any new browser state
            // that could have been saved in other tabs while we were collaborating
            resetBrowserStateVersions();

            window.history.pushState({}, APP_NAME, window.location.origin);
            this.destroySocketClient();

            // fileStorage.reset();

            const elements = this.excalidrawAPI
                .getSceneElementsIncludingDeleted()
                .map((element) => {
                    if (isImageElement(element) && element.status === "saved") {
                        return newElementWith(element, { status: "pending" });
                    }
                    return element;
                });

            this.excalidrawAPI.updateScene({
                elements,
                commitToHistory: false,
            });
        }
    };

    isCollaborating = () => appJotaiStore.get(isCollaboratingAtom)!;

    private setIsCollaborating = (isCollaborating: boolean) => {
        appJotaiStore.set(isCollaboratingAtom, isCollaborating);
    };

    private destroySocketClient = (opts?: { isUnload: boolean }) => {
        this.lastBroadcastedOrReceivedSceneVersion = -1;
        this.portal.close();
        this.fileManager.reset();
        if (!opts?.isUnload) {
            this.setIsCollaborating(false);
            this.setState({
                activeRoomLink: "",
            });
            this.collaborators = new Map();
            this.excalidrawAPI.updateScene({
                collaborators: this.collaborators,
            });
            // LocalData.resumeSave("collaboration");
        }
    };

    private fetchImageFilesFromFirebase = async (opts: {
        elements: readonly ExcalidrawElement[];
        /**
         * Indicates whether to fetch files that are errored or pending and older
         * than 10 seconds.
         *
         * Use this as a machanism to fetch files which may be ok but for some
         * reason their status was not updated correctly.
         */
        forceFetchFiles?: boolean;
    }) => {
        const unfetchedImages = opts.elements
            .filter((element: any) => {
                return (
                    isInitializedImageElement(element) &&
                    !this.fileManager.isFileHandled(element.fileId) &&
                    !element.isDeleted &&
                    (opts.forceFetchFiles
                        ? element.status !== "pending" ||
                        Date.now() - element.updated > 10000
                        : element.status === "saved")
                );
            })
            .map((element) => (element as InitializedExcalidrawImageElement).fileId);

        return await this.fileManager.getFiles(unfetchedImages);
    };

    private decryptPayload = async (
        iv: Uint8Array,
        encryptedData: ArrayBuffer,
        decryptionKey: string,
    ) => {
        try {
            const decrypted = await decryptData(iv, encryptedData, decryptionKey);

            const decodedData = new TextDecoder("utf-8").decode(
                new Uint8Array(decrypted),
            );
            return JSON.parse(decodedData);
        } catch (error) {
            window.alert(t("alerts.decryptFailed"));
            console.error(error);
            return {
                type: "INVALID_RESPONSE",
            };
        }
    };

    private fallbackInitializationHandler: null | (() => any) = null;

    startCollaboration = async (
        existingRoomLinkData: null | { roomId: string; roomKey: string },
    ): Promise<ImportedDataState | null> => {
        if (this.portal.socket) {
            return null;
        }
        let roomId;
        let roomKey;

        if (existingRoomLinkData) {
            ({ roomId, roomKey } = existingRoomLinkData);
        }
        else return null;

        const scenePromise = resolvablePromise<ImportedDataState | null>();

        this.setIsCollaborating(true);
        // LocalData.pauseSave("collaboration");

        const { default: socketIOClient } = await import(
          /* webpackChunkName: "socketIoClient" */ "socket.io-client"
        );

        const fallbackInitializationHandler = () => {
            this.initializeRoom({
                fetchScene: false,
            }).then((scene) => {
                scenePromise.resolve(scene?.elements!);
            });
        };
        this.fallbackInitializationHandler = fallbackInitializationHandler;

        try {
            const socketServerData = await getCollabServer();
            this.portal.socket = this.portal.open(
                socketIOClient(socketServerData.url, {
                    transports: socketServerData.polling
                        ? ["websocket", "polling"]
                        : ["websocket"],
                }),
                roomId,
                roomKey,
            );
            this.portal.socketInitialized = true;
            this.portal.socket.once("connect_error", fallbackInitializationHandler);
        } catch (error: any) {
            console.error(error);
            this.setState({ errorMessage: error.message });
            return null;
        }


        // fallback in case you're not alone in the room but still don't receive
        // initial SCENE_INIT message
        this.socketInitializationTimer = window.setTimeout(
            fallbackInitializationHandler,
            INITIAL_SCENE_UPDATE_TIMEOUT,
        );

        // All socket listeners are moving to Portal
        this.portal.socket.on(
            "client-broadcast",
            async (encryptedData: ArrayBuffer, iv: Uint8Array) => {
                if (!this.portal.roomKey) {
                    return;
                }
                const decryptedData = await this.decryptPayload(
                    iv,
                    encryptedData,
                    this.portal.roomKey,
                );

                switch (decryptedData.type) {
                    case "INVALID_RESPONSE":
                        return;
                    case WS_SCENE_EVENT_TYPES.INIT: {
                        if (!this.portal.socketInitialized) {
                            this.initializeRoom({ fetchScene: false });
                            const remoteElements = decryptedData.payload.elements;
                            const reconciledElements = this.reconcileElements(remoteElements);
                            this.handleRemoteSceneUpdate(reconciledElements, {
                                init: true,
                            });
                            // noop if already resolved via init from firebase
                            scenePromise.resolve({
                                elements: reconciledElements,
                                scrollToContent: true,
                            });
                        }
                        break;
                    }
                    case WS_SCENE_EVENT_TYPES.UPDATE:
                        if (this.state.slideId === decryptedData.payload.slideId) {
                            this.handleRemoteSceneUpdate(
                                this.reconcileElements(decryptedData.payload.elements),
                            );
                        }
                        break;
                    case "MOUSE_LOCATION": {
                        const { pointer, button, username, selectedElementIds } =
                            decryptedData.payload;
                        const socketId: SocketUpdateDataSource["MOUSE_LOCATION"]["payload"]["socketId"] =
                            decryptedData.payload.socketId ||
                            // @ts-ignore legacy, see #2094 (#2097)
                            decryptedData.payload.socketID;

                        const collaborators = new Map(this.collaborators);
                        const user = collaborators.get(socketId) || {}!;
                        user.pointer = pointer;
                        user.button = button;
                        user.selectedElementIds = selectedElementIds;
                        user.username = username;
                        collaborators.set(socketId, user);
                        this.excalidrawAPI.updateScene({
                            collaborators,
                        });
                        break;
                    }
                    case "IDLE_STATUS": {

                        const { userState, socketId, username } = decryptedData.payload;
                        const collaborators = new Map(this.collaborators);
                        const user = collaborators.get(socketId) || {}!;
                        user.userState = userState;
                        user.username = username;
                        this.excalidrawAPI.updateScene({
                            collaborators,
                        });
                        break;
                    }
                }
            },
        );

        this.portal.socket.on("first-in-room", async () => {
            if (this.portal.socket) {
                this.portal.socket.off("first-in-room");
            }
            const sceneData = await this.initializeRoom({
                fetchScene: false
            });
            scenePromise.resolve(sceneData?.elements!);
        });

        this.initializeIdleDetector();

        this.setState({
            activeRoomLink: window.location.href,
        });

        return scenePromise;
    };

    private initializeRoom = async ({
        fetchScene,
        roomLinkData,
    }:
        | {
            fetchScene: true;
            roomLinkData: { roomId: string; roomKey: string } | null;
        }
        | { fetchScene: false; roomLinkData?: null }) => {
        clearTimeout(this.socketInitializationTimer!);
        if (this.portal.socket && this.fallbackInitializationHandler) {
            this.portal.socket.off(
                "connect_error",
                this.fallbackInitializationHandler,
            );
        }
        if (fetchScene && roomLinkData && this.portal.socket) {
            this.excalidrawAPI.resetScene();

            try {
                const elements = await importFromBackend(
                    roomLinkData.roomId,
                    roomLinkData.roomKey,
                );
                if (elements) {
                    this.setLastBroadcastedOrReceivedSceneVersion(
                        getSceneVersion(elements.elements! || -1),
                    );

                    return {
                        elements,
                        scrollToContent: true,
                    };
                }
            } catch (error: any) {
                // log the error and move on. other peers will sync us the scene.
                console.error(error);
            } finally {
                this.portal.socketInitialized = true;
            }
        } else {
            this.portal.socketInitialized = true;
        }
        return null;
    };

    private reconcileElements = (
        remoteElements: readonly ExcalidrawElement[],
    ): ReconciledElements => {
        const localElements = this.getSceneElementsIncludingDeleted();
        const appState = this.excalidrawAPI.getAppState();

        remoteElements = restoreElements(remoteElements, null);

        const reconciledElements = _reconcileElements(
            localElements,
            remoteElements,
            appState,
        );

        // Avoid broadcasting to the rest of the collaborators the scene
        // we just received!
        // Note: this needs to be set before updating the scene as it
        // synchronously calls render.
        this.setLastBroadcastedOrReceivedSceneVersion(
            getSceneVersion(reconciledElements),
        );

        return reconciledElements;
    };



    private loadImageFiles = throttle(async (forceFetchFiles = false) => {
        const { loadedFiles, erroredFiles } =
            await this.fetchImageFilesFromHttpStorage({
                elements: this.excalidrawAPI.getSceneElementsIncludingDeleted(), forceFetchFiles
            });
        this.excalidrawAPI.addFiles(loadedFiles);

        updateStaleImageStatuses({
            excalidrawAPI: this.excalidrawAPI,
            erroredFiles,
            elements: this.excalidrawAPI.getSceneElementsIncludingDeleted(),
        });
    }, LOAD_IMAGES_TIMEOUT);

    queueBroadcastAllElements = throttle(() => {
        this.portal.broadcastScene(
            WS_SCENE_EVENT_TYPES.UPDATE,
            this.excalidrawAPI.getSceneElementsIncludingDeleted(),
            true,
        );
        const currentVersion = this.getLastBroadcastedOrReceivedSceneVersion();
        const newVersion = Math.max(
            currentVersion,
            getSceneVersion(this.getSceneElementsIncludingDeleted()),
        );
        this.setLastBroadcastedOrReceivedSceneVersion(newVersion);
    }, SYNC_FULL_SCENE_INTERVAL_MS);

    private updateRoomKeyAndId = (roomId: string, roomKey: string) => {
        // if (this.isCollaborating())
        //     this.portal.updateRoomKeyAndId(roomId, roomKey)
    }

    public setLastBroadcastedOrReceivedSceneVersion = (version: number) => {
        this.lastBroadcastedOrReceivedSceneVersion = version;
    };

    public getSceneElementsIncludingDeleted = () => {
        return this.excalidrawAPI.getSceneElementsIncludingDeleted();
    };

    public getLastBroadcastedOrReceivedSceneVersion = () => {
        return this.lastBroadcastedOrReceivedSceneVersion;
    };

    private initializeIdleDetector = () => {
        document.addEventListener(EVENT.POINTER_MOVE, this.onPointerMove);
        document.addEventListener(EVENT.VISIBILITY_CHANGE, this.onVisibilityChange);
    };

    onIdleStateChange = (userState: UserIdleState) => {
        this.portal.broadcastIdleChange(userState);
    };

    private reportIdle = () => {
        this.onIdleStateChange(UserIdleState.IDLE);
        if (this.activeIntervalId) {
            window.clearInterval(this.activeIntervalId);
            this.activeIntervalId = null;
        }
    };

    private onVisibilityChange = () => {
        if (document.hidden) {
            if (this.idleTimeoutId) {
                window.clearTimeout(this.idleTimeoutId);
                this.idleTimeoutId = null;
            }
            if (this.activeIntervalId) {
                window.clearInterval(this.activeIntervalId);
                this.activeIntervalId = null;
            }
            this.onIdleStateChange(UserIdleState.AWAY);
        } else {
            this.idleTimeoutId = window.setTimeout(this.reportIdle, IDLE_THRESHOLD);
            this.activeIntervalId = window.setInterval(
                this.reportActive,
                ACTIVE_THRESHOLD,
            );
            this.onIdleStateChange(UserIdleState.ACTIVE);
        }
    };
    private reportActive = () => {
        this.onIdleStateChange(UserIdleState.ACTIVE);
    };

    private onPointerMove = () => {
        if (this.idleTimeoutId) {
            window.clearTimeout(this.idleTimeoutId);
            this.idleTimeoutId = null;
        }

        this.idleTimeoutId = window.setTimeout(this.reportIdle, IDLE_THRESHOLD);

        if (!this.activeIntervalId) {
            this.activeIntervalId = window.setInterval(
                this.reportActive,
                ACTIVE_THRESHOLD,
            );
        }
    };

    private handleRemoteSceneUpdate = (
        elements: ReconciledElements,
        { init = false }: { init?: boolean } = {},
    ) => {
        this.excalidrawAPI.updateScene({
            elements,
            commitToHistory: !!init,
        });

        // We haven't yet implemented multiplayer undo functionality, so we clear the undo stack
        // when we receive any messages from another peer. This UX can be pretty rough -- if you
        // undo, a user makes a change, and then try to redo, your element(s) will be lost. However,
        // right now we think this is the right tradeoff.
        this.excalidrawAPI.history.clear();
        this.loadImageFiles();
    };

    render() {
        return (<></>)
    }
}

const _Collab: React.FC<PublicProps> = (props) => {
    return <Collab {...props} />;
};

export default _Collab;

export type TCollabClass = Collab;