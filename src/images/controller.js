const path = require("path");
const fs = require("fs");
const AWS = require("aws-sdk");

exports.uploadImage = async (req, res) => {
    const filename = req.query.filename;
    const filetype = req.query.filetype;

    if (!isSupportingFiletype(filetype)) {
        console.warn(`Filetype ${filetype} is not supported.`);
        return res.status(400).send(`Filetype ${filetype} is not supported.`);
    }

    console.info(`About to save new image with name ${filename} and type ${filetype}`);

    try {
        let filePath;
        if (process.env.NODE_ENV === "development") {
            filePath = await storeImageLocally(filename, req)
        }
        else if (process.env.NODE_ENV === "production") {
            filePath = await storeImageRemotely(filename, req);
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

const storeImageLocally = (filename, stream) => {
    return new Promise((resolve, reject) => {
        const localFilepath = getLocalFilepath(filename);
        const fd = fs.openSync(localFilepath, "w");

        stream.on("error", (err) => {
            reject(err)
        });
        stream.on("end", () => {
            console.info("Successfully uploaded image");
            fs.closeSync(fd);
            resolve(getRemoteFilepath(filename));
        });
        stream.on("readable", () => {
            let chunk;
            while (null !== (chunk = stream.read())) {
                fs.writeSync(fd, chunk);
            }
        });
    })
}

const getLocalFilepath = filename => {
    return path.resolve(__dirname, "..", "..", "public", "image-uploads", filename);
}


const getRemoteFilepath = filename => {
    return `${process.env.PROTOCOL}://${process.env.DOMAIN}:${process.env.PORT}/image-uploads/${filename}`;
}

const storeImageRemotely = (filename, stream) => {
    return new Promise((resolve, reject) => {
        const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `image-uploads/${filename}`,
            Body: stream,
            ContentType: "application/octet-stream"
        }
        s3.upload(params, (err, data) => {
            if (err) reject(err);
            console.info("Successfully uploaded image");
            resolve(data.Location);
        })
    })
}