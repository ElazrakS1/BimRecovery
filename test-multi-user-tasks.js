// Test script pour vérifier la fonctionnalité multi-utilisateur des tâches
// Exécuter dans la console du navigateur quand on est sur la page de gestion des tâches

console.log('🚀 Test du système multi-utilisateur des tâches');

// Test des données de formulaire
const testFormData = {
    title: 'Test Task - Multi Users',
    description: 'Cette tâche teste l\'assignation à plusieurs utilisateurs',
    status: 'todo',
    priority: 'high',
    assignedToId: 'user1', // Premier utilisateur pour compatibilité
    assignedToIds: ['user1', 'user2', 'user3'], // Nouveaux assignés multiples
    dueDate: '2025-07-15',
    tags: 'test,multi-user'
};

console.log('📋 Données de test:', testFormData);

// Fonction pour tester la création de tâche
async function testMultiUserTaskCreation() {
    try {
        console.log('🔄 Test de création de tâche avec plusieurs utilisateurs...');
        
        // Simuler l'appel API (remplacer par l'URL réelle de votre API)
        const response = await fetch('/api/collaborationtasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` // Ajuster selon votre système d'auth
            },
            body: JSON.stringify({
                ...testFormData,
                projectId: 1 // Remplacer par un vrai ID de projet
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Tâche créée avec succès:', result);
            console.log(`🔔 ${testFormData.assignedToIds.length} utilisateur(s) seront notifiés`);
        } else {
            console.error('❌ Erreur lors de la création:', response.statusText);
        }
    } catch (error) {
        console.error('❌ Erreur de test:', error);
    }
}

// Instructions pour l'utilisateur
console.log(`
📝 Instructions de test:
1. Ouvrez la page de gestion des tâches d'un projet
2. Cliquez sur "Create Task"
3. Remplissez le titre et la description
4. Cliquez sur le dropdown "Assign To Users"
5. Sélectionnez plusieurs utilisateurs
6. Vérifiez que les utilisateurs sélectionnés apparaissent comme des tags
7. Soumettez le formulaire
8. Vérifiez que la notification de succès apparaît
9. Vérifiez que les utilisateurs assignés apparaissent dans la carte de tâche

🧪 Pour tester l'API directement, exécutez:
testMultiUserTaskCreation()
`);

// Exposer la fonction de test globalement
window.testMultiUserTaskCreation = testMultiUserTaskCreation;
