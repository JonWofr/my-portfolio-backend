const app = require('../../app');
const bcryptjs = require('bcryptjs');
const crypto = require('crypto');
const ObjectId = require('mongodb').ObjectId;

exports.insertOne = async (req, res) => {
    const { data: { username, password } } = req.body;

    try {
        if (!await shouldCreateNewUser()) return res.status(400).send("Only one User is allowed to exist at a time.");

        const salt = await bcryptjs.genSalt();
        const hashedPassword = await bcryptjs.hash(password, salt);

        const user = {
            username,
            password: hashedPassword
        }

        const result = await app.colUsers.insertOne(user);
        const body = { data: { _id: result.insertedId } };

        return res.status(201).json(body);
    }
    catch (err) {
        return res.status(500).send(err);
    }
}


const shouldCreateNewUser = async () => {
    const documentsCount = await app.colUsers.countDocuments();
    return documentsCount === 0;
}


exports.login = async (req, res) => {
    const { data: { username, password } } = req.body;

    try {
        const user = await app.colUsers.findOne({ username });

        if (user && bcryptjs.compareSync(password, user.password)) {
            // Commonly a reference to the User document which matches username and password will be passed as argument in order for the jwt to contain it as payload
            const token = createToken(user._id);
            const body = { data: { jwt: token } };

            return res.status(200).json(body);
        }
        else return res.status(401).send("Authentication failed: Username and/or Password is wrong");
    }
    catch (err) {
        return res.status(500).send(err);
    }
}


const createToken = (userId) => {
    const tokenHeader = {
        alg: "HS256",
        typ: "JWT"
    }
    const encryptedTokenHeader = encryptFromAsciiStringToBase64String(JSON.stringify(tokenHeader));

    const tokenPayload = {
        iss: Date.now().toString(),
        sub: userId
    }
    const encryptedTokenPayload = encryptFromAsciiStringToBase64String(JSON.stringify(tokenPayload));

    const hmac = crypto.createHmac("sha256", process.env.JWT_SIGNATURE_SECRET);
    const updatedHmac = hmac.update(`${encryptedTokenHeader}.${encryptedTokenPayload}`);
    const hashedTokenSignature = updatedHmac.digest("base64");

    return `${encryptedTokenHeader}.${encryptedTokenPayload}.${hashedTokenSignature}`;
}


const encryptFromAsciiStringToBase64String = (data) => {
    const buffer = new Buffer(data);
    return buffer.toString("base64");
}

exports.auth = async (req, res) => {
    const { appendix: { user: userId } } = req.body;

    try {
        const user = await app.colUsers.findOne({ _id: new ObjectId(userId) })
        delete user.password;
        return res.status(200).json(user);
    }
    catch (err) {
        res.status(500).send(err);
    }
}


exports.checkToken = (req, res, next) => {
    const authorizationHeader = req.header("Authorization");

    const token = authorizationHeader && authorizationHeader.split(" ")[1];

    if (!token) return res.status(403).send("Missing Bearer Token");

    const [encryptedTokenHeader, encryptedTokenPayload, hashedTokenSignature] = token.split(".");

    if (hasIntegrityBeenPreserved(`${encryptedTokenHeader}.${encryptedTokenPayload}`, hashedTokenSignature)) {
        const decryptedTokenPayload = decryptFromBase64StringToAsciiString(encryptedTokenPayload);
        const tokenPayload = JSON.parse(decryptedTokenPayload);

        if (!("appendix" in req.body)) {
            req.body.appendix = {}
        }

        req.body.appendix.user = tokenPayload.sub;
        next();
    }
    else return res.status(400).send("The data or signature of the jwt has been tampered with.");
}


const hasIntegrityBeenPreserved = (encryptedTokenData, hashedTokenSignature) => {
    const hmac = crypto.createHmac("sha256", process.env.JWT_SIGNATURE_SECRET);
    const updatedHmac = hmac.update(encryptedTokenData);
    const newHashedTokenSignature = updatedHmac.digest("base64");

    return newHashedTokenSignature === hashedTokenSignature ? true : false;
}


const decryptFromBase64StringToAsciiString = (data) => {
    const decryptedBuffer = new Buffer(data, "base64");
    return decryptedBuffer.toString("ascii");
}