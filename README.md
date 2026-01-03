# OSI Shipping Web Application

A modern shipping management application built with Next.js, TypeScript, Material-UI (MUI), and Tailwind CSS.

## Features

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Material-UI (MUI)** components and theming
- **Tailwind CSS** for utility-first styling
- Responsive design
- Modern UI with gradient backgrounds and card layouts
- Integrated component showcase demonstrating both MUI and Tailwind CSS working together

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Material-UI
- **Icons**: Material-UI Icons
- **Package Manager**: npm

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

- `LOGIN_API_URL` - Remote login API URL (used by `app/api/login` proxy).
- `SESSION_SECRET` - Secret used to sign the session cookie (required in production).
- `SESSION_MAX_AGE_SECONDS` - Session lifetime in seconds (optional, default: 43200 / 12 hours).
- `SESSION_COOKIE_DOMAIN` - Cookie domain (optional; omit to use host-only cookies).

## Project Structure

```
osi-shipping-web/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout with MUI ThemeProvider
│   └── page.tsx           # Home page with MUI and Tailwind components
├── components/            # Reusable components
│   └── ThemeProvider.tsx  # MUI ThemeProvider wrapper
├── theme.tsx              # MUI theme configuration
├── public/                # Static assets
├── package.json           # Dependencies and scripts
└── README.md              # This file
```

## How MUI and Tailwind CSS Work Together

This project demonstrates how to use both Material-UI and Tailwind CSS in harmony:

- **Material-UI** provides pre-built, accessible components with consistent theming
- **Tailwind CSS** handles utility classes for layout, spacing, colors, and responsive design
- The `ThemeProvider` component wraps the application to provide MUI theme context
- Mixed usage in components: MUI for interactive elements and Tailwind for layout

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Learn More

For more information about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [Material-UI Documentation](https://mui.com/material-ui/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
