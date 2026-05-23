/**
 * Push Notification Diagnostic Script
 * Run: npx tsx diagnose-push-notifications.ts
 * 
 * This script checks:
 * 1. Firebase credentials validity
 * 2. Database connection
 * 3. User tokens in database
 * 4. Send test notifications
 */

import dotenv from 'dotenv';
import admin from 'firebase-admin';
import mongoose from 'mongoose';
import path from 'path';

dotenv.config();

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[36m';
const YELLOW = '\x1b[33m';

interface DiagnosticResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: string;
}

const results: DiagnosticResult[] = [];

async function check(description: string, fn: () => Promise<boolean>, details?: string): Promise<void> {
  try {
    const passed = await fn();
    results.push({
      check: description,
      status: passed ? 'PASS' : 'FAIL',
      message: passed ? '✅ OK' : '❌ Failed',
      details
    });
  } catch (error: any) {
    results.push({
      check: description,
      status: 'FAIL',
      message: `❌ Error: ${error.message}`,
      details: error.stack
    });
  }
}

async function warn(description: string, message: string): Promise<void> {
  results.push({
    check: description,
    status: 'WARN',
    message: `⚠️  ${message}`
  });
}

async function main() {
  console.log(`\n${BLUE}🔔 Push Notification Diagnostic Tool${RESET}\n`);
  console.log(`${BLUE}${'='.repeat(60)}${RESET}\n`);

  // 1. Check Environment Variables
  console.log(`${YELLOW}1️⃣  Checking Environment Variables...${RESET}`);
  await check('FIREBASE_SERVICE_ACCOUNT set', async () => {
    return !!process.env.FIREBASE_SERVICE_ACCOUNT;
  }, process.env.FIREBASE_SERVICE_ACCOUNT?.substring(0, 50) + '...');

  // 2. Check Firebase Credentials Validity
  console.log(`\n${YELLOW}2️⃣  Checking Firebase Credentials...${RESET}`);
  let firebaseInitialized = false;
  await check('Firebase credentials valid JSON', async () => {
    try {
      const creds = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!creds) return false;
      
      let credStr = creds.trim();
      if (credStr.startsWith("'") && credStr.endsWith("'")) {
        credStr = credStr.substring(1, credStr.length - 1);
      }
      const json = JSON.parse(credStr);
      return json.type === 'service_account' && json.project_id;
    } catch (e) {
      return false;
    }
  });

  // Initialize Firebase
  try {
    const envCreds = process.env.FIREBASE_SERVICE_ACCOUNT || '';
    let credStr = envCreds.trim();
    if (credStr.startsWith("'") && credStr.endsWith("'")) {
      credStr = credStr.substring(1, credStr.length - 1);
    }
    const serviceAccount = JSON.parse(credStr);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    firebaseInitialized = true;

    await check('Firebase Admin SDK initializes', async () => {
      return firebaseInitialized;
    });

    await check('Firebase Messaging API accessible', async () => {
      const msg = admin.messaging();
      return !!msg;
    });
  } catch (error: any) {
    await check('Firebase Admin SDK initializes', async () => false, error.message);
  }

  // 3. Check MongoDB Connection
  console.log(`\n${YELLOW}3️⃣  Checking Database Connection...${RESET}`);
  await check('MongoDB URI configured', async () => {
    return !!process.env.MONGODB_URI;
  });

  let dbConnected = false;
  await check('Can connect to MongoDB', async () => {
    try {
      if (!process.env.MONGODB_URI) return false;
      await mongoose.connect(process.env.MONGODB_URI);
      dbConnected = true;
      return true;
    } catch (e) {
      return false;
    }
  });

  // 4. Check User Models and Tokens
  if (dbConnected) {
    console.log(`\n${YELLOW}4️⃣  Checking User Models...${RESET}`);

    try {
      const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }));
      const Admin = mongoose.model('Admin', new mongoose.Schema({}, { strict: false }));
      const Seller = mongoose.model('Seller', new mongoose.Schema({}, { strict: false }));
      const Delivery = mongoose.model('Delivery', new mongoose.Schema({}, { strict: false }));

      const customerWithTokens = await (Customer as any).findOne({
        $or: [
          { fcmTokens: { $exists: true, $ne: [] } },
          { fcmTokenMobile: { $exists: true, $ne: [] } }
        ]
      }).lean();

      const adminWithTokens = await (Admin as any).findOne({
        $or: [
          { fcmTokens: { $exists: true, $ne: [] } },
          { fcmTokenMobile: { $exists: true, $ne: [] } }
        ]
      }).lean();

      if (customerWithTokens) {
        await check('Customers with FCM tokens exist', async () => true,
          `Found 1 customer with tokens (web: ${customerWithTokens.fcmTokens?.length || 0}, mobile: ${customerWithTokens.fcmTokenMobile?.length || 0})`
        );
      } else {
        await warn('No customers with FCM tokens', 'Ensure frontend is saving FCM tokens via /api/v1/fcm-tokens/save');
      }

      if (adminWithTokens) {
        await check('Admins with FCM tokens exist', async () => true,
          `Found 1 admin with tokens (web: ${adminWithTokens.fcmTokens?.length || 0}, mobile: ${adminWithTokens.fcmTokenMobile?.length || 0})`
        );
      } else {
        await warn('No admins with FCM tokens', 'Admin dashboard not registered for notifications');
      }
    } catch (error: any) {
      await check('User Models accessible', async () => false, error.message);
    }
  }

  // 5. Summary and Recommendations
  console.log(`\n${BLUE}${'='.repeat(60)}${RESET}\n`);
  console.log(`${YELLOW}📊 Diagnostic Summary${RESET}:\n`);

  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  results.forEach((result) => {
    const statusColor = result.status === 'PASS' ? GREEN : result.status === 'FAIL' ? RED : YELLOW;
    console.log(`${statusColor}${result.message}${RESET} ${result.check}`);
    if (result.details) {
      console.log(`   ${BLUE}→${RESET} ${result.details}`);
    }

    if (result.status === 'PASS') passCount++;
    else if (result.status === 'FAIL') failCount++;
    else warnCount++;
  });

  console.log(`\n${YELLOW}Results:${RESET} ${GREEN}${passCount} passed${RESET}, ${RED}${failCount} failed${RESET}, ${YELLOW}${warnCount} warnings${RESET}\n`);

  // Recommendations
  if (failCount > 0 || warnCount > 0) {
    console.log(`${YELLOW}🔧 Recommendations:${RESET}\n`);

    if (results.some(r => r.check.includes('Firebase') && r.status === 'FAIL')) {
      console.log(`  1. Verify FIREBASE_SERVICE_ACCOUNT in .env`);
      console.log(`  2. Ensure valid Firebase project credentials`);
      console.log(`  3. Visit: https://console.firebase.google.com/project/mandibazaar-4817a/settings/serviceaccounts/adminsdk\n`);
    }

    if (results.some(r => r.check.includes('MongoDB') && r.status === 'FAIL')) {
      console.log(`  4. Check MONGODB_URI connectivity in .env`);
      console.log(`  5. Verify network access to MongoDB cluster\n`);
    }

    if (results.some(r => r.check.includes('tokens') && r.status === 'WARN')) {
      console.log(`  6. Register FCM token from frontend:\n`);
      console.log(`     POST /api/v1/fcm-tokens/save`);
      console.log(`     Body: { "token": "fcm_token_here", "platform": "web" }\n`);
      console.log(`  7. Test notification endpoint:\n`);
      console.log(`     POST /api/v1/fcm-tokens/test\n`);
    }
  }

  // Cleanup
  if (dbConnected) {
    await mongoose.disconnect();
  }

  console.log(`${BLUE}${'='.repeat(60)}${RESET}\n`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(console.error);
