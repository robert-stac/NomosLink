import { describe, it, expect } from 'vitest';
import { buildExpenseRecord, buildExpenseForDb } from './expenseUtils.js';

describe('expense utils', () => {
  it('buildExpenseRecord preserves linked file and staff details', () => {
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

    expect(record.type).toBe('out');
    expect(record.staffName).toBe('Jane');
    expect(record.relatedFileId).toBe('case-1');
    expect(record.relatedFileName).toBe('Case Alpha');
  });

  it('buildExpenseForDb includes the linking fields for persistence', () => {
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

    expect(payload.relatedFileId).toBe('tx-1');
    expect(payload.relatedFileType).toBe('transaction');
    expect(payload.type).toBe('out');
  });
});
