import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env file
const envPath = join(__dirname, '..', '.env');
const env = dotenv.config({ path: envPath }).parsed;

// Read the service worker template
const swPath = join(__dirname, '..', 'public', 'firebase-messaging-sw.js');
let swContent = readFileSync(swPath, 'utf-8');

// Replace placeholders with actual values
swContent = swContent
  .replace('"___FIREBASE_API_KEY___"', `"${env.VITE_FIREBASE_API_KEY || ''}"`)
  .replace('"___FIREBASE_AUTH_DOMAIN___"', `"${env.VITE_FIREBASE_AUTH_DOMAIN || ''}"`)
  .replace('"___FIREBASE_PROJECT_ID___"', `"${env.VITE_FIREBASE_PROJECT_ID || ''}"`)
  .replace('"___FIREBASE_STORAGE_BUCKET___"', `"${env.VITE_FIREBASE_STORAGE_BUCKET || ''}"`)
  .replace('"___FIREBASE_MESSAGING_SENDER_ID___"', `"${env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''}"`)
  .replace('"___FIREBASE_APP_ID___"', `"${env.VITE_FIREBASE_APP_ID || ''}"`);

// Write the generated service worker
const outputPath = join(__dirname, '..', 'dist', 'firebase-messaging-sw.js');
writeFileSync(outputPath, swContent);

console.log('Service worker generated successfully!');
