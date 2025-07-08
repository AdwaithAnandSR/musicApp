import { Stack, Tabs } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppStatus } from "../store/appState.store.js";

const Layout = () => {
    const isAuthenticated = useAppStatus(state => state.isAuthenticated);
    
    return (
        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor: "black"
            }}
        >
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Protected guard={!isAuthenticated}>
                    <Stack.Screen name="index" />
                </Stack.Protected>

                <Stack.Protected guard={isAuthenticated}>
                    <Stack.Screen name="secure" />
                </Stack.Protected>
            </Stack>
        </SafeAreaView>
    );
};

export default Layout;
