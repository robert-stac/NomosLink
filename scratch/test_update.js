import { createClient } from '@supabase/supabase-js';
const url = 'https://wxqpryxgsayeikahlabl.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cXByeXhnc2F5ZWlrYWhsYWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzQzMzQsImV4cCI6MjA5OTUxMDMzNH0.HXVvEUl7ZtBlKwDAeHXt8sTJqUU3q_BUXEjsAQRHWt0';
const sb = createClient(url, key);

async function test() {
  const { data: cases } = await sb.from('court_cases').select('*').limit(1);
  if (!cases || cases.length === 0) return console.log('No cases found');
  const id = cases[0].id;
  const oldNotes = cases[0].progressNotes || [];
  
  const newNote = {
    id: 'test-note-id',
    message: 'Test note',
    authorId: '123',
    authorName: 'Test',
    authorRole: 'admin',
    date: new Date().toISOString()
  };

  const { data, error } = await sb.from('court_cases').update({
    progressNotes: [...oldNotes, newNote]
  }).eq('id', id).select();

  console.log('Update Error:', error);
  console.log('Update Data:', data);
}
test();
