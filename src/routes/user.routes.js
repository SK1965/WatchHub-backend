const express = require('express');
const  {registerUser ,
     loginUser , 
     logoutUser 
    ,refreshAccesToken ,
     changeCurrentPassword , 
     getUser,
     getUserChannelProfile,
     getWatchHistory
    } = require('../controllers/user.controller');
const  upload  = require('../middlewares/multer.middleware');
const verifyJWT = require('../middlewares/auth.middleware');

const router = express.Router();

router.route('/register').post(
    upload.fields([
        {name : 'avatar' , maxCount : 1},
        {name :  'coverImage' , maxCount : 1}]) ,
    registerUser
)

router.route('/login').post(loginUser)

router.route("/logout").post( verifyJWT ,logoutUser)

router.route("/refresh-token").post(refreshAccesToken)

router.route("/change-password").post(verifyJWT ,changeCurrentPassword)

router.route("/get-user").get(verifyJWT , getUser)

router.route("/:username").get(verifyJWT , getUserChannelProfile )

router.route("/history").get(verifyJWT , getWatchHistory)



module.exports = router;