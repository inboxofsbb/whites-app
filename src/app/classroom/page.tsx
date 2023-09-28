"use client"
import React, { useEffect, useRef, useState } from "react";
import {
  AudioRenderer,
  useRoom,
  VideoRenderer,
} from "@livekit/react-components";
import { nanoid } from "nanoid";
import Whiteboard from "../../components/whiteboard/Whiteboard";
import { atom, useAtom } from "jotai";
import { collabAPIAtom } from "../../components/whiteboard/collab/Collab";
import {
  ConnectionState,
  createLocalAudioTrack,
  createLocalVideoTrack,
  DataPacket_Kind,
  LocalAudioTrack,
  LocalParticipant,
  LocalTrackPublication,
  LocalVideoTrack,
  Participant,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  RoomEvent,
  Track,
  TrackPublication,
  TrackPublishOptions,
  VideoCaptureOptions,
  VideoTrack,
} from "livekit-client";
import { sortParticipants } from "../../components/livekit/ParticipantSort";
import { DateTime } from "luxon";
import { Dialog } from "primereact/dialog";
import NoSSRWrapper from "../../components/whiteboard/components/NoSSRWrapper";

import { Button } from "primereact/button";
import { confirmPopup } from "primereact/confirmpopup";
import { ConfirmPopup } from "primereact/confirmpopup";
import { TXMarkIcon } from "../../components/icons/TXMarkIcon";
import { Tooltip } from "primereact/tooltip";
import { useStopwatch } from "react-timer-hook";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import _ from "lodash";
import { ParticipantCard1 } from "../../components/livekit/ParticipantCard1";
import ChatContainerBox from "../../components/whiteboard/components/ChatContainer";
import { TSMicMuteIcon } from "../../components/icons/TSMicMuteIcon";
import ParticipantList from "../../components/whiteboard/components/ParticipantList";
import { OverlayPanel } from "primereact/overlaypanel";
import { TSChatIcon } from "../../components/icons/TSChatIcon";
import { TSMicIcon } from "../../components/icons/TSMicIcon";
import { THandRaise } from "../../components/icons/THandRaise";
import PreJoin from "../../components/whiteboard/components/PreJoin";
import { Dropdown } from "primereact/dropdown";
import { Field, Form, Formik } from "formik";
import { TSCameraIcon } from "../../components/icons/TSCameraIcon";
import { TSWarningToastIcon } from "../../components/icons/TSWarningToastIcon";
import { TSInfoToastIcon } from "../../components/icons/TSInfoToastIcon";
import { TSCameraSlashIcon } from "../../components/icons/TSCameraSlashIcon";
import { TSCheckCircleToastIcon } from "../../components/icons/TSCheckCircleToastIcon";
import {
  NatsConnection,
  connect as natsConnect,
  consumerOpts,
  StringCodec,
  JetStreamSubscription,
} from "nats.ws";
import { TArrowPointOutIcon } from "../../components/icons/TArrowPointOutIcon";
import { TArrowPointInIcon } from "../../components/icons/TArrowPointInIcon";
import { TTurnOnZenmodeIcon } from "../../components/icons/TTurnOnZenmodeIcon";
import { TTurnOffZenmodeIcon } from "../../components/icons/TTurnOffZenmodeIcon";
import { TConnectionErrorIcon } from "../../components/icons/TConnectionErrorIcon";
import { TRecordErrorIcon } from "../../components/icons/TRecordErrorIcon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TSParticipantsIcon } from "@/components/TSParticipantsIcon";
import apiClient from "@/utils/apiClient";
import customApiClient from "@/utils/customApiClient";
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, CogIcon, UserIcon } from "@heroicons/react/24/outline";
import { useRouter, useSearchParams } from "next/navigation";
import { isEditModeEnabledAtom } from "@/wbUtils/app-jotai";
import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { AppState, BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import { BoardConfig } from "@/components/Whiteboard";
import { useCallbackRefState } from "@/components/whiteboard/useCallbackRefState";

export const natsAtom = atom<NatsConnection | null>(null);

export default function Classroom() {
  const [excalidrawAPI, excalidrawRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>();
  const searchParams = useSearchParams();
  const stringCodec = StringCodec();
  const [nats, setNats] = useAtom(natsAtom);

  const token = searchParams.get('token');
  const [sessionEnded, setSessionEnded] = useState(false);
  const [isEditModeEnabled, setIsEditModeEnabled] = useAtom(isEditModeEnabledAtom);
  const [boardConfig, setBoardConfig] = useState<BoardConfig | null>(null);
  const [excalidrawModule, setExcalidrawModule] = useState<any>(null);

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
  const onBoardChangeHandler = async (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles
  ) => { }
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

  useEffect(() => {
    import("@excalidraw/excalidraw").then((module) => {
      setExcalidrawModule(module);
    });
  }, []);
  
  return (
    <div className="h-screen">
      {excalidrawModule && <excalidrawModule.Excalidraw
        ref={excalidrawRefCallback}
        onChange={onBoardChangeHandler}
        onPointerUpdate={(e: any) => {
        }}
        gridModeEnabled={false}
        // renderTopRightUI={renderTopRightUI}
        UIOptions={{
          canvasActions: {
            clearCanvas: true,
            NormalizedZoomValue: 0,
            changeViewBackgroundColor: false,
            loadScene: false,
            saveToActiveFile: false,
            saveAsImage: false,
            theme: false,
            export: false,
          },
        }}
      />}

    </div>
  )
}
