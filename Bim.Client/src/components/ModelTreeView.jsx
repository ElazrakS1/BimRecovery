import { useEffect, useState, useCallback } from 'react';
import './ModelTreeView.css';

export default function ModelTreeView({ viewer }) {
  const [modelTree, setModelTree] = useState([]);
  const [hasModel, setHasModel] = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);

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
  };

  const renderTreeNode = (node) => {
    if (!node) return null;

    return (
      <li key={node.expressID} className="tree-item">
        <div 
          className={`tree-node ${selectedElement?.expressID === node.expressID ? 'selected' : ''}`}
          onClick={() => handleElementClick(node.expressID)}
        >
          {node.type}: {node.name || 'Sans nom'}
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

  return (
    <div className="model-tree-view">
      <ul className="tree-root">
        {modelTree.map(node => renderTreeNode(node))}
      </ul>
      {selectedElement && (
        <div className="element-properties">
          <h4>Propriétés</h4>
          <pre>{JSON.stringify(selectedElement, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}