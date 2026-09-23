// src/webauthnClient.js
//
// Requires: npm install @simplewebauthn/browser
// This library is the standard client-side counterpart to the
// py_webauthn library your backend uses — it handles all the
// ArrayBuffer <-> base64url conversion that raw navigator.credentials
// calls would otherwise require by hand.

import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import {
  webauthnRegisterOptions,
  webauthnRegisterVerify,
  webauthnAuthenticateOptions,
  webauthnAuthenticateVerify,
  getCurrentUserId,
} from "./api";

function normalizeOptions(options) {
  return typeof options === "string" ? JSON.parse(options) : options;
}

// Call this once, e.g. from LoginPage or ProfilePage, before a user can
// ever be asked to authenticate with biometrics.
export async function registerBiometric(userId = getCurrentUserId()) {
  const options = normalizeOptions(await webauthnRegisterOptions(userId));
  const credential = await startRegistration({ optionsJSON: options });
  return webauthnRegisterVerify(userId, credential);
}

// Call this from AlertsPage (or TravelModePage) whenever a real
// biometric confirmation is required.
export async function authenticateBiometric(userId = getCurrentUserId()) {
  const options = normalizeOptions(await webauthnAuthenticateOptions(userId));
  const credential = await startAuthentication({ optionsJSON: options });
  const result = await webauthnAuthenticateVerify(userId, credential);
  if (!result?.verified || !result?.token) {
    throw new Error("Biometric verification did not return a valid token");
  }
  return result.token;
}