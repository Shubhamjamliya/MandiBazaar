const mongoose = require('mongoose');
const MONGODB_URI = "mongodb://aryanpathak0421_db_user:x3pT60HmwJ8HSjQF@cluster0.tuqgifu.mongodb.net:27017/MandiBazaar?ssl=true&authSource=admin&retryWrites=true&w=majority";

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        const cats = await mongoose.connection.db.collection('headercategories').find({ status: 'Published' }).toArray();
        console.log('PUBLISHED_HEADER_CATS:', JSON.stringify(cats.map(c => ({ id: c._id, name: c.name }))));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
