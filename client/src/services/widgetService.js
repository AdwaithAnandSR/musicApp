'use no memo';
import React from "react";
import { Platform } from "react-native";
import { File, Directory, Paths } from "expo-file-system";
import { requestWidgetUpdate } from "react-native-android-widget";
import * as Linking from "expo-linking";
import { MusicWidget } from "@/widgets/MusicWidget";
import { usePlayer } from "@store/player";
import Ionicons from "@react-native-vector-icons/ionicons";
import MaterialIcons from "@react-native-vector-icons/material-icons";
import { isDarkColor, makeLightColor } from "./colors";
import { storage } from "./storage";

let lastUpdatedArtworkSource = null;
let cachedArtworkFileUri = "";
let latestArtworkRequest = null;
let iconUris = null;
let iconUrisPromise = null;
let widgetViewMode = "controls"; // "controls" | "playlists" | "songs"
let selectedPlaylist = null;
let allLoadedSongs = [];
let displayedSongsCount = 20;
let isLoadingMoreSongs = false;
let isInitialLoadingSongs = false;
let favNextCursor = null;
let currentDownloadedPlaylists = [];
let lastKnownTrack = null;
let lastKnownIsPlaying = false;
let isWidgetRandomOn = storage.getBoolean("widget_random_on") ?? false;

function getSongsSnapshotData(currentPlayingId) {
    if (widgetViewMode !== "songs" || !selectedPlaylist) {
        return {
            selectedPlaylistName: "Songs",
            downloadedSongs: [],
            hasMoreSongs: false,
            isLoadingMore: false,
            isLoadingInitial: false,
        };
    }

    const sliced = allLoadedSongs.slice(0, displayedSongsCount);
    const downloadedSongs = sliced.map((s) => {
        const id = String(s.id || s._id);
        const isCurrent = currentPlayingId ? id === String(currentPlayingId) : false;
        return {
            id,
            title: s.title || "Untitled Track",
            isPlaying: isCurrent,
        };
    });

    const hasMore =
        selectedPlaylist.id === "FAVOURITES_PLAYLIST_ID"
            ? Boolean(favNextCursor) || displayedSongsCount < allLoadedSongs.length
            : displayedSongsCount < allLoadedSongs.length;

    return {
        selectedPlaylistName: selectedPlaylist.name || "Songs",
        downloadedSongs,
        hasMoreSongs: hasMore,
        isLoadingMore: isLoadingMoreSongs,
        isLoadingInitial: isInitialLoadingSongs,
    };
}

export const TIMER_OPTIONS = [
    { label: "1 min", ms: 1 * 60 * 1000 },
    { label: "5 min", ms: 5 * 60 * 1000 },
    { label: "10 min", ms: 10 * 60 * 1000 },
    { label: "30 min", ms: 30 * 60 * 1000 },
    { label: "1 hr", ms: 60 * 60 * 1000 },
    { label: "2 hr", ms: 2 * 60 * 60 * 1000 },
    { label: "5 hr", ms: 5 * 60 * 60 * 1000 },
    { label: "Off", ms: 0 },
];

function getTimerSnapshotData() {
    const player = usePlayer.getState();
    const timer = player?.timer;
    if (timer != null && timer > Date.now()) {
        const storedLabel = storage.getString("widget_timer_label");
        if (storedLabel) {
            return {
                isTimerOn: true,
                timerLabel: storedLabel,
            };
        }
        const remainingMs = timer - Date.now();
        const minutes = Math.ceil(remainingMs / (60 * 1000));
        let label = `${minutes} min`;
        if (minutes >= 60) {
            const hours = Math.round(minutes / 60);
            label = `${hours} hr`;
        }
        return {
            isTimerOn: true,
            timerLabel: label,
        };
    }
    return {
        isTimerOn: false,
        timerLabel: "",
    };
}

const EMPTY_ICONS = {
    play: "",
    pause: "",
    next: "",
    prev: "",
    fav: "",
    albums: "",
    download: "",
    random: "",
    timer: "",
    close: "",
};

/**
 * Icon URIs that don't depend on playback state, shared by every snapshot.
 */
function getControlIconProps(icons) {
    return {
        nextIconUri: icons?.next || "",
        prevIconUri: icons?.prev || "",
        favIconUri: icons?.fav || "",
        albumsIconUri: icons?.albums || "",
        downloadIconUri: icons?.download || "",
        randomIconUri: icons?.random || "",
        timerIconsUri: icons?.timer || "",
        closeIconUri: icons?.close || "",
    };
}

function getWidgetsDirectoryUri() {
    try {
        const dir = new Directory(Paths.cache, "widget_cache");
        if (!dir.exists) {
            dir.create({ idempotent: true, intermediates: true });
        }
        return dir.uri;
    } catch (e) {
        return "";
    }
}

async function resolveIconUri(dirUri, key, getImageSourceFn) {
    if (dirUri) {
        try {
            const dir = new Directory(dirUri);
            const cachedFile = new File(dir, `widget_icon_${key}.png`);
            if (cachedFile.exists) {
                return cachedFile.uri;
            }
        } catch (_) {}
    }

    const source = await getImageSourceFn();
    if (!source?.uri) return "";

    if (dirUri) {
        try {
            const dir = new Directory(dirUri);
            const sourceFile = new File(source.uri);
            const targetFile = new File(dir, `widget_icon_${key}.png`);
            if (sourceFile.exists) {
                if (sourceFile.uri !== targetFile.uri) {
                    await sourceFile.copy(targetFile, { overwrite: true });
                }
                if (targetFile.exists) {
                    return targetFile.uri;
                }
            }
        } catch (e) {
            console.warn(`Failed to copy icon ${key} to widgets dir:`, e);
        }
    }

    return source.uri;
}

async function getWidgetIconUris() {
    if (iconUris) return iconUris;
    if (iconUrisPromise) return iconUrisPromise;

    iconUrisPromise = (async () => {
        try {
            const dirUri = getWidgetsDirectoryUri();

            const [play, pause, next, prev, fav, albums, download, random, timer, close] =
                await Promise.all([
                    resolveIconUri(dirUri, "play", () =>
                        Ionicons.getImageSource("play", 32, "#18181B")
                    ),
                    resolveIconUri(dirUri, "pause", () =>
                        Ionicons.getImageSource("pause", 32, "#18181B")
                    ),
                    resolveIconUri(dirUri, "next", () =>
                        MaterialIcons.getImageSource("skip-next", 28, "#FFFFFF")
                    ),
                    resolveIconUri(dirUri, "prev", () =>
                        MaterialIcons.getImageSource("skip-previous", 28, "#FFFFFF")
                    ),
                    resolveIconUri(dirUri, "fav", () =>
                        MaterialIcons.getImageSource("favorite", 28, "#FFFFFF")
                    ),
                    resolveIconUri(dirUri, "albums", () =>
                        MaterialIcons.getImageSource("album", 28, "#FFFFFF")
                    ),
                    resolveIconUri(dirUri, "download", () =>
                        MaterialIcons.getImageSource("download", 28, "#FFFFFF")
                    ),
                    resolveIconUri(dirUri, "random", () =>
                        MaterialIcons.getImageSource("shuffle", 28, "#FFFFFF")
                    ),
                    resolveIconUri(dirUri, "timer", () =>
                        MaterialIcons.getImageSource("timer", 28, "#FFFFFF")
                    ),
                    resolveIconUri(dirUri, "close", () =>
                        Ionicons.getImageSource("close", 24, "#FFFFFF")
                    ),
                ]);

            iconUris = {
                play,
                pause,
                next,
                prev,
                fav,
                albums,
                download,
                random,
                timer,
                close,
            };
            return iconUris;
        } catch (e) {
            console.warn("Failed to generate widget icon images:", e);
            return { ...EMPTY_ICONS };
        } finally {
            iconUrisPromise = null;
        }
    })();

    return iconUrisPromise;
}

/**
 * Downloads track artwork to cache directory if remote, or copies local URI.
 */
async function resolveWidgetArtwork(rawArtwork) {
    if (!rawArtwork || Platform.OS === "web") {
        return "";
    }

    const dirUri = getWidgetsDirectoryUri();
    if (!dirUri) return rawArtwork;

    try {
        const dir = new Directory(dirUri);
        if (!dir.exists) {
            dir.create({ idempotent: true, intermediates: true });
        }

        const targetFile = new File(dir, "current_artwork.jpg");

        // Already cached and still on disk: reuse
        if (rawArtwork === lastUpdatedArtworkSource && cachedArtworkFileUri) {
            if (targetFile.exists) {
                return cachedArtworkFileUri;
            }
        }

        // Local file: copy into widgets directory
        if (rawArtwork.startsWith("file://")) {
            const sourceFile = new File(rawArtwork);
            if (!sourceFile.exists) return rawArtwork;
            if (sourceFile.uri === targetFile.uri) {
                lastUpdatedArtworkSource = rawArtwork;
                cachedArtworkFileUri = targetFile.uri;
                return targetFile.uri;
            }
            await sourceFile.copy(targetFile, { overwrite: true });
        } else {
            // Remote URL (http / https): download into widgets directory
            await File.downloadFileAsync(rawArtwork, targetFile, {
                idempotent: true,
            });
        }

        if (targetFile.exists) {
            lastUpdatedArtworkSource = rawArtwork;
            cachedArtworkFileUri = targetFile.uri;
            return targetFile.uri;
        }

        return rawArtwork;
    } catch (error) {
        console.warn("Failed to prepare widget artwork:", error);
        return rawArtwork;
    }
}

/**
 * Picks an accent color extracted from album art that contrasts sharply
 * with cardBg and is guaranteed never to melt into the background.
 */
function getContrastingActiveColor(track, cardBg, isDark = true) {
    const colors = track?.colors;
    if (colors) {
        const bgIsDark = cardBg ? isDarkColor(cardBg) : isDark;
        if (bgIsDark) {
            if (colors.lightVibrant && !isDarkColor(colors.lightVibrant)) {
                return colors.lightVibrant;
            }
            if (colors.vibrant) {
                return isDarkColor(colors.vibrant)
                    ? makeLightColor(colors.vibrant, 0.6)
                    : colors.vibrant;
            }
            if (colors.dominant && !isDarkColor(colors.dominant)) {
                return colors.dominant;
            }
        } else {
            if (colors.darkVibrant && isDarkColor(colors.darkVibrant)) {
                return colors.darkVibrant;
            }
            if (colors.vibrant && isDarkColor(colors.vibrant)) {
                return colors.vibrant;
            }
        }
    }
    return isDark ? "#38BDF8" : "#0284C7";
}

/**
 * Builds the complete props object needed to render the MusicWidget.
 */
export async function getCurrentWidgetProps() {
    // If lastKnownTrack in memory is null, attempt to read persisted track from storage
    if (!lastKnownTrack) {
        try {
            const saved = storage.getString("widget_last_track");
            if (saved) {
                lastKnownTrack = JSON.parse(saved);
            }
            lastKnownIsPlaying = storage.getBoolean("widget_last_playing") ?? false;
        } catch (_) {}
    }

    const icons = await getWidgetIconUris();
    const track = lastKnownTrack;
    const isPlaying = lastKnownIsPlaying;

    if (!track) {
        const songsData = getSongsSnapshotData(null);
        const timerData = getTimerSnapshotData();
        return {
            title: "No track playing",
            artist: "Tap to open Music",
            isPlaying: false,
            artworkUri: "",
            playIconUri: icons.play || "",
            widgetView: widgetViewMode,
            downloadedPlaylists: currentDownloadedPlaylists,
            isRandomOn: isWidgetRandomOn,
            randomActiveColor: "#38BDF8",
            ...songsData,
            ...timerData,
            ...getControlIconProps(icons),
        };
    }

    const title = track.title || "Unknown title";
    const artist =
        track.artist?.split?.(",")?.[0] || track.artist || "Unknown artist";
    const playIconUri = isPlaying ? icons.pause || "" : icons.play || "";
    const controlIcons = getControlIconProps(icons);
    const rawArtwork = track.cover || track.artwork || null;
    const trackBg =
        track.colors?.darkVibrant ||
        track.colors?.dominant ||
        track.colors?.average;
    const randomActiveColor = getContrastingActiveColor(track, trackBg, true);
    const currentPlayingId = track?._id || track?.id || null;
    const songsData = getSongsSnapshotData(currentPlayingId);
    const timerData = getTimerSnapshotData();

    const artworkUri =
        rawArtwork && rawArtwork === lastUpdatedArtworkSource && cachedArtworkFileUri
            ? cachedArtworkFileUri
            : rawArtwork || "";

    return {
        title,
        artist,
        isPlaying: Boolean(isPlaying),
        artworkUri,
        playIconUri,
        trackBg,
        widgetView: widgetViewMode,
        downloadedPlaylists: currentDownloadedPlaylists,
        isRandomOn: isWidgetRandomOn,
        randomActiveColor,
        ...songsData,
        ...timerData,
        ...controlIcons,
    };
}

/**
 * Updates the home screen widget snapshot with current playback information.
 */
export async function updateMusicWidgetSnapshot(track, isPlaying = false) {
    if (Platform.OS === "web") return;

    try {
        if (track !== undefined) {
            lastKnownTrack = track;
            try {
                if (track) {
                    storage.set("widget_last_track", JSON.stringify(track));
                } else {
                    storage.delete("widget_last_track");
                }
            } catch (_) {}
        }

        if (isPlaying !== undefined) {
            lastKnownIsPlaying = Boolean(isPlaying);
            try {
                storage.set("widget_last_playing", lastKnownIsPlaying);
            } catch (_) {}
        }

        const widgetProps = await getCurrentWidgetProps();

        // 1. Fast path: update widget immediately
        await requestWidgetUpdate({
            widgetName: "Music",
            renderWidget: () => <MusicWidget {...widgetProps} />,
        });

        // 2. Background artwork resolution (skipped if already cached).
        const rawArtwork = track ? (track.cover || track.artwork || null) : null;
        latestArtworkRequest = rawArtwork;

        if (rawArtwork && rawArtwork !== lastUpdatedArtworkSource) {
            resolveWidgetArtwork(rawArtwork)
                .then(async (artworkUri) => {
                    if (!artworkUri || latestArtworkRequest !== rawArtwork) {
                        return;
                    }
                    const freshProps = await getCurrentWidgetProps();
                    freshProps.artworkUri = artworkUri;
                    await requestWidgetUpdate({
                        widgetName: "Music",
                        renderWidget: () => <MusicWidget {...freshProps} />,
                    });
                })
                .catch((err) => {
                    console.warn(
                        "Background widget artwork resolve error:",
                        err,
                    );
                });
        }
    } catch (err) {
        console.error("Error updating music widget snapshot:", err);
    }
}

async function resumeLastPlaybackSession() {
    try {
        const { getLastPlaybackSession } = require("./storage.js");
        const session = getLastPlaybackSession();
        if (!session || !session.playlistId) {
            Linking.openURL("music://").catch(() => {});
            return;
        }

        const { playlistId, songId, nextSongId, isRandom, isLocal, pageNum } = session;
        const player = usePlayer.getState();

        // ── CASE 1: Random playlist ────────────────────────────────
        if (isRandom) {
            const newSeed = Math.random();
            if (isLocal || String(playlistId).startsWith("local-")) {
                try {
                    const actualId = String(playlistId).replace(/^local-/, "");
                    const { getDownloadedSongs } = require("./downloads/downloadService.js");
                    const songs = await getDownloadedSongs(actualId);
                    if (songs && songs.length > 0) {
                        player.changePlaylistAndPlay({
                            playlistId: `local-${actualId}`,
                            trackId: null,
                            tracksOverride: songs,
                            isLocal: true,
                            isLocalPlaylist: true,
                            isRandomPlaylist: true,
                            randomSeed: newSeed,
                        });
                        return;
                    }
                } catch (e) {
                    console.warn("Failed to resume local random playlist:", e);
                }
            } else {
                try {
                    const { getPlaylistSongs } = require("@controllers/playlists/fetch");
                    const res = await getPlaylistSongs({
                        playlistId,
                        limit: 20,
                        random: true,
                        seed: newSeed,
                    });
                    const musics = res?.musics || [];
                    if (musics.length > 0) {
                        player.changePlaylistAndPlay({
                            playlistId,
                            trackId: musics[0]._id || musics[0].id,
                            tracksOverride: musics,
                            isLocal: false,
                            isLocalPlaylist: false,
                            isRandomPlaylist: true,
                            randomSeed: newSeed,
                        });
                        return;
                    }
                } catch (e) {
                    console.warn("Failed to resume remote random playlist:", e);
                }
            }
        }

        // ── CASE 2: Sequential (non-random) playlist ───────────────
        if (isLocal || String(playlistId).startsWith("local-")) {
            try {
                const actualId = String(playlistId).replace(/^local-/, "");
                const { getDownloadedSongs } = require("./downloads/downloadService.js");
                const songs = await getDownloadedSongs(actualId);
                if (songs && songs.length > 0) {
                    const idx = songs.findIndex((s) => (s.id || s._id) === songId);
                    let targetTrack = null;
                    if (idx !== -1 && idx + 1 < songs.length) {
                        targetTrack = songs[idx + 1];
                    } else {
                        targetTrack = songs[0];
                    }
                    player.changePlaylistAndPlay({
                        playlistId: `local-${actualId}`,
                        trackId: targetTrack.id || targetTrack._id,
                        tracksOverride: songs,
                        isLocal: true,
                        isLocalPlaylist: true,
                        isRandomPlaylist: false,
                    });
                    return;
                }
            } catch (e) {
                console.warn("Failed to resume local sequential playlist:", e);
            }
        } else {
            try {
                const { getPlaylistSongs } = require("@controllers/playlists/fetch");
                const targetPage = pageNum || 1;
                const res = await getPlaylistSongs({
                    playlistId,
                    limit: 20,
                    pageParam: targetPage > 1 ? (targetPage - 1) * 20 : null,
                    random: false,
                });
                const musics = res?.musics || [];
                if (musics.length > 0) {
                    let targetSong = null;
                    const foundIdx = musics.findIndex((s) => (s._id || s.id) === songId);
                    if (foundIdx !== -1 && foundIdx + 1 < musics.length) {
                        targetSong = musics[foundIdx + 1];
                    } else if (foundIdx !== -1 && foundIdx + 1 >= musics.length && res.nextCursor) {
                        try {
                            const nextRes = await getPlaylistSongs({
                                playlistId,
                                limit: 20,
                                pageParam: res.nextCursor,
                                random: false,
                            });
                            targetSong = nextRes?.musics?.[0] || musics[0];
                        } catch (_) {
                            targetSong = musics[0];
                        }
                    } else if (nextSongId) {
                        targetSong = musics.find((s) => (s._id || s.id) === nextSongId) || musics[0];
                    } else {
                        targetSong = musics[0];
                    }

                    player.changePlaylistAndPlay({
                        playlistId,
                        trackId: targetSong._id || targetSong.id,
                        tracksOverride: musics,
                        isLocal: false,
                        isLocalPlaylist: false,
                        isRandomPlaylist: false,
                    });
                    return;
                }
            } catch (e) {
                console.warn("Failed to resume remote sequential playlist:", e);
            }
        }
    } catch (err) {
        console.warn("Failed to resume last playback session:", err);
    }

    Linking.openURL("music://").catch(() => {});
}

async function selectPlaylistById(playlistId) {
    try {
        const { getDownloadedSongs } = require("./downloads/downloadService.js");
        const rawSongs = await getDownloadedSongs(playlistId);
        const found = currentDownloadedPlaylists.find((p) => p.id === playlistId);
        selectedPlaylist = found || { id: playlistId, name: "Playlist" };

        let songsToUse = rawSongs ? [...rawSongs] : [];
        if (isWidgetRandomOn && songsToUse.length > 1) {
            for (let i = songsToUse.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [songsToUse[i], songsToUse[j]] = [songsToUse[j], songsToUse[i]];
            }
        }

        allLoadedSongs = songsToUse;
        displayedSongsCount = 20;
        widgetViewMode = "songs";
        await updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
    } catch (e) {
        console.warn("Failed to load playlist songs for widget:", e);
    }
}

function playSongById(songId) {
    if (selectedPlaylist && allLoadedSongs.length > 0) {
        try {
            const isLocal = selectedPlaylist.id !== "FAVOURITES_PLAYLIST_ID";
            const randomSeed = isWidgetRandomOn ? Math.random() : null;
            const player = usePlayer.getState();
            player.changePlaylistAndPlay({
                playlistId: isLocal ? `local-${selectedPlaylist.id}` : selectedPlaylist.id,
                trackId: songId,
                tracksOverride: allLoadedSongs,
                isLocal: isLocal,
                isLocalPlaylist: isLocal,
                isRandomPlaylist: isWidgetRandomOn,
                randomSeed: randomSeed,
            });
        } catch (e) {
            console.warn("Failed to play song from widget:", e);
        }
    }
}

/**
 * Handles actions emitted from widget clicks.
 */
export async function handleWidgetAction(target, data) {
    if (!target) return;
    const normalizedTarget = String(target).toLowerCase();
    const player = usePlayer.getState();

    switch (normalizedTarget) {
        case "play_pause":
            if (!player.player && player.queue?.length > 0) {
                player.playByIndex(0);
            } else if (player.player) {
                player.playPause();
            } else {
                await resumeLastPlaybackSession();
            }
            break;
        case "next":
            player.next();
            break;
        case "prev":
            player.prev();
            break;
        case "open_app":
            Linking.openURL("music://").catch((err) => {
                console.warn("Failed to open app from widget:", err);
            });
            break;
        case "fav":
            try {
                selectedPlaylist = { id: "FAVOURITES_PLAYLIST_ID", name: "Favourites" };
                widgetViewMode = "songs";
                allLoadedSongs = [];
                displayedSongsCount = 20;
                favNextCursor = null;
                isInitialLoadingSongs = true;

                await updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);

                const randomSeed = isWidgetRandomOn ? Math.random() : null;
                let songs = [];
                let nextCursor = null;

                try {
                    const { getPlaylistSongs } = require("@controllers/playlists/fetch");
                    const res = await getPlaylistSongs({
                        playlistId: "FAVOURITES_PLAYLIST_ID",
                        limit: 20,
                        random: isWidgetRandomOn,
                        seed: randomSeed,
                    });
                    songs = res?.musics || [];
                    nextCursor = res?.nextCursor || null;
                } catch (netErr) {
                    console.warn("Widget Favourites remote fetch failed, checking local:", netErr);
                    try {
                        const { getMeta } = require("./downloads/downloadService.js");
                        const meta = await getMeta();
                        const allLocalSongs = Object.values(meta?.songs || {}).flat();
                        const favIds = new Set();
                        songs = allLocalSongs.filter((s) => {
                            const id = s.id || s._id;
                            if (s.isFav && !favIds.has(id)) {
                                favIds.add(id);
                                return true;
                            }
                            return false;
                        });
                        if (isWidgetRandomOn && songs.length > 1) {
                            for (let i = songs.length - 1; i > 0; i--) {
                                const j = Math.floor(Math.random() * (i + 1));
                                [songs[i], songs[j]] = [songs[j], songs[i]];
                            }
                        }
                    } catch (_) {}
                }

                allLoadedSongs = songs;
                favNextCursor = nextCursor;
            } catch (e) {
                console.warn("Failed to load favourites for widget:", e);
            } finally {
                isInitialLoadingSongs = false;
                await updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
            }
            break;
        case "download":
            try {
                const { getDownloadedPlaylists } = require("./downloads/downloadService.js");
                const rawPlaylists = await getDownloadedPlaylists();
                currentDownloadedPlaylists = (rawPlaylists || []).map((p) => ({
                    id: String(p.id || p._id),
                    name: p.name || "Untitled Playlist",
                }));
                widgetViewMode = "playlists";
                await updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
            } catch (e) {
                console.warn("Failed to load downloaded playlists for widget:", e);
            }
            break;
        case "exit_to_controls":
            widgetViewMode = "controls";
            selectedPlaylist = null;
            allLoadedSongs = [];
            displayedSongsCount = 20;
            favNextCursor = null;
            isInitialLoadingSongs = false;
            isLoadingMoreSongs = false;
            await updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
            break;
        case "back_to_playlists":
            if (selectedPlaylist?.id === "FAVOURITES_PLAYLIST_ID") {
                widgetViewMode = "controls";
            } else {
                widgetViewMode = "playlists";
            }
            selectedPlaylist = null;
            allLoadedSongs = [];
            displayedSongsCount = 20;
            favNextCursor = null;
            isInitialLoadingSongs = false;
            isLoadingMoreSongs = false;
            await updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
            break;
        case "load_more_songs":
            if (selectedPlaylist?.id === "FAVOURITES_PLAYLIST_ID" && favNextCursor) {
                isLoadingMoreSongs = true;
                await updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
                try {
                    const { getPlaylistSongs } = require("@controllers/playlists/fetch");
                    const res = await getPlaylistSongs({
                        playlistId: "FAVOURITES_PLAYLIST_ID",
                        limit: 20,
                        pageParam: favNextCursor,
                        random: isWidgetRandomOn,
                        seed: isWidgetRandomOn ? Math.random() : null,
                    });
                    if (res?.musics?.length > 0) {
                        allLoadedSongs = [...allLoadedSongs, ...res.musics];
                        favNextCursor = res?.nextCursor || null;
                        displayedSongsCount = allLoadedSongs.length;
                    } else {
                        favNextCursor = null;
                    }
                } catch (e) {
                    console.warn("Failed to load more favourites for widget:", e);
                } finally {
                    isLoadingMoreSongs = false;
                    await updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
                }
            } else if (displayedSongsCount < allLoadedSongs.length) {
                displayedSongsCount = Math.min(displayedSongsCount + 20, allLoadedSongs.length);
                await updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
            }
            break;
        case "random":
            isWidgetRandomOn = !isWidgetRandomOn;
            try {
                storage.set("widget_random_on", isWidgetRandomOn);
            } catch (_) {}
            if (widgetViewMode === "songs" && allLoadedSongs.length > 0 && selectedPlaylist) {
                if (selectedPlaylist.id === "FAVOURITES_PLAYLIST_ID") {
                    isInitialLoadingSongs = true;
                    await updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
                    try {
                        const randomSeed = isWidgetRandomOn ? Math.random() : null;
                        const { getPlaylistSongs } = require("@controllers/playlists/fetch");
                        const res = await getPlaylistSongs({
                            playlistId: "FAVOURITES_PLAYLIST_ID",
                            limit: 20,
                            random: isWidgetRandomOn,
                            seed: randomSeed,
                        });
                        allLoadedSongs = res?.musics || [];
                        favNextCursor = res?.nextCursor || null;
                        displayedSongsCount = 20;
                    } catch (_) {
                        if (isWidgetRandomOn && allLoadedSongs.length > 1) {
                            for (let i = allLoadedSongs.length - 1; i > 0; i--) {
                                const j = Math.floor(Math.random() * (i + 1));
                                [allLoadedSongs[i], allLoadedSongs[j]] = [allLoadedSongs[j], allLoadedSongs[i]];
                            }
                        }
                    } finally {
                        isInitialLoadingSongs = false;
                        await updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
                    }
                    return;
                } else if (isWidgetRandomOn) {
                    for (let i = allLoadedSongs.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [allLoadedSongs[i], allLoadedSongs[j]] = [allLoadedSongs[j], allLoadedSongs[i]];
                    }
                } else {
                    try {
                        const { getDownloadedSongs } = require("./downloads/downloadService.js");
                        const raw = await getDownloadedSongs(selectedPlaylist.id);
                        allLoadedSongs = raw || [];
                    } catch (_) {}
                }
            }
            await updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
            break;
        case "timer": {
            const currentTimer = player.timer;
            const isCurrentlyActive = currentTimer != null && currentTimer > Date.now();

            let currentIndex = storage.getNumber("widget_timer_index");
            if (currentIndex == null || currentIndex < 0 || !isCurrentlyActive) {
                currentIndex = -1;
            }

            const nextIndex = (currentIndex + 1) % TIMER_OPTIONS.length;
            const selectedOption = TIMER_OPTIONS[nextIndex];

            if (selectedOption.ms === 0) {
                player.setTimer(null);
                storage.set("widget_timer_index", -1);
                storage.delete("widget_timer_label");
            } else {
                const targetTimestamp = Date.now() + selectedOption.ms;
                player.setTimer(targetTimestamp);
                storage.set("widget_timer_index", nextIndex);
                storage.set("widget_timer_label", selectedOption.label);
            }

            await updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
            break;
        }
        case "select_playlist": {
            const playlistId = data?.playlistId;
            if (playlistId) {
                await selectPlaylistById(playlistId);
            }
            break;
        }
        case "play_song": {
            const songId = data?.songId;
            if (songId) {
                playSongById(songId);
            }
            break;
        }
        default:
            if (target && target.startsWith("select_playlist:")) {
                const playlistId = target.replace("select_playlist:", "");
                await selectPlaylistById(playlistId);
            } else if (target && target.startsWith("play_song:")) {
                const songId = target.replace("play_song:", "");
                playSongById(songId);
            }
            break;
    }
}

/**
 * Kept for backwards compatibility with app layout.
 */
export function initWidgetInteractionListener() {
    return { remove: () => {} };
}
