
"use client"
import { SessionProvider, useSession } from "next-auth/react";
import { Provider as JotaiProvider } from "jotai";
import { appJotaiStore } from "@/wbUtils/app-jotai";
import {
    QueryClient,
} from '@tanstack/react-query'
type Props = {
    children: JSX.Element;
};
export default function layout({
    children
}: { children: React.ReactNode }) {
    const queryClient = new QueryClient()

    return (
                <Auth>
                    <section>
                        {children}
                    </section>
                </Auth>
    )
}
function Auth({ children }: Props): JSX.Element {
    const { status } = useSession({ required: true });
    if (status === "loading") {
        return <div className="h-full">Loading...</div>;
    }
    return children;
}