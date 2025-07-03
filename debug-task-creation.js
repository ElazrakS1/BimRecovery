// Test pour diagnostiquer l'erreur 500 lors de la création de tâches
const BASE_URL = 'http://localhost:5258';

async function testTaskCreation() {
    console.log('🔍 Diagnostic de l\'erreur 500 - Création de tâche');
    console.log('=' .repeat(50));
    
    // Données de test pour créer une tâche
    const testTaskData = {
        title: "Test Task Debug",
        description: "Tâche de test pour diagnostiquer l'erreur 500",
        projectId: 1,
        assignedToId: null,
        priority: "medium",
        dueDate: null,
        relatedAnnotationId: null,
        targetElementId: null,
        positionX: null,
        positionY: null,
        positionZ: null,
        tags: null
    };
    
    console.log('\n📋 Données de test:');
    console.log(JSON.stringify(testTaskData, null, 2));
    
    try {
        console.log('\n🔐 Test 1: Création de tâche SANS authentification...');
        const responseWithoutAuth = await fetch(`${BASE_URL}/api/collaborationtasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testTaskData)
        });
        
        console.log(`   Status: ${responseWithoutAuth.status} ${responseWithoutAuth.statusText}`);
        
        if (responseWithoutAuth.status === 401) {
            console.log('   ✅ Retourne 401 Unauthorized (comportement attendu)');
        } else if (responseWithoutAuth.status === 500) {
            const errorText = await responseWithoutAuth.text();
            console.log('   ❌ Erreur 500 même sans authentification !');
            console.log('   📄 Détail erreur:', errorText);
        }
        
    } catch (error) {
        console.log(`   ❌ Erreur de connexion: ${error.message}`);
    }
    
    try {
        console.log('\n🔐 Test 2: Test avec un token factice...');
        const responseWithFakeAuth = await fetch(`${BASE_URL}/api/collaborationtasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer fake-token-for-testing'
            },
            body: JSON.stringify(testTaskData)
        });
        
        console.log(`   Status: ${responseWithFakeAuth.status} ${responseWithFakeAuth.statusText}`);
        
        if (responseWithFakeAuth.status === 401) {
            console.log('   ✅ Retourne 401 Unauthorized (comportement attendu)');
        } else if (responseWithFakeAuth.status === 500) {
            const errorText = await responseWithFakeAuth.text();
            console.log('   ❌ Erreur 500 avec token factice !');
            console.log('   📄 Détail erreur:', errorText);
        }
        
    } catch (error) {
        console.log(`   ❌ Erreur de connexion: ${error.message}`);
    }
    
    try {
        console.log('\n🔍 Test 3: Vérification endpoint GET...');
        const getResponse = await fetch(`${BASE_URL}/api/collaborationtasks`);
        console.log(`   GET Status: ${getResponse.status} ${getResponse.statusText}`);
        
        if (getResponse.status === 401) {
            console.log('   ✅ GET fonctionne correctement');
        } else if (getResponse.status === 500) {
            const errorText = await getResponse.text();
            console.log('   ❌ Erreur 500 sur GET aussi !');
            console.log('   📄 Détail erreur:', errorText);
        }
        
    } catch (error) {
        console.log(`   ❌ Erreur de connexion: ${error.message}`);
    }
    
    try {
        console.log('\n🔍 Test 4: Test avec ProjectId différent...');
        const testTaskData2 = {
            ...testTaskData,
            projectId: 999 // ID qui n'existe probablement pas
        };
        
        const responseWithDifferentProject = await fetch(`${BASE_URL}/api/collaborationtasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testTaskData2)
        });
        
        console.log(`   Status: ${responseWithDifferentProject.status} ${responseWithDifferentProject.statusText}`);
        
    } catch (error) {
        console.log(`   ❌ Erreur de connexion: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎯 DIAGNOSTIC TERMINÉ');
    console.log('   Si toutes les requêtes retournent 401, le problème vient du client.');
    console.log('   Si certaines retournent 500, le problème vient du serveur.');
}

// Exécuter le test
if (typeof window === 'undefined') {
    // Node.js environment
    const fetch = require('node-fetch');
    testTaskCreation();
} else {
    // Browser environment
    testTaskCreation();
}
