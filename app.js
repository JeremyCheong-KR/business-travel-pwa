(() => {
  "use strict";

  const HISTORY_KEY = "btpwa.history";
  const HISTORY_MAX = 5;

  const originInput = document.getElementById("origin");
  const destinationInput = document.getElementById("destination");
  const swapBtn = document.getElementById("swap");
  const chipRow = document.getElementById("chipRow");
  const shortcutGrid = document.getElementById("shortcutGrid");
  const historyList = document.getElementById("historyList");
  const emptyState = document.getElementById("emptyState");
  const clearHistoryBtn = document.getElementById("clearHistory");

  const SERVICE_LABEL = {
    ktx: "KTX",
    srt: "SRT",
    air: "항공",
    hotel: "숙박",
    kakaot: "카카오T",
    navertravel: "네이버여행",
  };

  // Domestic airport codes for common business-trip cities, used to deep-link
  // Naver Flight's domestic route URL when both ends resolve to an airport.
  const AIRPORT_CODE = {
    서울: "GMP", 김포: "GMP", 인천: "ICN",
    부산: "PUS", 제주: "CJU", 울산: "USN",
    광주: "KWJ", 대구: "TAE", 여수: "RSU",
    포항: "KPO", 사천: "HIN", 군산: "KUV",
    원주: "WJU", 청주: "CJJ",
  };

  let lastFocusedField = "destination"; // favorite chips fill this field by default

  originInput.addEventListener("focus", () => (lastFocusedField = "origin"));
  destinationInput.addEventListener("focus", () => (lastFocusedField = "destination"));

  // ---------- Favorite chips ----------
  chipRow.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const field = lastFocusedField === "origin" ? originInput : destinationInput;
    field.value = chip.dataset.city;
    field.focus();
    highlightActiveChips();
  });

  function highlightActiveChips() {
    const values = new Set([originInput.value.trim(), destinationInput.value.trim()]);
    chipRow.querySelectorAll(".chip").forEach((chip) => {
      chip.classList.toggle("is-active", values.has(chip.dataset.city));
    });
  }

  originInput.addEventListener("input", highlightActiveChips);
  destinationInput.addEventListener("input", highlightActiveChips);

  // ---------- Swap ----------
  swapBtn.addEventListener("click", () => {
    const tmp = originInput.value;
    originInput.value = destinationInput.value;
    destinationInput.value = tmp;
    highlightActiveChips();
  });

  // ---------- Shortcut URL building ----------
  function tomorrowYYYYMMDD() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}${m}${day}`;
  }

  function buildShortcutUrl(service, origin, destination) {
    switch (service) {
      case "ktx":
        return "https://www.letskorail.com/";
      case "srt":
        return "https://etk.srail.kr/main.do";
      case "air": {
        const o = AIRPORT_CODE[origin];
        const d = AIRPORT_CODE[destination];
        if (o && d && o !== d) {
          return `https://flight.naver.com/flights/domestic/${o}-${d}-${tomorrowYYYYMMDD()}?adult=1&fareType=Y`;
        }
        return "https://flight.naver.com/";
      }
      case "hotel":
        if (destination) {
          return `https://search.naver.com/search.naver?query=${encodeURIComponent(destination + " 숙소 예약")}`;
        }
        return "https://hotel.naver.com/";
      case "kakaot":
        return "https://kakaot.com/";
      case "navertravel":
        if (destination) {
          return `https://search.naver.com/search.naver?query=${encodeURIComponent(destination + " 여행")}`;
        }
        return "https://travel.naver.com/";
      default:
        return "https://www.naver.com/";
    }
  }

  shortcutGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".shortcut");
    if (!btn) return;
    const service = btn.dataset.service;
    const origin = originInput.value.trim();
    const destination = destinationInput.value.trim();

    if (origin || destination) {
      addHistoryEntry({ origin, destination, service });
    }

    const url = buildShortcutUrl(service, origin, destination);
    window.open(url, "_blank", "noopener");
  });

  // ---------- History (localStorage, max 5) ----------
  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function saveHistory(list) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  }

  function addHistoryEntry({ origin, destination, service }) {
    const list = loadHistory();
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      origin,
      destination,
      service,
      ts: Date.now(),
    };
    // dedupe: drop any earlier entry with the same route+service before unshifting
    const deduped = list.filter(
      (h) => !(h.origin === origin && h.destination === destination && h.service === service)
    );
    deduped.unshift(entry);
    saveHistory(deduped.slice(0, HISTORY_MAX));
    renderHistory();
  }

  function removeHistoryEntry(id) {
    saveHistory(loadHistory().filter((h) => h.id !== id));
    renderHistory();
  }

  function relativeTime(ts) {
    const diffMin = Math.round((Date.now() - ts) / 60000);
    if (diffMin < 1) return "방금 전";
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.round(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    const d = new Date(ts);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  function renderHistory() {
    const list = loadHistory();
    historyList.innerHTML = "";

    emptyState.classList.toggle("is-visible", list.length === 0);

    list.forEach((h) => {
      const li = document.createElement("li");
      li.className = "history-item";

      const routeBtn = document.createElement("button");
      routeBtn.type = "button";
      routeBtn.className = "history-route";
      routeBtn.innerHTML = `
        <span class="route">${escapeHtml(h.origin || "?")} → ${escapeHtml(h.destination || "?")}</span>
        <span class="meta">${SERVICE_LABEL[h.service] || h.service} · ${relativeTime(h.ts)}</span>
      `;
      routeBtn.addEventListener("click", () => {
        originInput.value = h.origin || "";
        destinationInput.value = h.destination || "";
        highlightActiveChips();
      });

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "history-remove";
      removeBtn.setAttribute("aria-label", "이 기록 삭제");
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", () => removeHistoryEntry(h.id));

      li.append(routeBtn, removeBtn);
      historyList.appendChild(li);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  clearHistoryBtn.addEventListener("click", () => {
    saveHistory([]);
    renderHistory();
  });

  renderHistory();

  // ---------- Service worker ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
