// test-email-logic.js

const tests = [
    { assignedRole: 'lawyer', authorRole: 'admin', expectedEmail: true, testName: 'Lawyer gets email when admin adds note' },
    { assignedRole: 'lawyer', authorRole: 'manager', expectedEmail: true, testName: 'Lawyer gets email when manager adds note' },
    { assignedRole: 'lawyer', authorRole: 'lawyer', expectedEmail: false, testName: 'Lawyer does NOT get email when another lawyer adds note' },
    { assignedRole: 'manager', authorRole: 'admin', expectedEmail: true, testName: 'Manager gets email when admin adds note to their file' },
    { assignedRole: 'manager', authorRole: 'lawyer', expectedEmail: true, testName: 'Manager gets email when lawyer adds note to their file' },
    { assignedRole: 'manager', authorRole: 'manager', expectedEmail: true, testName: 'Manager gets email when another manager adds note to their file' },
    { assignedRole: 'admin', authorRole: 'lawyer', expectedEmail: false, testName: 'Admin does not get this specific assigned user email' },
];

let allPassed = true;

console.log("Running email logic tests...");

tests.forEach(t => {
    const isAssignedLawyer = t.assignedRole === 'lawyer';
    const isAssignedManager = t.assignedRole === 'manager';
    const isAuthorManagerOrAdmin = t.authorRole === 'manager' || t.authorRole === 'admin';

    const wouldSendEmail = (isAssignedLawyer && isAuthorManagerOrAdmin) || isAssignedManager;

    const passed = wouldSendEmail === t.expectedEmail;
    if (!passed) allPassed = false;

    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${t.testName}`);
    if (!passed) {
        console.log(`   Expected email sent: ${t.expectedEmail}, but got: ${wouldSendEmail}`);
    }
});

if (allPassed) {
    console.log("\\n✅ All logic tests passed!");
} else {
    console.log("\\n❌ Some tests failed.");
}
