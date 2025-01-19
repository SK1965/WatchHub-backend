const {v2 :cloudinary }= require('cloudinary');
const fs = require('fs');

cloudinary.config({
    cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
    api_key : process.env.CLOUDINARY_API_KEY,
    api_secret : process.env.CLOUDINARY_API_SECRET,
})

const uploadOnCloudinary = async (localfile)=>{
    try{

    
        
        if(!localfile){
            return null;
        }
        const response = await cloudinary.uploader.upload(localfile,{
            resource_type : 'auto',
        })

        fs.unlinkSync(localfile)
         return response;
    } catch(err){
        console.log('Error in uploading file on cloudinary',err);
        fs.unlinkSync(localfile);
        return null;
    }
}

module.exports = uploadOnCloudinary;