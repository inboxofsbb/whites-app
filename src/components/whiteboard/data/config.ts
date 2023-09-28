import {
  isSavedToHttpStorage,
  loadFilesFromHttpStorage,
  loadFromHttpStorage,
  saveFilesToHttpStorage,
  saveScenesToStore,
  saveToHttpStorage,
} from "./httpStorage";

import { StorageBackend } from "./StorageBackend";

const httpStorage: StorageBackend = {
  isSaved: isSavedToHttpStorage,
  saveToStorageBackend: saveToHttpStorage,
  loadFromStorageBackend: loadFromHttpStorage,
  saveFilesToStorageBackend: saveFilesToHttpStorage,
  loadFilesFromStorageBackend: loadFilesFromHttpStorage,
  saveScenesToStore:saveScenesToStore
};

export let storageBackend: StorageBackend = httpStorage;
