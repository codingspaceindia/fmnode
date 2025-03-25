const admin = require("firebase-admin");
const mImages = require("../Models/mImages")
const multer = require('multer');
// Fetch the service account key JSON file from Firebase Console
const serviceAccount = require("../Middlewares/fmProdAccount.json");
const mMedia = require("../Models/mMedia");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // storageBucket: "gs://multivendorimages.appspot.com"
    storageBucket: "gs://freeminersimg-93f58.firebasestorage.app"
});

const bucket = admin.storage().bucket();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

exports.fileUpload = async (file) => {

    const parts = file.split(';base64,');
    const contentType = parts[0].replace('data:', '');
    const imageData = Buffer.from(parts[1], 'base64');

    const filename = 'Showcase' + Date.now() + '.' + contentType.split('/')[1];  // Generate unique filename

    try {
        await bucket.file(filename).save(imageData, { contentType });
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media`;
        let values = {
            fileUrl: imageUrl,
        }
        const newImage = await new mMedia(values).save()
        return { url: imageUrl, imageId: newImage._id };
    } catch (err) {
        console.log(err)
    }
}


exports.proofUpload = async (file) => {

    const parts = file.split(';base64,');
    const contentType = parts[0].replace('data:', '');
    const imageData = Buffer.from(parts[1], 'base64');

    const filename = 'Showcase' + Date.now() + '.' + contentType.split('/')[1];  // Generate unique filename

    try {
        await bucket.file(filename).save(imageData, { contentType });
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media`;
        let values = {
            imageUrl: imageUrl,
        }
        const newImage = await new mImages(values).save()
        return newImage
    } catch (err) {
        console.log(err)
    }
}


exports.uploadFiles = async (req, res, next) => {
    try {
        const files = req.files;
        if (!files) {
            return res.status(400).send({ message: 'No files uploaded.' });
        }

        const promises = files.map(file => {
            const blob = bucket.file(file.originalname);
            const blobStream = blob.createWriteStream({
                metadata: {
                    contentType: file.mimetype
                }
            });

            return new Promise((resolve, reject) => {
                blobStream.on('error', err => {
                    reject(err);
                });

                blobStream.on('finish', () => {
                    blob.getSignedUrl({
                        action: 'read',
                        expires: '03-01-2500' // Adjust the expiration date as needed
                    }).then((signedUrls) => {
                        resolve(signedUrls[0]);
                    });
                });

                blobStream.end(file.buffer);
            });
        });

        const uploadResults = await Promise.all(promises);
        req.body.uploadResults = uploadResults;
        next();
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).send({ message: 'Error uploading files', error });
    }
};