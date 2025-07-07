import { Stack, Tabs } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";


const isLoggedIn = true;


const Layout = () => {
    return (
        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor: "black"
            }}
        >

            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Protected guard={!isLoggedIn}>
                    <Stack.Screen name="index" />
                </Stack.Protected>

                <Stack.Protected guard={isLoggedIn}>
                    <Stack.Screen name="secure" />
                </Stack.Protected>
            </Stack>
        </SafeAreaView>
    );
};

export default Layout;
