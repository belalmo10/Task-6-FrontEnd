// ── Config ──
const API_URL = "https://linkvaultapi.tryasp.net/api";

// ── API Helper ──
async function api(url, method = "GET", body = null) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  const token = localStorage.getItem("token");
  if (token) options.headers["Authorization"] = "Bearer " + token;
  if (body)  options.body = JSON.stringify(body);

  const res = await fetch(API_URL + url, options);

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "index.html";
    return;
  }

  // No content responses
  if (res.status === 204 || res.status === 201 && res.headers.get("content-length") === "0") {
    return null;
  }

  // Safe JSON parse — some endpoints return empty body on success
  const text = await res.text();
  let data = null;
  if (text && text.trim().length > 0) {
    try { data = JSON.parse(text); } catch { data = null; }
  }

  if (!res.ok) {
    const msg =
      data?.message ||
      data?.Message ||
      data?.title ||
      (data?.errors ? Object.values(data.errors).flat().join(" ") : null) ||
      `Error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ── Auth Utils ──
function getToken() { return localStorage.getItem("token"); }

function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch { return null; }
}

function getUserEmail() {
  const token = getToken();
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload) return null;
  // ASP.NET JWT claim key
  const emailKey = Object.keys(payload).find(k =>
    k.toLowerCase().includes("email") || k === "email"
  );
  return emailKey ? payload[emailKey] : null;
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

function redirectIfLoggedIn() {
  if (getToken()) {
    window.location.href = "categories.html";
  }
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

// ── Navbar ──
function initNavbar(activePage) {
  const email = getUserEmail();
  const navHtml = `
    <nav class="navbar navbar-expand-lg">
      <div class="container-fluid px-3">
        <a class="navbar-brand" href="categories.html">
          Link<span class="brand-dot">Vault</span>
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navMenu">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0 ms-3">
            <li class="nav-item">
              <a class="nav-link ${activePage === 'categories' ? 'active' : ''}" href="categories.html">
                🗂 Categories
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${activePage === 'bookmarks' ? 'active' : ''}" href="bookmarks.html">
                🔖 Bookmarks
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${activePage === 'notes' ? 'active' : ''}" href="notes.html">
                📝 Notes
              </a>
            </li>
          </ul>
          <div class="d-flex align-items-center gap-2">
            ${email ? `<span class="user-email">${email}</span>` : ''}
            <button class="btn btn-logout" onclick="logout()">Sign out</button>
          </div>
        </div>
      </div>
    </nav>
  `;
  document.getElementById("navbar-container").innerHTML = navHtml;
}

// ── Alert ──
function showAlert(containerId, message, type = "danger") {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
  setTimeout(() => { el.innerHTML = ""; }, 4000);
}
