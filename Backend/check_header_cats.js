import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const MONGODB_URI = "mongodb://aryanpathak0421_db_user:x3pT60HmwJ8HSjQF@cluster0.tuqgifu.mongodb.net:27017/MandiBazaar?ssl=true&authSource=admin&retryWrites=true&w=majority";

async function checkDb() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to DB");

        const HeaderCategorySchema = new mongoose.Schema({
            name: String,
            status: String
        }, { collection: 'headercategories' });

        const HeaderCategory = mongoose.model('HeaderCategory', HeaderCategorySchema);

        const count = await HeaderCategory.countDocuments({});
        console.log(`Total Header Categories: ${count}`);

        const published = await HeaderCategory.find({ status: 'Published' });
        console.log(`Published Header Categories: ${published.length}`);
        published.forEach(p => console.log(`- ${p.name} (ID: ${p._id})`));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkDb();
