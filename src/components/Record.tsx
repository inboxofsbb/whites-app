import { collabAPIAtom, natsAtom } from "@/wbUtils/app-jotai";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { connect as natsConnect, consumerOpts, StringCodec } from "nats.ws";
import { nanoid } from "nanoid";
import Whiteboard, { BoardConfig } from "./Whiteboard";

interface Props {
    book: any
}
export default function Recorder({ book }: Props) {
    const stringCodec = StringCodec();
    const [collabAPI,] = useAtom(collabAPIAtom);
    const [nats, setNats] = useAtom(natsAtom);
    const [boardConfig, setBoardConfig] = useState<BoardConfig | null>(null);



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
                            setBoardConfig(JSON.parse(boardConf));
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
            collabAPI?.startCollaboration({ roomId: book?.roomId, roomKey: book?.roomKey });
        }
        if (book && !nats) {
            natsInitializer();
        }
    }, [book, collabAPI]);
    if (!nats)
        return (<div>Loading...</div>)

    return (
        <div className="h-full w-full ">
            <Whiteboard
                book={book}
                isEditMode={false}
                onChange={() => { }}
                boardConfig={boardConfig!}
                userName={"record"}
            />
            {boardConfig && <div className="flex justify-center items-center w-[400px] absolute text-sm h-6 bottom-4 gap-1 font-semibold text-slate-500 right-0 left-0 ml-auto mr-auto z-20">
                {boardConfig?.isSync && <div className="bg-green-700 rounded-full h-[10px] w-[10px]"></div>}
                {!boardConfig?.isSync && <div className="bg-red-400 rounded-full h-[10px] w-[10px]"></div>}
                {boardConfig?.syncUser && <div>Sync with  {boardConfig?.syncUser}</div>}

            </div>}
        </div>)
}