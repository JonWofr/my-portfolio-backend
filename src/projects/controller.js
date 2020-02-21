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

    let lastPage;

    try {
        lastPage = await getLastPageNumber(limit, query)
    }
    catch (err) {
        return res.status(500).send(err);
    }

    app.colProjects.find(query).skip(startIndex).limit(limit).toArray((err, result) => {
        if (err) {
            return res.status(500).send(err);
        }

        const body = {
            data: result,
            appendix: {
                page,
                lastPage,
                limit
            }
        };

        return res.status(200).json(body);
    });
}

const getLastPageNumber = async (limit, query) => {
    let documentCount = await app.colProjects.countDocuments(query);

    return Math.ceil(documentCount / limit);
}


exports.insertOne = (req, res) => {
    const { data: reqData, appendix: { limit } } = req.body;
    //: is used to to bind the value which stands behind the slash in the url request to the property defined here and is accessible via req.params 
    //?propertyName=value defines the property in the url request itself and is accessible via req.query
    app.colProjects.findOne({ "projectName": reqData.projectName }, async (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        if (!result) {
            try {
                // The image comes in the format of a dataUrl. Therefore we have to extract the data from this string (i.e. the Base64 encoded String) and decode it to get the String in binary format.
                // Once we have done that, we can create a Blob 
                let writeFilePromises = [];

                reqData.paragraphs.forEach((paragraph) => {
                    const { url, dataUrl } = paragraph.image;

                    if (url !== "" && dataUrl !== "") {
                        const localFilePath = getLocalFilePathByFileName(url);
                        const remoteFilePath = getRemoteFilePathByFileName(url);

                        const buffer = parseDataUrlToBuffer(dataUrl);
                        writeFilePromises.push(writeFilePromise(localFilePath, buffer));

                        paragraph.image.url = remoteFilePath;
                        paragraph.image.dataUrl = undefined;
                    }
                })

                if (writeFilePromises.length > 0) await Promise.all(writeFilePromises);

                const result = await app.colProjects.insertOne(reqData);

                const lastPage = await getLastPageNumber(limit)

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
            catch (err) {
                res.status(500).send(err);
            }
        }
        else return res.status(400).send(`Project with name ${reqData.projectName} has already been inserted into the collection`)
    })
}


const getLocalFilePathByFileName = fileName => {
    const rootPath = path.dirname(require.main.filename);
    return `${rootPath}/public/image_uploads/${fileName}`;
}

const getRemoteFilePathByFileName = fileName => `${process.env.PROTOCOL}://${process.env.HOST}:${process.env.PORT}/public/image_uploads/${fileName}`;

const parseDataUrlToBuffer = (dataUrl) => {
    const encodedImageData = dataUrl.split(',')[1];
    return Buffer.from(encodedImageData, "base64");
}

const writeFilePromise = (path, buffer) => new Promise((resolve) => {
    fs.writeFileSync(path, buffer);
    resolve();
});


exports.deleteOne = (req, res) => {
    const { _id } = req.params;
    const { appendix: { limit } } = req.body;

    app.colProjects.remove({ "_id": new ObjectId(_id) }, async (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }

        let lastPage;

        try {
            lastPage = await getLastPageNumber(limit)
        }
        catch (err) {
            return res.status(500).send(err);
        }

        const body = {
            data: {},
            appendix: {
                lastPage
            }
        };

        return res.status(200).json(body);
    })
}

exports.updateOne = (req, res) => {
    const { _id } = req.params;
    const { data: reqData } = req.body;
    const { projectName, categories, technologies, teamMembers, startDate, endDate, paragraphs } = reqData;

    app.colProjects.findOne({ _id: ObjectId(_id) }, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        };
        // If nothing matches the query null is returned
        if (result) {
            const writeFilePromises = [];
            paragraphs.forEach(paragraph => {
                if (paragraph.image.dataUrl) {
                    const { url, dataUrl } = paragraph.image;

                    const localFilePath = getLocalFilePathByFileName(url);
                    const remoteFilePath = getRemoteFilePathByFileName(url);

                    try {
                        const buffer = parseDataUrlToBuffer(dataUrl);
                        writeFilePromises.push(writeFilePromise(localFilePath, buffer));
                    }
                    catch (err) {
                        return res.status(500).send(err);
                    }
                    paragraph.image.url = remoteFilePath;
                    paragraph.image.dataUrl = null;
                }
            })
            if (writeFilePromises.length > 0) {
                Promise.all(writeFilePromises)
                    .then(() => {
                        app.colProjects.updateOne({ _id: ObjectId(_id) }, { $set: { projectName, categories, technologies, teamMembers, startDate, endDate, paragraphs } }, (err, result) => {
                            if (err) {
                                return res.status(500).send(err);
                            }

                            const body = {
                                data: reqData,
                                appendix: {}
                            }

                            return res.status(200).json(body);
                        })
                    })
                    .catch((err) => {
                        return res.status(500).send(err);
                    })
            }
            else {
                app.colProjects.updateOne({ _id: ObjectId(_id) }, { $set: { projectName, categories, technologies, teamMembers, startDate, endDate, paragraphs } }, (err, result) => {
                    if (err) {
                        return res.status(500).send(err);
                    }

                    const body = {
                        data: reqData,
                        appendix: {}
                    }

                    return res.status(200).json(body);
                })
            }
        }
        else {
            return res.status(404).send(`There is no document with id ${id} stored in the collection`);
        }
    })
}
