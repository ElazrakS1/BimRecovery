// Test script for Collaborative Features and Notifications
// This script can be run in the browser console to test the notification features

// Step 1: Send a test notification
async function sendTestNotification(userId) {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) {
    console.error('No authentication token found');
    return false;
  }

  // Send a test notification
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: userId,
        type: 'test',
        title: 'Notification de Test',
        message: 'Ceci est une notification de test pour vérifier le système de notifications',
        data: JSON.stringify({
          taskId: 1,
          message: 'Test notification data'
        })
      })
    });

    if (response.ok) {
      console.log('Test notification sent successfully');
      return true;
    } else {
      console.error('Failed to send test notification', await response.text());
      return false;
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    return false;
  }
}

// Step 2: Get current user information
async function getCurrentUser() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) {
    console.error('No authentication token found');
    return null;
  }

  try {
    const response = await fetch('/api/users/current', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const userData = await response.json();
      console.log('Current user:', userData);
      return userData;
    } else {
      console.error('Failed to get current user', await response.text());
      return null;
    }
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Step 3: Test notification reception
async function testNotificationReception() {
  // 1. Get current user
  const user = await getCurrentUser();
  if (!user) {
    console.error('Could not get current user');
    return;
  }

  // 2. Send a test notification to the current user
  console.log(`Sending test notification to user ${user.id}`);
  const sent = await sendTestNotification(user.id);
  
  if (sent) {
    console.log('Test notification sent. Check if you received it in the UI.');
    console.log('The notification badge should appear in the header.');
  } else {
    console.error('Failed to send test notification.');
  }
}

// Step 4: Check notification connection status
function checkNotificationConnection() {
  // Access the NotificationContext from window
  const notificationContext = window.__NOTIFICATION_CONTEXT__;
  
  if (notificationContext) {
    console.log('Notification connection status:', notificationContext.isConnected);
    console.log('Number of notifications:', notificationContext.notifications.length);
    console.log('Unread count:', notificationContext.unreadCount);
    return true;
  } else {
    console.error('NotificationContext not available. Make sure it\'s exposed to window for debugging');
    return false;
  }
}

// Main test function
async function runNotificationTest() {
  console.log('=== Starting Notification System Test ===');
  
  // Check connection status
  if (!checkNotificationConnection()) {
    console.log('Add this to your NotificationContext.jsx file inside the provider:');
    console.log('useEffect(() => { window.__NOTIFICATION_CONTEXT__ = { notifications, unreadCount, isConnected }; }, [notifications, unreadCount, isConnected]);');
  }
  
  // Test sending and receiving notifications
  await testNotificationReception();
  
  console.log('=== Notification System Test Complete ===');
  console.log('If you did not receive the notification, check:');
  console.log('1. The SignalR connection in browser console for errors');
  console.log('2. The backend logs for any exceptions');
  console.log('3. Ensure your user ID is correctly set in the notification hub connection');
}

// Run the test
runNotificationTest();
