"use client"
import "./globals.css";
import { Provider as JotaiProvider } from "jotai";
import { appJotaiStore } from '@/wbUtils/app-jotai';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";

export default function RootLayout({
  children
}: { children: React.ReactNode }) {
  const queryClient = new QueryClient()

  return (
    <html lang="en">
      <body className="h-screen">
        <SessionProvider>
          <JotaiProvider store={appJotaiStore}>
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          </JotaiProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
