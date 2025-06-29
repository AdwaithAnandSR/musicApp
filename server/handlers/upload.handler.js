// import NodeID3 from "node-id3";
// import admin from "firebase-admin";
// import { v4 as uuidv4 } from "uuid";
// import serviceAccount from "../keys/serviceKey.js";

// import { getIo } from "../config/socket.config.js";
// import musicModel from "../models/musics.js";

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     storageBucket: "gs://vividmusic-d6d28.appspot.com"
// });
// const bucket = admin.storage().bucket();

// const io = getIo();

// const handleUpload = async (files, res) => {
//     try {
//         io.emit("fileSize", files.length);
//         const filesLength = files.length;
//         let position = 1;

//         for (const file of files) {
//             io.emit("currentUploading", { name: file.originalname, position });

//             try {
//                 const fileName = `songs/${uuidv4()}_${file.originalname}`;
//                 const fileUpload = bucket.file(fileName);

//                 await fileUpload.save(file.buffer, {
//                     metadata: { contentType: file.mimetype }
//                 });

//                 const [url] = await fileUpload.getSignedUrl({
//                     action: "read",
//                     expires: "03-09-9999"
//                 });

//                 const tags = NodeID3.read(file.buffer);
//                 let imageUrl = null;

//                 if (tags?.image?.imageBuffer) {
//                     const imageName = `covers/${uuidv4()}_${file.originalname}`;
//                     const imageUpload = bucket.file(imageName);

//                     await imageUpload.save(tags.image.imageBuffer, {
//                         metadata: { contentType: tags.image.mime }
//                     });

//                     [imageUrl] = await imageUpload.getSignedUrl({
//                         action: "read",
//                         expires: "03-09-9999"
//                     });
//                 }

//                 try {
//                     await musicModel.create({
//                         cover: imageUrl || null,
//                         url,
//                         title:
//                             tags.title ||
//                             file.originalname
//                                 .split(".")
//                                 .slice(0, -1)
//                                 .join(".") ||
//                             "Unknown Title"
//                     });
//                 } catch (error) {
//                     console.error(
//                         `Error adding song ${
//                             tags.title || file.originalname
//                         } to MongoDB:`,
//                         error
//                     );
//                 }
//             } catch (error) {
//                 console.error(
//                     `Error processing file ${file.originalname}:`,
//                     error
//                 );
//                 io.emit("uploadError", {
//                     song: file.originalname,
//                     error: error.message
//                 });
//             }
//             position++;
//         }

//         io.emit("uploadingFinished");
//     } catch (error) {
//         console.error("Error uploading files:", error);
//     }
// };

// export { handleUpload, bucket };
