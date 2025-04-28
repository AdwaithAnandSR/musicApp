import TrackPlayer from "react-native-track-player";

const jump = async (item)=> {
   const q = await TrackPlayer.getQueue()
   const index = q.findIndex(elem=> elem._id === item._id)
   
   if(index > -1) {
      await TrackPlayer.skip(index)
      await TrackPlayer.play()
   }
}

export default jump