/**
 * googleFeedAPI — Google Apps Script backend integration for Spectator TV and Login Activity.
 * Synchronizes spectator logins, device types, and activity across all devices.
 */

export const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwArNDQQMX7G0Kze_Evr3NHCKlIAKla0LyLGY5TuaFG63neI8WLqYd20OVebs1ttj8R/exec";

const LOCAL_STORAGE_KEY = 'sag_google_broadcast_feed';

function getLocalFeed() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalFeed(feed) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(feed.slice(0, 50)));
  } catch {}
}

export async function fetchGoogleFeed() {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'GET',
    });
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        if (data.length > 0) {
          saveLocalFeed(data);
        }
        return data;
      }
    } catch {
      // Returned non-JSON (e.g. script error or HTML)
    }
  } catch (err) {
    console.warn('[GoogleFeed] Fetch error:', err.message);
  }
  return getLocalFeed();
}

export async function recordGoogleActivity({ user, status = 'Active', device }) {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    typeof navigator !== 'undefined' ? navigator.userAgent : ''
  );
  const detectedDevice = device || (isMobile ? 'Mobile' : 'Desktop');
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const payload = {
    time: timeStr,
    user: user || 'Spectator',
    device: detectedDevice,
    status: status,
  };

  // 1. Immediately cache locally
  const current = getLocalFeed();
  const updated = [payload, ...current.filter(item => !(item.user === payload.user && item.status === payload.status))].slice(0, 50);
  saveLocalFeed(updated);

  // 2. Broadcast via BroadcastChannel if available
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('sag_activity_feed');
      bc.postMessage(payload);
      bc.close();
    }
  } catch {}

  // 3. Post to Google Apps Script Web App
  try {
    await fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('[GoogleFeed] Record activity error:', err.message);
  }

  return payload;
}

/**
 * Loads history and populates #broadcast-feed container, as specified by user
 */
export async function loadHistoryAndPoll() {
  try {
    const container = document.getElementById("broadcast-feed");
    let history = [];

    try {
      let response = await fetch(WEB_APP_URL);
      let text = await response.text();
      let parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        history = parsed;
        saveLocalFeed(history);
      }
    } catch {
      history = getLocalFeed();
    }

    if (!container) return history;
    container.innerHTML = ""; // Clear loader

    if (history.length === 0) {
      container.innerHTML = "<div style='color: #8b8e99;'>No login activity recorded yet.</div>";
      return history;
    }

    history.forEach(item => {
      let div = document.createElement("div");
      div.style.marginBottom = "8px";
      div.style.borderBottom = "1px solid #1f2129";
      div.style.paddingBottom = "4px";
      div.innerHTML = `<span style="color:#ffd000; font-weight:bold;">[${item.time || 'Live'}]</span> <span style="color:#fff; font-weight:bold;">${item.user || 'User'}</span> <span style="color:#8b8e99;">(${item.device || 'Desktop'})</span> &mdash; <span style="color:#4ade80;">${item.status || 'Active'}</span>`;
      container.appendChild(div);
    });

    return history;
  } catch (err) {
    console.error("Error loading feed:", err);
    return [];
  }
}
