const jwt = require('jsonwebtoken');
const axios = require('axios');

const keyId = '33KMBCBK36';
const issuerId = '69a6de90-3e02-47e3-e053-5b8c7c11a4d1';
const privateKey = `-----BEGIN PRIVATE KEY-----
-----END PRIVATE KEY-----`;

const jwtPayload = {
  iss: issuerId,
  exp: Math.floor(Date.now() / 1000) + 20 * 60, // Token expires in 20 minutes
  aud: 'appstoreconnect-v1'
};

const token = jwt.sign(jwtPayload, privateKey, {
  algorithm: 'ES256',
  keyid: keyId
});

const apiUrl = 'https://api.appstoreconnect.apple.com/v1/userInvitations/3a0f098e-96fa-4bbd-a87a-62b5421f9100';

axios.delete(apiUrl, {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
  .then(response => {
    console.log('Response:', JSON.stringify(response.data,undefined," "));
  })
  .catch(error => {
    console.error('Error:', error.response.data);
  });