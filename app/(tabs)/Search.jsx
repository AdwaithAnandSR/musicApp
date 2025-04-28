import { View, Text, StyleSheet, TextInput, Dimensions } from "react-native";
import React, { useState } from "react";
import { FlashList } from "@shopify/flash-list";
import ListItem from "../../components/ListItem.jsx";

import useSearch from "../../hooks/useSearch.js";
import { useEffect } from "react";

const { height: vh, width: vw } = Dimensions.get("window");

const Search = () => {
   const [text, setText] = useState();
   const { songs, setSongs } = useSearch({ text });

   return (
      <View style={styles.container}>
         <View>
            <TextInput
               style={styles.searchInput}
               placeholder="Search Song"
               placeholderTextColor="white"
               value={text}
               onChangeText={txt => setText(txt)}
            />
            <Text>Search</Text>
         </View>
         <FlashList
            data={songs}
            estimatedItemSize={vh * 0.95 || 100}
            renderItem={({ item }) => <ListItem item={item} />}
         />
      </View>
   );
};

const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: "black",
      position: "relative",
      top: 0
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
   }
});

export default Search;
