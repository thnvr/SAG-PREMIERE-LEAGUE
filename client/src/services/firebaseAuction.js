/**
 * firebaseAuction — Real-Time Auction & Chat Synchronizer using Cloud Firestore.
 * Handles instant sync between Laptop (Auctioneer), Phones (Captains), and Spectators.
 */
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  getDoc
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../lib/firebase";

const AUCTION_DOC_PATH = ["auction", "liveState"];
const CHAT_COLLECTION = "chatMessages";

/**
 * Push active player or auction update to Firestore (Auctioneer laptop)
 */
export async function pushPlayerToAuction(playerData, extraState = {}) {
  if (!isFirebaseConfigured || !db) {
    console.warn('[Firebase] db not configured. Fallback to local sync.');
    return false;
  }

  try {
    const liveDocRef = doc(db, AUCTION_DOC_PATH[0], AUCTION_DOC_PATH[1]);
    const payload = {
      currentPlayer: playerData || null,
      currentBid: playerData?.basePrice || playerData?.base_price || extraState.currentBid || 0,
      highestBidder: extraState.highestBidder || extraState.leadingTeam || "None",
      leadingTeamId: extraState.leadingTeamId || null,
      status: extraState.status || "active",
      updatedAt: serverTimestamp(),
      ...extraState,
    };

    await setDoc(liveDocRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.error('[Firebase] pushPlayerToAuction error:', err);
    return false;
  }
}

/**
 * Update general auction state (e.g. new bid, countdown timer, sold)
 */
export async function updateLiveAuctionState(partialState) {
  if (!isFirebaseConfigured || !db) return false;

  try {
    const liveDocRef = doc(db, AUCTION_DOC_PATH[0], AUCTION_DOC_PATH[1]);
    await setDoc(
      liveDocRef,
      {
        ...partialState,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error('[Firebase] updateLiveAuctionState error:', err);
    return false;
  }
}

/**
 * Subscribe to real-time auction state changes (Captains & Spectators on mobile/laptop)
 */
export function subscribeLiveAuction(onUpdate) {
  if (!isFirebaseConfigured || !db) {
    return () => {};
  }

  try {
    const liveDocRef = doc(db, AUCTION_DOC_PATH[0], AUCTION_DOC_PATH[1]);
    const unsubscribe = onSnapshot(
      liveDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          onUpdate?.(data);
        }
      },
      (err) => {
        console.warn('[Firebase] Live auction snapshot listener error:', err.message);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('[Firebase] Failed to attach listener:', err);
    return () => {};
  }
}

/**
 * Send spectator chat message to Firestore
 */
export async function sendChatMessage(guestName, messageText, reaction = '🔥') {
  if (!messageText || !messageText.trim()) return false;

  if (!isFirebaseConfigured || !db) {
    return false;
  }

  try {
    await addDoc(collection(db, CHAT_COLLECTION), {
      name: guestName || 'Spectator',
      message: messageText.trim(),
      reaction: reaction || '🔥',
      timestamp: serverTimestamp(),
      clientTime: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error('[Firebase] sendChatMessage error:', err);
    return false;
  }
}

/**
 * Subscribe to all live and past spectator chat messages in Firestore
 */
export function subscribeChatMessages(onUpdate) {
  if (!isFirebaseConfigured || !db) {
    return () => {};
  }

  try {
    const q = query(collection(db, CHAT_COLLECTION), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const messages = [];
        querySnapshot.forEach((docSnap) => {
          const d = docSnap.data();
          messages.push({
            id: docSnap.id,
            user: d.name || 'Spectator',
            text: d.message || '',
            reaction: d.reaction || '🔥',
            time: d.clientTime || (d.timestamp?.toDate ? d.timestamp.toDate().toISOString() : new Date().toISOString()),
          });
        });
        onUpdate?.(messages);
      },
      (err) => {
        console.warn('[Firebase] Chat subscription error:', err.message);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('[Firebase] subscribeChatMessages error:', err);
    return () => {};
  }
}
