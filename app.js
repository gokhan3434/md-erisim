const AUTH = {
  username: "admin",
  password: "Acarkent2026!"
};

const state = {
  records: [],
  selectedRecord: null,
  lookupTimer: null,
  isReady: false
};

const loginShell = document.getElementById("login-shell");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const appShell = document.getElementById("app");
const resultCard = document.getElementById("result-card");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchStatus = document.getElementById("search-status");
const logoutButton = document.getElementById("logout-button");
const mapProvider = document.getElementById("map-provider");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setAuthenticated(isAuthenticated) {
  loginShell.hidden = isAuthenticated;
  appShell.hidden = !isAuthenticated;
}

function normalizeCode(value) {
  return value
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9.]/g, "");
}

function looksLikeLookupCode(value) {
  return /^[A-Z][0-9]{3,}(?:\.[A-Z0-9]+)*$/.test(value);
}

function normalizeRecordCode(value) {
  return normalizeCode(value).replace(/^([A-Z])0+(\d)/, "$1$2");
}

function setStatus(message) {
  searchStatus.textContent = message;
}

function resetResultCard() {
  state.selectedRecord = null;
  resultCard.className = "result-card empty-state";
  resultCard.innerHTML = `
    <div class="empty-illustration">MD</div>
    <p>Kod bekleniyor</p>
  `;
}

function logout() {
  setAuthenticated(false);
  loginError.hidden = true;
  searchInput.value = "";
  setStatus(state.isReady ? "Sistem hazır." : "Veri yükleniyor...");
  resetResultCard();
}

function buildMapLinks(address) {
  const query = encodeURIComponent((address || "").trim());
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${query}`,
    apple: `http://maps.apple.com/?q=${query}`,
    yandex: `https://yandex.com/maps/?text=${query}`
  };
}

function formatPhone(phone) {
  const clean = String(phone || "").replace(/\D+/g, "");
  if (!clean) {
    return "-";
  }
  return `<a class="phone-link" href="tel:${clean}">${escapeHtml(phone)}</a>`;
}

function openPreferredMap(record) {
  const provider = mapProvider.value;
  window.open(record.map_links[provider], "_blank", "noopener");
}

function renderResult(record) {
  state.selectedRecord = record;
  resultCard.className = "result-card";
  resultCard.innerHTML = `
    <div class="result-head">
      <div>
        <p class="eyebrow">Kod ${escapeHtml(record.villa_code)}</p>
        <h3>${escapeHtml(record.resident_name)} ${escapeHtml(record.resident_surname)}</h3>
      </div>
      <span class="type-chip">${escapeHtml(record.villa_type)} tipi kayıt</span>
    </div>
    <dl class="detail-grid">
      <div>
        <dt>Telefon</dt>
        <dd>${formatPhone(record.phone)}</dd>
      </div>
      <div>
        <dt>Ek telefon</dt>
        <dd>${formatPhone(record.alt_phone)}</dd>
      </div>
      <div class="full-span">
        <dt>Adres</dt>
        <dd>${escapeHtml(record.address || "-")}</dd>
      </div>
    </dl>
    <div class="map-actions">
      <button id="primary-route" class="primary-button" type="button">Adrese Git</button>
      <a class="inline-link ghost-button" href="${record.map_links.google}" target="_blank" rel="noopener">Google Maps</a>
      <a class="inline-link ghost-button" href="${record.map_links.apple}" target="_blank" rel="noopener">Apple Maps</a>
      <a class="inline-link ghost-button" href="${record.map_links.yandex}" target="_blank" rel="noopener">Yandex</a>
    </div>
  `;

  document.getElementById("primary-route").addEventListener("click", () => openPreferredMap(record));
}

function loadRecords(records) {
  state.records = records.map((record) => ({
    ...record,
    villa_code: String(record.villa_code || "").trim().toUpperCase(),
    villa_type: String(record.villa_type || record.villa_code?.[0] || "").toUpperCase(),
    map_links: buildMapLinks(record.address)
  }));
  state.isReady = true;
  setStatus("Sistem hazır.");
}

function findRecord(code) {
  const exact = normalizeCode(code);
  const loose = normalizeRecordCode(code);
  return state.records.find((record) => {
    const recordExact = normalizeCode(record.villa_code);
    const recordLoose = normalizeRecordCode(record.villa_code);
    return recordExact === exact || recordLoose === loose;
  }) || null;
}

async function lookupCode(rawValue) {
  const code = normalizeCode(rawValue);
  searchInput.value = code;

  if (!code) {
    setStatus("Sistem hazır.");
    resetResultCard();
    return;
  }

  if (!looksLikeLookupCode(code)) {
    setStatus("Geçerli bir kod girin.");
    resetResultCard();
    return;
  }

  if (!state.isReady) {
    setStatus("Veri henüz hazır değil.");
    return;
  }

  setStatus(`${code} sorgulanıyor...`);
  const record = findRecord(code);

  if (record) {
    renderResult(record);
    setStatus(`${record.villa_code} bulundu.`);
    return;
  }

  resetResultCard();
  setStatus(`${code} için kayıt bulunamadı.`);
}

function scheduleLookup() {
  window.clearTimeout(state.lookupTimer);
  state.lookupTimer = window.setTimeout(() => {
    lookupCode(searchInput.value);
  }, 180);
}

async function boot() {
  try {
    const response = await fetch("./data/residents.json");
    const payload = await response.json();
    loadRecords(payload.records || []);
  } catch (error) {
    setStatus("Veri yüklenemedi.");
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.hidden = true;

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (username !== AUTH.username || password !== AUTH.password) {
    loginError.hidden = false;
    loginError.textContent = "Kullanıcı adı veya şifre hatalı.";
    return;
  }

  setAuthenticated(true);
  setStatus(state.isReady ? "Sistem hazır." : "Veri yükleniyor...");
  searchInput.focus();
});

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await lookupCode(searchInput.value);
});

searchInput.addEventListener("input", () => {
  searchInput.value = normalizeCode(searchInput.value);
  scheduleLookup();
});

document.querySelectorAll("[data-query]").forEach((button) => {
  button.addEventListener("click", async () => {
    searchInput.value = button.dataset.query;
    await lookupCode(button.dataset.query);
  });
});

logoutButton.addEventListener("click", logout);

setAuthenticated(false);
resetResultCard();
boot();
