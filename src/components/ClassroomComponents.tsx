import { useRouter } from "next/router";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { useEffect, useState } from "react";
import { TSWarningToastIcon } from "./icons/TSWarningToastIcon";
import { TConnectionErrorIcon } from "./icons/TConnectionErrorIcon";
import { TRecordErrorIcon} from "../components/icons/TRecordErrorIcon";

export const ScreenshareExistAlert = ({ visible, onHide }: { visible: boolean; onHide: any }) => {
    return (
        <Dialog
            header="Permission Denied"
            style={{ width: "35vw" }}
            breakpoints={{ "960px": "75vw" }}
            visible={visible}
            draggable={false}
            onHide={onHide}
        >
            <div className="flex justify-center text-left gap-x-4  items-center font-medium h-24">
                <div>
                    <TSWarningToastIcon
                        className={`!w-10 pr-1 !h-14 text-[#FCB500]`}
                    />
                </div>
                Screen sharing is currently being done by a user
            </div>
        </Dialog>
    )
}

export const NetworkReconnectingMask = () => {
    const [offlinePopover, setOfflinePopover] = useState<boolean>(false);
    const router = useRouter();

    useEffect(() => {
        window.addEventListener("online", () => {
            setOfflinePopover(false);
        });
        window.addEventListener("offline", () => {
            setOfflinePopover(true);
        });
        return () => {
            window.removeEventListener("online", () => { });
            window.removeEventListener("offline", () => { });
        };
    }, []);
    return (
        <Dialog
            closable={false}
            className="whiteboard-css !bg-transparent "
            contentClassName="!p-0 !bg-white  !rounded-[20px]"
            visible={offlinePopover}
            showHeader={false}
            breakpoints={{ "960px": "75vw" }}
            style={{ width: "400px", height: '150px' }}
            onHide={() => router.back()}
        >
            <div>
                <div className="h-12 bg-slate-50 border-b-2 border-slate-300 border-solid flex items-center justify-center text-lg font-semibold text-slate-500">
                    Reconnecting...
                </div>
                <div className="flex justify-center px-2 gap-4 p-5 ">
                    <div><TConnectionErrorIcon /></div>
                    <div className="text-slate-500 font-thin">No Internet Connection</div>
                </div>

            </div>


        </Dialog>
    )
}

export const UnableToRecordSessionWarning = ({ visible, onHide }: { visible: boolean; onHide: any }) => {
    return <Dialog
        header="Recording Error"
        headerClassName="!px-6 !py-4"
        visible={visible}
        onHide={onHide}
        breakpoints={{ "960px": "75vw" }}
        style={{ width: "480px" }}
        resizable={false}
        draggable={false}
    >
 <div className="flex gap-4 mt-4">
                        <div className="flex items-center justify-center">
                            <TRecordErrorIcon />
                        </div>
                        <div className="text-slate-500">Unable to record the session.<br /> Please try again later.</div>

                    </div>
    </Dialog>
}


export const SessionEndScreen = () => {
    return (
        <div className="bg-[#202548] h-full w-screen text-white flex justify-center items-center">
            <div className="text-4xl ease-in duration-200">Session has ended</div>
        </div>
    )
}


export const InputDeviceAccessAlert = ({ visible, onHide }: { visible: boolean; onHide: any }) => {
    return (
        <>
            <Dialog
                header="Session ended"
                contentClassName="!p-0"
                className="md:w-1/4"
                visible={visible}
                onHide={onHide}
            >
                <div className="flex justify-center items-center p-2 pt-5 font-medium">
                    Make sure you have correct camera permission!
                </div>
                <div className="flex justify-center my-4">
                    <Button
                        className="!h-8"
                        onClick={onHide}
                    >
                        Close
                    </Button>
                </div>
            </Dialog>
        </>
    )
}