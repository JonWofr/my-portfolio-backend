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
        const result = await app.colProjects.find(query).skip(startIndex).limit(limit).toArray();

        const documentsCount = await app.colProjects.countDocuments(query)
        const lastPage = Math.ceil(documentsCount / limit);

        const body = {
            data: result,
            appendix: {
                page,
                lastPage,
                documentsCount,
                limit
            }
        };

        return res.status(200).json(body);
    }
    catch (err) {
        return res.status(500).send(err);
    }
}


exports.insertOne = async (req, res) => {
    const { data: reqData, appendix: { limit } } = req.body;

    try {
        const result = await app.colProjects.findOne({ "projectName": reqData.projectName });
        if (!result) {
            // JSON does not accept undefined values and converts them into null
            await Promise.all(reqData.paragraphs.filter(paragraph => shouldStoreImage(paragraph.image)).map(paragraph => storeImage(paragraph.image)));

            const result = await app.colProjects.insertOne(reqData);

            const documentsCount = await app.colProjects.countDocuments()
            const lastPage = Math.ceil(documentsCount / limit);

            const body = {
                data: {
                    _id: result.insertedId
                },
                appendix: {
                    lastPage,
                    documentsCount
                }
            };

            return res.status(201).json(body);
        }
        else {
            return res.status(400).send(`Project with Project Name ${reqData.projectName} has already been inserted into the collection`);
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
    return `${process.env.PROTOCOL}://${process.env.DOMAIN}:${process.env.PORT}/public/image_uploads/${fileName}`;
}


const parseDataUrlToBuffer = (dataUrl) => {
    const encodedImageData = dataUrl.split(',')[1];
    return Buffer.from(encodedImageData, "base64");
}

exports.deleteOne = async (req, res) => {
    const { _id } = req.params;
    const { appendix: { limit } } = req.body;

    try {
        const result = await app.colProjects.findOneAndDelete({ _id: new ObjectId(_id) });

        const documentsCount = await app.colProjects.countDocuments()
        const lastPage = Math.ceil(documentsCount / limit);

        const body = {
            data: result,
            appendix: {
                lastPage,
                documentsCount
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
        await Promise.all(reqData.paragraphs.filter(paragraph => shouldStoreImage(paragraph.image)).map(paragraph => storeImage(paragraph.image)));

        const result = await app.colProjects.findOneAndReplace({ _id: new ObjectId(_id) }, reqData);

        const documentsCount = await app.colProjects.countDocuments()
        const lastPage = Math.ceil(documentsCount / limit);
        
        const body = {
            data: result,
            appendix: {
                lastPage,
                documentsCount
            }
        };
        return res.status(200).json(body);
    }
    catch (err) {
        return res.status(500).send(err);
    }
}
