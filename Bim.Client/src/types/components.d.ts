import { FunctionComponent } from 'react';

export interface UserData {
  avatar?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface HeaderProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  userData?: UserData;
}

export interface NotificationsProps {
  notifications: Array<any>;
  isLoading: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
}

declare global {
  interface Window {
    _authCheckInProgress?: boolean;
  }
}

export interface IfcAPI {
  schema: any;
  [key: string]: any;
}
