const CryptoJS = require('crypto-js');
require('dotenv').config();

const TOKENIZATION_KEY = process.env.TOKENIZATION_KEY || 'default_secret_key';

function tokenize(text) {
  if (!text) return '';
  const ciphertext = CryptoJS.AES.encrypt(text, TOKENIZATION_KEY).toString();
  return ciphertext;
}

function detokenize(token) {
  if (!token) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(token, TOKENIZATION_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText;
  } catch (err) {
    return '';
  }
}

module.exports = {
  tokenize,
  detokenize,
}; 