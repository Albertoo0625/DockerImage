const express=require('express');
const app=express();
const dotenv=require('dotenv');
dotenv.config();
const mongoose=require('mongoose');
const cors=require('cors');
const { MONGO_USER, MONGO_PASSWORD, MONGO_IP, MONGO_PORT } = require('./Config/config');
const port=process.env.PORT || 35000;
const mongourl=`mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_IP}:${MONGO_PORT}/?authSource=admin`;

app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.use(cors({}))
app.enable("trust proxy");

app.use('/',require('./Routes/root'));
app.use('/post', require('./Routes/post'));
app.use('/stream', require('./Routes/stream'));

const connectWithRetry=()=>{
    mongoose.connect(mongourl,{
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then(()=>{
        console.log('conected to mongo db');
        app.listen(port,()=>{
            console.log(`app listening on port ${port}`);
        })
    }).catch((e)=>{
     console.log(e.message);
     setTimeout(connectWithRetry,5000);
    })
}

connectWithRetry();

