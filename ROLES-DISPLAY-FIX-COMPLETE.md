# Correction de l'affichage des rôles utilisateurs

## Problème identifié
Les rôles des utilisateurs n'étaient pas correctement affichés dans le tableau de gestion des utilisateurs. Certains utilisateurs ayant le rôle "Admin" dans la base de données étaient affichés avec un rôle "User" dans l'interface.

## Cause du problème
L'endpoint `/api/collaborationtasks/available-users` utilisé pour récupérer la liste des utilisateurs ne renvoyait pas les informations de rôles. Les propriétés retournées étaient limitées à :
- id
- firstName
- lastName
- email
- company
- position

Sans la propriété `roles`, le frontend affichait par défaut le rôle "User".

## Solution implémentée
La solution a consisté à modifier le endpoint `/api/collaborationtasks/available-users` pour inclure les rôles des utilisateurs dans la réponse API. Les modifications suivantes ont été apportées :

1. **Injection de UserManager** : Le `UserManager<ApplicationUser>` a été injecté dans le contrôleur `CollaborationTasksController` pour permettre l'accès aux rôles des utilisateurs.

2. **Modification du endpoint** : La méthode `GetAvailableUsers()` a été modifiée pour :
   - Récupérer les utilisateurs actifs avec leurs informations de base
   - Pour chaque utilisateur, récupérer ses rôles via `UserManager.GetRolesAsync(user)`
   - Créer un nouvel objet anonyme incluant les rôles et retourner cette liste complète

3. **Format de réponse API** : La réponse API inclut maintenant une propriété `roles` qui est une liste des rôles de l'utilisateur.

## Tests effectués
- Vérification du fonctionnement correct de l'API modifiée
- Vérification de l'affichage correct des rôles dans l'interface utilisateur
- Confirmation que les utilisateurs avec le rôle "Admin" sont bien affichés avec ce rôle

## Impact
Cette correction garantit que les rôles des utilisateurs sont correctement affichés dans l'interface utilisateur, améliorant ainsi la visibilité et la gestion des permissions dans l'application.
