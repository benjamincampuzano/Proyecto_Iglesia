const { validatePassword } = require('../utils/passwordValidator');

const testCases = [
    {
        name: 'Empty password',
        password: '',
        context: {},
        expected: false
    },
    {
        name: 'Too short',
        password: 'Ab1!',
        context: {},
        expected: false
    },
    {
        name: 'Missing uppercase',
        password: 'password1!',
        context: {},
        expected: false
    },
    {
        name: 'Missing lowercase',
        password: 'PASSWORD1!',
        context: {},
        expected: false
    },
    {
        name: 'Missing number',
        password: 'Password!',
        context: {},
        expected: false
    },
    {
        name: 'Missing symbol',
        password: 'Password1',
        context: {},
        expected: false
    },
    {
        name: 'Common password',
        password: 'Password123!',
        context: {},
        expected: false // "password" is in commonPasswords
    },
    {
        name: 'Contains email',
        password: 'User12345!',
        context: { email: 'user@example.com' },
        expected: false
    },
    {
        name: 'Contains name',
        password: 'Juan12345!',
        context: { fullName: 'Juan Perez' },
        expected: false
    },
    {
        name: 'Valid strong password',
        password: 'K3y#Board$99',
        context: { email: 'test@test.com', fullName: 'Example User' },
        expected: true
    }
];

console.log('Running Password Validation Tests...\n');

let passed = 0;
testCases.forEach(tc => {
    const result = validatePassword(tc.password, tc.context);
    const isOk = result.isValid === tc.expected;
    if (isOk) {
        console.log(`✅ [PASS] ${tc.name}`);
        passed++;
    } else {
        console.log(`❌ [FAIL] ${tc.name}`);
        console.log(`   Expected: ${tc.expected}, Got: ${result.isValid}`);
        console.log(`   Message: ${result.message}`);
    }
});

console.log(`\nTests finished. ${passed}/${testCases.length} passed.`);

if (passed === testCases.length) {
    process.exit(0);
} else {
    process.exit(1);
}
