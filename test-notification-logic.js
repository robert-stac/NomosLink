// test-notification-logic.js

const mockCurrentUser = { id: "user-current", role: "lawyer" };
const mockLawyerId = "user-assigned-lawyer";

const createMockFile = (notes) => ({
    id: "file-123",
    fileName: "Test File",
    lawyerId: mockLawyerId,
    progressNotes: notes,
});

const runTest = (name, notes, expectedManagersLength, expectedManagerIds) => {
    const file = createMockFile(notes);

    const commentedManagers = new Set(
        (file.progressNotes || [])
            .filter(n => n.authorRole === 'manager')
            .map(n => String(n.authorId))
    );
    commentedManagers.delete(String(mockCurrentUser.id));
    if (file.lawyerId) commentedManagers.delete(String(file.lawyerId));

    const resultIds = Array.from(commentedManagers);
    const passedLength = resultIds.length === expectedManagersLength;
    const passedIds = expectedManagerIds.every(id => resultIds.includes(id)) && resultIds.every(id => expectedManagerIds.includes(id));

    const passed = passedLength && passedIds;

    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}`);
    if (!passed) {
        console.log(`   Expected IDs: [${expectedManagerIds.join(', ')}]`);
        console.log(`   Got IDs:      [${resultIds.join(', ')}]`);
    }
};

runTest(
    "Finds one previous manager",
    [
        { authorId: "manager-1", authorRole: "manager" },
        { authorId: "lawyer-1", authorRole: "lawyer" }
    ],
    1,
    ["manager-1"]
);

runTest(
    "Finds multiple unique managers, ignores duplicates",
    [
        { authorId: "manager-1", authorRole: "manager" },
        { authorId: "manager-2", authorRole: "manager" },
        { authorId: "manager-1", authorRole: "manager" }
    ],
    2,
    ["manager-1", "manager-2"]
);

runTest(
    "Ignores current user if they are a manager",
    [
        { authorId: "user-current", authorRole: "manager" },
        { authorId: "manager-2", authorRole: "manager" } // user-current happens to be a manager here visually, simulating self action
    ],
    1,
    ["manager-2"]
);

runTest(
    "Ignores assigned lawyer even if they are somehow a manager role",
    [
        { authorId: "manager-1", authorRole: "manager" },
        { authorId: "user-assigned-lawyer", authorRole: "manager" }
    ],
    1,
    ["manager-1"]
);

console.log("Finished running tests.");
