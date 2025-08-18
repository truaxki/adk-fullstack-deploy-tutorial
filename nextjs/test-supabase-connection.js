// Quick test script to verify Supabase connection and table existence
// Run with: node test-supabase-connection.js

const { createBrowserClient } = require('@supabase/ssr');

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ycmnbeihxezxzaswbdqi.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljbW5iZWloeGV6eHphc3diZHFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzEwOTUsImV4cCI6MjA3MDQwNzA5NX0.tS-Ffh44_V-E_RrQ6HyDPJrhAJWWyfVT4G547zC-ayw';
  
  const supabase = createBrowserClient(supabaseUrl, supabaseKey);
  
  console.log('📊 Supabase URL:', supabaseUrl);
  console.log('🔑 Anon Key (first 20 chars):', supabaseKey.substring(0, 20) + '...');
  
  try {
    // Test 1: Check if we can connect and get auth user
    console.log('\n1️⃣ Testing auth connection...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Auth error:', authError.message);
    } else {
      console.log('✅ Auth connection successful');
      console.log('👤 Current user:', user ? user.email : 'No authenticated user');
    }
    
    // Test 2: Check if chat_sessions table exists
    console.log('\n2️⃣ Testing chat_sessions table...');
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ chat_sessions table error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      if (error.code === '42P01') {
        console.log('🚨 Table does not exist! You need to run the SQL migration in Supabase.');
      }
    } else {
      console.log('✅ chat_sessions table exists');
      console.log('📊 Table accessible, count:', data);
    }
    
    // Test 3: Test with a dummy user ID
    console.log('\n3️⃣ Testing session query...');
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID
    
    const { data: sessions, error: queryError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', testUserId);
      
    if (queryError) {
      console.log('❌ Session query error:', {
        message: queryError.message,
        details: queryError.details,
        hint: queryError.hint,
        code: queryError.code
      });
    } else {
      console.log('✅ Session query successful');
      console.log('📊 Sessions found:', sessions.length);
    }
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
  
  console.log('\n🏁 Test completed');
}

testSupabaseConnection().catch(console.error);