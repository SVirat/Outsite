import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';

const Landing = lazy(() => import('./pages/Landing.jsx'));
const SignIn = lazy(() => import('./pages/SignIn.jsx'));
const AuthCallback = lazy(() => import('./pages/AuthCallback.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Properties = lazy(() => import('./pages/Properties.jsx'));
const PropertyNew = lazy(() => import('./pages/PropertyNew.jsx'));
const PropertyDetail = lazy(() => import('./pages/PropertyDetail.jsx'));
const PropertyEdit = lazy(() => import('./pages/PropertyEdit.jsx'));
const Search = lazy(() => import('./pages/Search.jsx'));
const Access = lazy(() => import('./pages/Access.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

function Loading() {
  return <div className="loading-page"><div className="spinner" /></div>;
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/" replace />;
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Header />
        <div className="page-content">
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function HomePage() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sign-in" element={<Landing />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route element={<ProtectedLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="properties" element={<Properties />} />
          <Route path="properties/new" element={<PropertyNew />} />
          <Route path="properties/:id" element={<PropertyDetail />} />
          <Route path="properties/:id/edit" element={<PropertyEdit />} />
          <Route path="search" element={<Search />} />
          <Route path="access" element={<Access />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
