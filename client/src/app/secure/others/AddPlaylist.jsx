import { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TextInput,
    TouchableOpacity
} from "react-native";
import { Entypo } from "@expo/vector-icons";
import { router } from "expo-router";

import handleCreatePlaylist from "../../../controllers/playlists/handleCreatePlaylist.js";

const { height: vh, width: vw } = Dimensions.get("window");

const AddPlaylist = () => {
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [message, setMessage] = useState("");

    return (
        <View style={styles.container}>
            {/* Navbar */}
            <View style={styles.nav}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Entypo name="chevron-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>AddPlaylist</Text>
            </View>
            {/* Body */}

            <View style={styles.body}>
                <View style={styles.inputContainer}>
                    <TextInput
                        placeholder={"Playlist Name"}
                        placeholderTextColor={"#ffffff9c"}
                        style={styles.input}
                        value={name}
                        onChangeText={txt => setName(txt)}
                    />
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        placeholder={"Description"}
                        placeholderTextColor={"#ffffff9c"}
                        style={styles.input}
                        value={desc}
                        onChangeText={txt => setDesc(txt)}
                    />
                </View>
                <TouchableOpacity
                    onPress={() =>
                        handleCreatePlaylist(
                            name,
                            desc,
                            setMessage,
                            
                        )
                    }
                    style={styles.btn}
                >
                    <Text style={styles.text}>Create</Text>
                </TouchableOpacity>

                <Text style={styles.message}>{message}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "black"
    },
    nav: {
        width: "100%",
        height: vh * 0.08,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: vw * 0.01,
        paddingLeft: vw * 0.03,
        marginTop: vh * 0.02
    },
    headerText: {
        color: "white",
        fontWeight: "bold",
        fontSize: vw * 0.06
    },
    body: {
        width: "100%",
        height: vh * 0.5,
        alignItems: "center",
        paddingTop: vh * 0.05,
        gap: vh * 0.02
    },
    inputContainer: {
        width: "90%",
        height: "15%",
        borderRadius: vw * 0.05,
        borderWidth: 1,
        overflow: "hidden",
        borderColor: "white"
    },
    input: {
        flex: 1,
        paddingHorizontal: 15,
        color: "white",
        fontSize: vw * 0.04
    },
    btn: {
        width: "90%",
        height: "15%",
        borderRadius: vw * 0.08,
        backgroundColor: "rgb(246,7,135)",
        justifyContent: "center",
        alignItems: "center",
        marginTop: vh * 0.03
    },
    text: {
        color: "white",
        fontSize: vw * 0.06,
        fontWeight: "bold"
    },
    message: {
        color: "white",
        fontSize: vw * 0.03,
        textAlign: "center"
    }
});

export default AddPlaylist;
