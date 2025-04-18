const cloudinary = require('cloudinary').v2;
const { CloudinaryError } = require('../utils/baseException');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadImage = async (filePath) => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: "auto",
            folder: "mobile-app"
        });
        return result.secure_url;
    } catch (error) {
        console.error('Error uploading to cloudinary:', error);
        throw new CloudinaryError('Failed to upload image');
    }
};

module.exports = { uploadImage };
