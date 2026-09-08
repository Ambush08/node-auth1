import mongoose from "mongoose";
import dotenv from 'dotenv'

dotenv.config();

const mongodbURI =  process.env.MONGODB_URI as string

const connectDB = async ( )=> {
    try {
        //Check it DB URI exists
        if(!mongodbURI){
            console.log("MONGODB_URI does not exists");
        }

        await mongoose.connect(mongodbURI);
        console.log("Mongodb connected successfully")
    } catch (error) {
        console.log("Failed to connect to mongodb", error)
    }
}

export default connectDB;
