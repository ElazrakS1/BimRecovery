// BIM Recovery - Collaborative Features API Test
// Test script to verify all collaborative endpoints are working

const API_BASE_URL = 'http://localhost:5258/api';

// Test function to verify API connectivity
async function testCollaborativeAPIs() {
    console.log('🧪 Testing BIM Recovery Collaborative Features APIs...\n');
    
    // You'll need to get a valid JWT token first by logging in
    const token = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token from login
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // Test 1: Get Annotations for a project
    try {
        console.log('📍 Testing Annotations API...');
        const response = await fetch(`${API_BASE_URL}/annotations?projectId=1`, {
            headers
        });
        console.log('Annotations Status:', response.status);
        if (response.ok) {
            const annotations = await response.json();
            console.log('✅ Annotations loaded:', annotations.length, 'items');
        }
    } catch (error) {
        console.log('❌ Annotations test failed:', error.message);
    }

    // Test 2: Get Tasks for a project
    try {
        console.log('\n📋 Testing Tasks API...');
        const response = await fetch(`${API_BASE_URL}/collaborationtasks?projectId=1`, {
            headers
        });
        console.log('Tasks Status:', response.status);
        if (response.ok) {
            const tasks = await response.json();
            console.log('✅ Tasks loaded:', tasks.length, 'items');
        }
    } catch (error) {
        console.log('❌ Tasks test failed:', error.message);
    }

    // Test 3: Get Notifications
    try {
        console.log('\n🔔 Testing Notifications API...');
        const response = await fetch(`${API_BASE_URL}/notifications`, {
            headers
        });
        console.log('Notifications Status:', response.status);
        if (response.ok) {
            const notifications = await response.json();
            console.log('✅ Notifications loaded:', notifications.length, 'items');
        }
    } catch (error) {
        console.log('❌ Notifications test failed:', error.message);
    }

    // Test 4: Test SignalR Connection
    try {
        console.log('\n🔄 Testing SignalR Connection...');
        // This would require SignalR client library
        console.log('ℹ️ SignalR test requires frontend application');
    } catch (error) {
        console.log('❌ SignalR test failed:', error.message);
    }

    console.log('\n🎯 Test Complete! Check the responses above.');
    console.log('\n📝 Instructions:');
    console.log('1. Login to get a JWT token');
    console.log('2. Replace YOUR_JWT_TOKEN_HERE with the actual token');
    console.log('3. Run this script in browser console');
    console.log('4. Create some test data and verify CRUD operations');
}

// Example of creating a test annotation
async function createTestAnnotation(token, projectId = 1) {
    const annotation = {
        content: "Test annotation from API",
        projectId: projectId,
        positionX: 1.0,
        positionY: 2.0,
        positionZ: 3.0,
        annotationType: "comment",
        style: JSON.stringify({
            color: "#ff0000",
            size: "medium"
        })
    };

    try {
        const response = await fetch(`${API_BASE_URL}/annotations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(annotation)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Test annotation created:', result);
            return result;
        } else {
            console.log('❌ Failed to create annotation:', response.status);
        }
    } catch (error) {
        console.log('❌ Annotation creation failed:', error.message);
    }
}

// Example of creating a test task
async function createTestTask(token, projectId = 1, assignedToId = null) {
    const task = {
        title: "Test Task from API",
        description: "This is a test task created via API",
        projectId: projectId,
        assignedToId: assignedToId,
        priority: "medium",
        status: "pending",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    };

    try {
        const response = await fetch(`${API_BASE_URL}/collaborationtasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(task)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Test task created:', result);
            return result;
        } else {
            console.log('❌ Failed to create task:', response.status);
        }
    } catch (error) {
        console.log('❌ Task creation failed:', error.message);
    }
}

// Instructions for manual testing
console.log(`
🚀 BIM Recovery Collaborative Features - API Test Ready!

📋 Manual Testing Steps:
1. Open the application at http://localhost:5173
2. Login with admin credentials
3. Open browser developer tools (F12)
4. Paste this script in the console
5. Get your JWT token from localStorage/sessionStorage
6. Run: testCollaborativeAPIs()
7. Test creating data with: createTestAnnotation(token), createTestTask(token)

🎯 Features to Test:
✅ 3D Model Annotations - Click on IFC viewer to add annotations
✅ Task Management - Create and assign tasks in project details
✅ Real-time Notifications - Check notification center in header
✅ Collaborative Comments - Reply to annotations and tasks
✅ User Assignment - Assign tasks to team members
✅ Status Tracking - Update task statuses and see real-time changes

🔧 Database Tables to Verify:
- Annotations (3D positioned comments)
- CollaborationTasks (task management)
- TaskComments (task discussions)
- TaskHistory (audit trail)
- Notifications (real-time alerts)
`);

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testCollaborativeAPIs,
        createTestAnnotation,
        createTestTask
    };
}
