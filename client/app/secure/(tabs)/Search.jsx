import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, TextInput, Dimensions } from "react-native";
import { FlashList } from "@shopify/flash-list";

import ListItem from "../../../components/ListItem.jsx";
import handleSearch from "../../../controllers/search.controller.js";

const { height: vh, width: vw } = Dimensions.get("window");

const Search = () => {
    const [text, setText] = useState("");
    const [songs, setSongs] = useState([]);
    const [loading, setLoading] = useState(false);
    const typingTimeout = useRef(null);

    const handleChangeText = text => {
        setText(text);
        setLoading(true);

        if (text.trim() == "") {
            setSongs([]);
            setLoading(false);
        }

        if (typingTimeout.current) clearTimeout(typingTimeout.current);

        typingTimeout.current = setTimeout(async () => {
            const result = await handleSearch(text);
            if (text.trim() != "") setSongs(result);
            setLoading(false);
        }, 500);
    };

    return (
        <View style={styles.container}>
            <View>
                <View>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search Song"
                        placeholderTextColor="white"
                        value={text}
                        returnKeyType="search"
                        onSubmitEditing={async () => {
                            setSongs(await handleSearch(text));
                        }} 
                        onChangeText={handleChangeText}
                    />
                    <Text>Search</Text>
                </View>
                <Text></Text>
                {loading ? (
                    <Text style={styles.loading}>Loading...</Text>
                ) : text?.trim() !== "" && songs?.length === 0 ? (
                    <Text style={styles.loading}>"No Songs Found!"</Text>
                ) : null}
            </View>

            <FlashList
                data={songs}
                estimatedItemSize={vh * 0.95 || 100}
                renderItem={({ item }) => (
                    <ListItem
                        LoadQueue={songs}
                        ID={"SEARCH"}
                        item={item}
                        text={text}
                    />
                )}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingTop: 10, paddingBottom: 150 }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "black",
        position: "relative",
        top: 0,
        paddingTop: 25
    },
    searchInput: {
        width: vw * 0.9,
        height: vh * 0.05,
        color: "white",
        fontWeight: 900,
        backgroundColor: "rgb(66, 66, 66)",
        borderRadius: vw * 0.04,
        fontSize: 17,
        paddingHorizontal: vw * 0.03,
        marginHorizontal: "auto",
        marginTop: vh * 0.01
    },
    loading: {
        color: "#fac3ec",
        fontWeight: 900,
        textAlign: "center"
    }
});

export default Search;
