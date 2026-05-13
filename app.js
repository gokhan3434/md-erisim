const LICENSE_HASHES = new Set([
  "3c368da71fef19f1b43359250bbf328321726524141f1f6467f778c63b93b195",
  "d45e984e3578e2dba58b2eb8dda4f05ced75c517d20c48c5a62cbb02a4de5f6f"
]);

const STORAGE_KEYS = {
  activation: "md_access_activation_v1"
};

const state = {
  records: [],
  selectedRecord: null,
  lookupTimer: null,
  isReady: false,
  scanRunId: 0
};

const loginShell = document.getElementById("login-shell");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const licenseKeyInput = document.getElementById("license-key");
const appShell = document.getElementById("app");
const resultCard = document.getElementById("result-card");
const scanCard = document.getElementById("scan-card");
const scanFeed = document.getElementById("scan-feed");
const scanCode = document.getElementById("scan-code");
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

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeLicenseValue(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function formatLicenseInput(value) {
  const cleaned = normalizeLicenseValue(value).slice(0, 16);
  return cleaned.match(/.{1,4}/g)?.join("-") ?? cleaned;
}

async function buildDeviceFingerprint() {
  const seed = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.width,
    screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone
  ].join("|");
  return sha256(seed);
}

function readActivation() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.activation);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeActivation(payload) {
  window.localStorage.setItem(STORAGE_KEYS.activation, JSON.stringify(payload));
}

function clearActivation() {
  window.localStorage.removeItem(STORAGE_KEYS.activation);
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

function hideScanCard() {
  scanCard.hidden = true;
  scanFeed.innerHTML = "";
}

function resetResultCard() {
  state.selectedRecord = null;
  resultCard.hidden = false;
  resultCard.className = "result-card empty-state";
  resultCard.innerHTML = `
    <div class="empty-illustration">MD</div>
    <p>Kod bekleniyor</p>
  `;
}

function logout() {
  setAuthenticated(false);
  loginError.hidden = true;
  licenseKeyInput.value = "";
  searchInput.value = "";
  hideScanCard();
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
  resultCard.hidden = false;
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

function buildScanSteps(code) {
  return [
    `> kanal_acildi :: ${code}`,
    `> indeks_taranıyor :: villa_kodlari`,
    `> sahip_kumesi_cozuluyor`,
    `> telefon_kayitlari_capraz_esleniyor`,
    `> adres_dizini_parcalaniyor`,
    `> iliskili_kayitlar_filtreleniyor`,
    `> sonuç_dogrulaniyor`
  ];
}

async function runScanSequence(code) {
  const runId = ++state.scanRunId;
  scanCode.textContent = code;
  scanFeed.innerHTML = "";
  scanCard.hidden = false;
  resultCard.hidden = true;

  const steps = buildScanSteps(code);
  for (let index = 0; index < steps.length; index += 1) {
    if (runId !== state.scanRunId) {
      return false;
    }

    const item = document.createElement("li");
    item.textContent = steps[index];
    scanFeed.appendChild(item);

    if (index > 0) {
      const previous = scanFeed.children[index - 1];
      previous.classList.remove("active");
    }

    item.classList.add("active");
    await delay(110 + index * 45);
  }

  const last = scanFeed.lastElementChild;
  if (last) {
    last.classList.remove("active");
  }

  return runId === state.scanRunId;
}

async function lookupCode(rawValue) {
  const code = normalizeCode(rawValue);
  searchInput.value = code;

  if (!code) {
    hideScanCard();
    setStatus("Sistem hazır.");
    resetResultCard();
    return;
  }

  if (!looksLikeLookupCode(code)) {
    hideScanCard();
    setStatus("Geçerli bir kod girin.");
    resetResultCard();
    return;
  }

  if (!state.isReady) {
    setStatus("Veri henüz hazır değil.");
    return;
  }

  setStatus(`${code} taranıyor...`);
  const scanFinished = await runScanSequence(code);
  if (!scanFinished) {
    return;
  }

  const record = findRecord(code);
  hideScanCard();

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

async function activateWithLicense(rawLicense) {
  const normalized = normalizeLicenseValue(rawLicense);
  if (normalized.length < 8) {
    throw new Error("Geçerli bir lisans anahtarı girin.");
  }

  const licenseHash = await sha256(normalized);
  if (!LICENSE_HASHES.has(licenseHash)) {
    throw new Error("Lisans anahtarı doğrulanamadı.");
  }

  const fingerprint = await buildDeviceFingerprint();
  writeActivation({
    licenseHash,
    fingerprint,
    activatedAt: new Date().toISOString()
  });
}

async function restoreActivation() {
  const activation = readActivation();
  if (!activation) {
    return;
  }

  const fingerprint = await buildDeviceFingerprint();
  if (activation.fingerprint !== fingerprint) {
    clearActivation();
    return;
  }

  if (!LICENSE_HASHES.has(activation.licenseHash)) {
    clearActivation();
    return;
  }

  setAuthenticated(true);
}

async function boot() {
  try {
    await restoreActivation();
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

  try {
    await activateWithLicense(licenseKeyInput.value);
    setAuthenticated(true);
    setStatus(state.isReady ? "Sistem hazır." : "Veri yükleniyor...");
    searchInput.focus();
  } catch (error) {
    loginError.hidden = false;
    loginError.textContent = error.message;
  }
});

licenseKeyInput.addEventListener("input", () => {
  licenseKeyInput.value = formatLicenseInput(licenseKeyInput.value);
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

logoutButton.addEventListener("click", () => {
  clearActivation();
  state.scanRunId += 1;
  logout();
});

setAuthenticated(false);
hideScanCard();
resetResultCard();
boot();
