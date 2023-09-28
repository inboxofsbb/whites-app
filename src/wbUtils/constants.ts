import { FontFamilyValues } from "@excalidraw/excalidraw/types/element/types";

export const ENCRYPTION_KEY_BITS = 128;


export const MIME_TYPES = {
  excalidraw: "application/vnd.excalidraw+json",
  excalidrawlib: "application/vnd.excalidrawlib+json",
  json: "application/json",
  svg: "image/svg+xml",
  "excalidraw.svg": "image/svg+xml",
  png: "image/png",
  "excalidraw.png": "image/png",
  jpg: "image/jpeg",
  gif: "image/gif",
  binary: "application/octet-stream",
} as const;

export const DEFAULT_VERTICAL_ALIGN = "top";

export const VERTICAL_ALIGN = {
  TOP: "top",
  MIDDLE: "middle",
  BOTTOM: "bottom",
};


export const ENV = {
  TEST: "test",
  DEVELOPMENT: "development",
};

export const FONT_FAMILY = {
  Virgil: 1,
  Helvetica: 2,
  Cascadia: 3,
};

export const DEFAULT_FONT_FAMILY: FontFamilyValues = FONT_FAMILY.Virgil;

/** key containt id of precedeing elemnt id we use in reconciliation during
 * collaboration */
export const PRECEDING_ELEMENT_KEY = "__precedingElement__";

export const EXPORT_DATA_TYPES = {
  excalidraw: "excalidraw",
  excalidrawClipboard: "excalidraw/clipboard",
  excalidrawLibrary: "excalidrawlib",
} as const;

export const VERSIONS = {
  excalidraw: 2,
  excalidrawLibrary: 2,
} as const;

export const APP_NAME = "Excalidraw";

export const EXPORT_SOURCE = "";

// Report a user inactive after IDLE_THRESHOLD milliseconds
export const IDLE_THRESHOLD = 60_000;
export const ACTIVE_THRESHOLD = 3_000;
export const LINE_CONFIRM_THRESHOLD = 8; // px

export enum UserIdleState {
  ACTIVE = "active",
  AWAY = "away",
  IDLE = "idle",
}

export enum EVENT {
  COPY = "copy",
  PASTE = "paste",
  CUT = "cut",
  KEYDOWN = "keydown",
  KEYUP = "keyup",
  MOUSE_MOVE = "mousemove",
  RESIZE = "resize",
  UNLOAD = "unload",
  FOCUS = "focus",
  BLUR = "blur",
  DRAG_OVER = "dragover",
  DROP = "drop",
  GESTURE_END = "gestureend",
  BEFORE_UNLOAD = "beforeunload",
  GESTURE_START = "gesturestart",
  GESTURE_CHANGE = "gesturechange",
  POINTER_MOVE = "pointermove",
  POINTER_UP = "pointerup",
  STATE_CHANGE = "statechange",
  WHEEL = "wheel",
  TOUCH_START = "touchstart",
  TOUCH_END = "touchend",
  HASHCHANGE = "hashchange",
  VISIBILITY_CHANGE = "visibilitychange",
  SCROLL = "scroll",
  // custom events
  EXCALIDRAW_LINK = "excalidraw-link",
  MENU_ITEM_SELECT = "menu.itemSelect",
}

export const STORAGE_KEYS = {
  LOCAL_STORAGE_ELEMENTS: "excalidraw",
  LOCAL_STORAGE_APP_STATE: "excalidraw-state",
  LOCAL_STORAGE_COLLAB: "excalidraw-collab",
  LOCAL_STORAGE_LIBRARY: "excalidraw-library",
  LOCAL_STORAGE_THEME: "excalidraw-theme",
  VERSION_DATA_STATE: "version-dataState",
  VERSION_FILES: "version-files",
} as const;
export const DEFAULT_TEXT_ALIGN = "left";
export const BOUND_TEXT_PADDING = 5;
export const WINDOWS_EMOJI_FALLBACK_FONT = "Segoe UI Emoji";

export const ROUNDNESS = {
  // Used for legacy rounding (rectangles), which currently works the same
  // as PROPORTIONAL_RADIUS, but we need to differentiate for UI purposes and
  // forwards-compat.
  LEGACY: 1,

  // Used for linear elements & diamonds
  PROPORTIONAL_RADIUS: 2,

  // Current default algorithm for rectangles, using fixed pixel radius.
  // It's working similarly to a regular border-radius, but attemps to make
  // radius visually similar across differnt element sizes, especially
  // very large and very small elements.
  //
  // NOTE right now we don't allow configuration and use a constant radius
  // (see DEFAULT_ADAPTIVE_RADIUS constant)
  ADAPTIVE_RADIUS: 3,
} as const;