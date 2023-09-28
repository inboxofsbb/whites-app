import { STORAGE_KEYS } from "./constants";

const LOCAL_STATE_VERSIONS = {
    [STORAGE_KEYS.VERSION_DATA_STATE]: -1,
    [STORAGE_KEYS.VERSION_FILES]: -1,
  };

type BrowserStateTypes = keyof typeof LOCAL_STATE_VERSIONS;


export const resetBrowserStateVersions = () => {
    for (const key of Object.keys(LOCAL_STATE_VERSIONS) as BrowserStateTypes[]) {
      const timestamp = -1;
      localStorage.setItem(key, JSON.stringify(timestamp));
      LOCAL_STATE_VERSIONS[key] = timestamp;
    }
  };