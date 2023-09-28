import { atom, useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
const server = process.env.NEXT_PUBLIC_API_BASE_URL;

export const studentIdInitialStorageAtom = atomWithStorage<any>(
  "selectedStudentId",
  null
);
export const useStudent = () => {
 
  const [studentIdAtom, setStudentIdAtom] = useAtom(
    studentIdInitialStorageAtom
  );
 

  return { studentIdAtom, setStudentIdAtom };
};
