// Test the actual API endpoint with Jose Carlos credentials
const axios = require('axios');

async function testAPI() {
    try {
        // First login as Jose Carlos
        console.log('Logging in as Jose Carlos...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'jose.sarmiento@example.com',
            password: 'password123'
        });

        const token = loginRes.data.token;
        const user = loginRes.data.user;

        console.log('Logged in successfully:');
        console.log(`- User: ${user.fullName}`);
        console.log(`- ID: ${user.id}`);
        console.log(`- Role: ${user.role}`);

        // Now fetch guests
        console.log('\nFetching guests...');
        const guestsRes = await axios.get('http://localhost:5000/api/guests', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const guests = guestsRes.data.guests;
        console.log(`\nGuests returned: ${guests.length}`);

        if (guests.length > 0) {
            console.log('\n❌ BUG: Jose Carlos is seeing guests:');
            guests.forEach(g => {
                console.log(`- ${g.name} (invited by: ${g.invitedBy.fullName}, assigned to: ${g.assignedTo?.fullName || 'none'})`);
            });
        } else {
            console.log('\n✓ Correct: Jose Carlos sees no guests');
        }

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testAPI();
