interface Project {
  id: string;
  name: string;
  description?: string;
  ifcFiles?: Array<{
    id: string;
    name: string;
    path: string;
    uploadDate: string;
  }>;
}

interface AuthContextType {
  isAuthenticated: boolean;
  checkAuth: () => Promise<boolean>;
  user: any; // Replace with proper user type
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
}

interface ProjectServiceType {
  getProject: (id: string) => Promise<Project>;
  deleteFile: (projectId: string, fileId: string) => Promise<void>;
  uploadFileToProject: (projectId: string, file: File) => Promise<void>;
}

interface IFCServiceType {
  convertIFCToPDF: (file: File) => Promise<Blob>;
  convertIFCToXML: (file: File) => Promise<string>;
}

export {
  Project,
  AuthContextType,
  ProjectServiceType,
  IFCServiceType
};
