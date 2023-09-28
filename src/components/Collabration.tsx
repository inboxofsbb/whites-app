import Whiteboard, { BoardConfig } from "@/components/Whiteboard";
import apiClient from "@/utils/apiClient";
import { collabAPIAtom, isEditModeEnabledAtom, natsAtom } from "@/wbUtils/app-jotai";
import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { AppState, BinaryFiles } from "@excalidraw/excalidraw/types/types";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { useAtom } from "jotai";
import { connect as natsConnect, consumerOpts, StringCodec } from "nats.ws";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { nanoid } from "nanoid";
import customApiClient from "@/utils/customApiClient";
import { useQuery } from "@tanstack/react-query";


export default function Collabration() {
  const stringCodec = StringCodec();
  const [nats, setNats] = useAtom(natsAtom);
  const [collabAPI,] = useAtom(collabAPIAtom);
  const [boardConfig, setBoardConfig] = useState<BoardConfig | null>(null);
  const [isEditModeEnabled, setIsEditModeEnabled] = useAtom(isEditModeEnabledAtom);
  const [sessionEnded, setSessionEnded] = useState(false);
  const router = useRouter();
  const token = router.query.token;
  const {
    isLoading: configLoading,
    data: configData,
    isFetched: configFetched,
  } = useQuery(
    ["configData"],
    async () => {
      const { data } = await apiClient.get(`/livekit/token-to-metadata`, {
        params: { token },
      });
      return data;
    },
    { enabled: !!token }
  );

  const { isLoading: bookLoading, data: book, isFetched: bookFetched } = useQuery(
    ["getBooksQuery", configData],
    async () => {
      const { room: roomId } = configData.video;
      const { roomKey } = configData.metadata;
      const { data } = await customApiClient.get(
        `/whiteboard/book-auth/${roomId}/${roomKey}`,
        { headers: { Authorization: configData?.metadata?.token } }
      );
      if (data.isSessionEnded) {
        setSessionEnded(true);
      }
      return data;
    },
    { enabled: !!configData }
  );

  const onBoardChangeHandler = async (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles
  ) => {
    collabAPI?.syncElements(elements);
  }

  const natsInitializer = async () => {
    try {
      const nc = await natsConnect({ servers: process.env.NEXT_PUBLIC_NATS_URL });
      setNats(nc);
      const js = nc.jetstream();
      try {
        const cob = consumerOpts();
        cob.deliverTo(nanoid());
        cob.ackExplicit();
        cob.deliverLast();
        const s1 = await js?.subscribe(`wb.${book?.roomId}.*`, cob);
        (async (data) => {
          for await (const m of data!) {
            const boardConf = stringCodec.decode(m.data);
            if (boardConf) {
              const conf = JSON.parse(boardConf);
              if (conf?.isSync || conf?.isSync != boardConfig?.isSync || !boardConfig) {
                setBoardConfig(conf);
              }
            }
            m.ack();
          }
        })(s1);
      }
      catch (err) { console.log(err); }

    }
    catch (err) {
      console.log(err)
    }

  }


  useEffect(() => {
    if (book && collabAPI && !collabAPI.portal.isOpen()) {
      collabAPI?.startCollaboration({ roomId: configData?.video?.room, roomKey: book?.roomKey });
    }
    if (book && !nats) {
      natsInitializer();
    }
  }, [book, collabAPI, boardConfig]);
  useEffect(() => {
    setIsEditModeEnabled(configData?.metadata?.isHost || configData?.metadata?.isPresenter);
  }, [configData])
  useEffect(() => {
    if (sessionEnded) {
        router.push(
            `${configData.metadata.redirectUrl}?roomId=${configData.video
                .room!}&&userName=${configData?.identity!}`
        );
    }
}, [sessionEnded]);

  if (sessionEnded) {
    return (
      <div className="bg-[#202548] h-full w-screen text-white flex justify-center items-center">

        <div className="text-4xl ease-in duration-200">Session has ended</div>
      </div>
    );
  }
  if (configLoading || bookLoading)
    return <div className="flex w-full h-full justify-center items-center">
      <ArrowPathIcon className="w-6 animate-spin" />  </div>
  else if ((!configLoading && !configData) || (bookFetched && !book))
    return <div className="h-full w-full flex justify-center items-center text-2xl font-medium tracking-wider text-red-800">
      Something went wrong!
    </div>
  if (!nats)
    return (<div>Loading...</div>)

  return (
    <div className="h-full w-full ">

      <Whiteboard
        book={book}
        isEditMode={isEditModeEnabled}
        onChange={onBoardChangeHandler}
        boardConfig={boardConfig!}
        userName={configData?.identity}
      />
    </div>
  )
}