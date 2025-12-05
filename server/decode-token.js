const jwt = require('jsonwebtoken');

// Get token from command line argument
const token = process.argv[2];

if (!token) {
    console.log('Usage: node decode-token.js <token>');
    console.log('\nTo get your token:');
    console.log('1. Open browser DevTools (F12)');
    console.log('2. Go to Console tab');
    console.log('3. Type: localStorage.getItem("token")');
    console.log('4. Copy the token and run: node decode-token.js YOUR_TOKEN');
    process.exit(1);
}

try {
    // Decode without verification to see payload
    const decoded = jwt.decode(token);
    console.log('Token payload:');
    console.log(JSON.stringify(decoded, null, 2));

    console.log('\n--- User Info ---');
    console.log(`User ID: ${decoded.id}`);
    console.log(`Role: ${decoded.role}`);

    // Also get user from localStorage
    console.log('\n--- Instructions ---');
    console.log('Compare this with localStorage.getItem("user") in browser console');
    console.log('If they don\'t match, logout and login again');
} catch (error) {
    console.error('Error decoding token:', error.message);
}
