# BIM Recovery Client

This is the client application for the BIM Recovery project, built with React and Vite.

## Features

- Interactive 3D BIM model viewer
- Project management interface
- User management system
- Task tracking and reporting
- Responsive design for all screen sizes
- Light and dark mode support

## UI Design

### Scrollbar Styling

The application implements consistent custom scrollbar styling across all components:

- Global scrollbar styling in `src/index.css`
- Component-specific styling for specialized UI elements
- Dark mode compatible scrollbars that adapt to theme changes
- Cross-browser compatible (Webkit and Firefox)

Scrollbar styling is applied to the following components:

- Sidebar navigation
- IFC model tree views
- Project details panels
- User management interfaces
- Search and notification dropdowns

### Testing Scrollbar Compatibility

To test the scrollbar appearance and behavior:

1. Open `scrollbar-test.html` in your browser
2. Toggle between light and dark mode
3. Check scrollbar appearance in different components
4. Use the `src/utils/scrollbarTest.js` script in browser console for diagnostics

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
