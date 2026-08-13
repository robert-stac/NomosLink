import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function testUpsert() {
  const payload = {
      id: 'f8971dc9-758a-4a10-87ff-260be3969bb7',
      caseId: '1772791554043',
      caseFileName: 'Najjemba Sharon',
      title: 'Trial Documents',
      description: 'Dear Richard, please ensure that all the trial documents for this matter are ready before the next court date on 5 May 2026.',
      deadline: '2026-04-28',
      assignedToId: '4a4d9a7e-a646-4a39-b52b-8bec4f38feef',
      assignedToName: 'Muzingu Richard',
      requestedById: 'adcb6f08-842d-4c2d-aadd-2e833e794038',
      requestedByName: 'Ssebulime Isaac',
      status: 'Completed', // CHANGED
      documentUrl: null,
      documentName: null,
      hoursSpent: 1.5, // Added
      completionNote: 'Done', // Added
      dateCreated: '2026-03-19T07:47:37.383+00:00',
      dateCompleted: new Date().toISOString() // Added
  };

  const { data, error } = await supabase.from('draft_requests').upsert(payload, { onConflict: 'id' });
  console.log("Error:", error);
  console.log("Data:", data);
}

testUpsert();
