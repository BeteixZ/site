const LISTENBRAINZ_ROOT = "https://api.listenbrainz.org/1";
const REFRESH_INTERVAL_MS = 60_000;
const CACHE_PREFIX = "bindow.listenbrainz.";
const STALE_CACHE_TTL = 7 * 24 * 60 * 60_000;
const CACHE_TTL = {
  playingNow: 30_000,
  recent: 90_000,
  summary: 6 * 60 * 60_000,
};
const RANGE_LABELS = {
  week: "This week",
  month: "This month",
  year: "This year",
};

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char]);

const compactNumber = (value) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);

const colorFromText = (text = "") => {
  let hash = 0;
  for (const char of text) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 38% 42%)`;
};

const memoryCache = new Map();
const inflightRequests = new Map();
const cacheFreshness = new Map();
const summaryRequests = new WeakMap();
const recordShelves = new WeakMap();

const cacheKey = (key) => `${CACHE_PREFIX}${key}`;

const readStoredCache = (key, allowStale = false) => {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey(key)));
    if (!cached?.expires || !cached.value) return null;
    const age = Date.now() - cached.expires;
    if (age >= 0 && (!allowStale || age > STALE_CACHE_TTL)) return null;
    return cached;
  } catch {
    return null;
  }
};

const writeStoredCache = (key, value, ttl) => {
  try {
    localStorage.setItem(cacheKey(key), JSON.stringify({
      expires: Date.now() + ttl,
      value,
    }));
  } catch {
    // Storage can be unavailable in private mode; memory cache still helps.
  }
};

const withCache = async (key, ttl, fetcher) => {
  const memory = memoryCache.get(key);
  if (memory?.expires > Date.now()) {
    cacheFreshness.set(key, { stale: false });
    return memory.value;
  }

  const stored = readStoredCache(key);
  if (stored) {
    memoryCache.set(key, stored);
    cacheFreshness.set(key, { stale: false });
    return stored.value;
  }

  if (inflightRequests.has(key)) return inflightRequests.get(key);

  const request = fetcher()
    .then((value) => {
      memoryCache.set(key, { expires: Date.now() + ttl, value });
      writeStoredCache(key, value, ttl);
      cacheFreshness.set(key, { stale: false });
      return value;
    })
    .catch((error) => {
      // Keep a saved collection usable offline, but never claim an old track is live.
      const stale = key.startsWith("playing-now.") ? null : readStoredCache(key, true)
        || (memory?.expires > Date.now() - STALE_CACHE_TTL ? memory : null);
      if (!stale) throw error;
      cacheFreshness.set(key, { stale: true, savedAt: stale.expires - ttl });
      return stale.value;
    })
    .finally(() => inflightRequests.delete(key));

  inflightRequests.set(key, request);
  return request;
};

const relativeTime = (timestamp) => {
  if (!timestamp) return "just now";

  const diff = Math.max(0, Date.now() - timestamp * 1000);
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const coverUrl = (listen) => {
  const mapping = listen?.track_metadata?.mbid_mapping;
  if (mapping?.caa_id && mapping?.caa_release_mbid) {
    return `https://coverartarchive.org/release/${mapping.caa_release_mbid}/${mapping.caa_id}-250.jpg`;
  }
  return "";
};

const releaseGroupCoverUrl = (releaseGroup) => {
  if (releaseGroup?.caa_id && releaseGroup?.caa_release_mbid) {
    return `https://coverartarchive.org/release/${releaseGroup.caa_release_mbid}/${releaseGroup.caa_id}-250.jpg`;
  }
  return "";
};

const normalizeListen = (listen, isPlayingNow = false) => {
  const metadata = listen?.track_metadata ?? {};
  return {
    artist: metadata.artist_name || "Unknown artist",
    cover: coverUrl(listen),
    isPlayingNow,
    listenedAt: listen?.listened_at,
    release: metadata.release_name || "",
    track: metadata.track_name || "Unknown track",
  };
};

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5_000);

  try {
    const requestUrl = new URL(url);
    const response = await fetch(requestUrl, {
      cache: "default",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`ListenBrainz request failed: ${response.status}`);
    if (response.status === 204) return { payload: {} };
    return response.json();
  } finally {
    window.clearTimeout(timeout);
  }
};

const statsUrl = (user, stat, range, count = 6) =>
  `${LISTENBRAINZ_ROOT}/stats/user/${encodeURIComponent(user)}/${stat}?range=${range}&count=${count}`;

const getPlayingNow = async (user) => {
  return withCache(`playing-now.${user}`, CACHE_TTL.playingNow, async () => {
    const data = await fetchJson(`${LISTENBRAINZ_ROOT}/user/${encodeURIComponent(user)}/playing-now`);
    const listen = data?.payload?.listens?.[0];
    return listen ? normalizeListen(listen, true) : null;
  });
};

const getRecentListens = async (user, count) => {
  return withCache(`listens.${user}.${count}`, CACHE_TTL.recent, async () => {
    const data = await fetchJson(`${LISTENBRAINZ_ROOT}/user/${encodeURIComponent(user)}/listens?count=${count}`);
    return (data?.payload?.listens ?? []).map((listen) => normalizeListen(listen));
  });
};

const getSummaryStats = async (user, range) => {
  return withCache(`summary.${user}.${range}`, CACHE_TTL.summary, async () => {
    const [artists, albums, tracks, activity] = await Promise.all([
      fetchJson(statsUrl(user, "artists", range, 6)),
      fetchJson(statsUrl(user, "release-groups", range, 6)),
      fetchJson(statsUrl(user, "recordings", range, 6)),
      fetchJson(statsUrl(user, "listening-activity", range, 60)),
    ]);

    return {
      activity: {
        from: activity?.payload?.from_ts ?? 0,
        points: activity?.payload?.listening_activity ?? [],
        to: activity?.payload?.to_ts ?? 0,
      },
      albums: albums?.payload?.release_groups ?? [],
      artists: artists?.payload?.artists ?? [],
      totals: {
        albums: albums?.payload?.total_release_group_count ?? 0,
        artists: artists?.payload?.total_artist_count ?? 0,
        tracks: tracks?.payload?.total_recording_count ?? 0,
      },
      tracks: tracks?.payload?.recordings ?? [],
    };
  });
};

const renderCurrent = (widget, listen) => {
  const card = widget.querySelector("[data-lb-current]");
  if (!card || !listen) return;

  card.classList.toggle("is-playing", listen.isPlayingNow);
  card.querySelector("[data-lb-status]").textContent = listen.isPlayingNow ? "Now playing" : "Latest track";
  card.querySelector("[data-lb-track]").textContent = listen.track;
  card.querySelector("[data-lb-artist]").textContent = listen.release
    ? `${listen.artist} · ${listen.release}`
    : listen.artist;
  card.querySelector("[data-lb-time]").textContent = listen.isPlayingNow
    ? "live"
    : relativeTime(listen.listenedAt);
};

const renderList = (widget, listens) => {
  const list = widget.querySelector("[data-lb-list]") || document.querySelector("[data-lb-list]");
  if (!list) return;

  list.innerHTML = listens.map((listen) => `
    <article class="listen-row">
      <div class="listen-art">
        ${listen.cover ? `<img src="${escapeHtml(listen.cover)}" alt="" loading="lazy" decoding="async">` : ""}
      </div>
      <div class="listen-copy">
        <h3>${escapeHtml(listen.track)}</h3>
        <p>${escapeHtml(listen.artist)}${listen.release ? ` · ${escapeHtml(listen.release)}` : ""}</p>
      </div>
      <time>${escapeHtml(relativeTime(listen.listenedAt))}</time>
    </article>
  `).join("");
};

const rankItem = (label, sublabel, count) => `
  <li>
    <span>
      <strong>${escapeHtml(label)}</strong>
      ${sublabel ? `<small>${escapeHtml(sublabel)}</small>` : ""}
    </span>
    <b>${compactNumber(count)}</b>
  </li>
`;

const renderRankList = (root, selector, items, getLabel, getSublabel) => {
  const list = root.querySelector(selector) || document.querySelector(selector);
  if (!list) return;

  list.innerHTML = items.length
    ? items.map((item) => rankItem(getLabel(item), getSublabel(item), item.listen_count)).join("")
    : "<li>No data for this range yet.</li>";
};

const renderActivityBars = (root, activity) => {
  const target = root.querySelector("[data-lb-activity-bars]");
  if (!target) return;

  const points = activity.points.slice(-16);
  const max = Math.max(1, ...points.map((point) => point.listen_count || 0));
  const midpoint = activity.from && activity.to ? activity.from + ((activity.to - activity.from) / 2) : 0;
  const currentPoints = midpoint
    ? activity.points.filter((point) => point.from_ts >= midpoint)
    : activity.points;
  const total = currentPoints.reduce((sum, point) => sum + (point.listen_count || 0), 0);

  target.innerHTML = points.map((point) => {
    const height = Math.max(8, Math.round(((point.listen_count || 0) / max) * 100));
    return `<span title="${escapeHtml(point.listen_count || 0)} listens" style="height:${height}%"></span>`;
  }).join("");

  const totalTarget = root.querySelector("[data-lb-total]");
  if (totalTarget) totalTarget.textContent = compactNumber(total);
};

const recordArtwork = (album) => `
  <span class="record-art" style="--cover-color:${escapeHtml(album.color)}">
    <span class="record-fallback"><small>${escapeHtml(album.artist)}</small><strong>${escapeHtml(album.title)}</strong></span>
    ${album.cover ? `<img src="${escapeHtml(album.cover)}" alt="" loading="lazy" decoding="async">` : ""}
  </span>`;

const albumLink = (album, user) => /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(album.id || "")
  ? `https://musicbrainz.org/release-group/${album.id}`
  : `https://listenbrainz.org/user/${encodeURIComponent(user)}/`;

const selectRecord = (state, index, focus = false) => {
  const { albums, grid } = state;
  if (!albums.length) return;
  state.index = (index + albums.length) % albums.length;
  const album = albums[state.index];
  const sleeves = [...grid.querySelectorAll(".record-sleeve")];
  sleeves.forEach((sleeve, i) => {
    sleeve.style.setProperty("--record-offset", i - state.index);
    sleeve.classList.toggle("is-selected", i === state.index);
    sleeve.tabIndex = i === state.index ? 0 : -1;
    sleeve.setAttribute("aria-pressed", String(i === state.index));
    sleeve.style.zIndex = String(albums.length - Math.abs(i - state.index));
  });
  grid.querySelector("[data-record-title]").textContent = album.title;
  grid.querySelector("[data-record-artist]").textContent = album.artist;
  grid.querySelector("[data-record-number]").textContent = `${String(state.index + 1).padStart(2, "0")} / ${String(albums.length).padStart(2, "0")}`;
  if (focus) sleeves[state.index].focus({ preventScroll: true });
};

const updateRecordDialog = (state) => {
  const { dialog, albums, index, user } = state;
  const album = albums[index];
  if (!album) return;
  dialog.querySelector("[data-record-artwork]").innerHTML = recordArtwork(album);
  dialog.querySelector("[data-record-dialog-title]").textContent = album.title;
  dialog.querySelector("[data-record-dialog-artist]").textContent = album.artist;
  dialog.querySelector("[data-record-dialog-count]").textContent = `${compactNumber(album.count)} listens`;
  dialog.querySelector("[data-record-dialog-link]").href = albumLink(album, user);
  dialog.querySelector("[data-record-dialog-number]").textContent = `${index + 1} / ${albums.length}`;
};

const initRecordDialog = (state) => {
  const dialog = document.createElement("dialog");
  const titleId = `record-title-${document.querySelectorAll(".record-dialog").length}`;
  dialog.className = "record-dialog";
  dialog.setAttribute("aria-labelledby", titleId);
  dialog.innerHTML = `
    <div class="record-dialog-top"><span class="record-edition">Top albums</span><button type="button" class="record-icon-button" data-record-close aria-label="Close album">×</button></div>
    <div class="record-dialog-art" data-record-artwork></div>
    <div class="record-dialog-copy"><h2 id="${titleId}" data-record-dialog-title></h2><p data-record-dialog-artist></p><span data-record-dialog-count></span></div>
    <div class="record-dialog-bottom"><a data-record-dialog-link target="_blank" rel="noopener noreferrer">Explore album ↗</a><div class="record-controls"><button type="button" class="record-icon-button" data-record-dialog-prev aria-label="Previous album">←</button><span data-record-dialog-number></span><button type="button" class="record-icon-button" data-record-dialog-next aria-label="Next album">→</button></div></div>`;
  state.dialog = dialog;
  document.body.appendChild(dialog);
  dialog.querySelector("[data-record-close]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  const move = (offset) => {
    if (!state.albums.length) return;
    selectRecord(state, state.index + offset);
    updateRecordDialog(state);
  };
  dialog.querySelector("[data-record-dialog-prev]").addEventListener("click", () => move(-1));
  dialog.querySelector("[data-record-dialog-next]").addEventListener("click", () => move(1));
  dialog.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    move(event.key === "ArrowLeft" ? -1 : 1);
  });
  dialog.addEventListener("error", (event) => {
    if (event.target.tagName === "IMG") event.target.remove();
  }, true);
};

const clearRecordShelf = (grid, message) => {
  const state = recordShelves.get(grid);
  if (state) {
    if (state.dialog.open) state.dialog.close();
    state.albums = [];
    state.index = 0;
  }
  grid.innerHTML = `<p class="record-empty">${escapeHtml(message)}</p>`;
  grid.setAttribute("aria-busy", "false");
};

const renderArtGrid = (widget, albums) => {
  const grid = widget.querySelector("[data-lb-art-grid]");
  if (!grid) return;

  const records = albums
    .map((album) => ({
      id: album.release_group_mbid,
      artist: album.artist_name || "Unknown artist",
      color: colorFromText(`${album.release_group_name} ${album.artist_name}`),
      cover: releaseGroupCoverUrl(album),
      title: album.release_group_name || "Unknown album",
      count: album.listen_count || 0,
    }))
    .slice(0, 7);

  grid.setAttribute("aria-busy", "false");
  if (!records.length) {
    clearRecordShelf(grid, "No data for this range yet.");
    return;
  }

  let state = recordShelves.get(grid);
  if (!state) {
    state = { grid, albums: [], index: 0, user: widget.dataset.listenbrainzUser };
    recordShelves.set(grid, state);
    initRecordDialog(state);
    grid.addEventListener("error", (event) => {
      if (event.target.tagName === "IMG") event.target.remove();
    }, true);
    grid.addEventListener("click", (event) => {
      const sleeve = event.target.closest("[data-record-index]");
      if (sleeve) {
        selectRecord(state, Number(sleeve.dataset.recordIndex));
        updateRecordDialog(state);
        if (typeof state.dialog.showModal === "function") state.dialog.showModal();
        return;
      }
      if (event.target.closest("[data-record-prev]")) selectRecord(state, state.index - 1);
      if (event.target.closest("[data-record-next]")) selectRecord(state, state.index + 1);
    });
    grid.addEventListener("keydown", (event) => {
      if (!event.target.closest(".record-sleeve")) return;
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const index = event.key === "Home" ? 0 : event.key === "End" ? state.albums.length - 1 : state.index + (event.key === "ArrowRight" ? 1 : -1);
      selectRecord(state, index, true);
    });
  }

  const selected = state.albums[state.index];
  state.albums = records;
  const selectedIndex = records.findIndex((album) => selected && (album.id && selected.id
    ? album.id === selected.id
    : album.title === selected.title && album.artist === selected.artist));
  const previousSleeves = new Map([...grid.querySelectorAll(".record-sleeve")].map((sleeve) => [sleeve.dataset.recordKey, sleeve]));
  if (!grid.querySelector(".record-stage")) {
    grid.innerHTML = `<div class="record-shelf-top"><span class="record-edition">Top albums</span><span class="record-edition">↗ Select a sleeve</span></div><div class="record-stage" role="group" aria-label="Album shelf; use left and right arrow keys"></div><div class="record-shelf-bottom"><div class="record-caption"><strong data-record-title></strong><span data-record-artist></span></div><div class="record-controls"><button type="button" class="record-icon-button" data-record-prev aria-label="Previous album">←</button><span data-record-number></span><button type="button" class="record-icon-button" data-record-next aria-label="Next album">→</button></div></div>`;
  }
  const stage = grid.querySelector(".record-stage");
  const currentKeys = new Set();
  records.forEach((album, index) => {
    const key = album.id || JSON.stringify([album.title, album.artist, index]);
    currentKeys.add(key);
    let sleeve = previousSleeves.get(key);
    if (!sleeve) {
      sleeve = document.createElement("button");
      sleeve.type = "button";
      sleeve.className = "record-sleeve";
      sleeve.dataset.recordKey = key;
      sleeve.innerHTML = `<span class="record-vinyl" aria-hidden="true"><i></i></span>${recordArtwork(album)}`;
    }
    sleeve.dataset.recordIndex = String(index);
    sleeve.setAttribute("aria-label", `View ${album.title} by ${album.artist}`);
    stage.appendChild(sleeve);
  });
  previousSleeves.forEach((sleeve, key) => { if (!currentKeys.has(key)) sleeve.remove(); });
  selectRecord(state, selectedIndex < 0 ? 0 : selectedIndex);
  if (state.dialog.open) updateRecordDialog(state);
};

const renderSummary = (widget, range, stats) => {
  widget.querySelector("[data-lb-range-label]").textContent = RANGE_LABELS[range] || range;
  widget.querySelector("[data-lb-artists]").textContent = compactNumber(stats.totals.artists);
  widget.querySelector("[data-lb-albums]").textContent = compactNumber(stats.totals.albums);
  widget.querySelector("[data-lb-tracks]").textContent = compactNumber(stats.totals.tracks);
  renderArtGrid(widget, stats.albums);
  renderActivityBars(widget, stats.activity);

  renderRankList(widget, "[data-lb-top-artists]", stats.artists, (item) => item.artist_name, () => "");
  renderRankList(widget, "[data-lb-top-albums]", stats.albums, (item) => item.release_group_name, (item) => item.artist_name);
  renderRankList(widget, "[data-lb-top-tracks]", stats.tracks, (item) => item.track_name, (item) => item.artist_name);
};

const setSummaryLoading = (widget, isLoading) => {
  widget.classList.toggle("is-loading-summary", isLoading);
};

const refreshSummary = async (widget, range) => {
  const user = widget.dataset.listenbrainzUser;
  const summary = widget.querySelector("[data-lb-summary]");
  if (!user || !summary) return;

  const request = (summaryRequests.get(widget) || 0) + 1;
  summaryRequests.set(widget, request);
  const status = widget.querySelector("[data-lb-summary-status]");
  const grid = widget.querySelector("[data-lb-art-grid]");
  const shelf = recordShelves.get(grid);
  if (shelf?.dialog.open) shelf.dialog.close();
  grid.inert = true;
  grid.setAttribute("aria-busy", "true");
  setSummaryLoading(widget, true);
  summary.setAttribute("aria-busy", "true");
  try {
    const stats = await getSummaryStats(user, range);
    if (summaryRequests.get(widget) !== request) return;
    renderSummary(widget, range, stats);
    const freshness = cacheFreshness.get(`summary.${user}.${range}`);
    if (status) {
      status.hidden = !freshness?.stale;
      status.textContent = freshness?.stale ? `Saved listening data · ${new Date(freshness.savedAt).toLocaleDateString("en", { month: "short", day: "numeric" })}` : "";
    }
  } catch {
    if (summaryRequests.get(widget) !== request) return;
    if (status) {
      status.hidden = false;
      status.textContent = "Could not load ListenBrainz. Try again later.";
    }
    // A failed range must not keep showing the previous range's collection.
    widget.querySelector("[data-lb-range-label]").textContent = RANGE_LABELS[range] || range;
    for (const selector of ["[data-lb-total]", "[data-lb-artists]", "[data-lb-albums]", "[data-lb-tracks]"]) widget.querySelector(selector).textContent = "--";
    clearRecordShelf(grid, "Music unavailable");
    widget.querySelector("[data-lb-activity-bars]").replaceChildren();
    for (const selector of ["[data-lb-top-artists]", "[data-lb-top-albums]", "[data-lb-top-tracks]"]) {
      const list = widget.querySelector(selector) || document.querySelector(selector);
      if (list) list.innerHTML = "<li>Music unavailable</li>";
    }
  } finally {
    if (summaryRequests.get(widget) === request) {
      setSummaryLoading(widget, false);
      summary.setAttribute("aria-busy", "false");
      grid.inert = false;
      grid.setAttribute("aria-busy", "false");
    }
  }
};

const refreshWidget = async (widget) => {
  const user = widget.dataset.listenbrainzUser;
  const count = Number(widget.dataset.listenbrainzListLimit || 6);

  if (!user) return;

  try {
    const recentListens = await getRecentListens(user, count);
    renderList(widget, recentListens);
    renderCurrent(widget, recentListens[0]);

    getPlayingNow(user)
      .then((playingNow) => {
        if (playingNow) renderCurrent(widget, playingNow);
      })
      .catch(() => {});
  } catch (error) {
    widget.querySelector("[data-lb-status]").textContent = "Music unavailable";
    widget.querySelector("[data-lb-track]").textContent = "Could not load ListenBrainz";
    widget.querySelector("[data-lb-artist]").textContent = "Try again later";
    widget.querySelector("[data-lb-time]").textContent = "offline";
  }
};

const initRangeControls = (widget) => {
  const buttons = [...widget.querySelectorAll("[data-lb-range]")];
  if (!buttons.length) return;

  const activate = (button) => {
    buttons.forEach((item) => {
      item.classList.toggle("active", item === button);
      item.setAttribute("aria-selected", String(item === button));
      item.tabIndex = item === button ? 0 : -1;
    });
    widget.querySelector("[data-lb-summary]").setAttribute("aria-labelledby", button.id);
    refreshSummary(widget, button.dataset.lbRange);
  };
  buttons.forEach((button, index) => {
    button.id = `listening-range-${button.dataset.lbRange}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", "listening-summary");
    button.setAttribute("aria-selected", String(button.classList.contains("active")));
    button.tabIndex = button.classList.contains("active") ? 0 : -1;
    button.addEventListener("click", () => {
      activate(button);
    });
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].focus();
      activate(buttons[next]);
    });
  });

  refreshSummary(widget, buttons.find((button) => button.classList.contains("active"))?.dataset.lbRange || "week");
};

document.querySelectorAll("[data-listenbrainz-widget]").forEach((widget) => {
  refreshWidget(widget);
  initRangeControls(widget);
  window.setInterval(() => refreshWidget(widget), REFRESH_INTERVAL_MS);
});
