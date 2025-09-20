import {
    View,
    StyleSheet,
    Text,
    Dimensions,
    TouchableOpacity
} from "react-native";

import { useAppStatus } from "../../store/appState.store.js";
import { usePlayerStore } from "../../store/player.store.js";

const { width: vw, height: vh } = Dimensions.get("window");
const setTimer = usePlayerStore.getState().setTimer;
const toggleTimerSelect = useAppStatus.getState().toggleTimerSelect;

const handleSetTimer = ms => {
    const now = new Date();
    const target = new Date(now.getTime() + ms);

    const hours = target.getHours().toString().padStart(2, "0");
    const minutes = target.getMinutes().toString().padStart(2, "0");

    setTimer(target.getTime());
    toggleTimerSelect();
};

const WheelPicker = () => {
    const isTimerSelecting = useAppStatus(state => state.isTimerSelecting);
    if (!isTimerSelecting) return null;

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={() => handleSetTimer(5 * 60 * 1000)}>
                <Text style={styles.timeText}>5 min</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleSetTimer(10 * 60 * 1000)}>
                <Text style={styles.timeText}>10 min</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleSetTimer(30 * 60 * 1000)}>
                <Text style={styles.timeText}>30 min</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleSetTimer(60 * 60 * 1000)}>
                <Text style={styles.timeText}>60 min</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => handleSetTimer(2 * 60 * 60 * 1000)}
            >
                <Text style={styles.timeText}>2 hr</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => handleSetTimer(5 * 60 * 60 * 1000)}
            >
                <Text style={styles.timeText}>5 hr</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => handleSetTimer(10 * 60 * 60 * 1000)}
            >
                <Text style={styles.timeText}>10 hr</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#000000df",
        borderColor: "#323232",
        borderWidth: 1,
        minWidth: vw * 0.4,
        maxWidth: vw * 0.7,
        borderRadius: 23,
        position: "absolute",
        bottom: 70 - vh * 0.01,
        right: (vw * 0.1) / 2,
        zIndex: 999,
        overflow: "hidden",
        gap: 5,
        paddingVertical: 5
    },
    timeText: {
        fontSize: 25,
        fontWeight: "bold",
        color: "white",
        paddingHorizontal: 10,
        textAlign: "center"
    }
});

export default WheelPicker;
