"use client"

import { signOut, useSession } from "next-auth/react";
import { Fragment, useEffect, useRef, useState } from "react";
import { Disclosure, Menu, Transition } from "@headlessui/react";
import { Bars3Icon, BookOpenIcon, ChevronDownIcon, UserGroupIcon, VideoCameraIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { classNames } from "primereact/utils";
import { useStudent } from "@/hooks/useStudent";
import ActiveLink from "@/components/layout/activeLink";
import { THomeIcon } from "@/components/icons/THomeIcon";
import { TClassesNavigationIcon } from "@/components/icons/TClassesNavigationIcon";
import { TSessionsIcon } from "@/components/icons/TSessionsIcon";
import { TStudentNavigationIcon } from "@/components/icons/TStudentsNavigationIcon";
import { TStudentGroupNavigationIcon } from "@/components/icons/TStudentGroupNavigationIcon";
import { TTeachersIcon } from "@/components/icons/TTeachersIcon";
import { TArchiveIcon } from "@/components/icons/TArchiveIcon";
import { TInvoiceIcon } from "@/components/icons/TInvoiceIcon";
import TPaymentsIcon from "@/components/icons/TPaymentsIcon";

export default function Layout({
    children
}: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [role, setRole]: any = useState();
  const schoolName = process?.env["NEXT_PUBLIC_SCHOOL_NAME"] || "";
  const { setStudentIdAtom }: any = useStudent();


  const navigation =
  role === "ADMIN"
    ? [
        { name: "Home", href: "/" },
        { name: "Sessions", href: `/sessions/live` },
        { name: "Classes", href: `/class` },
        { name: "Students", href: `/student` },
        { name: "Student Groups", href: `/student/group` },
        { name: "Teachers", href: `/teacher` },
        { name: "Archives", href: `/archive` },
        { name: "Billing", href: `/accountbalance` },
        { name: "Reports", href: `/report` },
      ]
    : role === "TEACHER"
    ? [
        { name: "Home", href: "/" },
        { name: "My Sessions", href: `/sessions/teacher` },
        { name: "My Classes", href: `/class` },
        { name: "Students", href: `/student` },
      ]
    : role === "STUDENT"
    ? [
        { name: "Home", href: "/" },
        { name: "My Sessions", href: `/sessions/student` },
        { name: "My Classes", href: `/class` },
      ]
    : role === "ACCOUNTS"
    ? [
        { name: "Home", href: `/accountbalance` },
        { name: "Payments", href: `/payment` },
        { name: "Invoices", href: `/invoice/list` },
      ]
    : role === "ROOT"
    ? [
        { name: "Home", href: `/` },
        { name: "Show Records", href: `/test/record` },
        { name: "Download Whiteboard", href: `/test/book` },
        { name: "Clients", href: `/client` },
      ]
    : [
        { name: "My Classes", href: `/class` },
        { name: "Students", href: `/student` },
        { name: "Student Group", href: `/group` },
      ];

  useEffect(() => {
    setRole(session?.user.role[0]);
  }, [session?.user.role[0], role]);
  return (
    <>
      <Disclosure
        as="nav"
        className="border-b-2 bg-slate-300"
        style={{
          boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        }}
      >
        {({ open }) => (
          <>
            <div className="max-w-8xl mx-auto   bg-white">
              <div className="flex-1 flex   md:items-center lg:items-center justify-between border-b   px-6 py-2 bg-primary-800">
                <div className="flex items-center md:justify-center lg:justify-center">
                  <div className="flex-shrink-0 flex items-center">
                    <img
                      src="/assets/images/connect-header-logo.svg"
                      alt="tc-logo"
                      className=" mr-2 w-36"
                    />
                  </div>
                  <div className="text-primary-50 text-lg">{schoolName}</div>
                </div>
                <div className="md:flex lg:flex  items-center hidden flex-wrap">
                  <Menu as="div" className="ml-3 relative">
                    <div>
                      <Menu.Button className="flex text-primary-50 hover:text-primary-100 rounded-full focus:outline-none focus:ring-1 focus:ring-offset-1  focus:ring-white">
                        <span className="sr-only">Open user menu</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div className="pt-1 pl-1 flex">
                          Root
                          <ChevronDownIcon className="w-6 h-6 inline font-bold p-overlay-badge !p-0" />
                        </div>
                      </Menu.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                        <Menu.Item>
                          {({ active }) => (
                            <div
                              className={classNames(
                                active ? "bg-gray-100" : "",
                                "block px-4 py-2 text-sm text-gray-700  cursor-pointer"
                              )}
                              onClick={() => {
                                signOut();
                                setStudentIdAtom(undefined);
                              }}
                            >
                              Log out
                            </div>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </div>
              </div>
              <div className=" flex items-center justify-between py-2  md:py-1 lg:py-1 bg-primary-100 md:overflow-x-auto lg:overflow-none">
                <div className=" flex-1 flex items-center md:hidden ml-2">
                  {/* Mobile menu button*/}
                  <Disclosure.Button className="  items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                    )}
                  </Disclosure.Button>
                </div>
                <div className="  flex items-center justify-between ">
                  <div className="hidden md:block md:ml-3 lg:ml-8">
                    <div className="flex items-center gap-0 md:gap-2">
                      {navigation.map((item) => (
                        <ActiveLink
                          href={item.href}
                          key={item.name}
                          activeClassName="text-primary-800 hover:bg-black bg-black bg-opacity-10 hover:bg-opacity-10 hover:text-primary-800"
                        >
                          <a
                            className={classNames(
                              "flex text-primary-800 hover:bg-slate-100 px-3 py-2 rounded-sm text-sm items-center font-medium"
                            )}
                          >
                            <div className="">
                              {item.name == "Home" ? (
                                <div className="mr-[8px]">
                                  <THomeIcon />
                                </div>
                              ) : item.name === "Test Url" ? (
                                <div className="mr-[8px]">
                                  <TClassesNavigationIcon />
                                </div>
                              ) : item.name === "Show Records" ? (
                                <div className="mr-[8px]">
                                  <VideoCameraIcon className="w-6" />
                                </div>
                              ) : item.name === "Download Whiteboard" ? (
                                <div className="mr-[8px]">
                                  <BookOpenIcon className="w-6" />
                                </div>
                              ) : item.name === "Clients" ? (
                                <div className="mr-[8px]">
                                  <UserGroupIcon className="w-6" />
                                </div>
                              ) : item.name == "Sessions" ? (
                                <div className="mr-[8px]">
                                  <TSessionsIcon />
                                </div>
                              ) : item.name === "Classes" ? (
                                <div className="mr-[8px]">
                                  <TClassesNavigationIcon />
                                </div>
                              ) : item.name == "Students" ? (
                                <div className="mr-[8px]">
                                  <TStudentNavigationIcon />
                                </div>
                              ) : item.name == "Student Groups" ? (
                                <div className="mr-[8px]">
                                  <TStudentGroupNavigationIcon />
                                </div>
                              ) : item.name == "Teachers" ? (
                                <div className="mr-[8px]">
                                  <TTeachersIcon />
                                </div>
                              ) : item.name == "Archives" ? (
                                <div className="mr-[8px]">
                                  <TArchiveIcon />
                                </div>
                              ) : item.name == "My Sessions" ? (
                                <div className="mr-[8px]">
                                  <TSessionsIcon />
                                </div>
                              ) : item.name === "My Classes" ? (
                                <div className="mr-[8px]">
                                  <TClassesNavigationIcon />
                                </div>
                              ) : item.name === "Billing" ||
                                item.name === "Invoices" ? (
                                <div className="mr-[8px]">
                                  <TInvoiceIcon />
                                </div>
                              ) : item.name === "Payments" ? (
                                <div className="mr-[8px]">
                                  <TPaymentsIcon />
                                </div>
                              ) : item.name == "Reports" ? (
                                <div className="mr-[8px]">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    className="w-5 h-5"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                                    />
                                  </svg>
                                </div>
                              ) : (
                                ""
                              )}
                              {/* <img
                                src={
                                  item.name === "Classes"
                                    ? "/assets/images/myclasses_icon.svg"
                                    : item.name === "My Classes"
                                    ? "/assets/images/myclasses_icon.svg"
                                    : item.name == "My Sessions"
                                    ? "/assets/images/sessions_icon.svg"
                                    : item.name == "Sessions"
                                    ? "/assets/images/sessions_icon.svg"
                                    : item.name == "Student Groups"
                                    ? "/assets/images/studentgroups_icon.svg"
                                    : item.name == "Students"
                                    ? "/assets/images/students_icon.svg"
                                    : item.name == "Teachers"
                                    ? "/assets/images/teachers_icon.svg"
                                    : item.name == "Archive"
                                    ? "/assets/images/archives_icon.svg"
                                    : item.name == "Home"
                                    ? "/assets/images/home_logo.svg"
                                    : item.name == "Invoice"
                                    ? "/assets/images/myclasses_icon.svg"
                                    : "/assets/images/home_logo.svg"
                                }
                                alt="tc-logo"
                                width={20}
                                height={30}
                                className="mr-0 xmd:mr-1 cursor-pointer"
                              />{" "} */}
                            </div>

                            {item.name}
                          </a>
                        </ActiveLink>
                      ))}
                    </div>
                  </div>
                  <div className="md:hidden lg:hidden flex p-0">
                    {/* Profile dropdown */}

                    <Menu as="div" className="ml-3 relative">
                      <div>
                        <Menu.Button className="flex text-[#7C8DB0] hover:text-gray-500 rounded-full focus:outline-none focus:ring-1 focus:ring-offset-1  focus:ring-white">
                          <span className="sr-only">Open user menu</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h- w-8"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <div className="pt-1 pl-1 flex">
                            Root
                            <ChevronDownIcon className="w-6 h-6 inline font-bold p-overlay-badge !p-0" />
                          </div>
                        </Menu.Button>
                      </div>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                          <Menu.Item>
                            {({ active }) => (
                              <div
                                className={classNames(
                                  active ? "bg-gray-100" : "",
                                  "block px-4 py-2 text-sm text-gray-700  cursor-pointer"
                                )}
                                onClick={() => {
                                  signOut();
                                  setStudentIdAtom(undefined);
                                }}
                              >
                                Log out
                              </div>
                            )}
                          </Menu.Item>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </div>
                </div>
              </div>
            </div>
            <Disclosure.Panel className="md:hidden">
              <div className="flex flex-col gap-1 px-2 py-3 bg-slate-200 space-y-1">
                {navigation.map((item) => (
                  <ActiveLink
                    href={item.href}
                    key={item.name}
                    activeClassName="bg-slate-300 text-slate-800"
                  >
                    {/* <Disclosure.Button
                      key={item.name}
                      as="a"
                      href={item.href}
                      className={classNames(
                        "text-slate-600  hover:text-gray-700",
                        "block px-3 py-1 text-sm font-medium"
                      )}
                    >
                      {item.name}
                    </Disclosure.Button> */}
                  </ActiveLink>
                ))}
              </div>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>
      <main >
        <div className="min-h-[calc(100vh-180px)] max-w-6xl   mx-auto pt-4 px-2 sm:px-6 lg:px-8">
          {children}
        </div>
        <div className="mt-10 flex flex-row p-2 mb-4 justify-center items-center text-center">
          <div className="flex flex-row  gap-2   text-slate-500 text-xs ">
            <div className="left-3 ">Powered by Tutorcomp</div>
          </div>
        </div>
      </main>
    </>
  )
}

