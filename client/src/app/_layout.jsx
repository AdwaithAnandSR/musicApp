import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";

import { useAppStatus } from "@store/appState.store.js";
import queryClient from "@services/queryClient.js";

import checkIsAuth from "@controllers/auth/checkIsAuth";

const Layout = () => {
    const isAuthenticated = useAppStatus(state => state.isAuthenticated);
    const setIsAuthenticated = useAppStatus(state => state.setIsAuthenticated);
    const navigation = useNavigation();

    useEffect(() => {
        const handleDeepLink = ({ url }) => {
            if (
                url === "music://notification.click" ||
                url === "trackplayer://notification.click"
            ) {
                router.push("secure/TrackControllerFullView");
            }
        };

        const subscription = Linking.addEventListener("url", handleDeepLink);

        Linking.getInitialURL().then(url => {
            if (
                url === "music://notification.click" ||
                url === "trackplayer://notification.click"
            ) {
                router.push("secure/TrackControllerFullView");
            }
        });

        return () => subscription.remove();
    }, [navigation]);

    useEffect(() => {
        const verify = async () => {
            const valid = await checkIsAuth(setIsAuthenticated);
        };
        verify();
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <Stack screenOptions={{ headerShown: false }}>
                {/* Unauthenticated: splash check + login/register */}
                <Stack.Protected guard={!isAuthenticated}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="Auth" />
                </Stack.Protected>

                {/* Authenticated: main app */}
                <Stack.Protected guard={isAuthenticated}>
                    <Stack.Screen name="secure" />
                </Stack.Protected>
            </Stack>
        </QueryClientProvider>
    );
};

export default Layout;
