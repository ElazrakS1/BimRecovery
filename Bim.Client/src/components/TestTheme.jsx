import React from 'react';

const TestTheme = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Test du titre avec dégradé */}
        <h1 className="text-4xl font-bold text-primary-500 text-center">
          Test du Thème Simplifié
        </h1>
        
        {/* Test des boutons */}
        <div className="flex gap-4 justify-center">
          <button className="btn btn-primary">
            Bouton Principal
          </button>
          <button className="btn btn-secondary">
            Bouton Secondaire
          </button>
        </div>
        
        {/* Test d'une carte */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-primary-100">
          <h3 className="text-xl font-semibold text-primary-500 mb-3">
            Carte de Test
          </h3>
          <p className="text-gray-600 mb-4">
            Cette carte utilise le nouveau thème simplifié basé sur le logo 12.png.
          </p>
          <div className="flex gap-2">
            <button className="btn btn-primary">
              Action
            </button>
            <span className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
              Nouveau
            </span>
          </div>
        </div>
        
        {/* Test des couleurs */}
        <div className="grid grid-cols-5 gap-2">
          <div className="bg-primary-50 p-4 rounded text-center text-xs">50</div>
          <div className="bg-primary-100 p-4 rounded text-center text-xs">100</div>
          <div className="bg-primary-500 text-white p-4 rounded text-center text-xs">500</div>
          <div className="bg-primary-900 text-white p-4 rounded text-center text-xs">900</div>
          <div className="bg-primary-950 text-white p-4 rounded text-center text-xs">950</div>
        </div>
        
        {/* Status */}
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <p className="text-primary-800 text-center">
            ✅ Thème simplifié appliqué avec succès !
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestTheme;
