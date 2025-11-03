const settingsKey = "memai:digest-settings:v1";

const elements = {
  baseUrl: document.getElementById("base-url"),
  authToken: document.getElementById("auth-token"),
  connectionForm: document.getElementById("connection-form"),
  clearSettings: document.getElementById("clear-settings"),
  generateForm: document.getElementById("generate-form"),
  digestDate: document.getElementById("digest-date"),
  generateResult: document.getElementById("generate-result"),
  digestsList: document.getElementById("digests-list"),
  digestsEmpty: document.getElementById("digests-empty"),
  digestDetails: document.getElementById("digest-details"),
  refreshDigests: document.getElementById("refresh-digests"),
  digestTemplate: document.getElementById("digest-item-template"),
};

const defaultEmptyMarkup = elements.digestsEmpty.innerHTML;

const state = {
  baseUrl: "",
  authToken: "",
  digests: [],
  selectedDigestDate: null,
};

function loadSettings() {
  try {
    const stored = localStorage.getItem(settingsKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      state.baseUrl = parsed.baseUrl || "";
      state.authToken = parsed.authToken || "";
    }
  } catch (error) {
    console.warn("Failed to read saved settings", error);
  }

  elements.baseUrl.value = state.baseUrl;
  elements.authToken.value = state.authToken;
}

function saveSettings() {
  const payload = {
    baseUrl: state.baseUrl,
    authToken: state.authToken,
  };

  try {
    localStorage.setItem(settingsKey, JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to save settings", error);
  }
}

function normalizeBaseUrl(value) {
  if (!value) {
    return "";
  }
  return value.trim().replace(/\/$/, "");
}

function setStatusMessage(element, message, type) {
  element.textContent = message || "";
  element.classList.remove("success", "error");
  if (type) {
    element.classList.add(type);
  }
}

function createRequestUrl(path) {
  const base = state.baseUrl;
  if (!base) {
    throw new Error("Set the API base URL first.");
  }
  if (path.startsWith("http")) {
    return path;
  }
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function request(path, options = {}) {
  const url = createRequestUrl(path);
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = state.authToken?.trim();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  const raw = await response.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch (error) {
      console.warn("Failed to parse JSON response", error);
    }
  }

  if (!response.ok) {
    const errorMessage =
      data?.error ||
      data?.message ||
      data?.error_message ||
      raw ||
      `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

function formatIsoDate(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.split("T")[0] || value;
  }

  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  return String(value);
}

function formatDisplayDate(value) {
  const iso = formatIsoDate(value);
  if (!iso) return "Unknown";
  const date = new Date(iso + "T00:00:00Z");
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function badgeClassForStatus(status) {
  switch ((status || "").toLowerCase()) {
    case "completed":
      return "badge badge--completed";
    case "processing":
      return "badge badge--pending";
    case "failed":
      return "badge badge--failed";
    default:
      return "badge badge--pending";
  }
}

function resetDigestDetails() {
  elements.digestDetails.classList.add("empty");
  elements.digestDetails.innerHTML = "<p>Select a digest to view its content.</p>";
}

function showDigestLoading() {
  elements.digestDetails.classList.remove("empty");
  elements.digestDetails.innerHTML = "<p>Loading digest…</p>";
}

function renderDigestDetails(digest) {
  if (!digest) {
    resetDigestDetails();
    return;
  }

  elements.digestDetails.classList.remove("empty");
  const digestDate = formatIsoDate(digest.digest_date);
  const status = digest.status || "unknown";
  const createdAt = digest.created_at ? new Date(digest.created_at).toLocaleString() : "Unknown";
  const updatedAt = digest.updated_at ? new Date(digest.updated_at).toLocaleString() : null;
  const totalDuration = digest.total_duration != null ? `${digest.total_duration} sec` : "–";
  const bookmarkCount = digest.bookmark_count ?? "–";

  const content = digest.digest_content
    ? `<pre>${digest.digest_content}</pre>`
    : `<p class="help-text">Digest content is not available yet. Status: ${status}.</p>`;

  const updatedMarkup = updatedAt ? `<span>Updated: <strong>${updatedAt}</strong></span>` : "";

  elements.digestDetails.innerHTML = `
    <h3 class="digest-details__heading">Digest for ${formatDisplayDate(digestDate)}</h3>
    <div class="digest-details__meta">
      <span class="badge ${badgeClassForStatus(status)}">${status}</span>
      <span>Bookmarks: <strong>${bookmarkCount}</strong></span>
      <span>Created: <strong>${createdAt}</strong></span>
      ${updatedMarkup}
      <span>Total duration: <strong>${totalDuration}</strong></span>
    </div>
    ${content}
  `;
}

function setActiveDigest(date) {
  state.selectedDigestDate = date || null;
  const items = elements.digestsList.querySelectorAll(".digest-list__item");
  items.forEach(item => {
    if (item.dataset.date === state.selectedDigestDate) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
}

function renderDigests() {
  const list = elements.digestsList;
  list.innerHTML = "";

  if (!state.digests?.length) {
    elements.digestsEmpty.innerHTML = defaultEmptyMarkup;
    elements.digestsEmpty.classList.remove("hidden");
    resetDigestDetails();
    return;
  }

  elements.digestsEmpty.classList.add("hidden");

  state.digests.forEach(digest => {
    const isoDate = formatIsoDate(digest.digest_date);
    const template = elements.digestTemplate.content.cloneNode(true);
    const item = template.querySelector(".digest-list__item");
    item.dataset.date = isoDate;

    const button = template.querySelector(".digest-list__button");
    button.textContent = `View ${isoDate}`;

    const dateField = template.querySelector('[data-field="date"]');
    const statusField = template.querySelector('[data-field="status"]');
    const countField = template.querySelector('[data-field="count"]');

    dateField.textContent = formatDisplayDate(isoDate);
    statusField.innerHTML = `<span class="badge ${badgeClassForStatus(digest.status)}">${digest.status}</span>`;
    countField.textContent = digest.bookmark_count ?? "–";

    button.addEventListener("click", async event => {
      event.preventDefault();
      try {
        setActiveDigest(isoDate);
        showDigestLoading();
        const data = await request(`/digests/${isoDate}`);
        renderDigestDetails(data?.digest ?? null);
      } catch (error) {
        console.error(error);
        elements.digestDetails.classList.remove("empty");
        elements.digestDetails.innerHTML = `<p class="help-text">Failed to load digest: ${error.message}</p>`;
      }
    });

    list.appendChild(template);
  });

  setActiveDigest(state.selectedDigestDate);
}

async function fetchDigests() {
  try {
    elements.digestsEmpty.innerHTML = "<p>Loading digests…</p>";
    elements.digestsEmpty.classList.remove("hidden");
    const data = await request("/digests?limit=30&offset=0");
    state.digests = data?.digests ?? [];
    renderDigests();
  } catch (error) {
    console.error(error);
    state.digests = [];
    elements.digestsEmpty.innerHTML = `<p class="help-text">Failed to load digests: ${error.message}</p>`;
    elements.digestsEmpty.classList.remove("hidden");
    resetDigestDetails();
  }
}

async function handleGenerate(event) {
  event.preventDefault();
  if (!state.baseUrl) {
    setStatusMessage(elements.generateResult, "Set the API base URL first.", "error");
    return;
  }

  const dateValue = elements.digestDate.value;
  const payload = {};
  if (dateValue) {
    payload.date = dateValue;
  }

  setStatusMessage(elements.generateResult, "Generating digest…");

  try {
    const data = await request("/digests/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const digest = data?.digest;
    const message = data?.message || "Digest request completed.";
    const isoDate = formatIsoDate(digest?.digest_date);

    setStatusMessage(
      elements.generateResult,
      `${message}${isoDate ? ` (Date: ${isoDate})` : ""}`,
      "success"
    );

    if (isoDate) {
      state.selectedDigestDate = isoDate;
    }

    await fetchDigests();

    if (digest) {
      renderDigestDetails(digest);
      setActiveDigest(formatIsoDate(digest.digest_date));
    }
  } catch (error) {
    console.error(error);
    setStatusMessage(elements.generateResult, error.message, "error");
  }
}

function handleConnectionSubmit(event) {
  event.preventDefault();
  const baseUrl = normalizeBaseUrl(elements.baseUrl.value);
  const token = elements.authToken.value.trim();

  state.baseUrl = baseUrl;
  state.authToken = token;
  saveSettings();

  if (!baseUrl) {
    setStatusMessage(elements.generateResult, "Enter a valid API base URL.", "error");
    return;
  }

  setStatusMessage(elements.generateResult, "Settings saved. Fetching digests…");
  fetchDigests();
}

function handleClearSettings() {
  state.baseUrl = "";
  state.authToken = "";
  state.selectedDigestDate = null;
  state.digests = [];
  elements.baseUrl.value = "";
  elements.authToken.value = "";
  localStorage.removeItem(settingsKey);
  renderDigests();
  setStatusMessage(elements.generateResult, "Settings cleared.");
}

function initEventListeners() {
  elements.connectionForm.addEventListener("submit", handleConnectionSubmit);
  elements.clearSettings.addEventListener("click", handleClearSettings);
  elements.generateForm.addEventListener("submit", handleGenerate);
  elements.refreshDigests.addEventListener("click", event => {
    event.preventDefault();
    if (!state.baseUrl) {
      setStatusMessage(elements.generateResult, "Set the API base URL first.", "error");
      return;
    }
    fetchDigests();
  });
}

function init() {
  loadSettings();
  initEventListeners();

  if (state.baseUrl) {
    fetchDigests();
  }
}

init();
