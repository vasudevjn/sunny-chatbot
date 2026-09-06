import { UIMessage } from "ai";
import { useEffect, useRef } from "react";
import { UserMessage } from "./user-message";
import { AssistantMessage } from "./assistant-message";
import type { Contact } from "@/lib/solar/types";
import { SunnyMark } from "@/components/solar/brand";


export function MessageWall({ messages, status, durations, onDurationChange, conversationId, onContactSaved }: { messages: UIMessage[]; status?: string; durations?: Record<string, number>; onDurationChange?: (key: string, duration: number) => void; conversationId?: string; onContactSaved?: (contact: Contact) => void }) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div className="relative max-w-3xl w-full">
            <div className="relative flex flex-col gap-4">
                {messages.map((message, messageIndex) => {
                    const isLastMessage = messageIndex === messages.length - 1;
                    return (
                        <div key={message.id} className="w-full">
                            {message.role === "user" ? (
                                <UserMessage message={message} />
                            ) : (
                                /* Assistant turns get the Sunny mark in a gutter
                                   so a long transcript still reads as a
                                   conversation with someone. */
                                <div className="flex gap-3">
                                    <div className="mt-0.5 hidden shrink-0 sm:block">
                                        <SunnyMark size={26} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <AssistantMessage message={message} status={status} isLastMessage={isLastMessage} durations={durations} onDurationChange={onDurationChange} conversationId={conversationId} onContactSaved={onContactSaved} />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                <div ref={messagesEndRef} />
            </div>
        </div>
    );
}