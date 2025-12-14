
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mock request and response objects
const mockRequest = (userRole, body = {}, params = {}) => ({
    user: { id: 999, role: userRole },
    body,
    params
});

const mockResponse = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

// Import controller functions
// Note: We need to require the controller file. 
// Since we are running this script from the server root, the path is ./controllers/networkController
const networkController = require('./controllers/networkController');

async function testPastorRestrictions() {
    console.log('--- Testing PASTOR Restrictions ---');

    console.log('Test 1: PASTOR tries to assign user (Should be forbidden)');
    const reqAssign = mockRequest('PASTOR', { userId: 1, leaderId: 2 });
    const resAssign = mockResponse();

    try {
        await networkController.assignUserToLeader(reqAssign, resAssign);
        if (resAssign.statusCode === 403) {
            console.log('PASS: PASTOR was forbidden from assigning user.');
        } else {
            console.log(`FAIL: Expected 403, got ${resAssign.statusCode}`);
        }
    } catch (e) {
        console.log('ERROR:', e);
    }

    console.log('\nTest 2: PASTOR tries to remove user (Should be forbidden)');
    const reqRemove = mockRequest('PASTOR', {}, { userId: 1 });
    const resRemove = mockResponse();

    try {
        await networkController.removeUserFromNetwork(reqRemove, resRemove);
        if (resRemove.statusCode === 403) {
            console.log('PASS: PASTOR was forbidden from removing user.');
        } else {
            console.log(`FAIL: Expected 403, got ${resRemove.statusCode}`);
        }
    } catch (e) {
        console.log('ERROR:', e);
    }
}

async function run() {
    await testPastorRestrictions();
    await prisma.$disconnect();
}

run();
