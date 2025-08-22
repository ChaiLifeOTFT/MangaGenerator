# Overview

This is an AI-powered manga generation application called "MangaForge" built with a full-stack TypeScript architecture. The application allows users to input text and automatically converts it into structured manga scripts with AI-generated panel images using OpenAI's APIs. Users can generate complete manga chapters, edit individual panels, regenerate images, and export their work as downloadable ZIP files (CBZ format).

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is built using React 18 with TypeScript and Vite as the build tool. The UI leverages shadcn/ui components built on top of Radix UI primitives for a modern, accessible interface. Routing is handled by wouter for lightweight client-side navigation. State management uses React Query (TanStack Query) for server state and local React state for component-level data.

The application features a sidebar-based layout with:
- Left sidebar for input controls, settings, and generation triggers
- Main content area displaying generated manga pages and panels
- Loading overlays and toast notifications for user feedback

## Backend Architecture
The server uses Express.js with TypeScript running on Node.js. It follows a modular structure with:
- Route registration system for API endpoints
- Storage abstraction layer supporting both in-memory and database persistence
- Development-only Vite integration for hot module replacement
- Custom middleware for request logging and error handling

The backend is designed to be minimal as most AI processing happens client-side via direct OpenAI API calls.

## Data Storage
The application uses Drizzle ORM configured for PostgreSQL with a schema-first approach. The database schema is defined in shared TypeScript files and includes user management tables. Drizzle Kit handles database migrations and schema synchronization.

Currently implements an in-memory storage fallback for development, with the production setup expecting a PostgreSQL database via the DATABASE_URL environment variable.

## Authentication and Authorization
The application includes a basic user management system with username/password authentication. Session management is handled server-side with PostgreSQL session storage using connect-pg-simple. The authentication system is minimal and designed for single-user or small team usage.

## AI Integration Architecture
The application integrates with OpenAI's APIs through client-side calls:
- **Chat Completions API**: Converts user text input into structured manga scripts using GPT models
- **Images API**: Generates black-and-white manga-style panel images based on script descriptions
- **Two-pass generation**: Optional illustrator pass for refined image prompts

The AI workflow follows a structured pipeline:
1. Text input → Structured manga script (JSON format)
2. Script panels → Image generation prompts
3. Prompts → Generated panel images
4. Assembly → Complete manga chapter

# External Dependencies

## Core Framework Dependencies
- **React 18**: Frontend framework with TypeScript support
- **Vite**: Build tool and development server
- **Express.js**: Backend web framework
- **Drizzle ORM**: Database ORM with PostgreSQL dialect

## UI and Styling
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Component library built on Radix UI
- **Radix UI**: Headless UI primitives for accessibility
- **Lucide React**: Icon library

## State Management and Data Fetching
- **TanStack React Query**: Server state management and caching
- **React Hook Form**: Form state management
- **Zod**: Schema validation and type safety

## Database and Session Management
- **@neondatabase/serverless**: PostgreSQL serverless database connector
- **connect-pg-simple**: PostgreSQL session store for Express

## File Processing and Export
- **JSZip**: ZIP file creation for manga exports
- **file-saver**: Browser file download utility

## AI and External APIs
- **OpenAI API**: Chat completions and image generation (accessed via direct HTTP calls)

## Development and Build Tools
- **TypeScript**: Type safety and development experience
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Autoprefixer