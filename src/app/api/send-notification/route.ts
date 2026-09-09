import { NextRequest, NextResponse } from 'next/server';
import { getDoc, doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// Private Key ထဲက \n တွေကို တကယ့် Enter (Newline) အဖြစ် အတိအကျ ပြောင်းပေးရန်
function formatPrivateKey(key: string | undefined) {
  if (!key) return '';
  return key.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
}

// Firebase Admin ကို သေချာ initialize လုပ်ခြင်း
function initAdmin() {
  const apps = getApps();
  if (!apps.length) {
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
    const formattedKey = formatPrivateKey(rawPrivateKey);

    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedKey,
      }),
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, title, body, chatId } = await request.json();

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userSnap.data();
    const fcmTokens = userData.fcmTokens || [];

    if (fcmTokens.length === 0) {
      return NextResponse.json({ error: 'No FCM tokens found' }, { status: 404 });
    }

    // Initialize လုပ်ပြီး Messaging ကို ခေါ်သုံးမည်
    initAdmin();
    const messaging = getMessaging();
    
    let successCount = 0;

    for (const token of fcmTokens) {
      try {
        await messaging.send({
          token: token,
          notification: { title, body },
          data: {
            title,
            body,
            sound: '/sounds/notification.mp3',
            url: '/chat',
            chatId,
          },
        });
        successCount++;
      } catch (err: any) {
        console.error('Failed to send to token:', token, err);
        
        // အကယ်၍ Token က သက်တမ်းကုန်သွားပြီ (Unregistered) ဆိုရင် Firestore ထဲကနေ အလိုအလျောက် ဖယ်ရှားမည်
        if (
          err.code === 'messaging/registration-token-not-registered' ||
          err.error?.code === 'UNREGISTERED'
        ) {
          console.log(`🧹 Removing invalid token for user ${userId}`);
          await updateDoc(userRef, {
            fcmTokens: arrayRemove(token)
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent successfully to ${successCount} devices`,
    });

  } catch (error: any) {
    console.error('Error sending notification:', error);
    return NextResponse.json({ error: error.message || 'Failed to send notification' }, { status: 500 });
  }
}