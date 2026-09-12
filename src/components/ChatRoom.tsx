'use client';

import { Fragment, useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { listenChatRoom, sendMessage, markMessagesAsRead, toggleMessageReaction, deleteMessage } from '@/lib/chat';
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc, query, where, getDocs, runTransaction, increment, setDoc, onSnapshot } from 'firebase/firestore';
import { getNextReceiptNumber } from '@/lib/ReceiptNumber';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Send, ArrowLeft, PackagePlus, Trash2, Plus, Image as ImageIcon, Camera, X, Smile } from 'lucide-react';
import EmojiButton from './EmojiButton';
import { useTyping } from '@/hooks/useTyping';
import MessageBubble from './MessageBubble';

interface ChatRoomProps {
  chatId: string;
  onBack?: () => void;
  currentUserId?: string;
  userRole?: 'user' | 'seller' | null;
  productTitle?: string;
  productImage?: string;
  productPrice?: number;
}

const getMessageDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === 'function') return timestamp.toDate();
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatMessageDate = (timestamp: any, lang?: string): string => {
  const date = getMessageDate(timestamp);
  if (!date) return '';
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (msgDate.getTime() === today.getTime()) {
    return lang === 'my' ? 'ယနေ့' : 'Today';
  }
  
  if (msgDate.getTime() === yesterday.getTime()) {
    return lang === 'my' ? 'မနေ့က' : 'Yesterday';
  }
  
  return date.toLocaleDateString(
    lang === 'my' ? 'my-MM' : 'en-US', 
    { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    }
  );
};

const formatMessageTime = (timestamp: any): string => {
  const date = getMessageDate(timestamp);
  return date ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
};

const getPreferredProfileName = (data: Record<string, any> = {}) => {
  const displayName = typeof data.displayName === 'string' ? data.displayName.trim() : '';
  const username = typeof data.username === 'string' ? data.username.trim() : '';
  const shopName = typeof data.shopName === 'string' ? data.shopName.trim() : '';

  return displayName || username || shopName || 'User';
};

// compressImage - Component အပြင်မှာထားလို့ရတယ် (state မလိုလို့)
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const compressWithQuality = (quality: number) => {
          const MAX_DIMENSION = 1200;
          let w = width;
          let h = height;
          
          if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
            const ratio = Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h);
            w = w * ratio;
            h = h * ratio;
          }
          
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, w, h);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), { 
                type: 'image/jpeg' 
              });
              
              console.log(`📦 Quality ${Math.round(quality * 100)}%: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
              
              if (blob.size > 5 * 1024 * 1024 && quality > 0.2) {
                compressWithQuality(quality - 0.1);
              } else {
                resolve(compressedFile);
              }
            } else {
              reject(new Error('Failed to compress image'));
            }
          }, 'image/jpeg', quality);
        };
        
        compressWithQuality(0.8);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

const isMessageOldEnough = (timestamp: any) => {
  if (!timestamp) return false;
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return false;
    const now = new Date();
    const diffInDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    return diffInDays >= 30;
  } catch {
    return false;
  }
};

export default function ChatRoom({
  chatId,
  onBack,
  currentUserId: propUserId,
  userRole: propUserRole,
  productTitle: propProductTitle,
  productImage: propProductImage,
  productPrice: propProductPrice = 0
}: ChatRoomProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
  // Profile & Role States
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhoto, setReceiverPhoto] = useState<string | null>(null);
  const [receiverRole, setReceiverRole] = useState<'user' | 'seller'>('user');
  const [currentUserId, setCurrentUserId] = useState(propUserId || '');
  const [isUserSeller, setIsUserSeller] = useState<boolean>(propUserRole === 'seller');
  const [userRole, setUserRole] = useState<'user' | 'seller'>(propUserRole || 'user');
  const [language, setLanguage] = useState<string>('en');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = auth.currentUser;
  const activeUserId = propUserId || currentUserId || user?.uid || '';
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Order States
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [orderItems, setOrderItems] = useState<any[]>([{ productId: '', productTitle: '', productImage: '', price: 0, quantity: 1, total: 0 }]);
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerPaymentMethod, setBuyerPaymentMethod] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [pendingOrderAction, setPendingOrderAction] = useState<'CONFIRMED' | 'CANCELLED' | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [isReceiptFullscreen, setIsReceiptFullscreen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<any>(null);

  const { isTyping, typingUserId, startTyping, stopTyping } = useTyping({
    chatId,
    enabled: !!chatId && !!activeUserId
  });
  const [replyTo, setReplyTo] = useState<any>(null); // ✅ Reply State
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isReceiverOnline, setIsReceiverOnline] = useState<boolean>(false);

  const [hasScrolledInitial, setHasScrolledInitial] = useState(false);
  useEffect(() => {
    if (messages.length > 0 && !hasScrolledInitial) {
      scrollToBottom();
      setHasScrolledInitial(true);
    }
  }, [messages, hasScrolledInitial]);
  
  // ✅ Reply ကိုနှိပ်ရင် မူရင်းစာကိုသွားမယ်
  const scrollToMessage = (messageId: string) => {
    const element = messageRefs.current[messageId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // ✅ ပေါ်လွင်အောင် Highlight လုပ်မယ်
      element.style.transition = 'background-color 0.5s ease';
      element.style.backgroundColor = 'var(--accent)';
      setTimeout(() => {
        element.style.backgroundColor = 'transparent';
      }, 2000);
    }
  };

  // ✅ Scroll to Bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ===== ✅ Reaction Handler =====
  const handleReaction = async (messageId: string, emoji: string) => {
    if (!activeUserId || !chatId) return;
    try {
      await toggleMessageReaction(chatId, messageId, activeUserId, emoji);
      console.log('✅ Reaction toggled:', emoji);
    } catch (error) {
      console.error('❌ Failed to toggle reaction:', error);
    }
  };

  // ===== ✅ Delete Handler =====
  const handleDeleteMessage = async (messageId: string, forEveryone: boolean = true) => {
    if (!activeUserId || !chatId) return;
    
    // Delete confirmation
    const confirmMsg = forEveryone 
      ? 'Delete this message for everyone?' 
      : 'Delete this message only for yourself?';
    
    if (!confirm(confirmMsg)) return;
    
    try {
      await deleteMessage(chatId, messageId, activeUserId, forEveryone);
      console.log('✅ Message deleted:', messageId);
    } catch (error) {
      console.error('❌ Failed to delete message:', error);
      alert('You can only delete your own messages.');
    }
  };
  // ✅ Scroll Button Show/Hide
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    
    // Initial check
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 1. Setup & Fetch Chat Info
  useEffect(() => {
    if (propUserId) setCurrentUserId(propUserId);
    else if (user) setCurrentUserId(user.uid);
  }, [propUserId, user]);

  useEffect(() => {
    if (!user) return;
    if (propUserRole === 'seller') { setIsUserSeller(true); return; }
    const checkRole = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists() && ['seller', 'VENDOR'].includes(snap.data().role)) setIsUserSeller(true);
    };
    checkRole();
  }, [user, propUserRole]);

  useEffect(() => {
    if (!chatId || !currentUserId) return;

    const loadReceiver = async () => {
      const chatSnap = await getDoc(doc(db, 'chats', chatId));
      const participants = chatSnap.exists() ? chatSnap.data().participants || [] : [];
      const parts = chatId.split('_');
      const receiver = participants.find((participant: string) => participant !== currentUserId)
        || (parts[0] === currentUserId ? parts[1] : parts[0]);
      setReceiverId(receiver || null);

      if (receiver) {
        const userSnap = await getDoc(doc(db, 'users', receiver));
        if (userSnap.exists()) {
          const data = userSnap.data();
          setReceiverName(getPreferredProfileName(data));
          setReceiverPhoto(data.photoURL || null);
          setReceiverRole(['seller', 'VENDOR'].includes(data.role) ? 'seller' : 'user');
        }
      }
    };

    loadReceiver().catch((error) => console.error('Error loading chat receiver:', error));
  }, [chatId, currentUserId]);

  useEffect(() => {
    if (!receiverId) return;

    const unsubscribeUser = onSnapshot(doc(db, 'users', receiverId), (userSnap) => {
      if (userSnap.exists()) {
        const data = userSnap.data();
        
        const isOnlineFlag = data.online === true;
        
        // 🛠️ lastSeen အချိန်ကို စစ်ဆေးခြင်း (လွန်ခဲ့တဲ့ စက္ကန့် ၆၀ အတွင်း update ဖြစ်ထားမှ အမှန်တကယ် Online ဖြစ်သည်)
        let isRecentlyActive = false;
        if (data.lastSeen) {
          const lastSeenDate = typeof data.lastSeen.toDate === 'function' 
            ? data.lastSeen.toDate() 
            : new Date(data.lastSeen);
          
          const diffInSeconds = (new Date().getTime() - lastSeenDate.getTime()) / 1000;
          // လွန်ခဲ့တဲ့ ၆၀ စက္ကန့် (၁ မိနစ်) အတွင်း ဖြစ်မှ Online ပြမည်
          isRecentlyActive = diffInSeconds < 60;
        }

        // Flag ရော အချိန်ရော နှစ်ခုစလုံး မှန်မှ Online ပြမည်
        setIsReceiverOnline(isOnlineFlag && isRecentlyActive); 
      }
    });

    return () => unsubscribeUser();
  }, [receiverId]);

  useEffect(() => {
    if (!activeUserId || !chatId) return;
    const unsubscribe = listenChatRoom(chatId, async (msgs) => {
      const refreshedMessages = await Promise.all(msgs.map(async (msg: any) => {
        if (msg.type !== 'order' || !msg.orderId) return msg;
        const orderSnapshot = await getDoc(doc(db, 'orders', msg.orderId));
        if (!orderSnapshot.exists()) return msg;
        const orderData = { ...msg.orderData, ...orderSnapshot.data() };
        const sellerSnapshot = orderData.sellerId ? await getDoc(doc(db, 'users', orderData.sellerId)) : null;
        const buyerSnapshot = orderData.buyerId ? await getDoc(doc(db, 'users', orderData.buyerId)) : null;
        const sellerData = sellerSnapshot?.exists() ? sellerSnapshot.data() : {};
        const buyerData = buyerSnapshot?.exists() ? buyerSnapshot.data() : {};
        return {
          ...msg,
          orderData: {
            ...orderData,
            storeName: orderData.storeName || getPreferredProfileName(sellerData) || 'Shop',
            storeAddress: orderData.storeAddress || sellerData.shopAddress || 'Store address not provided',
            storePhone: orderData.storePhone || sellerData.shopPhone || 'Store phone not provided',
            buyerName: orderData.buyerName || orderData.customerName || getPreferredProfileName(buyerData) || 'Buyer',
          },
        };
      }));
      const sorted = refreshedMessages.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessages(sorted);
      console.log('📨 Messages with read status:', sorted.map(m => ({ id: m.id, read: m.read }))); // ✅ Debug log
      markMessagesAsRead(chatId, activeUserId);
    });
    return () => unsubscribe();
  }, [chatId, activeUserId]);  
  
  // 2. Send Text
    const handleSend = async () => {
    if (!newMessage.trim() || !activeUserId || !receiverId || sending) return;
    setSending(true);
    try {
      await sendMessage(
        chatId, 
        activeUserId, 
        receiverId, 
        newMessage.trim(),
        replyTo // ✅ Reply Data
      );
      setNewMessage('');
      setReplyTo(null); // ✅ Reply ပြီးရင် ဖျက်မယ်
    } catch (e) { console.error(e); } finally { setSending(false); }
  };

  // ✅ Cancel Reply
  const cancelReply = () => {
    setReplyTo(null);
  };

  // 3. Image Upload
  const handleImageUpload = async (file: File) => {
    if (!activeUserId || !receiverId) return;

    if (file.size <= 5 * 1024 * 1024) {
      console.log('✅ File size is within 5MB limit, using original file');
      
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      setIsUploading(true);
      try {
        const imageUrl = await uploadToCloudinary(file);
        await sendImageMessage(chatId, activeUserId, receiverId, imageUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to send image. Please try again.');
      } finally {
        setIsUploading(false);
      }
      return;
    }

    console.log('🔄 File size exceeds 5MB, compressing...');
    
    let processedFile = file;
    try {
      processedFile = await compressImage(file);
    } catch (error) {
      console.error('Error compressing image:', error);
      alert('Failed to compress image. Please try another image.');
      return;
    }

    if (processedFile.size > 5 * 1024 * 1024) {
      alert('Image could not be compressed to under 5MB. Please choose a smaller image.');
      return;
    }

    if (!processedFile.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setIsUploading(true);

    try {
      const imageUrl = await uploadToCloudinary(processedFile);
      await sendImageMessage(chatId, activeUserId, receiverId, imageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to send image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const sendImageMessage = async (
    chatId: string,
    senderId: string,
    receiverId: string,
    imageUrl: string
  ) => {
    try {
      console.log('📤 Sending image message:', imageUrl);

      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        const chatData = {
          participants: [senderId, receiverId],
          createdAt: serverTimestamp(),
          lastMessage: '📷 Image',
          lastMessageTime: serverTimestamp(),
          unreadCount: {},
        };
        await setDoc(chatRef, chatData, { merge: true });
      }

      const messageRef = collection(db, 'chats', chatId, 'messages');
      const docRef = await addDoc(messageRef, {
        senderId,
        receiverId,
        message: '📷 Image',
        image: imageUrl,
        timestamp: serverTimestamp(),
        read: false,
        type: 'image',
      });

      console.log('✅ Image message saved with ID:', docRef.id);

      await updateDoc(chatRef, {
        lastMessage: '📷 Image',
        lastMessageTime: serverTimestamp(),
        [`unreadCount.${receiverId}`]: increment(1),
      });

      const receiverUserChatRef = doc(db, 'userChats', receiverId, 'chats', chatId);
      await setDoc(
        receiverUserChatRef,
        {
          lastMessage: '📷 Image',
          lastMessageTime: serverTimestamp(),
          unreadCount: increment(1),
          lastMessageSenderId: senderId,
        },
        { merge: true }
      );

      const senderUserChatRef = doc(db, 'userChats', senderId, 'chats', chatId);
      await setDoc(
        senderUserChatRef,
        {
          lastMessage: '📷 Image',
          lastMessageTime: serverTimestamp(),
          unreadCount: 0,
          lastMessageSenderId: senderId,
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error sending image message:', error);
      throw error;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('📸 File selected:', file.name, file.type);
      handleImageUpload(file);
    }
    e.target.value = '';
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('📸 Camera captured:', file.name, file.type);
      handleImageUpload(file);
    }
    e.target.value = '';
  };

  // 4. Create Order Logic
  const openOrderModal = async () => {
    if (!user || !receiverId) return;
    setOrderItems([{ productId: '', productTitle: '', productImage: '', price: 0, quantity: 1, total: 0 }]);
    setIsOrderModalOpen(true);
    const q = query(collection(db, 'products'), where('sellerId', '==', user.uid));
    const products = (await getDocs(q)).docs.map(d => ({ id: d.id, ...d.data() }));
    setSellerProducts(products);
    const userSnap = await getDoc(doc(db, 'users', user.uid));
    if (userSnap.exists()) {
      const sellerData = userSnap.data();
      const preferredName = getPreferredProfileName(sellerData);
      setStoreName(preferredName || 'My Shop');
      setStoreAddress(sellerData.shopAddress || 'Address not provided');
      setStorePhone(sellerData.shopPhone || sellerData.phone || 'Phone not provided');
    }
  };

  const addOrderItem = () => {
    if (sellerProducts.length === 0) return;
    const p = sellerProducts[0];
    setOrderItems([...orderItems, { productId: p.id, productTitle: p.name || p.title, productImage: '', price: Number(p.price), quantity: 1, total: Number(p.price) }]);
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
    const updated = [...orderItems];
    updated[index][field] = value;
    if (field === 'productId') {
      const p = sellerProducts.find(prod => prod.id === value);
      if (p) {
        updated[index].productTitle = p.name || p.title;
        updated[index].price = Number(p.price);
        updated[index].total = Number(p.price) * updated[index].quantity;
      }
    }
    if (field === 'quantity') {
      // empty ဖြစ်ခွင့်ပြု (user ဖျက်လို့ရအောင်)
      if (value === '') {
        updated[index].quantity = '';
        updated[index].total = 0;
      } else {
        const qty = Number(value);
        updated[index].quantity = qty;
        updated[index].total = updated[index].price * qty;
      }
    }
    setOrderItems(updated);
  };

  const submitOrder = async () => {
    if (!user || !receiverId || orderItems.length === 0) return;
    setLoadingOrder(true);
    setOrderError('');
    try {
      const validOrderItems = orderItems.filter((item) => item.productId && item.quantity > 0);
      if (validOrderItems.length === 0) {
        throw new Error('Select at least one product before sending the order.');
      }
      const total = validOrderItems.reduce((sum, i) => sum + i.total, 0);
      const orderRef = doc(collection(db, 'orders'));
      const receiptYear = new Date().getFullYear();
      let receiptNumber = '';
      await runTransaction(db, async (transaction) => {
        const nextReceipt = await getNextReceiptNumber(transaction, db, user.uid, receiptYear);
        receiptNumber = nextReceipt.number;
        transaction.set(orderRef, {
          chatId, 
          sellerId: user.uid, 
          buyerId: receiverId, 
          buyerName: receiverName || 'Buyer',
          storeName, 
          storeAddress,
          storePhone,
          receiptNumber,
          receiptYear,
          items: validOrderItems, 
          totalAmount: total, 
          status: 'PENDING', 
          createdAt: serverTimestamp(),
        });
      });

      const orderData = { 
        chatId, 
        sellerId: user.uid, 
        buyerId: receiverId, 
        buyerName: receiverName || 'Buyer',
        storeName, 
        storeAddress,
        storePhone,
        receiptNumber,
        receiptYear,
        items: validOrderItems, 
        totalAmount: total, 
        status: 'PENDING', 
        createdAt: serverTimestamp() 
      };
      
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid, 
        receiverId, 
        message: 'New Order', 
        type: 'order',
        orderId: orderRef.id, 
        orderData, 
        timestamp: serverTimestamp(), 
        read: false
      });

      await updateDoc(doc(db, 'chats', chatId), { 
        lastMessage: `[Order] Total: ${total} MMK`, 
        lastMessageTime: serverTimestamp(), 
        lastMessageSenderId: user.uid 
      });

      setIsOrderModalOpen(false);
      setOrderItems([{ productId: '', productTitle: '', productImage: '', price: 0, quantity: 1, total: 0 }]);
    } catch (e) {
      console.error('Error submitting order:', e);
      setOrderError(e instanceof Error ? e.message : 'Unable to send order. Please try again.');
    } finally { 
      setLoadingOrder(false); 
    }
  };

  // 5. Confirm / Cancel
  const handleOrderAction = async () => {
  if (!selectedOrder || !pendingOrderAction || loadingOrder) return;

  const orderId = selectedOrder.orderId || selectedOrder.orderData?.orderId || selectedOrder.id || selectedOrder.orderData?.id || '';
  if (!orderId) {
    console.error('Order action failed because the order id is missing.', selectedOrder);
    setOrderError('This order is missing its ID. Please reopen the chat and try again.');
    return;
  }

  if (pendingOrderAction === 'CONFIRMED' && (!buyerPhone.trim() || !buyerAddress.trim() || !buyerPaymentMethod.trim())) {
    setOrderError('Please fill in phone, delivery address, and payment method before confirming.');
    return;
  }

  setOrderError('');

  const currentPhone = buyerPhone.trim();
  const currentAddress = buyerAddress.trim();
  const currentPayment = buyerPaymentMethod.trim();
  const currentPendingAction = pendingOrderAction;

  const previousMessages = [...messages];

  const updatedOrderData = {
    ...(selectedOrder.orderData || {}),
    ...(currentPendingAction === 'CONFIRMED' ? {
      customerPhone: currentPhone,
      deliveryAddress: currentAddress,
      paymentMethod: currentPayment,
    } : {}),
    status: currentPendingAction,
  };

  if (chatId && selectedOrder.id) {
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.id === selectedOrder.id 
          ? { ...msg, orderData: updatedOrderData }
          : msg
      )
    );
  }

  setIsActionModalOpen(false);
  setPendingOrderAction(null);
  setLoadingOrder(true);

  try {
    const orderRef = doc(db, 'orders', orderId);

    if (currentPendingAction === 'CONFIRMED') {
      const orderSnapshot = await getDoc(orderRef);
      const orderDoc = orderSnapshot.exists() ? orderSnapshot.data() : null;
      const existingReceiptNumber = orderDoc?.receiptNumber || '';
      
      const orderBuyerId = orderDoc?.buyerId || selectedOrder.orderData?.buyerId || selectedOrder.buyerId || '';
      const orderSellerId = orderDoc?.sellerId || selectedOrder.orderData?.sellerId || selectedOrder.sellerId || '';
      const userIsBuyer = String(activeUserId).trim() === String(orderBuyerId).trim();
      const userIsSeller = String(activeUserId).trim() === String(orderSellerId).trim();

      if (!userIsBuyer && !userIsSeller) {
        throw new Error('You are not allowed to confirm this order.');
      }

      const receiptYear = new Date().getFullYear();

      await runTransaction(db, async (transaction) => {
        const orderSnapshot = await transaction.get(orderRef);
        if (!orderSnapshot.exists()) throw new Error('Order no longer exists.');

        const order = orderSnapshot.data();
        if (order.status === 'CONFIRMED' || order.status === 'CANCELLED') {
          return;
        }

        const quantities = new Map<string, number>();
        for (const item of order.items || []) {
          if (!item.productId || item.quantity <= 0) {
            throw new Error('This order contains an invalid product.');
          }
          quantities.set(item.productId, (quantities.get(item.productId) || 0) + Number(item.quantity));
        }

        const productEntries = Array.from(quantities.entries());
        const productSnapshots = await Promise.all(
          productEntries.map(([productId]) => transaction.get(doc(db, 'products', productId)))
        );

        productSnapshots.forEach((productSnapshot, index) => {
          const [productId, quantity] = productEntries[index];
          if (!productSnapshot.exists()) throw new Error(`Product ${productId} no longer exists.`);
          const currentStock = Number(productSnapshot.data().stock || 0);
          if (currentStock < quantity) throw new Error('Not enough stock to confirm this order.');
          
          transaction.update(productSnapshot.ref, { stock: currentStock - quantity });
        });

        transaction.update(orderRef, {
          status: 'CONFIRMED',
          inventoryApplied: true,
          customerPhone: currentPhone,
          deliveryAddress: currentAddress,
          paymentMethod: currentPayment,
          receiptNumber: existingReceiptNumber,
          receiptYear: receiptYear,
        });
      });

      if (chatId && selectedOrder.id) {
        await updateDoc(doc(db, 'chats', chatId, 'messages', selectedOrder.id), {
          orderData: {
            ...updatedOrderData,
            customerPhone: currentPhone,
            deliveryAddress: currentAddress,
            paymentMethod: currentPayment,
            receiptNumber: existingReceiptNumber,
            receiptYear: receiptYear,
          },
        });
      }

      // ✅ Product ရဲ့ totalSales နဲ့ totalRevenue ကိုတိုးမယ်
      const order = selectedOrder.orderData || {}; // ✅ ဒီလိုင်းထည့်ပါ
      for (const item of order.items || []) {      // ✅ order → orderData ကနေယူမယ်
        if (item.productId) {
          const productRef = doc(db, 'products', item.productId);
          await updateDoc(productRef, {
            totalSales: increment(item.quantity || 1),
            totalRevenue: increment(item.total || 0),
          });
        }
      }

      // ✅ ဒီနေရာမှာ orderData ကို update လုပ်တာရှိရင် ဆက်လုပ်ပါ
      if (chatId && selectedOrder.id) {
        await updateDoc(doc(db, 'chats', chatId, 'messages', selectedOrder.id), {
          orderData: {
            ...updatedOrderData,
            customerPhone: currentPhone,
            deliveryAddress: currentAddress,
            paymentMethod: currentPayment,
            receiptNumber: existingReceiptNumber,
            receiptYear: receiptYear,
          },
        });
      }

      setBuyerPhone('');
      setBuyerAddress('');
      setBuyerPaymentMethod('');
      
    } else {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'CANCELLED',
      });

      if (chatId && selectedOrder.id) {
        await updateDoc(doc(db, 'chats', chatId, 'messages', selectedOrder.id), {
          'orderData.status': 'CANCELLED',
        });
      }
    }

    setSelectedOrder(null);

  } catch (e) {
    console.error('Failed to process order action:', e);
    setOrderError(e instanceof Error ? e.message : 'Unable to update this order. Please try again.');
    
    setMessages(previousMessages);
  } finally {
    setLoadingOrder(false);
  }
};

  // 6. RENDER - ✅ အားလုံး CSS Variables နဲ့အစားထိုးပြီး
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      backgroundColor: 'var(--background)' 
    }}>
      {/* HEADER */}
      <div style={{ 
        padding: '12px 16px', 
        backgroundColor: 'var(--card-background)', 
        borderBottom: '1px solid var(--card-border)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>          
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '50%', 
            overflow: 'hidden', 
            backgroundColor: 'var(--input-background)', 
            border: '2px solid var(--accent)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            {receiverPhoto ? (
              <img src={receiverPhoto} alt={receiverName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: 'var(--foreground)', fontWeight: 'bold' }}>{receiverName?.charAt(0)?.toUpperCase() || 'U'}</span>
            )}
          </div>

          <div>
            <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{receiverName || 'Loading...'}</div>
            <div style={{ 
              fontSize: '11px', 
              color: isReceiverOnline ? '#4ade80' : '#9ca3af', // Online ဆိုရင် အစိမ်းရောင်၊ Offline ဆိုရင် မီးခိုးရောင်
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px' 
            }}>
              <span style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                backgroundColor: isReceiverOnline ? '#4ade80' : '#9ca3af' // အစက်အရောင်
              }}></span>
              {receiverRole === 'seller' ? '🛒 Seller' : 'Buyer'} • {isReceiverOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>

        {(propUserRole === 'seller' || isUserSeller) && receiverId && (
          <button 
            onClick={openOrderModal} 
            style={{ 
              backgroundColor: 'var(--accent)', 
              border: 'none', 
              padding: '6px 12px', 
              borderRadius: '8px', 
              color: '#000', 
              fontWeight: '600', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px' 
            }}
          >
            <PackagePlus size={16} /> Create Order
          </button>
        )}
      </div>

      {/* MESSAGES LIST */}
      <div 
        ref={scrollContainerRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '16px', 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: 'var(--background)',
          position: 'relative', //
        }}
      >
        {messages.map((msg, index) => {
          const isOwn = String(msg.senderId || '').trim() === String(activeUserId).trim();
          const messageDate = formatMessageDate(msg.timestamp);
          const previousMessageDate = index > 0 ? formatMessageDate(messages[index - 1].timestamp) : null;
          const showDateDivider = messageDate && messageDate !== previousMessageDate;
          const messageTime = formatMessageTime(msg.timestamp);
          
          const isOrder = msg.type === 'order' || (msg.orderData && msg.orderData.items);
          const isImage = msg.type === 'image' || (msg.image && typeof msg.image === 'string' && msg.image.length > 0);
          
          // ----- IMAGE MESSAGE -----
          if (isImage) {
            return (
              <Fragment key={msg.id}>
                {showDateDivider && (
                  <div style={{ 
                    alignSelf: 'center', 
                    color: 'var(--text-muted)', 
                    fontSize: '11px', 
                    margin: '8px 0 12px', 
                    textAlign: 'center' 
                  }}>
                    {messageDate}
                  </div>
                )}
                
                {/* ✅ MessageBubble ကို အပြင်မှာထားပြီး Image ကိုအတွင်းမှာထားမယ် */}
                <div
                  id={`msg-${msg.id}`}
                  ref={(el) => {
                    if (el) {
                      messageRefs.current[msg.id] = el;
                    }
                  }}
                  className="message-container"  // ✅ ဒီမှာ className ထည့်ပါ
                  style={{ width: '100%' }}
                >
                  <MessageBubble 
                    message={msg} 
                    isOwn={isOwn}
                    showReadReceipt={true}
                    currentUserId={activeUserId}
                    onReply={(msg) => {
                      setReplyTo({
                        id: msg.id,
                        message: msg.message,
                        senderId: msg.senderId
                      });
                    }}
                    onReaction={handleReaction}
                    onDelete={handleDeleteMessage}
                    canDelete={isMessageOldEnough(msg.timestamp)}
                    renderContent={() => (
                      <div
                        style={{
                          backgroundColor: isOwn ? 'var(--accent)' : 'var(--card-background)',
                          padding: '8px',
                          borderRadius: isOwn ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                          display: 'inline-block',
                          maxWidth: '100%',
                        }}
                      >
                        {msg.image ? (
                          <div
                            onClick={(e) => {
                              e.stopPropagation(); // ✅ ဒီမှာ stopPropagation ထည့်ပါ
                              setFullscreenImage(msg.image);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <img
                              src={msg.image}
                              alt="Chat image"
                              style={{
                                maxWidth: '100%',
                                maxHeight: '300px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                                display: 'block',
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-image.png';
                              }}
                            />
                          </div>
                        ) : (
                          <div style={{ color: 'var(--text-muted)', padding: '8px' }}>Image not available</div>
                        )}
                      </div>
                    )}
                  />
                </div>
              </Fragment>
            );
          }

          // ChatRoom.tsx - CONFIRMED ORDER
          if (isOrder) {
            const order = msg.orderData || {}; // ✅ ဒီမှာ order ကိုယူပါ
            const isBuyer = activeUserId === order.buyerId;
            const isCancelled = order.status === 'CANCELLED';
            const isConfirmed = order.status === 'CONFIRMED';
            if (isConfirmed) {
              return (
                <Fragment key={msg.id}>
                  {showDateDivider && <div style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: '11px', margin: '8px 0 12px', textAlign: 'center' }}>{messageDate}</div>}
                  
                  <div
                    id={`msg-${msg.id}`}
                    ref={(el) => {
                      if (el) {
                        messageRefs.current[msg.id] = el;
                      }
                    }}
                    className="message-container"  // ✅ ဒီမှာ className ထည့်ပါ
                    style={{ width: '100%' }}
                  >
                    <MessageBubble 
                      message={msg} 
                      isOwn={isOwn}
                      showReadReceipt={true}
                      currentUserId={activeUserId}
                      onReply={(msg) => {
                        setReplyTo({
                          id: msg.id,
                          message: msg.message,
                          senderId: msg.senderId
                        });
                      }}
                      onReaction={handleReaction}
                      onDelete={handleDeleteMessage}
                      canDelete={isMessageOldEnough(msg.timestamp)}
                      renderContent={() => (
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label="View receipt full screen"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReceiptOrder(order);
                            setIsReceiptFullscreen(true);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              setReceiptOrder(order);
                              setIsReceiptFullscreen(true);
                            }
                          }}
                          style={{ 
                            backgroundColor: 'var(--card-background)', 
                            border: '1px solid var(--card-border)', 
                            borderRadius: '12px', 
                            padding: '16px', 
                            color: 'var(--foreground)', 
                            maxWidth: '420px', 
                            width: '100%', 
                            maxHeight: 'min(620px, calc(100vh - 120px))', 
                            overflowY: 'auto', 
                            boxSizing: 'border-box', 
                            fontSize: '12px', 
                            cursor: 'zoom-in' 
                          }}
                        >
                          {/* Receipt Content */}
                          <div style={{ 
                            borderBottom: '1px solid var(--card-border)', 
                            paddingBottom: '12px', 
                            marginBottom: '12px', 
                            display: 'grid', 
                            gridTemplateColumns: 'minmax(0, 1fr) auto', 
                            gap: '12px' 
                          }}>
                            <div style={{ display: 'grid', gap: '4px', minWidth: 0 }}>
                              <div style={{ color: 'var(--accent)', fontWeight: '600', fontSize: '15px', overflowWrap: 'anywhere' }}>🏢 {order.storeName || 'Shop'}</div>
                              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4, overflowWrap: 'anywhere' }}>{order.storeAddress || 'Store address not provided'}</div>
                              <div style={{ color: 'var(--text-secondary)' }}>{order.storePhone || 'Store phone not provided'}</div>
                            </div>
                            <div style={{ textAlign: 'right', display: 'grid', alignContent: 'start', justifyItems: 'end', gap: '4px', whiteSpace: 'nowrap' }}>
                              <strong style={{ color: 'var(--success)', fontSize: '11px' }}>✅ CONFIRMED</strong>
                              <strong style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '5px' }}>Receipt No:</strong>
                              <div>{order.receiptNumber || 'Not issued'}</div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '10px', lineHeight: 1.4, whiteSpace: 'normal' }}>{formatMessageDate(order.createdAt) || messageDate} {formatMessageTime(order.createdAt) || messageTime}</div>
                            </div>
                          </div>
                          <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', marginBottom: '12px' }}>
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: '2fr 1fr 1fr 1fr', 
                              gap: '8px', 
                              padding: '5px 0', 
                              color: 'var(--text-muted)', 
                              fontSize: '10px', 
                              fontWeight: '600', 
                              borderBottom: '1px solid var(--card-border)', 
                              textAlign: 'center' 
                            }}>
                              <span>Items</span>
                              <span>Quantity</span>
                              <span>Price</span>
                              <span>Total</span>
                            </div>
                            {order.items?.map((item: any, idx: number) => (
                              <div key={idx} style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '2fr 1fr 1fr 1fr', 
                                gap: '8px', 
                                padding: '6px 0', 
                                color: 'var(--text-secondary)', 
                                alignItems: 'start' 
                              }}>
                                <span style={{ overflowWrap: 'anywhere', textAlign: 'left' }}>{item.productTitle || 'Product'}</span>
                                <span style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{item.quantity || 0}</span>
                                <span style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>{Number(item.price || 0).toLocaleString()}</span>
                                <span style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>{Number(item.total || 0).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ 
                            borderBottom: '1px solid var(--card-border)', 
                            paddingBottom: '12px', 
                            marginBottom: '12px', 
                            display: 'flex', 
                            justifyContent: 'flex-end', 
                            fontWeight: '600' 
                          }}>
                            <span style={{ color: 'var(--accent)', whiteSpace: 'nowrap' }}>Total Amount: {Number(order.totalAmount || 0).toLocaleString()} MMK</span>
                          </div>
                          <div style={{ 
                            borderBottom: '1px solid var(--card-border)', 
                            paddingBottom: '12px', 
                            marginBottom: '12px', 
                            display: 'grid', 
                            gap: '7px', 
                            color: 'var(--text-secondary)' 
                          }}>
                            <div style={{ overflowWrap: 'anywhere' }}><strong style={{ color: 'var(--text-muted)' }}>Buyer Information</strong> - {order.buyerName || order.customerName || receiverName || 'Buyer'}, {order.customerPhone || 'Not provided'}, {order.deliveryAddress || 'Not provided'}</div>
                            <div><strong style={{ color: 'var(--text-muted)' }}>Payment Method</strong> - {order.paymentMethod || 'Not provided'}</div>
                          </div>
                          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px', fontStyle: 'italic' }}>Thank you for your purchase!</div>
                        </div>
                      )}
                    />
                  </div>
                </Fragment>
              );
            }

            // ChatRoom.tsx - CANCELLED ORDER
            if (isCancelled) {
              return (
                <Fragment key={msg.id}>
                  {showDateDivider && <div style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: '11px', margin: '8px 0 12px', textAlign: 'center' }}>{messageDate}</div>}
                  
                  <div
                    id={`msg-${msg.id}`}
                    ref={(el) => {
                      if (el) {
                        messageRefs.current[msg.id] = el;
                      }
                    }}
                    className="message-container"  // ✅ ဒီမှာ className ထည့်ပါ
                    style={{ width: '100%' }}
                  >
                    <MessageBubble 
                      message={msg} 
                      isOwn={isOwn}
                      showReadReceipt={true}
                      currentUserId={activeUserId}
                      onReply={(msg) => {
                        setReplyTo({
                          id: msg.id,
                          message: msg.message,
                          senderId: msg.senderId
                        });
                      }}
                      onReaction={handleReaction}
                      onDelete={handleDeleteMessage}
                      canDelete={isMessageOldEnough(msg.timestamp)}
                      renderContent={() => (
                        <div style={{ 
                          padding: '12px', 
                          backgroundColor: '#451a1e', 
                          border: '1px solid #7f1d1d', 
                          borderRadius: '12px', 
                          color: '#fca5a5', 
                          maxWidth: '280px', 
                          width: '100%' 
                        }}>
                          <p style={{ fontWeight: 'bold', fontSize: '13px', margin: 0 }}>🚫 Order Cancelled</p>
                          {messageTime && <div style={{ color: '#fca5a5', fontSize: '10px', marginTop: '8px', textAlign: 'right' }}>{messageTime}</div>}
                        </div>
                      )}
                    />
                  </div>
                </Fragment>
              );
            }

            // ChatRoom.tsx - PENDING ORDER
            return (
              <Fragment key={msg.id}>
                {showDateDivider && <div style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: '11px', margin: '8px 0 12px', textAlign: 'center' }}>{messageDate}</div>}
                
                <div
                  id={`msg-${msg.id}`}
                  ref={(el) => {
                    if (el) {
                      messageRefs.current[msg.id] = el;
                    }
                  }}
                  className="message-container"  // ✅ ဒီမှာ className ထည့်ပါ
                  style={{ width: '100%' }}
                >
                  <MessageBubble 
                    message={msg} 
                    isOwn={isOwn}
                    showReadReceipt={true}
                    currentUserId={activeUserId}
                    onReply={(msg) => {
                      setReplyTo({
                        id: msg.id,
                        message: msg.message,
                        senderId: msg.senderId
                      });
                    }}
                    onReaction={handleReaction}
                    onDelete={handleDeleteMessage}
                    canDelete={isMessageOldEnough(msg.timestamp)}
                    renderContent={() => (
                      <div style={{ 
                        backgroundColor: 'var(--card-background)', 
                        border: '1px solid var(--card-border)', 
                        borderRadius: '12px', 
                        padding: '14px', 
                        color: 'var(--foreground)', 
                        maxWidth: '280px', 
                        width: '100%' 
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          borderBottom: '1px solid var(--card-border)', 
                          paddingBottom: '8px', 
                          marginBottom: '8px' 
                        }}>
                          <span style={{ color: 'var(--accent)', fontWeight: '600' }}>🏢 {order.storeName || 'Shop'}</span>
                          <span style={{ 
                            fontSize: '10px', 
                            padding: '2px 8px', 
                            borderRadius: '10px', 
                            backgroundColor: '#eab30820', 
                            color: '#eab308', 
                            fontWeight: '600' 
                          }}>PENDING</span>
                        </div>
                        {order.items?.map((item: any, idx: number) => (
                          <div key={idx} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            fontSize: '12px', 
                            color: 'var(--text-secondary)', 
                            padding: '4px 0' 
                          }}>
                            <span>{item.productTitle} (x{item.quantity})</span>
                            <span>{item.total} MMK</span>
                          </div>
                        ))}
                        <div style={{ 
                          borderTop: '1px solid var(--card-border)', 
                          paddingTop: '8px', 
                          marginTop: '8px', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          fontWeight: '600' 
                        }}>
                          <span>Total:</span>
                          <span style={{ color: 'var(--accent)' }}>{order.totalAmount} MMK</span>
                        </div>
                        {isBuyer ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }} htmlFor={`buyer-phone-${msg.id}`}>Phone number</label>
                            <input 
                              id={`buyer-phone-${msg.id}`} 
                              type="tel" 
                              value={buyerPhone} 
                              onChange={(e) => setBuyerPhone(e.target.value)} 
                              placeholder="Type your phone number" 
                              style={{ 
                                width: '100%', 
                                boxSizing: 'border-box', 
                                padding: '8px', 
                                borderRadius: '7px', 
                                backgroundColor: 'var(--input-background)', 
                                border: '1px solid var(--input-border)', 
                                color: 'var(--foreground)' 
                              }} 
                            />
                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }} htmlFor={`buyer-address-${msg.id}`}>Delivery address</label>
                            <textarea 
                              id={`buyer-address-${msg.id}`} 
                              value={buyerAddress} 
                              onChange={(e) => setBuyerAddress(e.target.value)} 
                              placeholder="Type your delivery address" 
                              rows={2} 
                              style={{ 
                                width: '100%', 
                                boxSizing: 'border-box', 
                                padding: '8px', 
                                borderRadius: '7px', 
                                backgroundColor: 'var(--input-background)', 
                                border: '1px solid var(--input-border)', 
                                color: 'var(--foreground)', 
                                resize: 'vertical' 
                              }} 
                            />
                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }} htmlFor={`buyer-payment-${msg.id}`}>Payment method</label>
                            <input 
                              id={`buyer-payment-${msg.id}`} 
                              type="text" 
                              value={buyerPaymentMethod} 
                              onChange={(e) => setBuyerPaymentMethod(e.target.value)} 
                              placeholder="Type your payment method" 
                              style={{ 
                                width: '100%', 
                                boxSizing: 'border-box', 
                                padding: '8px', 
                                borderRadius: '7px', 
                                backgroundColor: 'var(--input-background)', 
                                border: '1px solid var(--input-border)', 
                                color: 'var(--foreground)' 
                              }} 
                            />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              <button 
                                onClick={() => { setSelectedOrder(msg); setPendingOrderAction('CONFIRMED'); setIsActionModalOpen(true); }} 
                                disabled={!buyerPhone.trim() || !buyerAddress.trim() || !buyerPaymentMethod.trim()} 
                                style={{ 
                                  flex: 1, 
                                  padding: '8px', 
                                  borderRadius: '8px', 
                                  backgroundColor: 'var(--success)', 
                                  border: 'none', 
                                  color: '#fff', 
                                  fontWeight: '600', 
                                  cursor: !buyerPhone.trim() || !buyerAddress.trim() || !buyerPaymentMethod.trim() ? 'not-allowed' : 'pointer', 
                                  opacity: !buyerPhone.trim() || !buyerAddress.trim() || !buyerPaymentMethod.trim() ? 0.45 : 1 
                                }}
                              >
                                Confirm
                              </button>
                              <button 
                                onClick={() => { setSelectedOrder(msg); setPendingOrderAction('CANCELLED'); setIsActionModalOpen(true); }} 
                                style={{ 
                                  flex: 1, 
                                  padding: '8px', 
                                  borderRadius: '8px', 
                                  backgroundColor: 'var(--error)', 
                                  border: 'none', 
                                  color: '#fff', 
                                  fontWeight: '600', 
                                  cursor: 'pointer' 
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px', fontStyle: 'italic' }}>
                            Waiting for buyer confirmation...
                          </div>
                        )}
                        {messageTime && <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '8px', textAlign: 'right' }}>{messageTime}</div>}
                      </div>
                    )}
                  />
                </div>
              </Fragment>
            );
          }

          // ✅ ----- TEXT MESSAGE (MessageBubble ကိုသုံးမယ်) -----
          return (
            <Fragment key={msg.id}>
              {showDateDivider && (
                <div style={{ 
                  alignSelf: 'center', 
                  color: 'var(--text-muted)', 
                  fontSize: '11px', 
                  margin: '8px 0 12px', 
                  textAlign: 'center' 
                }}>
                  {messageDate}
                </div>
              )}
              
              <div
                id={`msg-${msg.id}`}
                ref={(el) => {
                  if (el) {
                    messageRefs.current[msg.id] = el;
                  }
                }}
                className="message-container"  // ✅ ဒီမှာ className ထည့်ပါ
                style={{ width: '100%' }}
              >
                <MessageBubble 
                  message={msg} 
                  isOwn={isOwn}
                  showReadReceipt={true}
                  currentUserId={activeUserId}
                  onReply={(msg) => {
                    setReplyTo({
                      id: msg.id,
                      message: msg.message,
                      senderId: msg.senderId
                    });
                  }}
                  onReaction={handleReaction}
                  onDelete={handleDeleteMessage}
                  canDelete={isMessageOldEnough(msg.timestamp)}
                />
              </div>
            </Fragment>
          );
        })}
        <div ref={messagesEndRef} />

        {/* ✅ Scroll to Bottom Button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            style={{
              position: 'absolute',
              bottom: '90px',
              right: '20px',
              backgroundColor: 'var(--accent)',
              color: '#000',
              border: 'none',
              borderRadius: '50%',
              width: '46px',
              height: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              zIndex: 10,
              transition: 'all 0.2s ease',
              opacity: 0.9,
              animation: 'bounceIn 0.4s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
            }}
            aria-label="Scroll to bottom"
          >
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 5v14" />
              <path d="M19 12l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* ✅ Typing Indicator */}
      {isTyping && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          alignSelf: 'flex-start',
          color: 'var(--text-muted)',
          fontSize: '13px'
        }}>
          <div style={{
            display: 'flex',
            gap: '4px',
            alignItems: 'center'
          }}>
            <span style={{
              width: '8px', //typing indicator dot များသေးရန်
              height: '8px', //typing indicator dot များသေးရန်
              backgroundColor: 'var(--text-muted)',
              borderRadius: '50%',
              animation: 'typingDot 1.4s ease-in-out infinite',
              animationDelay: '0s'
            }} />
            <span style={{
              width: '8px',
              height: '8px',
              backgroundColor: 'var(--text-muted)',
              borderRadius: '50%',
              animation: 'typingDot 1.4s ease-in-out infinite',
              animationDelay: '0.2s'
            }} />
            <span style={{
              width: '8px',
              height: '8px',
              backgroundColor: 'var(--text-muted)',
              borderRadius: '50%',
              animation: 'typingDot 1.4s ease-in-out infinite',
              animationDelay: '0.4s'
            }} />
          </div>
          <span>typing...</span>
        </div>
      )}

      {/* ✅ Reply Preview */}
      {replyTo && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--hover-background)',
          padding: '8px 14px',
          borderTop: '1px solid var(--card-border)',
          borderBottom: '1px solid var(--card-border)'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: '600' }}>
              Replying to {replyTo.senderId === activeUserId ? 'yourself' : 'them'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {replyTo.message}
            </div>
          </div>
          <button
            onClick={cancelReply}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* INPUT */}
      <div style={{ 
        padding: '12px 16px', 
        backgroundColor: 'var(--card-background)', 
        borderTop: '1px solid var(--card-border)', 
        display: 'flex', 
        gap: '8px', 
        alignItems: 'center' 
      }}>
        
        {/* ✅ Emoji Button */}
        <EmojiButton 
          onEmojiSelect={(emoji) => {
            setNewMessage(prev => prev + emoji);
          }} 
        />

        {/* Plus Button - Image Upload (Gallery + Camera) */}
        <label
          style={{
            padding: '10px',
            borderRadius: '50%',
            backgroundColor: 'var(--input-background)',
            border: '1px solid var(--input-border)',
            color: 'var(--text-muted)',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            opacity: isUploading ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isUploading) {
              e.currentTarget.style.backgroundColor = 'var(--hover-background)';
              e.currentTarget.style.borderColor = 'var(--accent)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--input-background)';
            e.currentTarget.style.borderColor = 'var(--input-border)';
          }}
        >
          <Plus size={18} />
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={isUploading}
          />
        </label>

        <input
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            startTyping();
          }}
          onBlur={() => {
            stopTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              stopTyping();
              handleSend();
            }
          }}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '20px',
            backgroundColor: 'var(--input-background)',
            border: '1px solid var(--input-border)',
            color: 'var(--foreground)',
            outline: 'none',
          }}
          disabled={isUploading}
        />
        
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || sending || isUploading}
          style={{
            padding: '10px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent)',
            border: 'none',
            color: '#000',
            cursor: 'pointer',
            opacity: newMessage.trim() && !sending && !isUploading ? 1 : 0.5,
          }}
        >
          <Send size={18} />
        </button>
      </div>

      {/* Uploading Indicator */}
      {isUploading && (
        <div style={{ 
          padding: '8px 16px', 
          backgroundColor: 'var(--card-background)', 
          borderTop: '1px solid var(--card-border)', 
          color: 'var(--accent)', 
          fontSize: '12px', 
          textAlign: 'center' 
        }}>
          Uploading image... Please wait.
        </div>
      )}

      {/* CREATE ORDER MODAL (SELLER) */}
      {isOrderModalOpen && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          backgroundColor: 'rgba(0,0,0,0.7)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
        }}>
          <div style={{ 
            backgroundColor: 'var(--card-background)', 
            padding: '24px', 
            borderRadius: '16px', 
            width: '90%', 
            maxWidth: '480px', 
            color: 'var(--foreground)', 
            maxHeight: '90vh', 
            overflowY: 'auto' 
          }}>
            <h3 style={{ marginBottom: '16px' }}>Create Order ({storeName})</h3>
            {orderError && <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#451a1e', color: '#fca5a5', fontSize: '12px' }}>{orderError}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {orderItems.map((item, idx) => (
                <div key={idx} style={{ padding: '12px', backgroundColor: 'var(--hover-background)', borderRadius: '12px' }}>
                  <select 
                    value={item.productId} 
                    onChange={(e) => updateOrderItem(idx, 'productId', e.target.value)} 
                    style={{ 
                      width: '100%', 
                      padding: '8px', 
                      borderRadius: '8px', 
                      backgroundColor: 'var(--input-background)', 
                      border: '1px solid var(--input-border)', 
                      color: 'var(--foreground)' 
                    }}
                  >
                    <option value="">Select Product</option>
                    {sellerProducts.map(p => <option key={p.id} value={p.id}>{p.name || p.title} - {p.price} MMK</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input 
                      type="number" 
                      readOnly 
                      value={item.price} 
                      style={{ 
                        flex: 2, 
                        padding: '6px', 
                        borderRadius: '6px', 
                        backgroundColor: 'var(--input-background)', 
                        border: '1px solid var(--input-border)', 
                        color: 'var(--foreground)' 
                      }} 
                    />
                    <input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={item.quantity} 
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        updateOrderItem(idx, 'quantity', val);
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '' || e.target.value === '0') {
                          updateOrderItem(idx, 'quantity', '1');
                        }
                      }}
                      style={{ 
                        flex: 1, 
                        padding: '6px', 
                        borderRadius: '6px', 
                        backgroundColor: 'var(--input-background)', 
                        border: '1px solid var(--input-border)', 
                        color: 'var(--foreground)' 
                      }} 
                    />
                  </div>
                </div>
              ))}
              <button 
                onClick={addOrderItem} 
                style={{ 
                  padding: '10px', 
                  backgroundColor: 'var(--hover-background)', 
                  border: '1px dashed var(--card-border)', 
                  borderRadius: '8px', 
                  color: 'var(--accent)', 
                  cursor: 'pointer' 
                }}
              >
                <Plus size={16} /> Add Item
              </button>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                borderTop: '1px solid var(--card-border)', 
                paddingTop: '12px', 
                fontWeight: '600' 
              }}>
                <span>Total:</span>
                <span style={{ color: 'var(--accent)' }}>{orderItems.reduce((s, i) => s + i.total, 0)} MMK</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setIsOrderModalOpen(false)} 
                  style={{ 
                    flex: 1, 
                    padding: '10px', 
                    borderRadius: '8px', 
                    backgroundColor: 'var(--input-background)', 
                    border: '1px solid var(--input-border)', 
                    color: 'var(--foreground)', 
                    cursor: 'pointer' 
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={submitOrder} 
                  disabled={loadingOrder} 
                  style={{ 
                    flex: 1, 
                    padding: '10px', 
                    borderRadius: '8px', 
                    backgroundColor: 'var(--accent)', 
                    border: 'none', 
                    color: '#000', 
                    fontWeight: '600', 
                    cursor: 'pointer' 
                  }}
                >
                  {loadingOrder ? 'Sending...' : 'Send Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTION MODAL (Buyer Confirm/Cancel Popup) */}
      {isActionModalOpen && selectedOrder && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          backgroundColor: 'rgba(0,0,0,0.8)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000, 
          padding: '16px' 
        }}>
          <div style={{ 
            backgroundColor: 'var(--card-background)', 
            borderRadius: '16px', 
            width: '100%', 
            maxWidth: '400px', 
            border: '1px solid var(--card-border)', 
            overflow: 'hidden', 
            padding: '24px' 
          }}>
            <h3 style={{ color: 'var(--foreground)', marginBottom: '16px' }}>{pendingOrderAction === 'CANCELLED' ? 'Cancel this order?' : 'Confirm this order?'}</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => { setIsActionModalOpen(false); setPendingOrderAction(null); }} 
                disabled={loadingOrder} 
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  borderRadius: '8px', 
                  backgroundColor: 'var(--input-background)', 
                  border: '1px solid var(--input-border)', 
                  color: 'var(--foreground)', 
                  cursor: 'pointer' 
                }}
              >
                Back
              </button>
              <button
                onClick={handleOrderAction}
                disabled={loadingOrder || (pendingOrderAction === 'CONFIRMED' && (!buyerPhone.trim() || !buyerAddress.trim() || !buyerPaymentMethod.trim()))}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: pendingOrderAction === 'CANCELLED' ? 'var(--error)' : 'var(--success)',
                  color: '#fff',
                  border: 'none',
                  cursor: loadingOrder || (pendingOrderAction === 'CONFIRMED' && (!buyerPhone.trim() || !buyerAddress.trim() || !buyerPaymentMethod.trim())) ? 'not-allowed' : 'pointer',
                  opacity: loadingOrder || (pendingOrderAction === 'CONFIRMED' && (!buyerPhone.trim() || !buyerAddress.trim() || !buyerPaymentMethod.trim())) ? 0.45 : 1,
                }}
              >
                {loadingOrder ? 'Processing...' : pendingOrderAction === 'CANCELLED' ? 'Cancel Order' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isReceiptFullscreen && receiptOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Receipt full screen"
          onClick={() => setIsReceiptFullscreen(false)}
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 2000, 
            backgroundColor: 'rgba(0, 0, 0, 0.94)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '24px', 
            cursor: 'zoom-out' 
          }}
        >
          <button
            type="button"
            aria-label="Close full-screen receipt"
            onClick={() => setIsReceiptFullscreen(false)}
            style={{ 
              position: 'fixed', 
              top: '18px', 
              right: '20px', 
              zIndex: 2001, 
              width: '40px', 
              height: '40px', 
              border: 'none', 
              borderRadius: '50%', 
              backgroundColor: '#fff', 
              color: '#18181b', 
              fontSize: '24px', 
              lineHeight: 1, 
              cursor: 'pointer' 
            }}
          >
            ×
          </button>
          <div
            onClick={(event) => event.stopPropagation()}
            style={{ 
              width: 'min(760px, 100%)', 
              maxHeight: 'calc(100vh - 48px)', 
              overflowY: 'auto', 
              backgroundColor: 'var(--card-background)', 
              border: '1px solid var(--card-border)', 
              borderRadius: '12px', 
              padding: 'clamp(18px, 4vw, 32px)', 
              color: 'var(--foreground)', 
              boxSizing: 'border-box', 
              fontSize: 'clamp(13px, 1.8vw, 16px)', 
              cursor: 'default' 
            }}
          >
            <div style={{ 
              borderBottom: '1px solid var(--card-border)', 
              paddingBottom: '16px', 
              marginBottom: '16px', 
              display: 'grid', 
              gridTemplateColumns: 'minmax(0, 1fr) auto', 
              gap: '16px' 
            }}>
              <div style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
                <div style={{ color: 'var(--accent)', fontWeight: '600', fontSize: '20px', overflowWrap: 'anywhere' }}>🏢 {receiptOrder.storeName || 'Shop'}</div>
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5, overflowWrap: 'anywhere' }}>{receiptOrder.storeAddress || 'Store address not provided'}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{receiptOrder.storePhone || 'Store phone not provided'}</div>
              </div>
              <div style={{ textAlign: 'right', display: 'grid', alignContent: 'start', justifyItems: 'end', gap: '6px', whiteSpace: 'nowrap' }}>
                <strong style={{ color: 'var(--success)' }}>✅ CONFIRMED</strong>
                <strong style={{ color: 'var(--text-muted)', marginTop: '6px' }}>Receipt No:</strong>
                <div>{receiptOrder.receiptNumber || 'Not issued'}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.5, whiteSpace: 'normal' }}>{formatMessageDate(receiptOrder.createdAt) || ''} {formatMessageTime(receiptOrder.createdAt) || ''}</div>
              </div>
            </div>
            <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '2fr 1fr 1fr 1fr', 
                gap: '10px', 
                padding: '7px 0', 
                color: 'var(--text-muted)', 
                fontSize: '12px', 
                fontWeight: '600', 
                borderBottom: '1px solid var(--card-border)', 
                textAlign: 'center' 
              }}>
                <span>Items</span>
                <span>Quantity</span>
                <span>Price</span>
                <span>Total</span>
              </div>
              {receiptOrder.items?.map((item: any, idx: number) => 
                <div key={idx} style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '2fr 1fr 1fr 1fr', 
                  gap: '10px', 
                  padding: '8px 0', 
                  alignItems: 'start' 
                }}>
                  <span style={{ overflowWrap: 'anywhere' }}>{item.productTitle || 'Product'}</span>
                  <span style={{ textAlign: 'center' }}>{item.quantity || 0}</span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{Number(item.price || 0).toLocaleString()}</span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{Number(item.total || 0).toLocaleString()}</span>
                </div>
              )}
            </div>
            <div style={{ 
              borderBottom: '1px solid var(--card-border)', 
              paddingBottom: '16px', 
              marginBottom: '16px', 
              display: 'flex', 
              justifyContent: 'flex-end', 
              fontWeight: '600' 
            }}>
              <span style={{ color: 'var(--accent)', whiteSpace: 'nowrap' }}>Total Amount: {Number(receiptOrder.totalAmount || 0).toLocaleString()} MMK</span>
            </div>
            <div style={{ 
              borderBottom: '1px solid var(--card-border)', 
              paddingBottom: '16px', 
              marginBottom: '16px', 
              display: 'grid', 
              gap: '8px', 
              color: 'var(--text-secondary)' 
            }}>              
              <div style={{ overflowWrap: 'anywhere' }}><strong style={{ color: 'var(--text-muted)' }}>Buyer Information</strong> - {receiptOrder.buyerName || receiptOrder.customerName || 'Buyer'}, {receiptOrder.customerPhone || 'Not provided'}, {receiptOrder.deliveryAddress || 'Not provided'}</div>
              <div><strong style={{ color: 'var(--text-muted)' }}>Payment Method</strong> - {receiptOrder.paymentMethod || 'Not provided'}</div>
            </div>
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Thank you for your purchase!</div>
          </div>
        </div>
      )}

      {/* FULLSCREEN IMAGE MODAL */}
      {fullscreenImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.3s ease',
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setFullscreenImage(null);
          }}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setFullscreenImage(null);
            }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              zIndex: 10000,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
            }}
          >
            <X size={24} />
          </button>

          <img
            src={fullscreenImage}
            alt="Fullscreen"
            style={{
              maxWidth: '95%',
              maxHeight: '95%',
              objectFit: 'contain',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-100%); }
        }
        
        @keyframes typingDot {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-8px);
            opacity: 1;
          }
        }
        
        @keyframes bounceIn {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.15); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 0.9; }
        }
        
        // ✅ ဒီအောက်မှာ ထည့်ပါ
        .message-container {
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          user-select: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        
        .message-container * {
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          user-select: none !important;
        }
      `}</style>
    </div>
  );
}