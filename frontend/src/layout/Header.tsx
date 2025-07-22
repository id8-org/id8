import { Link } from 'react-router-dom';
import { useSidebar } from '../components/ui/sidebar';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  onAddIdea?: () => void;
  title?: string;
}

const Header = (props: HeaderProps) => {
  const { state, toggleSidebar } = useSidebar();
  const sidebarOpen = state === 'expanded';
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          {/* Sidebar Toggle */}
          <button
            aria-controls="sidebar"
            onClick={(e) => {
              e.stopPropagation();
              toggleSidebar();
            }}
            className="block rounded-md border border-slate-300 bg-white p-1.5 shadow-sm"
          >
            <span className="block w-5 h-0.5 bg-slate-700 mb-1" />
            <span className="block w-5 h-0.5 bg-slate-700 mb-1" />
            <span className="block w-5 h-0.5 bg-slate-700" />
          </button>
          <h1 className="hidden md:block text-slate-800 font-semibold text-lg">
            {props.title || 'Dashboard'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {props.onAddIdea && (
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md transition-shadow shadow-sm"
              onClick={props.onAddIdea}
            >
              + Add Idea
            </button>
          )}
          {user && (
            <button
              className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-md transition-shadow shadow-sm"
              onClick={logout}
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;