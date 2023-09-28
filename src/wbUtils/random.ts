import { nanoid } from "nanoid";
import { isTestEnv } from "./utils";

const random = Math.floor(Math.random() * 10);

let testIdBase = 0;

export const randomInteger = () => Math.floor( random * 2 ** 31);



export const randomId = () => (isTestEnv() ? `id${testIdBase++}` : nanoid());
