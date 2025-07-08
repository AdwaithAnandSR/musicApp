import { MMKV } from "react-native-mmkv";

export const storage = new MMKV();

export const playlists = JSON.parse(storage.getString("playlists") || "[]");

export const storedPage = storage.getNumber("storedPage");

export const userId = storage.getString("userId");

export const isAuthenticated = storage.getBoolean("isAuthenticated");

const size = storage.size;
console.log(
    `current storage size (mmkv): ${Number(size / 1024).toFixed(2)} mb`
);

if (size > 20000) {
    storage.delete("songs");
    storage.trim();
}
