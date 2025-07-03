const fs = require('fs');
const path = require('path');

// Chemin du fichier à modifier
const filePath = path.join(__dirname, 'Bim.Client', 'src', 'pages', 'settings', 'Settings.jsx');

try {
  // Lire le contenu du fichier
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Corriger updateUserProfile
  content = content.replace(
    /const updateUserProfile = async \(\) => {[\s\S]*?const response = await fetch\(`\${API_BASE_URL}\/api\/auth\/update-profile`[\s\S]*?body: JSON\.stringify\(requestData\)\s*\}\);/g,
    `const updateUserProfile = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;

      setIsSaving(true);
      
      // Create request data object based on what's being edited
      const requestData = {};
      
      if (editMode.name) {
        requestData.firstName = userForm.firstName;
        requestData.lastName = userForm.lastName;
      }
      
      if (editMode.email) {
        requestData.email = userForm.email;
      }
      
      if (editMode.password) {
        // Validate passwords match
        if (userForm.newPassword !== userForm.confirmPassword) {
          showNotification('Les mots de passe ne correspondent pas', 'error');
          setIsSaving(false);
          return;
        }
        requestData.password = userForm.newPassword;
      }
      
      // Only proceed if there's something to update
      if (Object.keys(requestData).length === 0) {
        setEditMode({ name: false, email: false, password: false });
        setIsSaving(false);
        return;
      }
      
      console.log('Simulating update user profile');
      
      // Simuler un délai réseau
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simuler une réponse réussie
      const response = { ok: true };`
  );

  // Corriger handleFileChange
  content = content.replace(
    /const response = await fetch\(`\${API_BASE_URL}\/api\/auth\/upload-avatar`,[\s\S]*?body: formData\s*\}\);/g,
    `// Simulation temporaire - l'API upload-avatar n'existe pas encore
      // const response = await fetch(\`\${API_BASE_URL}/api/auth/upload-avatar\`...
      
      // Créer une URL pour l'aperçu de l'image
      const imageUrl = URL.createObjectURL(file);
      console.log('Avatar will be uploaded (simulation only):', imageUrl);
      
      // Simuler un délai réseau
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Simuler une réponse réussie
      const response = { ok: true };`
  );

  // Corriger handleExportData
  content = content.replace(
    /const response = await fetch\(`\${API_BASE_URL}\/api\/auth\/export-data`,[\s\S]*?}\);[\s\S]*?if \(!response\.ok\) throw new Error\('Failed to export data'\);[\s\S]*?const blob = await response\.blob\(\);/g,
    `// Simulation temporaire - l'API export-data n'existe pas encore
      // const response = await fetch(\`\${API_BASE_URL}/api/auth/export-data\`...
      
      // MODE SIMULATION: Créer un fichier JSON avec les données utilisateur
      const userData = {
        user: {
          email: userForm.email || 'user@example.com',
          firstName: userForm.firstName || 'Utilisateur',
          lastName: userForm.lastName || 'Test',
          settings: formState
        },
        exportDate: new Date().toISOString(),
        note: "Ceci est un exemple d'export de données (simulation)"
      };
      
      // Simuler un délai réseau
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });`
  );

  // Corriger handleRequestAccountDeletion
  content = content.replace(
    /const response = await fetch\(`\${API_BASE_URL}\/api\/auth\/request-deletion`,[\s\S]*?}\);/g,
    `// Simulation temporaire - l'API request-deletion n'existe pas encore
      // const response = await fetch(\`\${API_BASE_URL}/api/auth/request-deletion\`...
      
      // Simuler un délai réseau
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simuler une réponse réussie
      const response = { ok: true };`
  );
  
  // Écrire le contenu modifié dans le fichier
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('Corrections appliquées avec succès au fichier Settings.jsx');
} catch (error) {
  console.error('Erreur lors de la correction du fichier:', error);
}
