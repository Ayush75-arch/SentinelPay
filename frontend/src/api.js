// src/api.js
//
// Centralized API client for the SentinelPay backend.
// Change API_BASE_URL if your backend runs somewhere other than
// http://localhost:8000.

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

// A function, not a constant — default parameters below call this on
// every invocation, so it always reflects whatever LoginPage most
// recently wrote to localStorage, even for calls made before login.
export function getCurrentUserId() {
  return localStorage.getItem("sentinelpay_user_id") || "demo_user_1";
}

export function getCurrentUserName() {
  return localStorage.getItem("sentinelpay_user_name") || "Your account";
}

export function getSessionToken() {
  return localStorage.getItem("sentinelpay_session_token");
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(getSessionToken() ? { Authorization: `Bearer ${getSessionToken()}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let detail;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text();
    }
    throw new Error(
      `${options.method || "GET"} ${path} failed (${response.status}): ${JSON.stringify(detail)}`
    );
  }

  if (response.status === 204) return null;
  return response.json();
}

// --- Transactions ---

export function getUserTransactions(userId = getCurrentUserId()) {
  return request(`/users/${encodeURIComponent(userId)}/transactions`);
}

export function getProfile(userId = getCurrentUserId()) {
  return request(`/users/${encodeURIComponent(userId)}/profile`);
}

export function getLocationActivity(userId = getCurrentUserId()) {
  return request(`/users/${encodeURIComponent(userId)}/location-activity`);
}

export function getSpendingSummary(userId = getCurrentUserId()) {
  return request(`/users/${encodeURIComponent(userId)}/spending-summary`);
}

export function getTransaction(transactionId) {
  return request(`/transactions/${encodeURIComponent(transactionId)}`);
}

export function reviewTransaction(transactionId, status) {
  return request(`/transactions/${encodeURIComponent(transactionId)}/review`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function postTransaction(transaction) {
  return request("/transactions", {
    method: "POST",
    body: JSON.stringify(transaction),
  });
}

export function login(email, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(email, password, name) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export function requestPasswordReset(email) {
  return request("/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function confirmPasswordReset(token, password) {
  return request("/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export function saveSession(result) {
  localStorage.setItem("sentinelpay_user_id", result.user_id);
  localStorage.setItem("sentinelpay_session_token", result.token);
  if (result.name) localStorage.setItem("sentinelpay_user_name", result.name);
}

// --- Travel mode ---

export function getTravelMode(userId = getCurrentUserId()) {
  return request(`/travel-mode/${encodeURIComponent(userId)}`);
}

export function enableTravelMode(body, verificationToken, userId = getCurrentUserId()) {
  return request(`/travel-mode/${encodeURIComponent(userId)}?webauthn_token=${encodeURIComponent(verificationToken)}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function disableTravelMode(verificationToken, userId = getCurrentUserId()) {
  return request(`/travel-mode/${encodeURIComponent(userId)}?webauthn_token=${encodeURIComponent(verificationToken)}`, {
    method: "DELETE",
  });
}

// --- WebAuthn (raw HTTP calls; see webauthnClient.js for the browser flow) ---

export function webauthnRegisterOptions(userId = getCurrentUserId()) {
  return request(`/webauthn/register/options?user_id=${encodeURIComponent(userId)}`, {
    method: "POST",
  });
}

export function webauthnRegisterVerify(userId, credential) {
  return request("/webauthn/register/verify", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, credential }),
  });
}

export function webauthnAuthenticateOptions(userId = getCurrentUserId()) {
  return request(`/webauthn/authenticate/options?user_id=${encodeURIComponent(userId)}`, {
    method: "POST",
  });
}

export function webauthnAuthenticateVerify(userId, credential) {
  return request("/webauthn/authenticate/verify", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, credential }),
  });
}

// --- Health ---

export function getHealth() {
  return request("/health");
}

export function seedDemoTransactions(userId = getCurrentUserId()) {
  return request(`/demo/users/${encodeURIComponent(userId)}/transactions`, {
    method: "POST",
  });
}

export function runDemoScenario(scenario, userId = getCurrentUserId()) {
  return request(`/demo/users/${encodeURIComponent(userId)}/scenario/${encodeURIComponent(scenario)}`, {
    method: "POST",
  });
}
