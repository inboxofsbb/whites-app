import React from "react";
export default function Timer(props: any) {
  function MyStopwatch() {
    return (
      <div style={{ textAlign: "center" }}>
        <div>
          <span>{props.hours}</span>:<span>{props.minutes}</span>:
          <span>{props.seconds}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div>
        <MyStopwatch />
      </div>
    </>
  );
}
