'use client';

import { signOut } from "next-auth/react"

export default function Page() {
  return (
    <main className="flex min-h-full flex-col items-center justify-between">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <div onClick={() => { signOut() }}>Logout</div>
        Dashboard
      </div>
    </main>
  )
}

