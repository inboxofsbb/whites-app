import {
  ChatContainer,
  MessageList,
  MainContainer,
  Message,
  MessageInput,
  TypingIndicator,
  Avatar,
} from "@chatscope/chat-ui-kit-react";
import { useEffect, useRef, useState } from "react";
import { useRoom } from "@livekit/react-components";
import { DateTime } from "luxon";
import { useSession } from "next-auth/react";
import Linkify from "react-linkify";

interface ChatProps {
  conversations: any;
  typingLabel: string;
  SentMessage: (message: string) => void;
  SentTypingInfo: () => void;
  RecievedMessage: {};
}

export default function ChatContainerBox({
  typingLabel,
  conversations,
  SentMessage,
  SentTypingInfo,
}: ChatProps) {
  const [messageInputValue, setMessageInputValue] = useState("");
  const { data: session } = useSession();

  const inputRef = useRef();
  // Get all chat related values and methods from useChat hook
  const { isConnecting, room } = useRoom({
    adaptiveStream: true,
    dynacast: true,
  });
  const avatarStyle: any[] = [
    { bg: "bg-green-300", text: "text-white" },
    { bg: "bg-slate-400", text: "text-white" },
    { bg: "bg-red-300", text: "text-white" },
    { bg: "bg-blue-300", text: "text-white" },
    { bg: "bg-orange-300", text: "text-white" },
  ];

  //on pressing sent
  const onInputSend = (val: any) => {
    if (val.replace(/&nbsp;/g, "").trim()?.length > 0 && val.length < 2000) {
      SentMessage(val.replace(/&nbsp;/g, "").trim());
    }
    (inputRef as any).current.focus();
  };

  //on typing
  const onInputTyping = (val: any) => {
    if (messageInputValue.length < 2000) {
      setMessageInputValue(val);
    }
    SentTypingInfo();
  };

  const sentTimeTemplate = (time: any) => {
    const sentTime = DateTime.fromISO(time).toFormat("hh:mm a");
    return sentTime;
  };
  
  if (isConnecting) return <div>Connecting...</div>;

  return (
    <ChatContainer className="h-[100%]">
      <MessageList
        scrollBehavior="smooth"
        typingIndicator={
          typingLabel !== "" ? (
            <TypingIndicator
              content={typingLabel}
              className="!w-full !bg-primary-50  "
            />
          ) : null
        }
      >
        {conversations &&
          conversations
            ?.filter((conversation: any) => {
              return conversation?.message;
            })
            .map((conversation: any, index: number) => {
              let plainMessage = conversation.message.replace(/<[^>]+>/g, "");
              const style =
                avatarStyle[
                  Number(String(conversation.sender).charCodeAt(0)) %
                    avatarStyle.length
                ];

              return (
                <div key={index} className="flex mb-3">
                  <div
                    className={
                      "rounded-full font-semibold justify-center min-w-[30px] min-h-[30px] w-7 h-7 text-center flex items-center mr-2 mt-1 " +
                      style.bg +
                      " " +
                      style.text
                    }
                  >
                    {String(conversation?.sender[0]).toUpperCase()}
                  </div>
                  <Message
                    type="custom"
                    className=" text-normal-500 font-light !p-0"
                    model={{ type: "custom", position: "single" } as any}
                    key={`message-received-${index}`}
                  >
                    <Message.CustomContent>
                      <Linkify
                        componentDecorator={(
                          decoratedHref: any,
                          decoratedText: any,
                          key: any
                        ) => (
                          <a
                            className="text-blue-900 hover:underline p-0"
                            target="blank"
                            rel="noopener"
                            href={decoratedHref}
                            key={key}
                          >
                            {decoratedText}
                          </a>
                        )}
                      >
                        {plainMessage}
                      </Linkify>
                    </Message.CustomContent>
                    <Message.Header className="!text-black">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-base">
                          {conversation?.sender}
                        </div>
                        <div className="font-bold text-xl">·</div>
                        <div className="text-slate-400">
                          {sentTimeTemplate(conversation?.sendTime)}
                        </div>
                      </div>
                    </Message.Header>
                  </Message>
                </div>
              );
            })}
      </MessageList>

      <MessageInput
        className="flex w-full items-center !bg-secondary"
        placeholder="Send message"
        onChange={(val) => onInputTyping(val)}
        onSend={onInputSend}
        fancyScroll
        attachButton={false}
        ref={inputRef as any}
      />
    </ChatContainer>
  );
}
