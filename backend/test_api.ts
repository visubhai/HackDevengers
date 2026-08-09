import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const token = jwt.sign(
    { id: '65e31f4e1f82d1b712345678', role: 'SUPER_ADMIN' },
    process.env.JWT_SECRET || 'secret'
);

console.log("Token:", token);

fetch('http://localhost:3001/api/branches/some_id', {
    method: 'PUT',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: "Testing" })
}).then(async res => {
    console.log("Status:", res.status);
    console.log("Body:", await res.json());
}).catch(console.error);
