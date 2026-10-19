import { Platform } from "react-native";
import { File, Directory } from "expo-file-system";
import { widgetsDirectory, addUserInteractionListener } from "expo-widgets";
import * as Linking from "expo-linking";
import { musicWidget } from "@/widgets/MusicWidget";
import { usePlayer } from "@store/player";
import Ionicons from "@react-native-vector-icons/ionicons";
import MaterialIcons from "@react-native-vector-icons/material-icons";
import FontAwesome5 from "@react-native-vector-icons/fontawesome5";

let lastUpdatedArtworkSource = null;
let cachedArtworkFileUri = "";
let latestArtworkRequest = null;
let iconUris = null;

const EMPTY_ICONS = {
    play: "",
    pause: "",
    next: "",
    prev: "",
    fav: "",
    albums: "",
    download: "",
    playlist: "",
    timer: "",
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
        randomIconUri: icons?.playlist || "",
        timerIconsUri: icons?.timer || "",
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

async function getWidgetIconUris() {
    if (iconUris) return iconUris;

    try {
        const [play, pause, next, prev, fav, albums, download, random, timer] =
            await Promise.all([
                Ionicons.getImageSource("play", 32, "#FFFFFF"),
                Ionicons.getImageSource("pause", 32, "#FFFFFF"),
                MaterialIcons.getImageSource("skip-next", 28, "#FFFFFF"),
                MaterialIcons.getImageSource("skip-previous", 28, "#FFFFFF"),
                MaterialIcons.getImageSource("favorite", 28, "#FFFFFF"),
                MaterialIcons.getImageSource("album", 28, "#FFFFFF"),
                MaterialIcons.getImageSource("download", 28, "#FFFFFF"),
                FontAwesome5.getImageSource("random", 28, "#FFFFFF"),
                MaterialIcons.getImageSource("timer", 28, "#FFFFFF"),
            ]);

        iconUris = {
            play: play?.uri || "",
            pause: pause?.uri || "",
            next: next?.uri || "",
            prev: prev?.uri || "",
            fav: fav?.uri || "",
            albums: albums?.uri || "",
            download: download?.uri || "",
            random: random?.uri || "",
            timer: timer?.uri || "",
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
 * Updates the home screen widget snapshot with current playback information.
 * Uses optimistic updates so track details and controls change instantly
 * without waiting for remote album art to download.
 */
export async function updateMusicWidgetSnapshot(track, isPlaying = false) {
    if (Platform.OS === "web") return;

    try {
        const icons = await getWidgetIconUris();

        if (!track) {
            lastUpdatedArtworkSource = null;
            cachedArtworkFileUri = "";
            latestArtworkRequest = null;
            musicWidget.updateSnapshot({
                title: "No track playing",
                artist: "Tap to open Music",
                isPlaying: false,
                artworkUri: "",
                playIconUri: icons.play || "",
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
                    musicWidget.updateSnapshot({
                        title,
                        artist,
                        isPlaying: Boolean(isPlaying),
                        artworkUri,
                        playIconUri,
                        trackBg,
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
        return addUserInteractionListener((event) => {
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
                    if (player.currentTrack) {
                        const songId =
                            player.currentTrack._id || player.currentTrack.id;
                        if (songId) {
                            try {
                                const handleToggleFavourite =
                                    require("@controllers/playlists/handleToggleFavourite").default;
                                handleToggleFavourite(songId);
                            } catch (e) {
                                console.warn(
                                    "Failed to toggle favourite from widget:",
                                    e,
                                );
                            }
                        }
                    }
                    break;
                case "download":
                    Linking.openURL(
                        "music://secure/(tabs)/playlists/DownloadedPlaylistSongs",
                    ).catch(() => {
                        Linking.openURL("music://").catch(() => {});
                    });
                    break;
                case "albums":
                    Linking.openURL(
                        "music://secure/(tabs)/playlists/Playlists",
                    ).catch(() => {
                        Linking.openURL("music://").catch(() => {});
                    });
                    break;
                default:
                    break;
            }
        });
    } catch (err) {
        console.warn("Error registering widget interaction listener:", err);
        return { remove: () => {} };
    }
}
