const path = require("path");
const fs = require("fs");
const AWS = require("aws-sdk");
const imagemin = require("imagemin");
const imageminMozjpeg = require("imagemin-mozjpeg");
const imageminPngquant = require("imagemin-pngquant");
const imageminSvgo = require("imagemin-svgo");


exports.uploadImage = async (req, res) => {
    const { filename: fileName } = req.query;
    const contentType = req.get("Content-Type");

    if (!isSupportingContentType(contentType)) {
        console.warn(`Content-Type ${contentType} is not supported.`);
        return res.status(400).send(`Content-Type ${contentType} is not supported.`);
    }

    console.info(`About to save new image with name ${fileName} and type ${contentType}`);

    try {
        let buffer = await readStream(req);
        buffer = await compressImage(buffer);

        let filePath;
        if (process.env.NODE_ENV === "development") {
            filePath = await storeImageLocally(fileName, buffer)
        }
        else if (process.env.NODE_ENV === "production") {
            filePath = await storeImageRemotely(fileName, contentType, buffer);
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

const isSupportingContentType = (contentType) => {
    return contentType === "image/jpeg" || contentType === "image/png" || contentType === "image/svg+xml";
}

const readStream = (readableStream) => {
    return new Promise((resolve, reject) => {
        let chunks = [];
        readableStream.on("error", err => reject(err));
        readableStream.on("end", () => resolve(Buffer.concat(chunks)));
        readableStream.on("readable", () => {
            while (null !== (chunk = readableStream.read())) {
                chunks.push(chunk);
            }
        });
    })
}

const compressImage = async (buffer) => {
    return await imagemin.buffer(buffer, {
        plugins: [
            imageminMozjpeg({
                quality: 50
            }),
            imageminPngquant({
                quality: [0.5, 1]
            }),
            imageminSvgo(),
        ]
    })
}

const storeImageLocally = async (filename, buffer) => {
    const localFilepath = getLocalFilepath(filename);
    const fd = fs.openSync(localFilepath, "w");
    const bytesWritten = fs.writeSync(fd, buffer);
    console.info(`Successfully wrote ${bytesWritten} to the local file system`);
    return getRemoteFilepath(filename);
}

const getLocalFilepath = (filename) => {
    return path.resolve(__dirname, "..", "..", "public", "image-uploads", filename);
}


const getRemoteFilepath = (filename) => {
    return `${process.env.PROTOCOL}://${process.env.DOMAIN}:${process.env.PORT}/image-uploads/${filename}`;
}

const storeImageRemotely = (filename, contentType, buffer) => {
    return new Promise((resolve, reject) => {
        const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `image-uploads/${filename}`,
            Body: buffer,
            ContentType: contentType
        }
        s3.upload(params, (err, data) => {
            if (err) reject(err);
            console.info("Successfully uploaded image");
            resolve(data.Location);
        })
    })
}