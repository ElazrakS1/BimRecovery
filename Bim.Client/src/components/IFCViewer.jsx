import { useEffect, useRef, useState, useCallback, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { IfcViewerAPI } from 'web-ifc-viewer';
import * as THREE from 'three';
import {
  Color,
  AmbientLight,
  DirectionalLight,
  DoubleSide,
  Raycaster,
  Vector2,
  Vector3,
  Plane,
  WebGLRenderer,
  MeshLambertMaterial
} from 'three';
import { uploadIFCFile } from '../services/ifcService';
import { getProjects, uploadFileToProject } from '../services/projectService';
import { uploadModelScreenshot } from '../services/modelService';
import ModelTreeView from './ModelTreeView';
import ErrorBoundary from './ErrorBoundary';
import AnnotationSystem from './Collaboration/AnnotationSystem';
import { AuthContext } from '../context/AuthContext';
import { checkWebGLCompatibility, createOptimalWebGLConfig } from '../utils/webgl-checker';
import './IFCViewer.css';

export default function IFCViewer() {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const tooltipRef = useRef(null);
  const location = useLocation();
  const { userData } = useContext(AuthContext);
  const isAdmin = userData?.roles?.includes('Admin');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [error, setError] = useState(null);
  const [showClippingPlanes, setShowClippingPlanes] = useState(false);
  const [isViewerReady, setIsViewerReady] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [currentFile, setCurrentFile] = useState(null);const [hoveredElement, setHoveredElement] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [horizontalClipPlane, setHorizontalClipPlane] = useState(null);
  const [verticalClipPlane, setVerticalClipPlane] = useState(null);
  const [horizontalClipValue, setHorizontalClipValue] = useState(0);
  const [verticalClipValue, setVerticalClipValue] = useState(0);

  const handleMouseMove = useCallback(async (event) => {
    if (!viewerRef.current || !tooltipRef.current) return;

    try {
      if (!viewerRef.current.context.ifcCamera.raycaster) {
        viewerRef.current.context.ifcCamera.raycaster = new Raycaster();
      }

      const bounds = containerRef.current.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      const y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      
      viewerRef.current.context.ifcCamera.raycaster.setFromCamera(
        { x, y },
        viewerRef.current.context.getCamera()
      );

      const result = await viewerRef.current.IFC.pickIfcItem(true);

      if (result) {
        const { modelID, id } = result;
        const props = await viewerRef.current.IFC.getProperties(modelID, id, true);

        if (props) {
          let name = '';

          if (props.Name) {
            name = props.Name.value;
          } else if (props.name) {
            name = props.name;
          } else if (props.LongName) {
            name = props.LongName.value;
          } else if (props.ObjectType) {
            name = props.ObjectType.value;
          } else if (props.type) {
            name = props.type;
          } else {
            name = `${props.constructor.name} (${props.expressID})`;
          }

          tooltipRef.current.textContent = name;
          tooltipRef.current.style.display = 'block';
          tooltipRef.current.style.left = event.clientX + 10 + 'px';
          tooltipRef.current.style.top = event.clientY + 10 + 'px';
        }
      } else {
        tooltipRef.current.style.display = 'none';
      }
    } catch (error) {
      console.error('Error during mouse move handling:', error);
      tooltipRef.current.style.display = 'none';
    }
  }, []);

  const handleClick = useCallback(async (event) => {
    if (!viewerRef.current) return;

    const result = await viewerRef.current.IFC.pickIfcItem(true, true);
    if (result) {
      const { modelID, id } = result;
      await viewerRef.current.IFC.centerOnElement(modelID, id);
    }
  }, []);

  const setupScene = useCallback((viewer) => {
    if (!viewer || !containerRef.current) return;

    // Configure viewer settings
    viewer.context.ifcCamera.cameraControls.enableRotate = true;
    viewer.context.ifcCamera.cameraControls.enableZoom = true;
    viewer.context.ifcCamera.cameraControls.enablePan = true;
    viewer.context.ifcCamera.cameraControls.mouseButtons.left = 1;
    viewer.context.ifcCamera.cameraControls.autoRotate = false;
    viewer.context.ifcCamera.cameraControls.enableAutoRotate = false;
    viewer.context.ifcCamera.cameraControls.enableFollow = false;

    // Initialize the scene with grid and axes
    viewer.grid.setGrid();
    viewer.axes.setAxes();

    // Setup default camera position
    viewer.context.getCamera().position.set(10, 10, 10);
    viewer.context.getCamera().lookAt(0, 0, 0);

    // Create default lights
    const scene = viewer.context.getScene();
    const ambientLight = new AmbientLight(0xffffff, 0.7);
    const directionalLight = new DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    scene.add(ambientLight);
    scene.add(directionalLight);

    // Add event listeners
    containerRef.current.addEventListener('mousemove', handleMouseMove);
    containerRef.current.addEventListener('click', handleClick);
  }, [handleMouseMove, handleClick]);
  const resetScene = useCallback(() => {
    if (viewerRef.current?.context?.getCamera()) {
      viewerRef.current.context.getCamera().position.set(10, 10, 10);
      viewerRef.current.context.getCamera().lookAt(0, 0, 0);
      viewerRef.current.context.getRenderer().setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      );
    }
  }, []);
  
  const fitModelToView = useCallback(() => {
    if (viewerRef.current?.context) {
      try {
        // Essayer d'utiliser la fonction fitToSphere des contrôles de caméra
        if (viewerRef.current.context.ifcCamera.cameraControls.fitToSphere) {
          viewerRef.current.context.ifcCamera.cameraControls.fitToSphere();
          return;
        }
        
        // Si fitToSphere n'est pas disponible, centrer manuellement sur le modèle
        if (viewerRef.current.IFC.context.items.ifcModels.length > 0) {
          const model = viewerRef.current.IFC.context.items.ifcModels[0];
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          // Calculer une distance appropriée basée sur la taille du modèle
          const maxDim = Math.max(size.x, size.y, size.z);
          const distance = maxDim * 2;
          
          // Positionner la caméra pour voir tout le modèle
          viewerRef.current.context.getCamera().position.set(
            center.x + distance,
            center.y + distance,
            center.z + distance
          );
          viewerRef.current.context.getCamera().lookAt(center);
          
          // Mettre à jour les contrôles
          if (viewerRef.current.context.ifcCamera.cameraControls.update) {
            viewerRef.current.context.ifcCamera.cameraControls.update();
          }
        }
      } catch (error) {
        console.error('Error fitting model to view:', error);
      }
    }
  }, []);

  const clearScene = useCallback(() => {
    if (!viewerRef.current?.context) return;

    const scene = viewerRef.current.context.getScene();

    scene.traverse((object) => {
      if (object.type === 'Mesh') {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => {
              if (mat.map) mat.map.dispose();
              mat.dispose();
            });
          } else {
            if (object.material.map) object.material.map.dispose();
            object.material.dispose();
          }
        }
      }
    });

    // Safely clear IFC models
    if (viewerRef.current.IFC.context.items.ifcModels) {
      viewerRef.current.IFC.context.items.ifcModels.forEach(model => {
        if (model && typeof model.dispose === 'function') {
          model.dispose();
        }
      });
      viewerRef.current.IFC.context.items.ifcModels.length = 0;
    }

    // Keep only essential objects
    const essentialObjects = scene.children.filter(child => 
      child === viewerRef.current.grid ||
      child === viewerRef.current.axes ||
      child.type === 'AmbientLight' ||
      child.type === 'DirectionalLight'
    );

    // Remove all other objects
    scene.children.forEach(child => {
      if (!essentialObjects.includes(child)) {
        scene.remove(child);
      }
    });

    // Force renderer update
    viewerRef.current.context.getRenderer().renderLists.dispose();
  }, []);

  const handleModelLoaded = useCallback(() => {
    if (viewerRef.current?.context) {
      // Enable shadows
      viewerRef.current.shadowDropper.renderShadow = true;

      // Enable post-processing
      viewerRef.current.context.renderer.postProduction.active = true;

      // Reset camera to a good viewing position
      const camera = viewerRef.current.context.getCamera();
      camera.position.set(10, 10, 10);
      camera.lookAt(0, 0, 0);

      // Set clip planes for better visualization
      viewerRef.current.clipper.active = showClippingPlanes;
    }
  }, [showClippingPlanes]);

  const initClippingPlanes = useCallback(() => {
    if (!viewerRef.current || !isViewerReady) return;

    try {
      const ifcViewer = viewerRef.current;
      const renderer = ifcViewer.context.getRenderer();
      
      // Create clipping planes
      const horizontalPlane = new Plane(new Vector3(0, -1, 0), 0);
      const verticalPlane = new Plane(new Vector3(-1, 0, 0), 0);
      
      // Set the clipping planes
      renderer.clippingPlanes = [horizontalPlane, verticalPlane];
      renderer.localClippingEnabled = true;
      
      setHorizontalClipPlane(horizontalPlane);
      setVerticalClipPlane(verticalPlane);
      
      // Enable clipping on all materials
      ifcViewer.context.getScene().traverse((node) => {
        if (node.isMesh) {
          node.material.clippingPlanes = renderer.clippingPlanes;
          node.material.needsUpdate = true;
        }
      });
    } catch (error) {
      console.error('Error initializing clipping planes:', error);
    }
  }, [isViewerReady]);

  useEffect(() => {
    if (showClippingPlanes) {
      initClippingPlanes();
    } else if (viewerRef.current?.clipper) {
      viewerRef.current.clipper.active = false;
      viewerRef.current.clipper.deleteAllPlanes();
      setHorizontalClipPlane(null);
      setVerticalClipPlane(null);
    }
  }, [showClippingPlanes, initClippingPlanes]);

  const updateClipPlane = useCallback((plane, value) => {
    if (!viewerRef.current?.clipper || !plane) return;
    
    try {
      // Update plane constant (position)
      plane.constant = value * 5; // Scale the value for better control
      
      // Force scene update
      const scene = viewerRef.current.context.getScene();
      scene.traverse((node) => {
        if (node.isMesh) {
          node.material.needsUpdate = true;
        }
      });
      
      // Render the scene
      viewerRef.current.context.getRenderer().render(
        scene,
        viewerRef.current.context.getCamera()
      );
    } catch (error) {
      console.error('Error updating clip plane:', error);
    }
  }, []);

  useEffect(() => {
    let viewer = null;
    const container = containerRef.current;    const init = async () => {
      if (viewer || !container) return;

      try {
        container.innerHTML = '';
        container.style.width = '100%';
        container.style.height = '100%';

        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'element-tooltip';
        document.body.appendChild(tooltip);
        tooltipRef.current = tooltip;

        // Check WebGL compatibility first
        const webglInfo = checkWebGLCompatibility();
        if (!webglInfo.supported) {
          throw new Error(`WebGL is not supported in your browser. Details: ${webglInfo.error || 'Unknown error'}`);
        }
        
        console.log('WebGL compatibility check passed:', webglInfo);
        
        // Get optimal WebGL config based on device capabilities
        const webglConfig = createOptimalWebGLConfig(container);

        const baseUrl = window.location.origin;try {
          // Configure WebGL context attributes first
          const canvas = document.createElement('canvas');
          container.appendChild(canvas);
          
          // Create WebGL context with specific attributes to avoid shader issues
          const contextAttributes = {
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true,
            stencil: false,
            powerPreference: 'high-performance'
          };
          
          // Pre-initialize WebGL context to check compatibility
          const gl = canvas.getContext('webgl2', contextAttributes) || 
                     canvas.getContext('webgl', contextAttributes) || 
                     canvas.getContext('experimental-webgl', contextAttributes);
                     
          if (!gl) {
            throw new Error('WebGL not supported. Please use a WebGL-compatible browser.');
          }
          
          // Create viewer with improved settings
          viewer = new IfcViewerAPI({
            container,
            backgroundColor: new Color(0xffffff),
            wasmPath: `${baseUrl}/wasm/`,
            webWorkerPath: `${baseUrl}/wasm/web-ifc-mt.worker.js`,
            preselectMaterial: {
              opacity: 0,
              transparent: true,
              color: new Color(0x3B82F6),
            },
            defaultMaterial: {
              transparent: false,
              metalness: 0.1,
              roughness: 0.8,
              side: DoubleSide, // Use constant instead of number
            },
            // Add WebGL renderer parameters
            renderer: {
              antialias: true,
              alpha: true,
              preserveDrawingBuffer: true
            }
          });

          // Initialize IFC viewer components
          await viewer.IFC.setWasmPath(`${baseUrl}/wasm/`);
          
          // Ensure proper WebGL context
          const renderer = viewer.context.getRenderer();
          renderer.setPixelRatio(window.devicePixelRatio);
          renderer.setSize(container.clientWidth, container.clientHeight);
          
          // Force shader compilation to detect issues early
          renderer.compile(viewer.context.getScene(), viewer.context.getCamera());
        } catch (initError) {
          console.error("WebGL initialization error:", initError);
          setError(`WebGL initialization failed: ${initError.message}`);
          throw initError;
        }
        
        // Configure viewer settings
        viewer.IFC.selector.preselection = false;
        viewer.IFC.selector.highlightOnHover = false;
        viewer.clipper.active = false;

        // Store viewer reference and set ready state
        viewerRef.current = viewer;
        setIsViewerReady(true);

        // Initialize scene
        setupScene(viewer);
      } catch (error) {
        console.error("Error initializing IFC viewer:", error);
        setError(error.message);
      }
    };

    init();    return () => {
      if (viewerRef.current) {
        try {
          // Remove event listeners
          containerRef.current?.removeEventListener('mousemove', handleMouseMove);
          containerRef.current?.removeEventListener('click', handleClick);
          
          // Remove tooltip
          tooltipRef.current?.remove();
          
          // Clear scene first
          clearScene();
          
          // Properly dispose of WebGL resources
          if (viewerRef.current.context) {
            // Stop any ongoing animations
            if (viewerRef.current.context.ifcCamera?.cameraControls) {
              viewerRef.current.context.ifcCamera.cameraControls.dispose();
            }
            
            // Get the renderer and scene
            const renderer = viewerRef.current.context.getRenderer();
            const scene = viewerRef.current.context.getScene();
            
            // Dispose of materials and geometries
            scene.traverse((object) => {
              if (object.isMesh) {
                if (object.geometry) {
                  object.geometry.dispose();
                }
                
                if (object.material) {
                  if (Array.isArray(object.material)) {
                    object.material.forEach(material => {
                      if (material.map) material.map.dispose();
                      if (material.lightMap) material.lightMap.dispose();
                      if (material.bumpMap) material.bumpMap.dispose();
                      if (material.normalMap) material.normalMap.dispose();
                      if (material.specularMap) material.specularMap.dispose();
                      if (material.envMap) material.envMap.dispose();
                      material.dispose();
                    });
                  } else {
                    if (object.material.map) object.material.map.dispose();
                    if (object.material.lightMap) object.material.lightMap.dispose();
                    if (object.material.bumpMap) object.material.bumpMap.dispose();
                    if (object.material.normalMap) object.material.normalMap.dispose();
                    if (object.material.specularMap) object.material.specularMap.dispose();
                    if (object.material.envMap) object.material.envMap.dispose();
                    object.material.dispose();
                  }
                }
              }
            });
            
            // Dispose of the renderer and WebGL context
            renderer.renderLists.dispose();
            renderer.dispose();
            renderer.forceContextLoss();
          }
          
          // Clear viewer reference
          viewerRef.current = null;
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      }
    };
  }, [clearScene, handleMouseMove, handleClick]);

  useEffect(() => {
    if (viewerRef.current && isViewerReady) {
      viewerRef.current.clipper.active = showClippingPlanes;
    }
  }, [showClippingPlanes, isViewerReady]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projectsData = await getProjects();
        setProjects(projectsData);
      } catch (err) {
        console.error('Error loading projects:', err);
        setError('Failed to load projects');
      }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    if (location.state?.fileUrl && isViewerReady) {
      const loadFileFromUrl = async () => {
        try {
          setIsLoading(true);
          setError(null);
          
          const response = await fetch(location.state.fileUrl);
          const blob = await response.blob();
          const file = new File([blob], location.state.fileName, { type: 'application/x-step' });
          
          await loadIfcModel(file);
          setCurrentFile(file);
        } catch (error) {
          console.error('Error loading IFC file:', error);
          setError('Failed to load IFC model: ' + error.message);
        } finally {
          setIsLoading(false);
        }
      };

      loadFileFromUrl();
    }
  }, [location.state, isViewerReady]);

  const loadIfcModel = async (file) => {
    if (!viewerRef.current || !isViewerReady) return;

    setIsLoading(true);
    setError(null);

    try {
      // Clear existing models
      clearScene();

      // Configure default material settings
      const defaultMaterial = {
        material: {
          vertexColors: false,
          side: DoubleSide,
          metalness: 0.1,
          roughness: 0.8,
          transparent: false,
          opacity: 1.0,
        },
        skipStreaming: false,
        streamingSizes: [0, 2000000, 5000000]
      };

      // Load new model with improved settings
      const model = await viewerRef.current.IFC.loadIfc(file, {
        ...defaultMaterial,
        webIfc: {
          COORDINATE_TO_ORIGIN: true,
          USE_FAST_BOOLS: false
        },
        removePreviousModel: true
      });

      // Apply post-loading configurations
      if (model) {
        // Ensure proper material settings for all meshes
        model.traverse((child) => {
          if (child.isMesh) {
            child.material.side = DoubleSide;
            child.material.needsUpdate = true;
            // Enable shadows
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // Update lighting
        const scene = viewerRef.current.context.getScene();
        const lights = scene.children.filter(
          child => child.isLight && !child.isAmbientLight
        );

        // Reset directional light if needed
        if (lights.length === 0) {
          const directionalLight = new DirectionalLight(0xffffff, 1);
          directionalLight.position.set(10, 10, 10);
          directionalLight.castShadow = true;
          scene.add(directionalLight);
        }

        // Ensure ambient light exists and has correct intensity
        const ambientLight = scene.children.find(child => child.isAmbientLight);
        if (!ambientLight) {
          const newAmbientLight = new AmbientLight(0xffffff, 0.8);
          scene.add(newAmbientLight);
        }

        // Force renderer to use physically correct lighting
        const renderer = viewerRef.current.context.getRenderer();
        renderer.physicallyCorrectLights = true;
        renderer.shadowMap.enabled = true;

        // Update the scene
        viewerRef.current.context.getRenderer().setSize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      }

      handleModelLoaded();
      return model;
    } catch (error) {
      console.error('Error loading IFC model:', error);
      setError('Failed to load IFC model. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !isViewerReady) return;

    setIsUploading(true);
    setError(null);

    try {
      if (file.size > 100 * 1024 * 1024) {
        throw new Error('File size exceeds 100MB limit');
      }

      if (!file.name.toLowerCase().endsWith('.ifc')) {
        throw new Error('Only IFC files are supported');
      }

      await loadIfcModel(file);
      setCurrentFile(file);
    } catch (error) {
      console.error('Error handling IFC file:', error);
      setError(error.message || 'Failed to process IFC file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddToProject = async () => {
    if (!selectedProjectId || !currentFile) {
      setError("Veuillez sélectionner un projet et charger un fichier IFC");
      return;
    }

    try {
      setIsLoading(true);
      await uploadFileToProject(selectedProjectId, currentFile);
      setError(null);
      // Réinitialiser la sélection
      setSelectedProjectId('');
      setCurrentFile(null);
    } catch (error) {
      console.error('Error adding file to project:', error);
      setError('Failed to add file to project');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleClippingPlanes = () => {
    setShowClippingPlanes(!showClippingPlanes);
  };

  const captureScreenshot = useCallback(async () => {
    if (!viewerRef.current || !currentFile?.id) return;

    try {
      setIsCapturingScreenshot(true);

      // Temporarily hide any UI elements that shouldn't be in the screenshot
      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'none';
      }

      // Get the WebGL canvas
      const canvas = viewerRef.current.context.getRenderer().domElement;

      // Ensure the model is properly centered and visible
      fitModelToView();

      // Wait a moment for the view to stabilize
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture the canvas content
      const base64Image = canvas.toDataURL('image/png');

      // Upload the screenshot
      await uploadModelScreenshot(currentFile.id, base64Image);

      // Show success message
      console.log('Screenshot captured and uploaded successfully');

      // Restore UI elements
      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'block';
      }
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      setError('Failed to capture screenshot');
    } finally {
      setIsCapturingScreenshot(false);
    }
  }, [currentFile?.id, fitModelToView]);

  return (
    <div className="viewer-wrapper">      <aside className="viewer-sidebar">
        <div className="viewer-tools">
          <div className="file-upload-container">
            <label className="file-upload-label">
              <input
                type="file"
                accept=".ifc"
                onChange={handleFileUpload}
                disabled={isUploading || isLoading || !isViewerReady}
                className="file-upload-input"
              />
              <span>
                {isUploading ? 'Téléchargement en cours...' : 'Glissez un fichier IFC ici ou cliquez pour sélectionner'}
              </span>
            </label>
          </div>

          {!isViewerReady && (
            <div className="status-message loading">Initialisation du viewer...</div>
          )}
          {isUploading && (
            <div className="status-message loading">Téléchargement du fichier...</div>
          )}
          {isLoading && (
            <div className="status-message loading">Chargement du modèle...</div>
          )}          {error && (
            <div className="status-message error">{error}</div>
          )}
          
          {currentFile && (
            <div className="project-selection mt-4">
              <h3 className="tree-title">Ajouter à un projet</h3>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="project-select"
                disabled={isLoading}
              >
                <option value="">Sélectionner un projet</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddToProject}
                className="add-to-project-button"
                disabled={!selectedProjectId || isLoading}
              >
                {isLoading ? 'Ajout en cours...' : 'Ajouter au projet'}
              </button>
            </div>
          )}<div className="tools-section">
            <h3 className="tree-title">Outils</h3>
            <div className="tools-grid">              <button 
                className={`tool-button ${showClippingPlanes ? 'active' : ''}`}
                onClick={toggleClippingPlanes} 
                disabled={!isViewerReady}
              >
                <i className="fas fa-cut"></i>
                Plan de coupe
              </button>
              
              {showClippingPlanes && (
                <div className="clipping-planes-controls">
                  <div className="clip-control">
                    <label>Plan horizontal</label>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      step="0.1"
                      value={horizontalClipValue}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setHorizontalClipValue(value);
                        updateClipPlane(horizontalClipPlane, value);
                      }}
                    />
                  </div>
                  <div className="clip-control">
                    <label>Plan vertical</label>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      step="0.1"
                      value={verticalClipValue}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setVerticalClipValue(value);
                        updateClipPlane(verticalClipPlane, value);
                      }}
                    />
                  </div>
                </div>
              )}
              <button 
                className="tool-button" 
                onClick={() => {
                  if (viewerRef.current?.context) {
                    resetScene();
                  }
                }}
                disabled={!isViewerReady}
              >
                <i className="fas fa-sync-alt"></i>
                Réinitialiser la vue
              </button>
              <button 
                className="tool-button" 
                onClick={() => {
                  if (viewerRef.current?.IFC?.selector) {
                    viewerRef.current.IFC.selector.unpickIfcItems();
                    setSelectedElement(null);
                  }
                }}
                disabled={!isViewerReady}
              >
                <i className="fas fa-mouse-pointer"></i>
                Désélectionner
              </button>              <button 
                className="tool-button" 
                onClick={fitModelToView}
                disabled={!isViewerReady}
              >
                <i className="fas fa-expand"></i>
                Ajuster la vue
              </button>
              <button 
                className="tool-button" 
                onClick={captureScreenshot}
                disabled={isCapturingScreenshot || !isViewerReady}
              >
                {isCapturingScreenshot ? 'Capture en cours...' : 'Capturer l\'écran'}
              </button>
            </div>
          </div>
        </div>

        <div className="tree-container">
          {isViewerReady && (
            <ErrorBoundary>
              <h3 className="tree-title">Structure du modèle</h3>
              <div className="model-tree">
                <ModelTreeView viewer={viewerRef.current} />
              </div>
            </ErrorBoundary>
          )}
        </div>
      </aside>      <main className="viewer-container">
        <div ref={containerRef} className="w-full h-full" />
        {isViewerReady && (
          <AnnotationSystem 
            viewer={viewerRef.current}
            projectId={selectedProjectId}
          />
        )}
        {(isLoading || isUploading) && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
          </div>
        )}
      </main>
    </div>
  );
}