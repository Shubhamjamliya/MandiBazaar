
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkSpecificSeller() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in .env');
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI);
    const seller = await mongoose.connection.collection('sellers').findOne({
      _id: new mongoose.Types.ObjectId('69a5511df66df13d61bda1d5')
    });
    console.log('Seller:', seller ? {
      storeName: seller.storeName,
      status: seller.status,
      category: seller.category
    } : 'Not found');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSpecificSeller();
