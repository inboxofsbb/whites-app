import { useMutation } from "@tanstack/react-query";
import { Participant, Room } from "livekit-client";
import ParticipantListItem from "../../livekit/ParticipantListItem";
import { TPMuteIcon } from "../../icons/TPMuteIcon";
import apiClient from "@/utils/apiClient";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface ParticipantsProps {
  isHost: any;
  setRightSidePanel: (show: any) => void;
  participants: any[];
  handRaisedParticipants: any[];
  room: any;
  isConnecting: any;
  boardConfig: any;
}

export default function ParticipantList({
  isHost,
  setRightSidePanel,
  participants,
  handRaisedParticipants,
  room,
  isConnecting,
  boardConfig
}: ParticipantsProps) {
  const updateHandRaiseMetadataMutation = useMutation(
    async (body: any) => {
      const { data } = await apiClient.put(
        `/livekit/update-participant-metadata/${room?.name}/${body.user}`,
        { ...body.data }
      );
      return data;
    },
    {
      onSuccess: () => { },
      onError: () => { },
    }
  );

  const muteAllParticipantsMutation = useMutation(
    async () => {
      const { data } = await apiClient.post(
        `/livekit/mute-all-participants/${room?.name}/${room?.localParticipant?.identity}`,
        {}
      );
      return data;
    },
    {
      onSuccess: () => { },
      onError: () => { },
    }
  );

  if (isConnecting) return <div>Connecting...</div>;

  return (
    <div className="!bg-[#F1F5F9] h-[100%] relative flex flex-col justify-between">

      <div className="overflow-auto">
        <div className="flex items-center justify-between p-2 px-4 text-base font-semibold text-black h-16 ">
          <div className="flex gap-2 items-center">
            Participants ({participants.length})
          </div>
          <div
            className="cursor-pointer"
            onClick={() => setRightSidePanel("INITIAL")}
          >
            <XMarkIcon className="text-black w-6 h-6" />
          </div>
        </div>
        {handRaisedParticipants?.length > 0 && (
          <div className="p-2 m-1 text-[#64748B] border-b-2 pb-5 mx-4">
            <div className="font-semibold flex items-center gap-2 py-1 text-black">
              Hand Raised
            </div>
            {handRaisedParticipants.map(
              (participant: Participant, index: any) => {
                return (
                  <div
                    key={index}
                    className="py-2 flex justify-between px-2 items-center text-lg"
                  >
                    <div className="flex gap-3 items-center">
                      <img
                        src="/assets/images/hand_raise.svg"
                        className="h-[21px] w-[18px]"
                      />
                      {participant?.name || participant.identity}
                    </div>
                    <div
                      className="flex cursor-pointer items-center"
                      onClick={() => {
                        room &&
                          updateHandRaiseMetadataMutation.mutate({
                            data: { isHandRaised: "false" },
                            user: participant.identity,
                          });
                      }}
                    >
                      <XMarkIcon className="w-6 h-6 relative left-0 text-red-600 rounded-full" />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
        <div className=" overflow-hidden my-4  mx-4">
          {participants?.map((participant: Participant, index: number) => (
            <ParticipantListItem
              participant={participant}
              key={`participant-wrapper-${index}`}
              room={room}
              isLocalHost={isHost}
              boardConfig={boardConfig}
            />
          ))}
        </div>
      </div>
      {isHost && (
        <div className="bg-[#D9D9D9] w-full  h-[15%] flex items-center justify-center ">
          <div
            className="bg-[#363D69] text-white cursor-pointer p-3 rounded-full px-[10%] flex justify-center items-center gap-4"
            onClick={() => {
              if (!muteAllParticipantsMutation.isLoading)
                muteAllParticipantsMutation.mutate();
            }}
          >
            <TPMuteIcon /> Mute all participants
          </div>
        </div>
      )}
    </div>
  );
}
