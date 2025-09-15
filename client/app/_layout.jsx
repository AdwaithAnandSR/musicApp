import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppStatus } from "../store/appState.store.js";

const Layout = () => {
    let isAuthenticated = useAppStatus(state => state.isAuthenticated);

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!isAuthenticated}>
                <Stack.Screen name="index" />
            </Stack.Protected>

            <Stack.Protected guard={isAuthenticated}>
                <Stack.Screen name="secure" />
            </Stack.Protected>
        </Stack>
    );
};

export default Layout;
