const fs = require('fs');
const path = require('path');
const app = require('../../app');
const ObjectId = require('mongodb').ObjectId;

exports.getAll = async (req, res) => {
    let { page, limit, query } = req.query;

    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 5;
    query = query ? JSON.parse(query) : {};

    const startIndex = (page - 1) * limit;

    try {
        const lastPage = await getLastPageNumber(limit, query)

        const result = await app.colSlides.find(query).skip(startIndex).limit(limit).toArray();

        const body = {
            data: result,
            appendix: {
                page,
                lastPage,
                limit
            }
        };

        return res.status(200).json(body);
    }
    catch (err) {
        return res.status(500).send(err);
    }
}

const getLastPageNumber = async (limit, query) => {
    let documentCount = await app.colSlides.countDocuments(query);

    return Math.ceil(documentCount / limit);
}


exports.insertOne = async (req, res) => {
    const { data: reqData, appendix: { limit } } = req.body;

    try {
        const result = await app.colSlides.findOne({ "heading": reqData.heading });
        if (!result) {
            // JSON does not accept undefined values and converts them into null
            if (shouldStoreImage(reqData.image)) {
                await storeImage(reqData.image);
            }

            const result = await app.colSlides.insertOne(reqData);
            const lastPage = await getLastPageNumber(limit);

            const body = {
                data: {
                    _id: result.insertedId
                },
                appendix: {
                    lastPage
                }
            };

            return res.status(201).json(body);
        }
        else {
            return res.status(400).send(`Slide with heading ${reqData.heading} has already been inserted into the collection`);
        }
    }
    catch (err) {
        return res.status(500).send(err);
    }
}

const shouldStoreImage = (image) => image.url !== null && image.url.length > 0 && image.dataUrl !== null && image.dataUrl.length > 0;

const storeImage = async (image) => {
    const localFilePath = getLocalFilePathByFileName(image.url);
    const remoteFilePath = getRemoteFilePathByFileName(image.url);

    const buffer = parseDataUrlToBuffer(image.dataUrl);

    image.url = remoteFilePath;
    image.dataUrl = undefined;

    fs.writeFileSync(localFilePath, buffer);
}

const getLocalFilePathByFileName = fileName => {
    const rootPath = path.dirname(require.main.filename);
    return `${rootPath}/public/image_uploads/${fileName}`;
}

const getRemoteFilePathByFileName = fileName => {
    return `${process.env.PROTOCOL}://${process.env.HOST}:${process.env.PORT}/public/image_uploads/${fileName}`;
}

const parseDataUrlToBuffer = (dataUrl) => {
    const encodedImageData = dataUrl.split(',')[1];
    return Buffer.from(encodedImageData, "base64");
}


exports.deleteOne = async (req, res) => {
    const { _id } = req.params;
    const { appendix: { limit } } = req.body;

    try {
        const result = await app.colSlides.findOneAndDelete({ _id: new ObjectId(_id) });
        const lastPage = await getLastPageNumber(limit);

        const body = {
            data: result,
            appendix: {
                lastPage
            }
        };
        return res.status(200).json(body);
    }
    catch (err) {
        return res.status(500).send(err);
    }
}

exports.updateOne = async (req, res) => {
    const { _id } = req.params;
    const { data: reqData, appendix: { limit } } = req.body;

    // One is not allowed to alter the immutable property _id. Therefore it's deleted before the replacement.
    delete reqData._id;

    try {
        // JSON does not accept undefined values and converts them into null
        if (shouldStoreImage(reqData.image)) {
            await storeImage(reqData.image);
        }

        const result = await app.colSlides.findOneAndReplace({ _id: new ObjectId(_id) }, reqData);
        const lastPage = await getLastPageNumber(limit);
        const body = {
            data: result,
            appendix: {
                lastPage
            }
        };
        return res.status(200).json(body);
    }
    catch (err) {
        return res.status(500).send(err);
    }
}

