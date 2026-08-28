import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect } from 'expo-router';

import Header from "@components/ListHeader.jsx";
import ListItem from "@components/playlists/ListItem.jsx";
import { getDownloadedPlaylists } from "@services/downloads/downloadService.js";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);
const HEADER_HEIGHT = 250;

const DownloadedPlaylists = () => {
    const [scrollY] = useState(() => new Animated.Value(0));
    const [playlists, setPlaylists] = useState([]);

    useFocusEffect(
        useCallback(() => {
            let isMounted = true;
            const loadPlaylists = async () => {
                const fetchedPlaylists = await getDownloadedPlaylists();
                if (isMounted) {
                    setPlaylists(fetchedPlaylists.map(p => ({ ...p, _id: p.id, isLocalFolder: true })));
                }
            };
            loadPlaylists();
            const interval = setInterval(loadPlaylists, 2000); // Polling for real-time updates
            return () => {
                isMounted = false;
                clearInterval(interval);
            };
        }, [])
    );

    const totalBytes = playlists.reduce((acc, p) => acc + (p.sizeBytes || 0), 0);
    let formattedSpace = "";
    if (totalBytes > 0) {
        if (totalBytes > 1024 * 1024 * 1024) {
            formattedSpace = (totalBytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
        } else {
            formattedSpace = (totalBytes / (1024 * 1024)).toFixed(0) + " MB";
        }
    }

    return (
        <View style={styles.container}>
            <Header
                title="Downloads"
                scrollY={scrollY}
                containerStyles={{ height: HEADER_HEIGHT }}
                total={formattedSpace ? `Space used: ${formattedSpace}` : " "}
            />
            
            <AnimatedFlashList
                data={playlists}
                renderItem={({ item }) => <ListItem item={item} local={true} />}
                estimatedItemSize={70}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No downloaded playlists.</Text>
                }
                contentContainerStyle={{
                    paddingTop: HEADER_HEIGHT,
                    paddingBottom: 150
                }}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black'
    },
    emptyText: {
        color: 'white',
        textAlign: 'center',
        marginTop: 20
    }
});

export default DownloadedPlaylists;
