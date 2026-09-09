'use client';

import { Fragment, useState, useRef, useEffect } from 'react';
import { X, Send, MapPin, ShoppingBag, Phone, Mail } from "lucide-react";
import { db, auth } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface Message {
  id?: string;
  text: string;
  sender: 'user' | 'seller';
  timestamp: any;
  image?: string;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
}

export default function ChatModal({ isOpen, onClose, product }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [userRole, setUserRole] = useState<'user' | 'seller'>('user');
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current user role from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const userRef = doc(db, 'users', user.uid);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          setUserRole(snapshot.data().role || 'user');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Firebase ကနေ Message တွေကို ဖတ်မယ်
  useEffect(() => {
    if (!isOpen || !product?.id) return;
    
    const messagesRef = collection(db, 'chats', product.id, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages: Message[] = [];
      snapshot.forEach((doc) => {
        newMessages.push({
          id: doc.id,
          ...doc.data()
        } as Message);
      });
      setMessages(newMessages);
    });
    
    return () => unsubscribe();
  }, [isOpen, product?.id]);

  // Auto-reply logic
  useEffect(() => {
    if (messages.length === 0 && isOpen && product && userId) {
      const messagesRef = collection(db, 'chats', product.id, 'messages');
      
      const initialMessage = {
        text: `Hello! I'm interested in your product: ${product?.title}`,
        sender: userRole === 'seller' ? 'seller' : 'user',
        timestamp: serverTimestamp()
      };
      addDoc(messagesRef, initialMessage);
      
      setTimeout(() => {
        const replyMessage = {
          text: `Welcome! Thank you for your interest in ${product?.brand}. How can I help you today?`,
          sender: 'seller',
          timestamp: serverTimestamp()
        };
        addDoc(messagesRef, replyMessage);
      }, 1500);
    }
  }, [messages.length, isOpen, product, userId, userRole]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen || !product) return null;

  const handleSendMessage = () => {
    if (inputMessage.trim() === "") return;

    const messagesRef = collection(db, 'chats', product.id, 'messages');
    addDoc(messagesRef, {
      text: inputMessage.trim(),
      sender: userRole === 'seller' ? 'seller' : 'user',
      timestamp: serverTimestamp()
    });
    setInputMessage("");

    // Auto-reply from seller
    setTimeout(() => {
      const replyMessage = {
        text: `Thank you for your message! I'll get back to you shortly.`,
        sender: 'seller',
        timestamp: serverTimestamp()
      };
      addDoc(messagesRef, replyMessage);
    }, 1500);
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.3s ease"
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#121212",
          border: "1px solid #262626",
          borderRadius: "16px",
          maxWidth: "480px",
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          animation: "slideUp 0.3s ease"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #1a1a1a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            backgroundColor: "#0a0a0a",
            borderRadius: "16px 16px 0 0"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#1e1e1e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden"
              }}
            >
              <img
                src={product.image}
                alt={product.brand}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover"
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff" }}>
                {product.brand}
              </div>
              <div style={{ fontSize: "11px", color: "#38bdf8", display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
                Online
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "#1e1e1e",
              border: "none",
              color: "#ffffff",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Product Info */}
        <div
          style={{
            padding: "12px 20px",
            backgroundColor: "#0a0a0a",
            borderBottom: "1px solid #1a1a1a",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <ShoppingBag size={14} style={{ color: "#888888" }} />
          <span style={{ fontSize: "13px", color: "#d1d5db" }}>
            {product.title} - <span style={{ color: "#22c55e" }}>{product.price}</span>
          </span>
          <MapPin size={14} style={{ color: "#ef4444", marginLeft: "auto" }} />
          <span style={{ fontSize: "12px", color: "#888888" }}>{product.location}</span>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            minHeight: "300px",
            maxHeight: "400px"
          }}
        >
          {messages.map((message, index) => {
            const messageDate = formatDate(message.timestamp);
            const previousDate = index > 0 ? formatDate(messages[index - 1].timestamp) : '';
            return (
            <Fragment key={message.id}>
              {messageDate && messageDate !== previousDate && (
                <div style={{ color: '#888', fontSize: '11px', margin: '8px 0 4px', textAlign: 'center' }}>{messageDate}</div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: message.sender === 'user' ? "flex-end" : "flex-start",
                  animation: "messageSlide 0.3s ease"
                }}
              >
              <div
                style={{
                  maxWidth: "80%",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  backgroundColor: message.sender === 'user' ? "#38bdf8" : "#1e1e1e",
                  color: message.sender === 'user' ? "#000000" : "#ffffff",
                  fontSize: "14px",
                  lineHeight: 1.5,
                  wordBreak: "break-word"
                }}
              >
                {message.text}
                <div
                  style={{
                    fontSize: "10px",
                    color: message.sender === 'user' ? "rgba(0,0,0,0.5)" : "#666666",
                    marginTop: "4px",
                    textAlign: "right"
                  }}
                >
                  {formatTime(message.timestamp)}
                </div>
              </div>
              </div>
            </Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #1a1a1a",
            display: "flex",
            gap: "8px",
            backgroundColor: "#0a0a0a",
            borderRadius: "0 0 16px 16px",
            flexShrink: 0
          }}
        >
          <input
            type="text"
            placeholder={userRole === 'seller' ? "Reply to buyer..." : "Type your message..."}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
            style={{
              flex: 1,
              backgroundColor: "#1e1e1e",
              border: "1px solid #262626",
              borderRadius: "8px",
              padding: "10px 14px",
              color: "#ffffff",
              fontSize: "14px",
              outline: "none"
            }}
          />
          <button
            onClick={handleSendMessage}
            style={{
              backgroundColor: "#38bdf8",
              border: "none",
              borderRadius: "8px",
              padding: "10px 14px",
              color: "#000000",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Send size={18} />
          </button>
        </div>

        {/* Seller Info */}
        <div
          style={{
            padding: "8px 20px",
            borderTop: "1px solid #1a1a1a",
            display: "flex",
            gap: "16px",
            justifyContent: "center",
            backgroundColor: "#0a0a0a",
            borderRadius: "0 0 16px 16px",
            flexShrink: 0
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#888888" }}>
            <Phone size={12} />
            Contact Seller
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#888888" }}>
            <Mail size={12} />
            Message
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes messageSlide {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}