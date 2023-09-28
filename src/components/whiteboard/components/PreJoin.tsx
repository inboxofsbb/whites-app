import { CogIcon, PlusCircleIcon, XIcon } from "@heroicons/react/outline";
import { Skeleton } from "primereact/skeleton";
import { TPCamSlashIcon } from "../../icons/TPCamSlashIcon";
import { TPCamIcon } from "../../icons/TPCamIcon";
import { TPMuteIcon } from "../../icons/TPMuteIcon";
import { TPMicIcon } from "../../icons/TPMicIcon";
import { TCameraSlashXL } from "../../icons/TCameraSlashXL";
import { VideoRenderer } from "@livekit/react-components";
import { THostNowButtonIcon } from "../../icons/THostNowButtonIcon";
import { Tooltip } from "primereact/tooltip";
import { Button } from "primereact/button";
import { UserIcon } from "@heroicons/react/solid";

interface PreJoinProps {
  isHost: Boolean;
  videoTrack: any;
  micEnabled: boolean;
  camEnabled: boolean;
  roomParticipantsLoading: Boolean;
  roomStatus: String;
  roomParticipants: any[];
  loading: boolean;
  disconnected: boolean;
  toggleAudio: () => void;
  toggleVideo: () => void;
  joinSession: () => void;
  setDisplaySetting: (show: boolean) => void;
}

export default function PreJoin({
  isHost,
  videoTrack,
  micEnabled,
  camEnabled,
  roomStatus,
  loading,
  disconnected,
  roomParticipants,
  roomParticipantsLoading,
  toggleAudio,
  toggleVideo,
  setDisplaySetting,
  joinSession,
}: PreJoinProps) {
  return (
    <div className="flex sm:items-center flex-col justify-center select-none py-3">
      <div className="p-4 md:p-0  h-fit flex flex-col justify-start items-start gap-7 rounded-b">
        <div className="md:flex md:item-center md:justify-center md:gap-14 mt-10 ">
          <div className="flex justify-center items-center mt-4 md:mt-0  md:h-full rounded-b ">
            <div>
              <div className="overflow-hidden aspect-video w-[250px] md:min-w-[450px] rounded-[10px] relative  md:h-[253px] h-[185px] ">
                {videoTrack && (
                  <div className="bg-gradient-to-b via-[#202548]/5 from-transparent to-black h-[80px] w-full z-10 absolute bottom-0"></div>
                )}
                {videoTrack ? (
                  <VideoRenderer
                    className="rounded-[10px]  "
                    track={videoTrack}
                    isLocal={true}
                  />
                ) : (
                  <div className="flex items-center justify-center bg-gradient-to-b from-[#363D69] via-[#363D69] to-[#121421]/75 h-full w-full">
                    <div className="rounded-full w-[100px] text-center h-[100px] bg-[#5F6695] text-[#9B99F1] flex justify-center items-center text-3xl font-semibold">
                      <UserIcon className="w-12 h-12" />
                    </div>
                  </div>
                )}
              </div>
              <div className="w-full relative rounded-[10px] z-10">
                <div className="h-14 -mt-14  z-10 flex items-center justify-start gap-2 px-3">
                  {micEnabled ? (
                    <div
                      onClick={toggleAudio}
                      className="cursor-pointer mr-2 bg-[#363D69] rounded-full p-2 flex items-center justify-center"
                    >
                      <TPMicIcon className={`w-[21px] h-[21px]`} />
                    </div>
                  ) : (
                    <div
                      onClick={toggleAudio}
                      className="cursor-pointer mr-2 bg-[#363D69] rounded-full p-2 flex items-center justify-center"
                    >
                      <TPMuteIcon />
                    </div>
                  )}
                  {camEnabled ? (
                    <div
                      className="cursor-pointer mr-2 bg-[#363D69] rounded-full p-2 flex items-center justify-center"
                      onClick={toggleVideo}
                    >
                      <TPCamIcon />
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer mr-2 bg-[#363D69] rounded-full p-2 flex items-center justify-center"
                      onClick={toggleVideo}
                    >
                      <TPCamSlashIcon />
                    </div>
                  )}

                  <div className="absolute right-3">
                    <CogIcon
                      className="w-5 text-primary-100 cursor-pointer"
                      onClick={() => setDisplaySetting(true)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex md:h-full  rounded-b md:flex items-center justify-center">
            {!isHost && (
              <div className="flex flex-col w-full h-fit items-start md:items-center justify-start pt-8 lg:mt-0 text-white">
                {roomStatus === "INITIAL" && (
                  <div className=" text-2xl ">
                    {!roomParticipantsLoading ? (
                      <div className="text-[#94A3B8] font-semibold">
                        {" "}
                        All Set?
                      </div>
                    ) : (
                      <Skeleton
                        width="5rem"
                        height="2rem"
                        className="mr-2 mb-3 !bg-[#363D69]"
                      ></Skeleton>
                    )}
                    {roomParticipantsLoading ? (
                      <Skeleton
                        width="10rem"
                        height="2rem"
                        className="mr-2 mb-3 !bg-[#363D69]"
                      ></Skeleton>
                    ) : (
                      <div className="text-base text-white ">Ready to join</div>
                    )}

                    {disconnected && !roomParticipantsLoading && (
                      <Button
                        onClick={joinSession}
                        icon={
                          <PlusCircleIcon className="w-8 text-neutral-50" />
                        }
                        label="Join Now"
                        className="mt-3 md:mt-10 !bg-[#363D69] hover:!bg-[#323a68] flex justify-center gap-3 !border-0"
                      />
                    )}
                    {roomParticipantsLoading && (
                      <Skeleton
                        width="10rem"
                        height="2rem"
                        className="mr-2 mb-3 !bg-[#363D69]"
                      ></Skeleton>
                    )}
                    {loading && (
                      <Button
                        loading={true}
                        label={"Connecting"}
                        className="text-base mt-3 md:mt-10 rounded-xl font-semibold  flex items-center justify-center gap-2 p-2.5 px-4 cursor-pointer h-14"
                      />
                    )}
                  </div>
                )}

                {roomStatus === "WAIT_FOR_HOST" && (
                  <div className="text-white text-xl ">
                    <div className="font-semibold">
                      {" "}
                      Waiting for the host to join..
                    </div>
                    <div className="text-[#94A3B8] text-base">
                      You will automatically taken to the classroom
                      <br /> once the host joins
                    </div>
                  </div>
                )}
              </div>
            )}

            {isHost && (
              <div className="flex flex-col w-full  items-start md:items-center justify-start mt-4 lg:mt-0">
                <div className="text-white text-xl ">
                  {!roomParticipantsLoading &&
                    !roomParticipantsLoading ? (
                      <div className="text-[#94A3B8] font-normal text-base">
                        {roomParticipants?.length != 0
                          ? roomParticipants?.length + " people joined"
                          : "No one has joined session"}
                      </div>
                    ) : (
                      <Skeleton
                        width="13rem"
                        height="2rem"
                        className="mr-2 mb-3 !bg-[#363D69]"
                      ></Skeleton>
                    )}

                  {!roomParticipantsLoading ? (
                    <div className="font-semibold mt-6 text-[#94A3B8] text-xl">
                      All Set?
                    </div>
                  ) : (
                    <Skeleton
                      width="6rem"
                      height="2rem"
                      className="mr-2 mb-3 mt-6 !bg-[#363D69]"
                    ></Skeleton>
                  )}
                  {!roomParticipantsLoading ? (
                    <div className="text-white text-lg mb-8">
                      Ready to host the session
                    </div>
                  ) : (
                    <Skeleton
                      width="10rem"
                      height="2rem"
                      className="mr-2 mb-3 !bg-[#363D69]"
                    ></Skeleton>
                  )}

                  {!roomParticipantsLoading && (
                    <Button
                      onClick={joinSession}
                      icon={<THostNowButtonIcon />}
                      label="Host Now"
                      loading={loading}
                      className="mt-3 md:mt-10 !bg-[#363D69] hover:!bg-[#323a68] flex justify-center gap-3 !border-0"
                    />
                  )}
                  {roomParticipantsLoading && (
                    <Skeleton
                      width="6rem"
                      height="2rem"
                      className="mr-2 mt-3 md:mt-10 !bg-[#363D69]"
                    ></Skeleton>
                  )}
                </div>
              </div>
            )}
          </div>
          
        </div>
        {/* <div>
          <div className="text-[#94A3B8] text-[14px]">
            Having issues with audio/video?
          </div>
          <div className="text-white"> Troubleshooting & help</div>
        </div> */}
      </div>
    </div>
  );
}
