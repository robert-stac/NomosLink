import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExpenseRecord, buildExpenseForDb } from './expenseUtils.js';

test('buildExpenseRecord preserves linked file and staff details', () => {
  const record = buildExpenseRecord({
    id: 'exp-1',
    baseData: {
      date: '2026-07-17',
      amount: 5000,
      description: 'Printer ink',
      purpose: 'Printer ink',
      category: 'Expense',
    },
    formData: {
      type: 'out',
      date: '2026-07-17',
      purpose: 'Printer ink',
      amount: '5000',
      staffId: 'staff-1',
      staffName: 'Jane',
      relatedFileId: 'case-1',
      relatedFileType: 'case',
      relatedFileName: 'Case Alpha',
    },
    currentUser: { id: 'user-1', name: 'John' },
  });

  assert.equal(record.type, 'out');
  assert.equal(record.staffName, 'Jane');
  assert.equal(record.relatedFileId, 'case-1');
  assert.equal(record.relatedFileName, 'Case Alpha');
});

test('buildExpenseForDb includes the linking fields for persistence', () => {
  const payload = buildExpenseForDb({
    id: 'exp-2',
    amount: 1200,
    date: '2026-07-17',
    description: 'Transport',
    purpose: 'Transport',
    category: 'Expense',
    addedById: 'user-1',
    addedByName: 'John',
    type: 'out',
    staffId: 'staff-1',
    staffName: 'Jane',
    relatedFileId: 'tx-1',
    relatedFileType: 'transaction',
    relatedFileName: 'Transaction 001',
  });

  assert.equal(payload.relatedFileId, 'tx-1');
  assert.equal(payload.relatedFileType, 'transaction');
  assert.equal(payload.type, 'out');
});
