"use client"
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types/types";
import { useCallbackRefState } from "./useCallbackRefState";
import { ErrorDialog } from "./components/ErrorDialog";
import Collab, {
  CollabAPI,
  collabAPIAtom,
  isCollaboratingAtom,
  isPageLoadingAtom,
} from "./collab/Collab";
import { useAtom } from "jotai";
import { exportToBackend, getSyncableElements, loadScene } from "./data";
import { Slider } from 'primereact/slider';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tooltip } from "primereact/tooltip";
import { InputSwitch } from "primereact/inputswitch";
import { Checkbox } from "primereact/checkbox";
import { useRoom } from "@livekit/react-components";
import { TMultiTabIcon } from "../icons/TMultiTabIcon";
import { TSlideUpArrow } from "../icons/TSlideUpArrow";
import { TSlideDownArrow } from "../icons/TSlideDownArrow";
import { TSlideTrash } from "../icons/TSlideTrash";
import { TBoardRefreshIcon } from "../icons/TBoardRefreshIcon";
import { TBoardSyncIcon } from "../icons/TBoardSyncIcon";
import { TBoardSyncSlashIcon } from "../icons/TBoardSyncSlashIcon";
import { TSlideOpen } from "../icons/TSlideOpen";
import { TSlideClose } from "../icons/TSlideCloseIcon";
import { BinaryFileData, DataURL } from "./types";
import { generateIdFromFile, getDataURL } from "./data/encryption";
import {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
} from "@excalidraw/excalidraw/types/element/types";
import { blankPageBase64, generateImageElement, generateTextElement, triangleElement } from "./utils";
import { FileId } from "./data/typeChecks";
import * as pdfjsLib from "pdfjs-dist";
import Canvas from "canvas";
import { Dialog } from "primereact/dialog";
import Webcam from "react-webcam";
import { Button } from "primereact/button";
import { default as NextImage } from "next/image";
import jsPDF from "jspdf";
import { DateTime } from "luxon";
import {
  graphDataURL,
  protractorDataURL,
  rulerDataURL,
} from "./components/geometricTools";
import { TRulerIcon } from "../icons/TRulerIcon";
import { TProtractorIcon } from "../icons/TProtractorIcon";
import { TGraphIcon } from "../icons/TGraphIcon";
import { TActiveTool } from "../icons/TActiveTool";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { InputTextarea } from "primereact/inputtextarea";
import { OverlayPanel } from "primereact/overlaypanel";
import { TVoiceListenIcon } from "../icons/TVoiceListenIcon";
import { TSWhiteboardCaptureIcon } from "../icons/TSWhieboardCaptureIcon";
import { TSWhiteboardSlideOpen } from "../icons/TSWhiteboardSlideOpen";
import { TSWhiteboardSlidesClose } from "../icons/TSWhiteboardSlidesClose";
import { TSWhiteboardPDFUpload } from "../icons/TSWhiteboardPDFUpload";
import { TSWhiteboardPDFDownload } from "../icons/TSWhiteboardPDFDownload";
import { TSWhiteboardVoicetoTextPause } from "../icons/TSWhitboardVoicetoTextPause";
import { TSWhitboardSpeechtoTextStart } from "../icons/TSWhitboardSpeechtoTextStart";
import { consumerOpts, Empty, StringCodec } from "nats.ws";
import { nanoid } from "nanoid";
import { Toast } from "primereact/toast";
import { TTriangleIcon } from "../icons/TTriangleIcon";
import { TEraseModeOnIcon } from "../icons/TEraseModeOnIcon";
import { TEraseModeOffIcon } from "../icons/TEraseModeOffIcon";
import { TSlideToFirstIcon } from "../icons/TSlideToFirstIcon";
import { TSlideToLastIcon } from "../icons/TSlideToLastIcon";
import { TSlideTrashIcon } from "../icons/TSlideTrashIcon";
import { TPdfIcon } from "../icons/TPdfIcon";
import { ProgressBar } from "primereact/progressbar";
import { ProgressSpinner } from "primereact/progressspinner";
import { confirmDialog } from "primereact/confirmdialog";
import { TSWarningToastIcon } from "../icons/TSWarningToastIcon";
import { natsAtom } from "@/app/classroom/page";
import apiClient from "@/utils/apiClient";
import { ArrowPathIcon, BookOpenIcon, EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import { Dropdown } from "primereact/dropdown";
export interface WhiteboardProps {
  userLabel: string;
  isPresenter: boolean;
  userName: string;
  mode: "RECORDING" | "ONLINE" | "OFFLINE";
  isHost: boolean;
  roomKey: string;
  roomId: string;
  isHandRaised: boolean;
  currentSlide: any;
  setCurrentSlide: any;
  boardConfig: any;
  isZenModeOn: boolean;
  setBoardConfig: any;
}

export default function Whiteboard(props: WhiteboardProps) {
  const { mode, isPresenter, isHost, roomId, roomKey, currentSlide, setBoardConfig, setCurrentSlide, boardConfig, isZenModeOn } = props;
  const [nats,] = useAtom(natsAtom);
  const [isSlideChangeLoading, setIsSlideChangeLoading] = useAtom(isPageLoadingAtom);
  const [excalidrawModule, setExcalidrawModule] = useState<any>(null);
  const [pdfUploadingData, setPdfUploadingData] = useState<{ isUploading: boolean; value: number | null; size: string | null; fileName: string | null }>({
    value: null, size: null, fileName: null, isUploading: false
  });
  const [excalidrawAPI, excalidrawRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>();
  const toast = useRef() as React.MutableRefObject<Toast>;
  const [errorMessage, setErrorMessage] = useState("");

  const [collabAPI] = useAtom(collabAPIAtom);

  const [prevBoardConfig, setPrevBoardConfig] = useState<any>({});
  const [deleteSlideConfirmation, setDeleteSlideConfirmation] = useState(false);

  const [screenShotImage, setScreenShotImage] = useState(null);
  const [defaultPageData, setDefaultPageData] = useState<{
    pageId: string;
    pageKey: string;
  } | null>(null);
  const [showTeacherControl, setShowTeacherControl] = useState(false);
  const [showGeometricToolsModal, setShowGeometricToolsModal] = useState(false);

  const [addNewPageLoading, setAddNewPageLoading] = useState(false);

  const [currentSlideId, setCurrentSlideId] = useState<any>(null);

  const slideListRef = useRef(null);

  const [tempPageList, setTempPageList] = useState<any>([]);
  // isCollaboratingAtom is requred here even if it is not used.
  // otherwise collabAPI?.isCollaborating() will not show chaged value
  // possible rerending issue/bug
  const [isCollaborating] = useAtom(isCollaboratingAtom);

  const [showSlideList, setShowSlideList] = useState(false);
  const [id, setId] = useState<string>();
  const [key, setKey] = useState<string>();
  const queryClient = useQueryClient();
  const prevAppState: any = useRef(null);

  const [syncBoardWithStudent, setSyncBoardWithStudent] = useState(true);
  const [currentSceneId, setCurrentSceneId] = useState("");

  const [pdfFileDownloading, setPdfFileDownloading] = useState(false);
  const [isEraseModeOn, setIsEraseModeOn] = useState(false);

  const { room } = useRoom({ adaptiveStream: true, dynacast: true });
  const dropdownRef = useRef(null);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [listenVoiceText, setListenVoiceText] = useState("");
  const [voiceTextYPosition, setVoiceTextYPosition] = useState(200);
  const [listenVoiceLanguage, setListenVoiceLanguage] = useState<any>("en-GB");
  const [tempListenVoiceText, setTempListenVoiceText] = useState("");
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [strokeWidthValue, setStrokeWidthValue] = useState(0);
  const stringCodec = StringCodec();
  const voicepopRef = useRef<any>(null);
  const captureImageRef = useRef<any>(null);
  const {
    transcript,
    interimTranscript,
    finalTranscript,
    resetTranscript,
    isMicrophoneAvailable,
    browserSupportsSpeechRecognition,
    listening,
  } = useSpeechRecognition();
  const listenVoice = (language = listenVoiceLanguage) => {
    SpeechRecognition.startListening({
      continuous: true,
      language,
    });
  };

  const eraseModeToggler = (status: boolean) => {
    if (status) {
      excalidrawAPI?.updateScene({
        appState: {
          currentItemStrokeWidth: 5,
          activeTool: { type: "freedraw", customType: null, lastActiveToolBeforeEraser: { type: "custom", customtype: null }, locked: false },
          currentItemStrokeColor: '#ffffff',
        }
      } as any)
    }
    else {
      excalidrawAPI?.updateScene({
        appState: {
          currentItemStrokeWidth: 0.5,
          currentItemStrokeColor: '#000000',
        }
      })
    }
    setIsEraseModeOn(status);
  }

  const clearCanvasConfirmation = () => {
    confirmDialog({
      message: <div className="w-[24rem] text-left text-red-700 ">Are you sure you want to clear this canvas?</div>,
      header: "Clear canvas",
      className: "justify-center",
      rejectClassName:
        "!bg-white hover:!bg-white  !text-[#363D69] !border-[#363D69] hover:!border-[#363D69]",
      acceptClassName:
        "!bg-red-700 hover:!bg-red-600  active:!bg-red-600 !border-red-700 hover:!border-red-600",

      icon: <TSWarningToastIcon className={`w-14 h-10 text-red-700`} />,
      accept: () => {
        const elements = excalidrawAPI?.getSceneElements();
        let version = excalidrawModule.getSceneVersion(elements);
        const deletedElements: any = elements?.map((item) => {
          version += 1;
          const newItem = excalidrawModule.newElementWith({ ...item, version, versionNonce: nanoid(), updated: new Date().getTime() }, { isDeleted: true })
          return newItem;
        })
        excalidrawAPI?.updateScene({ elements: deletedElements, commitToHistory: true, });
        collabAPI?.syncElements(excalidrawAPI?.getSceneElementsIncludingDeleted()!)

      },
      reject: () => { },
    });
  };
  useEffect(() => {
    setListenVoiceText((prev) =>
      prev === "" ? finalTranscript : prev + " " + finalTranscript
    );
    resetTranscript();
  }, [finalTranscript]);
  useEffect(() => {
    if (tempListenVoiceText !== interimTranscript) {
      setTempListenVoiceText(interimTranscript);
      setIsListeningVoice(true);
      setTimeout(() => {
        setIsListeningVoice(false);
      }, 600);
    }
  }, [interimTranscript]);


  const listenVoiceLanguages = [
    { label: "Arabic", value: "ar-AE" },
    { label: "English", value: "en-GB" },
    { label: "French", value: "fr-CA" },
    { label: "German", value: "de" },
    { label: "Hindi", value: "hi-IN" },
    { label: "Japanese", value: "ja" },
    { label: "Korean", value: "ko" },
    { label: "Malayalam", value: "ml-IN" },
    { label: "Spanish", value: "es-ES" },
  ];

  const closeMenu = () => {
    setMenuOpen(false);
  };

  useOnClickOutside(dropdownRef, closeMenu); // Call the hook

  const { isLoading: bookDataLoading, data: bookData } = useQuery(
    ["getBooksQuery", roomKey, roomId],
    async () => {
      const { data } = await apiClient.get(
        `/whiteboard/book/${roomId}/${roomKey}`
      );
      return data;
    },
    { enabled: !!roomKey && !!roomId }
  );

  const { isLoading: pagesLoading, data: pageList } = useQuery(
    ["getPagesInBoard", bookData],
    async () => {
      const { data } = await apiClient.get(`/whiteboard/page/${bookData.id}`);
      return data;
    },
    { enabled: !!bookData }
  );

  const rightPanelOpenHandler = async () => {
    if (excalidrawAPI) {
      const elements = excalidrawAPI.getSceneElementsIncludingDeleted();
      await collabAPI?.updateRoomToStore(getSyncableElements(elements));
    }
    sidePanelToggler(true);
  };

  const addInitialPage = (thumbImage: any, pageId: any, pageKey: any) => {
    const position =
      Number(Math?.max(...pageList?.map((item: any) => item?.viewPosition))) ||
      0;
    addInitialPageMutation.mutate(
      {
        bookId: bookData?.id,
        pdata: {
          bookId: bookData?.id,
          viewPosition: position >= 0 ? position + 1 : 1,
          pageId,
          pageKey,
          thumbImage,
        },
      },
      {
        onSuccess: (data) => {
          const js = nats?.jetstream();
          const tempconf = {
            isSync: true,
            syncUser: props.userName,
            slideId: data.id,
            scrollX: excalidrawAPI?.getAppState().scrollX,
            scrollY: excalidrawAPI?.getAppState().scrollY,
            zoomValue: excalidrawAPI?.getAppState().zoom.value
          };
          nats?.publish(`wb.${props.roomId}.board.refreshPageList`, Empty);
          js?.publish(`wb.${roomId}.setBoardValue`, stringCodec.encode(JSON.stringify(tempconf)));
          setAddNewPageLoading(false);
        },
        onSettled: () => setAddNewPageLoading(false),
      }
    );
  };

  const addPage = (thumbImage: any, pageId: any, pageKey: any) => {
    const position =
      Number(Math?.max(...pageList?.map((item: any) => item?.viewPosition))) ||
      0;
    addPageMutation.mutate(
      {
        pdata: {
          bookId: bookData?.id,
          viewPosition: position >= 0 ? position + 1 : 1,
          pageId,
          pageKey,
          thumbImage,
        },
      },
      {
        onSuccess: async (data: any) => {
          nats?.publish(`wb.${props.roomId}.board.refreshPageList`, Empty);
          pageList.push(data);
          await changeSlideHandlerSender(currentSlideId, data?.id);
          setAddNewPageLoading(false);
        },
        onSettled: () => setAddNewPageLoading(false),
      }
    );
  };

  type GeometricToolName = "RULER" | "PROTRACTOR" | "GRAPH" | "TRIANGLE";

  const addExcalidrawElement = async (
    elements: NonDeletedExcalidrawElement[],
    name: string
  ) => {
    const sceneElementsIncludingDeleted: any =
      excalidrawAPI?.getSceneElementsIncludingDeleted();
    let version = 1;
    if (
      Array.isArray(sceneElementsIncludingDeleted) &&
      sceneElementsIncludingDeleted.length > 0
    )
      version = sceneElementsIncludingDeleted
        ? Number(
          Math?.max(
            ...sceneElementsIncludingDeleted?.map((item: any) => item.version)
          )
        ) + 1
        : 1;
    switch (name) {
      case "TRIANGLE":

        const element: any = triangleElement({ version, scrollX: 100, scrollY: voiceTextYPosition })
        setVoiceTextYPosition((prev) => prev + 10);
        elements.push(element);
        excalidrawAPI?.scrollToContent(element);
        break;
      default: break;
    }

  }

  const generateGeometricTool = async (
    url: any,
    width: number,
    height: number,
    elements: NonDeletedExcalidrawElement[]
  ) => {
    const sceneElementsIncludingDeleted: any =
      excalidrawAPI?.getSceneElementsIncludingDeleted();
    let version = 1;
    if (
      Array.isArray(sceneElementsIncludingDeleted) &&
      sceneElementsIncludingDeleted.length > 0
    )
      version = sceneElementsIncludingDeleted
        ? Number(
          Math?.max(
            ...sceneElementsIncludingDeleted?.map((item: any) => item.version)
          )
        ) + 1
        : 1;
    const geometricTool = dataURLtoFile(url, Date.now());
    const fileId = await generateIdFromFile(geometricTool);
    elements.push(
      generateImageElement({
        width: width,
        height: height,
        fileId,
        status: "pending",
        version,
      })
    );
    const dataURL = await getDataURL(geometricTool);
    const binaryFileDatas: BinaryFileData = {
      id: fileId,
      created: new Date().getTime(),
      dataURL,
      mimeType: "image/svg+xml",
    };
    excalidrawAPI?.addFiles([binaryFileDatas]);
  };

  const getPdfFileName = (name: string): string => {

    if (name.length > 25)
      return `${name.substring(0, 13)}...${name.slice(-9)}.pdf`
    else
      return `${name}.pdf`

  }
  const addGeometricTool = async (toolName: GeometricToolName) => {
    const elements =
      excalidrawAPI?.getSceneElements() as NonDeletedExcalidrawElement[];
    switch (toolName) {
      case "RULER":
        await generateGeometricTool(rulerDataURL, 972, 144, elements);
        break;
      case "PROTRACTOR":
        await generateGeometricTool(protractorDataURL, 750, 450, elements);
        break;
      case "GRAPH":
        await generateGeometricTool(graphDataURL, 800, 800, elements);
        break;
      case "TRIANGLE":

        await addExcalidrawElement(elements, "TRIANGLE");
        break;

      default:
        break;
    }
    excalidrawAPI?.updateScene({
      elements,
    });
    collabAPI?.syncElements(elements);
    setShowGeometricToolsModal(false);
  };

  const addPdf = async (
    thumbImage: any,
    pageId: any,
    pageKey: any,
    position: number,
    listLength: number,
    pdfLength: number
  ) => {
    addPageMutation.mutate(
      {
        pdata: {
          bookId: bookData?.id,
          viewPosition: position >= 0 ? position + 1 : 1,
          pageId,
          pageKey,
          thumbImage,
        },
      },
      {
        onSuccess: () => {
          nats?.publish(`wb.${props.roomId}.board.refreshPageList`, Empty);
          setAddNewPageLoading(false);
          if (pdfLength == listLength) {
            setPdfUploadingData({ fileName: null, size: null, value: null, isUploading: false })

          }
        },
        onSettled: () => setAddNewPageLoading(false),
      }
    );
  };

  const deletePage = (id: any) => {
    if (pageList?.length > 1) {
      const index = pageList.findIndex((item: any) => item?.id === id);
      const newIndex = index > 0 ? index - 1 : 1;
      deletePageMutation.mutate(id, {
        onSuccess: () => {
          excalidrawAPI?.history.clear();
          nats?.publish(`wb.${props.roomId}.board.refreshPageList`, Empty);

          changeSlideHandlerSenderAfterDelete(
            currentSlideId,
            tempPageList[newIndex]?.id
          );
          setDeleteSlideConfirmation(false);
        },
      });
    }
  };

  const pageSwapDownHandler = (id: any) => {
    if (pageList?.length > 1) {
      const index = pageList.findIndex((item: any) => item?.id === id);

      if (index === pageList?.length - 1) return null;

      const updatePositionArray = [
        {
          id: pageList[index]?.id,
          data: { viewPosition: pageList[index + 1]?.viewPosition },
        },
        {
          id: pageList[index + 1]?.id,
          data: { viewPosition: pageList[index]?.viewPosition },
        },
      ];

      changePagePositionMutation.mutate({ pdata: updatePositionArray });
    }
  };

  const pageSwapUpHandler = (id: any) => {
    if (pageList?.length > 1) {
      const index = pageList.findIndex((item: any) => item?.id === id);

      if (index === 0) return null;

      const updatePositionArray = [
        {
          id: pageList[index]?.id,
          data: { viewPosition: pageList[index - 1]?.viewPosition },
        },
        {
          id: pageList[index - 1]?.id,
          data: { viewPosition: pageList[index]?.viewPosition },
        },
      ];

      changePagePositionMutation.mutate({ pdata: updatePositionArray });
    }
  };

  const pageSwapToFirstHandler = (id: any) => {
    if (pageList?.length > 1) {
      const index = tempPageList?.findIndex((item: any) => item?.id === id);

      if (index === 0) return null;

      const updatePositionArray = tempPageList?.map((item: any) => {
        if (item?.id === id) {
          return { id: item?.id, data: { viewPosition: 0 } };
        } else {
          return {
            id: item?.id,
            data: { viewPosition: item?.viewPosition + 1 },
          };
        }
      });
      changePagePositionMutation.mutate({ pdata: updatePositionArray });
    }
  };

  const pageSwapToLastHandler = (id: any) => {
    if (pageList?.length > 1) {
      const index = pageList.findIndex((item: any) => item?.id === id);

      if (index === pageList?.length - 1) return null;

      const position =
        Number(
          Math?.max(...pageList?.map((item: any) => item?.viewPosition))
        ) || 0;

      const updatePositionArray = [
        {
          id: pageList[index]?.id,
          data: { viewPosition: position > 0 ? position + 1 : 9999 },
        },
      ];

      changePagePositionMutation.mutate({ pdata: updatePositionArray });
    }
  };

  const setSyncBoardWithStudentToggler = (status: boolean) => {
    setSyncBoardWithStudent(status);
    if (collabAPI?.isCollaborating()) {
      collabAPI?.syncBoardData(
        {
          updatedVersion: new Date().getTime(),
          currentSlide: currentSlideId,
          syncBoardWithStudent: status,
          currentSceneId,
        },
        excalidrawAPI?.getSceneElements() || []
      );
    }
  };

  const changeSyncStatus = async (status: boolean) => {
    try {
      const js = nats?.jetstream();
      js?.publish(`wb.${roomId}.changeIsSync`, stringCodec.encode(JSON.stringify({ ...boardConfig, slideId: currentSlideId, isSync: status })))
    }
    catch (err) {
      console.log(err)
    }
  }

  const natsPublish = async (data: any) => {
    const js = nats?.jetstream();
    const encodeData = stringCodec.encode(JSON.stringify(data));
    js?.publish(`wb.${roomId}.changeBoardValue`, encodeData);
  }

  useEffect(() => {
    if (boardConfig && !isSlideChangeLoading) {
      if (boardConfig && (boardConfig?.isSync || mode === "RECORDING") && boardConfig?.syncUser !== props.userName) {
        excalidrawAPI?.updateScene({
          appState: {
            scrollX: boardConfig?.scrollX || 0,
            scrollY: boardConfig?.scrollY || 0,
            zoom: {
              value: boardConfig?.zoomValue || 1
            }
          }
        });

      }
      if ((mode !== "RECORDING") && (prevBoardConfig && (boardConfig?.isSync && prevBoardConfig?.isSync === false) && (currentSlideId !== boardConfig?.slideId) && boardConfig?.syncUser !== props.userName)) {
        const syncEnableHandler = async () => {
          await exportCurrentSlideToBackend();
          await excalidrawAPI?.resetScene();
          await loadFromBackend(boardConfig?.slideId);
          await ChangeSlideHandlerReciver(currentSlideId, boardConfig?.slideId);
        }
        syncEnableHandler();
      } else if (boardConfig && currentSlideId && boardConfig?.slideId && currentSlideId !== boardConfig?.slideId && ((boardConfig?.isSync && prevBoardConfig?.isSync) || (mode === "RECORDING"))) {
        const slideChangeHandler = async () => {
          setIsSlideChangeLoading(true);
          // await exportCurrentSlideToBackend();
          await excalidrawAPI?.resetScene();
          await loadFromBackend(boardConfig?.slideId);
          await ChangeSlideHandlerReciver(currentSlideId, boardConfig?.slideId);
          // setIsSlideChangeLoading(false);
        }
        slideChangeHandler();
      }
      setPrevBoardConfig(boardConfig);
    }
  }, [boardConfig, isSlideChangeLoading])

  const exportCurrentSlideToBackend = async () => {
    const blob = await excalidrawModule?.exportToBlob({
      mimeType: "image/jpeg",
      elements: excalidrawAPI?.getSceneElements(),
      files: excalidrawAPI?.getFiles(),
      appState: excalidrawAPI?.getAppState(),
      maxWidthOrHeight: 145,
      quality: 40,
    });
    var reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async function () {
      var base64data = reader.result;
      if (currentSlideId)
        updatePageMutation.mutate({
          pageId: currentSlideId,
          pdata: { thumbImage: base64data },
        });
    };
  }

  const addText = async (text: string) => {
    const sceneElementsIncludingDeleted: any =
      excalidrawAPI?.getSceneElementsIncludingDeleted();
    let version = 1 + text.length;
    const elements =
      excalidrawAPI?.getSceneElements() as NonDeletedExcalidrawElement[];
    if (
      Array.isArray(sceneElementsIncludingDeleted) &&
      sceneElementsIncludingDeleted.length > 0
    )
      version = sceneElementsIncludingDeleted
        ? Number(
          Math?.max(
            ...sceneElementsIncludingDeleted?.map((item: any) => item.version)
          )
        ) +
        (1 + text.length)
        : 1 + text.length;
    const width = text.length * 12;
    const height = text.split("/n").length * 25 || 25;

    elements.push(
      generateTextElement({
        height,
        width,
        text,
        version,
        yPosition: voiceTextYPosition,
      })
    );
    setVoiceTextYPosition((prev) => prev + height + 10);

    excalidrawAPI?.updateScene({
      elements,
    });
    collabAPI?.syncElements(elements);
  };

  const sidePanelToggler = async (status: boolean) => {
    if (status && excalidrawAPI) {
      const blob = await excalidrawModule?.exportToBlob({
        mimeType: "image/jpeg",
        elements: excalidrawAPI?.getSceneElements(),
        files: excalidrawAPI.getFiles(),
        appState: excalidrawAPI.getAppState(),
        maxWidthOrHeight: 145,
        quality: 40,
      });
      var reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async function () {
        var base64data = reader.result;
        if (currentSlideId)
          updatePageMutation.mutate({
            pageId: currentSlideId,
            pdata: { thumbImage: base64data },
          });
      };
    }
    setShowSlideList(status);
  };

  //mutation to create session
  const updatePageMutation = useMutation(
    async ({ pageId, pdata }: any) => {
      try {
        const { data } = await apiClient.put(`/whiteboard/page/${pageId}`, pdata);
        return data;
      }
      catch (err) {
        queryClient.invalidateQueries(["getPagesInBoard"]);
        console.log(err);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["getPagesInBoard"]);
      },
      onError: () => { },
    }
  );

  const addPageMutation = useMutation(
    async ({ pdata }: any) => {
      const { data } = await apiClient.post(`/whiteboard/page`, pdata);
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["getPagesInBoard"]);
      },
      onError: () => { },
    }
  );

  const addInitialPageMutation = useMutation(
    async ({ pdata, bookId }: any) => {
      const { data } = await apiClient.post(
        `/whiteboard/initialpage/${bookId}`,
        pdata
      );
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["getPagesInBoard"]);
      },
      onError: () => { },
    }
  );

  const changePagePositionMutation = useMutation(
    async ({ pdata }: any) => {
      const { data } = await apiClient.put(`/whiteboard/multiplepages`, pdata);
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["getPagesInBoard"]);
        nats?.publish(`wb.${props.roomId}.board.refreshPageList`, Empty);
      },
      onError: () => { },
    }
  );

  const deletePageMutation = useMutation(
    async (id: any) => {
      const { data } = await apiClient.delete(`/whiteboard/page/${id}`);
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["getPagesInBoard"]);
      },
      onError: () => { },
    }
  );

  const changeSlideHandlerSenderAfterDelete = async (
    slideId: any,
    newSlideId: any
  ) => {
    if (slideId === newSlideId) return null;
    if (excalidrawAPI) {
      setCurrentSlideId(newSlideId);
      setCurrentSlide(newSlideId);
      loadFromBackendOnSlideChange(newSlideId);
      nats?.publish(`wb.${roomId}.slide.deleted`, stringCodec.encode(JSON.stringify({ ...boardConfig, slideId: newSlideId, prevSlideId: slideId, })));
    }
  };

  const changeSlideHandlerSender = async (slideId: any, newSlideId: any) => {
    if (
      slideId === newSlideId ||
      (isViewMode && boardConfig?.isSync) ||
      isSlideChangeLoading
    )
      return null;
    setDeleteSlideConfirmation(false);
    setIsSlideChangeLoading(true);
    setCurrentSlideId(newSlideId);
    setBoardConfig({ ...boardConfig, slideId: newSlideId });
    setCurrentSlide(newSlideId);
    try {
      if (excalidrawAPI) {
        loadFromBackendOnSlideChange(newSlideId);
      }
    } catch (e) {
      setIsSlideChangeLoading(false);
    }
  };

  const ChangeSlideHandlerReciver = async (slideId: any, newSlideId: any) => {
    if (slideId === newSlideId || !pageList) return null;
    {
      setCurrentSlideId(newSlideId);
      setCurrentSlide(newSlideId);
    }
  };

  // const renderTopRightUI = (isMobile: boolean, appState: AppState) => {
  //   return (
  //     <div className="flex gap-2 p-2">
  //       {mode === "RECORDING" && (
  //         // <div className=" items-center absolute right-1 top-1 z-20 shadow p-2 px-2 border rounded opacity-80">
  //         <div>
  //           {/* <div className="font-medium text-slate-500"> Is collaberating : {collabAPI?.isCollaborating() ? "true" : "false"} </div> */}
  //           <div className="font-medium text-slate-500 flex ">
  //             {" "}
  //             <BookOpenIcon className="w-6" /> {getCurrentPagePosition()} of{" "}
  //             {pageList?.length}
  //           </div>
  //         </div>
  //       )}
  //       {mode === "ONLINE" && (
  //         // <div className=" items-center absolute right-1 top-1 z-20 shadow p-2 px-2 border rounded opacity-80">
  //         <div>
  //           {currentSlideId ? (
  //             <div className="font-medium text-slate-500 flex">
  //               {" "}
  //               <BookOpenIcon className="w-6" /> {getCurrentPagePosition()} of{" "}
  //               {pageList?.length}
  //             </div>
  //           ) : (
  //             <div>Loading...</div>
  //           )}
  //         </div>
  //       )}
  //       {/* <PlusIcon className="w-6 cursor-pointer" onClick={() => { setShowGeometricToolsModal(true) }} />
  //     <CameraIcon className="w-6 cursor-pointer" onClick={() => { setShowUploadCamImageModal(true) }} /> */}
  //     </div>
  //   );
  // };

  const onChange = async (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles
  ) => {
    if (isSlideChangeLoading) return null;
    const isEnableZenMode = appState.zenModeEnabled;
    if (isEnableZenMode != isZenModeOn) {
      excalidrawAPI?.updateScene(
        {
          appState: { zenModeEnabled: isZenModeOn }
        }
      )
    }
    if (appState.activeTool.type !== wbActiveTool) {
      if (isEraseModeOn && appState.activeTool.type !== "freedraw") {
        eraseModeToggler(false);
      }
      setWbActiveTool(appState.activeTool.type || '')
    }
    if (strokeWidthValue / 20 !== appState?.currentItemStrokeWidth) {
      setStrokeWidthValue(appState?.currentItemStrokeWidth * 20)
    }
    if (isViewMode && appState.viewModeEnabled === false) {
      excalidrawAPI?.updateScene({
        appState: {
          scrollX: prevAppState.current?.scrollX ?? appState.scrollX,
          scrollY: prevAppState.current?.scrollY ?? appState.scrollY,
          viewModeEnabled: true,
        },
      });
    }

    if (appState.zoom?.value < 0.5) {
      excalidrawAPI?.updateScene({
        appState: {
          scrollX: prevAppState.current?.scrollX ?? appState.scrollX,
          scrollY: prevAppState.current?.scrollY ?? appState.scrollY,
          zoom: { value: 0.5 as any },
        },
      });
    }
    if ((props.userName === boardConfig?.syncUser) && ((prevAppState.current?.scrollX !== appState.scrollX) || (prevAppState.current?.zoom.value !== appState.zoom.value) || (prevAppState.current?.scrollY !== appState.scrollY))) {
      natsPublish({
        ...boardConfig,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        zoomValue: appState.zoom?.value
      })


    }
    prevAppState.current = appState;

    if (
      collabAPI?.isCollaborating() &&
      (collabAPI?.getBoardData()?.syncBoardWithStudent ||
        collabAPI?.getBoardData()?.currentSlide === currentSlideId)
    ) {
      collabAPI.syncElements(elements);
    }
  };


  async function newPageHandler() {
    try {
      if (excalidrawAPI) {
        if (addNewPageLoading) return null;
        // export current page to bakend
        setAddNewPageLoading(true);

        const result = await exportToBackend(
          excalidrawModule,
          [],
          excalidrawAPI.getAppState(),
          {},
          roomKey!
        );
        if (result && result.id && result.key) {
          const blob = await excalidrawModule?.exportToBlob({
            mimeType: "image/jpeg",
            elements: [],
            files: [],
            appState: excalidrawAPI.getAppState(),
            maxWidthOrHeight: 145,
            quality: 40,
          });

          var reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async function () {
            var base64data = reader.result;
            try {
              addPage(base64data, result.id, result.key);
            } catch (err) {
              setAddNewPageLoading(false);
            }
          };
        }
      }
    } catch (e) {
      setAddNewPageLoading(false);
    }
  }

  async function initialPageHandler() {
    try {
      if (excalidrawAPI) {
        if (addNewPageLoading) return null;
        // export current page to bakend
        setAddNewPageLoading(true);
        const result = await exportToBackend(
          excalidrawModule,
          [],
          excalidrawAPI.getAppState(),
          {},
          roomKey!
        );
        if (result && result.id && result.key) {
          const blob = await excalidrawModule?.exportToBlob({
            mimeType: "image/jpeg",
            elements: [],
            files: [],
            appState: excalidrawAPI.getAppState(),
            maxWidthOrHeight: 145,
            quality: 40,
          });

          var reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async function () {
            var base64data = reader.result;
            try {
              addInitialPage(base64data, result.id, result.key);
            } catch (err) {
              setAddNewPageLoading(false);
            }
          };
        }
      }
    } catch (e) {
      setAddNewPageLoading(false);
    }
  }

  const loadFromBackend = async (slideId: any) => {
    try {
      const { data: page } = await apiClient.get(`/whiteboard/pageById/${slideId}`);
      if (!page) return console.log(`Page with ${slideId} not found in DB `)
      const { pageId: id, pageKey: key } = page;
      await excalidrawAPI?.resetScene();
      excalidrawAPI?.refresh();
      setCurrentSceneId(id);
      collabAPI
        ?.loadSceneFromRoom(id, key, {
          currentSlide: slideId,
          updatedVersion: new Date().getTime(),
          syncBoardWithStudent,
          currentSceneId: id,
        })
        .then(async () => {
          setIsSlideChangeLoading(false)
        })
    }
    catch (err) {
      console.log(err)
    }
  }

  const loadFromBackendOnSlideChange = async (slideId: any) => {
    if (!pageList || !slideId) return null;
    const { pageId: id, pageKey: key } = pageList?.find(
      (item: any) => item.id === slideId
    );
    await excalidrawAPI?.resetScene();
    setCurrentSceneId(id);
    collabAPI
      ?.loadSceneFromRoom(id, key, {
        currentSlide: slideId,
        updatedVersion: new Date().getTime(),
        syncBoardWithStudent,
        currentSceneId: id,
      })
      .then(async () => {
        if (collabAPI?.isCollaborating()) {
          // collabAPI?.syncBoardData(
          //   {
          //     updatedVersion: new Date().getTime(),
          //     currentSlide: slideId,
          //     syncBoardWithStudent,
          //     currentSceneId: id,
          //   },
          //   excalidrawAPI?.getSceneElements()!
          // );
          const js = nats?.jetstream();
          await js?.publish(`wb.${roomId}.slideChange`, stringCodec.encode(JSON.stringify({ ...boardConfig, slideId })));
        }
        setIsSlideChangeLoading(false);
      })
      .catch((err) => {
        setIsSlideChangeLoading(false);
      });

  };

  const [isViewMode, setIsViewMode] = useState<boolean>(
    !isPresenter && !isHost
  );

  const firstRoomInitializer = (callback: any) => {
    if (!pagesLoading && pageList?.length > 0) {
      setCurrentSlideId(pageList[0]?.id);
      setCurrentSlide(pageList[0]?.id);
      const { pageId: id, pageKey: key } = pageList?.find(
        (item: any) => item.id === pageList[0]?.id
      );
      callback(id, key, {
        currentSlide: pageList[0]?.id,
        updatedVersion: new Date().getTime(),
        syncBoardWithStudent,
        currentSceneId: id,
      });
    }
  };

  const getCurrentPagePosition = (): any =>
    pageList?.findIndex((item: any) => item?.id === currentSlideId) + 1;

  const dataURLtoFile = (dataurl: any, filename: any) => {
    var arr = dataurl.split(",");
    var mime = arr[0].match(/:(.*?);/)[1];
    var bstr = atob(arr[1]);
    var n = bstr.length;
    var u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const uploadHandler = (e: any) => {
    try {
      const fileType = e.target.files[0].type;
      if (!fileType || (fileType && !fileType.toLowerCase().includes('pdf')))
        return toast.current.show({
          severity: "error",
          summary: "Upload Error",
          detail: "Only PDF should be uploaded!",
          life: 3000,
        });
      let count = 0;
      if (excalidrawAPI) {
        const fileReader = new FileReader();
        let file = e.target.files[0];
        const size = `${Math.round(file.size / (1024 * 1024))} mb `;
        const fullName = file.name;
        const name = fullName.split('.')[0];
        const fileName = getPdfFileName(name);
        setPdfUploadingData((prev) => { return { ...prev, value: 2, size, fileName, isUploading: true } });

        const position =
          Number(
            Math?.max(...pageList?.map((item: any) => item?.viewPosition))
          ) || 0;
        setAddNewPageLoading(true);
        fileReader.onload = (ev) => {
          pdfjsLib
            .getDocument(fileReader.result as Buffer)
            .promise.then(async (pdf: pdfjsLib.PDFDocumentProxy) => {
              const tasks = [];
              const pdfPages: any = [];
              for (var i = 1; i <= pdf.numPages; i++) {
                const page: pdfjsLib.PDFPageProxy = await pdf.getPage(i);
                var desiredWidth = 800;
                var tempviewport = page.getViewport({ scale: 1 });
                var scale = desiredWidth / tempviewport.width;
                var viewport = page.getViewport({ scale: scale });
                var canvas: any = Canvas.createCanvas(
                  viewport.width,
                  viewport.height,
                  "pdf"
                );
                var context: any = canvas.getContext("2d");
                var task = page.render({
                  canvasContext: context,
                  viewport: viewport,
                });
                tasks.push({ task, canvas, viewport, position: position + i } as any);
              }
              Promise.all(
                tasks.map(({ task, canvas, viewport, position }: any) => {
                  task.promise.then((promise: any) => {
                    let pageFile = dataURLtoFile(
                      canvas.toDataURL("image/png"),
                      file.name.split(".pdf")[0] + "page_no" + i
                    );
                    getDataURL(pageFile).then((dataURL: DataURL) => {
                      generateIdFromFile(pageFile).then((fileId: FileId) => {
                        const height = viewport.height;
                        const width = viewport.width;
                        const binaryFileDatas: BinaryFileData = {
                          id: fileId,
                          created: new Date().getTime(),
                          dataURL,
                          mimeType: pageFile.type as any,
                        };
                        const binaryFiles: BinaryFiles = {};
                        binaryFiles[fileId] = binaryFileDatas;
                        excalidrawAPI.addFiles([binaryFileDatas])
                        const sceneElementsIncludingDeleted: any =
                          excalidrawAPI?.getSceneElementsIncludingDeleted();
                        let version = 1;
                        if (
                          Array.isArray(sceneElementsIncludingDeleted) &&
                          sceneElementsIncludingDeleted.length > 0
                        )
                          version = sceneElementsIncludingDeleted
                            ? Number(
                              Math?.max(
                                ...sceneElementsIncludingDeleted?.map(
                                  (item: any) => item.version
                                )
                              )
                            ) + 1
                            : 1;
                        exportToBackend(
                          excalidrawModule,
                          [
                            generateImageElement({
                              width,
                              height,
                              fileId,
                              version,
                            }),
                          ],
                          excalidrawAPI.getAppState(),
                          binaryFiles,
                          roomKey!
                        ).then(
                          async (
                            result:
                              | {
                                id: string;
                                key: string;
                              }
                              | undefined
                          ) => {
                            if (result && result.id && result.key) {


                              var base64data = blankPageBase64;
                              try {
                                pdfPages.push({
                                  thumbImage: base64data,
                                  pageId: result.id,
                                  pageKey: result.key,
                                  position: position,
                                });
                                await addPdf(
                                  base64data,
                                  result.id,
                                  result.key,
                                  position,
                                  pdfPages.length,
                                  pdf.numPages
                                );
                                count += 1;
                                const value = Math.floor(((count) / tasks.length) * 100);
                                setPdfUploadingData((prev) => { return { ...prev, value: value > 2 ? value : 2 } });

                              } catch (err) {
                                setAddNewPageLoading(false);
                              }

                            }
                          }
                        );
                      });
                    });
                  });

                })
              );
            })

        };
        setPdfUploadingData((prev) => { return { ...prev, value: 2 } })

        fileReader.readAsArrayBuffer(file);
        setAddNewPageLoading(false);

      }
    } catch (e) {
      setAddNewPageLoading(false);
    }
  };

  const downloadPdfHandler = () => {
    if (excalidrawAPI && pageList.length > 0) {
      setPdfFileDownloading(true);
      let pages: any = [];
      const doc = new jsPDF("l", "pt");
      doc.setLineWidth(1.5);
      doc.line(30, 1000, 30, 30, "S");

      doc.setProperties({
        title: roomId + " - " + DateTime.now().toFormat("yyyy LLL dd hh:mm a"),
        subject: `${roomId}-pages`,
        author: `whiteboard`,
        creator: room?.localParticipant.identity,
      });
      doc.deletePage(1);
      const test = async () => {
        for (let i = 0; i <= pageList.length; i++) {
          var page = pageList[i];

          const data = await loadScene(
            excalidrawModule,
            page?.pageId!,
            page?.pageKey!,
            {
              appState: prevAppState?.appState,
            }
          );
          const binaryFiles = await collabAPI?.fetchAllImageFilesFromFirebase({
            elements: data.elements,
          });
          const blob = await excalidrawModule?.exportToBlob({
            mimeType: "image/jpeg",
            elements: data.elements,
            files: binaryFiles,
            appState: data.appState,
            quality: 95,
          });
          let reader = new FileReader();
          reader.readAsDataURL(blob);
          const getImageDimensions = async (base64Image: string) => {
            const img = new Image();
            img.src = base64Image;
            await img.onload;
            return {
              width: img.width,
              height: img.height
            };
          }
          reader.onloadend = async function () {

            pages.push({
              result: reader?.result,
              position: page?.viewPosition,
            });
            const { width: imageWidth, height: imageHeight } = await getImageDimensions(reader?.result as string);
            const width = imageWidth > 900 ? imageWidth : 900;
            const height = imageHeight > 900 ? imageHeight : 900;
            doc.addPage([height + 100, width + 100], height >= width ? 'p' : 'l');
            doc.addImage(reader.result as string, 50, 50, imageWidth, imageHeight);
            doc.text(
              `${bookData?.client?.prefix || "CONNECT"}-${roomId}`,
              20,
              height + 90
            );
            doc.text(DateTime.now().toFormat("dd LLL yyyy hh:mm a"), (width / 2), height + 90);
            doc.text(`Page ${i}`, width + 30, height + 90);
            doc.setLineWidth(0.5);
            doc.line(0, height + 65, width + 100, height + 65);
          };
        }
      };
      test()
        .then(() => {
          doc.save(`${bookData?.client?.prefix || "CONNECT"}_${roomId}`);
        })
        .finally(() => setPdfFileDownloading(false));
    }
  };

  function useOutSideClickHandler(ref: any) {
    useEffect(() => {
      function handleClicked(event: any) {
        if (ref.current && !ref.current.contains(event.target)) {
          sidePanelToggler(false);
        }
      }
      document.addEventListener("mousedown", handleClicked);
      return () => {
        document.removeEventListener("mousedown", handleClicked);
      };
    }, [ref]);
  }
  useOutSideClickHandler(slideListRef);

  function useOnClickOutside(ref: any, handler: any) {
    useEffect(() => {
      const listener = (event: any) => {
        if (!ref.current || ref.current.contains(event.target)) {
          return;
        }
        handler(event);
      };
      document.addEventListener("mousedown", listener);
      return () => {
        document.removeEventListener("mousedown", listener);
      };
    }, [ref, handler]);
  }
  function Menu() {
    return (
      <>
        <div className="flex flex-row  bg-[#363D69]  cursor-pointer rounded-[36px] shadow-md h-[32px]">
          <Tooltip target="#triangle" position="top" className="">
            <div>Triangle</div>
          </Tooltip>
          <div
            id="triangle"
            className="ml-3 p-1.5 h-8 hover:bg-[#363D69]"
            onClick={() => addGeometricTool("TRIANGLE")}
          >
            <TTriangleIcon />
          </div>
          <Tooltip target="#ruler" position="top" className="">
            <div>Ruler</div>
          </Tooltip>
          <div
            id="ruler"
            className="mr-1 p-1.5 h-8 hover:bg-[#363D69]"
            onClick={() => {
              addGeometricTool("RULER");
            }}
          >
            <TRulerIcon />
          </div>
          <Tooltip target="#protractor" position="top" className="">
            <div>Protractor</div>
          </Tooltip>
          <div
            id="protractor"
            className="mr-3 p-1.5 cursor-pointer h-8 hover:bg-[#363D69]"
            onClick={() => addGeometricTool("PROTRACTOR")}
          >
            <TProtractorIcon />
          </div>
          <Tooltip target="#graph" position="top" className="">
            <div>Graph</div>
          </Tooltip>
          <div
            id="graph"
            className="mr-1 p-1.5 h-8 hover:bg-[#363D69]"
            onClick={() => addGeometricTool("GRAPH")}
          >
            <TGraphIcon />
          </div>



        </div>
      </>
    );
  }
  const webcamRef: any = useRef(null);
  const addScreenshotToBoard = async (e: any) => {
    const elements =
      excalidrawAPI?.getSceneElements() as NonDeletedExcalidrawElement[];
    const screenshotFile = dataURLtoFile(screenShotImage, Date.now());
    const fileId = await generateIdFromFile(screenshotFile);
    const sceneElementsIncludingDeleted: any =
      excalidrawAPI?.getSceneElementsIncludingDeleted();
    let version = 1;
    if (
      Array.isArray(sceneElementsIncludingDeleted) &&
      sceneElementsIncludingDeleted.length > 0
    )
      version = sceneElementsIncludingDeleted
        ? Number(
          Math?.max(
            ...sceneElementsIncludingDeleted?.map((item: any) => item.version)
          )
        ) + 1
        : 1;
    elements.push(
      generateImageElement({
        width: 400,
        height: 220,
        fileId,
        status: "pending",
        version,
      })
    );
    const binaryFileDatas: BinaryFileData = {
      id: fileId,
      created: new Date().getTime(),
      dataURL: screenShotImage!,
      mimeType: "image/jpeg",
    };
    const binaryFiles: BinaryFiles = {};
    binaryFiles[fileId] = binaryFileDatas;
    excalidrawAPI?.updateScene({
      elements,
    });
    excalidrawAPI?.addFiles([binaryFileDatas]);
    setScreenShotImage(null);
    captureImageRef.current.toggle(e);
    collabAPI?.syncElements(elements);
  };
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setScreenShotImage(imageSrc);
  }, [webcamRef]);

  const [deviceId, setDeviceId] = useState({});
  const [devices, setDevices]: any = useState([]);
  const [deviceNum, setDeviceNum] = useState(0);
  const [wbActiveTool, setWbActiveTool] = useState('');

  const handleDevices = useCallback(
    (mediaDevices: any) =>
      setDevices(
        mediaDevices
          .filter(({ kind }: any) => kind === "videoinput")
          .map((item: MediaDeviceInfo) => item.toJSON())
      ),

    [setDevices]
  );



  useEffect(() => {
    navigator?.mediaDevices.enumerateDevices().then(handleDevices);
  }, [handleDevices]);

  const [videoDevice, setVideoDevice]: any = useState();

  useEffect(() => {
    if (nats && bookData)
      try {
        const s1 = nats?.subscribe(`wb.${props.roomId}.board.refreshPageList`);
        (async (data) => {
          for await (const m of data!) {
            queryClient.invalidateQueries(["getPagesInBoard", bookData])
          }
        })(s1);
      } catch (err) {
        console.log(err)
      }
  }, [nats, bookData]);

  useEffect(() => {
    import("@excalidraw/excalidraw").then((module) => {
      setExcalidrawModule(module);
    });
  }, []);

  useEffect(() => {
    const natsListener = async () => {
      try {
        const s1 = nats?.subscribe(`wb.${props.roomId}.slide.deleted`);
        (async (data) => {
          for await (const m of data!) {
            const boardTemp = stringCodec.decode(m.data);
            const slideChangeHandler = async () => {
              if (!boardTemp)
                return null;
              const boardData = JSON.parse(boardTemp);
              if (!boardData?.isSync && currentSlideId && currentSlideId === boardData?.prevSlideId) {
                await queryClient.invalidateQueries(["getPagesInBoard", bookData]);
                await excalidrawAPI?.resetScene();
                await loadFromBackend(boardData?.slideId);
                if (boardData?.slideId) {
                  setCurrentSlideId(boardData?.slideId);
                  setCurrentSlide(boardData?.slideId);
                }

              }

            }
            slideChangeHandler();
            m.respond();
          }
        })(s1);
      }
      catch (err) { console.log(err) }
    }
    if (nats && currentSlideId)
      natsListener();
  }, [nats, currentSlideId]);
  useEffect(() => {
    if (currentSlideId === null && currentSlide && !!collabAPI && !!pageList && !!excalidrawAPI) {
      try {
        setCurrentSlideId(currentSlide);
        const { pageId: id, pageKey: key } = pageList?.find(
          (item: any) => item.id === currentSlide
        );
        collabAPI
          ?.loadSceneFromRoom(id, key, {
            currentSlide: currentSlide,
            updatedVersion: new Date().getTime(),
            syncBoardWithStudent,
            currentSceneId: id,
          })
        collabAPI?.startCollaboration({ roomId, roomKey });

      }
      catch (e) { console.log("err :-", e) }
    }
  }, [pageList, collabAPI, excalidrawAPI]);

  useEffect(() => {
    setTempPageList(pageList);
    if (!!excalidrawAPI && pageList?.length === 0 && !addNewPageLoading && isHost)
      initialPageHandler();
  }, [pageList, excalidrawAPI]);

  useEffect(() => {
    if (
      !!collabAPI &&
      !bookDataLoading &&
      !pagesLoading &&
      !collabAPI?.isCollaborating() &&
      pageList?.length > 0
    ) {
      collabAPI?.startCollaboration({
        roomId: roomId!,
        roomKey: roomKey!,
      });
    }
  }, [bookDataLoading, pagesLoading, collabAPI]);

  useEffect(() => {
    const isViewMode = !isPresenter && !isHost;
    setIsViewMode(isViewMode);
    if (excalidrawAPI) {
      excalidrawAPI?.updateScene({
        appState: { viewModeEnabled: isViewMode },
      });
    }
  }, [isPresenter, isHost]);

  useEffect(() => {
    const PdfjsWorker = new Worker(
      new URL("pdfjs-dist/legacy/build/pdf.worker", import.meta.url)
    );
    pdfjsLib.GlobalWorkerOptions.workerPort = PdfjsWorker;
  }, []);

  return (
    <div className="whiteboard">
      <Toast ref={toast} />
      <Dialog
        visible={pdfUploadingData.isUploading}
        onHide={() => {
          setPdfUploadingData({ fileName: null, size: null, value: null, isUploading: false })

        }}
        className="whiteboard-css !bg-transparent"
        contentClassName="!p-0 !bg-white  !rounded-[20px] overflow-hidden"
        showHeader={false}
        draggable={false}
        breakpoints={{ "960px": "75vw" }}
        style={{ width: "400px", height: '180px' }}
      >
        <div className="w-full  ">
          <div className="h-12 bg-slate-50 border-b-2 border-slate-300 border-solid flex items-center justify-center text-lg font-semibold text-slate-500">
            Uploading...
          </div>
          <div className="flex justify-start items-center  gap-4 p-5 ">
            <div><TPdfIcon /></div>
            <div className="w-full ">
              <div className="text-slate-500 font-medium flex items-center justify-start ">
                {pdfUploadingData?.fileName || ''}

              </div>
              <div className="text-slate-500 text-xs font-thin  flex items-center justify-between">
                <div>
                  {pdfUploadingData?.size || ''}
                </div>

              </div>
              <div className="mt-4 flex justify-center">  {pdfUploadingData?.value ? <ProgressBar value={pdfUploadingData?.value || 0} className="w-40 h-6" ></ProgressBar> : <ProgressSpinner className="w-6 h-6" />}</div>

            </div>
          </div>
          <div>

          </div>
        </div>
      </Dialog>


      <Dialog
        visible={pdfFileDownloading}
        onHide={() => {
          setPdfFileDownloading(false);
        }}
        className="whiteboard-css !bg-transparent"
        contentClassName="!p-0 !bg-white  !rounded-[20px] overflow-hidden"
        showHeader={false}
        draggable={false}
        breakpoints={{ "960px": "75vw" }}
        style={{ width: "400px", height: '150px' }}
      >
        <div className="w-full  ">
          <div className="h-12 bg-slate-50 border-b-2 border-slate-300 border-solid flex items-center justify-center text-lg font-semibold text-slate-500">
            Downloading...
          </div>
          <div className="flex justify-between items-center  gap-4 p-5 mt-3 ">
            <div className="flex gap-4 justify-start"><div><TPdfIcon /></div>
              <div className="text-slate-500 font-medium flex items-center justify-start ">
                {getPdfFileName(`${bookData?.client?.prefix || "CONNECT"}_${roomId}`)}

              </div></div>
            <div className="text-slate-500 text-xs font-thin  flex items-center justify-end">

              <div >   <ProgressSpinner className="w-6 h-6" /></div>

            </div>
          </div>
          <div>

          </div>
        </div>
      </Dialog>




      <Dialog
        visible={showGeometricToolsModal}
        onHide={() => setShowGeometricToolsModal(false)}
        contentClassName=""
        header="Geometric Tools"
        className="!shadow-none"
        showHeader={true}
        draggable={false}
        style={{}}
      >
        <div className="flex flex-wrap gap-4 p-4 w-96 justify-around">
          <div
            className="w-16 rounded h-12 bg-slate-100 hover:bg-slate-200 cursor-pointer justify-center text-center items-center font-semibold"
            onClick={() => addGeometricTool("RULER")}
          >
            <img src={rulerDataURL} className="w-20 h-12 mb-2" />
            Ruler
          </div>
          <div
            className="w-16 rounded h-12 bg-slate-100 hover:bg-slate-200 cursor-pointer justify-center text-center items-center font-semibold "
            onClick={() => addGeometricTool("PROTRACTOR")}
          >
            <img src={protractorDataURL} className="w-20 h-12 mb-2" />
            Protractor
          </div>
          <div
            className="w-16 rounded h-12 bg-slate-100 hover:bg-slate-200 cursor-pointer justify-center text-center items-center font-semibold "
            onClick={() => addGeometricTool("GRAPH")}
          >
            <img src={graphDataURL} className="w-20 h-12 mb-2" />
            Graph
          </div>
        </div>
      </Dialog>
      {excalidrawModule ? (
        <div className="h-[calc(100vh-88px)] relative">
          <div className={`flex  items-center absolute right-1 ${!isViewMode ? ' bottom-24  md:bottom-24  lg:bottom-0' : 'bottom-0'} z-10 p-2 `}>
            <div className="flex gap-2 p-2">
              {mode === "RECORDING" && (
                <div>
                  <div className="font-medium text-slate-500 flex ">
                    {" "}
                    <BookOpenIcon className="w-6 mr-1" /> {getCurrentPagePosition()}{" "}
                    of {pageList?.length}
                  </div>
                </div>
              )}
              {mode === "ONLINE" && (
                <div className="">
                  {currentSlideId ? (
                    <div className="font-medium text-slate-500 flex ">
                      {" "}
                      <BookOpenIcon className="w-6 mr-1" />{" "}
                      {getCurrentPagePosition()} of {pageList?.length}
                    </div>
                  ) : (
                    <div className="font-semibold text-slate-500 tracking-widest">Page Loading...</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {mode === "ONLINE" && (
            <div className="flex gap-3 items-center absolute right-1 lg:left-1 lg:right-auto lg:flex-row-reverse  lg:top-1 lg:bottom-auto bottom-16  z-20 p-2 align-middle">



              {

                (wbActiveTool !== '' &&
                  wbActiveTool !== 'selection' &&
                  wbActiveTool !== 'text' &&
                  wbActiveTool !== 'image') &&
                <div className="items-center gap-2 mr-1">
                  <Tooltip target="#stroke-slider" position="top" className="">
                    <div>{strokeWidthValue / 4}</div>
                  </Tooltip>
                  <Slider id="stroke-slider" value={strokeWidthValue} onChange={(e) => {
                    const val: any = e.value;
                    setStrokeWidthValue(Number(val)); excalidrawAPI?.updateScene({ appState: { currentItemStrokeWidth: Number(val) / 20 } })
                  }} min={4} max={60} className="w-20 rounded" />
                  <div className="text-slate-400 text-xs font-semibold mt-2.5 text-center">Stroke Width</div>
                </div>
              }

              {!isViewMode && <>  {isEraseModeOn ?
                <div className=""
                  onClick={() => eraseModeToggler(false)}
                >
                  <Tooltip target="#eraseOffBtn" position="top" className="">
                    <div>Turn off erase mode</div>
                  </Tooltip>
                  <span id="eraseOffBtn" className="cursor-pointer"><TEraseModeOffIcon /></span>

                </div>

                : <div className=""
                  onClick={() => eraseModeToggler(true)}
                >
                  <Tooltip target="#eraseOnBtn" position="top" className="">
                    <div>Turn on erase mode</div>
                  </Tooltip>
                  <span id="eraseOnBtn" className="cursor-pointer"><TEraseModeOnIcon /></span>
                </div>}</>}

              {
                !isViewMode && <>

                  <Tooltip target="#clearCanvas" position="top" className="">
                    <div>Clear Canvas</div>
                  </Tooltip>
                  <div
                    id="clearCanvas"
                    className="bg-red-500 hover:bg-red-500 cursor-pointer rounded-full flex justify-center items-center w-8 h-8 shadow-md "
                    onClick={() => clearCanvasConfirmation()}
                  >
                    <TSlideTrash />
                  </div>
                </>
              }
              {!isViewMode && (
                <>
                  {isMenuOpen ? (
                    <div className="flex flex-row h-8  ">
                      <div
                        className="flex !bg-[#363D69] hover:bg-[#363D69] cursor-pointer rounded-[36px] pr-2.5 shadow-md"
                        onClick={() => setMenuOpen(false)}
                      >
                        <div ref={dropdownRef} className="mr-2">
                          <Menu />
                        </div>
                        <div className="flex align-center">
                          <EllipsisVerticalIcon className="w-5 ml-1 text-[#6E759F]"/>
                          <TActiveTool className={`text-[#6E759F]`} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      id="toolbox"
                      className={`flex h-8 bg-[#363D69] 200 hover:bg-[#363D69] cursor-pointer rounded-[36px] pr-2.5 shadow-md`}
                      onClick={() => setMenuOpen(true)}
                    >
                      <Tooltip target="#toolbox" position="top" className="">
                        <div>Toolbox</div>
                      </Tooltip>
                      <EllipsisVerticalIcon className="w-5 ml-1 text-[#ffffff]"/>
                      <TActiveTool className={`text-white`} />
                    </div>
                  )}

                  <OverlayPanel
                    ref={captureImageRef}
                    dismissable
                    className="w-[450px] bg-[#5F6695] overflow-hidden h-[19.5rem] bg-none"
                    style={{ border: "1px solid #EEE" }}
                  >
                    {screenShotImage === null && (
                      <div className="bg-[#5F6695] p-4 w-full text-center text-slate-700">
                        <div className="flex flex-col justify-center gap-4">
                          <div className="flex justify-center w-full h-full">
                            <Webcam
                              audio={false}
                              mirrored={true}
                              height={300}
                              ref={webcamRef}
                              screenshotFormat="image/jpeg"
                              minScreenshotHeight={300}
                              className="rounded  overflow-hidden w-[420px] bg-white h-[200px]"
                              videoConstraints={{
                                deviceId: devices[deviceNum]?.deviceId,
                                width: 565,
                                height: 300,
                                facingMode: "user",
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex justify-center mt-3 gap-4">
                          <Button
                            label="Capture"
                            onClick={capture}
                            className="rounded-full h-8 !bg-[#202548] hover:!bg-[#202548] hover:!border-[#202548] !border-[#202548]"
                          />
                          {devices?.length > 1 && (
                            <ArrowPathIcon
                              className="w-6 cursor-pointer"
                              onClick={() => {
                                setDeviceNum((prev) => {
                                  if (prev === devices?.length - 1) {
                                    return 0;
                                  } else {
                                    return prev + 1;
                                  }
                                });
                              }}
                            />
                          )}
                        </div>
                      </div>
                    )}
                    {screenShotImage !== null && (
                      <div className="bg-[#5F6695] p-4 w-full text-center text-slate-700">
                        <NextImage
                          src={screenShotImage}
                          alt="screenshot"
                          height={300}
                          width={530}
                          className="rounded"
                        />

                        <div className="flex gap-4 justify-center mt-2 ">
                          <Button
                            label="Add to board"
                            onClick={addScreenshotToBoard}
                            className="rounded-full h-8 !bg-[#202548] hover:!bg-[#202548] hover:!border-[#202548] !border-[#202548]"
                          />
                          <Button
                            label="Clear"
                            className="p-button-outlined rounded-full h-8 "
                            onClick={() => {
                              setScreenShotImage(null);
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </OverlayPanel>

                  <Tooltip target="#camera" position="top" className="">
                    <div>Capture Image</div>
                  </Tooltip>
                  <div
                    id="camera"
                    className="bg-[#363D69] hover:bg-[#363D69] cursor-pointer rounded-full flex justify-center items-center w-8 h-8 shadow-md "
                    onClick={(e: any) => {
                      setScreenShotImage(null);
                      captureImageRef.current.toggle(e);
                    }}
                  >
                    <TSWhiteboardCaptureIcon className="text-[#FFFFFF]" />
                  </div>

                  <OverlayPanel
                    ref={voicepopRef}
                    dismissable
                    className={`${isMicrophoneAvailable && browserSupportsSpeechRecognition
                      ? "w-[500px]"
                      : "max-w-[300px]"
                      } bg-[#5F6695] min-h-10 rounded-[10px] `}
                    style={{ border: "1px solid #EEE" }}
                  >
                    {isMicrophoneAvailable &&
                      browserSupportsSpeechRecognition ? (
                      <div className="p-2 rounded ">
                        <div className="flex justify-between items-center">
                          <div className="whiteboard-css">
                            <Dropdown
                              value={listenVoiceLanguage}
                              options={listenVoiceLanguages}
                              onChange={(e:any) => {
                                setListenVoiceLanguage(e.value);
                                resetTranscript();
                                listenVoice(e.value);
                              }}
                              placeholder="Select language"
                              className="!h-10 placeholder:text-slate-400  "
                            />
                          </div>
                          <div className="flex justify-end items-center">
                            {isListeningVoice ? (
                              <div
                                className="relative  boxContainer-bg"
                                id="bars"
                              >
                                <div className="box !bg-red-600 box1"></div>
                                <div className="box !bg-red-600 box2"></div>
                                <div className="box !bg-red-600 box3"></div>
                                <div className="box !bg-red-600 box4"></div>
                                <div className="box !bg-red-600 box5"></div>
                                <div className="box !bg-red-600 box4"></div>
                                <div className="box !bg-red-600 box3"></div>
                                <div className="box !bg-red-600 box2"></div>
                                <div className="box !bg-red-600 box1"></div>
                                <div className="box !bg-red-600 box2"></div>
                              </div>
                            ) : (
                              <div className="  flex gap-[2px]">
                                <div className=" bg-red-600 min-w-[2px] min-h-[2px]"></div>
                                <div className=" bg-red-600 min-w-[2px] min-h-[2px]"></div>
                                <div className=" bg-red-600 min-w-[2px] min-h-[2px]"></div>
                                <div className=" bg-red-600 min-w-[2px] min-h-[2px]"></div>
                                <div className=" bg-red-600 min-w-[2px] min-h-[2px]"></div>
                                <div className=" bg-red-600 min-w-[2px] min-h-[2px]"></div>
                                <div className=" bg-red-600 min-w-[2px] min-h-[2px]"></div>
                                <div className=" bg-red-600 min-w-[2px] min-h-[2px]"></div>
                                <div className=" bg-red-600 min-w-[2px] min-h-[2px]"></div>
                                <div className=" bg-red-600 min-w-[2px] min-h-[2px]"></div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="text-slate-50 min-h-[2.5rem] ">
                            {transcript}
                          </div>
                          <InputTextarea
                            className={`w-full h-full placeholder:text-slate-400 placeholder:text-sm custom-scrollbar`}
                            placeholder="Say something... "
                            value={listenVoiceText}
                            onChange={(e) => {
                              setListenVoiceText(e.target.value);
                            }}
                            onClick={() => {
                              SpeechRecognition.stopListening();
                              resetTranscript();
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-end mt-4 gap-3 mr-1">
                          {
                            listening ? (
                              <div
                                className="cursor-pointer "
                                onClick={() => {
                                  SpeechRecognition.stopListening();
                                  resetTranscript();
                                }}
                              >
                                <TSWhiteboardVoicetoTextPause className="text-[#EA4335]" />
                              </div>
                            ) : (
                              <div
                                onClick={() => {
                                  listenVoiceLanguage &&
                                    SpeechRecognition.startListening({
                                      continuous: true,
                                      language: listenVoiceLanguage,
                                    });
                                }}
                                className={`h !p-0 !border-0 hover:!border-0 !bg-transparent hover:!bg-transparent active:!bg-transparent ${!listenVoiceLanguage
                                  ? "cursor-not-allowed"
                                  : "cursor-pointer"
                                  } `}
                              >
                                <TSWhitboardSpeechtoTextStart />
                              </div>
                            )
                            // <Button
                            //   onClick={() => {
                            //     listenVoiceLanguage &&
                            //     SpeechRecognition.startListening({
                            //       continuous: true,
                            //       language: listenVoiceLanguage
                            //     })
                            //   }}
                            //   disabled={!listenVoiceLanguage ? true : false}
                            //   icon={
                            //   <div>
                            //     <img src="/assets/images/speechtotext-start.svg"
                            //         alt="border"
                            //         className="w-[27px] h-[27px]"/>
                            //     </div>
                            //   }
                            //   className="h-8  !p-0 !border-0 hover:!border-0 !bg-transparent hover:!bg-transparent active:!bg-transparent "  />
                          }
                          <Button
                            className="disabled:border-none !border-none !bg-[#202548] hover:!bg-[#202548] active:!bg-[#202548] disabled:bg-[#363D69] !text-sm !font-bold  !px-4 h-8 w-[62px] rounded-[42px]"
                            disabled={
                              !finalTranscript && listenVoiceText === ""
                            }
                            onClick={(e) => {
                              if (listenVoiceText !== "")
                                addText(listenVoiceText);
                              voicepopRef.current.toggle(e);
                              SpeechRecognition.stopListening();
                              setListenVoiceText("");
                            }}
                            label="Add"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 rounded ">
                        {!browserSupportsSpeechRecognition ? (
                          <div className="flex justify-center items-center w-full">
                            <div className="grid justify-items-center gap-y-3 text-slate-50">
                              <TVoiceListenIcon className={`w-[27px] h-6`} />
                              <div className="font-bold">Oh No!</div>
                              <div className="text-xs">
                                Your system does not support <br /> the
                                voice-to-text capability.
                              </div>
                            </div>
                          </div>
                        ) : !isMicrophoneAvailable ? (
                          <div className="flex flex-col justify-center items-center w-full text-slate-50 gap-y-3">
                            <TVoiceListenIcon className={`w-[27px] h-6 `} />
                            <div className="font-semibold">
                              Enable Microphone!
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </OverlayPanel>

                  <Tooltip target="#listenVoice" position="top" className="">
                    <div>Voice To Text</div>
                  </Tooltip>
                  <div
                    id="listenVoice"
                    onClick={(e) => {
                      setListenVoiceText("");
                      resetTranscript();
                      voicepopRef.current.toggle(e);
                      listenVoice();
                    }}
                    className="flex bg-[#363D69] hover:bg-[#363D69] cursor-pointer rounded-full shadow-md w-8 h-8 justify-center items-center"
                  >
                    <TVoiceListenIcon className={`text-white h-[14px]`} />
                  </div>
                </>
              )}
              {/* {!isRefreshing ? (
                <>
                  {" "}
                  <Tooltip
                    target="#white-board-refresh-icon"
                    position="top"
                    className=""
                  >
                    <div>Refresh</div>
                  </Tooltip>
                  <div
                    id="white-board-refresh-icon"
                    className={`bg-neutral-200 hover:bg-neutral-300 cursor-pointer rounded p-1 shadow-md `}
                    onClick={socketRefreshHandler}
                  >
                    <TBoardRefreshIcon />
                  </div>
                </>
              ) : (
                <div
                  className={`bg-neutral-200 hover:bg-neutral-300 cursor-wait rounded p-1 shadow-md animate-pulse`}
                >
                  <span className="">
                    {" "}
                    <TBoardRefreshIcon />{" "}
                  </span>
                </div>
              )} */}

              {boardConfig?.syncUser === props.userName && (
                <>
                  {" "}
                  {boardConfig?.isSync ? (
                    <>
                      <Tooltip
                        target="#syncoff-with-student-permission"
                        position="top"
                        className=""
                      >
                        <div>Turn off auto sync</div>
                      </Tooltip>
                      <div
                        id="syncoff-with-student-permission"
                        className={` cursor-pointer`}
                        onClick={(e) => changeSyncStatus(false)}
                      >
                        <TBoardSyncIcon />
                      </div>
                    </>
                  ) : (
                    <>
                      <Tooltip
                        target="#sync-with-student-permission"
                        position="top"
                        className=""
                      >
                        <div>Turn on auto sync</div>
                      </Tooltip>
                      <div
                        id="sync-with-student-permission"
                        className={` cursor-pointer`}
                        onClick={(e) => changeSyncStatus(true)}
                      >
                        <TBoardSyncSlashIcon />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
          {excalidrawAPI && pageList?.length > 0 && (
            <Collab
              defaultPageData={defaultPageData}
              firstRoomInitializer={firstRoomInitializer}
              slideChangeHandler={(id: number) => {
                ChangeSlideHandlerReciver(currentSlideId, id);
              }}
              currentSlideId={currentSlideId}
              syncBoardWithStudentToggler={(status: boolean) =>
                setSyncBoardWithStudent(status)
              }
              userName={props.userName}
              userLabel={props.userLabel}
              excalidrawAPI={excalidrawAPI}
              excalidrawModule={excalidrawModule}
            />
          )}
          {errorMessage && (
            <ErrorDialog
              message={errorMessage}
              onClose={() => setErrorMessage("")}
            />
          )}

          <excalidrawModule.Excalidraw
            ref={excalidrawRefCallback}
            onChange={onChange}
            onPointerUpdate={(e: any) => {
              if (isPresenter || isHost) collabAPI?.onPointerUpdate(e);
            }}
            viewModeEnabled={isViewMode || !currentSlideId}
            zenModeEnabled={isZenModeOn}
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
          />

          {mode !== "RECORDING" && (
            <div
              ref={slideListRef}
              // className={
              //   !showSlideList
              //     ? "hidden"
              //     : "bg-[#D9D9D9]  shadow-xl rounded-r-lg  z-30 font-bold flex flex-col h-full select-none transition-all duration-75 ease-in  justify-center items-center absolute top-0 right-0 w-[20%] min-w-[250px]"
              // }
              className={`${!showSlideList
                ? "translate-x-[100%] top-0 "
                : " top-0 translate-x-0   shadow-xl  shadow-slate-500"
                } border-l-[1px] border-l-slate-400 pl-1  bg-[#D9D9D9] right-0 w-[10%] min-w-[210px] rounded-r-lg  z-30 font-bold flex flex-col h-full select-none   justify-center items-center absolute transition-all ease-in-out duration-500`}
            >
              <div className="p-3 text-[#5F6695] font-medium flex justify-between items-center w-full">
                Slides
                <div
                  onClick={() => sidePanelToggler(false)}
                  className="px-0.5 py-1.5 rounded-full bg-[#5F6695] cursor-pointer"
                >
                  <TSWhiteboardSlideOpen
                    className={`w-[27px] h-[21px] text-[#FFFFFF]`}
                  />
                </div>
              </div>
              <div className="h-[calc(100vh-88px)] overflow-auto w-full transit ">
                {pageList?.length > 0 &&
                  pageList?.map((item: any, index: any) => {
                    return (
                      <div
                        key={`frame-${item?.id}`}
                        className={`
                              selection w-full py-1 relative :
                            
                            `}
                      >
                        {item.id === currentSlideId &&
                          !isViewMode &&
                          !deleteSlideConfirmation && (
                            <div className="absolute  top-[80px]  flex justify-center gap-3 rounded w-full items-center  h-[1.9rem] ">
                              {isSlideChangeLoading && (
                                <div className={`${"bg-none "}  p-1  `}>
                                  <ArrowPathIcon className="w-4   animate-spin" />
                                </div>
                              )}
                              {!isSlideChangeLoading && (
                                <div className="flex gap-2">
                                  <div
                                    className={` rounded-md ${index > 0
                                      ? "cursor-pointer"
                                      : " cursor-not-allowed"
                                      }   `}
                                    onClick={() => pageSwapUpHandler(item?.id)}
                                  >
                                    <TSlideUpArrow />
                                  </div>

                                  <div
                                    className={` rounded-md ${pageList?.length - 1 != index
                                      ? "cursor-pointer"
                                      : "cursor-not-allowed"
                                      } `}
                                    onClick={() =>
                                      pageSwapDownHandler(item?.id)
                                    }
                                  >
                                    <TSlideDownArrow />
                                  </div>
                                  <div
                                    className={` rounded-md ${index > 0
                                      ? "cursor-pointer"
                                      : "cursor-not-allowed"
                                      } `}
                                    onClick={() =>
                                      pageSwapToFirstHandler(item?.id)
                                    }
                                  >
                                    <TSlideToFirstIcon />


                                  </div>
                                  <div
                                    className={` rounded-md ${pageList?.length - 1 != index
                                      ? "cursor-pointer"
                                      : "cursor-not-allowed"
                                      } `}
                                    onClick={() =>
                                      pageSwapToLastHandler(item?.id)
                                    }
                                  >
                                    <TSlideToLastIcon />

                                  </div>

                                  {isHost && (
                                    <div
                                      className={`rounded-md ${pageList?.length > 1
                                        ? "cursor-pointer"
                                        : "cursor-not-allowed"
                                        } `}
                                      onClick={(event: any) => {
                                        if (pageList?.length > 1) {
                                          setDeleteSlideConfirmation(true);
                                        }
                                        // deletePage(item?.id)
                                      }}
                                    >
                                      <TSlideTrashIcon />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                        <div
                          className={` w-full p-3 py-2 ${item.id === currentSlideId
                            ? "border-sky-500 bg-[#5F6695]"
                            : ` border-neutral-50 rounded-lg${!(isViewMode || syncBoardWithStudent) &&
                              !isSlideChangeLoading
                              ? "hover:border-sky-200 cursor-pointer"
                              : ""
                            }`
                            }`}
                        >


                          {item.id === currentSlideId ? (
                            deleteSlideConfirmation ? (
                              <div
                                className={`w-full h-[100px] grid justify-center place-content-center bg-white gap-x-4 rounded-lg text-sm font-light`}
                              >
                                <div className="wordwrap">
                                  Do you want to <b /> delete
                                </div>
                                <div className="whiteboard-css flex justify-center gap-x-3 h-8 mt-5">
                                  <button
                                    onClick={() =>
                                      setDeleteSlideConfirmation(false)
                                    }
                                    className="border  border-[#59608C] text-[#59608C]  px-5 py-1 rounded-[10px] "
                                  >
                                    No
                                  </button>
                                  <button
                                    onClick={() => deletePage(item?.id)}
                                    className="bg-[#EA4335] text-white px-5 py-1 rounded-[10px] "
                                  >
                                    Yes
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="absolute p-1 font-medium text-sm text-slate-500">{index + 1}</div>
                                <img
                                  src={item?.thumbImage}
                                  alt="border"
                                  className="w-[100%] h-[100px] rounded-lg"
                                /></div>
                            )
                          ) : (
                            !!item?.thumbImage && (
                              <div>
                                <div className="absolute p-1 font-medium text-sm text-slate-500">{index + 1}</div>
                                <img
                                  onClick={() => {
                                    if ((isHost || isPresenter || !boardConfig?.isSync))
                                      changeSlideHandlerSender(
                                        currentSlideId,
                                        item?.id
                                      )
                                  }
                                  }
                                  src={item?.thumbImage}
                                  alt="border"
                                  className={`w-[100%] h-[100px] rounded-lg ${(isHost || isPresenter || !boardConfig?.isSync) ? 'cursor-pointer' : ''}`}
                                /></div>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div className="w-full flex justify-between p-2">
                <div className="flex gap-2">
                  <div>
                    <Tooltip target="#upload-pdf" position="top" className="">
                      <div>Upload PDF</div>
                    </Tooltip>
                    {(isPresenter || isHost) && (
                      <div
                        id="upload-pdf"
                        className="px-3 py-2 h-9 w-9 bg-white rounded-full cursor-pointer"
                      >
                        <input
                          id="file"
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onClick={(event: any) => (event.target.value = null)}
                          onChange={(e: any) => uploadHandler(e)}
                        />
                        <label htmlFor="file" className="cursor-pointer">
                          <TSWhiteboardPDFUpload />
                        </label>
                      </div>
                    )}
                  </div>

                  <div>
                    <Tooltip target="#download-pdf" position="top">
                      <div>Download PDF</div>
                    </Tooltip>
                    <div
                      id="download-pdf"
                      className="px-3 py-2 h-9 w-9 bg-white rounded-full cursor-pointer"
                      onClick={() =>
                        !pagesLoading &&
                        !pdfFileDownloading &&
                        downloadPdfHandler()
                      }
                    >
                      <TSWhiteboardPDFDownload />
                    </div>
                  </div>
                </div>
                <div>
                  <Tooltip
                    target="#add-blank-slide"
                    position="top"
                    className=""
                  >
                    <div>Add blank slide</div>
                  </Tooltip>
                  {(isPresenter || isHost) && (
                    <div
                      id="add-blank-slide"
                      onClick={newPageHandler}
                      className="bg-[#5F6695] rounded-full p-3 cursor-pointer"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        className="w-4 h-4 stroke-[#F8FAFC]"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 4.5v15m7.5-7.5h-15"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <>
            {!showSlideList && mode !== "RECORDING" && (
              <div
                onClick={rightPanelOpenHandler}
                className="absolute z-30 top-3 right-2 mr-1 py-1.5 px-0.5 cursor-pointer text-left bg-[#D9D9D9] rounded-full"
              >
                <TSWhiteboardSlidesClose
                  className={`w-[27px] h-[21px] text-[#202548]`}
                />
              </div>
            )}
          </>
        </div>
      ) : (
        <div className="h-[calc(100vh-88px)]  flex flex-1 items-center justify-center ">
          <div>
            <i className="pi pi-spin pi-spinner text-[20px] font-medium text-[#363D69]"></i>
          </div>
        </div>
      )}
    </div>
  );
}
