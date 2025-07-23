import { Link } from 'react-router-dom';
import { useSidebar } from '../components/ui/sidebar';
import { useAuth } from '../contexts/AuthContext';
import { Search, Settings, User, ChevronDown } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

interface HeaderProps {
  onAddIdea?: () => void;
  title?: string;
}

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
        {/* Left section - Sidebar toggle and branding */}
        <div className="flex items-center gap-4">
          {/* Sidebar Toggle */}
          <button
            aria-controls="sidebar"
            onClick={(e) => {
              e.stopPropagation();
              toggleSidebar();
            }}
            className="block rounded-md border border-slate-300 bg-white p-1.5 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <span className="block w-5 h-0.5 bg-slate-700 mb-1" />
            <span className="block w-5 h-0.5 bg-slate-700 mb-1" />
            <span className="block w-5 h-0.5 bg-slate-700" />
          </button>
          
          {/* ID8 Logo and Branding */}
          <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              ID8
            </div>
            <div className="hidden md:block">
              <h1 className="text-slate-800 font-semibold text-lg">
                {props.title || 'Dashboard'}
              </h1>
            </div>
          </Link>
        </div>

        {/* Center section - Search bar */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              type="search"
              placeholder="Search ideas, projects..."
              className="pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Right section - Actions and user menu */}
        <div className="flex items-center gap-3">
          {/* Add Idea Button - More Prominent */}
          {props.onAddIdea && (
            <Button
              onClick={props.onAddIdea}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium px-6 py-2 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <span className="text-lg mr-1">+</span>
              Add Idea
            </Button>
          )}
          
          {/* User Profile Dropdown */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 hover:bg-slate-100 transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.oauth_picture} alt={user.first_name} />
                    <AvatarFallback className="bg-slate-200 text-slate-700">
                      {user.first_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-slate-700 font-medium">
                    {user.first_name || 'User'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-900">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                  onClick={logout}
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline">
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;