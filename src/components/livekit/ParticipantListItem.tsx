import { useParticipant } from "@livekit/react-components";
import {
  LocalParticipant,
  Participant,
  ParticipantEvent,
  RemoteParticipant,
  Room,
  RoomEvent,
  TrackPublication,
} from "livekit-client";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Toast } from "primereact/toast";
import { useSession } from "next-auth/react";
import { confirmDialog } from "primereact/confirmdialog";
import { TSMicIcon } from "../icons/TSMicIcon";
import { TSMicMuteIcon } from "../icons/TSMicMuteIcon";
import { TSCameraIcon } from "../icons/TSCameraIcon";
import { TSCameraSlashIcon } from "../icons/TSCameraSlashIcon";
import { TSPresenterIcon } from "../icons/TSPresenterIcon";
import { TSPresenterSlashIcon } from "../icons/TSPresenterSlashIcon";
import { TSWarningToastIcon } from "../icons/TSWarningToastIcon";
import { useAtom } from "jotai";
import { StringCodec } from "nats.ws";
import { TSKickOutIcon } from "../icons/TSKickOutIcon";
import { natsAtom } from "@/wbUtils/app-jotai";
import apiClient from "@/utils/apiClient";
import { TParticipantSyncActiveIcon } from "../icons/TParticipantSyncActiveIcon";
import { TParticipantSyncSlashIcon } from "../icons/TParticipantSyncSlashIcon";
import { TParticipantSyncInActiveIcon } from "../icons/TParticipantSyncInActiveIcon";

interface Props {
  participant: Participant;
  room: Room;
  isLocalHost: any;
  boardConfig: any;
}

export default function ParticipantListItem({
  participant,
  room,
  isLocalHost,
  boardConfig,
}: Props) {
  const toast = useRef() as React.MutableRefObject<Toast>;
  const { data: userSession, status } = useSession();
  const [isHost, setIsHost] = useState(false);
  const [nats] = useAtom(natsAtom);
  const stringCodec = StringCodec();

  const {
    cameraPublication,
    isLocal,
    connectionQuality,
    isSpeaking,
    metadata,
  } = useParticipant(participant);
  const [isPresenter, setIsPresenter] = useState<boolean>(false);
  const [isHandRaised, setIsHandRaised] = useState<any>(false);
  const reject = () => { };

  useEffect(() => {
    const meta = participant.metadata;
    if (meta) {
      const data = JSON.parse(meta);
      const ishost = data.isHost === true || data.isHost === "true";
      setIsHost(ishost);
    }
  }, []);

  const displayName = isLocal
    ? `Me${isHost ? " (Host)" : ""}`
    : `${(participant.name || participant.identity).length > 10
      ? (participant.name || participant.identity).slice(0, 10) + "..."
      : participant.name || participant.identity
    }${isHost ? " (Host)" : ""}${isPresenter ? " (Presenter)" : ""}`;

  const updateMetadataMutation = useMutation(
    async (body: any) => {
      const { data } = await apiClient.put(
        `/livekit/update-participant-metadata/${room?.name}/${participant?.identity}`,
        { ...body }
      );
      return data;
    },
    {
      onSuccess: () => { },
      onError: () => { },
    }
  );
  const removeMetadataMutation = useMutation(async (body: any) => {
    const { data } = await apiClient.put(
      `/livekit/remove-participant-metadata/${room?.name}/${participant?.identity}`,
      { ...body }
    );
    return data;
  });
  const acceptParticipantRemoval = () => {
    removeMetadataMutation.mutate("");
  };
  const removeConfirm = () => {
    confirmDialog({
      message: `Do you want to remove participant? `,
      header: "Confirmation",
      className: "confirminvalidate",
      rejectClassName:
        "!bg-white hover:!bg-white  !text-[#363D69] !border-[#363D69] hover:!border-[#363D69]",
      acceptClassName:
        "!bg-[#363D69] hover:!bg-[#363D69]/90  active:!bg-[#363D69]/90 !border-[#363D69] hover:!border-[#363D69]",
      icon: <TSWarningToastIcon className={`w-7 h-9  text-[#EA4335]`} />,
      accept: () => {
        acceptParticipantRemoval();
      },
      reject,
    });
  };
  const mutePublisedTrackMutation = useMutation(
    async (trackSid: string) => {
      const { data } = await apiClient.post(
        `/livekit/mute-published-track/${room?.name}/${participant?.identity}/${trackSid}`,
        {}
      );
      return data;
    },
    {
      onSuccess: () => { },
      onError: () => { },
    }
  );

  const muteMicroPhoneHandler = () => {
    const track = participant
      ?.getTracks()
      ?.find(
        (track: TrackPublication) =>
          track?.kind === "audio" &&
          track?.isMuted === false &&
          track?.isEnabled === true
      );
    mutePublisedTrackMutation.mutate(track?.trackSid!, {
      onSuccess: () => {
        // toast.current.show({
        //     severity: "success",
        //     summary: "Successful",
        //     detail: "Micro phone turned off",
        //     life: 3000,
        // });
      },
    });
  };

  const muteCameraHandler = () => {
    const track = participant
      ?.getTracks()
      ?.find(
        (track: TrackPublication) =>
          track?.kind === "video" &&
          track?.isMuted === false &&
          track?.isEnabled === true
      );
    mutePublisedTrackMutation.mutate(track?.trackSid!, {
      onSuccess: () => { },
    });
  };
  useEffect(() => {
    if (metadata) {
      const _metadata = JSON.parse(metadata);
      if (
        _metadata?.isPresenter === "true" ||
        _metadata?.isPresenter === "false"
      )
        setIsPresenter(_metadata?.isPresenter === "true");
    }
  }, [metadata]);
  useEffect(() => {
    if (metadata) {
      const _metadata = JSON.parse(metadata);
      if (
        _metadata?.isHandRaised === "true" ||
        _metadata?.isHandRaised === "false"
      )
        setIsHandRaised(_metadata?.isHandRaised === "true");
    }
  }, [metadata]);

  const changeSyncUser = () => {
    if (
      boardConfig &&
      (isLocalHost || room?.localParticipant.identity === boardConfig?.syncUser)
    ) {
      const js = nats?.jetstream();
      js?.publish(
        `wb.${room?.name}.changeSyncUser`,
        stringCodec.encode(
          JSON.stringify({ ...boardConfig, syncUser: participant?.identity })
        )
      );
    }
  };

  return (
    <>
      <Toast ref={toast} />

      <div className="py-2 grid grid-cols-5 max-w-[1400px] border-neutral-500 items-center select-none overflow-hidden">
        <div className="font-normal text-[#64748B] col-span-2 text-sm flex gap-2 items-center">
          {participant.identity === boardConfig?.syncUser && (
            <>{boardConfig?.isSync ? <span><TParticipantSyncActiveIcon /></span> : <span><TParticipantSyncSlashIcon /></span>

            }

            </>
          )}
          {participant.identity !== boardConfig?.syncUser && (
            <span
              className={` ${isLocalHost ||
                room?.localParticipant.identity === boardConfig?.syncUser
                ? "cursor-pointer"
                : ""
                }`}
              onClick={changeSyncUser}

            >   <TParticipantSyncInActiveIcon /></span>

          )}

          {displayName}
        </div>
        {isLocal ? (
          <div className="flex gap-2 col-span-3 w-fit justify-start">
            <div className="flex justify-center">
              {room?.localParticipant?.isMicrophoneEnabled ? (
                <>
                  <div
                    id={`turn-off-mic-local`}
                    className="cursor-pointer"
                    onClick={() =>
                      room?.localParticipant?.setMicrophoneEnabled(false)
                    }
                  >
                    <TSMicIcon className={`text-[#363D69] w-7 h-7`} />
                  </div>
                </>
              ) : (
                <>
                  <div
                    id={`turn-on-mic-local`}
                    className="cursor-pointer"
                    onClick={() =>
                      room?.localParticipant?.setMicrophoneEnabled(true)
                    }
                  >
                    <TSMicMuteIcon className={`text-[#EA4335] w-7 h-7`} />
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-center">
              {room?.localParticipant?.isCameraEnabled ? (
                <>
                  <div
                    id={`turn-off-camera-local`}
                    className="cursor-pointer"
                    onClick={() =>
                      room?.localParticipant?.setCameraEnabled(false)
                    }
                  >
                    <TSCameraIcon className={`text-[#363D69] w-7 h-7`} />
                  </div>
                </>
              ) : (
                <>
                  <div
                    id={`turn-on-camera-local`}
                    className="cursor-pointer"
                    onClick={() =>
                      room?.localParticipant?.setCameraEnabled(true)
                    }
                  >
                    <TSCameraSlashIcon className={`text-[#EA4335] w-7 h-7`} />
                  </div>
                </>
              )}
            </div>
          </div>
        ) : !isLocalHost ? (
          !isLocal && (
            <div className="flex gap-2 justify-start col-span-3 w-fit">
              {participant?.isMicrophoneEnabled ? (
                <>
                  <div id={`turn-off-mic-${participant?.sid}`}>
                    <TSMicIcon className={`text-[#363D69] w-7 h-7`} />
                  </div>
                </>
              ) : (
                <div>
                  <TSMicMuteIcon className={`text-[#EA4335] w-7 h-7`} />
                </div>
              )}

              {participant?.isCameraEnabled ? (
                <>
                  <div id={`turn-off-camera-${participant?.sid}`}>
                    <TSCameraIcon className={`text-[#363D69] w-7 h-7`} />
                  </div>
                </>
              ) : (
                <div>
                  <TSCameraSlashIcon className={`text-[#EA4335] w-7 h-7`} />
                </div>
              )}
            </div>
          )
        ) : (
          !isLocal && (
            <div className="flex col-span-3 gap-2 justify-start items-start h-full">
              {participant?.isMicrophoneEnabled ? (
                <div
                  className="cursor-pointer"
                  onClick={() => muteMicroPhoneHandler()}
                >
                  <TSMicIcon className={`text-[#363D69] w-7 h-7`} />
                </div>
              ) : (
                <TSMicMuteIcon className={`text-[#EA4335] w-7 h-7`} />
              )}
              {participant?.isCameraEnabled ? (
                <div
                  className="cursor-pointer"
                  onClick={() => muteCameraHandler()}
                >
                  <TSCameraIcon className={`text-[#363D69] w-7 h-7`} />
                </div>
              ) : (
                <TSCameraSlashIcon className={`text-[#EA4335] w-7 h-7`} />
              )}

              {!isHost && <div>{isPresenter ? (
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    if (!updateMetadataMutation.isLoading)
                      updateMetadataMutation.mutate({
                        isPresenter: false,
                      });
                  }}
                >
                  <TSPresenterIcon className={`w-7 h-7`} />
                </div>
              ) : (
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    if (!updateMetadataMutation.isLoading)
                      updateMetadataMutation.mutate({
                        isPresenter: true,
                      });
                  }}
                >
                  <TSPresenterSlashIcon className={`w-7 h-7`} />
                </div>
              )}</div>}

              <div className="cursor-pointer" onClick={() => removeConfirm()}>
                <TSKickOutIcon className={`w-7 h-7`} />
              </div>
            </div>
          )
        )}
      </div>
    </>
  );
}
