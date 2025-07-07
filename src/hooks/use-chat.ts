'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ChatContextType {
    isChatOpen: boolean;
    toggleChat: () => void;
    openChat: () => void;
    closeChat: () => void;
    activeChatRoomId: string | null;
    setActiveChatRoomId: (roomId: string | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [activeChatRoomId, setActiveChatRoomId] = useState<string | null>(null);

    const toggleChat = () => {
        setIsChatOpen(prev => {
            if (!prev === false) { // if closing
                setActiveChatRoomId(null);
            }
            return !prev;
        });
    };
    
    const openChat = () => {
        setIsChatOpen(true);
    }
    
    const closeChat = () => {
        setIsChatOpen(false);
        setActiveChatRoomId(null);
    }
    
    const value = { isChatOpen, toggleChat, openChat, closeChat, activeChatRoomId, setActiveChatRoomId };

    return React.createElement(ChatContext.Provider, { value: value }, children);
}

export function useChat() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
}
