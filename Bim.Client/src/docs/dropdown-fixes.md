# Guide des dropdowns et des corrections d'alignement

## Contexte
Ce document décrit les correctifs apportés aux dropdowns et à l'alignement global de l'application BIM Recovery. Les problèmes précédemment identifiés incluaient:
1. Des dropdowns trop larges et trop grands
2. Un mauvais alignement avec le header
3. Des problèmes d'affichage sur mobile

## Correctifs apportés

### 1. Réduction de la taille des dropdowns
- **Search dropdown**: largeur réduite de 350px à 260px
- **Notifications dropdown**: largeur réduite de 380px à 280px
- **Profile dropdown**: largeur réduite de 300px à 230px
- **Hauteur maximale**: réduite à 280px pour tous les dropdowns (60vh sur mobile)

### 2. Optimisation de l'alignement
- Ajout de `box-sizing: border-box` à tous les conteneurs
- Positionnement cohérent avec `top: calc(100% + 0.5rem)` 
- Correction de l'alignement vertical des éléments du header
- Utilisation de `--header-height` comme variable globale
- Structure améliorée du CSS pour la cohérence entre composants

### 3. Espacement interne optimisé
- Réduction du padding des éléments de menu à `0.55rem 0.7rem`
- Réduction de la taille de police à `0.85rem`
- Diminution des espacements entre les éléments avec `gap: 0.5rem`

### 4. Optimisation mobile
- Pleine largeur sur mobile avec media queries
- Hauteur limitée à `60vh` et `70vh`
- Meilleure gestion du scroll avec `-webkit-overflow-scrolling: touch`

## Fichiers modifiés
1. `src/components/header/Header.css`
2. `src/components/layout/Layout.css`
3. Création de `src/components/common/DropdownFixes.css` avec des variables réutilisables

## Utilisation des classes de dropdown

Pour maintenir la cohérence, utilisez les classes CSS suivantes pour les nouveaux dropdowns:

```jsx
<div className="dropdown dropdown-bottom dropdown-right">
  <div className="dropdown-header">
    <h3>Titre du dropdown</h3>
  </div>
  <div className="dropdown-content">
    {items.map(item => (
      <div className="dropdown-item" key={item.id}>
        {item.content}
      </div>
    ))}
  </div>
  <div className="dropdown-footer">
    <button>Action</button>
  </div>
</div>
```

### Classes de positionnement disponibles
- `dropdown-top` - Positionne le dropdown au-dessus de l'élément parent
- `dropdown-bottom` - Positionne le dropdown en dessous de l'élément parent
- `dropdown-left` - Aligne le dropdown à gauche
- `dropdown-right` - Aligne le dropdown à droite
- `dropdown-center` - Centre le dropdown horizontalement
- `dropdown-mobile-fullwidth` - Force le dropdown en pleine largeur sur mobile

## Variables CSS réutilisables

Les variables suivantes sont disponibles dans `DropdownFixes.css` et peuvent être utilisées pour assurer la cohérence:

```css
:root {
  --dropdown-min-width: 180px;
  --dropdown-max-width: 260px;
  --dropdown-z-index: 1100;
  --dropdown-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  --dropdown-border-radius: var(--border-radius-lg);
  --dropdown-animation-duration: 0.2s;
  --dropdown-max-height: 280px;
  --dropdown-max-height-mobile: 60vh;
  --dropdown-header-padding: 0.6rem 0.75rem;
  --dropdown-item-padding: 0.55rem 0.7rem;
  --dropdown-footer-padding: 0.7rem;
}
```
