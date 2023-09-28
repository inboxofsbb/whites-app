import { Disclosure } from "@headlessui/react";
import Link from "next/link";
import { Button } from "primereact/button";

type Props = {
  children: React.ReactNode;
};
const schoolName = process?.env["NEXT_PUBLIC_SCHOOL_NAME"] || "";

export default function LoginLayout({ children }: Props) {
  return (
    <div className="bg-white min-h-[100vh]">
      <Disclosure as="nav" className="bg-white">
        {({ open }) => (
          <>
            <div className="max-w-8xl mx-auto px-6 border-b bg-primary-800">
              <div className="relative flex items-center justify-between h-16">
                <div className="flex-1 flex items-center justify-center   md:justify-start lg:justify-start">
                  <Link href={"/"}>
                    <>
                      <div className=" items-center">
                        <img
                          src="/assets/images/connect-header-logo.svg"
                          alt="tc-logo"
                          className=" mr-2 cursor-pointer w-40"
                        />
                      </div>
                      <div className="text-primary-50 text-lg flex items-center">
                        {schoolName}
                      </div>
                    </>
                  </Link>
                </div>
                {/* <div className="flex-1 flex items-center justify-end sm:items-stretch sm:justify-end">
                  <div className="flex-shrink-0 flex items-center text-[#657491]">
                    Don&apos;t have an account?
                  </div>
                  <Link href={`/auth/signup`}>
                    <Button
                      className="flex-shrink-0 flex items-center bg-white text-[#127FBD] border-[#127FBD] ml-2"
                      type="button"
                      label="Sign Up"
                    />
                  </Link>
                </div> */}
              </div>
            </div>
          </>
        )}
      </Disclosure>
      <main>
        <div className="max-w-8xl mx-auto py-0 px-2 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
