# Invoice PDF Generator - Developer Documentation

## 🏗️ Architecture Overview

This is a modern invoice management system built with a full-stack TypeScript architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   (PostgreSQL)  │
│   - React       │    │   - REST API    │    │   - Drizzle ORM │
│   - Tailwind    │    │   - PDF Gen     │    │   - Migrations  │
│   - TypeScript  │    │   - Validation  │    │   - Relations   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first CSS framework
- **React Hook Form** - Form handling and validation
- **React PDF** - PDF generation and download

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **PostgreSQL** - Primary database
- **Drizzle ORM** - Type-safe database operations
- **Zod** - Runtime type validation

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-service orchestration
- **Yarn 4** - Package management with PnP

## 📊 Database Schema

### Core Tables

```sql
users
├── id (TEXT, PK)
├── name (TEXT)
├── email (TEXT, UNIQUE)
├── email_verified (TIMESTAMP)
└── created_at, updated_at

business_profiles
├── id (TEXT, PK)
├── user_id (TEXT, FK → users.id)
├── name, email, phone
├── address, city, state, postal_code, country
├── tax_id, logo_url
└── created_at, updated_at

clients
├── id (TEXT, PK)
├── user_id (TEXT, FK → users.id)
├── name, email, phone
├── address, city, state, postal_code, country
├── tax_id, notes
├── is_business_profile (BOOLEAN)
├── business_profile_id (TEXT, FK → business_profiles.id)
└── created_at, updated_at

invoices
├── id (TEXT, PK)
├── user_id (TEXT, FK → users.id)
├── business_profile_id (TEXT, FK → business_profiles.id)
├── client_id (TEXT, FK → clients.id)
├── invoice_number (TEXT)
├── issue_date, due_date
├── status (TEXT: draft|sent|paid|overdue)
├── subtotal, tax_rate, tax_amount
├── discount_rate, discount_amount, total
├── notes, terms, currency
├── is_recurring, recurring_interval, next_issue_date
└── created_at, updated_at

invoice_items
├── id (TEXT, PK)
├── invoice_id (TEXT, FK → invoices.id)
├── description (TEXT)
├── quantity, unit_price, amount
├── tax_rate, tax_amount
└── created_at, updated_at

invoice_templates
├── id (TEXT, PK)
├── user_id (TEXT, FK → users.id)
├── name (TEXT)
├── business_profile_id (TEXT, FK → business_profiles.id)
├── client_id (TEXT, FK → clients.id)
├── invoice_number, tax_rate, discount_rate
├── notes, terms, currency
└── created_at, updated_at

invoice_template_items
├── id (TEXT, PK)
├── template_id (TEXT, FK → invoice_templates.id)
├── description, quantity, unit_price, tax_rate
└── created_at, updated_at
```

### Relationships
- **One-to-Many**: User → Business Profiles, Clients, Invoices, Templates
- **One-to-Many**: Invoice → Invoice Items
- **One-to-Many**: Template → Template Items
- **Many-to-One**: Invoice → Business Profile, Client
- **Optional**: Client → Business Profile (for company-as-client scenarios)

## 🔌 API Endpoints

### Business Profiles
```
GET    /api/business-profiles     # List all profiles
POST   /api/business-profiles     # Create new profile
GET    /api/business-profiles/[id] # Get specific profile
PUT    /api/business-profiles/[id] # Update profile
DELETE /api/business-profiles/[id] # Delete profile
```

### Clients
```
GET    /api/clients     # List all clients
POST   /api/clients     # Create new client
GET    /api/clients/[id] # Get specific client
PUT    /api/clients/[id] # Update client
DELETE /api/clients/[id] # Delete client
```

### Invoices
```
GET    /api/invoices     # List all invoices
POST   /api/invoices     # Create new invoice
GET    /api/invoices/[id] # Get specific invoice with items
PUT    /api/invoices/[id] # Update invoice
DELETE /api/invoices/[id] # Delete invoice
```

### Templates
```
GET    /api/templates     # List all templates
POST   /api/templates     # Create new template
GET    /api/templates/[id] # Get specific template with items
PUT    /api/templates/[id] # Update template
DELETE /api/templates/[id] # Delete template
```

### Dashboard
```
GET    /api/dashboard/stats # Get dashboard statistics
```

### Health Check
```
GET    /api/health # Application health status
```

## 🚀 Development Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### Quick Start
```bash
# Clone repository
git clone <repository-url>
cd invoice-pdf

# Install dependencies
yarn install

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Start database
docker-compose up -d db

# Initialize database
yarn db:init

# Start development server
yarn dev
```

### Available Scripts
```bash
yarn dev          # Start development server
yarn build        # Build for production
yarn start        # Start production server
yarn lint         # Run ESLint
yarn db:generate  # Generate Drizzle migrations
yarn db:push      # Push schema to database
yarn db:studio    # Open Drizzle Studio
yarn db:init      # Initialize database with sample data
```

## 🏗️ Project Structure

```
invoice-pdf/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── lib/                   # Shared utilities
│   ├── db/               # Database configuration
│   │   ├── schema/       # Drizzle schemas
│   │   ├── db-client.ts  # Database client
│   │   └── index.ts      # Database exports
│   └── pdf/              # PDF generation
├── public/               # Static assets
├── docker-compose.yml    # Development containers
├── docker-compose.prod.yml # Production containers
├── Dockerfile.prod       # Production Dockerfile
├── schema.sql           # Database schema
└── package.json         # Dependencies and scripts
```

## 🔄 Development Workflow

### 1. Database Changes
```bash
# 1. Modify schema in lib/db/schema/
# 2. Generate migration
yarn db:generate

# 3. Apply to database
yarn db:push

# 4. Verify in Drizzle Studio
yarn db:studio
```

### 2. Adding New Features
1. Create API routes in `app/api/`
2. Add database operations using Drizzle
3. Create frontend components in `app/dashboard/`
4. Add TypeScript types
5. Test functionality

### 3. PDF Customization
- Modify `lib/pdf/invoice-generator.tsx`
- Update styles and layout
- Test PDF generation

## 🧪 Testing

### Manual Testing
```bash
# Start development environment
docker-compose up -d
yarn dev

# Test API endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/dashboard/stats
```

### Database Testing
```bash
# Access database directly
docker exec -it invoice-pdf-db-1 psql -U postgres -d invoice_db

# View tables
\dt

# Query data
SELECT * FROM invoices LIMIT 5;
```

## 🚢 Deployment

### Local Production
```bash
# Build and start production containers
docker-compose -f docker-compose.prod.yml up --build
```

### Coolify Deployment
See `COOLIFY_DEPLOYMENT.md` for detailed instructions.

### Environment Variables
Required for production:
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
POSTGRES_PASSWORD=secure_password
NEXTAUTH_SECRET=random_secret_key
NEXTAUTH_URL=https://your-domain.com
```

## 🔧 Configuration

### Database Configuration
- Connection pooling via `lib/db/db-client.ts`
- Schema definitions in `lib/db/schema/`
- Migrations via Drizzle Kit

### PDF Configuration
- Fonts and styling in `lib/pdf/invoice-generator.tsx`
- Page layout and formatting
- Currency and localization support

## 🐛 Troubleshooting

### Common Issues

**Database Connection**
```bash
# Check database status
docker-compose ps

# View database logs
docker-compose logs db

# Reset database
docker-compose down -v
docker-compose up -d db
yarn db:init
```

**Build Issues**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules yarn.lock
yarn install
```

**PDF Generation Issues**
- Check React PDF version compatibility
- Verify font loading
- Test with simple invoice data

## 📝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Make changes and test thoroughly
4. Commit with descriptive messages
5. Push and create pull request

### Code Style
- Use TypeScript for all new code
- Follow existing naming conventions
- Add proper error handling
- Include JSDoc comments for complex functions

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [React PDF Documentation](https://react-pdf.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
