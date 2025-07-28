# ID8 Frontend - AI-Powered Idea Generation Platform

A modern React TypeScript application for idea generation, validation, and collaboration built with Vite, TailwindCSS, and a comprehensive component library.

## 🏗️ Architecture Overview

The frontend has been comprehensively refactored with a focus on type safety, code consolidation, and maintainability.

### Key Technologies
- **React 18** with TypeScript for type-safe development
- **Vite** for fast development and building
- **TailwindCSS** for styling with shadcn/ui components
- **React Router** for navigation and routing
- **TanStack Query** for data fetching and caching
- **Zustand** for state management
- **React Hook Form** with Zod validation

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (shadcn/ui)
│   ├── auth/            # Authentication components
│   ├── onboarding/      # User onboarding flow
│   ├── UnifiedIdeaCard.tsx    # Main idea display component
│   ├── UnifiedIdeaModal.tsx   # Main idea modal component
│   └── ...
├── contexts/            # React contexts
│   └── AuthContext.tsx  # Authentication state management
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries
│   ├── api.ts          # Unified API service layer
│   ├── utils.ts        # General utilities
│   └── ...
├── pages/              # Page components
│   ├── Kanban.tsx      # Kanban board view
│   ├── Profile.tsx     # User profile page
│   └── ...
├── types/              # Centralized type definitions
│   ├── index.ts        # Main type exports
│   ├── idea.ts         # Idea-related types
│   ├── user.ts         # User-related types
│   ├── api.ts          # API response types
│   └── repo.ts         # Repository types
└── schemas/            # Zod validation schemas
```

## 🔧 Type System

### Centralized Types
All TypeScript interfaces and types are consolidated in `/src/types/` for consistency and reusability:

- **`/src/types/index.ts`** - Main export point for all types
- **`/src/types/idea.ts`** - Idea lifecycle and stage types
- **`/src/types/user.ts`** - User authentication and profile types
- **`/src/types/api.ts`** - API request/response and service types
- **`/src/types/repo.ts`** - Repository and GitHub integration types

### Key Interfaces
```typescript
// Core idea type aligned with backend
interface Idea {
  id: string;
  title: string;
  status: 'suggested' | 'deep_dive' | 'iterating' | 'considering' | 'closed';
  // ... comprehensive type definition
}

// Centralized user types
interface User {
  id: string;
  email: string;
  profile?: UserProfile;
  onboarding_required?: boolean;
  // ... full user definition
}
```

## 🌐 API Layer

### Unified Service Layer
All API calls are consolidated in `/src/lib/api.ts` providing:
- **Centralized axios configuration** with auth token management
- **Type-safe API functions** for all backend endpoints
- **Consistent error handling** and response formatting
- **Automatic retry logic** and request interceptors

### Stage-Specific APIs
```typescript
// Consolidated stage management
export const createSuggested = (data: SuggestedCreate) => api.post('/advanced/suggested/', data);
export const createDeepDive = (data: DeepDiveCreate) => api.post('/deep-dive/', data);
export const createIterating = (data: IteratingCreate) => api.post('/advanced/iterating/', data);
```

## 🧭 Navigation & Routing

### Route Structure
```typescript
/auth           - Authentication (login/register)
/onboarding     - User onboarding flow
/dashboard      - Main dashboard with Kanban board
/kanban         - Dedicated Kanban view
/profile        - User profile management
```

### Protected Routes
All main application routes are protected and enforce:
- **Authentication verification** - Redirects to `/auth` if not logged in
- **Onboarding completion** - Redirects to `/onboarding` if incomplete
- **Proper loading states** during authentication checks

## 🔐 Authentication

### Hardened Auth Context
The `AuthContext` provides robust session management:

```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  // ... additional auth methods
}
```

### Security Features
- **Automatic token refresh** and API header management
- **Secure localStorage** token handling
- **Onboarding enforcement** prevents bypassing incomplete profiles
- **Type-safe error handling** for all auth operations

## 🎨 Component Architecture

### Unified Components
The consolidation focused on maintaining two main idea components:

- **`UnifiedIdeaCard`** - Displays idea information in card format
- **`UnifiedIdeaModal`** - Full idea details and editing interface
- **`KanbanCard`** - Wrapper for drag-and-drop functionality

### Component Patterns
- **Composition over inheritance** for flexible component reuse
- **Proper TypeScript props** with strict interface definitions
- **Consistent error boundaries** and loading states
- **Accessible design** following WCAG guidelines

## 🛠️ Development

### Getting Started
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

### Code Quality
- **TypeScript strict mode** enabled for maximum type safety
- **ESLint configuration** with React and TypeScript rules
- **Reduced lint errors** from 170 to 153 through type improvements
- **Consistent code formatting** with Prettier integration

### Performance Optimizations
- **Tree-shaking** enabled for optimal bundle size
- **Code splitting** with dynamic imports
- **Lazy loading** for non-critical components
- **Memoization** for expensive computations

## 🔄 Data Flow

### State Management
- **React Query** for server state and caching
- **Zustand** for client-side state management
- **React Context** for authentication and global state
- **Local state** with useState for component-specific data

### Form Handling
- **React Hook Form** for performant form management
- **Zod validation** for runtime type checking
- **Custom hooks** for common form patterns
- **Error handling** with user-friendly messages

## 🧪 Testing Strategy

The application is structured for comprehensive testing:
- **Component tests** with React Testing Library
- **Hook tests** for custom React hooks
- **API tests** for service layer validation
- **Integration tests** for user flows

## 📖 Migration Guide

### From Previous Structure
If migrating from the previous codebase:

1. **Update imports** to use centralized types from `/src/types`
2. **Replace API calls** to use unified service layer
3. **Update component props** to use new interface definitions
4. **Review authentication** integration with new AuthContext

### Breaking Changes
- **Removed duplicate API files** - Use consolidated `/src/lib/api.ts`
- **Centralized type definitions** - Import from `/src/types`
- **Updated component interfaces** - Check prop types for compatibility

## 🤝 Contributing

### Code Standards
- Follow existing TypeScript patterns and interfaces
- Use the centralized type system for all new features
- Ensure proper error handling and loading states
- Write tests for new functionality

### Pull Request Guidelines
- Include type definitions for new features
- Update documentation for significant changes
- Ensure all lint checks pass
- Test authentication and routing flows

---

**Built with ❤️ for idea generation and validation**
