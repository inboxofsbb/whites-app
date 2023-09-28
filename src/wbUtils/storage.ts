import { FileId } from "@excalidraw/excalidraw/types/element/types";
import { BinaryFileData, BinaryFileMetadata, DataURL } from "@excalidraw/excalidraw/types/types";
import { MIME_TYPES } from "./constants";
import { decompressData } from "./encode";

export const loadFilesFromHttpStorage = async (
  decryptionKey: string,
  filesIds: readonly FileId[],
) => {
  const loadedFiles: BinaryFileData[] = [];
  const erroredFiles = new Map<FileId, true>();

  //////////////
  await Promise.all(
    Array.from(new Set(filesIds)).map(async (id) => {
      try {
        const HTTP_STORAGE_BACKEND_URL = `${process.env.NEXT_PUBLIC_HTTP_STORAGE_BACKEND_URL}/api/v2`;
        const response = await fetch(`${HTTP_STORAGE_BACKEND_URL}/files/${id}`);
        if (response.status < 400) {
          const arrayBuffer = await response.arrayBuffer();
          const { data, metadata } = await decompressData<BinaryFileMetadata>(
            new Uint8Array(arrayBuffer),
            {
              decryptionKey,
            },
          );

          const dataURL = new TextDecoder().decode(data) as DataURL;

          loadedFiles.push({
            mimeType: metadata.mimeType || MIME_TYPES.binary,
            id,
            dataURL,
            created: metadata?.created || Date.now(),
          });
        } else {
          erroredFiles.set(id, true);
        }
      } catch (error: any) {
        erroredFiles.set(id, true);
        console.error(error);
      }
    }),
  );
  return { loadedFiles, erroredFiles };
};


export const saveFilesToHttpStorage = async ({
  files,
}: {
  files: { id: FileId; buffer: Uint8Array }[];
}) => {
  const erroredFiles = new Map<FileId, true>();
  const savedFiles = new Map<FileId, true>();
  const HTTP_STORAGE_BACKEND_URL = `${process.env.NEXT_PUBLIC_HTTP_STORAGE_BACKEND_URL}/api/v2`;
  await Promise.all(
    files.map(async ({ id, buffer }) => {
      try {
        const payloadBlob = new Blob([buffer]);
        const payload = await new Response(payloadBlob).arrayBuffer();
        await fetch(`${HTTP_STORAGE_BACKEND_URL}/files/${id}`, {
          method: "PUT",
          body: payload,
        });
        savedFiles.set(id, true);
      } catch (error: any) {
        erroredFiles.set(id, true);
      }
    }),
  );

  return { savedFiles, erroredFiles };
};