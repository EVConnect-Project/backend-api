# EVConnect Admin Dashboard

A modern, responsive admin dashboard built with Next.js 14, TypeScript, and Tailwind CSS for managing the EVConnect EV charging platform.

## 🎯 Features

### ✅ Currently Implemented

- **Authentication**
  - Secure admin login with JWT
  - Token-based authentication
  - Protected routes
  - Auto-redirect on unauthorized access

- **Dashboard Overview**
  - Real-time KPI cards (Users, Chargers, Bookings, Revenue)
  - Growth indicators with percentage changes
  - Interactive charts (Revenue & Bookings trends)
  - Responsive sidebar navigation

- **User Interface**
  - Modern, clean design with Tailwind CSS
  - Responsive layout (mobile, tablet, desktop)
  - Collapsible sidebar
  - Loading states and error handling

### 🚧 To Be Implemented

- User management page
- Charger management page
- Bookings management page
- Analytics & reports page
- Settings page

## 🛠️ Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Date Handling**: date-fns

## 📁 Project Structure

```
admin-dashboard/
├── app/
│   ├── dashboard/
│   │   └── page.tsx          # Main dashboard page
│   ├── login/
│   │   └── page.tsx          # Login page
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home (redirects to login)
│   └── globals.css           # Global styles
├── components/
│   └── ui/
│       ├── button.tsx        # Reusable button component
│       └── card.tsx          # Reusable card component
├── lib/
│   ├── api.ts                # API client and functions
│   └── utils.ts              # Utility functions
├── public/                   # Static files
├── .env.local                # Environment variables (gitignored)
├── .env.example              # Environment variables template
├── next.config.ts            # Next.js configuration
├── tailwind.config.ts        # Tailwind configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- EVConnect backend API running

### Installation

1. **Navigate to the admin dashboard directory:**
   ```bash
   cd admin-dashboard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and update the API URL:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000/api
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open the dashboard:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Default Login Credentials

```
Email: admin@evconnect.com
Password: admin123
```

*Note: Change these in production!*

## 📊 Dashboard Features

### KPI Cards

The dashboard displays four main KPI cards:

1. **Total Users**
   - Shows total registered users
   - Growth percentage from last month
   - Trend indicator (up/down arrow)

2. **Total Chargers**
   - Total charging stations
   - Number of available chargers
   - Visual status indicator

3. **Total Bookings**
   - All-time booking count
   - Quick overview of usage

4. **Total Revenue**
   - Total earnings
   - Revenue growth percentage
   - Financial trend indicator

### Charts

- **Revenue Chart**: Line chart showing daily revenue over the last 30 days
- **Bookings Chart**: Bar chart showing booking volume trends

### Navigation

Sidebar navigation with links to:
- Dashboard (current)
- Users Management (coming soon)
- Chargers Management (coming soon)
- Bookings (coming soon)
- Analytics (coming soon)

## 🔌 API Integration

The dashboard connects to the EVConnect backend API. All API calls are centralized in `lib/api.ts`.

### API Endpoints Used

- `POST /auth/admin/login` - Admin authentication
- `GET /auth/admin/verify` - Token verification
- `GET /admin/stats` - Dashboard statistics
- `GET /admin/analytics/revenue` - Revenue data

### Adding New API Calls

Add new API functions in `lib/api.ts`:

```typescript
export const getUsers = async (): Promise<User[]> => {
  const response = await api.get('/admin/users');
  return response.data;
};
```

## 🎨 Styling

### Tailwind CSS

The dashboard uses Tailwind CSS for styling. Key color scheme:

- Primary: Blue (`blue-600`)
- Success: Green (`green-600`)
- Warning: Yellow (`yellow-600`)
- Danger: Red (`red-600`)
- Neutral: Gray shades

### Custom Components

Reusable UI components are in `components/ui/`:
- `Button`: Customizable button with variants
- `Card`: Container component for content sections

### Adding Custom Styles

1. **Utility Classes**: Use Tailwind utilities directly
2. **Custom Components**: Create new components in `components/ui/`
3. **Global Styles**: Add to `app/globals.css`

## 🔐 Authentication Flow

1. User enters credentials on login page
2. Frontend sends POST request to `/auth/admin/login`
3. Backend validates credentials and returns JWT token
4. Token is stored in localStorage
5. All subsequent API requests include token in Authorization header
6. Token is verified on page load
7. User is redirected to login if token is invalid

## 📱 Responsive Design

The dashboard is fully responsive:

- **Mobile** (< 768px): Single column layout, collapsible sidebar
- **Tablet** (768px - 1024px): Two-column KPIs, responsive charts
- **Desktop** (> 1024px): Full layout with sidebar, four-column KPIs

## 🚢 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables

For production, set:
```env
NEXT_PUBLIC_API_URL=https://api.evconnect.com/api
```

### Docker Deployment

1. **Create Dockerfile:**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --production
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Build and run:**
   ```bash
   docker build -t evconnect-admin .
   docker run -p 3000:3000 evconnect-admin
   ```

### Vercel Deployment

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy!

## 🧪 Testing

*Testing implementation coming soon*

Planned tests:
- Component unit tests (Jest + React Testing Library)
- API integration tests
- E2E tests (Playwright)

## 📝 Development Roadmap

### Phase 1: Core Features (In Progress)
- [x] Dashboard homepage with KPIs
- [x] Login/authentication
- [x] Revenue & booking charts
- [ ] User management page
- [ ] Charger management page

### Phase 2: Advanced Features
- [ ] Analytics page with advanced charts
- [ ] Booking management
- [ ] Settings page
- [ ] Export reports (CSV/PDF)

### Phase 3: Enhancements
- [ ] Real-time updates (WebSocket)
- [ ] Notifications system
- [ ] Dark mode
- [ ] Multi-language support

## 🐛 Troubleshooting

### API Connection Issues

**Problem**: "Failed to fetch dashboard data"

**Solutions**:
1. Check backend is running: `http://localhost:4000/api/health`
2. Verify API URL in `.env.local`
3. Check browser console for CORS errors
4. Ensure admin user exists in database

### Login Issues

**Problem**: "Invalid email or password"

**Solutions**:
1. Verify credentials in database
2. Check backend logs for auth errors
3. Ensure JWT secret is configured
4. Try default credentials: admin@evconnect.com / admin123

### Build Errors

**Problem**: "Module not found" or TypeScript errors

**Solutions**:
1. Delete `node_modules` and `.next`
2. Run `npm install` again
3. Check TypeScript version compatibility
4. Clear Next.js cache: `npm run build -- --no-cache`

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Recharts](https://recharts.org/)
- [Axios](https://axios-http.com/docs/intro)

## 🤝 Contributing

1. Create a new branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Test thoroughly
4. Commit: `git commit -am 'Add new feature'`
5. Push: `git push origin feature/my-feature`
6. Create a Pull Request

---

**Built with ❤️ for EVConnect**

For support, contact: admin@evconnect.com
