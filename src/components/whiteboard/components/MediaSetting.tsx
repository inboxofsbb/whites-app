import { UserIcon } from "@heroicons/react/solid";
import {
  CogIcon,
  MicrophoneIcon,
  VideoCameraIcon,
} from "@heroicons/react/solid";
import { VideoRenderer } from "@livekit/react-components";
import { Field, Form, Formik } from "formik";
import { createLocalVideoTrack, LocalVideoTrack, VideoCaptureOptions } from "livekit-client";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import React, { useRef } from "react";
import { useEffect, useState } from "react";
import { TPCamSlashIcon } from "../../icons/TPCamSlashIcon";
import { TSCameraIcon } from "../../icons/TSCameraIcon";
import { TSMicIcon } from "../../icons/TSMicIcon";

interface SettingProps {
  displaySetting: boolean;
  setDisplaySetting: (status: boolean) => void;
  ChangeMediaDevices: (camera: MediaDeviceInfo, mic: MediaDeviceInfo) => void;
  videoDevice: MediaDeviceInfo | undefined;
  audioDevice: MediaDeviceInfo | undefined;
  audioInputDevices: MediaDeviceInfo[];
  cameraDevices: MediaDeviceInfo[];
  checkMicAndVideo: () => void;
}

export default function Setting({
  displaySetting,
  setDisplaySetting,
  videoDevice,
  audioDevice,
  audioInputDevices,
  cameraDevices,
  ChangeMediaDevices,
  checkMicAndVideo
}: SettingProps) {
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<any>([]);
  const [settingVideoTrack, setSettingVideoTrack] =
    useState<LocalVideoTrack | null>();

  const toggleVideo = async (video: MediaDeviceInfo | null) => {
    if (settingVideoTrack) {
      const options: VideoCaptureOptions = { deviceId: video?.deviceId! }
      await settingVideoTrack.restartTrack(options);
    } else {
      const track: LocalVideoTrack = await createLocalVideoTrack({
        deviceId: video?.deviceId,
      });
      track.restartTrack({ deviceId: video?.deviceId });
      setSettingVideoTrack(track);
    }
  };

  const meterRef: any = useRef();

  // navigator.mediaDevices
  //   .getUserMedia({
  //     audio: true,
  //     video: false,
  //   })
  //   .then((stream) => {
  //     const audioContext = new AudioContext();
  //     const mediaStreamAudioSourceNode =
  //       audioContext.createMediaStreamSource(stream);
  //     const analyserNode = audioContext.createAnalyser();
  //     mediaStreamAudioSourceNode.connect(analyserNode);
  //     const pcmData = new Float32Array(analyserNode.fftSize);

  //     const onFrame = () => {
  //       analyserNode.getFloatTimeDomainData(pcmData);
  //       let sumSquares = 0.0;
  //       for (const amplitude of pcmData) {
  //         sumSquares += amplitude * amplitude;
  //       }
  //       meterRef.current = Math.sqrt(sumSquares / pcmData.length);

  //       window.requestAnimationFrame(onFrame);
  //     };
  //     window.requestAnimationFrame(onFrame);

  //   })
  //   .catch(function (err) {
  //     /* handle the error */
  //     console.error(err);
  //   });

  useEffect(() => {
    toggleVideo(videoDevice!);
  }, [])

  return (
    <Dialog
      header={
        <div className="flex items-center gap-1">
          Settings
        </div>
      }
      headerClassName="!border-none py-4 !px-7"
      draggable={false}
      blockScroll
      className="w-full md:max-w-[800px]  "
      contentClassName="!p-0"
      visible={displaySetting}
      onHide={() => setDisplaySetting(false)}
    >
      <Formik
        initialValues={{
          camera: cameraDevices.find((dt) => {
            return dt.deviceId === videoDevice?.deviceId;
          }),
          audioInput: audioInputDevices.find((dt) => {
            return dt.deviceId === audioDevice?.deviceId;
          }),
        }}
        enableReinitialize={true}
        validateOnMount={true}
        // validation using schema

        onSubmit={(values: any) => {
          ChangeMediaDevices(values.camera, values.audioInput);
          setDisplaySetting(false);
        }}
      >
        {(formik) => (
          <div className="whiteboard-css">

            <Form>
              <div>
                <div className="flex flex-col md:flex-row justify-evenly item-center pb-14 pt-10 px-7  gap-16">
                  <div className="md:h-[260px] relative ">
                    {selectedVideoDevice && settingVideoTrack ? (
                      <div className="overflow-hidden md:w-[380px]  md:h-[260px] rounded-[10px] bg-[#5F6695]  ">
                        <VideoRenderer
                          className="rounded lg: -z-10 "
                          track={settingVideoTrack}
                          isLocal={true}
                        />
                      </div>
                    ) : (

                      <div className={` flex items-center  justify-center rounded-[10px] bg-[#363D69] aspect-video w-full h-full `} >
                        <div className="rounded-full w-[100px] text-center h-[100px] bg-[#5F6695] text-[#9B99F1] flex justify-center items-center text-3xl font-semibold">
                          <UserIcon className="w-12 h-12" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="md:w-1/2 flex flex-col justify-between flex-1 gap-y-6  text-sm">
                    <div className="grid grid-cols-1 gap-4 ">
                      <div className="flex items-center gap-3  text-[#565C7F] ">
                        <TSCameraIcon className={`w-[29px] h-[22px]`} />
                        Video input
                      </div>
                      {cameraDevices?.length > 0 ? (
                        <Field
                          name="camera"
                          value={formik.values.camera}
                          options={cameraDevices}
                          as={Dropdown}
                          optionLabel="label"
                          placeholder="Select a device"
                          className="h-8 flex items-center text-[#64748B]"
                          panelClassName="whiteboard-css"
                          onChange={(e: any) => {
                            formik.setFieldValue("camera", e.value),
                              setSelectedVideoDevice(e.value);
                            toggleVideo(e.value);
                          }}
                        />
                      ) : (
                        <div className="h-8 flex items-center w-full text-[#565C7F]">
                          No devices found
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-[#565C7F]">
                      <div className="flex items-center gap-4">
                        <TSMicIcon className={`w-[29px] h-[22px]`} />
                        Audio input
                      </div>
                      {audioInputDevices?.length > 0 ? (
                        <Field
                          name="audioInput"
                          as={Dropdown}
                          placeholder="Select a device"
                          optionLabel="label"
                          options={audioInputDevices}
                          className="h-8 flex items-center"
                          panelClassName="whiteboard-css"
                          onChange={(e: any) => {
                            formik.setFieldValue("audioInput", e.value);
                          }}
                        />
                      ) : (
                        <div className="h-8 flex items-center text-[#565C7F]">
                          No devices found
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-auto">
                      <Button
                        type="button"
                        className="p-10 p-button-outlined justify-center"
                        onClick={() => setDisplaySetting(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="p-10justify-center">
                        {formik.isSubmitting ? "Saving" : "Save"}
                      </Button>
                    </div>
                    {/* <meter id="volumeMeter" high={0.25} max="1" value={meterRef.current}></meter> */}
                  </div>

                </div>

              </div>
            </Form>
          </div>
        )}
      </Formik>
    </Dialog>
  );
}
