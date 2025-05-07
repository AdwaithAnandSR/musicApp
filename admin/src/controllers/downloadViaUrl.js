import axios from "axios";
import Constants from 'expo-constants';

// const api = "http://100.68.138.107:5000";
// const api = "https://vivid-music.vercel.app"
// const api = Constants.expoConfig.extra.adminApi
const api = "https://musicapp-server.up.railway.app"

const downloadViaUrl = async url => {
    try {
        console.log(api);
        const res = await axios.post(`${api}/admin/saveToCloud`, { url });

        console.log(res.data);
    } catch (error) {
        console.log(error.message);
        console.log(error.response);
    }
};

export default downloadViaUrl;
