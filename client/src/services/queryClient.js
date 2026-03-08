import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            staleTime: 1000 * 60 * 5 // 5 minutes
        }
    }
});

// queryClient.getQueryCache().subscribe(event => {
//     if (event.type !== "updated") return;

//     const { currentPlaylistId } = usePlayer.getState();
//     if (event.query.queryKey[0] !== currentPlaylistId) return;

//     const pages = event.query.state.data?.pages;
//     if (!pages) return;

//     const lastPage = pages[pages.length - 1];
//     console.log("automatic queue append: ", lastPage);
//     usePlayer.getState().appendToQueue(lastPage.songs);
// });

export default queryClient;
