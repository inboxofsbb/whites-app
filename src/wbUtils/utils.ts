import { ExcalidrawElement, FileId, FontFamilyValues, FontString } from "@excalidraw/excalidraw/types/element/types";
import { AppState, UserIdleState } from "@excalidraw/excalidraw/types/types";
import { ResolvablePromise } from "@excalidraw/excalidraw/types/utils";
import { nanoid } from "nanoid";
import { FONT_FAMILY, WINDOWS_EMOJI_FALLBACK_FONT } from "./constants";


export type SocketUpdateDataSource = {
  SCENE_INIT: {
    type: "SCENE_INIT";
    payload: {
      slideId: number,
      elements: readonly ExcalidrawElement[];
    };
  };
  SCENE_UPDATE: {
    type: "SCENE_UPDATE";
    payload: {
      slideId: number,
      elements: readonly ExcalidrawElement[];
    };
  };
  MOUSE_LOCATION: {
    type: "MOUSE_LOCATION";
    payload: {
      socketId: string;
      pointer: { x: number; y: number };
      button: "down" | "up";
      selectedElementIds: AppState["selectedElementIds"];
      username: string;
    };
  };
  IDLE_STATUS: {
    type: "IDLE_STATUS";
    payload: {
      socketId: string;
      userState: UserIdleState;
      username: string;
    };
  };
};

export type SocketUpdateData =
  SocketUpdateDataSource[keyof SocketUpdateDataSource] & {
    _brand: "socketUpdateData";
  };


export const isTestEnv = () =>
  typeof process !== "undefined" && process.env?.NODE_ENV === "test";


export const bytesToHexString = (bytes: Uint8Array) => {
  return Array.from(bytes)
    .map((byte) => `0${byte.toString(16)}`.slice(-2))
    .join("");
};

export const getUpdatedTimestamp = () => (isTestEnv() ? 1 : Date.now());

export const getSceneVersion = (elements: readonly ExcalidrawElement[]) =>
  elements.reduce((acc, el) => acc + el.version, 0);

/**
* Transforms array of objects containing `id` attribute,
* or array of ids (strings), into a Map, keyd by `id`.
*/
export const arrayToMap = <T extends { id: string } | string>(
  items: readonly T[],
) => {
  return items.reduce((acc: Map<string, T>, element) => {
    acc.set(typeof element === "string" ? element : element.id, element);
    return acc;
  }, new Map());
};

/** returns fontSize+fontFamily string for assignment to DOM elements */
export const getFontString = ({
  fontSize,
  fontFamily,
}: {
  fontSize: number;
  fontFamily: FontFamilyValues;
}) => {
  return `${fontSize}px ${getFontFamilyString({ fontFamily })}` as FontString;
};

export const getFontFamilyString = ({
  fontFamily,
}: {
  fontFamily: FontFamilyValues;
}) => {
  for (const [fontFamilyString, id] of Object.entries(FONT_FAMILY)) {
    if (id === fontFamily) {
      return `${fontFamilyString}, ${WINDOWS_EMOJI_FALLBACK_FONT}`;
    }
  }
  return WINDOWS_EMOJI_FALLBACK_FONT;
};

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export const arrayToMapWithIndex = <T extends { id: string }>(
  elements: readonly T[],
) =>
  elements.reduce((acc, element: T, idx) => {
    acc.set(element.id, [element, idx]);
    return acc;
  }, new Map<string, [element: T, index: number]>());

export const resolvablePromise = <T>() => {
  let resolve!: any;
  let reject!: any;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  (promise as any).resolve = resolve;
  (promise as any).reject = reject;
  return promise as ResolvablePromise<T>;
};

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


export const generateImageElement = ({ version, width, height, fileId, status }: { version: number, width: number, height: number, fileId: FileId, status?: string }): any => {
  return {
    "id": nanoid(),
    "type": "image",
    "x": 100,
    "y": 200,
    "width": width,
    "height": height,
    "angle": 0,
    "strokeColor": "transparent",
    "backgroundColor": "transparent",
    "fillStyle": "hachure",
    "strokeWidth": 1,
    "strokeStyle": "solid",
    "roughness": 1,
    "opacity": 100,
    "groupIds": [],
    "strokeSharpness": "round",
    "seed": Math.random(),
    version,
    "versionNonce": Math.random(),
    "isDeleted": false,
    "boundElements": null,
    "updated": Date.now(),
    "link": null,
    "locked": false,
    "status": status || "saved",
    "fileId": fileId,
    "scale": [
      1,
      1
    ]
  }
}

export const generateTextElement = ({ version, width, height, text, yPosition }: { yPosition: number, version: number, width: number, height: number, text: string }): any => {
  return {
    type: "text",
    isDeleted: false,
    id: nanoid(),
    fillStyle: "hachure",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    angle: 0,
    x: 100,
    y: yPosition,
    strokeColor: "#000000",
    backgroundColor: "transparent",
    roundness: null,
    lineHeight: 1.25,
    width,
    height: 20,
    seed: Math.random(),
    version: version,
    versionNonce: Math.random(),
    groupIds: [],
    strokeSharpness: "sharp",
    boundElements: [],
    updated: Date.now(),
    link: null,
    locked: false,
    fontSize: 20,
    fontFamily: 1,
    text,
    baseline: 17,
    textAlign: "left",
    verticalAlign: "top",
    containerId: null,
    originalText: text,

  }
}

export const triangleElement = ({ version, scrollX, scrollY }: any) => {
  return {
    "type": "line",
    isDeleted: false,
    id: nanoid(),
    fillStyle: "hachure",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    angle: 0,
    x: scrollX,
    y: scrollY,
    strokeColor: "#000000",
    backgroundColor: "transparent",
    "width": 383.5896566639774,
    "height": 277.845647957014,
    seed: Math.random(),
    version: version,
    versionNonce: Math.random(),
    groupIds: [],
    strokeSharpness: "sharp",
    boundElements: [],
    updated: Date.now(),
    link: null,
    locked: false,
    fontSize: 20,
    fontFamily: 1,
    baseline: 17,
    textAlign: "left",
    verticalAlign: "top",
    containerId: null,
    "points": [[0, 0], [192.63312961744214, -277.845647957014], [383.5896566639774, -0.33765948337065765], [0, 0]]
  }
}

