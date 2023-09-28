import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { LinearElementEditor } from "./linearElementEditor";

type ElementIdKey = InstanceType<typeof LinearElementEditor>["elementId"];
type SceneStateCallback = () => void;

type ElementKey = ExcalidrawElement | ElementIdKey;
const isIdKey = (elementKey: ElementKey): elementKey is ElementIdKey => {
    if (typeof elementKey === "string") {
        return true;
    }
    return false;
};


class Scene {
    private callbacks: Set<SceneStateCallback> = new Set();
    private elements: readonly ExcalidrawElement[] = [];
    private static sceneMapByElement = new WeakMap<ExcalidrawElement, Scene>();
    private static sceneMapById = new Map<string, Scene>();


  getElementsIncludingDeleted() {
    return this.elements;
  }

    static getScene(elementKey: ElementKey): Scene | null {
        if (isIdKey(elementKey)) {
            return this.sceneMapById.get(elementKey) || null;
        }
        return this.sceneMapByElement.get(elementKey) || null;
    }
    informMutation() {
        for (const callback of Array.from(this.callbacks)) {
          callback();
        }
      }


}
export default Scene;
