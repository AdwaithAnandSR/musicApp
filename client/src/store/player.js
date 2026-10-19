import { create } from "zustand";
import { createAudioPlaylist } from "expo-audio";

import { getDownloadedSongs } from "@services/downloads/downloadService";
import queryClient from "@services/queryClient";
import { useDownloadStatus } from "@store/appState.store.js";

/**
 * Normalizes a track to preserve both cloud and local URLs.
 * Checks local storage cache to resolve downloaded audio/video paths.
 */
const normalizeTrack = async track => {
    if (!track) return null;

    const cloudUrl = track.cloudUrl || track.url;
    const cloudVideoUrl = track.cloudVideoUrl || track.videoUrl;

    let finalUrl = cloudUrl;
    let finalVideoUrl = cloudVideoUrl;
    let isLocal = track.isLocal || false;

    try {
        const { getLocalSongInfo } = require("@services/downloads/downloadService");
        const songId = track._id || track.id;
        if (songId) {
            const localInfo = await getLocalSongInfo(songId);
            if (localInfo && localInfo.localUrl) {
                finalUrl = localInfo.localUrl;
                finalVideoUrl = localInfo.localVideoUrl || cloudVideoUrl;
                isLocal = true;
            } else if (isLocal && (!localInfo || !localInfo.localUrl)) {
                // If previously marked local but files are missing/deleted
                isLocal = false;
                finalUrl = cloudUrl;
                finalVideoUrl = cloudVideoUrl;
            }
        }
    } catch (err) {
        console.log("Error normalizing track:", err);
    }

    return {
        ...track,
        url: finalUrl,
        cloudUrl,
        videoUrl: finalVideoUrl,
        cloudVideoUrl,
        isLocal
    };
};

export const usePlayer = create((set, get) => ({
    player: null,
    playbackListener: null,
    trackChangedListener: null,
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
    _playSeqId: 0,

    playlistControllers: {},

    setPlaylistController: (id, controller) => {
        set(state => ({
            playlistControllers: {
                ...state.playlistControllers,
                [id]: controller
            }
        }));
        // Sync native loop mode when pagination state changes
        const { player, currentPlaylistId } = get();
        if (player && id === currentPlaylistId) {
            player.loop = get().getEffectiveLoopMode();
        }
    },

    getEffectiveLoopMode: () => {
        const { repeatMode, currentPlaylistId, playlistControllers } = get();
        if (repeatMode === "one") return "single";
        if (repeatMode === "queue") {
            const controller = playlistControllers[currentPlaylistId];
            // If there are more pages still to be fetched, don't loop back to start yet
            if (controller && controller.getHasNextPage()) return "none";
            return "all";
        }
        return "none";
    },

    updateLockScreen: track => {
        const { player, isActiveForLockScreen } = get();
        if (!player || !track) return;

        const metadata = {
            title: track.title,
            artist: track?.artist?.split(",")?.[0] || track?.artist,
            artworkUrl: track.cover || track.artwork,
            albumTitle: track.album || track.albumTitle
        };

        if (!isActiveForLockScreen) {
            player.setActiveForLockScreen(true, metadata, {
                showSeekForward: true,
                showSeekBackward: true,
                showNextTrack: true,
                showPreviousTrack: true
            });
            set({ isActiveForLockScreen: true });
        } else {
            player.updateLockScreenMetadata(metadata);
        }
    },

    updateWidget: (track, isPlaying) => {
        try {
            const currentTrack = track !== undefined ? track : get().currentTrack;
            const currentPlaying = isPlaying !== undefined ? isPlaying : get().isPlaying;
            const { updateMusicWidgetSnapshot } = require("@services/widgetService");
            updateMusicWidgetSnapshot(currentTrack, currentPlaying);
        } catch (e) {
            console.log("Error updating widget:", e);
        }
    },

    setupListeners: playlist => {
        const statusListener = playlist.addListener(
            "playlistStatusUpdate",
            status => {
                const current = get();
                const track = current.currentTrack;
                const duration = status.duration || track?.duration || 0;
                const position = status.currentTime || 0;

                const updates = {};
                if (current.isPlaying !== status.playing) {
                    updates.isPlaying = status.playing;
                    get().updateWidget(track, status.playing);
                }
                if (current.isBuffering !== status.isBuffering)
                    updates.isBuffering = status.isBuffering;
                if (current.isLoaded !== status.isLoaded)
                    updates.isLoaded = status.isLoaded;
                if (current.position !== position) updates.position = position;
                if (current.duration !== duration) updates.duration = duration;

                const newProgress = duration ? position / duration : 0;
                if (current.progress !== newProgress)
                    updates.progress = newProgress;

                const ended = status.didJustFinish || false;
                if (current.hasEnded !== ended) updates.hasEnded = ended;

                if (Object.keys(updates).length > 0) {
                    set(updates);
                }

                if (get().timer != null && get().timer < Date.now()) {
                    get().clearPlayer();
                }
            }
        );

        const trackListener = playlist.addListener(
            "trackChanged",
            ({ previousIndex, currentIndex }) => {
                const { queue, playlistControllers, currentPlaylistId } = get();
                if (currentIndex >= 0 && currentIndex < queue.length) {
                    const nextTrack = queue[currentIndex];
                    set({
                        currentTrackIndex: currentIndex,
                        currentTrackId: nextTrack._id || nextTrack.id,
                        currentTrack: nextTrack,
                        hasEnded: false
                    });

                    get().updateLockScreen(nextTrack);
                    get().updateWidget(nextTrack, get().isPlaying);

                    // Pre-fetch next page if 3 or fewer tracks away from queue end
                    const controller = playlistControllers[currentPlaylistId];
                    if (
                        controller &&
                        controller.getHasNextPage() &&
                        !controller.getIsFetchingNextPage() &&
                        queue.length - currentIndex <= 3
                    ) {
                        controller.fetchNextPage().catch(e => {
                            console.error("Pagination prefetch error:", e);
                        });
                    }
                }
            }
        );

        return { statusListener, trackListener };
    },

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
        const { queue, player, currentTrackIndex, isPlaying } = get();

        if (index === currentTrackIndex && isPlaying) {
            // Restart the current track (e.g. next() on a 1-song queue)
            if (player) {
                player.seekTo(0);
                player.play();
            }
            return;
        }
        if (index < 0 || index >= queue.length) return;

        const track = queue[index];
        if (!track) return;

        if (player) {
            set({
                currentTrackIndex: index,
                currentTrackId: track._id || track.id,
                currentTrack: track,
                isStopped: false
            });
            player.skipTo(index);
            player.play();
            get().updateLockScreen(track);
            get().updateWidget(track, true);
        } else {
            // Player not yet created; initialize with current queue
            const loopMode = get().getEffectiveLoopMode();
            const newPlaylist = createAudioPlaylist({
                sources: queue.map(t => ({ uri: t.url })),
                loop: loopMode,
                updateInterval: 500
            });

            const { statusListener, trackListener } =
                get().setupListeners(newPlaylist);

            set({
                player: newPlaylist,
                playbackListener: statusListener,
                trackChangedListener: trackListener,
                currentTrackIndex: index,
                currentTrackId: track._id || track.id,
                currentTrack: track,
                isStopped: false
            });

            newPlaylist.skipTo(index);
            newPlaylist.play();
            get().updateLockScreen(track);
            get().updateWidget(track, true);
        }
    },

    next: async () => {
        const {
            currentTrackIndex,
            queue,
            repeatMode,
            playlistControllers,
            currentPlaylistId,
            player
        } = get();

        if (!player) return;

        if (repeatMode === "one") {
            player.seekTo(0);
            player.play();
            return;
        }

        let nextIndex = currentTrackIndex + 1;
        const controller = playlistControllers[currentPlaylistId];
        const shouldFetchPage = repeatMode !== "one";

        if (nextIndex >= queue.length) {
            const isLocal = queue.length > 0 && queue[0].isLocal;

            if (isLocal) {
                let actualPlaylistId = currentPlaylistId;
                if (String(currentPlaylistId).startsWith("local-")) {
                    actualPlaylistId = String(currentPlaylistId).replace(
                        "local-",
                        ""
                    );
                }
                const downloadedSongs =
                    await getDownloadedSongs(actualPlaylistId);
                if (downloadedSongs.length > queue.length) {
                    const newTracks = downloadedSongs.map(song => ({
                        ...song,
                        isLocal: true,
                        url: song.localUrl
                    }));

                    for (let i = queue.length; i < newTracks.length; i++) {
                        player.add({ uri: newTracks[i].url });
                    }

                    set({ queue: newTracks, isWaitingForDownload: false });
                    get().playByIndex(nextIndex);
                    return;
                }

                const downloading =
                    useDownloadStatus.getState().downloadingPlaylists[
                        actualPlaylistId
                    ];
                if (downloading && downloading.length > 0) {
                    set({ isWaitingForDownload: true });
                    return;
                }
            }

            if (repeatMode === "queue") {
                if (!(controller && controller.getHasNextPage())) {
                    get().playByIndex(0);
                    return;
                }
            }

            if (shouldFetchPage && controller && controller.getHasNextPage()) {
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

        player.next();

        if (
            shouldFetchPage &&
            controller &&
            queue.length - nextIndex <= 3 &&
            controller.getHasNextPage() &&
            !controller.getIsFetchingNextPage()
        ) {
            controller.fetchNextPage();
        }
    },

    prev: () => {
        const { currentTrackIndex, queue, repeatMode, player } = get();
        if (!player) return;

        if (repeatMode === "one") {
            player.seekTo(0);
            player.play();
            return;
        }

        const prevIndex = currentTrackIndex - 1;

        if (prevIndex < 0) {
            if (repeatMode === "queue" && queue.length > 0) {
                get().playByIndex(queue.length - 1);
            } else {
                // Restart current song when at the beginning
                player.seekTo(0);
                player.play();
            }
            return;
        }

        player.previous();
    },

    changePlaylistAndPlay: async ({
        playlistId,
        trackId,
        tracksOverride,
        isLocal = false,
        isRandomPlaylist = false,
        randomSeed = null
    }) => {
        const { currentPlaylistId, queue, player } = get();

        // Increment sequence ID to invalidate race conditions
        const seqId = get()._playSeqId + 1;
        set({ _playSeqId: seqId });

        let tracks = tracksOverride;

        /*
         * 1. If explicitly playing a local/downloaded playlist,
         *    load songs from local metadata.
         */
        if (isLocal) {
            let actualPlaylistId = playlistId;
            if (String(playlistId).startsWith("local-")) {
                actualPlaylistId = String(playlistId).replace("local-", "");
            }
            const downloadedSongs = await getDownloadedSongs(actualPlaylistId);

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

        // Resolve downloaded files upfront so local songs play without network
        const resolvedTracks = await Promise.all(tracks.map(normalizeTrack));
        if (!resolvedTracks.length) return false;

        // Abort if another changePlaylistAndPlay call occurred during resolution
        if (get()._playSeqId !== seqId) return false;

        const targetIndex = resolvedTracks.findIndex(
            t => (t._id || t.id) === trackId
        );
        if (trackId && targetIndex === -1) return false;
        const initialIndex = targetIndex !== -1 ? targetIndex : 0;

        /*
         * 3. Reuse current queue when possible.
         */
        const shouldUpdateQueue =
            !!tracksOverride ||
            isLocal ||
            currentPlaylistId !== playlistId ||
            get().isRandomPlaylist !== isRandomPlaylist ||
            get().randomSeed !== randomSeed ||
            queue.length !== resolvedTracks.length;

        if (!shouldUpdateQueue && currentPlaylistId === playlistId && player) {
            set({ isRandomPlaylist, randomSeed });
            return get().playByTrackId(trackId);
        }

        // Same playlist identity but queue drifted (e.g. fav removed, pull-to-refresh) —
        // update queue without teardown if the tapped track is already playing
        if (
            currentPlaylistId === playlistId &&
            get().isRandomPlaylist === isRandomPlaylist &&
            get().randomSeed === randomSeed &&
            player &&
            get().currentTrackId === trackId &&
            get().isPlaying
        ) {
            set({ queue: resolvedTracks });
            return true;
        }

        /*
         * 4. Teardown existing player instance before creating new AudioPlaylist
         */
        get().playbackListener?.remove();
        get().trackChangedListener?.remove();
        if (player) {
            player.pause();
            player.clearLockScreenControls();
            player.destroy();
        }
        set({ player: null, playbackListener: null, trackChangedListener: null });

        const currentTrack = resolvedTracks[initialIndex];
        set({
            currentPlaylistId: playlistId,
            isRandomPlaylist,
            randomSeed,
            queue: resolvedTracks,
            currentTrackIndex: initialIndex,
            currentTrackId: currentTrack._id || currentTrack.id,
            currentTrack: currentTrack,
            isStopped: false,
            isWaitingForDownload: false,
            isActiveForLockScreen: false
        });

        try {
            const loopMode = get().getEffectiveLoopMode();
            const newPlaylist = createAudioPlaylist({
                sources: resolvedTracks.map(t => ({ uri: t.url })),
                loop: loopMode,
                updateInterval: 500
            });

            const { statusListener, trackListener } =
                get().setupListeners(newPlaylist);

            newPlaylist.skipTo(initialIndex);
            newPlaylist.play();

            set({
                player: newPlaylist,
                playbackListener: statusListener,
                trackChangedListener: trackListener
            });

            get().updateLockScreen(currentTrack);
        } catch (err) {
            console.error("changePlaylistAndPlay: failed to create player", err);
            get().resetValues();
            return false;
        }

        return true;
    },

    appendToQueue: async (playlistId, tracks, isRandom = false, seed = null) => {
        const { currentPlaylistId, isRandomPlaylist, randomSeed } = get();
        if (playlistId !== currentPlaylistId) return;
        if (isRandom !== isRandomPlaylist) return;
        if (isRandom && seed !== randomSeed) return;
        if (!tracks || !tracks.length) return;

        const { queue, player } = get();

        const existingIds = new Set(queue.map(t => t._id || t.id));
        const newTracks = tracks.filter(t => !existingIds.has(t._id || t.id));
        if (!newTracks.length) return;

        const resolvedNewTracks = await Promise.all(
            newTracks.map(normalizeTrack)
        );

        if (player) {
            for (const t of resolvedNewTracks) {
                player.add({ uri: t.url });
            }
            player.loop = get().getEffectiveLoopMode();
        }

        set({
            queue: [...queue, ...resolvedNewTracks]
        });
    },

    removeFromQueue: songIds => {
        const ids = Array.isArray(songIds) ? songIds : [songIds];
        const removeSet = new Set(ids);
        const { queue, currentTrackId, currentTrackIndex, player } = get();
        if (!queue.some(t => removeSet.has(t._id || t.id))) return;

        const indicesToRemove = [];
        queue.forEach((t, index) => {
            if (removeSet.has(t._id || t.id)) {
                indicesToRemove.push(index);
            }
        });

        if (player) {
            // Remove in descending index order so native indices don't shift prematurely
            for (let i = indicesToRemove.length - 1; i >= 0; i--) {
                player.remove(indicesToRemove[i]);
            }
        }

        const newQueue = queue.filter(t => !removeSet.has(t._id || t.id));

        if (removeSet.has(currentTrackId)) {
            if (newQueue.length > 0) {
                const nextIdx = Math.min(
                    currentTrackIndex,
                    newQueue.length - 1
                );
                set({
                    queue: newQueue,
                    currentTrackIndex: -1,
                    isWaitingForDownload: false
                });
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

    updateRepeatMode: mode => {
        set({ repeatMode: mode });
        const { player } = get();
        if (player) {
            player.loop = get().getEffectiveLoopMode();
        }
    },

    clearPlayer: () => {
        const { player, playbackListener, trackChangedListener } = get();

        playbackListener?.remove();
        trackChangedListener?.remove();

        if (player) {
            player.pause();
            player.clearLockScreenControls();
            player.destroy();
        }

        get().updateWidget(null, false);
        get().resetValues();
    },

    resetValues: () =>
        set({
            player: null,
            playbackListener: null,
            trackChangedListener: null,
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
            isWaitingForDownload: false,
            playbackRate: 1.0
        }),

    onLocalSongDownloaded: async () => {
        const {
            isWaitingForDownload,
            currentPlaylistId,
            queue,
            currentTrackIndex,
            player
        } = get();

        // 1. If currently playing a dedicated local playlist
        if (currentPlaylistId && queue.length > 0 && queue[0].isLocal) {
            let actualPlaylistId = currentPlaylistId;
            if (String(currentPlaylistId).startsWith("local-")) {
                actualPlaylistId = String(currentPlaylistId).replace(
                    "local-",
                    ""
                );
            }
            const downloadedSongs = await getDownloadedSongs(actualPlaylistId);
            if (downloadedSongs.length > queue.length) {
                const newTracks = downloadedSongs.map(song => ({
                    ...song,
                    isLocal: true,
                    url: song.localUrl
                }));

                if (player) {
                    for (let i = queue.length; i < newTracks.length; i++) {
                        player.add({ uri: newTracks[i].url });
                    }
                }

                set({ queue: newTracks });

                if (isWaitingForDownload) {
                    set({ isWaitingForDownload: false });
                    get().playByIndex(currentTrackIndex + 1);
                }
                return;
            }
        }

        // 2. If playing a cloud playlist where upcoming songs just finished downloading (Option A)
        if (player && queue.length > 0) {
            const { getLocalSongInfo } = require("@services/downloads/downloadService");
            let queueUpdated = false;
            const updatedQueue = [...queue];

            for (let i = 0; i < queue.length; i++) {
                const track = queue[i];
                const songId = track._id || track.id;
                if (!songId) continue;

                const localInfo = await getLocalSongInfo(songId);
                if (localInfo?.localUrl && !track.isLocal) {
                    queueUpdated = true;
                    const newTrack = {
                        ...track,
                        url: localInfo.localUrl,
                        isLocal: true,
                        videoUrl: localInfo.localVideoUrl || track.videoUrl
                    };
                    updatedQueue[i] = newTrack;

                    // If upcoming track in native queue, swap source seamlessly
                    if (i > currentTrackIndex) {
                        try {
                            player.insert({ uri: localInfo.localUrl }, i);
                            player.remove(i + 1);
                        } catch (e) {
                            console.log("Error swapping native source for downloaded song:", e);
                        }
                    } else if (i === currentTrackIndex) {
                        set({ currentTrack: newTrack });
                    }
                }
            }

            if (queueUpdated) {
                set({ queue: updatedQueue });
            }
        }
    },

    onLocalSongDeleted: async deletedSongId => {
        const { queue, currentTrackIndex, player } = get();
        if (!queue || !queue.length) return;

        let queueUpdated = false;
        const updatedQueue = [...queue];

        for (let i = 0; i < queue.length; i++) {
            const track = queue[i];
            const songId = track._id || track.id;
            if (!songId) continue;

            if (deletedSongId && songId !== deletedSongId) continue;

            if (track.isLocal) {
                const { getLocalSongInfo } = require("@services/downloads/downloadService");
                const localInfo = await getLocalSongInfo(songId);

                if (!localInfo?.localUrl) {
                    queueUpdated = true;
                    const cloudUrl = track.cloudUrl || track.url;
                    const cloudVideoUrl = track.cloudVideoUrl || track.videoUrl;
                    const revertedTrack = {
                        ...track,
                        url: cloudUrl,
                        isLocal: false,
                        videoUrl: cloudVideoUrl
                    };
                    updatedQueue[i] = revertedTrack;

                    // If upcoming track in native queue, revert back to cloud source
                    if (player && i > currentTrackIndex) {
                        try {
                            player.insert({ uri: cloudUrl }, i);
                            player.remove(i + 1);
                        } catch (e) {
                            console.log("Error reverting native source for deleted song:", e);
                        }
                    } else if (i === currentTrackIndex) {
                        set({ currentTrack: revertedTrack });
                    }
                }
            }
        }

        if (queueUpdated) {
            set({ queue: updatedQueue });
        }
    }
}));
