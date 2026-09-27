
import { db, auth } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  setDoc,
  serverTimestamp,
  Timestamp,
  limit
} from 'firebase/firestore';

export interface Message {
  id?: string;
  chatId: string;
  senderUid: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface Chat {
  id: string;
  participants: string[];
  participantNames: { [uid: string]: string };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: { [uid: string]: number };
}

export const getOrCreateChat = async (otherUserUid: string, otherUserName: string): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("User not authenticated");

  const participants = [currentUser.uid, otherUserUid].sort();
  const chatId = participants.join('_');

  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    const currentUserName = currentUser.displayName || "Farmer";
    await setDoc(chatRef, {
      participants,
      participantNames: {
        [currentUser.uid]: currentUserName,
        [otherUserUid]: otherUserName
      },
      lastMessage: "",
      lastMessageAt: new Date().toISOString(),
      unreadCount: {
        [currentUser.uid]: 0,
        [otherUserUid]: 0
      }
    });
  }

  return chatId;
};

export const sendMessage = async (chatId: string, text: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("User not authenticated");

  const messageData = {
    chatId,
    senderUid: currentUser.uid,
    text,
    createdAt: new Date().toISOString(),
    read: false
  };

  await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);

  // Update chat metadata
  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);
  if (chatSnap.exists()) {
    const chatData = chatSnap.data();
    const otherUserUid = chatData.participants.find((uid: string) => uid !== currentUser.uid);
    
    await updateDoc(chatRef, {
      lastMessage: text,
      lastMessageAt: new Date().toISOString(),
      [`unreadCount.${otherUserUid}`]: (chatData.unreadCount?.[otherUserUid] || 0) + 1
    });
  }
};

export const subscribeToChats = (callback: (chats: Chat[]) => void) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return () => {};

  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', currentUser.uid),
    orderBy('lastMessageAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
    callback(chats);
  });
};

export const subscribeToMessages = (chatId: string, callback: (messages: Message[]) => void) => {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(100)
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
    callback(messages);
  });
};

export const markAsRead = async (chatId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    [`unreadCount.${currentUser.uid}`]: 0
  });
};
