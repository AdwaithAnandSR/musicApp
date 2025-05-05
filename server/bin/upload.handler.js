

const handleUpload = async (files, res) => {
   try {
      filesLength = files.length;
      currentLength = filesLength;

      for (const file of files) {
         if (typeof handleItemUploadStarted == "function")
            handleItemUploadStarted(file.originalname);

         const tags = NodeID3.read(file.buffer);

         const fileName = `songs/${uuidv4()}_${file.originalname}`;
         const fileUpload = bucket.file(fileName);

         await fileUpload.save(file.buffer, {
            metadata: { contentType: file.mimetype }
         });

         const [url] = await fileUpload.getSignedUrl({
            action: "read",
            expires: "03-09-9999"
         });

         if (tags?.image?.imageBuffer) {
            const imageName = `covers/${uuidv4()}_${file.originalname}`;
            const imageUpload = bucket.file(imageName);

            // Upload the image file
            await imageUpload.save(tags.image.imageBuffer, {
               metadata: { contentType: tags.image.mime }
            });

            const [imageUrl] = await imageUpload.getSignedUrl({
               action: "read",
               expires: "03-09-9999"
            });

            dets = {
               cover: imageUrl,
               url,
               title: tags.title
            };
            await musicModel.create(dets);
         }
         currentLength--;
      }

      res.status(200).json({
         message: "Songs added successfully"
      });

      filesLength = 0;
   } 