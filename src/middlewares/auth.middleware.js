const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const { AsyncHandler } = require("../utils/AsyncHandler");
const User = require("../models/user.model");


const verifyJWT = AsyncHandler(
    async(req,res,next)=>{
        try {
            
            const token = req.cookies?.accessToken 
                       || req.header("Authorization")?.replace("Bearer " , "")

            
            if(!token){
                throw new ApiError(401 , "Unauthorised request")
            }
    
            const decodedToken = jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)
            
            
            const user = await User.findById(decodedToken?.id)
                        .select("-password -refreshToken")
    
            if(!user){
                throw new ApiError(401 , "Invalid Access Token")
            }
            req.user = user;
            next();
        } catch (error) {
            throw new ApiError(401 , error?.message || "invalid Token")
        }
    }
)

module.exports = verifyJWT ;