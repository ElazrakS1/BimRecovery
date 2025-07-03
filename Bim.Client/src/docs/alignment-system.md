# BIM Recovery Alignment System Documentation

This document explains the consistent alignment system implemented for the BIM Recovery application.

## Basic Principles

1. **Box Sizing**: All elements use `box-sizing: border-box` to include padding and borders in width calculations
2. **Width Management**: Container elements have `width: 100%` to fill their parent
3. **Consistent Spacing**: Using predefined spacing variables for margins and padding
4. **Responsive Design**: Properly handling element sizing across different screen sizes

## CSS Components

### 1. Global Styles (App.css)

- Sets up basic variables for colors, spacing, and shadows
- Establishes box-sizing model for all elements
- Defines global styles for body and #root elements

### 2. Button Component (Button.css)

- Consistent button styling with proper alignment and spacing
- Various button types: primary, secondary, danger
- Button sizes: small, default, large
- Special types: icon-only, full-width
- Button groups for proper alignment of multiple buttons

### 3. Form Component (Form.css)

- Consistent form element styling
- Properly sized inputs, textareas, and select elements
- Form layout utilities (rows, groups)
- Form validation styles
- Responsive form layouts

### 4. Layout Utilities (Utilities.css)

- Flexible grid and flex layout utilities
- Spacing utilities
- Container classes for consistent content width
- Responsive helpers

## Usage Guidelines

### For Container Elements:

```css
.container-element {
  width: 100%;
  box-sizing: border-box;
  padding: [appropriate spacing];
}
```

### For Card Elements:

```css
.card-element {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%; /* For equal height cards in grid */
}

/* For card content that should push actions to bottom */
.card-actions {
  margin-top: auto;
}
```

### For Grid Layouts:

```css
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  width: 100%;
  box-sizing: border-box;
}
```

### For Form Elements:

```css
.form-element {
  width: 100%;
  box-sizing: border-box;
}
```

## Common Issues and Solutions

1. **Uneven Card Heights**: Use `height: 100%` on cards and `display: flex; flex-direction: column;` with `margin-top: auto` for footer elements

2. **Form Elements Overflowing**: Always use `width: 100%; box-sizing: border-box;` on form containers and inputs

3. **Grid Items Misalignment**: Ensure grid container has `width: 100%; box-sizing: border-box;` and appropriate gap values

4. **Button Groups Alignment**: Use the `.btn-group` class with appropriate `.btn-group-right`, `.btn-group-center`, etc.

5. **Responsive Issues**: Use the responsive utility classes provided in Utilities.css

## Best Practices

1. Always use box-sizing: border-box for consistent sizing
2. Set width: 100% on container elements
3. Use the provided utility classes whenever possible
4. For flex layouts, remember to set flex-direction and alignment properties
5. For grid layouts, use the provided grid utilities

By following these guidelines, the BIM Recovery application will maintain consistent alignment across all pages and components.
