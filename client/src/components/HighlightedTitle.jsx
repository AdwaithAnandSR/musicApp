import { Text, Dimensions, StyleSheet } from "react-native";

const { width: vw } = Dimensions.get("window");

const HighlightedText = ({ title, search = "", isCurrent }) => {
    const cleanSearch = (search || "").trim();
    if (cleanSearch === "")
        return (
            <Text
                numberOfLines={2}
                style={[
                    styles.title,
                    { color: isCurrent ? "rgb(246,7,135)" : "white" }
                ]}
            >
                {title}
            </Text>
        );

    const regex = new RegExp(`(${cleanSearch})`, "gi");
    const parts = title.split(regex);

    return (
        <Text
            numberOfLines={2}
            style={[
                styles.title,
                { color: isCurrent ? "rgb(246,7,135)" : "white" }
            ]}
        >
            {parts.map((part, index) =>
                part.toLowerCase() === cleanSearch.toLowerCase() ? (
                    <Text
                        key={index}
                        style={[styles.title, { color: "rgb(246,7,135)" }]}
                    >
                        {part}
                    </Text>
                ) : (
                    <Text key={index}>{part}</Text>
                )
            )}
        </Text>
    );
};

const styles = StyleSheet.create({
    title: {
        color: "white",
        width: vw * 0.7,
        fontWeight: "bold",
        paddingRight: 8
    }
});

export default HighlightedText;
