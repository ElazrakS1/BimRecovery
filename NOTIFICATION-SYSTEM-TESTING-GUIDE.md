# Guide de Test du Système de Notifications

Ce guide vous aide à tester le système de notifications dans l'application BIM Recovery pour vous assurer que les notifications sont correctement envoyées et reçues.

## Prérequis

1. Assurez-vous que le backend et le frontend sont en cours d'exécution
2. Connectez-vous avec un compte utilisateur valide
3. Ouvrez la console développeur de votre navigateur (F12 ou Ctrl+Shift+I)

## Test Manuel

### Étape 1: Tester l'envoi d'une notification depuis le backend

1. Connectez-vous à l'application
2. Utilisez le script de test fourni pour envoyer une notification de test:
   - Ouvrez la console de votre navigateur
   - Copiez-collez le script depuis `test-notifications.js` et exécutez-le

```javascript
// Exécuter le test complet
runNotificationTest();
```

### Étape 2: Vérifier la réception de la notification

Après avoir exécuté le script de test:

1. Vérifiez que l'icône de cloche dans l'en-tête affiche un badge avec le nombre de notifications non lues
2. Cliquez sur l'icône de cloche pour ouvrir le menu des notifications
3. Vérifiez que la notification de test est visible dans la liste
4. Vérifiez que le contenu de la notification est correct (titre, message, etc.)

### Étape 3: Tester l'attribution de tâches

1. Accédez à la page de gestion des tâches
2. Créez une nouvelle tâche et attribuez-la à un autre utilisateur
3. Connectez-vous en tant que cet utilisateur
4. Vérifiez que l'utilisateur reçoit bien une notification pour l'attribution de tâche

### Étape 4: Tester le marquage comme lu

1. Ouvrez le menu des notifications
2. Cliquez sur une notification non lue
3. Vérifiez qu'elle est maintenant marquée comme lue (l'indicateur bleu disparaît)
4. Vérifiez que le compteur de notifications non lues est décrémenté

## Test des API via Postman

Vous pouvez également tester les API de notifications directement avec Postman:

### 1. Obtenir toutes les notifications

```
GET /api/notifications
Headers: Authorization: Bearer <votre_token>
```

### 2. Envoyer une notification

```
POST /api/notifications
Headers: Authorization: Bearer <votre_token>
Body: 
{
  "userId": "<id_utilisateur_cible>",
  "type": "task",
  "title": "Notification de test",
  "message": "Ceci est un message de test",
  "data": {
    "taskId": 1,
    "projectId": 1
  }
}
```

### 3. Marquer une notification comme lue

```
PUT /api/notifications/{id}/read
Headers: Authorization: Bearer <votre_token>
```

### 4. Marquer toutes les notifications comme lues

```
PUT /api/notifications/read-all
Headers: Authorization: Bearer <votre_token>
```

## Diagnostics

Si les notifications ne fonctionnent pas correctement, vérifiez les points suivants:

### Problèmes côté client:

1. Vérifiez que la connexion SignalR est établie (recherchez les logs dans la console)
2. Vérifiez que le contexte de notification est bien initialisé (via window.__NOTIFICATION_CONTEXT__)
3. Assurez-vous que le token d'authentification est valide

### Problèmes côté serveur:

1. Vérifiez les logs du serveur pour les erreurs liées à SignalR ou aux notifications
2. Assurez-vous que `NotificationHub` est correctement configuré dans `Startup.cs`
3. Vérifiez que `NotificationService` injecte correctement `IHubContext<NotificationHub>`

## Fonctionnalités du système de notifications

- ✅ Notifications en temps réel via SignalR
- ✅ Stockage des notifications dans la base de données
- ✅ Indicateur visuel pour les notifications non lues
- ✅ Compteur de notifications
- ✅ Menu déroulant dans l'en-tête pour visualiser les notifications
- ✅ Affichage des notifications sur le tableau de bord
- ✅ Marquage des notifications comme lues (individuel et en masse)
- ✅ Navigation vers la ressource liée en cliquant sur une notification
