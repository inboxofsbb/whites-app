import { useParticipant, VideoRenderer } from "@livekit/react-components";
import { Participant, Room } from "livekit-client";
import { useEffect, useState } from "react";
import { TCameraSlashXL } from "../icons/TCameraSlashXL";
import { TConnectionIndicationSm } from "../icons/TConnectionIndicationSm";
import { TMutedIcon } from "../icons/TMutedIcon";
import { TPCamIcon } from "../icons/TPCamIcon";
import { TPCamSlashIcon } from "../icons/TPCamSlashIcon";
import { TPMicIcon } from "../icons/TPMicIcon";
import { TPMuteIcon } from "../icons/TPMuteIcon";

export interface ParticipantProps {
  participant: Participant;
  room: Room;
  view: String;
}

export const ParticipantCard = ({
  participant,
  room,
  view
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
    ? `Me${isHost ? " (Host)" : ""}`
    : `${(participant.name || participant.identity).length > 10
      ?
      (view == 'large' ? (participant.name || participant.identity) : (participant.name || participant.identity).slice(0, 10) + "...")
      : participant.name || participant.identity
    }${isPresenter
      ? " (Presenter)"
      : isHost
        ? " (Host)"
        : ""
    }`;


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
        _metadata?.isHost === "false"||
        _metadata?.isHost === true
      )
        setIsHost(_metadata?.isHost === "true" || _metadata?.isHost === true);
    }
  }, [metadata]);
  return (
    <div className={`w-full  text-center  ${view == 'large' ? '' : view == 'small' ? 'max-w-[250px]' : ''}`}>
      <div className={`relative text-center `}>
        <div className="absolute z-30 right-1  mt-1">
          <TConnectionIndicationSm connectionQuality={connectionQuality} />
          {!participant?.isMicrophoneEnabled && (
            <div className="mt-1">
              <TMutedIcon />
            </div>
          )}
        </div>
        {cameraPublication?.isSubscribed &&
          cameraPublication?.track &&
          !cameraPublication?.isMuted ? (
          <div className={`bg-neutral-400 rounded-t ${view == 'large' ? '' : view == 'small' ? '' : ''}  `}>
            <VideoRenderer
              className={`rounded w-full aspect-video min-w-[245px] min-h-[155px] object-cover `}
              track={cameraPublication.track}
              isLocal={true}
            />
          </div>
        ) : (
          <div className={` flex items-center min-w-[245px] justify-center rounded-t bg-neutral-300 aspect-video ${view == 'large' ? '' : view == 'small' ? '' : ''}`}>
            <TPCamSlashIcon />
          </div>
        )}
        <div className={`backdrop-blur  ${view == 'large' ? ' mx-auto' : view == 'small' ? '' : ''} `}>
          <div className={`flex items-center justify-between   w-full px-2 ${view == 'large' ? 'h-12 -mt-12' : view == 'small' ? 'h-8 -mt-8' : ''}   bg-neutral-900 opacity-60`}>
            <div className="flex items-center  ">
              {" "}
              <div className={`${view == 'large' ? ' text-lg font-medium text-neutral-50' : view == 'small' ? 'text-xs font-normal text-neutral-200' : ''}  `}>
                {displayName}
              </div>
            </div>
            <div className="flex justify-end items-center">
              {isSpeaking && participant?.isMicrophoneEnabled ? (
                <div className="relative  boxContainer" id="bars">
                  <div className="box box1"></div>
                  <div className="box box2"></div>
                  <div className="box box3"></div>
                  <div className="box box4"></div>
                  <div className="box box5"></div>
                </div>
              ) : (
                participant?.isMicrophoneEnabled && (
                  <div className="  flex gap-[2px]">
                    <div className=" bg-white min-w-[2px] min-h-[2px]"></div>
                    <div className=" bg-white min-w-[2px] min-h-[2px]"></div>
                    <div className=" bg-white min-w-[2px] min-h-[2px]"></div>
                    <div className=" bg-white min-w-[2px] min-h-[2px]"></div>
                    <div className=" bg-white min-w-[2px] min-h-[2px]"></div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
