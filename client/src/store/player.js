import { create } from "zustand";
import { createAudioPlayer, mediaSessionController } from "expo-audio";

import { getDownloadedSongs } from "@services/downloads/downloadService";
import queryClient from "@services/queryClient";
import { useDownloadStatus } from "@store/appState.store.js";

export const usePlayer = create((set, get) => ({
    player: null,
    playbackListener: null,
    isActiveForLockScreen: false,
    queue: [],

    currentPlaylistId: null,
    isRandomPlaylist: false,
    randomSeed: null,
    currentTrackId: null,
    currentTrack: null,
    currentTrackIndex: -1,
    isPlaying: false,
    isBuffering: false,
    isLoaded: false,
    isStopped: true,
    repeatMode: "queue",
    timer: null,
    position: 0,
    duration: 0,
    progress: 0,
    hasEnded: false,
    error: null,

    playlistControllers: {},

    setPlaylistController: (id, controller) =>
        set(state => ({
            playlistControllers: {
                ...state.playlistControllers,
                [id]: controller
            }
        })),

    playByTrackId: trackId => {
        const { queue } = get();
        const index = queue.findIndex(t => (t._id || t.id) === trackId);
        if (index === -1) return false;
        get().playByIndex(index);
        return true;
    },

    playPause: () => {
        const { player, isPlaying } = get();
        if (!player) return;
        if (isPlaying) player.pause();
        else player.play();
    },

    playByIndex: async index => {
        const {
            queue,
            isActiveForLockScreen,
            currentTrackIndex,
            isPlaying
        } = get();

        if (index === currentTrackIndex && isPlaying) return;
        if (index < 0 || index >= queue.length) return;

        const track = queue[index];
        if (!track) return;
        
        // Optimistically set the track index so concurrent calls are visible
        set({ currentTrackIndex: index, currentTrackId: track._id || track.id, currentTrack: track });

        let trackUrl = track.url;

        // Check if there's a local downloaded version of this song
        if (!track.isLocal && (track._id || track.id)) {
            try {
                const { getLocalUrlForSong } = require("@services/downloads/downloadService");
                const localUrl = await getLocalUrlForSong(track._id || track.id);
                if (localUrl) {
                    trackUrl = localUrl;
                }
            } catch (err) {
                console.log("Error checking local version:", err);
            }
        }

        // If another playByIndex was called while we were waiting, abort
        if (get().currentTrackIndex !== index) {
            return;
        }

        const player = get().player;
        let newPlayer = player;
        if (player) player.replace(trackUrl);
        else newPlayer = createAudioPlayer(trackUrl);

        get().playbackListener?.remove();

        let metadataUpdated = false;

        const listener = newPlayer.addListener(
            "playbackStatusUpdate",
            status => {
                const duration = status.duration || track.duration || 0;

                const position = status.currentTime || 0;

                if (status.isLoaded && !metadataUpdated) {
                    metadataUpdated = true;

                    const metadata = {
                        title: track.title,
                        artist: track?.artist?.split(",")?.[0],
                        artworkUrl: track.cover || track.artwork
                    };

                    if (!isActiveForLockScreen) {
                        newPlayer.setActiveForLockScreen(true, metadata, {
                            showSeekForward: true,
                            showSeekBackward: true,
                            showNextTrack: true,
                            showPreviousTrack: true
                        });

                        set({ isActiveForLockScreen: true });
                    } else {
                        newPlayer.updateLockScreenMetadata(metadata);
                    }
                }

                set({
                    isPlaying: status.playing,
                    isBuffering: status.isBuffering,
                    isLoaded: status.isLoaded,
                    position,
                    duration,
                    progress: duration ? position / duration : 0,
                    hasEnded: status.didJustFinish || false,
                    error: status.error || null
                });

                if (get().timer != null && get().timer < Date.now())
                    get().clearPlayer();

                if (status.didJustFinish) {
                    queueMicrotask(() => get().next());
                }
            }
        );

        newPlayer.addListener("onRemoteNextTrack", () => console.log("next"));

        newPlayer.play();

        set({
            player: newPlayer,
            playbackListener: listener,
            currentTrackId: track._id || track.id,
            currentTrackIndex: index,
            currentTrack: track,
            isStopped: false,
            isWaitingForDownload: false
        });
    },

    next: async () => {
        const {
            currentTrackIndex,
            queue,
            repeatMode,
            playlistControllers,
            currentPlaylistId
        } = get();

        if (repeatMode === "one") {
            get().playByIndex(currentTrackIndex);
            return;
        }

        let nextIndex = currentTrackIndex + 1;
        const controller = playlistControllers[currentPlaylistId];
        const shouldFetchPage = repeatMode !== "queue" && repeatMode !== "one";

        if (nextIndex >= queue.length) {
            const isLocal = queue.length > 0 && queue[0].isLocal;
            
            if (isLocal) {
                const downloadedSongs = await getDownloadedSongs(currentPlaylistId);
                if (downloadedSongs.length > queue.length) {
                    const newTracks = downloadedSongs.map(song => ({
                        ...song,
                        isLocal: true,
                        url: song.localUrl
                    }));
                    set({ queue: newTracks, isWaitingForDownload: false });
                    get().playByIndex(nextIndex);
                    return;
                }
                
                const downloading = useDownloadStatus.getState().downloadingPlaylists[currentPlaylistId];
                if (downloading && downloading.length > 0) {
                    set({ isWaitingForDownload: true });
                    return;
                }
            }

            if (repeatMode === "queue") {
                get().playByIndex(0);
                return;
            }

            if (shouldFetchPage && controller && controller.hasNextPage) {
                const preFetchPlaylistId = currentPlaylistId;

                try {
                    await controller.fetchNextPage();
                } catch (e) {
                    console.error("Pagination error:", e);
                }

                if (get().currentPlaylistId !== preFetchPlaylistId) return;

                const newQueue = get().queue;
                if (nextIndex < newQueue.length) {
                    get().playByIndex(nextIndex);
                }
            }
            return;
        }

        get().playByIndex(nextIndex);

        if (
            shouldFetchPage &&
            controller &&
            get().queue.length - get().currentTrackIndex <= 3 &&
            controller.hasNextPage &&
            !controller.isFetchingNextPage
        ) {
            controller.fetchNextPage();
        }
    },

    prev: () => {
        const { currentTrackIndex, queue, repeatMode } = get();

        if (repeatMode === "one") {
            get().playByIndex(currentTrackIndex);
            return;
        }

        const prevIndex = currentTrackIndex - 1;

        if (prevIndex < 0) {
            if (repeatMode === "queue" && queue.length > 0) {
                get().playByIndex(queue.length - 1);
            }
            return;
        }

        get().playByIndex(prevIndex);
    },

    changePlaylistAndPlay: async ({
        playlistId,
        trackId,
        tracksOverride,
        isLocal = false,
        isRandomPlaylist = false,
        randomSeed = null
    }) => {
        const { currentPlaylistId, queue } = get();

        let tracks = tracksOverride;

        /*
         * 1. If explicitly playing a local/downloaded playlist,
         *    load songs from local metadata.
         */

        if (isLocal) {
            const downloadedSongs = await getDownloadedSongs(playlistId);

            tracks = downloadedSongs.map(song => ({
                ...song,
                isLocal: true,
                url: song.localUrl
            }));
        }

        /*
         * 2. Otherwise use the normal React Query playlist data.
         */
        if (!tracks) {
            let targetQueryKey = [playlistId];
            if (isRandomPlaylist && randomSeed) {
                targetQueryKey = [playlistId, "random", randomSeed];
            }

            const data = queryClient.getQueryData(targetQueryKey);
            tracks = data?.pages?.flatMap(page => page.musics) ?? [];

            if (!tracks.length) {
                // Fallback to active queries matching exactly
                const activeQueries = queryClient.getQueriesData({
                    queryKey: targetQueryKey,
                    exact: true
                });

                if (activeQueries && activeQueries.length > 0) {
                    const [, lastQueryData] =
                        activeQueries[activeQueries.length - 1];

                    tracks =
                        lastQueryData?.pages?.flatMap(page => page.musics) ??
                        [];
                }
            }
        }

        if (!tracks?.length) return false;

        /*
         * 4. If local playlist, make absolutely sure the
         *    audio URL points to the downloaded file.
         */
        if (isLocal) {
            tracks = tracks
                .filter(song => song.localUrl)
                .map(song => ({
                    ...song,
                    isLocal: true,
                    url: song.localUrl
                }));
        }

        if (!tracks.length) return false;

        /*
         * 5. Reuse current queue when possible.
         */
        const shouldUpdateQueue =
            !!tracksOverride ||
            isLocal ||
            currentPlaylistId !== playlistId ||
            get().isRandomPlaylist !== isRandomPlaylist ||
            queue.length !== tracks.length;

        if (!shouldUpdateQueue && currentPlaylistId === playlistId) {
            const found = get().playByTrackId(trackId);

            if (found) {
                set({ isRandomPlaylist, randomSeed });
                return true;
            }
        }

        /*
         * 6. Replace queue.
         */
        set({
            currentPlaylistId: playlistId,
            isRandomPlaylist,
            randomSeed,
            queue: tracks,
            currentTrackIndex: -1,
            currentTrackId: null,
            isWaitingForDownload: false
        });

        /*
         * 7. Start requested track.
         */
        return get().playByTrackId(trackId);
    },

    appendToQueue: (playlistId, tracks) => {
        if (playlistId !== get().currentPlaylistId) return;

        const { queue } = get();

        const existingIds = new Set(queue.map(t => t._id || t.id));
        const newTracks = tracks.filter(t => !existingIds.has(t._id || t.id));

        set({
            queue: [...queue, ...newTracks]
        });
    },

    removeFromQueue: songIds => {
        const ids = Array.isArray(songIds) ? songIds : [songIds];
        const removeSet = new Set(ids);
        const { queue, currentTrackId, currentTrackIndex } = get();
        if (!queue.some(t => removeSet.has(t._id || t.id))) return;

        const newQueue = queue.filter(t => !removeSet.has(t._id || t.id));

        if (removeSet.has(currentTrackId)) {
            if (newQueue.length > 0) {
                const nextIdx = Math.min(
                    currentTrackIndex,
                    newQueue.length - 1
                );
                set({ queue: newQueue, currentTrackIndex: -1, isWaitingForDownload: false });
                get().playByIndex(nextIdx);
            } else {
                set({ queue: [] });
                get().clearPlayer();
            }
        } else {
            const newIndex = newQueue.findIndex(
                t => (t._id || t.id) === currentTrackId
            );
            set({ queue: newQueue, currentTrackIndex: newIndex });
        }
    },

    seekTo: ms => {
        const { player } = get();
        player?.seekTo(ms);
    },

    playbackRate: 1.0,

    setRate: (rate = 1.0) => {
        const { player } = get();
        if (player) {
            try {
                if (typeof player.setPlaybackRate === "function") {
                    player.setPlaybackRate(rate);
                } else if (typeof player.setRate === "function") {
                    player.setRate(rate);
                } else {
                    player.playbackRate = rate;
                }
            } catch (err) {
                console.log("Error setting rate:", err);
            }
        }
        set({ playbackRate: rate });
    },

    setTimer: async time => set({ timer: time }),

    updateRepeatMode: mode => set({ repeatMode: mode }),

    clearPlayer: () => {
        const { player, playbackListener } = get();

        playbackListener?.remove();

        if (player) {
            player.pause();
            player.clearLockScreenControls();
            player.remove();
        }

        get().resetValues();
    },

    resetValues: () =>
        set({
            player: null,
            playbackListener: null,
            isActiveForLockScreen: false,
            isPlaying: false,
            isBuffering: false,
            isStopped: true,
            hasEnded: false,
            currentTrackIndex: -1,
            currentTrack: null,
            currentTrackId: null,
            timer: null,
            position: 0,
            duration: 0,
            progress: 0,
            isWaitingForDownload: false
        }),

    onLocalSongDownloaded: async () => {
        const { isWaitingForDownload, currentPlaylistId, queue, currentTrackIndex } = get();
        
        if (currentPlaylistId && queue.length > 0 && queue[0].isLocal) {
            const downloadedSongs = await getDownloadedSongs(currentPlaylistId);
            if (downloadedSongs.length > queue.length) {
                const newTracks = downloadedSongs.map(song => ({
                    ...song,
                    isLocal: true,
                    url: song.localUrl
                }));
                set({ queue: newTracks });
                
                if (isWaitingForDownload) {
                    set({ isWaitingForDownload: false });
                    get().playByIndex(currentTrackIndex + 1);
                }
            }
        }
    }
}));
