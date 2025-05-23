// src/hooks/useChat.ts
import { useEffect, useState } from 'react';
import socket from '../utils/socket';

type Message = {
  sender_email: string;
  message: string;
  sent_at: string;
};

export const useChat = (teamId: number, userEmail: string) => {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    socket.emit('join_team', teamId);

    socket.on('new_message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('new_message');
    };
  }, [teamId]);

  const sendMessage = (message: string) => {
    socket.emit('send_message', {
      teamId,
      email: userEmail,
      message,
    });
  };

  return { messages, sendMessage };
};
