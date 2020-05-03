const path = require("path");
const fs = require("fs");
const AWS = require("aws-sdk");
const imagemin = require("imagemin");
const imageminMozjpeg = require("imagemin-mozjpeg");
const imageminPngquant = require("imagemin-pngquant");
const imageminSvgo = require("imagemin-svgo");


exports.uploadImage = async (req, res) => {
    const { fileName, fileType } = req.query;
    
    if (!isSupportingFiletype(fileType)) {
        console.warn(`Filetype ${fileType} is not supported.`);
        return res.status(400).send(`Filetype ${fileType} is not supported.`);
    }

    console.info(`About to save new image with name ${fileName} and type ${fileType}`);

    try {
        let buffer = await readStream(req);
        buffer = await compressImage(buffer);

        let filePath;
        if (process.env.NODE_ENV === "development") {
            filePath = await storeImageLocally(fileName, buffer)
        }
        else if (process.env.NODE_ENV === "production") {
            filePath = await storeImageRemotely(fileName, buffer);
        }
        else {
            console.warn(`Environment ${process.env.NODE_ENV} is not known. Image cannot be safed.`);
            return res.status(500).send(`Environment ${process.env.NODE_ENV} is not known. Image cannot be safed.`);
        }

        const body = {
            url: filePath
        }
        return res.status(201).json(body);
    }
    catch (err) {
        return res.status(500).send(err);
    }
}

const isSupportingFiletype = (filetype) => filetype === "image/jpeg" || filetype === "image/png" || filetype === "image/svg xml";

const readStream = (readableStream) => new Promise((resolve, reject) => {
    let chunks = [];
    readableStream.on("error", err => reject(err));
    readableStream.on("end", () => resolve(Buffer.concat(chunks)));
    readableStream.on("readable", () => {
        while (null !== (chunk = readableStream.read())) {
            chunks.push(chunk);
        }
    });
}) 


const compressImage = async (buffer) => await imagemin.buffer(buffer, {
        plugins: [
            imageminMozjpeg({
                quality: 0.5
            }),
            imageminPngquant({
                quality: [0.5, 1]
            }),
            imageminSvgo(),            
        ]
    })

const storeImageLocally = async (filename, buffer) => {
        const localFilepath = getLocalFilepath(filename);
        const fd = fs.openSync(localFilepath, "w");
        const bytesWritten = fs.writeSync(fd, buffer);
        console.info(`Successfully wrote ${bytesWritten} to the local file system`);
        return getRemoteFilepath(filename);
}

const getLocalFilepath = filename => {
    return path.resolve(__dirname, "..", "..", "public", "image-uploads", filename);
}


const getRemoteFilepath = filename => {
    return `${process.env.PROTOCOL}://${process.env.DOMAIN}:${process.env.PORT}/image-uploads/${filename}`;
}

const storeImageRemotely = (filename, buffer) => {
    return new Promise((resolve, reject) => {
        const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `image-uploads/${filename}`,
            Body: buffer,
            ContentType: "application/octet-stream"
        }
        s3.upload(params, (err, data) => {
            if (err) reject(err);
            console.info("Successfully uploaded image");
            resolve(data.Location);
        })
    })
}