import React, { useEffect, useState } from "react";
import { useStopwatch } from "react-timer-hook";

export default function JoinTimer(props: any) {
  function secondsToTime(secs: number) {
    var hours = Math.floor(secs / (60 * 60));
    var divisor_for_minutes = secs % (60 * 60);
    var minutes = Math.floor(divisor_for_minutes / 60);
    var divisor_for_seconds = divisor_for_minutes % 60;
    var seconds = Math.ceil(divisor_for_seconds);
    return {
      h: hours,
      m: minutes,
      s: seconds,
    };
  }
  useEffect(() => {
    if (props.count >= 0) {
      const secondsLeft = setInterval(() => {
        props.setCount((c: number) => c + 1);
        let timeLeftVar = secondsToTime(props.count);
        props.setHour(timeLeftVar.h);
        props.setMinute(timeLeftVar.m);
        props.setSecond(timeLeftVar.s);
      }, 1000);
      return () => clearInterval(secondsLeft);
    } else {
      console.log("timeout");
    }
  }, [props.count]);

  return (
    <>
      <div className="flex flex-row">
        <div className="w-5">
          {props.hour < 9 ? "0" + props.hour : props.hour}{" "}
        </div>
        :
        <div className="w-5">
          {props.minute < 9 ? "0" + props.minute : props.minute}
        </div>
        :
        <div className="w-5">
          {props.second <= 9 ? "0" + props.second : props.second}
        </div>
      </div>
    </>
  );
}
