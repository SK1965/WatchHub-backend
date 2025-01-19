const {AsyncHandler}= require('../utils/AsyncHandler');
const ApiError = require('../utils/ApiError');
const User = require("../models/user.model");
const ApiResponse = require('../utils/ApiResponse');
const uploadOnCloudinary = require('../utils/cloudinary');
const jwt  = require("jsonwebtoken")

const generateAccessTokenAndrefreshToken = async(userId)=>{
    try {
        const user = await User.findById(userId)

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken

        await user.save({validateBeforeSave : false})

        return  {accessToken , refreshToken}
    } catch (error) {
        throw ApiError(500 , "something went wrong while generating token")
    }
}

const registerUser = AsyncHandler(async(req,res,next)=>{
    // get user details from frontend
    // validation
    // check is user already exists
    // check for images , check for avatar
    //upload them to cloudinary
    // save user to database
    // send response to frontend

    const {username,email,fullname,password} = req.body;
    
    if([username,email,fullname,password].some((field)=>
        field?.trim() === "")
    ){
        throw new ApiError(400,'All Fields are required');
    }

    const existedUser  =await User.findOne({
        $or : [{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,'Username or Email already exists');
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
   // const coverImageLocalPath = req.files?.coverImage[0]?.path
   
    let coverImageLocalPath ;
    if(req.files && Array.isArray(req.files.coverImage) ){
       coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath ){
        throw new ApiError(400,'Avatar file is not found');
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,' Avatar file  is required');
    }

    const user  = await User.create(
        {
        username : username.toLowerCase(),
        email,
        fullname,
        password,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",

        }
    )
    
    const createdUser = await User.findById(user._id).select('-password ');
    console.log(createdUser)
    if(!createdUser){
        throw new ApiError(500,'Something went wrong while creating user');
    }
    
    return res.status(201).json(new ApiResponse(200,createdUser,'User created successfully'));

})


const loginUser = AsyncHandler(
    async(req,res,next)=>{
        //data from req
        const {email,username , password} = req.body 

        //username or email
        if(!username && !email) {
            throw new ApiError(400 , "username or email  is required")
        }
        //find the user

        const user = await User.findOne(
            {
                $or : [{email }, {username}]
            }
        )
        if(!user){
            throw new ApiError(404 , "user does not exists")
        }
        //password check
        const isValidpassword = await user.isPasswordCorrect(password)
        
        if(!isValidpassword){
            throw new ApiError(401 , "password does not matching")
        }
        //access and refresh token
        const {accessToken , refreshToken} = await generateAccessTokenAndrefreshToken(user._id)

        const LoggedInUser = await User.findById(user._id).select("-password -refreshToken")
        
        //send cookie

        const options = {
            httpOnly:true,
            secure  : true
        }

        
        return res
        .status(200)
        .cookie("accessToken" ,accessToken , options)
        .cookie("refreshToken",refreshToken ,options)
        .json(new ApiResponse(200 ,
            {user : LoggedInUser,accessToken,refreshToken },
             "Login Successfull"
        ))
    }
)

const logoutUser = AsyncHandler(
    async(req , res  ,next)=>{
        
        
        const user = await User.findByIdAndUpdate(req.user._id , {
            $unset : {refreshToken : null}
        })

        
        return res
        .status(200)
        .clearCookie("accessToken")
        .clearCookie("refreshToken")
        .json(new ApiResponse(200 , {} , "Logout Successfull"))
    }
)

const refreshAccesToken = AsyncHandler(
    async(req,res,next)=>{
        const incomingRefreshToken = req?.cookies?.refreshToken || req.body.refreshToken

        if (!incomingRefreshToken) {
            throw new ApiError(401 , "unauthorized request")
        }

        try {
            const decodedToken = jwt.verify(
                incomingRefreshToken ,
                process.env.REFRESH_TOKEN_SECRET
    
            )
            
            const user = await User.findById(decodedToken?.id)
    
            if(!user){
                throw new ApiError("401" , "invalid refresh token")
            }
    
            if(incomingRefreshToken !== user.refreshToken){
                throw new ApiError(401 , "Refresh token is expired")
            }
    
            const options = {
                httpOnly : true , 
                secure : true
            }
    
            const {accessToken , newrefreshToken}  = await generateAccessTokenAndrefreshToken(user._id)
    
            return res
            .status(200)
            .cookie("accessToken" , accessToken , options)
            .cookie("refreshToken" , newrefreshToken , options)
            .json(new ApiResponse(200 , {accessToken , refreshToken : newrefreshToken} ,"accessToken refreshed successfull" ))
        } catch (error) {
            throw new ApiError(401  ,error?.message || "Invalid refresh Token")
        }
    }
)

const changeCurrentPassword = AsyncHandler(
    async(req ,res)=>{
        const {oldPassword , newPassword} = req.body
        const user = req.user

        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

        if(!isPasswordCorrect){
            throw new ApiError(400 , "password is incorrect")
        }

        try {
            user.password = newPassword ;
    
            await user.save({validateBeforeSave : false})
    
            return res
            .status(200)
            .json(new ApiResponse(200 ,{},"Password Updated successfully"))
        } catch (error) {
            throw new ApiError(500 , "server error")
        }
    }
)

const getUser = AsyncHandler(
    async(req ,res)=>{
        const user = req.user;

        return res
        .status(200)
        .json(new ApiResponse(200  , user , "user fetch successfull"))
    }
)

const getUserChannelProfile = AsyncHandler( 
    async(req,res)=>{
      const {username}  =  req.params

      if(!username?.trim()){
        throw new ApiError(400 , "username is missing")
      }

      const channel =await  User.aggregate([
        {
              $match  : {username : username?.toLowerCase()}
        },
        {
              $lookup : {
                from  : "subscription",
                localField : "_id" ,
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {
            $lookup : {
                from : "subscriptions" ,
                localField : "_id" ,
                foreignField : "subscriber",
                as : "subscribedTo"
            }
        },
        {
            $addFields : {
                subscribersCount : {
                    $size : "$subscribers"
                },
                channelsSubscribedToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond : {
                        if : {$in : [req.user?._id , "$subscribers.subscriber"]},
                        then : true , 
                        else : false
                    }
                }
            }
        },
        {
        $project : {
            fullname :1 ,
            username :1 ,
            subscribersCount : 1,
            channelsSubscribedToCount : 1 ,
            isSubscribed : 1 ,
            avatar :1,
            coverImage :1 , 
            email :1
             
        }}
    ])

    console.log(channel) 
     
   /*  if(!channel?.length) {
        throw new ApiError(404 , "channel does not exists")
    } */

    return res
    .status(200)
    .json(new ApiResponse(200 , channel[0] , "user fetch successfull"))
    }
)

const getWatchHistory  = AsyncHandler(
    async(req ,res)=>{
        const user = User.aggregate(
            [
                {
                    $match : {
                        _id : mongoose.Types.ObjectId(req.user?._id) 
                    }
                },
                {
                    $lookup : {
                        from : "video", 
                        localField : "watchHistory" ,
                        foreignField : "_id",
                        as : "watchHistory",
                        pipeline : [
                            {
                                $lookup :
                                {
                                from :  "users" ,
                                localField : "owner",
                                foreignField : "_id",
                                as : "owner",
                                pipeline : [
                                    {
                                        $project  :{
                                            fullname :1,
                                            email :1 ,
                                            avatar : 1, 

                                        }
                                    }
                                ]
                            }
                        }
                    ]
                    }
                } ,
                {
                    $add :{
                        owner : {
                            $first : "$owner" , 
                        }
                    }
                }
            ]
        )

        return res
        . status(200)
        . json(new ApiResponse(200 , user[0].watchHistory , "fetched the watch history"))
    }
)
module.exports = {
    registerUser , 
    loginUser , 
    logoutUser, 
    refreshAccesToken , 
    changeCurrentPassword , 
    getUser,
    getUserChannelProfile,
    getWatchHistory
} 