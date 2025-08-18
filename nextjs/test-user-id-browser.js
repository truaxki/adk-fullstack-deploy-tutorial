// Browser Console Test Functions
// Copy and paste these functions into your browser console while on the app

// Test 1: Check current authentication state
async function testAuthState() {
  console.log('🔍 Testing authentication state...');
  
  // Get Supabase client (assuming it's available globally or via window)
  const { createClient } = await import('./src/lib/supabase/client.js');
  const supabase = createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  console.log('👤 Current auth state:', {
    authenticated: !!user,
    userId: user?.id,
    email: user?.email,
    provider: user?.app_metadata?.provider,
    created: user?.created_at,
    error: error?.message
  });
  
  return user;
}

// Test 2: Check if user can query chat_sessions
async function testSupabaseQuery() {
  console.log('📊 Testing Supabase query permissions...');
  
  const { createClient } = await import('./src/lib/supabase/client.js');
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('count', { count: 'exact', head: true });
    
  console.log('📊 Query result:', {
    success: !error,
    count: data,
    error: error ? {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    } : null
  });
  
  return { data, error };
}

// Test 3: Try a manual INSERT
async function testManualInsert() {
  console.log('✍️ Testing manual INSERT...');
  
  const { createClient } = await import('./src/lib/supabase/client.js');
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('❌ Not authenticated');
    return;
  }
  
  const testData = {
    id: crypto.randomUUID(),
    user_id: user.id,
    adk_session_id: `test-browser-${Date.now()}`,
    session_title: 'Browser Test Session',
    session_metadata: { test: true },
    message_count: 0
  };
  
  console.log('📝 Attempting INSERT with:', testData);
  
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert(testData)
    .select()
    .single();
    
  console.log('📝 INSERT result:', {
    success: !error,
    data: data,
    error: error ? {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    } : null
  });
  
  return { data, error };
}

// Test 4: Run all tests
async function runAllTests() {
  console.log('🧪 Running all user ID extraction tests...');
  
  console.log('\n=== Test 1: Auth State ===');
  const user = await testAuthState();
  
  console.log('\n=== Test 2: Query Permissions ===');
  await testSupabaseQuery();
  
  if (user) {
    console.log('\n=== Test 3: Manual Insert ===');
    await testManualInsert();
  }
  
  console.log('\n🏁 All tests completed!');
}

console.log('🧪 User ID Test Functions Loaded!');
console.log('Run: runAllTests() to test everything');
console.log('Or run individual tests: testAuthState(), testSupabaseQuery(), testManualInsert()');