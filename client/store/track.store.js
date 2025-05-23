import { create } from "zustand";

export const useTrack = create(set => ({
    track: {},
    update: newTrack => set(() => ({ track: newTrack }))
}));

export const useQueueManager = create(set => ({
    queue: [],
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
    id: "HOME",
    updateId: newId => set(() => ({ id: newId })),
    currentIndex: 0,
    updateCurrentIndex: index => set(() => ({ currentIndex: index }))
}));
