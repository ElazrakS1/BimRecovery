const fs = require('fs');
const path = require('path');

// Chemin du fichier à modifier
const filePath = path.join(__dirname, 'Bim.Client', 'src', 'pages', 'settings', 'Settings.jsx');

try {
  // Lire le contenu du fichier
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remplacer l'URL /api/auth/update-profile par une simulation temporaire
  content = content.replace(
    /const response = await fetch\(`\${API_BASE_URL}\/api\/auth\/update-profile`/g,
    '// Simulation temporaire - l\'API update-profile n\'existe pas encore\n' +
    '      // const response = await fetch(`${API_BASE_URL}/api/auth/update-profile`\n' +
    '      \n' +
    '      // Simuler un délai réseau\n' +
    '      await new Promise(resolve => setTimeout(resolve, 1000));\n' +
    '      \n' +
    '      // Simuler une réponse réussie\n' +
    '      const response = { ok: true }'
  );
  
  // Remplacer également les autres appels d'API qui n'existent pas
  content = content.replace(
    /const response = await fetch\(`\${API_BASE_URL}\/api\/auth\/upload-avatar`/g,
    '// Simulation temporaire - l\'API upload-avatar n\'existe pas encore\n' +
    '      // const response = await fetch(`${API_BASE_URL}/api/auth/upload-avatar`\n' +
    '      \n' +
    '      // Créer une URL pour l\'aperçu de l\'image\n' +
    '      const imageUrl = URL.createObjectURL(file);\n' +
    '      console.log(\'Avatar will be uploaded (simulation only):\', imageUrl);\n' +
    '      \n' +
    '      // Mettre à jour l\'interface utilisateur avec la nouvelle image\n' +
    '      setUserData(prevData => ({\n' +
    '        ...prevData,\n' +
    '        profilePhoto: imageUrl // Ceci est temporaire et disparaîtra au rechargement de la page\n' +
    '      }));\n' +
    '      \n' +
    '      // Simuler une réponse réussie\n' +
    '      const response = { ok: true }'
  );
  
  content = content.replace(
    /const response = await fetch\(`\${API_BASE_URL}\/api\/auth\/export-data`/g,
    '// Simulation temporaire - l\'API export-data n\'existe pas encore\n' +
    '      // const response = await fetch(`${API_BASE_URL}/api/auth/export-data`\n' +
    '      \n' +
    '      // MODE SIMULATION: Créer un fichier JSON avec les données utilisateur\n' +
    '      const userData = {\n' +
    '        user: {\n' +
    '          email: userForm.email || \'user@example.com\',\n' +
    '          firstName: userForm.firstName || \'Utilisateur\',\n' +
    '          lastName: userForm.lastName || \'Test\',\n' +
    '          settings: formState\n' +
    '        },\n' +
    '        exportDate: new Date().toISOString(),\n' +
    '        note: "Ceci est un exemple d\'export de données (simulation)"\n' +
    '      };\n' +
    '      \n' +
    '      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: \'application/json\' });\n' +
    '      const url = window.URL.createObjectURL(blob);\n' +
    '      const a = document.createElement(\'a\');\n' +
    '      a.style.display = \'none\';\n' +
    '      a.href = url;\n' +
    '      a.download = \'smart-bim-data-export.json\';\n' +
    '      document.body.appendChild(a);\n' +
    '      a.click();\n' +
    '      window.URL.revokeObjectURL(url);\n' +
    '      document.body.removeChild(a);\n' +
    '      \n' +
    '      showNotification(\'Export de données terminé\', \'success\');\n' +
    '      return; // Stop here, no need for the rest of the function'
  );
  
  content = content.replace(
    /const response = await fetch\(`\${API_BASE_URL}\/api\/auth\/request-deletion`/g,
    '// Simulation temporaire - l\'API request-deletion n\'existe pas encore\n' +
    '      // const response = await fetch(`${API_BASE_URL}/api/auth/request-deletion`\n' +
    '      \n' +
    '      // Simuler un délai réseau\n' +
    '      await new Promise(resolve => setTimeout(resolve, 1500));\n' +
    '      \n' +
    '      // Simuler une réponse réussie\n' +
    '      const response = { ok: true }'
  );
  
  // Écrire le contenu modifié dans le fichier
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('Modifications apportées avec succès au fichier Settings.jsx');
} catch (error) {
  console.error('Erreur lors de la modification du fichier:', error);
}
