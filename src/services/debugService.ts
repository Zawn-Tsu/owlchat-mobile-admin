import { apiClient } from './apiClient';

/**
 * Debug Service - Test API connections và response format
 */
export const DebugService = {
  async testAllApis() {
    console.log('🔍 === STARTING API DEBUG TEST ===');
    
    const results = {
      user: { status: null, data: null, error: null, format: null },
      chat: { status: null, data: null, error: null, format: null },
      message: { status: null, data: null, error: null, format: null },
      friendship: { status: null, data: null, error: null, format: null },
      friendRequest: { status: null, data: null, error: null, format: null },
      block: { status: null, data: null, error: null, format: null }
    };

    // Test 1: User API
    try {
      console.log('📌 Testing User API: GET /account?size=1');
      const res = await apiClient.user.get('/account', { params: { size: 1 } });
      results.user.status = res.status;
      results.user.data = res.data;
      
      // Detect format
      if (Array.isArray(res.data)) {
        results.user.format = 'PLAIN_ARRAY';
        console.log('✅ User API OK - Format: PLAIN_ARRAY (length=' + res.data.length + ')');
      } else if (res.data?.data?.content) {
        results.user.format = 'WRAPPED_WITH_CONTENT';
        console.log('✅ User API OK - Format: WRAPPED (has content & totalElements)');
      } else if (Array.isArray(res.data?.data)) {
        results.user.format = 'WRAPPED_PLAIN_ARRAY';
        console.log('✅ User API OK - Format: WRAPPED_PLAIN (data is array)');
      } else {
        results.user.format = 'UNKNOWN';
        console.log('✅ User API OK - Format: UNKNOWN');
      }
      console.log('   Raw response:', res.data);
    } catch (err: any) {
      results.user.error = err.message;
      console.error('❌ User API ERROR:', err.message, err.response?.data);
    }

    // Test 2: Chat API
    try {
      console.log('\n📌 Testing Chat API: GET /admin/chat?size=1');
      const res = await apiClient.chat.get('/admin/chat', { params: { size: 1 } });
      results.chat.status = res.status;
      results.chat.data = res.data;
      
      if (Array.isArray(res.data)) {
        results.chat.format = 'PLAIN_ARRAY';
        console.log('✅ Chat API OK - Format: PLAIN_ARRAY');
      } else if (res.data?.data?.content) {
        results.chat.format = 'WRAPPED_WITH_CONTENT';
        console.log('✅ Chat API OK - Format: WRAPPED');
      } else {
        results.chat.format = 'WRAPPED_PLAIN_ARRAY';
      }
      console.log('   Raw response:', res.data);
    } catch (err: any) {
      results.chat.error = err.message;
      console.error('❌ Chat API ERROR:', err.message, err.response?.data);
    }

    // Test 3: Message API
    try {
      console.log('\n📌 Testing Message API: GET /admin/message?size=1');
      const res = await apiClient.chat.get('/admin/message', { params: { size: 1 } });
      results.message.status = res.status;
      results.message.data = res.data;
      if (Array.isArray(res.data)) results.message.format = 'PLAIN_ARRAY';
      console.log('✅ Message API OK - Format:', results.message.format);
      console.log('   Raw response:', res.data);
    } catch (err: any) {
      results.message.error = err.message;
      console.error('❌ Message API ERROR:', err.message);
    }

    // Test 4: Friendship API
    try {
      console.log('\n📌 Testing Friendship API: GET /admin/friendship?size=1');
      const res = await apiClient.social.get('/admin/friendship', { params: { size: 1 } });
      results.friendship.status = res.status;
      results.friendship.data = res.data;
      if (Array.isArray(res.data)) results.friendship.format = 'PLAIN_ARRAY';
      console.log('✅ Friendship API OK - Format:', results.friendship.format);
      console.log('   Raw response:', res.data);
    } catch (err: any) {
      results.friendship.error = err.message;
      console.error('❌ Friendship API ERROR:', err.message);
    }

    // Test 5: Friend Request API
    try {
      console.log('\n📌 Testing Friend Request API: GET /admin/friend-request?size=1');
      const res = await apiClient.social.get('/admin/friend-request', { params: { size: 1 } });
      results.friendRequest.status = res.status;
      results.friendRequest.data = res.data;
      if (Array.isArray(res.data)) results.friendRequest.format = 'PLAIN_ARRAY';
      console.log('✅ Friend Request API OK - Format:', results.friendRequest.format);
      console.log('   Raw response:', res.data);
    } catch (err: any) {
      results.friendRequest.error = err.message;
      console.error('❌ Friend Request API ERROR:', err.message);
    }

    // Test 6: Block API
    try {
      console.log('\n📌 Testing Block API: GET /admin/block?size=1');
      const res = await apiClient.social.get('/admin/block', { params: { size: 1 } });
      results.block.status = res.status;
      results.block.data = res.data;
      if (Array.isArray(res.data)) results.block.format = 'PLAIN_ARRAY';
      console.log('✅ Block API OK - Format:', results.block.format);
      console.log('   Raw response:', res.data);
    } catch (err: any) {
      results.block.error = err.message;
      console.error('❌ Block API ERROR:', err.message);
    }

    console.log('\n🔍 === DEBUG TEST COMPLETE ===');
    console.log('\n📊 Summary:');
    Object.entries(results).forEach(([key, val]: any) => {
      const status = val.error ? '❌ FAILED' : '✅ OK';
      const format = val.format || 'N/A';
      console.log(`  ${key}: ${status} (Format: ${format})`);
    });
    
    return results;
  }
};
