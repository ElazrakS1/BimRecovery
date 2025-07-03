// Test rapide du système de récupération WebGL pour les maquettes
// À exécuter dans la console du navigateur pour tester

console.log('🧪 Test du système de récupération WebGL pour maquettes');

// Test 1: Vérifier que les modules sont chargés
console.log('1. Vérification des modules...');
try {
  const proactiveRecovery = window.proactiveWebGLRecovery || 'Non trouvé';
  console.log('   - Récupération proactive:', proactiveRecovery);
  
  const simpleProtection = window.simpleShaderProtection || 'Non trouvé';
  console.log('   - Protection simple:', simpleProtection);
} catch (error) {
  console.warn('   ⚠️ Erreur lors de la vérification des modules:', error);
}

// Test 2: Simuler une perte de contexte WebGL
console.log('2. Test de simulation de perte WebGL...');
try {
  // Déclencher l'événement de perte de contexte
  window.dispatchEvent(new CustomEvent('webgl-context-lost-detected', {
    detail: {
      source: 'test-simulation',
      timestamp: Date.now()
    }
  }));
  console.log('   ✅ Événement de test déclenché');
} catch (error) {
  console.warn('   ⚠️ Erreur lors du test de simulation:', error);
}

// Test 3: Vérifier le stockage des modèles
console.log('3. Test du stockage des modèles...');
try {
  const storedModels = localStorage.getItem('bim-loaded-models');
  if (storedModels) {
    const models = JSON.parse(storedModels);
    console.log('   📦 Modèles stockés:', models.length, 'modèles');
    models.forEach((model, index) => {
      console.log(`   ${index + 1}. ${model.name} (${model.loadedAt})`);
    });
  } else {
    console.log('   📭 Aucun modèle stocké pour le moment');
  }
} catch (error) {
  console.warn('   ⚠️ Erreur lors de la vérification du stockage:', error);
}

// Test 4: Vérifier l'état du WebGL
console.log('4. Test de l\'état WebGL...');
try {
  const canvas = document.querySelector('canvas');
  if (canvas) {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      console.log('   🟢 Contexte WebGL actif:', !gl.isContextLost());
      console.log('   📊 Informations WebGL:');
      console.log('      - Renderer:', gl.getParameter(gl.RENDERER));
      console.log('      - Vendor:', gl.getParameter(gl.VENDOR));
      console.log('      - Version:', gl.getParameter(gl.VERSION));
    } else {
      console.log('   🔴 Pas de contexte WebGL disponible');
    }
  } else {
    console.log('   📄 Pas de canvas trouvé sur la page');
  }
} catch (error) {
  console.warn('   ⚠️ Erreur lors de la vérification WebGL:', error);
}

// Test 5: Écouter les événements de récupération
console.log('5. Configuration de l\'écoute des événements...');
try {
  const events = [
    'webgl-context-lost-detected',
    'webgl-recovery-started', 
    'webgl-recovery-success',
    'webgl-recovery-failed'
  ];
  
  events.forEach(eventName => {
    window.addEventListener(eventName, (event) => {
      console.log(`   🔔 Événement reçu: ${eventName}`, event.detail);
    });
  });
  
  console.log('   ✅ Écoute configurée pour', events.length, 'événements');
} catch (error) {
  console.warn('   ⚠️ Erreur lors de la configuration des événements:', error);
}

console.log('🎯 Test terminé. Surveillez la console pour les événements de récupération.');
console.log('💡 Pour tester la récupération, essayez de charger une maquette IFC.');

// Instructions pour l'utilisateur
console.log(`
📋 INSTRUCTIONS DE TEST:
1. Chargez une maquette IFC dans l'interface
2. Surveillez la console pour les messages de récupération
3. Si une erreur WebGL context lost apparaît, le système devrait automatiquement:
   - Détecter l'erreur
   - Déclencher la récupération
   - Restaurer le contexte WebGL
   - Recharger la maquette
   - Afficher une notification à l'utilisateur

✅ Si vous voyez ces étapes dans la console, le système fonctionne correctement !
`);

export {}; // Module ES6
