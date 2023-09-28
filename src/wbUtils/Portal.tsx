import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { BroadcastedExcalidrawElement } from "@excalidraw/excalidraw/types/excalidraw-app/collab/reconciliation";
import throttle from "lodash.throttle";
import { Socket } from "socket.io-client";
import { FILE_UPLOAD_TIMEOUT, WS_EVENTS, WS_SCENE_EVENT_TYPES } from "./app_constants";
import { TCollabClass } from "./Collab";
import { PRECEDING_ELEMENT_KEY, UserIdleState } from "./constants";
import { isSyncableElement } from "./data";
import { encryptData } from "./encryption";
import { newElementWith } from "./mutateElement";
import { SocketUpdateData, SocketUpdateDataSource } from "./utils";

class Portal {
  collab: TCollabClass;
  roomId: string | null = null;
  roomKey: string | null = null;
  socket: Socket | null = null;
  socketInitialized: boolean = false;
  broadcastedElementVersions: Map<string, number> = new Map();

  constructor(collab: TCollabClass) {
    this.collab = collab;
  }


  close() {
    if (!this.socket) {
      return;
    }
    this.queueFileUpload.flush();
    this.socket.close();
    this.socket = null;
    this.roomId = null;
    this.roomKey = null;
    this.socketInitialized = false;
    this.broadcastedElementVersions = new Map();
  }

  isOpen() {
    return !!(
      this.socketInitialized &&
      this.socket &&
      this.roomId &&
      this.roomKey
    );
  }

  open(socket: Socket, id: string, key: string) {
    this.socket = socket;
    this.roomId = id;
    this.roomKey = key;

    // Initialize socket listeners
    this.socket.on("init-room", () => {
      if (this.socket) {
        this.socket.emit("join-room", this.roomId);
      }
    });
    this.socket.on("new-user", async (_socketId: string) => {
      this.broadcastScene(
        WS_SCENE_EVENT_TYPES.INIT,
        this.collab.getSceneElementsIncludingDeleted(),
          /* syncAll */ true,
      );
    });
    this.socket.on("room-user-change", (clients: string[]) => {
      this.collab.setCollaborators(clients);
    });

    return socket;
  }

  broadcastScene = async (
    updateType: WS_SCENE_EVENT_TYPES.INIT | WS_SCENE_EVENT_TYPES.UPDATE,
    allElements: readonly ExcalidrawElement[],
    syncAll: boolean,
  ) => {
    if (updateType === WS_SCENE_EVENT_TYPES.INIT && !syncAll) {
      throw new Error("syncAll must be true when sending SCENE.INIT");
    }

    // sync out only the elements we think we need to to save bandwidth.
    // periodically we'll resync the whole thing to make sure no one diverges
    // due to a dropped message (server goes down etc).
    const syncableElements = allElements.reduce(
      (acc, element: BroadcastedExcalidrawElement, idx, elements) => {
        if (
          (syncAll ||
            !this.broadcastedElementVersions.has(element.id) ||
            element.version >
            this.broadcastedElementVersions.get(element.id)!) &&
          isSyncableElement(element)
        ) {
          acc.push({
            ...element,
            // z-index info for the reconciler
            [PRECEDING_ELEMENT_KEY]: idx === 0 ? "^" : elements[idx - 1]?.id,
          });
        }
        return acc;
      },
      [] as BroadcastedExcalidrawElement[],
    );

    const data: SocketUpdateDataSource[typeof updateType] = {
      type: updateType,
      payload: {
        slideId:this.collab.state.slideId,
        elements: syncableElements,
      },
    };

    for (const syncableElement of syncableElements) {
      this.broadcastedElementVersions.set(
        syncableElement.id,
        syncableElement.version,
      );
    }


    await this._broadcastSocketData(data as SocketUpdateData);
  };

  async _broadcastSocketData(
    data: SocketUpdateData,
    volatile: boolean = false,
  ) {

    if (this.isOpen()) {
      const json = JSON.stringify(data);
      const encoded = new TextEncoder().encode(json);
      const { encryptedBuffer, iv } = await encryptData(this.roomKey!, encoded);
      this.socket?.emit(
        volatile ? WS_EVENTS.SERVER_VOLATILE : WS_EVENTS.SERVER,
        this.roomId,
        encryptedBuffer,
        iv,
      );
    }
  }



  queueFileUpload = throttle(async () => {
    try {
      await this.collab.fileManager.saveFiles({
        elements: this.collab.excalidrawAPI.getSceneElementsIncludingDeleted(),
        files: this.collab.excalidrawAPI.getFiles(),
      });
    } catch (error: any) {
      if (error.name !== "AbortError") {
        this.collab.excalidrawAPI.updateScene({
          appState: {
            errorMessage: error.message,
          },
        });
      }
    }
    this.collab.excalidrawAPI.updateScene({
      elements: this.collab.excalidrawAPI
        .getSceneElementsIncludingDeleted()
        .map((element: ExcalidrawElement) => {
          if (this.collab.fileManager.shouldUpdateImageElementStatus(element)) {
            // this will signal collaborators to pull image data from server
            // (using mutation instead of newElementWith otherwise it'd break
            // in-progress dragging)
            return newElementWith(element, {
              status: "saved",
            } as any);
          }
          return element;
        }),
    });
  }, FILE_UPLOAD_TIMEOUT);
  updateRoomKeyAndId = (roomId: string, roomKey: string) => {
    this.roomId = roomId;
    this.roomKey = roomKey;
  }



  broadcastIdleChange = (userState: UserIdleState) => {
    if (this.socket?.id) {
      const data: SocketUpdateDataSource["IDLE_STATUS"] = {
        type: "IDLE_STATUS",
        payload: {
          socketId: this.socket.id,
          userState,
          username: this.collab.state.username,
        },
      };
      return this._broadcastSocketData(
        data as SocketUpdateData,
        true, // volatile
      );
    }
  };

}
export default Portal;
