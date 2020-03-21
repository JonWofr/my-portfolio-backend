const path = require("path");
const fs = require("fs");
const AWS = require("aws-sdk");

exports.uploadImage = async (req, res) => {
    const filename = req.query.filename;
    const filetype = req.query.filetype;

    if (!isSupportingFiletype(filetype)) return res.status(400).send(`Filetype ${filetype} is not supported.`);

    try {
        const remoteFilepath = process.env.NODE_ENV === "development" ? await storeImageLocally(filename, req) : await storeImageRemotely(filename, req);
        console.log(remoteFilepath);
        const body = {
            url: remoteFilepath
        }
        return res.status(201).json(body);
    }
    catch (err) {
        return res.status(500).send(err);
    }
}

const isSupportingFiletype = (filetype) => filetype === "image/jpeg" || filetype === "image/png";

const storeImageLocally = (filename, stream) => {
    return new Promise((resolve, reject) => {
        const localFilepath = getLocalFilepath(filename);
        const fd = fs.openSync(localFilepath, "w");

        stream.on("error", (err) => {
            reject(err)
        });
        stream.on("end", () => {
            console.log("Successfully uploaded image");
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
            console.log(data);
            resolve(data.Location);
        })
    })
}