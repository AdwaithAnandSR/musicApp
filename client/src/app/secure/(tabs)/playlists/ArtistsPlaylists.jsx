import { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
    Host,
    LoadingIndicator as Loader,
    DockedSearchBar,
    SearchBar,
    Text as ComposeText
} from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";

import ListItem from "@components/playlists/ListItem.jsx";
import Header from "@components/ListHeader.jsx";

import { fetchArtists } from "@controllers/playlists/fetch";

import queryClient from "@services/queryClient";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);
const HEADER_HEIGHT = 200;

const ArtistsPlaylists = () => {
    const [scrollY] = useState(() => new Animated.Value(0));
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const searchTimeout = useRef(null);

    const hasUserScrolled = useRef(false);
    const scrollOffsetY = useRef(0);
    const onEndReachedCalledDuringMomentum = useRef(false);

    const onScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        {
            useNativeDriver: true,
            listener: (event) => {
                const y = event?.nativeEvent?.contentOffset?.y ?? 0;
                scrollOffsetY.current = y;
                if (y > 20) {
                    hasUserScrolled.current = true;
                }
            }
        }
    );

    const handleScrollBeginDrag = () => {
        hasUserScrolled.current = true;
        onEndReachedCalledDuringMomentum.current = false;
    };

    const handleMomentumScrollBegin = () => {
        onEndReachedCalledDuringMomentum.current = false;
    };

    const handleSearchChange = (query) => {
        const text = typeof query === "string" ? query : "";
        setSearchQuery(text);
        hasUserScrolled.current = false;
        scrollOffsetY.current = 0;
        onEndReachedCalledDuringMomentum.current = false;
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (!text.trim()) {
            setDebouncedSearch("");
        } else {
            searchTimeout.current = setTimeout(() => {
                setDebouncedSearch(text.trim());
            }, 300);
        }
    };

    useEffect(() => {
        hasUserScrolled.current = false;
        scrollOffsetY.current = 0;
        onEndReachedCalledDuringMomentum.current = false;
    }, [debouncedSearch]);

    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch,
        isFetching
    } = useInfiniteQuery({
        queryKey: ["artists_playlists", debouncedSearch],
        queryFn: ({ pageParam = 1 }) =>
            fetchArtists({ pageParam, search: debouncedSearch }),
        getNextPageParam: (lastPage, allPages) => {
            // If the last page returned fewer than 20 items, there are no more pages
            if (!lastPage?.playlists || lastPage.playlists.length < 20) {
                return undefined;
            }

            // If a search query is active
            if (debouncedSearch.trim()) {
                const isServerFiltered = lastPage.playlists.every((p) =>
                    p.name?.toLowerCase().includes(debouncedSearch.trim().toLowerCase())
                );
                // If the server returned unfiltered results and we already found matching items, stop paginating
                if (!isServerFiltered) {
                    const allMatches = (allPages || [])
                        .flatMap((p) => p.playlists || [])
                        .filter((item) =>
                            item.name?.toLowerCase().includes(debouncedSearch.trim().toLowerCase())
                        );
                    if (allMatches.length > 0) {
                        return undefined;
                    }
                }
            }

            return lastPage.nextPage ?? undefined;
        }
    });

    useEffect(() => {
        if (!isFetchingNextPage) {
            onEndReachedCalledDuringMomentum.current = false;
        }
    }, [isFetchingNextPage]);

    const rawPlaylists = data?.pages.flatMap((page) => page.playlists) || [];
    const playlists = debouncedSearch.trim()
        ? rawPlaylists.filter((p) =>
              p.name?.toLowerCase().includes(debouncedSearch.trim().toLowerCase())
          )
        : rawPlaylists;

    const handleRefresh = () => {
        hasUserScrolled.current = false;
        scrollOffsetY.current = 0;
        onEndReachedCalledDuringMomentum.current = false;
        queryClient.resetQueries({ queryKey: ["artists_playlists"] });
        refetch();
    };

    const handleEndReached = () => {
        // Load next page ONLY when needed:
        // 1. User must have actively scrolled down (never on initial layout / mount)
        // 2. Scroll offset must be past the header threshold
        // 3. Must not be already triggered during momentum
        // 4. Must actually have a next page
        // 5. Must not already be fetching
        // 6. The list must have more than 1 item (a 1-item or empty list fits on screen without pagination)
        if (
            !hasUserScrolled.current ||
            scrollOffsetY.current <= 20 ||
            onEndReachedCalledDuringMomentum.current ||
            !hasNextPage ||
            isFetchingNextPage ||
            isLoading ||
            isFetching ||
            playlists.length <= 1
        ) {
            return;
        }

        onEndReachedCalledDuringMomentum.current = true;
        fetchNextPage();
    };

    const renderItem = ({ item, index }) => {
        return <ListItem item={item} index={index} scrollY={scrollY} />;
    };

    return (
        <View style={styles.container}>
            <Header
                title="Artists"
                scrollY={scrollY}
                containerStyles={{ height: HEADER_HEIGHT }}
            />

            <AnimatedFlashList
                data={playlists}
                keyExtractor={(item, index) => item._id || String(index)}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={styles.searchContainer}>
                        <Host
                            colorScheme="dark"
                            matchContents={{ vertical: true }}
                            style={styles.searchHost}
                        >
                            <DockedSearchBar
                                onQueryChange={handleSearchChange}
                                modifiers={[fillMaxWidth()]}
                            >
                                <DockedSearchBar.Placeholder>
                                    <ComposeText color="#8e8e93">
                                        Search artist name...
                                    </ComposeText>
                                </DockedSearchBar.Placeholder>
                            </DockedSearchBar>
                        </Host>
                    </View>
                }
                ListEmptyComponent={
                    isLoading ? (
                        <Host matchContents style={{ alignSelf: "center" }}>
                            <Loader />
                        </Host>
                    ) : (
                        <Text
                            style={{
                                color: "white",
                                textAlign: "center",
                                marginTop: 20
                            }}
                        >
                            {debouncedSearch
                                ? `No artists found for "${debouncedSearch}".`
                                : "No artists found."}
                        </Text>
                    )
                }
                ListFooterComponent={
                    isFetchingNextPage && playlists.length > 1 ? (
                        <Host matchContents style={{ alignSelf: "center", marginVertical: 10 }}>
                            <Loader />
                        </Host>
                    ) : null
                }
                contentContainerStyle={{
                    paddingTop: HEADER_HEIGHT,
                    paddingBottom: 20
                }}
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.2}
                onScroll={onScroll}
                onScrollBeginDrag={handleScrollBeginDrag}
                onMomentumScrollBegin={handleMomentumScrollBegin}
                scrollEventThrottle={16}
                refreshing={isFetching && !isFetchingNextPage && !isLoading}
                onRefresh={handleRefresh}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "black"
    },
    searchContainer: {
        width: "100%",
        paddingHorizontal: 16,
        paddingBottom: 10
    },
    searchHost: {
        width: "100%"
    }
});

export default ArtistsPlaylists;
