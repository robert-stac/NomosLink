import React, { useRef, useState } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import useFocusTrap from './useFocusTrap';

function TestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useFocusTrap(ref, open, onClose);
  if (!open) return null;
  return (
    <div ref={ref} role="dialog" aria-modal="true">
      <button>First</button>
      <button>Second</button>
      <button>Last</button>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('focuses first element and traps Tab/Escape', async () => {
    function Wrapper() {
      const [open, setOpen] = useState(true);
      return (
        <div>
          <button>Outside</button>
          <TestModal open={open} onClose={() => setOpen(false)} />
        </div>
      );
    }

    const { getByText, queryByRole } = render(<Wrapper />);
    const first = getByText('First');
    await waitFor(() => {
      expect(document.activeElement).toBe(first);
    });

    // Tab cycles to second
    fireEvent.keyDown(document, { key: 'Tab' });
    const second = getByText('Second');
    await waitFor(() => {
      expect(document.activeElement).toBe(second);
    });

    // Shift+Tab back to first
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    await waitFor(() => {
      expect(document.activeElement).toBe(first);
    });

    // Escape closes modal
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(queryByRole('dialog')).toBeNull();
    });
  });
});
