import { v2 as cloudinary } from "cloudinary";
cloudinary.config({ cloud_name: "fake1", api_key: "fake1", api_secret: "fake1" });
try {
  await cloudinary.uploader.upload("test.mp4", { cloud_name: "fake2", api_key: "fake2", api_secret: "fake2" });
} catch (e) {
  console.log(e.message);
}
