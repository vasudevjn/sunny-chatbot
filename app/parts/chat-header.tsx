import { cn } from "@/lib/utils";

export function ChatHeaderBlock({ children, className }: { children?: React.ReactNode, className?: string }) {
    return (
        <div className={cn("gap-2 flex flex-1", className)}>
            {children}
        </div>
    )
}

export function ChatHeader({ children }: { children: React.ReactNode }) {
    return (
        <div className="w-full pointer-events-auto">
            {/* Solid bar: the transcript scrolls beneath it, and a logo sitting
                over moving text reads as a rendering fault. */}
            <div className="flex w-full items-center py-3 px-5 bg-background">
                {children}
            </div>
            {/* Short fade so content does not end on a hard edge. */}
            <div className="h-6 w-full bg-linear-to-b from-background to-transparent" />
        </div>
    )
}