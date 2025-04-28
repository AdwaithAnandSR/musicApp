import { useTrack } from "../context/track.context.js";

const jump = async item => {
    console.log(item);
    const { setTrack, play } = useTrack();
    console.log("item");
    
    setTrack(item)
    play()
};

export default jump;
