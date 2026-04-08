import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";

import { useAppStatus } from "@store/appState.store.js";
import queryClient from "@services/queryClient.js";

import checkIsAuth from "@controllers/auth/checkIsAuth";

const Layout = () => {
    const isAuthenticated = useAppStatus(state => state.user?.isVerified);
    const usr = useAppStatus(state => state.user);

    useEffect(() => {
        const verify = async () => {
            const valid = await checkIsAuth();
        };
        verify();
    }, [1]);

    return (
        <QueryClientProvider client={queryClient}>
            <Stack screenOptions={{ headerShown: false }}>
                {/* Unauthenticated: splash check + login/register */}
                <Stack.Protected guard={!isAuthenticated}>
                    <Stack.Screen name="index" />
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
