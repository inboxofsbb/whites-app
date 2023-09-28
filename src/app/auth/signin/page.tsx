"use client"
import { getCsrfToken, useSession } from "next-auth/react";
import Link from "next/link";
import { Password } from "primereact/password";
import { redirect } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";



export default function Page() {
  const searchParams = useSearchParams();
  const [errorText, setErrorText] = useState("");
  const error = searchParams.get("error") || "";
  const [csrfToken, setCsrfToken] = useState<any>(null);

  const getCsrfTokenVal = async () => {
    const token = await getCsrfToken();
    setCsrfToken(token);
  }


  useEffect(() => {
    getCsrfTokenVal();
    if (error && error === 'CredentialsSignin')
      setErrorText('Sign in failed. Check the details you provided are correct.')
    else setErrorText('')
  }, [])
  return (
    <div className=" flex flex-col lg:flex-row md:flex-row justify-center  h-full items-center min-h-[400px] md:mt-10 lg:mt-10 ">
      <div className=" text-primary-800 mt-4 md:mt-0 lg:mt-0 lg:min-w-[400px] md:min-w-[500px] max-w-[600px]">
        <div className="flex justify-center ">
          <img
            className=""
            src="/images/tcomp_logo.svg"
            alt="Logo"
          />
        </div>
        <div className="text-xl mb-2.5 mt-4">Sign In </div>
        <form
          className="bg-neutral-100 rounded-md px-6 pt-6 border"
          method="post"
          action="/api/auth/callback/credentials"
        >
          <input name="csrfToken" type="hidden" defaultValue={csrfToken!} />
          <input name="callbackUrl" type="hidden" defaultValue={"/"} />
          <div className="rounded-md shadow-sm space-y-4 text-gray-600">
            <div className="">
              <label
                htmlFor="email-address"
                className="text-sm text-neutral-700 mb-[6px]"
              >
                Email or Username
              </label>
              <input
                id="email-address"
                name="username"
                type="text"
                required
                className="w-full h-[40px] border-neutral-300 mt-1 -mb-2 rounded-[4px]"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="text-sm text-neutral-700 mb-[6px]"
              >
                Password
              </label>
              <Password
                id="password"
                name="password"
                type="password"
                toggleMask
                feedback={false}
                required
                inputClassName="w-full border-neutral-300 rounded-[4px]"
                className="w-full h-[40px] rounded-[4px]"
              />
            </div>
            {errorText && (
              <div className="text-red-600  text-center">
                <p>{errorText}</p>{" "}
              </div>
            )}

          </div>
          <div className="flex justify-center mt-8">
            <button
              type="submit"
              className="w-full bg-primary-800 text-neutral-50 px-2 py-2 rounded-md"
            >
              Sign In
            </button>
          </div>
          {/* <div className="text-sm text-[#7C8DB0] justify-center items-center text-center">
            <Link href={`/auth/emailsignin`}>
              <div className="text-center text-primary-800 border-t pt-6 mt-6 mb-3 text-base cursor-pointer">
                Sign In with registered email
              </div>
            </Link>
          </div> */}
        </form>
      </div>
    </div>
  )
} 