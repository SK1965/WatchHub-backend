const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    Credentials: true
}))

app.use(express.json({limit: '32kb'}));
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));
app.use(cookieParser());

// Routes
const userRouter = require('./routes/user.routes');

// routes declaration
app.use("/api/v1/users", userRouter);

module.exports = app;