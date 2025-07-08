import Constants from "expo-constants";
import axios from "axios";

let api = Constants.expoConfig.extra.clientApi;


const search = async text => {
    try {
        if (text.trim() === "") return;
        const res = await axios.post(`${api}/searchSong`, {
            text: text.trim()
        });
        if (res?.data?.songs?.length > 0) return res?.data?.songs;
        else return [];
    } catch (err) {
        console.log(err);
    }
};

export default search;
