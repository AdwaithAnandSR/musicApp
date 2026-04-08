import { MMKV } from "react-native-mmkv";

export const storage = new MMKV();

// ── Legacy keys kept for backward compat ───────────────
export const playlists = JSON.parse(storage.getString("playlists") || "[]");
export const storedPage = storage.getNumber("storedPage");

// ── Auth token helpers ──────────────────────────────────
export const getToken = () => storage.getString("authToken") ?? null;
export const setToken = token => storage.set("authToken", token);
export const removeToken = () => storage.delete("authToken");

// ── Stored user info helpers ────────────────────────────
export const getUser = () => {
    const raw = storage.getString("user");
    return raw ? JSON.parse(raw) : null;
};
export const setUser = user => storage.set("user", JSON.stringify(user));
export const removeUser = () => storage.delete("user");

export const getIsAuth = () => {
    return storage.getBoolean("isAuth") ?? false;
};
export const setIsAuth = v => storage.set("isAuth", v);

// ── Storage health ──────────────────────────────────────
const size = storage.size;
console.log(
    `current storage size (mmkv): ${Number(size / 1024).toFixed(2)} mb`
);

if (size > 20000) {
    storage.delete("HOME");
    storage.trim();
}
