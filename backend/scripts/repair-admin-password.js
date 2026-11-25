'use strict';

const { StringDecoder } = require('node:string_decoder');
const readline = require('node:readline');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
// Run this local utility through config/db.js's existing development DNS setup.
// This only affects this Node process; it does not change Windows DNS settings.
process.env.NODE_ENV = 'development';
const connectDB = require('../config/db');
const Admin = require('../models/Admin');

let ignoreLeadingLineFeed = false;
let passwordLengthsMatch = null;
let passwordValuesMatch = null;
let passwordInputCancelled = false;

function restoreNormalTerminalMode() {
  if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
    try {
      process.stdin.setRawMode(false);
    } catch {
      // Continue cleanup even if the terminal has already closed.
    }
  }
}

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    if (!input.isTTY || typeof input.setRawMode !== 'function') {
      reject(new Error('An interactive terminal is required for hidden password input.'));
      return;
    }

    const decoder = new StringDecoder('utf8');
    let value = '';
    let settled = false;

    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      input.removeListener('data', onData);
      restoreNormalTerminalMode();
      input.pause();
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(result);
    };

    const onData = (chunk) => {
      for (const character of decoder.write(chunk)) {
        // Windows terminals may deliver Enter as CRLF across one or two chunks.
        // Consume a delayed LF at the start of the next hidden prompt.
        if (ignoreLeadingLineFeed) {
          ignoreLeadingLineFeed = false;
          if (character === '\n') continue;
        }
        if (character === '\u0003') {
          const error = new Error('Operation cancelled.');
          error.code = 'PASSWORD_INPUT_CANCELLED';
          finish(error);
          return;
        }
        if (character === '\r') {
          ignoreLeadingLineFeed = true;
          finish(null, value);
          return;
        }
        if (character === '\n') {
          finish(null, value);
          return;
        }
        if (character === '\u0008' || character === '\u007f') {
          value = Array.from(value).slice(0, -1).join('');
          continue;
        }
        if (character >= ' ' && character !== '\u007f') {
          value += character;
        }
      }
    };

    process.stdout.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
  });
}

function readUpdateConfirmation() {
  return new Promise((resolve, reject) => {
    // Explicitly leave raw mode before showing the visible confirmation prompt.
    restoreNormalTerminalMode();

    const input = process.stdin;
    const rl = readline.createInterface({ input, output: process.stdout, terminal: true });
    let settled = false;

    const finish = (error, answer) => {
      if (settled) return;
      settled = true;
      rl.close();
      restoreNormalTerminalMode();
      if (error) reject(error);
      else resolve(answer);
    };

    rl.once('SIGINT', () => finish(new Error('Operation cancelled.')));
    rl.question('Type UPDATE to change this existing admin password: ', (answer) => {
      finish(null, answer);
    });
  });
}

async function main() {
  activeStep = 'configuration';
  const configuredEmail = process.env.ADMIN_EMAIL;
  if (!process.env.MONGO_URI || typeof configuredEmail !== 'string' || !configuredEmail.trim()) {
    throw new Error('Required repair configuration is unavailable.');
  }
  const normalizedEmail = configuredEmail.trim().toLowerCase();

  activeStep = 'database_connection';
  await connectDB();

  activeStep = 'admin_lookup';
  const matches = await Admin.find({ email: normalizedEmail })
    .select('_id')
    .limit(2)
    .lean();

  if (matches.length !== 1) {
    throw new Error('Expected exactly one matching existing admin; no update was made.');
  }

  activeStep = 'password_entry';
  const password = await readHidden('New admin password (hidden): ');
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    activeStep = 'password_validation';
    throw new Error('Password does not meet the required length limits; no update was made.');
  }

  activeStep = 'password_confirmation';
  const confirmation = await readHidden('Confirm new admin password (hidden): ');
  passwordLengthsMatch = password.length === confirmation.length;
  passwordValuesMatch = password === confirmation;
  console.info(
    `[password input diagnostic] passwordLengthsMatch=${passwordLengthsMatch ? 'yes' : 'no'} ` +
    `passwordsMatch=${passwordValuesMatch ? 'yes' : 'no'} inputCancelled=no`,
  );
  if (!passwordValuesMatch) {
    throw new Error('Passwords did not match; no update was made.');
  }

  activeStep = 'update_confirmation';
  const updateConfirmation = await readUpdateConfirmation();
  if (updateConfirmation !== 'UPDATE') {
    throw new Error('Confirmation was not exactly UPDATE; no update was made.');
  }

  activeStep = 'password_hashing';
  const passwordHash = await bcrypt.hash(password, 12);
  activeStep = 'database_update';
  const result = await Admin.updateOne(
    { _id: matches[0]._id, email: normalizedEmail },
    { $set: { passwordHash } },
    { runValidators: true },
  );

  console.log(`Exactly one existing admin password updated: ${result.modifiedCount === 1 ? 'yes' : 'no'}`);
  if (result.modifiedCount !== 1) process.exitCode = 1;
}

let activeStep = 'configuration';
main()
  .catch((error) => {
    // The error is deliberately not printed: only a stage label is emitted.
    // Use the locally tracked stage so credentials, hashes, and URIs stay private.
    if (error?.code === 'PASSWORD_INPUT_CANCELLED') passwordInputCancelled = true;
    if (activeStep === 'password_entry' || activeStep === 'password_confirmation') {
      console.info(
        `[password input diagnostic] passwordLengthsMatch=${passwordLengthsMatch === null ? 'not_checked' : passwordLengthsMatch ? 'yes' : 'no'} ` +
        `passwordsMatch=${passwordValuesMatch === null ? 'not_checked' : passwordValuesMatch ? 'yes' : 'no'} ` +
        `inputCancelled=${passwordInputCancelled ? 'yes' : 'no'}`,
      );
    }
    console.error(`Admin password repair stopped at step: ${activeStep}. No successful update was confirmed.`);
    process.exitCode = 1;
  })
  .finally(async () => {
    restoreNormalTerminalMode();
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } catch {
      // Do not print connection details during cleanup.
    }
  });
