import { create } from "zustand";
import { createAudioPlayer } from "expo-audio";

import { getDownloadedSongs }from "@services/downloads/downloadService"
import queryClient from "@services/queryClient";

export const usePlayer = create((set, get) => ({
    player: null,
    playbackListener: null,
    isActiveForLockScreen: false,
    queue: [],

    currentPlaylistId: null,
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

    playByIndex: index => {
        const {
            queue,
            player,
            playbackListener,
            isActiveForLockScreen,
            currentTrackIndex,
            isPlaying
        } = get();

        if (index === currentTrackIndex && isPlaying) return;
        if (index < 0 || index >= queue.length) return;

        const track = queue[index];
        if (!track) return;

        let newPlayer = player;
        if (player) player.replace(track.url);
        else newPlayer = createAudioPlayer(track.url);

        playbackListener?.remove();

        const listener = newPlayer.addListener(
            "playbackStatusUpdate",
            status => {
                const duration = status.duration || track.duration || 0;
                const position = status.currentTime || 0;

                if (status.isLoaded && duration > 0)
                    newPlayer.updateLockScreenMetadata({
                        title: track.title,
                        artist: track?.artist?.split(",")?.[0],
                        artworkUrl: track.cover || track.artwork,
                        duration: duration
                    });

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

                    const state = get();
                    const controller =
                        state.playlistControllers[state.currentPlaylistId];

                    if (
                        controller &&
                        state.queue.length - state.currentTrackIndex <= 3 &&
                        controller.hasNextPage &&
                        !controller.isFetchingNextPage
                    ) {
                        controller.fetchNextPage();
                    }
                }
            }
        );

        newPlayer.play();

        if (!isActiveForLockScreen) {
            newPlayer.setActiveForLockScreen(true, {
                options: {
                    showSeekForward: true,
                    showSeekBackward: true
                }
            });
            set({ isActiveForLockScreen: true });
        }

        newPlayer.updateLockScreenMetadata({
            title: track.title,
            artist: track?.artist?.split(",")?.[0],
            artworkUrl: track.cover || track.artwork,
            duration: track?.duration ?? get().duration ?? 0
        });

        set({
            player: newPlayer,
            playbackListener: listener,
            currentTrackId: track._id || track.id,
            currentTrackIndex: index,
            currentTrack: track,
            isStopped: false
        });
    },

    next: async () => {
        const { currentTrackIndex, queue, repeatMode, playlistControllers, currentPlaylistId } = get();

        if (repeatMode === "one") {
            get().playByIndex(currentTrackIndex);
            return;
        }

        let nextIndex = currentTrackIndex + 1;
        const controller = playlistControllers[currentPlaylistId];

        if (nextIndex >= queue.length && controller && controller.hasNextPage) {
            const preFetchPlaylistId = currentPlaylistId;
            
            await controller.fetchNextPage();
            
            if (get().currentPlaylistId !== preFetchPlaylistId) return;

            const newQueue = get().queue;
            if (nextIndex < newQueue.length) {
                get().playByIndex(nextIndex);
            } else if (repeatMode === "queue") {
                get().playByIndex(0);
            }
            return;
        }

        if (nextIndex >= queue.length) {
            if (repeatMode === "queue") {
                get().playByIndex(0);
            }
            return;
        }

        get().playByIndex(nextIndex);

        if (
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
        isLocal = false
    }) => {
        const { currentPlaylistId, queue } = get();

        let tracks = tracksOverride;

        /*
         * 1. If explicitly playing a local/downloaded playlist,
         *    load songs from local metadata.
         */

        console.log(isLocal)
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
            const activeQueries = queryClient.getQueriesData({
                queryKey: [playlistId]
            });

            if (activeQueries && activeQueries.length > 0) {
                const [, lastQueryData] =
                    activeQueries[activeQueries.length - 1];

                tracks =
                    lastQueryData?.pages?.flatMap(page => page.musics) ?? [];
            }
        }

        /*
         * 3. Fallback to normal query cache.
         */
        if (!tracks || !tracks.length) {
            const data = queryClient.getQueryData([playlistId]);

            tracks = data?.pages?.flatMap(page => page.musics) ?? [];
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
            Boolean(tracksOverride) ||
            isLocal ||
            currentPlaylistId !== playlistId ||
            queue.length !== tracks.length;

        if (!shouldUpdateQueue && currentPlaylistId === playlistId) {
            const found = get().playByTrackId(trackId);

            if (found) return true;
        }

        /*
         * 6. Replace queue.
         */
        set({
            currentPlaylistId: playlistId,
            queue: tracks,
            currentTrackIndex: -1,
            currentTrackId: null
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
                set({ queue: newQueue, currentTrackIndex: -1 });
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
            progress: 0
        })
}));
