import { create } from "zustand";
import { createAudioPlayer } from "expo-audio";

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
                        duration: duration * 60
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
            artworkUrl: track.cover || track.artwork
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

    next: () => {
        const { currentTrackIndex, queue, repeatMode } = get();

        if (repeatMode === "one") {
            get().playByIndex(currentTrackIndex);
            return;
        }

        const nextIndex = currentTrackIndex + 1;

        if (nextIndex >= queue.length && repeatMode === "queue") {
            get().playByIndex(0);
            return;
        }

        get().playByIndex(nextIndex);

        const state = get();
        const controller = state.playlistControllers[state.currentPlaylistId];

        if (
            controller &&
            state.queue.length - state.currentTrackIndex <= 3 &&
            controller.hasNextPage &&
            !controller.isFetchingNextPage
        )
            controller.fetchNextPage();
    },

    prev: () => {
        const { currentTrackIndex } = get();
        get().playByIndex(currentTrackIndex - 1);
    },

    changePlaylistAndPlay: ({ playlistId, trackId }) => {
        const { currentPlaylistId } = get();

        if (currentPlaylistId === playlistId) {
            const found = get().playByTrackId(trackId);
            if (found) return;
        }

        const data = queryClient.getQueryData([playlistId]);
        const tracks = data?.pages?.flatMap(page => page.musics) ?? [];

        if (!tracks.length) return;

        set({
            currentPlaylistId: playlistId,
            queue: tracks,
            currentTrackIndex: -1,
            currentTrackId: null
        });

        get().playByTrackId(trackId);
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
                set({ queue: newQueue });
                get().playByIndex(nextIdx);
            } else {
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
