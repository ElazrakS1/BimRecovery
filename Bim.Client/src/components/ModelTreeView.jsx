import { useEffect, useState, useCallback } from 'react';
import './ModelTreeView.css';

export default function ModelTreeView({ viewer }) {
  const [modelTree, setModelTree] = useState([]);
  const [hasModel, setHasModel] = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchSpatialStructure = useCallback(async () => {
    if (!viewer?.IFC?.context?.items?.ifcModels?.length) {
      setHasModel(false);
      setModelTree([]);
      return;
    }

    try {
      // Only use the first model to avoid duplication
      const ifcModel = viewer.IFC.context.items.ifcModels[0];
      const modelID = ifcModel.modelID;
      
      // Clear any previous selections
      if (selectedElement) {
        viewer.IFC.unpickIfcItems();
        setSelectedElement(null);
      }
      
      const spatial = await viewer.IFC.getSpatialStructure(modelID, true);
      if (spatial) {
        setHasModel(true);
        setModelTree(Array.isArray(spatial) ? spatial : [spatial]);
        setLoadingError(null);
      }
    } catch (error) {
      console.error('Error loading model tree:', error);
      setLoadingError(error.message);
      setHasModel(false);
      setModelTree([]);
    }
  }, [viewer, selectedElement]);

  useEffect(() => {
    // Initial fetch
    fetchSpatialStructure();

    // Set up polling to check for model changes
    const checkInterval = setInterval(() => {
      const currentModelCount = viewer?.IFC?.context?.items?.ifcModels?.length || 0;
      const hasModels = currentModelCount > 0;

      // Only fetch if the model state has changed
      if (hasModels !== hasModel) {
        fetchSpatialStructure();
      }
    }, 1000); // Check every second

    return () => {
      clearInterval(checkInterval);
    };
  }, [viewer, fetchSpatialStructure, hasModel]);

  const handleElementClick = async (elementId) => {
    if (!hasModel || !viewer?.IFC) return;

    try {
      // Ensure we're working with the first model only
      const ifcModel = viewer.IFC.context.items.ifcModels[0];
      if (ifcModel) {
        const modelID = ifcModel.modelID;
        
        // Clear previous selection
        viewer.IFC.unpickIfcItems();
        
        // Select new element
        await viewer.IFC.pickIfcItemsByID(modelID, [elementId]);
        
        // Get and set properties
        const props = await viewer.IFC.getProperties(modelID, elementId, true);
        setSelectedElement(props);
      }
    } catch (error) {
      console.error('Error selecting element:', error);
    }
  };  // Fonction pour générer un nom descriptif pour les éléments IFC
  const generateElementName = (node) => {
    // Si l'élément a un nom, l'utiliser
    if (node.name && node.name.trim() !== '') {
      return node.name;
    }
    
    // Vérifier les propriétés communes qui pourraient contenir des noms
    const getPropertyValue = (obj, propertyNames) => {
      for (const prop of propertyNames) {
        if (obj[prop]) {
          return typeof obj[prop] === 'object' && obj[prop].value ? obj[prop].value : obj[prop];
        }
      }
      return null;
    };
    
    // Chercher le nom dans différentes propriétés
    const nameValue = getPropertyValue(node, ['Name', 'LongName', 'ObjectType', 'Tag', 'GlobalId']);
    if (nameValue) return nameValue;

    // Générer un nom basé sur le type d'élément
    const idSuffix = node.expressID ? ` #${node.expressID}` : '';
    
    switch (node.type) {
      case 'IFCPROJECT':
        return `Projet principal${idSuffix}`;
      case 'IFCSITE':
        return `Site de construction${idSuffix}`;
      case 'IFCBUILDING':
        return `Bâtiment principal${idSuffix}`;
      case 'IFCBUILDINGSTOREY':
        return `Étage${idSuffix}`;
      case 'IFCSPACE':
        return `Espace${idSuffix}`;
      case 'IFCWALL':
        return `Mur${idSuffix}`;
      case 'IFCWINDOW':
        return `Fenêtre${idSuffix}`;
      case 'IFCDOOR':
        return `Porte${idSuffix}`;
      case 'IFCCOLUMN':
        return `Colonne${idSuffix}`;
      case 'IFCSLAB':
        return `Dalle${idSuffix}`;
      case 'IFCROOF':
        return `Toit${idSuffix}`;
      case 'IFCSTAIR':
        return `Escalier${idSuffix}`;
      case 'IFCRAILING':
        return `Garde-corps${idSuffix}`;
      case 'IFCFURNISHINGELEMENT':
        return `Mobilier${idSuffix}`;
      case 'IFCMEMBER': {
        // Pour les membres structurels, essayer d'être plus descriptif
        const position = node.ObjectPlacement?.RelativePlacement?.Position;
        if (position) {
          const { x, y, z } = position;
          return `Élément structurel (${x?.toFixed(2)}, ${y?.toFixed(2)}, ${z?.toFixed(2)})${idSuffix}`;
        }
        return `Élément structurel${idSuffix}`;
      }
      case 'IFCBUILDINGELEMENTPROXY': {
        // Pour les proxys, essayer de trouver d'autres identifiants
        const objectType = getPropertyValue(node, ['ObjectType', 'Description']);
        if (objectType) return `${objectType}${idSuffix}`;
        return `Élément architectural${idSuffix}`;
      }
      case 'IFCELEMENTASSEMBLY':
        return `Assemblage structurel${idSuffix}`;
      case 'IFCGEOGRAPHICELEMENT': {
        // Pour les éléments géographiques, essayer d'identifier leur fonction
        const hasChildren = node.children && node.children.length;
        if (hasChildren) {
          return `Zone géographique (${node.children.length} éléments)${idSuffix}`;
        }
        // Vérifier si c'est un point de repère géographique spécifique
        const predefinedType = getPropertyValue(node, ['PredefinedType']);
        if (predefinedType) {
          return `Élément géo. ${predefinedType}${idSuffix}`;
        }
        return `Point géographique${idSuffix}`;
      }      default: {
        // Pour les autres types, enlever le préfixe IFC et ajouter l'ID
        const typeName = node.type.slice(3); // Enlever "IFC" du début
        // Convertir le nom du type en format plus lisible (ex: ELEMENTASSEMBLY -> Element Assembly)
        const formattedType = typeName.replace(/([A-Z])/g, ' $1').trim();
        return `${formattedType}${idSuffix}`;
      }
    }
  };
  // Fonction pour déterminer une couleur en fonction du type d'élément
  const getTypeColor = (type) => {
    const typeLower = type.toLowerCase();
    
    if (typeLower.includes('project')) return 'project-color';
    if (typeLower.includes('site')) return 'site-color';
    if (typeLower.includes('building')) return 'building-color';
    if (typeLower.includes('storey')) return 'storey-color';
    if (typeLower.includes('space')) return 'space-color';
    if (typeLower.includes('wall')) return 'wall-color';
    if (typeLower.includes('door')) return 'door-color';
    if (typeLower.includes('window')) return 'window-color';
    if (typeLower.includes('element')) return 'element-color';
    if (typeLower.includes('member')) return 'member-color';
    if (typeLower.includes('geographic')) return 'geographic-color';
    if (typeLower.includes('proxy')) return 'proxy-color';
    if (typeLower.includes('assembly')) return 'assembly-color';
    
    return '';
  };

  // Fonction pour filtrer les nœuds de l'arborescence
  const filterNode = (node) => {
    // Si le nœud n'existe pas, ne pas inclure
    if (!node) return false;
    
    // Générer un nom pour cet élément
    const elementName = generateElementName(node);
    // Convertir en minuscules pour la recherche insensible à la casse
    const elementNameLower = elementName.toLowerCase();
    const elementTypeLower = node.type.toLowerCase();
    const searchTextLower = filterText.toLowerCase();
    
    // Vérifier si le nœud correspond au filtre de type
    const matchesTypeFilter = filterType === 'all' || elementTypeLower.includes(filterType.toLowerCase());
    
    // Vérifier si le nœud correspond au filtre de texte
    const matchesTextFilter = filterText === '' || 
      elementNameLower.includes(searchTextLower) || 
      elementTypeLower.includes(searchTextLower);
    
    // Si ce nœud correspond, ou si un de ses enfants correspond
    if (matchesTypeFilter && matchesTextFilter) {
      return true;
    }
    
    // Vérifier récursivement les enfants
    if (node.children && node.children.length > 0) {
      // Créer une copie du nœud pour ne pas modifier l'original
      const filteredNode = { ...node };
      // Filtrer les enfants
      filteredNode.children = node.children.filter(filterNode);
      // Si au moins un enfant correspond, inclure ce nœud
      return filteredNode.children.length > 0;
    }
    
    // Aucune correspondance
    return false;
  };

  const renderTreeNode = (node) => {
    if (!node) return null;

    // Générer un nom descriptif pour l'élément
    const elementName = generateElementName(node);

    return (
      <li key={node.expressID} className="tree-item">
        <div 
          className={`tree-node ${selectedElement?.expressID === node.expressID ? 'selected' : ''} ${getTypeColor(node.type)}`}
          onClick={() => handleElementClick(node.expressID)}
        >
          <span className="element-type">{node.type.replace('IFC', '')}</span>
          <span className="element-name">{elementName}</span>
        </div>
        {node.children && node.children.length > 0 && (
          <ul className="tree-children">
            {node.children.map(child => renderTreeNode(child))}
          </ul>
        )}
      </li>
    );
  };

  if (loadingError) {
    return <div className="error-message">Erreur: {loadingError}</div>;
  }

  if (!hasModel) {
    return (
      <div className="empty-message">
        Aucun modèle chargé. Veuillez charger un fichier IFC d'abord.
      </div>
    );
  }
  // Construire un arbre filtré pour l'affichage
  const getFilteredTree = () => {
    if (!filterText && filterType === 'all') return modelTree;
    
    return modelTree
      .filter(filterNode)
      .map(node => {
        // Si ce nœud est inclus, créer une copie filtrée pour l'affichage
        if (node.children && node.children.length > 0) {
          const filteredNode = { ...node };
          // Filtrer récursivement les enfants
          const filterChildren = (children) => {
            return children
              .filter(filterNode)
              .map(child => {
                if (child.children && child.children.length > 0) {
                  return { ...child, children: filterChildren(child.children) };
                }
                return child;
              });
          };
          
          filteredNode.children = filterChildren(node.children);
          return filteredNode;
        }
        return node;
      });
  };

  // Liste des types d'éléments IFC communs pour le filtre
  const commonElementTypes = [
    { value: 'all', label: 'Tous les types' },
    { value: 'project', label: 'Projet' },
    { value: 'site', label: 'Site' },
    { value: 'building', label: 'Bâtiment' },
    { value: 'storey', label: 'Étage' },
    { value: 'space', label: 'Espace' },
    { value: 'wall', label: 'Mur' },
    { value: 'door', label: 'Porte' },
    { value: 'window', label: 'Fenêtre' },
    { value: 'slab', label: 'Dalle' },
    { value: 'column', label: 'Colonne' },
    { value: 'roof', label: 'Toit' },
    { value: 'stair', label: 'Escalier' },
    { value: 'railing', label: 'Garde-corps' },
    { value: 'furnishing', label: 'Mobilier' },
    { value: 'member', label: 'Élément structurel' }
  ];

  return (
    <div className="model-tree-view">
      <div className="tree-filter-container">
        <div className="filter-input-container">
          <input 
            type="text" 
            className="filter-input"
            placeholder="Filtrer par nom..." 
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          <button 
            className="clear-filter-btn"
            style={{ visibility: filterText ? 'visible' : 'hidden' }}
            onClick={() => setFilterText('')}
          >
            ×
          </button>
        </div>
        <select 
          className="type-filter-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          {commonElementTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>
      
      <ul className="tree-root">
        {getFilteredTree().map(node => renderTreeNode(node))}
      </ul>{selectedElement && (
        <div className="element-properties">
          <h4>Propriétés de l'élément</h4>
          <div className="properties-list">
            {/* Section d'identité de l'élément */}
            <div className="properties-section">
              <h5 className="section-title">Identité</h5>
              <div className="section-content">
                <div className="property-item">
                  <span className="property-name">Type:</span>
                  <span className="property-value">{selectedElement.type || selectedElement.constructor?.name}</span>
                </div>
                <div className="property-item">
                  <span className="property-name">ID:</span>
                  <span className="property-value">{selectedElement.expressID}</span>
                </div>
                <div className="property-item">
                  <span className="property-name">ID Global:</span>
                  <span className="property-value">{selectedElement.GlobalId || 'Non défini'}</span>
                </div>
              </div>
            </div>

            {/* Section des propriétés descriptives */}
            <div className="properties-section">
              <h5 className="section-title">Description</h5>
              <div className="section-content">
                {(() => {
                  // Extraire la valeur d'une propriété qui peut être un objet ou une valeur simple
                  const getPropertyValue = (prop) => {
                    if (!prop) return null;
                    return typeof prop === 'object' && prop.value !== undefined ? prop.value : prop;
                  };
                  
                  // Liste des propriétés descriptives à afficher
                  const descriptiveProperties = [
                    { key: 'Name', label: 'Nom' },
                    { key: 'LongName', label: 'Nom complet' },
                    { key: 'Description', label: 'Description' },
                    { key: 'ObjectType', label: 'Type d\'objet' },
                    { key: 'Tag', label: 'Étiquette' }
                  ];
                  
                  const hasValues = descriptiveProperties.some(prop => getPropertyValue(selectedElement[prop.key]));
                  
                  if (!hasValues) {
                    return <div className="no-properties">Aucune propriété descriptive disponible</div>;
                  }
                  
                  return descriptiveProperties.map(prop => {
                    const value = getPropertyValue(selectedElement[prop.key]);
                    if (value) {
                      return (
                        <div key={prop.key} className="property-item">
                          <span className="property-name">{prop.label}:</span>
                          <span className="property-value">{value}</span>
                        </div>
                      );
                    }
                    return null;
                  });
                })()}
              </div>
            </div>
            
            {/* Section des propriétés techniques */}
            <div className="properties-section">
              <h5 className="section-title">Propriétés techniques</h5>
              <div className="section-content">
                {(() => {
                  // Extraire la valeur d'une propriété qui peut être un objet ou une valeur simple
                  const getPropertyValue = (prop) => {
                    if (!prop) return null;
                    return typeof prop === 'object' && prop.value !== undefined ? prop.value : prop;
                  };
                  
                  // Liste des propriétés techniques à afficher
                  const technicalProperties = [
                    { key: 'PredefinedType', label: 'Type prédéfini' },
                    { key: 'CompositionType', label: 'Type de composition' },
                    { key: 'ElementType', label: 'Type d\'élément' },
                    { key: 'MaterialLayers', label: 'Couches de matériaux' },
                    { key: 'IsExternal', label: 'Est externe' },
                    { key: 'LoadBearing', label: 'Porteur de charge' }
                  ];
                  
                  const hasValues = technicalProperties.some(prop => getPropertyValue(selectedElement[prop.key]));
                  
                  if (!hasValues) {
                    return <div className="no-properties">Aucune propriété technique disponible</div>;
                  }
                  
                  return technicalProperties.map(prop => {
                    const value = getPropertyValue(selectedElement[prop.key]);
                    if (value) {
                      return (
                        <div key={prop.key} className="property-item">
                          <span className="property-name">{prop.label}:</span>
                          <span className="property-value">
                            {typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : value}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  });
                })()}
              </div>
            </div>
              {/* Section pour les propriétés de Pset (Property Sets) */}
            {Object.prototype.hasOwnProperty.call(selectedElement, 'psets') && (
              <div className="properties-section">
                <h5 className="section-title">Ensembles de propriétés</h5>
                <div className="section-content psets-content">
                  {(() => {
                    const psets = selectedElement.psets;
                    if (!psets || Object.keys(psets).length === 0) {
                      return <div className="no-properties">Aucun ensemble de propriétés disponible</div>;
                    }
                    
                    return Object.entries(psets).map(([psetName, properties]) => (
                      <details key={psetName} className="pset-details">
                        <summary className="pset-name">{psetName}</summary>
                        <div className="pset-properties">
                          {Object.entries(properties).map(([propName, propValue]) => (
                            <div key={propName} className="property-item pset-property">
                              <span className="property-name">{propName}:</span>
                              <span className="property-value">
                                {typeof propValue === 'object' && propValue !== null 
                                  ? propValue.value || JSON.stringify(propValue) 
                                  : propValue}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    ));
                  })()}
                </div>
              </div>
            )}
            
            {/* Section pour toutes les propriétés en JSON */}
            <div className="properties-section">
              <div className="property-item property-more">
                <details>
                  <summary>Toutes les propriétés</summary>
                  <pre className="full-json">{JSON.stringify(selectedElement, null, 2)}</pre>
                </details>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}