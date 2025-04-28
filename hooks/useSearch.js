import { useEffect, useState } from "react";
import Constants from "expo-constants";
import axios from "axios";

const api = Constants.expoConfig.extra.clientApi;

const useSearch = ({ text, setList }) => {
   const [songs, setSongs] = useState([]);

   const fetchSongs = async () => {
      console.log("hu");
      const res = await axios.post(`${api}/searchSong`, { text });
      console.log(res.data);
      if (res?.data?.songs?.length > 0) setSongs(res?.data?.songs);
   };

   useEffect(() => {
      const timeout = setTimeout(() => {
         if (!text || text.trim() == "") setSongs([]);
         else fetchSongs();
      }, 500);
      console.log(text);

      return () => clearTimeout(timeout);
   }, [text]);

   return { songs, setSongs };
};

export default useSearch;
