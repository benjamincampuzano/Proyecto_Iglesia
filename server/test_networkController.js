/**
 * Unit tests for network management endpoints
 * Tests the controller functions for managing discipleship networks
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Test data
const testLeaderId = 1; // Assuming user with ID 1 exists
const testUserId = 2;   // Assuming user with ID 2 exists

/**
 * Test getAvailableUsers endpoint
 */
async function testGetAvailableUsers() {
    console.log('\n=== Testing getAvailableUsers ===');

    try {
        // Mock request and response
        const req = {
            params: { leaderId: testLeaderId },
            user: { id: testLeaderId, role: 'LIDER_DOCE' }
        };

        const res = {
            json: (data) => {
                console.log('✓ Available users fetched successfully');
                console.log(`  Found ${data.length} available users`);
                return data;
            },
            status: (code) => ({
                json: (data) => {
                    console.log(`✗ Error ${code}:`, data.error);
                    return data;
                }
            })
        };

        // Import controller
        const { getAvailableUsers } = require('./controllers/networkController');
        await getAvailableUsers(req, res);

    } catch (error) {
        console.error('✗ Test failed:', error.message);
    }
}

/**
 * Test assignUserToLeader endpoint
 */
async function testAssignUserToLeader() {
    console.log('\n=== Testing assignUserToLeader ===');

    try {
        // First, ensure the test user has no leader
        await prisma.user.update({
            where: { id: testUserId },
            data: { leaderId: null }
        });

        // Mock request and response
        const req = {
            body: { userId: testUserId, leaderId: testLeaderId },
            user: { id: testLeaderId, role: 'LIDER_DOCE' }
        };

        const res = {
            json: (data) => {
                console.log('✓ User assigned successfully');
                console.log(`  ${data.user.fullName} assigned to leader ID ${data.user.leaderId}`);
                return data;
            },
            status: (code) => ({
                json: (data) => {
                    console.log(`✗ Error ${code}:`, data.error);
                    return data;
                }
            })
        };

        // Import controller
        const { assignUserToLeader } = require('./controllers/networkController');
        await assignUserToLeader(req, res);

    } catch (error) {
        console.error('✗ Test failed:', error.message);
    }
}

/**
 * Test removeUserFromNetwork endpoint
 */
async function testRemoveUserFromNetwork() {
    console.log('\n=== Testing removeUserFromNetwork ===');

    try {
        // Ensure the test user has a leader (from previous test)
        const user = await prisma.user.findUnique({
            where: { id: testUserId }
        });

        if (!user.leaderId) {
            console.log('⚠ Skipping test: User has no leader to remove');
            return;
        }

        // Mock request and response
        const req = {
            params: { userId: testUserId },
            user: { id: testLeaderId, role: 'LIDER_DOCE' }
        };

        const res = {
            json: (data) => {
                console.log('✓ User removed successfully');
                console.log(`  ${data.user.fullName} removed from network`);
                return data;
            },
            status: (code) => ({
                json: (data) => {
                    console.log(`✗ Error ${code}:`, data.error);
                    return data;
                }
            })
        };

        // Import controller
        const { removeUserFromNetwork } = require('./controllers/networkController');
        await removeUserFromNetwork(req, res);

    } catch (error) {
        console.error('✗ Test failed:', error.message);
    }
}

/**
 * Test permission checks
 */
async function testPermissions() {
    console.log('\n=== Testing Permission Checks ===');

    try {
        // Test 1: DISCIPULO should not be able to assign users
        console.log('\nTest 1: DISCIPULO attempting to assign user');
        const req1 = {
            body: { userId: testUserId, leaderId: testLeaderId },
            user: { id: 999, role: 'DISCIPULO' }
        };

        const res1 = {
            json: (data) => {
                console.log('✗ DISCIPULO was able to assign (should fail)');
                return data;
            },
            status: (code) => ({
                json: (data) => {
                    if (code === 403) {
                        console.log('✓ Permission denied correctly:', data.error);
                    } else {
                        console.log(`✗ Unexpected error ${code}:`, data.error);
                    }
                    return data;
                }
            })
        };

        const { assignUserToLeader } = require('./controllers/networkController');
        await assignUserToLeader(req1, res1);

        // Test 2: User trying to assign to another leader's network
        console.log('\nTest 2: LIDER_CELULA attempting to assign to another network');
        const req2 = {
            body: { userId: testUserId, leaderId: testLeaderId },
            user: { id: 888, role: 'LIDER_CELULA' } // Different from testLeaderId
        };

        const res2 = {
            json: (data) => {
                console.log('✗ User was able to assign to another network (should fail)');
                return data;
            },
            status: (code) => ({
                json: (data) => {
                    if (code === 403) {
                        console.log('✓ Permission denied correctly:', data.error);
                    } else {
                        console.log(`✗ Unexpected error ${code}:`, data.error);
                    }
                    return data;
                }
            })
        };

        await assignUserToLeader(req2, res2);

    } catch (error) {
        console.error('✗ Test failed:', error.message);
    }
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('========================================');
    console.log('Network Management Controller Tests');
    console.log('========================================');

    try {
        await testGetAvailableUsers();
        await testAssignUserToLeader();
        await testRemoveUserFromNetwork();
        await testPermissions();

        console.log('\n========================================');
        console.log('All tests completed');
        console.log('========================================\n');

    } catch (error) {
        console.error('Test suite failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run tests if executed directly
if (require.main === module) {
    runTests();
}

module.exports = { runTests };
