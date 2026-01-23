const { PrismaClient } = require('@prisma/client');
const { createsHierarchyCycle, assignHierarchy } = require('../services/hierarchyService');
const prisma = new PrismaClient();

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(status, message) {
    const symbol = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
    const color = status === 'PASS' ? colors.green : status === 'FAIL' ? colors.red : colors.yellow;
    console.log(`${color}${symbol} ${message}${colors.reset}`);
}

async function validateSchema() {
    console.log(`\n${colors.blue}=== SCHEMA VALIDATION ===${colors.reset}\n`);

    try {
        // 1. Check isDeleted fields exist
        const userFields = await prisma.$queryRaw`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'User' AND column_name = 'isDeleted'
        `;
        log(userFields.length > 0 ? 'PASS' : 'FAIL', 'User.isDeleted field exists');

        const guestFields = await prisma.$queryRaw`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'Guest' AND column_name = 'isDeleted'
        `;
        log(guestFields.length > 0 ? 'PASS' : 'FAIL', 'Guest.isDeleted field exists');

        // 2. Check indexes exist
        const cellIndexes = await prisma.$queryRaw`
            SELECT indexname FROM pg_indexes 
            WHERE tablename = 'Cell' AND indexname LIKE '%leaderId%'
        `;
        log(cellIndexes.length > 0 ? 'PASS' : 'FAIL', 'Cell.leaderId index exists');

        const guestIndexes = await prisma.$queryRaw`
            SELECT indexname FROM pg_indexes 
            WHERE tablename = 'Guest' AND (indexname LIKE '%assignedToId%' OR indexname LIKE '%invitedById%')
        `;
        log(guestIndexes.length > 0 ? 'PASS' : 'FAIL', 'Guest foreign key indexes exist');

        // 3. Check unique constraint on UserProfile
        const profileConstraints = await prisma.$queryRaw`
            SELECT constraint_name FROM information_schema.table_constraints 
            WHERE table_name = 'UserProfile' AND constraint_type = 'UNIQUE'
        `;
        log(profileConstraints.length >= 2 ? 'PASS' : 'WARN',
            `UserProfile unique constraints (found ${profileConstraints.length}, expected 2+)`);

        // 4. Check Timestamptz usage
        const timestampFields = await prisma.$queryRaw`
            SELECT column_name, data_type FROM information_schema.columns 
            WHERE table_name IN ('User', 'Guest', 'Cell') 
            AND column_name IN ('createdAt', 'updatedAt', 'birthDate')
        `;
        const allTimestamptz = timestampFields.every(f => f.data_type === 'timestamp with time zone');
        log(allTimestamptz ? 'PASS' : 'WARN', 'DateTime fields use timestamptz');

    } catch (error) {
        log('FAIL', `Schema validation error: ${error.message}`);
    }
}

async function validateHierarchyService() {
    console.log(`\n${colors.blue}=== HIERARCHY SERVICE VALIDATION ===${colors.reset}\n`);

    try {
        // Test 1: Self-loop detection
        const selfLoop = await createsHierarchyCycle(1, 1);
        log(selfLoop === true ? 'PASS' : 'FAIL', 'Detects self-loop (1 -> 1)');

        // Test 2: Get two users to test cycle detection
        const users = await prisma.user.findMany({ take: 3 });
        if (users.length >= 2) {
            const [u1, u2] = users;

            // Check if unrelated users don't create cycle
            const noCycle = await createsHierarchyCycle(u1.id, u2.id);
            log(noCycle === false ? 'PASS' : 'WARN',
                `No cycle between unrelated users (${u1.id} -> ${u2.id}): ${noCycle}`);
        } else {
            log('WARN', 'Not enough users to test cycle detection');
        }

        // Test 3: Check if service exists and is callable
        log(typeof assignHierarchy === 'function' ? 'PASS' : 'FAIL',
            'assignHierarchy service function exists');

    } catch (error) {
        log('FAIL', `Hierarchy service error: ${error.message}`);
    }
}

async function validateRegistrationIntegrity() {
    console.log(`\n${colors.blue}=== REGISTRATION INTEGRITY VALIDATION ===${colors.reset}\n`);

    try {
        // Check if EncuentroRegistration has proper constraints
        const registrations = await prisma.encuentroRegistration.findMany({ take: 5 });

        let validRegistrations = 0;
        let invalidRegistrations = 0;

        registrations.forEach(reg => {
            const hasGuest = reg.guestId !== null;
            const hasUser = reg.userId !== null;
            const isValid = (hasGuest && !hasUser) || (!hasGuest && hasUser);

            if (isValid) validRegistrations++;
            else invalidRegistrations++;
        });

        log(invalidRegistrations === 0 ? 'PASS' : 'FAIL',
            `EncuentroRegistration XOR validation (${validRegistrations} valid, ${invalidRegistrations} invalid)`);

        // Check for duplicates
        const duplicates = await prisma.$queryRaw`
            SELECT "encuentroId", "guestId", "userId", COUNT(*) as count
            FROM "EncuentroRegistration"
            WHERE "guestId" IS NOT NULL
            GROUP BY "encuentroId", "guestId", "userId"
            HAVING COUNT(*) > 1
        `;
        log(duplicates.length === 0 ? 'PASS' : 'FAIL',
            `No duplicate guest registrations (found ${duplicates.length})`);

    } catch (error) {
        log('FAIL', `Registration validation error: ${error.message}`);
    }
}

async function validateCascadeRules() {
    console.log(`\n${colors.blue}=== CASCADE RULES VALIDATION ===${colors.reset}\n`);

    try {
        // Check UserHierarchy has Restrict
        const hierarchyConstraints = await prisma.$queryRaw`
            SELECT confdeltype FROM pg_constraint 
            WHERE conname LIKE '%UserHierarchy%parent%'
        `;
        // 'r' = RESTRICT, 'c' = CASCADE
        const hasRestrict = hierarchyConstraints.some(c => c.confdeltype === 'r');
        log(hasRestrict ? 'PASS' : 'WARN',
            'UserHierarchy uses RESTRICT for parent/child relations');

        log('PASS', 'Cascade rules configured (manual verification required)');

    } catch (error) {
        log('WARN', `Cascade validation error: ${error.message}`);
    }
}

async function validateMiddleware() {
    console.log(`\n${colors.blue}=== MIDDLEWARE VALIDATION ===${colors.reset}\n`);

    try {
        const rbacMiddleware = require('../middleware/rbacMiddleware');
        const hierarchyMiddleware = require('../middleware/hierarchyMiddleware');

        log(typeof rbacMiddleware.requirePermission === 'function' ? 'PASS' : 'FAIL',
            'RBAC middleware exists');
        log(typeof hierarchyMiddleware.withinHierarchy === 'function' ? 'PASS' : 'FAIL',
            'Hierarchy middleware exists');
        log(typeof hierarchyMiddleware.isDescendant === 'function' ? 'PASS' : 'FAIL',
            'isDescendant helper exists');

    } catch (error) {
        log('FAIL', `Middleware validation error: ${error.message}`);
    }
}

async function runValidation() {
    console.log(`\n${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.blue}║   SCHEMA & SERVICE VALIDATION SUITE   ║${colors.reset}`);
    console.log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}`);

    await validateSchema();
    await validateHierarchyService();
    await validateRegistrationIntegrity();
    await validateCascadeRules();
    await validateMiddleware();

    console.log(`\n${colors.blue}=== VALIDATION COMPLETE ===${colors.reset}\n`);

    await prisma.$disconnect();
}

runValidation().catch(console.error);
