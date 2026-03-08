import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Linking } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";

import { useAppStatus } from "@store/appState.store.js";
import queryClient from "@services/queryClient.js";

const Layout = () => {
    let isAuthenticated = useAppStatus(state => state.isAuthenticated);
    const navigation = useNavigation();

    useEffect(() => {
        const handleDeepLink = ({ url }) => {
            if (url === "music://notification.click") {
                router.push("secure/TrackControllerFullView");
            } else if (url === "trackplayer://notification.click") {
                router.push("secure/TrackControllerFullView");
            }
        };

        const subscription = Linking.addEventListener("url", handleDeepLink);

        Linking.getInitialURL().then(url => {
            if (url === "music://notification.click") {
                router.push("secure/TrackControllerFullView");
            } else if (url === "trackplayer://notification.click") {
                router.push("secure/TrackControllerFullView");
            }
        });

        return () => subscription.remove();
    }, [navigation]);

    return (
        <QueryClientProvider client={queryClient}>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Protected guard={!isAuthenticated}>
                        <Stack.Screen name="index" />
                    </Stack.Protected>

                    <Stack.Protected guard={isAuthenticated}>
                        <Stack.Screen name="secure" />
                    </Stack.Protected>
                </Stack>
        </QueryClientProvider>
    );
};

export default Layout;
