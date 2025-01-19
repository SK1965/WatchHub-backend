const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const userSchema = new mongoose.Schema({
    username : {
        type : String , 
        required : true,
        unique : true,
        lowercase : true,
        trim : true,
        index : true,
    } ,
    email : {
        type : String , 
        required : true,
        unique : true,
        lowercase : true,
        trim : true,
    },
    fullname : {
        type : String , 
        required : true,
        trim : true,
        index : true,
    },
    avatar : {
        type : String , //cloudinary url
        required : true ,
    },
    coverImage : {
        type : String , //cloudinary url
        required : false ,
    },
    watchHistory : [
        {
            type : mongoose.Schema.Types.ObjectId,
            ref : 'Video'
        }
    ] ,
    password : {
        type : String , 
        required : [true , 'Password is required'],
    },
    refreshToken : {
        type : String,
    },

},
{
    timestamps : true,
}
);

userSchema.pre('save',async function(next){
    if(this.isModified('password')){
        this.password = await bcrypt.hash(this.password,10);
    }
    return next();
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password);
}
userSchema.methods.generateAccessToken = function(){
    return jwt.sign({
        id : this._id,
        username : this.username,
        email : this.email,
        fullname : this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {expiresIn : process.env.ACCESS_TOKEN_EXPIRY});
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign({
        id : this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {expiresIn : process.env.REFRESH_TOKEN_EXPIRY});
}

module.exports = mongoose.model('User',userSchema);
