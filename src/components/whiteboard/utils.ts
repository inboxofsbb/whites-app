import oc from "open-color";

import colors from "./colors";
import {
  CURSOR_TYPE,
  DEFAULT_VERSION,
  EVENT,
  FONT_FAMILY,
  MIME_TYPES,
  THEME,
  WINDOWS_EMOJI_FALLBACK_FONT,
} from "./constants";
import {
  FontFamilyValues,
  FontString,
} from "@excalidraw/excalidraw/types/element/types";
import {
  AppState,
  DataURL,
  LastActiveToolBeforeEraser,
  Zoom,
} from "@excalidraw/excalidraw/types/types";
import { unstable_batchedUpdates } from "react-dom";
// import { isDarwin } from "./keys";
import { SHAPES } from "./shapes";
import { nanoid } from "nanoid";
import { FileId } from "./data/typeChecks";

let isDarwin = false

let mockDateTime: string | null = null;

export const setDateTimeForTests = (dateTime: string) => {
  mockDateTime = dateTime;
};

export const getDateTime = () => {
  if (mockDateTime) {
    return mockDateTime;
  }

  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hr = `${date.getHours()}`.padStart(2, "0");
  const min = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day}-${hr}${min}`;
};

export const capitalizeString = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

export const isToolIcon = (
  target: Element | EventTarget | null
): target is HTMLElement =>
  target instanceof HTMLElement && target.className.includes("ToolIcon");

export const isInputLike = (
  target: Element | EventTarget | null
): target is
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement
  | HTMLBRElement
  | HTMLDivElement =>
  (target instanceof HTMLElement && target.dataset.type === "wysiwyg") ||
  target instanceof HTMLBRElement || // newline in wysiwyg
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement;

export const isWritableElement = (
  target: Element | EventTarget | null
): target is
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLBRElement
  | HTMLDivElement =>
  (target instanceof HTMLElement && target.dataset.type === "wysiwyg") ||
  target instanceof HTMLBRElement || // newline in wysiwyg
  target instanceof HTMLTextAreaElement ||
  (target instanceof HTMLInputElement &&
    (target.type === "text" || target.type === "number"));

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

export const debounce = <T extends any[]>(
  fn: (...args: T) => void,
  timeout: number
) => {
  let handle = 0;
  let lastArgs: T | null = null;
  const ret = (...args: T) => {
    lastArgs = args;
    clearTimeout(handle);
    handle = window.setTimeout(() => {
      lastArgs = null;
      fn(...args);
    }, timeout);
  };
  ret.flush = () => {
    clearTimeout(handle);
    if (lastArgs) {
      const _lastArgs = lastArgs;
      lastArgs = null;
      fn(..._lastArgs);
    }
  };
  ret.cancel = () => {
    lastArgs = null;
    clearTimeout(handle);
  };
  return ret;
};

// throttle callback to execute once per animation frame
export const throttleRAF = <T extends any[]>(
  fn: (...args: T) => void,
  opts?: { trailing?: boolean }
) => {
  let timerId: number | null = null;
  let lastArgs: T | null = null;
  let lastArgsTrailing: T | null = null;

  const scheduleFunc = (args: T) => {
    timerId = window.requestAnimationFrame(() => {
      timerId = null;
      fn(...args);
      lastArgs = null;
      if (lastArgsTrailing) {
        lastArgs = lastArgsTrailing;
        lastArgsTrailing = null;
        scheduleFunc(lastArgs);
      }
    });
  };

  const ret = (...args: T) => {
    if (process.env.NODE_ENV === "test") {
      fn(...args);
      return;
    }
    lastArgs = args;
    if (timerId === null) {
      scheduleFunc(lastArgs);
    } else if (opts?.trailing) {
      lastArgsTrailing = args;
    }
  };
  ret.flush = () => {
    if (timerId !== null) {
      cancelAnimationFrame(timerId);
      timerId = null;
    }
    if (lastArgs) {
      fn(...(lastArgsTrailing || lastArgs));
      lastArgs = lastArgsTrailing = null;
    }
  };
  ret.cancel = () => {
    lastArgs = lastArgsTrailing = null;
    if (timerId !== null) {
      cancelAnimationFrame(timerId);
      timerId = null;
    }
  };
  return ret;
};

// https://github.com/lodash/lodash/blob/es/chunk.js
export const chunk = <T extends any>(
  array: readonly T[],
  size: number
): T[][] => {
  if (!array.length || size < 1) {
    return [];
  }
  let index = 0;
  let resIndex = 0;
  const result = Array(Math.ceil(array.length / size));
  while (index < array.length) {
    result[resIndex++] = array.slice(index, (index += size));
  }
  return result;
};

export const selectNode = (node: Element) => {
  const selection = window.getSelection();
  if (selection) {
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
  }
};

export const removeSelection = () => {
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }
};

export const distance = (x: number, y: number) => Math.abs(x - y);

export const updateActiveTool = (
  appState: Pick<AppState, "activeTool">,
  data: (
    | { type: typeof SHAPES[number]["value"] | "eraser" }
    | { type: "custom"; customType: string }
  ) & { lastActiveToolBeforeEraser?: LastActiveToolBeforeEraser }
): AppState["activeTool"] => {
  if (data.type === "custom") {
    return {
      ...appState.activeTool,
      type: "custom",
      customType: data.customType,
    };
  }

  return {
    ...appState.activeTool,
    lastActiveToolBeforeEraser:
      data.lastActiveToolBeforeEraser === undefined
        ? appState.activeTool.lastActiveToolBeforeEraser
        : data.lastActiveToolBeforeEraser,
    type: data.type,
    customType: null,
  };
};

export const resetCursor = (canvas: HTMLCanvasElement | null) => {
  if (canvas) {
    canvas.style.cursor = "";
  }
};

export const setCursor = (canvas: HTMLCanvasElement | null, cursor: string) => {
  if (canvas) {
    canvas.style.cursor = cursor;
  }
};

let eraserCanvasCache: any;
let previewDataURL: string;
export const setEraserCursor = (
  canvas: HTMLCanvasElement | null,
  theme: AppState["theme"]
) => {
  const cursorImageSizePx = 20;

  const drawCanvas = () => {
    const isDarkTheme = theme === THEME.DARK;
    eraserCanvasCache = document.createElement("canvas");
    eraserCanvasCache.theme = theme;
    eraserCanvasCache.height = cursorImageSizePx;
    eraserCanvasCache.width = cursorImageSizePx;
    const context = eraserCanvasCache.getContext("2d")!;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(
      eraserCanvasCache.width / 2,
      eraserCanvasCache.height / 2,
      5,
      0,
      2 * Math.PI
    );
    context.fillStyle = isDarkTheme ? oc.black : oc.white;
    context.fill();
    context.strokeStyle = isDarkTheme ? oc.white : oc.black;
    context.stroke();
    previewDataURL = eraserCanvasCache.toDataURL(MIME_TYPES.svg) as DataURL;
  };
  if (!eraserCanvasCache || eraserCanvasCache.theme !== theme) {
    drawCanvas();
  }

  setCursor(
    canvas,
    `url(${previewDataURL}) ${cursorImageSizePx / 2} ${cursorImageSizePx / 2
    }, auto`
  );
};

export const setCursorForShape = (
  canvas: HTMLCanvasElement | null,
  appState: AppState
) => {
  if (!canvas) {
    return;
  }
  if (appState.activeTool.type === "selection") {
    resetCursor(canvas);
  } else if (appState.activeTool.type === "eraser") {
    setEraserCursor(canvas, appState.theme);
    // do nothing if image tool is selected which suggests there's
    // a image-preview set as the cursor
    // Ignore custom type as well and let host decide
  } else if (!["image", "custom"].includes(appState.activeTool.type)) {
    canvas.style.cursor = CURSOR_TYPE.CROSSHAIR;
  }
};

export const isFullScreen = () =>
  document.fullscreenElement?.nodeName === "HTML";

export const allowFullScreen = () =>
  document.documentElement.requestFullscreen();

export const exitFullScreen = () => document.exitFullscreen();

export const getShortcutKey = (shortcut: string): string => {
  shortcut = shortcut
    .replace(/\bAlt\b/i, "Alt")
    .replace(/\bShift\b/i, "Shift")
    .replace(/\b(Enter|Return)\b/i, "Enter")
    .replace(/\bDel\b/i, "Delete");

  if (isDarwin) {
    return shortcut
      .replace(/\bCtrlOrCmd\b/i, "Cmd")
      .replace(/\bAlt\b/i, "Option");
  }
  return shortcut.replace(/\bCtrlOrCmd\b/i, "Ctrl");
};

export const viewportCoordsToSceneCoords = (
  { clientX, clientY }: { clientX: number; clientY: number },
  {
    zoom,
    offsetLeft,
    offsetTop,
    scrollX,
    scrollY,
  }: {
    zoom: Zoom;
    offsetLeft: number;
    offsetTop: number;
    scrollX: number;
    scrollY: number;
  }
) => {
  const invScale = 1 / zoom.value;
  const x = (clientX - offsetLeft) * invScale - scrollX;
  const y = (clientY - offsetTop) * invScale - scrollY;

  return { x, y };
};

export const sceneCoordsToViewportCoords = (
  { sceneX, sceneY }: { sceneX: number; sceneY: number },
  {
    zoom,
    offsetLeft,
    offsetTop,
    scrollX,
    scrollY,
  }: {
    zoom: Zoom;
    offsetLeft: number;
    offsetTop: number;
    scrollX: number;
    scrollY: number;
  }
) => {
  const x = (sceneX + scrollX) * zoom.value + offsetLeft;
  const y = (sceneY + scrollY) * zoom.value + offsetTop;
  return { x, y };
};

export const getGlobalCSSVariable = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(`--${name}`);

const RS_LTR_CHARS =
  "A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF" +
  "\u2C00-\uFB1C\uFDFE-\uFE6F\uFEFD-\uFFFF";
const RS_RTL_CHARS = "\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC";
const RE_RTL_CHECK = new RegExp(`^[^${RS_LTR_CHARS}]*[${RS_RTL_CHARS}]`);
/**
 * Checks whether first directional character is RTL. Meaning whether it starts
 *  with RTL characters, or indeterminate (numbers etc.) characters followed by
 *  RTL.
 * See https://github.com/excalidraw/excalidraw/pull/1722#discussion_r436340171
 */
export const isRTL = (text: string) => RE_RTL_CHECK.test(text);

export const tupleToCoors = (
  xyTuple: readonly [number, number]
): { x: number; y: number } => {
  const [x, y] = xyTuple;
  return { x, y };
};

/** use as a rejectionHandler to mute filesystem Abort errors */
export const muteFSAbortError = (error?: Error) => {
  if (error?.name === "AbortError") {
    console.warn(error);
    return;
  }
  throw error;
};

export const findIndex = <T>(
  array: readonly T[],
  cb: (element: T, index: number, array: readonly T[]) => boolean,
  fromIndex: number = 0
) => {
  if (fromIndex < 0) {
    fromIndex = array.length + fromIndex;
  }
  fromIndex = Math.min(array.length, Math.max(fromIndex, 0));
  let index = fromIndex - 1;
  while (++index < array.length) {
    if (cb(array[index], index, array)) {
      return index;
    }
  }
  return -1;
};

export const findLastIndex = <T>(
  array: readonly T[],
  cb: (element: T, index: number, array: readonly T[]) => boolean,
  fromIndex: number = array.length - 1
) => {
  if (fromIndex < 0) {
    fromIndex = array.length + fromIndex;
  }
  fromIndex = Math.min(array.length - 1, Math.max(fromIndex, 0));
  let index = fromIndex + 1;
  while (--index > -1) {
    if (cb(array[index], index, array)) {
      return index;
    }
  }
  return -1;
};

export const isTransparent = (color: string) => {
  const isRGBTransparent = color.length === 5 && color.substr(4, 1) === "0";
  const isRRGGBBTransparent = color.length === 9 && color.substr(7, 2) === "00";
  return (
    isRGBTransparent ||
    isRRGGBBTransparent ||
    color === colors.elementBackground[0]
  );
};

export type ResolvablePromise<T> = Promise<T> & {
  resolve: [T] extends [undefined] ? (value?: T) => void : (value: T) => void;
  reject: (error: Error) => void;
};
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

/**
 * @param func handler taking at most single parameter (event).
 */
export const withBatchedUpdates = <
  TFunction extends ((event: any) => void) | (() => void)
>(
  func: Parameters<TFunction>["length"] extends 0 | 1 ? TFunction : never
) =>
  ((event) => {
    unstable_batchedUpdates(func as TFunction, event);
  }) as TFunction;

/**
 * barches React state updates and throttles the calls to a single call per
 * animation frame
 */
export const withBatchedUpdatesThrottled = <
  TFunction extends ((event: any) => void) | (() => void)
>(
  func: Parameters<TFunction>["length"] extends 0 | 1 ? TFunction : never
) => {
  // @ts-ignore
  return throttleRAF<Parameters<TFunction>>(((event) => {
    unstable_batchedUpdates(func, event);
  }) as TFunction);
};

//https://stackoverflow.com/a/9462382/8418
export const nFormatter = (num: number, digits: number): string => {
  const si = [
    { value: 1, symbol: "b" },
    { value: 1e3, symbol: "k" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "G" },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  let index;
  for (index = si.length - 1; index > 0; index--) {
    if (num >= si[index].value) {
      break;
    }
  }
  return (
    (num / si[index].value).toFixed(digits).replace(rx, "$1") + si[index].symbol
  );
};

export const getVersion = () => {
  return (
    document.querySelector<HTMLMetaElement>('meta[name="version"]')?.content ||
    DEFAULT_VERSION
  );
};

// Adapted from https://github.com/Modernizr/Modernizr/blob/master/feature-detects/emoji.js
export const supportsEmoji = () => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return false;
  }
  const offset = 12;
  ctx.fillStyle = "#f00";
  ctx.textBaseline = "top";
  ctx.font = "32px Arial";
  // Modernizr used 🐨, but it is sort of supported on Windows 7.
  // Luckily 😀 isn't supported.
  ctx.fillText("😀", 0, 0);
  return ctx.getImageData(offset, offset, 1, 1).data[0] !== 0;
};

export const getNearestScrollableContainer = (
  element: HTMLElement
): HTMLElement | Document => {
  let parent = element.parentElement;
  while (parent) {
    if (parent === document.body) {
      return document;
    }
    const { overflowY } = window.getComputedStyle(parent);
    const hasScrollableContent = parent.scrollHeight > parent.clientHeight;
    if (
      hasScrollableContent &&
      (overflowY === "auto" ||
        overflowY === "scroll" ||
        overflowY === "overlay")
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return document;
};

export const focusNearestParent = (element: HTMLInputElement) => {
  let parent = element.parentElement;
  while (parent) {
    if (parent.tabIndex > -1) {
      parent.focus();
      return;
    }
    parent = parent.parentElement;
  }
};

export const preventUnload = (event: BeforeUnloadEvent) => {
  event.preventDefault();
  // NOTE: modern browsers no longer allow showing a custom message here
  event.returnValue = "";
};

export const bytesToHexString = (bytes: Uint8Array) => {
  return Array.from(bytes)
    .map((byte) => `0${byte.toString(16)}`.slice(-2))
    .join("");
};

export const getUpdatedTimestamp = () => (isTestEnv() ? 1 : Date.now());

/**
 * Transforms array of objects containing `id` attribute,
 * or array of ids (strings), into a Map, keyd by `id`.
 */
export const arrayToMap = <T extends { id: string } | string>(
  items: readonly T[]
) => {
  return items.reduce((acc: Map<string, T>, element) => {
    acc.set(typeof element === "string" ? element : element.id, element);
    return acc;
  }, new Map());
};

export const isTestEnv = () =>
  typeof process !== "undefined" && process.env?.NODE_ENV === "test";

export const isProdEnv = () =>
  typeof process !== "undefined" && process.env?.NODE_ENV === "production";

export const wrapEvent = <T extends Event>(name: EVENT, nativeEvent: T) => {
  return new CustomEvent(name, {
    detail: {
      nativeEvent,
    },
    cancelable: true,
  });
};

export const updateObject = <T extends Record<string, any>>(
  obj: T,
  updates: Partial<T>
): T => {
  let didChange = false;
  for (const key in updates) {
    const value = (updates as any)[key];
    if (typeof value !== "undefined") {
      if (
        (obj as any)[key] === value &&
        // if object, always update because its attrs could have changed
        (typeof value !== "object" || value === null)
      ) {
        continue;
      }
      didChange = true;
    }
  }

  if (!didChange) {
    return obj;
  }

  return {
    ...obj,
    ...updates,
  };
};

export const isPrimitive = (val: any) => {
  const type = typeof val;
  return val == null || (type !== "object" && type !== "function");
};

export const getFrame = () => {
  try {
    return window.self === window.top ? "top" : "iframe";
  } catch (error) {
    return "iframe";
  }
};

export const isPromiseLike = (
  value: any
): value is Promise<ResolutionType<typeof value>> => {
  return (
    !!value &&
    typeof value === "object" &&
    "then" in value &&
    "catch" in value &&
    "finally" in value
  );
};

export const queryFocusableElements = (container: HTMLElement | null) => {
  const focusableElements = container?.querySelectorAll<HTMLElement>(
    "button, a, input, select, textarea, div[tabindex], label[tabindex]"
  );

  return focusableElements
    ? Array.from(focusableElements).filter(
      (element) =>
        element.tabIndex > -1 && !(element as HTMLInputElement).disabled
    )
    : [];
};

export const generateImageElement = ({ version, width, height, fileId, status }: { version: number, width: number, height: number, fileId: FileId, status?: string }): any => {
  return {
    "id": nanoid(),
    "type": "image",
    "x": 180,
    "y": 100,
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
    width,
    height,
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
    originalText: text
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

export const blankPageBase64 = "data:image/png;base64,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"