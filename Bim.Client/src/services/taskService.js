import api, { API_BASE_URL } from "../config/api.config";

export const taskService = {
  getAllTasks: async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      const response = await api.get("/api/Tasks");
      
      if (!response.data) {
        throw new Error("No data received from server");
      }
      
      return response.data;
    } catch (error) {
      console.error("Error in getAllTasks:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: error.config
      });

      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new Error("Session expired or invalid. Please log in again.");
      }
      throw error;
    }
  },
  
  getUserTasks: async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      const response = await api.get("/api/Tasks");
      
      if (!response.data) {
        throw new Error("No data received from server");
      }
      
      // Récupérer l`ID utilisateur depuis le token JWT pour filtrer les tâches
      const tokenPayload = JSON.parse(atob(token.split(".")[1]));
      const userId = tokenPayload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
      
      // Filtrer les tâches pour ne garder que celles de l`utilisateur actuel
      const filteredTasks = Array.isArray(response.data) 
        ? response.data.filter(task => task.assignedToId === userId || task.createdById === userId)
        : [];
      
      console.log(`Filtered tasks for user ${userId}: ${filteredTasks.length} tasks found`);
      return filteredTasks;
    } catch (error) {
      console.error("Error in getUserTasks:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });

      if (error.response?.status === 401) {
        throw new Error("Session expired or invalid. Please log in again.");
      }
      throw error;
    }
  },
  
  createTask: async (taskData) => {
    try {
      // Validate required fields
      if (!taskData.Title?.trim()) {
        throw new Error("Le titre de la tâche est requis");
      }
      if (!taskData.ProjectId) {
        throw new Error("Le projet est requis");
      }

      // Format data according to server expectations
      const normalizedTask = {
        Title: taskData.Title.trim(),
        Description: taskData.Description?.trim() || "",
        Status: taskData.Status || "Not Started",
        Priority: taskData.Priority || "Medium",
        DueDate: taskData.DueDate,
        ProjectId: Number(taskData.ProjectId),
        IsDeleted: false
      };
      
      // Add user assignment data if present
      // Support both single user assignment and multiple user assignments
      if (taskData.AssignedToIds && Array.isArray(taskData.AssignedToIds) && taskData.AssignedToIds.length > 0) {
        normalizedTask.AssignedToIds = taskData.AssignedToIds;
        normalizedTask.AssignedToId = taskData.AssignedToIds[0]; // Premier assigné pour compatibilité
      } else if (taskData.AssignedToId) {
        normalizedTask.AssignedToId = String(taskData.AssignedToId);
        normalizedTask.AssignedToIds = [taskData.AssignedToId];
      }

      // Type validation
      if (typeof normalizedTask.ProjectId !== 'number' || isNaN(normalizedTask.ProjectId)) {
        throw new Error("Le projet est invalide");
      }

      const response = await api.post("/api/Tasks", normalizedTask);
      return response.data;
    } catch (error) {
      console.error("Error in createTask:", error);
      
      // Handle specific validation errors from the server
      if (error.response?.data?.errors) {
        const errorMessages = [];
        for (const key in error.response.data.errors) {
          errorMessages.push(error.response.data.errors[key]);
        }
        throw new Error(errorMessages.join('\n'));
      }
      
      // Handle user validation errors specifically
      if (error.response?.data?.message?.includes("utilisateur") || 
          error.response?.status === 400 && error.response?.data?.invalidUserIds) {
        const errorData = error.response.data;
        throw {
          message: errorData.message || "Erreur de validation des utilisateurs",
          invalidUserIds: errorData.invalidUserIds || [],
          userDetails: errorData.details?.userDetails || {},
          suggestions: errorData.suggestions || [],
          isUserValidationError: true
        };
      }
      
      throw error;
    }
  },
  
  updateTask: async (taskId, taskData) => {
    try {
      // Ensure we're sending data in the format the server expects
      const taskToUpdate = {
        Id: taskId, // Using proper casing for C# model
        Title: taskData.title?.trim() || "",
        Status: taskData.status || "Pending",
        Priority: taskData.priority || "Medium",
        DueDate: taskData.dueDate || null,
        Description: taskData.description?.trim() || "",
        AssignedToId: taskData.assignedToId || taskData.assignedTo, // Handle both formats
        ProjectId: Number(taskData.projectId) // Using proper casing for C# model
      };

      console.log("Updating task with data:", JSON.stringify(taskToUpdate, null, 2));
      
      const response = await api.put(`/api/Tasks/${taskId}`, taskToUpdate);
      
      // Normalize the response to ensure consistent structure
      const normalizedTask = {
        ...taskToUpdate,
        ...response.data
      };
      
      return normalizedTask;
    } catch (error) {
      console.error("Error updating task:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      throw error;
    }
  },

  deleteTask: async (taskId) => {
    try {
      await api.delete(`/api/Tasks/${taskId}`);
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error;
    }
  },

  // Collaborative Tasks API
  createCollaborativeTask: async (taskData) => {
    try {
      if (!taskData.title?.trim()) {
        throw new Error("Le titre de la tâche est requis");
      }
      if (!taskData.projectId) {
        throw new Error("Le projet est requis");
      }

      // Format and validate task data
      const collaborativeTask = {
        title: taskData.title.trim(),
        description: taskData.description?.trim() || "",
        status: taskData.status || "pending", 
        priority: taskData.priority || "normal",
        dueDate: taskData.dueDate,
        projectId: Number(taskData.projectId),
        // Assignment data
        assignedToIds: Array.isArray(taskData.assignedToIds) ? taskData.assignedToIds : [],
        assignedToId: taskData.assignedToId || (taskData.assignedToIds?.length ? taskData.assignedToIds[0] : ""),
        // Additional fields for collaborative tasks
        tags: taskData.tags || "",
        relatedAnnotationId: taskData.relatedAnnotationId,
        targetElementId: taskData.targetElementId,
        positionX: taskData.positionX,
        positionY: taskData.positionY,
        positionZ: taskData.positionZ
      };

      const response = await api.post("/api/collaborationTasks", collaborativeTask);
      return response.data;
    } catch (error) {
      console.error("Error in createCollaborativeTask:", error);
      
      // Handle user validation errors specifically
      if (error.response?.data?.message?.includes("utilisateur") || 
          error.response?.status === 400 && 
          (error.response?.data?.details?.invalidUserIds || error.response?.data?.validationErrors)) {
          
        const errorData = error.response.data;
        // Structure standardisée pour les erreurs de validation utilisateur
        const userValidationError = {
          message: errorData.message || "Erreur de validation des utilisateurs",
          invalidUserIds: errorData.details?.invalidUserIds || 
                         errorData.validationErrors?.invalidUserIds || [],
          validUserIds: errorData.details?.validUserIds || 
                       errorData.validationErrors?.validUserIds || [],
          userDetails: errorData.details?.userDetails || 
                      errorData.validationErrors?.userDetails || {},
          suggestions: errorData.suggestions || 
                      errorData.validationErrors?.suggestions || [],
          isUserValidationError: true,
          errorResponse: errorData
        };
        
        // Générer des suggestions si aucune n'est fournie
        if (userValidationError.suggestions.length === 0) {
          userValidationError.suggestions.push(
            "Vérifiez que les utilisateurs existent dans le système",
            "Utilisez uniquement les utilisateurs disponibles dans la liste déroulante"
          );
          
          if (userValidationError.validUserIds.length > 0) {
            userValidationError.suggestions.push(
              `Vous pouvez continuer avec seulement les ${userValidationError.validUserIds.length} utilisateurs valides`
            );
          }
        }
        
        throw userValidationError;
      }
      
      throw error;
    }
  },
  
  assignUserToTask: async (taskId, userId, notes) => {
    try {
      if (!taskId) {
        throw new Error("L'identifiant de la tâche est requis");
      }
      if (!userId) {
        throw new Error("L'identifiant de l'utilisateur est requis");
      }
      
      const response = await api.post(`/api/collaborationTasks/${taskId}/assignments`, {
        userId,
        notes: notes || ""
      });
      
      return response.data;
    } catch (error) {
      console.error("Error in assignUserToTask:", error);
      
      // Handle user validation errors
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        
        // Check if it's a user validation error
        if (errorData.message?.includes("utilisateur") || 
            errorData.errors?.some(e => e.includes("utilisateur")) ||
            errorData.details?.invalidUserIds) {
          
          throw {
            message: errorData.message || "Erreur de validation de l'utilisateur",
            userId,
            taskId,
            isUserValidationError: true,
            details: errorData.details || {},
            suggestions: errorData.suggestions || []
          };
        }
      }
      
      throw error;
    }
  },
  
  // Get all collaborative tasks
  getCollaborativeTasks: async (projectId = null, filters = {}) => {
    try {
      let url = "/api/collaborationTasks";
      
      if (projectId) {
        url = `/api/collaborationTasks/project/${projectId}`;
      }
      
      // Add query params for filtering
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.search) params.append('search', filters.search);
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error("Error in getCollaborativeTasks:", error);
      throw error;
    }
  },
};