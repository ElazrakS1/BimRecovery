# Tailwind CSS dans le projet BIM Recovery

Ce document explique comment le Tailwind CSS est configuré dans le projet BIM Recovery et comment éviter les erreurs de linting dans l'éditeur VSCode.

## Structure des fichiers CSS

Pour éviter les avertissements de linting liés aux directives Tailwind (@tailwind), nous avons adopté l'approche suivante:

1. Le fichier `tailwind-directives.css` contient uniquement les directives Tailwind
2. Le fichier `index.css` importe `tailwind-directives.css` et les autres fichiers CSS
3. Des paramètres spécifiques VSCode ont été configurés pour éviter les avertissements

## Configuration VSCode

Un dossier `.vscode` a été ajouté avec les fichiers suivants:

- `settings.json`: Configure VSCode pour ignorer les avertissements liés aux règles @tailwind inconnues
- `tailwind-css-data.json`: Fournit des informations sur les directives Tailwind pour l'autocomplétion

## Configuration Tailwind

La configuration de Tailwind se trouve dans les fichiers suivants:

- `tailwind.config.js`: Configuration principale de Tailwind
- `postcss.config.js`: Configuration de PostCSS pour intégrer Tailwind

## Bonnes pratiques

1. N'ajoutez pas de directives `@tailwind` directement dans `index.css` ou d'autres fichiers CSS
2. Utilisez plutôt le fichier `tailwind-directives.css` pour les directives Tailwind
3. Pour les classes utilitaires personnalisées, utilisez `@layer` dans un fichier CSS dédié
4. Utilisez les utilitaires Tailwind au maximum pour maintenir la cohérence du design

## Résolution des problèmes

Si vous voyez toujours des avertissements liés aux directives Tailwind:

1. Assurez-vous que VSCode reconnaît les fichiers `.vscode/settings.json` et `.vscode/tailwind-css-data.json`
2. Redémarrez VSCode pour que les nouveaux paramètres prennent effet
3. Vérifiez que les extensions CSS de VSCode sont à jour
