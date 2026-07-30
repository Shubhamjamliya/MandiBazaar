const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: 'd:/MandiBazaar/Backend/.env' });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to DB");

    const result = await mongoose.connection.collection('products').updateMany(
      { sequenceNumber: { $exists: false } },
      { $set: { sequenceNumber: 999999 } }
    );
    
    console.log(`Updated ${result.modifiedCount} products`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
