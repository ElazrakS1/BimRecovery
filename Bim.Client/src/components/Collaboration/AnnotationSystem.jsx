import React, { useState, useEffect, useRef } from 'react';
import { useCollaboration } from './CollaborationProvider';
import toast from 'react-hot-toast';
import './AnnotationSystem.css';

const AnnotationSystem = ({ ifcViewer }) => {
  const { projectId, userId, isConnected } = useCollaboration();
  const [annotations, setAnnotations] = useState([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [isCreatingAnnotation, setIsCreatingAnnotation] = useState(false);
  const [annotationContent, setAnnotationContent] = useState('');
  const [annotationType, setAnnotationType] = useState('comment');
  const [pendingPosition, setPendingPosition] = useState(null);
  const annotationMarkerRef = useRef(new Map());

  // Load existing annotations
  useEffect(() => {
    if (projectId) {
      loadAnnotations();
    }
  }, [projectId]);

  // Listen for real-time annotation updates
  useEffect(() => {
    const handleAnnotationCreated = (event) => {
      const annotation = event.detail;
      setAnnotations(prev => [annotation, ...prev]);
      addAnnotationMarker(annotation);
    };

    const handleAnnotationUpdated = (event) => {
      const annotation = event.detail;
      setAnnotations(prev => prev.map(a => 
        a.id === annotation.id ? annotation : a
      ));
      updateAnnotationMarker(annotation);
    };

    window.addEventListener('annotationCreated', handleAnnotationCreated);
    window.addEventListener('annotationUpdated', handleAnnotationUpdated);

    return () => {
      window.removeEventListener('annotationCreated', handleAnnotationCreated);
      window.removeEventListener('annotationUpdated', handleAnnotationUpdated);
    };
  }, []);

  const loadAnnotations = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/annotations/project/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnnotations(data);
        
        // Add markers to 3D viewer
        data.forEach(annotation => {
          addAnnotationMarker(annotation);
        });
      }
    } catch (error) {
      console.error('Error loading annotations:', error);
      toast.error('Erreur lors du chargement des annotations');
    }
  };

  const addAnnotationMarker = (annotation) => {
    if (!ifcViewer || !ifcViewer.context || !ifcViewer.context.renderer) return;

    try {
      const marker = document.createElement('div');
      marker.className = `annotation-marker annotation-${annotation.annotationType}`;
      marker.innerHTML = `
        <div class="annotation-icon">
          ${getAnnotationIcon(annotation.annotationType)}
        </div>
        <div class="annotation-content-preview">
          ${annotation.content.substring(0, 50)}${annotation.content.length > 50 ? '...' : ''}
        </div>
      `;

      marker.addEventListener('click', () => {
        setSelectedAnnotation(annotation);
        focusOnAnnotation(annotation);
      });

      // Position the marker in 3D space
      const position = {
        x: annotation.positionX,
        y: annotation.positionY,
        z: annotation.positionZ
      };

      // Add to the viewer (implementation depends on the IFC viewer library)
      if (ifcViewer.addAnnotationMarker) {
        ifcViewer.addAnnotationMarker(annotation.id, marker, position);
      } else {
        // Fallback: add to DOM with CSS positioning
        const viewerContainer = ifcViewer.container || document.querySelector('.ifc-viewer');
        if (viewerContainer) {
          marker.style.position = 'absolute';
          marker.style.zIndex = '1000';
          viewerContainer.appendChild(marker);
          
          // Store marker reference
          annotationMarkerRef.current.set(annotation.id, marker);
        }
      }

    } catch (error) {
      console.error('Error adding annotation marker:', error);
    }
  };

  const updateAnnotationMarker = (annotation) => {
    const marker = annotationMarkerRef.current.get(annotation.id);
    if (marker) {
      const contentPreview = marker.querySelector('.annotation-content-preview');
      if (contentPreview) {
        contentPreview.textContent = annotation.content.substring(0, 50) + 
          (annotation.content.length > 50 ? '...' : '');
      }
    }
  };

  const getAnnotationIcon = (type) => {
    switch (type) {
      case 'comment': return '💬';
      case 'arrow': return '➡️';
      case 'highlight': return '🔆';
      case 'measure': return '📏';
      case 'issue': return '⚠️';
      default: return '📝';
    }
  };

  const startAnnotationCreation = () => {
    setIsCreatingAnnotation(true);
    toast.info('Cliquez sur la maquette pour placer l\'annotation');
    
    // Enable click listener on viewer
    if (ifcViewer && ifcViewer.container) {
      ifcViewer.container.style.cursor = 'crosshair';
      ifcViewer.container.addEventListener('click', handleViewerClick);
    }
  };

  const handleViewerClick = async (event) => {
    if (!isCreatingAnnotation) return;

    try {
      // Get 3D position from click (implementation depends on IFC viewer)
      const position = await get3DPositionFromClick(event);
      const cameraPosition = await getCurrentCameraPosition();

      setPendingPosition({
        ...position,
        camera: cameraPosition
      });

      // Show annotation creation form
      setIsCreatingAnnotation(false);
      ifcViewer.container.style.cursor = 'default';
      ifcViewer.container.removeEventListener('click', handleViewerClick);

    } catch (error) {
      console.error('Error getting position from click:', error);
      toast.error('Erreur lors de la récupération de la position');
    }
  };

  const get3DPositionFromClick = async (event) => {
    // This is a placeholder - implementation depends on your IFC viewer
    // You'll need to implement raycasting to get the 3D world position
    const rect = ifcViewer.container.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // For now, return mock coordinates
    return {
      x: x * 10,
      y: 0,
      z: y * 10
    };
  };

  const getCurrentCameraPosition = async () => {
    // Get current camera position and target from IFC viewer
    // Implementation depends on your viewer
    if (ifcViewer.context && ifcViewer.context.ifcCamera) {
      const camera = ifcViewer.context.ifcCamera;
      return {
        x: camera.cameraControls?.getPosition?.()?.x || 0,
        y: camera.cameraControls?.getPosition?.()?.y || 0,
        z: camera.cameraControls?.getPosition?.()?.z || 0
      };
    }
    return { x: 0, y: 0, z: 0 };
  };

  const createAnnotation = async () => {
    if (!annotationContent.trim() || !pendingPosition) {
      toast.error('Veuillez saisir un contenu pour l\'annotation');
      return;
    }

    try {
      const annotationData = {
        content: annotationContent,
        projectId: parseInt(projectId),
        positionX: pendingPosition.x,
        positionY: pendingPosition.y,
        positionZ: pendingPosition.z,
        cameraX: pendingPosition.camera.x,
        cameraY: pendingPosition.camera.y,
        cameraZ: pendingPosition.camera.z,
        annotationType: annotationType,
        isPublic: true,
        style: JSON.stringify({
          color: '#007bff',
          size: 'medium'
        })
      };

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/annotations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(annotationData)
      });

      if (response.ok) {
        const newAnnotation = await response.json();
        setAnnotations(prev => [newAnnotation, ...prev]);
        addAnnotationMarker(newAnnotation);
        
        // Reset form
        setAnnotationContent('');
        setPendingPosition(null);
        setAnnotationType('comment');
        
        toast.success('Annotation créée avec succès');
      } else {
        throw new Error('Failed to create annotation');
      }

    } catch (error) {
      console.error('Error creating annotation:', error);
      toast.error('Erreur lors de la création de l\'annotation');
    }
  };

  const focusOnAnnotation = (annotation) => {
    if (!ifcViewer) return;

    try {
      // Move camera to annotation position
      const targetPosition = {
        x: annotation.positionX,
        y: annotation.positionY,
        z: annotation.positionZ
      };

      // If camera position is stored, use it
      if (annotation.cameraX !== null) {
        const cameraPosition = {
          x: annotation.cameraX,
          y: annotation.cameraY,
          z: annotation.cameraZ
        };

        // Animate camera to saved position
        if (ifcViewer.context && ifcViewer.context.ifcCamera) {
          // Implementation depends on your IFC viewer's camera controls
          // This is a placeholder
          console.log('Moving camera to:', cameraPosition, 'looking at:', targetPosition);
        }
      }

    } catch (error) {
      console.error('Error focusing on annotation:', error);
    }
  };

  const deleteAnnotation = async (annotationId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette annotation ?')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/annotations/${annotationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        setAnnotations(prev => prev.filter(a => a.id !== annotationId));
        
        // Remove marker
        const marker = annotationMarkerRef.current.get(annotationId);
        if (marker) {
          marker.remove();
          annotationMarkerRef.current.delete(annotationId);
        }
        
        if (selectedAnnotation?.id === annotationId) {
          setSelectedAnnotation(null);
        }
        
        toast.success('Annotation supprimée');
      }
    } catch (error) {
      console.error('Error deleting annotation:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="annotation-system">
      <div className="annotation-toolbar">
        <button 
          className="btn btn-primary"
          onClick={startAnnotationCreation}
          disabled={!isConnected || isCreatingAnnotation}
        >
          <span className="icon">📝</span>
          Nouvelle annotation
        </button>
        
        <select 
          value={annotationType}
          onChange={(e) => setAnnotationType(e.target.value)}
          className="annotation-type-select"
        >
          <option value="comment">Commentaire</option>
          <option value="issue">Problème</option>
          <option value="arrow">Flèche</option>
          <option value="highlight">Surlignage</option>
          <option value="measure">Mesure</option>
        </select>
      </div>

      {pendingPosition && (
        <div className="annotation-creation-form">
          <h3>Nouvelle annotation</h3>
          <textarea
            value={annotationContent}
            onChange={(e) => setAnnotationContent(e.target.value)}
            placeholder="Saisissez votre annotation..."
            rows={3}
            className="form-control"
          />
          <div className="form-actions">
            <button onClick={createAnnotation} className="btn btn-primary">
              Créer
            </button>
            <button 
              onClick={() => {
                setPendingPosition(null);
                setAnnotationContent('');
              }}
              className="btn btn-secondary"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="annotation-list">
        <h3>Annotations ({annotations.length})</h3>
        {annotations.map(annotation => (
          <div 
            key={annotation.id} 
            className={`annotation-item ${selectedAnnotation?.id === annotation.id ? 'selected' : ''}`}
            onClick={() => setSelectedAnnotation(annotation)}
          >
            <div className="annotation-header">
              <span className="annotation-type-icon">
                {getAnnotationIcon(annotation.annotationType)}
              </span>
              <span className="annotation-author">{annotation.authorName}</span>
              <span className="annotation-date">
                {new Date(annotation.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="annotation-content">
              {annotation.content}
            </div>
            <div className="annotation-actions">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  focusOnAnnotation(annotation);
                }}
                className="btn btn-sm btn-outline-primary"
              >
                Voir
              </button>
              {annotation.authorId === userId && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteAnnotation(annotation.id);
                  }}
                  className="btn btn-sm btn-outline-danger"
                >
                  Supprimer
                </button>
              )}
            </div>
            
            {annotation.replies && annotation.replies.length > 0 && (
              <div className="annotation-replies">
                {annotation.replies.map(reply => (
                  <div key={reply.id} className="annotation-reply">
                    <strong>{reply.authorName}:</strong> {reply.content}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnnotationSystem;
