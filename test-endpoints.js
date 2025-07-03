// Test script to validate the collaborative features endpoints
const BASE_URL = 'http://localhost:5258';

async function testEndpoints() {
    console.log('Testing BIM Recovery Collaborative Features Endpoints\n');
    
    // Test 1: Check if Swagger JSON is working (was returning 500 error)
    try {
        console.log('1. Testing Swagger JSON endpoint...');
        const swaggerResponse = await fetch(`${BASE_URL}/swagger/v1/swagger.json`);
        console.log(`   Status: ${swaggerResponse.status} ${swaggerResponse.statusText}`);
        if (swaggerResponse.ok) {
            console.log('   ✅ Swagger JSON endpoint is working!');
        } else {
            console.log('   ❌ Swagger JSON endpoint failed');
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Test 2: Check collaboration tasks endpoint
    try {
        console.log('\n2. Testing CollaborationTasks base endpoint...');
        const tasksResponse = await fetch(`${BASE_URL}/api/collaborationtasks`);
        console.log(`   Status: ${tasksResponse.status} ${tasksResponse.statusText}`);
        if (tasksResponse.status === 401) {
            console.log('   ✅ Endpoint found - returns 401 Unauthorized (expected without auth)');
        } else if (tasksResponse.status === 404) {
            console.log('   ❌ Endpoint not found - route registration issue');
        } else {
            console.log(`   ⚠️  Unexpected status: ${tasksResponse.status}`);
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Test 3: Check the problematic project endpoint (was returning 404)
    try {
        console.log('\n3. Testing CollaborationTasks project endpoint...');
        const projectTasksResponse = await fetch(`${BASE_URL}/api/collaborationtasks/project/1`);
        console.log(`   Status: ${projectTasksResponse.status} ${projectTasksResponse.statusText}`);
        if (projectTasksResponse.status === 401) {
            console.log('   ✅ Endpoint found - returns 401 Unauthorized (expected without auth)');
            console.log('   ✅ FIXED: Previously returned 404, now properly registered!');
        } else if (projectTasksResponse.status === 404) {
            console.log('   ❌ Still returning 404 - route registration issue persists');
        } else {
            console.log(`   ⚠️  Unexpected status: ${projectTasksResponse.status}`);
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Test 4: Check notifications endpoint  
    try {
        console.log('\n4. Testing Notifications endpoint...');
        const notificationsResponse = await fetch(`${BASE_URL}/api/notifications`);
        console.log(`   Status: ${notificationsResponse.status} ${notificationsResponse.statusText}`);
        if (notificationsResponse.status === 401) {
            console.log('   ✅ Endpoint found - returns 401 Unauthorized (expected without auth)');
        } else if (notificationsResponse.status === 404) {
            console.log('   ❌ Endpoint not found - route registration issue');
        } else {
            console.log(`   ⚠️  Unexpected status: ${notificationsResponse.status}`);
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Test 5: Check my-tasks endpoint
    try {
        console.log('\n5. Testing My Tasks endpoint...');
        const myTasksResponse = await fetch(`${BASE_URL}/api/collaborationtasks/my-tasks`);
        console.log(`   Status: ${myTasksResponse.status} ${myTasksResponse.statusText}`);
        if (myTasksResponse.status === 401) {
            console.log('   ✅ Endpoint found - returns 401 Unauthorized (expected without auth)');
        } else if (myTasksResponse.status === 404) {
            console.log('   ❌ Endpoint not found - route registration issue');
        } else {
            console.log(`   ⚠️  Unexpected status: ${myTasksResponse.status}`);
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('\n=== Test Results Summary ===');
    console.log('If all endpoints return 401 Unauthorized, the collaborative features are properly registered!');
    console.log('The 401 status is expected because we\'re not sending authentication tokens.');
    console.log('This confirms the routes are working and the formatting fixes resolved the issues.');
}

// Run the tests
if (typeof window === 'undefined') {
    // Node.js environment
    const fetch = require('node-fetch');
    testEndpoints();
} else {
    // Browser environment
    testEndpoints();
}
