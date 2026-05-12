const LISTENBRAINZ_ROOT = "https://api.listenbrainz.org/1";
const REFRESH_INTERVAL_MS = 60_000;
const CACHE_PREFIX = "bindow.listenbrainz.";
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

const cacheKey = (key) => `${CACHE_PREFIX}${key}`;

const readStoredCache = (key) => {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey(key)));
    if (!cached?.expires || cached.expires <= Date.now()) return null;
    return cached.value;
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
  if (memory?.expires > Date.now()) return memory.value;

  const stored = readStoredCache(key);
  if (stored) {
    memoryCache.set(key, { expires: Date.now() + ttl, value: stored });
    return stored;
  }

  if (inflightRequests.has(key)) return inflightRequests.get(key);

  const request = fetcher()
    .then((value) => {
      memoryCache.set(key, { expires: Date.now() + ttl, value });
      writeStoredCache(key, value, ttl);
      return value;
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

const renderArtGrid = (widget, albums) => {
  const grid = widget.querySelector("[data-lb-art-grid]");
  if (!grid) return;

  const covers = albums
    .map((album) => ({
      artist: album.artist_name,
      color: colorFromText(`${album.release_group_name} ${album.artist_name}`),
      cover: releaseGroupCoverUrl(album),
      title: album.release_group_name,
    }))
    .filter((album) => album.cover)
    .slice(0, 7);

  grid.innerHTML = covers.length
    ? covers.map((album) => `
      <a class="cover-tile" style="--cover-color: ${escapeHtml(album.color)}" href="https://listenbrainz.org/user/${encodeURIComponent(widget.dataset.listenbrainzUser)}/" target="_blank" rel="noopener noreferrer" title="${escapeHtml(album.title)} by ${escapeHtml(album.artist)}">
        <img src="${escapeHtml(album.cover)}" alt="${escapeHtml(album.title)} by ${escapeHtml(album.artist)}" loading="lazy" decoding="async" fetchpriority="low">
      </a>
    `).join("")
    : "<span></span><span></span><span></span><span></span><span></span><span></span><span></span>";
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

  setSummaryLoading(widget, true);
  try {
    renderSummary(widget, range, await getSummaryStats(user, range));
  } finally {
    setSummaryLoading(widget, false);
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

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((item) => item.classList.toggle("active", item === button));
      refreshSummary(widget, button.dataset.lbRange);
    });
  });

  refreshSummary(widget, buttons.find((button) => button.classList.contains("active"))?.dataset.lbRange || "week");
};

document.querySelectorAll("[data-listenbrainz-widget]").forEach((widget) => {
  refreshWidget(widget);
  initRangeControls(widget);
  window.setInterval(() => refreshWidget(widget), REFRESH_INTERVAL_MS);
});
