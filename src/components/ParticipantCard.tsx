import { useParticipant, VideoRenderer } from "@livekit/react-components";
import { Participant, Room } from "livekit-client";
import { useEffect, useState } from "react";
import { TConnectionIndicationSm } from "./icons/TConnectionIndicationSm";
import { TSMicMuteIcon } from "./icons/TSMicMuteIcon";

export interface ParticipantProps {
  participant: Participant;
  room: Room;
  view: String;
}

export const ParticipantCard = ({
  participant,
  room,
  view,
}: ParticipantProps) => {
  const {
    cameraPublication,
    isLocal,
    connectionQuality,
    isSpeaking,
    metadata,
  } = useParticipant(participant);
  const [isPresenter, setIsPresenter] = useState<boolean>(false);
  const [isHost, setIsHost] = useState<boolean>(false);
  const displayName = isLocal
    ? `Me${isHost ? " (Host)" : ""}${isPresenter ? " (Presenter)" : "" }`
    : `${
        (participant.name || participant.identity).length > 10
          ? view == "grid"
            ? participant.name || participant.identity
            : (participant.name || participant.identity).slice(0, 10) + "..."
          : participant.name || participant.identity
      }${isPresenter ? " (Presenter)" : isHost ? " (Host)" : ""}`;

  useEffect(() => {
    if (metadata) {
      const _metadata = JSON.parse(metadata);
      if (
        _metadata?.isPresenter === "true" ||
        _metadata?.isPresenter === "false"
      )
        setIsPresenter(_metadata?.isPresenter === "true");

      if (
        _metadata?.isHost === "true" ||
        _metadata?.isHost === "false" ||
        _metadata?.isHost === true
      )
        setIsHost(_metadata?.isHost === "true" || _metadata?.isHost === true);
    }
  }, [metadata]);



  return (
    <div
      className={`p-0.5 ${
        participant?.metadata &&
        JSON?.parse(participant?.metadata as string).isHost &&
        "animate-border rounded-[10px] bg-gradient-to-r from-[#118AB7] via-[#202548] to-[#4DC0AE] bg-[length:400%_400%] p-0.5 "
      } aspect-video`}
    >
      <div className={`w-full  text-center group  `}>
        <div className={`relative text-center `}>
          <div className="absolute z-30 h-full right-1 mt-1 w-[27px]">
            <div className="flex w-full h-full pb-3 flex-col items-end">
              {connectionQuality === "unknown" ? (
                ""
              ) : (
                <TConnectionIndicationSm
                  connectionQuality={connectionQuality}
                />
              )}
              {!participant?.isMicrophoneEnabled ? (
                <div
                  className={`mt-auto bg-[#EA4335] rounded-full ${
                    view == "large" ? "w-7 h-7" : "h-4 w-4"
                  } flex justify-center items-center`}
                >
                  <TSMicMuteIcon
                    className={`text-white ${
                      view == "large" ? "w-5 h-4" : "w-3 h-2.5"
                    }`}
                  />
                </div>
              ) : (
                <div className="flex mt-auto justify-end items-center pr-1  min-h-[20px]">
                  {isSpeaking && participant?.isMicrophoneEnabled ? (
                    <div className="relative  boxContainer " id="bars">
                      <div className="box box1"></div>
                      <div className="box box2"></div>
                      <div className="box box3"></div>
                      <div className="box box4"></div>
                      <div className="box box5"></div>
                    </div>
                  ) : (
                    participant?.isMicrophoneEnabled && (
                      <div className="flex gap-[2px]">
                        <div className="bg-white min-w-[2px] min-h-[4px]"></div>
                        <div className="bg-white min-w-[2px] min-h-[4px]"></div>
                        <div className="bg-white min-w-[2px] min-h-[4px]"></div>
                        <div className="bg-white min-w-[2px] min-h-[4px]"></div>
                        <div className="bg-white min-w-[2px] min-h-[4px]"></div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
          <div></div>
          {cameraPublication?.isSubscribed &&
          cameraPublication?.track &&
          !cameraPublication?.isMuted ? (
            <div className={`bg-neutral-400 rounded-[10px]   `}>
              <VideoRenderer
                className={`w-full aspect-video rounded-[10px]   object-cover `}
                track={cameraPublication.track}
                isLocal={true}
              />
            </div>
          ) : (
            <div
              className={` flex items-center  justify-center rounded-[10px] bg-[#363D69] aspect-video `}
            >
              <div
                className={`bg-[#5F6695]  rounded-full flex  items-center justify-center  ${
                  view == "large"
                    ? "text-[65px] font-black"
                    : "text-[39px] font-extrabold"
                } h-3/5 w-1/3  text-[#9B99F1]`}
              >
                {participant?.name?.slice(0, 1)?.toUpperCase() ||
                  displayName?.slice(0, 1)?.toUpperCase()}
              </div>
            </div>
          )}

          <div
            className={`absolute bottom-0 rounded-[10px] w-full  ${
              view == "grid"
                ? "h-[15%]"
                : view == "small"
                ? "h-[20%]"
                : "h-10 min-h-[12%]"
            } bg-gradient-to-b via-[#202548]/20 from-transparent to-[#121421]/75 `}
          >
            <div
              className={`${
                view == "grid"
                  ? " text-sm font-medium text-neutral-50"
                  : view == "small"
                  ? "text-xs font-normal text-neutral-200"
                  : "text-neutral-200"
              } text-left px-1 h-full  `}
            >
              {displayName}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
