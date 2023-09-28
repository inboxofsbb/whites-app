import React from "react";
import { useTime } from "react-timer-hook";

export default function Clock(props: any) {
  function MyTime() {
    const { seconds, minutes, hours, ampm } = useTime({ format: "12-hour" });

    return (
      <div style={{ textAlign: "end" }}>
        <div>
          <span>{hours == 0 ? "12" : ("0" + hours).slice(-2)}</span>:
          <span>{("0" + minutes).slice(-2)}</span>
          {/* :<span>{seconds}</span> */}
          <span className="ml-1">{ampm}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="App">
      <div>
        <MyTime />
      </div>
    </div>
  );
}
