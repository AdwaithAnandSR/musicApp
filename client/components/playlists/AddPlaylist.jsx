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

import handleCreatePlaylist from "../../controllers/handleCreatePlaylist.js";

const { height: vh, width: vw } = Dimensions.get("window");

const AddPlaylist = ({ setIsAddNewPlaylist }) => {
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [message, setMessage] = useState("");

    return (
        <View style={styles.container}>
            <View style={styles.inner}>
                <TouchableOpacity
                    onPress={() => setIsAddNewPlaylist(false)}
                    style={styles.cancel}
                >
                    <Entypo name="cross" size={26} color="white" />
                </TouchableOpacity>

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
                            setIsAddNewPlaylist
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
        justifyContent: "center",
        alignItems: "center",
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
        backgroundColor: '#000000d5',
    },
    inner: {
        height: vh * 0.4,
        width: vw * 0.85,
        borderRadius: vw * 0.05,
        alignItems: "center",
        borderColor: "rgb(246,7,135)",
        borderWidth: 1,
        gap: vh * 0.02,
        overflow: "hidden"
    },
    cancel: {
        marginTop: vh * 0.013,
        marginBottom: vh * 0.02,
        alignSelf: "flex-end",
        marginHorizontal: vw * 0.03
    },
    inputContainer: {
        width: "90%",
        height: "15%",
        borderRadius: vw * 0.05,
        borderWidth: 1,
        borderColor: "white",
        overflow: "hidden"
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
