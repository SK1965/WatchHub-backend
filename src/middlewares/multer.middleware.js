const multer = require('multer');


const storage = multer.diskStorage({
    destination: function (req, file, cb) { //cb : callback
      cb(null, process.env.UPLOAD_PATH || './public/temp')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  })
  
const upload = multer({ storage: storage })
  
module.exports = upload; 