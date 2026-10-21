import { Platform } from "react-native";
import { File, Directory } from "expo-file-system";
import { widgetsDirectory, addUserInteractionListener } from "expo-widgets";
import * as Linking from "expo-linking";
import { musicWidget } from "@/widgets/MusicWidget";
import { usePlayer } from "@store/player";
import Ionicons from "@react-native-vector-icons/ionicons";
import MaterialIcons from "@react-native-vector-icons/material-icons";
import { isDarkColor, makeLightColor } from "./colors";
import { storage } from "./storage";

let lastUpdatedArtworkSource = null;
let cachedArtworkFileUri = "";
let latestArtworkRequest = null;
let iconUris = null;
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

/**
 * Normalizes widgetsDirectory to a clean file:/// URI without double slashes or trailing slashes.
 */
function getWidgetsDirectoryUri() {
    if (!widgetsDirectory) return "";
    const rawPath = widgetsDirectory
        .replace(/^file:\/*/, "/")
        .replace(/\/+$/, "");
    return `file://${rawPath}`;
}

async function resolveIconUri(dir, key, getImageSourceFn) {
    if (dir) {
        const cachedFile = new File(dir, `widget_icon_${key}.png`);
        if (cachedFile.exists) {
            return cachedFile.uri;
        }
    }

    const source = await getImageSourceFn();
    if (!source?.uri) return "";

    if (dir) {
        try {
            const sourceFile = new File(source.uri);
            const targetFile = new File(dir, `widget_icon_${key}.png`);
            if (targetFile.exists) {
                try {
                    targetFile.delete();
                } catch (_) {}
            }
            if (sourceFile.exists) {
                sourceFile.copy(targetFile);
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

    try {
        const dirUri = getWidgetsDirectoryUri();
        let dir = null;
        if (dirUri) {
            dir = new Directory(dirUri);
            if (!dir.exists) {
                dir.create({ idempotent: true, intermediates: true });
            }
        }

        const [play, pause, next, prev, fav, albums, download, random, timer, close] =
            await Promise.all([
                resolveIconUri(dir, "play", () =>
                    Ionicons.getImageSource("play", 32, "#FFFFFF")
                ),
                resolveIconUri(dir, "pause", () =>
                    Ionicons.getImageSource("pause", 32, "#FFFFFF")
                ),
                resolveIconUri(dir, "next", () =>
                    MaterialIcons.getImageSource("skip-next", 28, "#FFFFFF")
                ),
                resolveIconUri(dir, "prev", () =>
                    MaterialIcons.getImageSource("skip-previous", 28, "#FFFFFF")
                ),
                resolveIconUri(dir, "fav", () =>
                    MaterialIcons.getImageSource("favorite", 28, "#FFFFFF")
                ),
                resolveIconUri(dir, "albums", () =>
                    MaterialIcons.getImageSource("album", 28, "#FFFFFF")
                ),
                resolveIconUri(dir, "download", () =>
                    MaterialIcons.getImageSource("download", 28, "#FFFFFF")
                ),
                resolveIconUri(dir, "random", () =>
                    MaterialIcons.getImageSource("shuffle", 28, "#FFFFFF")
                ),
                resolveIconUri(dir, "timer", () =>
                    MaterialIcons.getImageSource("timer", 28, "#FFFFFF")
                ),
                resolveIconUri(dir, "close", () =>
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
    } catch (e) {
        console.warn("Failed to generate widget icon images:", e);
        // Don't cache the failure permanently; allow a retry next time.
        return { ...EMPTY_ICONS };
    }

    return iconUris;
}

/**
 * Downloads track artwork to widgetsDirectory if remote, or copies local URI.
 * Only returns a file URI if the file is verified to exist on disk.
 */
async function resolveWidgetArtwork(rawArtwork) {
    if (!rawArtwork || Platform.OS === "web" || !widgetsDirectory) {
        return "";
    }

    const dirUri = getWidgetsDirectoryUri();
    if (!dirUri) return "";

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

        if (targetFile.exists) {
            try {
                targetFile.delete();
            } catch (_) {}
        }

        // Local file: copy into widgets directory
        if (rawArtwork.startsWith("file://")) {
            const sourceFile = new File(rawArtwork);
            if (!sourceFile.exists) return "";
            sourceFile.copy(targetFile);
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

        return "";
    } catch (error) {
        console.warn("Failed to prepare widget artwork:", error);
        return "";
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
 * Updates the home screen widget snapshot with current playback information.
 * Uses optimistic updates so track details and controls change instantly
 * without waiting for remote album art to download.
 */
export async function updateMusicWidgetSnapshot(track, isPlaying = false) {
    if (Platform.OS === "web") return;

    try {
        lastKnownTrack = track;
        lastKnownIsPlaying = Boolean(isPlaying);

        const icons = await getWidgetIconUris();

        if (!track) {
            lastUpdatedArtworkSource = null;
            cachedArtworkFileUri = "";
            latestArtworkRequest = null;
            const songsData = getSongsSnapshotData(null);
            musicWidget.updateSnapshot({
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
                ...getControlIconProps(icons),
            });
            return;
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

        latestArtworkRequest = rawArtwork;

        // 1. Fast path: update text and controls immediately.
        const immediateArtwork =
            rawArtwork && rawArtwork === lastUpdatedArtworkSource
                ? cachedArtworkFileUri
                : "";

        musicWidget.updateSnapshot({
            title,
            artist,
            isPlaying: Boolean(isPlaying),
            artworkUri: immediateArtwork,
            playIconUri,
            trackBg,
            widgetView: widgetViewMode,
            downloadedPlaylists: currentDownloadedPlaylists,
            isRandomOn: isWidgetRandomOn,
            randomActiveColor,
            ...songsData,
            ...controlIcons,
        });

        // 2. Background artwork resolution (skipped if already cached).
        if (rawArtwork && rawArtwork !== lastUpdatedArtworkSource) {
            resolveWidgetArtwork(rawArtwork)
                .then((artworkUri) => {
                    // Ignore stale results if the track changed meanwhile.
                    if (!artworkUri || latestArtworkRequest !== rawArtwork) {
                        return;
                    }
                    const freshTrack = lastKnownTrack;
                    const freshPlayingId = freshTrack?._id || freshTrack?.id || null;
                    const freshSongsData = getSongsSnapshotData(freshPlayingId);
                    musicWidget.updateSnapshot({
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
                        ...freshSongsData,
                        ...controlIcons,
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

/**
 * Listens for widget button taps (play/pause, next, prev) and controls playback.
 */
export function initWidgetInteractionListener() {
    if (Platform.OS === "web") return { remove: () => {} };

    try {
        return addUserInteractionListener(async (event) => {
            if (!event || event.source !== "MusicWidget") return;

            const player = usePlayer.getState();
            switch (event.target) {
                case "play_pause":
                    if (!player.player && player.queue?.length > 0) {
                        player.playByIndex(0);
                    } else if (player.player) {
                        player.playPause();
                    } else {
                        Linking.openURL("music://").catch(() => {});
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

                        // Immediately switch widget to songs view displaying the loading indicator
                        updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);

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
                        updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
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
                        updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
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
                    updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
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
                    updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
                    break;
                case "load_more_songs":
                    if (selectedPlaylist?.id === "FAVOURITES_PLAYLIST_ID" && favNextCursor) {
                        isLoadingMoreSongs = true;
                        updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
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
                            updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
                        }
                    } else if (displayedSongsCount < allLoadedSongs.length) {
                        displayedSongsCount = Math.min(displayedSongsCount + 20, allLoadedSongs.length);
                        updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
                    }
                    break;
                case "random":
                    isWidgetRandomOn = !isWidgetRandomOn;
                    try {
                        storage.set("widget_random_on", isWidgetRandomOn);
                    } catch (_) {}
                    // If viewing songs, reshuffle or re-order them
                    if (widgetViewMode === "songs" && allLoadedSongs.length > 0 && selectedPlaylist) {
                        if (selectedPlaylist.id === "FAVOURITES_PLAYLIST_ID") {
                            isInitialLoadingSongs = true;
                            updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
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
                                updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
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
                    updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
                    break;
                default:
                    if (event.target && event.target.startsWith("select_playlist:")) {
                        const playlistId = event.target.replace("select_playlist:", "");
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
                            updateMusicWidgetSnapshot(lastKnownTrack, lastKnownIsPlaying);
                        } catch (e) {
                            console.warn("Failed to load playlist songs for widget:", e);
                        }
                    } else if (event.target && event.target.startsWith("play_song:")) {
                        const songId = event.target.replace("play_song:", "");
                        if (selectedPlaylist && allLoadedSongs.length > 0) {
                            try {
                                const isLocal = selectedPlaylist.id !== "FAVOURITES_PLAYLIST_ID";
                                const randomSeed = isWidgetRandomOn ? Math.random() : null;
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
                    break;
            }
        });
    } catch (err) {
        console.warn("Error registering widget interaction listener:", err);
        return { remove: () => {} };
    }
}
