import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from '../config/api.config';

class NotificationService {
    constructor() {
        this.connection = null;
    }    async startConnection() {
        try {
            // Si une connexion est déjà établie, l'utiliser
            if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
                console.log('SignalR connection already established');
                return true;
            }
            
            // Si une connexion est déjà en cours, attendre qu'elle se termine
            if (this.connection && this.connection.state === signalR.HubConnectionState.Connecting) {
                console.log('SignalR connection is already being established, waiting...');
                // Attendre que la connexion soit établie ou échoue avant de continuer
                return new Promise((resolve) => {
                    let attempts = 0;
                    const maxAttempts = 10; // Maximum 5 secondes d'attente (10 x 500ms)
                    
                    const checkState = setInterval(() => {
                        attempts++;
                        
                        if (this.connection.state === signalR.HubConnectionState.Connected) {
                            clearInterval(checkState);
                            console.log('Existing connection succeeded');
                            resolve(true);
                        } else if (this.connection.state === signalR.HubConnectionState.Disconnected || attempts >= maxAttempts) {
                            clearInterval(checkState);
                            console.log('Existing connection failed or timed out, creating new connection');
                            // Continuer avec une nouvelle tentative
                            this.connection = null;
                            resolve(this._createNewConnection());
                        }
                    }, 500);
                });
            }
            
            return this._createNewConnection();
            
        } catch (err) {
            console.warn('Error in startConnection:', err);
            return false;
        }
    }
    
    // Méthode interne pour créer une nouvelle connexion
    async _createNewConnection() {
        try {
            // Fermer l'ancienne connexion si elle existe
            if (this.connection) {
                try {
                    await this.connection.stop();
                    console.log('Stopped previous connection');
                } catch (e) {
                    console.warn('Error stopping previous connection:', e);
                }
                this.connection = null;
            }
            
            // Récupérer le token d'authentification
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (!token) {
                console.warn('No authentication token found, cannot connect to notification hub');
                return false;
            }
            
            // Construire une nouvelle connexion avec une gestion d'erreur améliorée
            this.connection = new signalR.HubConnectionBuilder()
                .withUrl(`${API_BASE_URL}/notificationHub`, {
                    accessTokenFactory: () => token,
                    skipNegotiation: true,
                    transport: signalR.HttpTransportType.WebSockets
                })
                .withAutomaticReconnect([0, 1000, 2000, 5000, 10000, 15000, 30000])
                .configureLogging(signalR.LogLevel.Warning)
                .build();
            
            // Configurer les handlers d'événements pour la connexion
            this.connection.onreconnecting(error => {
                console.log('Attempting to reconnect to notification hub:', error);
            });
            
            this.connection.onreconnected(connectionId => {
                console.log('Reconnected to notification hub with ID:', connectionId);
            });
            
            this.connection.onclose(error => {
                console.log('Connection to notification hub closed:', error);
            });
            
            // Délai pour éviter les problèmes de connexion concurrentes
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Ajouter un timeout pour éviter les connexions bloquées
            const connectionPromise = this.connection.start();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timeout')), 10000)
            );
            
            await Promise.race([connectionPromise, timeoutPromise]);
            console.log('Connected to notification hub successfully');
            return true;
        } catch (err) {
            console.warn('Error connecting to notification hub (non-critical):', err);
            // Ne pas propager l'erreur, l'application doit continuer à fonctionner même sans notifications
            return false;
        }
    }    onTaskNotification(callback) {
        if (!this.connection) {
            console.warn('Cannot register notification handler: connection not established');
            return;
        }
        
        // Éviter les doublons en retirant d'abord les anciens handlers
        this.connection.off('ReceiveTaskNotification');
        
        // Enregistrer le nouveau handler avec un wrapper pour le débogage
        this.connection.on('ReceiveTaskNotification', (notification) => {
            console.log('Received task notification:', notification);
            callback(notification);
        });
        
        // Fallback pour les anciennes versions du serveur
        this.connection.off('ReceiveNotification');
        this.connection.on('ReceiveNotification', (notification) => {
            console.log('Received generic notification:', notification);
            if (typeof notification === 'string') {
                // Essayer de parser le JSON si c'est une chaîne
                try {
                    const parsedNotification = JSON.parse(notification);
                    callback(parsedNotification);
                } catch (e) {
                    // Si ce n'est pas du JSON, créer un objet notification
                    callback({ message: notification });
                }
            } else {
                // Si c'est déjà un objet, le passer tel quel
                callback(notification);
            }
        });
    }async stopConnection() {
        try {
            if (this.connection && this.connection.state !== signalR.HubConnectionState.Disconnected) {
                console.log('Stopping SignalR connection...');
                await this.connection.stop();
                console.log('Disconnected from notification hub');
                this.connection = null;
            } else if (this.connection) {
                console.log('Connection already disconnected');
                this.connection = null;
            }
        } catch (error) {
            console.warn('Error during disconnection:', error);
            // Réinitialiser la connexion même en cas d'erreur
            this.connection = null;
        }
    }// Méthode pour envoyer une notification à un utilisateur lors de l'attribution d'une tâche
    async sendTaskAssignmentNotification(userId, taskId, taskTitle) {
        try {
            // Valider les paramètres
            if (!userId) {
                console.warn('Cannot send notification: missing userId');
                return false;
            }
            
            if (!taskId) {
                console.warn('Cannot send notification: missing taskId');
                // On peut continuer avec un taskId null, mais c'est suspect
            }
            
            // Tenter de se connecter si ce n'est pas déjà fait
            if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
                console.log('Connection not established, attempting to connect before sending notification...');
                const connected = await this.startConnection();
                if (!connected) {
                    console.warn('Failed to establish connection for task notification');
                    return false;
                }
            }
            
            // Normaliser l'ID utilisateur (s'assurer qu'il s'agit d'une chaîne)
            const normalizedUserId = typeof userId === 'object' && userId.id 
                ? userId.id.toString()
                : userId.toString();
            
            // Log de débogage pour comprendre les arguments
            console.log('Sending task assignment notification with args:', {
                userId: normalizedUserId,
                taskId,
                taskTitle,
                connectionState: this.connection ? this.connection.state : 'no connection'
            });
            
            // Construire les données de notification
            const notificationData = {
                taskId: taskId,
                title: taskTitle,
                message: `Une nouvelle tâche vous a été assignée: "${taskTitle}"`,
                timestamp: new Date().toISOString()
            };
            
            // Essayer d'envoyer avec différentes méthodes, en ordre de préférence
            const methods = ['SendTaskAssignmentNotification', 'SendTaskNotification', 'SendNotification'];
            
            for (const method of methods) {
                try {
                    await this.connection.invoke(method, normalizedUserId, notificationData);
                    console.log(`Task assignment notification sent to user ${normalizedUserId} for task ${taskId} using method ${method}`);
                    return true;
                } catch (methodError) {
                    console.warn(`Failed with method ${method}:`, methodError);
                    // Continuer avec la méthode suivante
                    continue;
                }
            }
            
            // Toutes les méthodes ont échoué
            console.error('All notification methods failed');
            return false;
        } catch (error) {
            console.error('Failed to send task assignment notification:', error);
            return false;
        }
    }
}

// Export both the class and a singleton instance
export const notificationService = new NotificationService();
export default NotificationService;
