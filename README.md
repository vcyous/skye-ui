# Skye UI - Frontend React Application

## Overview

Skye UI is the modern, responsive frontend for the Skye Apps platform. It's built with React, Vite, and custom CSS components.

## Technology Stack

- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Custom CSS (design tokens + reusable UI component classes)
- **Routing:** React Router v6
- **State Management:** Context API + Hooks
- **Form Handling:** React Hook Form
- **HTTP Client:** Axios
- **Containerization:** Docker & Nginx

## Project Structure

```
src/
├── components/        # Reusable components
│   ├── Dashboard/
│   ├── Products/
│   ├── Orders/
│   ├── Common/       # Shared components (Header, Sidebar, etc)
│   └── ...
├── pages/            # Page components
│   ├── Dashboard.jsx
│   ├── Products.jsx
│   ├── Orders.jsx
│   └── ...
├── layouts/          # Layout components
├── services/         # API client services
├── hooks/            # Custom React hooks
├── context/          # Context for state management
├── utils/            # Utility functions
├── styles/           # Global styles
├── App.jsx           # Root component
└── main.jsx          # Entry point
```

## Quick Start

### Local Development

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server:**

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173` (Vite default)

4. **Build for production:**
   ```bash
   npm run build
   ```

### Using Docker Compose

1. **Build and start the service:**

   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   Open browser and navigate to `http://localhost:3000`

3. **View logs:**
   ```bash
   docker-compose logs -f skye-ui
   ```

## Available Commands

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run preview       # Preview production build
npm test              # Run test suite
npm test:ui          # Run tests with UI
npm run lint          # Run ESLint
npm run format        # Format code with Prettier
npm run type-check   # Check TypeScript types
```

## Environment Variables

Key environment variables:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_API_URL=
VITE_APP_NAME=Skye Apps
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=development
```

## Deploy To Vercel

1. Import repository in Vercel.
2. Set `Root Directory` to `skye-ui`.
3. Framework preset: `Vite`.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Add Environment Variables in Vercel Project Settings:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_API_URL=
VITE_APP_NAME=Skye Apps
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=production
```

This project includes `vercel.json` with SPA rewrite so React Router routes resolve correctly in production.

## Features

### Dashboard

- Real-time sales metrics
- Daily sales overview
- Gross revenue display
- Visitor analytics
- Quick access widgets

### Product Management

- Product list with pagination
- Create/Edit products
- Product details view
- Product ratings display
- Bulk actions

### Order Management

- Complete order list
- Order status tracking
- Order details with timeline
- Customer information
- Invoice generation

### Store Management

- Store profile settings
- Template/Decoration configuration
- Shipping provider setup
- Payment gateway integration
- Financial reports

## Project Architecture

### Components

Components are organized by feature and follow this structure:

```
ComponentName/
├── ComponentName.jsx      # Main component
├── ComponentName.module.css # Styles (optional)
├── hooks.js              # Component-specific hooks
└── utils.js              # Component utilities
```

### API Services

All API calls are centralized in the `services/` folder:

```javascript
// services/productService.js
import api from "./api";

export const productService = {
  getAll: (params) => api.get("/products", { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post("/products", data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};
```

### State Management

Using Context API for global state:

```javascript
// context/AppContext.js
import { createContext, useContext } from "react";

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};
```

## Styling

### Custom CSS UI System

The project uses a reusable UI component layer (`src/components/ui`) backed by
global design tokens and semantic CSS classes in `src/styles.css`.

Example usage:

```jsx
<Card>
  <CardHeader>
    <CardTitle className="section-title">Dashboard</CardTitle>
  </CardHeader>
  <CardContent className="filter-row">
    <Button>Add Product</Button>
  </CardContent>
</Card>
```

### CSS Modules

For component-specific styles:

```jsx
import styles from "./Header.module.css";

export default function Header() {
  return <header className={styles.header}>...</header>;
}
```

## Testing

Run the test suite:

```bash
npm test
```

Tests are located in `__tests__` folders or `.test.js` files next to the code they test.

Example test:

```javascript
import { render, screen } from "@testing-library/react";
import Dashboard from "./Dashboard";

describe("Dashboard", () => {
  it("renders dashboard title", () => {
    render(<Dashboard />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
```

## Docker Setup

### Build the image:

```bash
docker build -t skye-ui .
```

### Run the container:

```bash
docker run -p 3000:3000 skye-ui
```

### Using Docker Compose:

```bash
docker-compose up --build
```

## Performance Optimization

- **Code Splitting:** Automatic with Vite and React lazy()
- **Image Optimization:** Use responsive images with proper formats
- **Bundle Analysis:** Check bundle size with `npm run build`
- **Lazy Loading:** Implement pagination for large lists
- **Caching:** Browser caching configured in nginx.conf

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Security Considerations

- All API requests use Axios with interceptors
- Environment variables for API URLs (no hardcoding)
- JWT tokens stored in localStorage (consider using httpOnly for cookies)
- Input validation on forms
- XSS protection via React's built-in escaping

## Deployment

### Production Build

```bash
npm run build
```

Output is in the `dist/` folder, ready to serve with any static host.

### Production Checklist

- [ ] Environment variables configured
- [ ] API URL points to production backend
- [ ] Analytics configured (if applicable)
- [ ] Error tracking configured
- [ ] Security headers in place (nginx.conf)
- [ ] HTTPS enabled
- [ ] Cache policies optimized
- [ ] Bundle size optimized

### Docker Deployment

```bash
docker build -t your_registry/skye-ui:latest .
docker push your_registry/skye-ui:latest
# Deploy using your orchestration tool
```

## Troubleshooting

### Port already in use

```bash
# Change port in vite.config.js or use:
npm run dev -- --port 5173
```

### API calls returning 404

- Verify `REACT_APP_API_URL` environment variable
- Check backend is running on correct port
- Verify API endpoints exist in backend

### Build errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Contributing

1. Create feature branch
2. Follow code style (ESLint + Prettier)
3. Write tests for new features
4. Create pull request with description

## Useful Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [MDN CSS Documentation](https://developer.mozilla.org/en-US/docs/Web/CSS)
- [React Router Documentation](https://reactrouter.com)

## License

MIT

## Support

For issues or questions, please create an issue in the main repository or contact the architecture team.

---

**Version:** 1.0.0
**Last Updated:** May 8, 2026
