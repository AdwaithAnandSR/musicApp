import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";

import { storage, userId } from "../services/storage.js";
import { useAppStatus } from '../store/appState.store.js'
import fetchUser from "../controllers/auth/checkIsAuth.js"

const generateId = () => {
    return (
        "id-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).substr(2, 9)
    );
};


const Index = () => {
    let id;
    const setIsAuthenticated = useAppStatus(state=> state.setIsAuthenticated)

    if (!userId || userId?.trim() === "") {
        id = generateId();
        storage.set("userId", id);
    } else id = userId;

    
    
    useEffect(() => {
        const interval = setInterval(function() {
            if (id) fetchUser(id, setIsAuthenticated);
        }, 10000);
        return () => clearInterval(interval);
    }, [id]);
    

    return (
        <View style={styles.container}>
            <Text adjustsFontSizeToFit numberOfLines={1} style={styles.text}>
                {id}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "black"
    },
    text: {
        color: "#f9c1e9",
        width: "85%",
        fontSize: 60,
        fontWeight: "bold"
    }
});

export default Index;
