// Script de diagnostic pour le dropdown des utilisateurs
// Utilise Node.js et axios pour tester l'API backend

const axios = require('axios');

// Configuration API
const API_BASE_URL = 'https://localhost:7128'; // Ajustez selon votre configuration
const API_ENDPOINT = '/api/collaborationtasks/available-users';

// Fonction pour tester l'endpoint
async function testUserEndpoint() {
    console.log('🔍 Testing user endpoint...');
    console.log('📍 URL:', `${API_BASE_URL}${API_ENDPOINT}`);
    
    try {
        // Test sans authentification d'abord
        console.log('\n1️⃣ Testing without authentication...');
        const response = await axios.get(`${API_BASE_URL}${API_ENDPOINT}`, {
            httpsAgent: new (require('https').Agent)({
                rejectUnauthorized: false // Pour ignorer les erreurs SSL en dev
            })
        });
        
        console.log('✅ Response Status:', response.status);
        console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));
        console.log('📈 User Count:', response.data?.length || 0);
        
        if (Array.isArray(response.data)) {
            response.data.forEach((user, index) => {
                console.log(`   User ${index + 1}:`, {
                    id: user.id,
                    name: `${user.firstName} ${user.lastName}`,
                    email: user.email,
                    company: user.company
                });
            });
        }
        
    } catch (error) {
        console.log('❌ Error occurred:');
        
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Status Text:', error.response.statusText);
            console.log('   Data:', error.response.data);
            
            if (error.response.status === 401) {
                console.log('🔑 Authentication required - trying with token...');
                await testWithAuthentication();
            }
        } else if (error.request) {
            console.log('   No response received');
            console.log('   Request config:', error.config);
        } else {
            console.log('   Error:', error.message);
        }
    }
}

// Fonction pour tester avec authentification
async function testWithAuthentication() {
    console.log('\n2️⃣ Testing with authentication...');
    
    // Simuler l'authentification (vous devrez ajuster selon votre méthode d'auth)
    try {
        // D'abord, essayons de nous connecter
        const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            email: 'admin@bimrecovery.com', // Ajustez selon vos données de test
            password: 'Admin123!' // Ajustez selon vos données de test
        }, {
            httpsAgent: new (require('https').Agent)({
                rejectUnauthorized: false
            })
        });
        
        const token = loginResponse.data.token;
        console.log('🔑 Login successful, token obtained');
        
        // Maintenant, testons l'endpoint avec le token
        const response = await axios.get(`${API_BASE_URL}${API_ENDPOINT}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            httpsAgent: new (require('https').Agent)({
                rejectUnauthorized: false
            })
        });
        
        console.log('✅ Response Status:', response.status);
        console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));
        console.log('📈 User Count:', response.data?.length || 0);
        
    } catch (authError) {
        console.log('❌ Authentication failed:');
        if (authError.response) {
            console.log('   Status:', authError.response.status);
            console.log('   Data:', authError.response.data);
        } else {
            console.log('   Error:', authError.message);
        }
    }
}

// Fonction pour tester la base de données directement
async function testDatabaseUsers() {
    console.log('\n3️⃣ Testing database users endpoint...');
    
    try {
        // Tester l'endpoint des utilisateurs généraux
        const response = await axios.get(`${API_BASE_URL}/api/users`, {
            httpsAgent: new (require('https').Agent)({
                rejectUnauthorized: false
            })
        });
        
        console.log('✅ Users endpoint Response Status:', response.status);
        console.log('📊 Users Data:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('❌ Users endpoint error:');
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Data:', error.response.data);
        }
    }
}

// Exécuter les tests
async function runAllTests() {
    console.log('🚀 Starting user dropdown diagnostics...\n');
    
    await testUserEndpoint();
    await testDatabaseUsers();
    
    console.log('\n✅ Diagnostic complete!');
}

// Vérifier si le script est exécuté directement
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { testUserEndpoint, testWithAuthentication, testDatabaseUsers };
