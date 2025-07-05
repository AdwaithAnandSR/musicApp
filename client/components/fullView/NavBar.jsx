import {
    View,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Text
} from "react-native";
import { Entypo, Feather } from "@expo/vector-icons";
import { router } from "expo-router";

const { height: vh, width: vw } = Dimensions.get("window");

const activeLyricColor = "rgb(246,7,135)";

const NavBar = () => {
    return (
        <View style={styles.navbar}>
            <View style={styles.right}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Entypo name="chevron-down" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity>
                    <Entypo
                        name="dots-three-vertical"
                        size={24}
                        color="white"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    navbar: {
        width: "100%",
        height: "10%",
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "flex-end",
        paddingHorizontal: vw * 0.05
    },
    right: {
        flexDirection: "row",
        alignItems: "center",
        gap: vw * 0.05
    },
    left: {
        flexDirection: "row",
        alignItems: "center",
        gap: vw * 0.05
    },
    options: {
        paddingHorizontal: vw * 0.02,
        paddingVertical: vh * 0.004,
        borderWidth: 1,
        borderRadius: 22,
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        maxWidth: 120,
        overflow: "hidden",
        borderColor: activeLyricColor
    },
    optionsText: {
        color: activeLyricColor,
        maxWidth: "90%",
        fontSize: 11,
        fontWeight: 600
    }
});

export default NavBar;
