import { create } from "zustand";

export const useTrack = create(set => ({
    track: {},
    update: newTrack => {
        const index = useQueueManager
            .getState()
            .queue.findIndex(item => item._id === newTrack._id);
        useQueueManager.getState().updateCurrentIndex(index);
        set({ track: newTrack });
    }
}));

export const useQueueManager = create(set => ({
    queue: [],
    id: "HOME",
    currentIndex: 0,
    loadQueue: newQueue =>
        set(() => ({
            queue: newQueue
        })),
    updateQueue: newItems =>
        set(state => {
            const existingIds = new Set(state.queue.map(song => song._id));
            const filteredItems = newItems.filter(
                song => !existingIds.has(song._id)
            );
            return {
                queue: [...state.queue, ...filteredItems]
            };
        }),
    updateId: newId => set(() => ({ id: newId })),
    updateCurrentIndex: index => set(() => ({ currentIndex: index }))
}));

export const useAudioMonitor = create(set => ({
    isPlaying: false,
    isBuffering: false,
    currentTime: 0,
    duration: 0,

    updateStatus: ({ playing, buffering, currentTime, duration }) => {
        set({
            isPlaying: playing,
            isBuffering: buffering,
            currentTime,
            duration
        });
    }
}));
