
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import { Chat as ChatType } from '../src/services/chatService';

const Chat: React.FC = () => {
  const { t } = useTranslation();
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Mobile view logic */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat List - Hidden on mobile if a chat is selected */}
        <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
          <ChatList 
            onSelectChat={setSelectedChat} 
            selectedChatId={selectedChat?.id}
          />
        </div>

        {/* Chat Window - Full screen on mobile if selected, hidden otherwise */}
        <div className={`flex-1 flex flex-col ${selectedChat ? 'flex' : 'hidden md:flex'}`}>
          {selectedChat ? (
            <ChatWindow 
              chat={selectedChat} 
              onBack={() => setSelectedChat(null)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-center p-8">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <MessageSquare className="w-10 h-10 text-emerald-100" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('chat.empty_state_title')}</h3>
              <p className="text-gray-500 max-w-xs">
                {t('chat.empty_state_desc')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
