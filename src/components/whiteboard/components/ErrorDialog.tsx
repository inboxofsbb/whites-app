import React, { useState } from "react";

import { Dialog } from "primereact/dialog";

export const ErrorDialog = ({
  message,
  onClose,
}: {
  message: string;
  onClose?: () => void;
}) => {
  const [modalIsShown, setModalIsShown] = useState(!!message);
  // const { container: excalidrawContainer } = useExcalidrawContainer();

  const handleClose = React.useCallback(() => {
    setModalIsShown(false);

    if (onClose) {
      onClose();
    }
    // TODO: Fix the A11y issues so this is never needed since we should always focus on last active element
    // excalidrawContainer?.focus();
  }, [onClose]);

  return (
    <>
      {modalIsShown && (
        <Dialog visible={modalIsShown} onHide={handleClose}>
          <div style={{ whiteSpace: "pre-wrap" }}>{message}</div>
        </Dialog>
      )}
    </>
  );
};
