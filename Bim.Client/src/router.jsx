import { Routes, Route } from 'react-router-dom';
import { UNSAFE_DataRouterContext, UNSAFE_DataStaticRouterContext } from '@remix-run/router';
import App from './App';
import NotFound from './components/NotFound';
import ErrorBoundary from './components/ErrorBoundary';

const Router = () => (
  <UNSAFE_DataStaticRouterContext.Provider value={null}>
    <UNSAFE_DataRouterContext.Provider value={null}>
      <Routes future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Route path="/*" element={<App />} errorElement={<ErrorBoundary />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </UNSAFE_DataRouterContext.Provider>
  </UNSAFE_DataStaticRouterContext.Provider>
);

export default Router;
