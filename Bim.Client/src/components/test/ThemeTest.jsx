import React from 'react';

const ThemeTest = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold logo-gradient-text text-center mb-8">
          Test du Nouveau Thème
        </h1>
        
        {/* Test rapide des composants */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-logo">
            <h3 className="text-xl font-semibold logo-primary-color mb-3">
              Carte Test
            </h3>
            <p className="mb-4">Test du nouveau style de carte avec le thème du logo.</p>
            <button className="btn-logo">Test Button</button>
          </div>
          
          <div className="card-logo-featured">
            <h3 className="text-xl font-semibold logo-dark-color mb-3">
              Carte Featured
            </h3>
            <p className="mb-4">Carte avec style featured et arrière-plan subtil.</p>
            <button className="btn-logo-outline">Test Outline</button>
          </div>
        </div>
        
        {/* Test des badges */}
        <div className="mt-8 flex gap-4 justify-center">
          <span className="badge-logo">Nouveau</span>
          <span className="badge-logo-outline">Important</span>
          <span className="badge-logo-subtle">En cours</span>
        </div>
      </div>
    </div>
  );
};

export default ThemeTest;
