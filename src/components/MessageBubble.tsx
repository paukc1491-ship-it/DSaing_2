// components/MessageBubble.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, Trash2, X, Reply, AlertCircle } from 'lucide-react';

interface MessageBubbleProps {
  message: any;
  isOwn: boolean;
  showReadReceipt?: boolean;
  onReply?: (message: any) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string, forEveryone: boolean) => void;
  currentUserId?: string;
  deleteError?: string;
  canDelete?: boolean;
  renderContent?: () => React.ReactNode;
}

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function MessageBubble({ 
  message, 
  isOwn,
  showReadReceipt = true,
  onReply,
  onReaction,
  onDelete,
  currentUserId,
  deleteError,
  canDelete = false,
  renderContent,
}: MessageBubbleProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const closeAll = () => {
    setShowEmojiPicker(false);
    setShowActionMenu(false);
    setShowDeleteConfirm(false);
    setShowDeleteAlert(false);
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
  };

  // Click Outside → Close All
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeAll();
      }
    };

    if (showEmojiPicker || showActionMenu || showDeleteConfirm || showDeleteAlert) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showEmojiPicker, showActionMenu, showDeleteConfirm, showDeleteAlert]);

  // Page ကနေထွက်ရင် ပိတ်မယ်
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        closeAll();
      }
    };

    const handlePageHide = () => {
      closeAll();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  // Read Receipt
  const getReadStatus = () => {
    if (!showReadReceipt) return null;
    const iconColor = isOwn ? 'var(--text-muted)' : '#34b7f1';
    
    if (message.read === true) {
      return (
        <svg width="16" height="14" viewBox="0 0 20 14" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px', display: 'inline-block', verticalAlign: 'middle' }}>
          <path d="M1 8l3.5 3.5L12 4" />
          <path d="M8 8l3.5 3.5L19 4" />
        </svg>
      );
    }
    return <Check size={14} style={{ color: iconColor, marginLeft: '4px', verticalAlign: 'middle' }} />;
  };

  // Render Reactions
  const renderReactions = () => {
    if (!message.reactions || Object.keys(message.reactions).length === 0) return null;
    
    return (
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        marginTop: '4px',
        alignItems: 'center',
      }}>
        {Object.entries(message.reactions).map(([emoji, userIds]) => {
          if (!Array.isArray(userIds) || userIds.length === 0) return null;
          const isUserReacted = userIds.includes(currentUserId || '');
          return (
            <span key={emoji} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              fontSize: '13px',
              padding: '2px 6px',
              borderRadius: '12px',
              backgroundColor: isUserReacted ? 'rgba(56, 189, 248, 0.25)' : 'rgba(0,0,0,0.05)',
              cursor: 'pointer',
              border: isUserReacted ? '1px solid rgba(56, 189, 248, 0.4)' : 'none',
              zIndex: 10,
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
              }
              if (onReaction) {
                onReaction(message.id, emoji);
              }
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
              }
            }}
            >
              <span>{emoji}</span>
              <span style={{ fontSize: '11px', fontWeight: '500' }}>{userIds.length}</span>
            </span>
          );
        })}
      </div>
    );
  };

  // Delete Message Check
  const isDeletedForMe = message.deletedFor?.includes(currentUserId || '');
  const isDeleted = message.deleted === true;

  if (isDeleted) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        marginBottom: '8px',
        width: '100%',
      }}>
        <div style={{
          backgroundColor: 'var(--card-background)',
          color: 'var(--text-muted)',
          padding: '8px 14px',
          borderRadius: '12px',
          fontSize: '13px',
          fontStyle: 'italic',
          border: '1px dashed var(--card-border)',
        }}>
          🚫 This message was deleted
        </div>
      </div>
    );
  }

  if (isDeletedForMe) return null;

  // SWIPE → REPLY & LONG PRESS TIMER
  const startLongPressTimer = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      showMenu();
    }, 500);
  };

  const cancelLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setIsSwiping(false);
    setSwipeOffset(0);
    
    cancelLongPressTimer();
    startLongPressTimer();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    cancelLongPressTimer();

    if (touchStartX === null) return;
    
    const touch = e.touches[0];
    const diff = touch.clientX - touchStartX;
    
    const isSwipeInward = isOwn ? diff < 0 : diff > 0;
    
    if (isSwipeInward && Math.abs(diff) > 10) {
      if (e.cancelable) {
        e.preventDefault();
      }
      setIsSwiping(true);
      const maxOffset = 80;
      const offset = Math.min(Math.abs(diff), maxOffset);
      setSwipeOffset(isOwn ? -offset : offset);
    } else {
      setIsSwiping(false);
      setSwipeOffset(0);
    }
  };

  const handleTouchEnd = () => {
    cancelLongPressTimer();

    if (isSwiping && Math.abs(swipeOffset) > 50) {
      if (onReply) {
        onReply(message);
      }
    }
    
    setTouchStartX(null);
    setIsSwiping(false);
    setSwipeOffset(0);
  };

  // DOUBLE TAP → ❤️ AUTO-REACTION
  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    
    const now = Date.now();
    const lastTap = lastTapRef.current;
    
    if (now - lastTap < 300) {
      if (onReaction) {
        onReaction(message.id, '❤️');
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  // LONG PRESS → Emoji + Reply + Delete (Desktop Pointer)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) {
      e.preventDefault();
      showMenu();
      return;
    }
    startLongPressTimer();
  };

  const showMenu = () => {
    setShowEmojiPicker(true);
    setShowActionMenu(true);
    setShowDeleteConfirm(false);
    setShowDeleteAlert(false);
  };

  const handlePointerUp = () => {
    cancelLongPressTimer();
  };

  const handlePointerLeave = () => {
    cancelLongPressTimer();
  };

  // DELETE → canDelete စစ်မယ်
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!canDelete) {
      closeAll();
      setShowDeleteAlert(true);
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
      alertTimeoutRef.current = setTimeout(() => {
        setShowDeleteAlert(false);
        alertTimeoutRef.current = null;
      }, 3000);
      return;
    }
    
    setShowEmojiPicker(false);
    setShowActionMenu(false);
    setShowDeleteConfirm(true);
  };

  const handleDeleteAction = (forEveryone: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(message.id, forEveryone);
    }
    closeAll();
  };

  // RENDER
  const isMenuActive = showEmojiPicker || showActionMenu || showDeleteConfirm;

  return (
    <div 
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        marginTop: isMenuActive && !renderContent ? '64px' : '0px',
        marginBottom: '8px',
        width: '100%',
        position: 'relative',
        overflow: 'visible',
        transition: 'margin-top 0.25s ease',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleDoubleTap}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Error Message */}
      {deleteError && (
        <div
          style={{
            fontSize: '11px',
            color: '#fca5a5',
            backgroundColor: '#451a1e',
            border: '1px solid #7f1d1d',
            padding: '4px 10px',
            borderRadius: '6px',
            marginBottom: '4px',
            maxWidth: '80%',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            alignSelf: isOwn ? 'flex-end' : 'flex-start',
          }}
        >
          <span>⚠️ {deleteError}</span>
          <button 
            onClick={() => {
              if (onDelete) {
                onDelete(message.id, false);
              }
            }}
            style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '12px', padding: 0 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Delete Alert */}
      {showDeleteAlert && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#451a1e',
            border: '1px solid #7f1d1d',
            borderRadius: '8px',
            padding: '8px 14px',
            marginBottom: '4px',
            maxWidth: '90%',
            alignSelf: isOwn ? 'flex-end' : 'flex-start',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <AlertCircle size={16} style={{ color: '#fca5a5', flexShrink: 0 }} />
          <span style={{ color: '#fca5a5', fontSize: '13px' }}>
            This message is less than 30 days old and cannot be deleted.
          </span>
        </div>
      )}

      {/* Swipe Reply Preview */}
      {isSwiping && Math.abs(swipeOffset) > 20 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          [isOwn ? 'right' : 'left']: '100%',
          marginLeft: isOwn ? '8px' : '0',
          marginRight: isOwn ? '0' : '8px',
          backgroundColor: 'var(--accent)',
          color: '#000',
          padding: '4px 10px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          opacity: Math.min(Math.abs(swipeOffset) / 80, 1),
          transition: 'opacity 0.2s',
          pointerEvents: 'none',
        }}>
          ↪ Reply
        </div>
      )}

      {/* Message Bubble Container */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '4px',
        width: '100%',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        flexDirection: 'row',
      }}>
        {/* Message Bubble */}
        <div style={{
          backgroundColor: isOwn ? 'var(--accent)' : 'var(--card-background)',
          color: isOwn ? '#000' : 'var(--foreground)',
          padding: renderContent ? '0px' : '10px 14px',
          borderRadius: isOwn ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          maxWidth: '75%',
          wordBreak: 'break-word',
          position: 'relative',
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease',
          touchAction: 'pan-y',
          cursor: 'pointer',
          flexShrink: 0,
          order: 1,
          overflow: 'visible',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}>
          {/* Reply Preview */}
          {message.replyTo && (
            <div 
              style={{
                backgroundColor: isOwn ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)',
                borderLeft: `3px solid ${isOwn ? '#34b7f1' : 'var(--text-muted)'}`,
                padding: '4px 8px',
                borderRadius: '4px',
                marginBottom: '6px',
                fontSize: '12px',
                color: isOwn ? '#00000080' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (message.replyTo?.id) {
                  const el = document.getElementById(`msg-${message.replyTo.id}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }
              }}
            >
              <div style={{ fontWeight: '600', fontSize: '11px' }}>
                {message.replyTo.senderId === message.senderId ? 'You' : 'Them'}
              </div>
              <div style={{ 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                maxWidth: '200px'
              }}>
                {message.replyTo.message}
              </div>
            </div>
          )}
          
          {/* renderContent ရှိရင် ပြမယ်၊ မရှိရင် message.message ပြမယ် */}
          {renderContent ? (
            renderContent()
          ) : (
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {message.message}
            </div>
          )}

          {/* 📌 ပုံ (သို့) ပြေစာ (`renderContent`) ဖြစ်မှသာ Bubble အတွင်း အောက်ခြေအလယ်တည့်တည့်မှာ ပေါ်မယ့် Menu */}
          {renderContent && (showEmojiPicker || showActionMenu || showDeleteConfirm) && (
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              alignItems: 'center',
              zIndex: 40,
              width: 'max-content',
              pointerEvents: 'auto',
            }}>
              {showDeleteConfirm ? (
                <div style={{
                  backgroundColor: 'var(--card-background)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '12px',
                  padding: '6px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                  minWidth: '180px',
                }}>
                  <button
                    onClick={(e) => handleDeleteAction(true, e)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 12px',
                      background: 'none',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: '#f87171',
                      fontSize: '13px',
                      fontWeight: '500',
                    }}
                  >
                    <Trash2 size={15} /> Delete for everyone
                  </button>
                  <button
                    onClick={(e) => handleDeleteAction(false, e)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 12px',
                      background: 'none',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      fontSize: '13px',
                      fontWeight: '500',
                    }}
                  >
                    <X size={15} /> Delete for me only
                  </button>                  
                </div>
              ) : (
                <>
                  {showEmojiPicker && (
                    <div style={{
                      backgroundColor: 'var(--card-background)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '16px',
                      padding: '8px 12px',
                      display: 'flex',
                      gap: '4px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                      justifyContent: 'center',
                    }}>
                      {EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onReaction) onReaction(message.id, emoji);
                            closeAll();
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '24px',
                            padding: '4px 6px',
                            borderRadius: '8px',
                            width: '36px',
                            height: '38px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {showActionMenu && isOwn && (
                    <div style={{
                      backgroundColor: 'var(--card-background)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '14px',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                      minWidth: '140px',
                    }}>
                      <button
                        onClick={handleDeleteClick}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '6px 10px',
                          background: 'none',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          color: '#f87171',
                          fontSize: '13px',
                          fontWeight: '500',
                        }}
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 📌 စာသားမက်ဆေ့ခ်ျများအတွက် Emoji (မက်ဆေ့ခ်ျအပေါ်တွင် နေရာဟပြီး ပေါ်မည်) နှင့် Delete (မက်ဆေ့ခ်ျပေါ်တွင် Overlay ဖြစ်မည်) */}
          {!renderContent && (showEmojiPicker || showActionMenu || showDeleteConfirm) && (
            <>
              {/* Delete Menu (မက်ဆေ့ခ်ျအပေါ်တွင် အုပ်ပြီးပေါ်ရန် Overlay) */}
              {showActionMenu && isOwn && !showDeleteConfirm && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  [isOwn ? 'right' : 'left']: '10px',
                  backgroundColor: 'var(--card-background)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '14px',
                  padding: '8px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                  minWidth: '130px',
                  zIndex: 52,
                  pointerEvents: 'auto',
                }}>
                  <button
                    onClick={handleDeleteClick}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '6px 10px',
                      background: 'none',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: '#f87171',
                      fontSize: '13px',
                      fontWeight: '500',
                    }}
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                </div>
              )}

              {/* Delete Confirm Menu (Delete for everyone / for me) */}
              {showDeleteConfirm && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  [isOwn ? 'right' : 'left']: '10px',
                  backgroundColor: 'var(--card-background)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '12px',
                  padding: '6px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                  minWidth: '180px',
                  zIndex: 52,
                  pointerEvents: 'auto',
                }}>
                  <button onClick={(e) => handleDeleteAction(true, e)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#f87171', fontSize: '13px', fontWeight: '500' }}>
                    <Trash2 size={15} /> Delete for everyone
                  </button>
                  <button onClick={(e) => handleDeleteAction(false, e)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>
                    <X size={15} /> Delete for me only
                  </button>                  
                </div>
              )}

              {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    [isOwn ? 'right' : 'left']: '0px',
                    marginBottom: '10px', // ဒီနေရာမှာ 26px ကို 10px သို့မဟုတ် 12px လောက်သို့ ပြောင်းပေးပါ (အောက် bubble နဲ့ ပိုကပ်သွားပါမယ်)
                    backgroundColor: 'var(--card-background)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '16px',
                    padding: '6px 10px', // ဒီ padding ကိုလည်း နည်းနည်းလျှော့လို့ရပါတယ် (Delete နဲ့ ပိုကပ်စေရန်)
                    display: 'flex',
                    gap: '4px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    justifyContent: 'center',
                    zIndex: 50,
                    pointerEvents: 'auto',
                  }}>
                    {EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onReaction) onReaction(message.id, emoji);
                          closeAll();
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '22px', // ပုံသဏ္ဌာန်လေး နည်းနည်းသေးချင်ရင် ဒီမှာပါ 24px ကနေ 22px လောက် လျှော့နိုင်ပါတယ်
                          padding: '2px 4px',
                          borderRadius: '8px',
                          width: '32px',
                          height: '34px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
            </>
          )}
          
          {/* Reactions Display + Time */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '6px',
            marginTop: '4px',
            flexWrap: 'wrap',
          }}>
            {renderReactions()}
            
            <span style={{
              fontSize: '10px',
              color: isOwn ? '#00000080' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
            }}>
              {formatTime(message.timestamp)}
              {getReadStatus()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}