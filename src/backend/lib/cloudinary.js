import { v2 as cloudinary } from 'cloudinary';

if (!process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

/**
 * Uploads raw text content to Cloudinary as a .txt file.
 * @param {string} textContent Raw text content of the file
 * @param {string} filenamePrefix Prefix for the uploaded file name
 * @returns {Promise<string>} Secure URL of the uploaded file
 */
export const uploadTextFile = async (textContent, filenamePrefix) => {
  try {
    const base64Data = Buffer.from(textContent).toString('base64');
    const dataUri = `data:text/plain;base64,${base64Data}`;
    
    const result = await cloudinary.uploader.upload(dataUri, {
      resource_type: "raw",
      folder: "codinglab_testcases",
      public_id: `${filenamePrefix}_${Date.now()}`,
      // Force it to treat as a text file for downloading / reading
      format: "txt"
    });
    
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload testcase file to Cloudinary: ' + error.message);
  }
};
