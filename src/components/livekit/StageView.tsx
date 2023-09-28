import { faVolumeMute } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Track, VideoTrack } from "livekit-client";
import { AudioRenderer } from "@livekit/react-core";
import React, { ReactElement, useContext } from "react";
import { useMediaQuery } from "react-responsive";
import { GridStage } from "./GridStage";
import { StageProps } from "@livekit/react-components";
import styles from "./styles.module.css";
import { ScreenShareContext } from "./ScreenShareContext";


export const StageView = (stageProps: StageProps) => {
  const isMobile = useMediaQuery({ query: "(max-width: 800px)" });
  const { room, participants } = stageProps.roomState;
  const {screenShare, setScreenShare} = useContext<any>(ScreenShareContext);
  let mainElement: ReactElement;
  // find first participant with screen shared
  let screenTrack: VideoTrack | undefined;
  participants.forEach((p) => {
    if (screenTrack) {
      return;
    }
    const track = p.getTrack(Track.Source.ScreenShare);
    if (track?.isSubscribed && track.videoTrack) {
      screenTrack = track.videoTrack;
    }
  });
  
  if (screenTrack){
    setScreenShare(screenTrack)
  }else{
    setScreenShare(null)
  }
  mainElement = <GridStage {...stageProps} />;

  return (
    <div className={styles.container}>
      {mainElement}
      {stageProps.roomState.audioTracks.map((track) => (
        <AudioRenderer key={track.sid} track={track} isLocal={false} />
      ))}

      {room?.canPlaybackAudio === false && (
        <div className={styles.overlay}>
          <button
            className={styles.unmuteButton}
            onClick={() => {
              room.startAudio();
            }}
          >
            <FontAwesomeIcon
              className={styles.icon}
              size="1x"
              icon={faVolumeMute as any}
            />
            Click to Unmute
          </button>
        </div>
      )}
    </div>
  );
};
