import { atom, createStore } from "jotai";
import { NatsConnection } from "nats.ws";
import { CollabAPI } from "./Collab";

export const appJotaiStore = createStore();
export const jotaiScope = Symbol();
export const collabAPIAtom = atom<CollabAPI | null>(null);
export const natsAtom = atom<NatsConnection | null>(null);
export const isEditModeEnabledAtom = atom<boolean>(false);
export const isZenModeOnAtom = atom<boolean>(true);
