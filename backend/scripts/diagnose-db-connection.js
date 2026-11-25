'use strict';

const path = require('node:path');
const dns = require('node:dns');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

const envPath = path.resolve(__dirname, '..', '.env');
const dotenvResult = dotenv.config({ path: envPath });
const mongoUri = process.env.MONGO_URI;
const mongodbUri = process.env.MONGODB_URI;
const selectedUri = mongoUri || mongodbUri;

function safeError(error) {
  const result = {
    errorName: typeof error?.name === 'string' ? error.name : 'Error',
  };
  if (typeof error?.code === 'string' || typeof error?.code === 'number') {
    result.errorCode = error.code;
  }
  return result;
}

async function checkSrvDns(uri) {
  if (!uri) return { status: 'skipped_no_uri' };

  let parsed;
  try {
    parsed = new URL(uri);
  } catch (error) {
    return { status: 'failed', ...safeError(error) };
  }

  if (parsed.protocol !== 'mongodb+srv:') {
    return { status: 'not_applicable' };
  }

  try {
    const records = await dns.promises.resolveSrv(`_mongodb._tcp.${parsed.hostname}`);
    return { status: records.length > 0 ? 'resolved' : 'no_records' };
  } catch (error) {
    return { status: 'failed', ...safeError(error) };
  }
}

async function main() {
  // Match the development backend's resolver for this process only.
  dns.setServers(['8.8.8.8', '1.1.1.1']);

  const report = {
    dotenvLoaded: dotenvResult.error ? 'no' : 'yes',
    mongoUriAvailable: mongoUri ? 'yes' : 'no',
    mongodbUriAvailable: mongodbUri ? 'yes' : 'no',
    srvDns: await checkSrvDns(selectedUri),
    mongooseConnected: 'no',
    ping: 'not_run',
  };

  if (!selectedUri) {
    report.connectionError = { errorName: 'ConfigurationError', errorCode: 'MONGO_URI_MISSING' };
    console.log(JSON.stringify(report));
    return;
  }

  try {
    await mongoose.connect(selectedUri, { serverSelectionTimeoutMS: 8000 });
    report.mongooseConnected = 'yes';
    await mongoose.connection.db.admin().ping();
    report.ping = 'ok';
  } catch (error) {
    report.connectionError = safeError(error);
    if (report.mongooseConnected === 'yes') report.ping = 'failed';
  } finally {
    try {
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    } catch (error) {
      report.disconnect = safeError(error);
    }
  }

  console.log(JSON.stringify(report));
}

main().catch((error) => {
  // No exception message or connection data is emitted.
  console.log(JSON.stringify({
    diagnosticError: safeError(error),
  }));
  process.exitCode = 1;
});
