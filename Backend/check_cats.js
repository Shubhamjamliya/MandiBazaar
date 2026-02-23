const mongoose = require('mongoose');
const MONGODB_URI = "mongodb://aryanpathak0421_db_user:x3pT60HmwJ8HSjQF@cluster0.tuqgifu.mongodb.net:27017/MandiBazaar?ssl=true&authSource=admin&retryWrites=true&w=majority";

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        const Category = mongoose.connection.db.collection('categories');
        const rootCats = await Category.find({ parentId: null, status: 'Active' }).sort({ name: 1 }).toArray();
        console.log('ROOT_CATEGORIES_COUNT:', rootCats.length);
        console.log('ROOT_CATEGORIES_NAMES:', rootCats.map(c => c.name));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
