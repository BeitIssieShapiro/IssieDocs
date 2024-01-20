const fs = require("fs");

const jwt = require('jsonwebtoken');
const axios = require('axios');

const p8 = fs.readFileSync("/Users/i022021/Library/CloudStorage/OneDrive-SAPSE/Documents/BeirIssieShapiro/pkey-for-api-access-appstore-connect.p8")
const keyId = '33KMBCBK36';
const issuerId = '69a6de90-3e02-47e3-e053-5b8c7c11a4d1';
const privateKey = p8.toLocaleString();

const jwtPayload = {
    iss: issuerId,
    exp: Math.floor(Date.now() / 1000) + 20 * 60, // Token expires in 20 minutes
    aud: 'appstoreconnect-v1'
};

const token = jwt.sign(jwtPayload, privateKey, {
    algorithm: 'ES256',
    keyid: keyId
});

const apiUrl = "https://api.appstoreconnect.apple.com"

const userInvitationsPath = "/v1/userInvitations";
const usersPath = "/v1/users"


function getInvitations() {
    axios.get(apiUrl + userInvitationsPath, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
        .then(response => {
            console.log('Response:', JSON.stringify(response.data.data, undefined, " "));
        })
        .catch(error => {
            console.error('Error:', error.response.data);
        });
}

function deleteInvitation(id) {
    axios.delete(apiUrl + userInvitationsPath + "/" + id, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
        .then(response => {
            console.log('Response:', JSON.stringify(response.data, undefined, " "));
        })
        .catch(error => {
            console.error('Error:', error.response.data);
        });

}


function listUsers(filterEmailStartsWith) {
    axios.get(apiUrl + usersPath, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
        .then(response => {
            console.log('Response:', JSON.stringify(response.data.data.filter(f => f.attributes.username.startsWith(filterEmailStartsWith)), undefined, " "));
        })
        .catch(error => {
            console.error('Error:', error.response.data);
        });
}


// function updateInviteExpiration(id, newDate) {
//     const patch = {
//         "attributes": {
//             "expirationDate": newDate,
//         }
//     };
//     axios.patch(apiUrl + userInvitationsPath + "/" + id,
//     patch,
//         {
//             headers: {
//                 Authorization: `Bearer ${token}`
//             }
//         })
//         .then(response => {
//             console.log('Response:', JSON.stringify(response.data, undefined, " "));
//         })
//         .catch(error => {
//             console.error('Error:', error.response.data);
//         });
// }
//getInvitations()
deleteInvitation("2b6b0ad1-2953-4d87-969a-3c8f7e808cae")
//listUsers("chani")
