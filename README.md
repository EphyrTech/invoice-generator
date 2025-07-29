# Invoice PDF Generator

A modern, professional invoice management system built with Next.js, PostgreSQL, and React. Create, manage, and download beautiful PDF invoices with ease.

## 📚 Documentation

- **[👨‍💻 Developer Guide](README-DEV.md)** - Technical documentation, architecture, and development setup
- **[👤 User Guide](README-USER.md)** - How to use the application, features, and workflows
- **[🚀 Deployment Guide](COOLIFY_DEPLOYMENT.md)** - Production deployment with Coolify

## ✨ Key Features

- **📊 Dashboard** - Overview of invoicing activity and statistics
- **🏢 Business Profiles** - Manage multiple company profiles
- **👥 Client Management** - Organize customer information
- **📄 Professional Invoices** - Create beautiful, customizable invoices
- **📋 Templates** - Save time with reusable invoice templates
- **💾 PDF Generation** - Download invoices as professional PDFs
- **💰 Multi-Currency** - Support for different currencies
- **🧮 Tax & Discounts** - Automatic calculations and tax handling

## 🚀 Quick Start

### For Users

If you just want to use the application, see the **[User Guide](README-USER.md)** for complete instructions.

### For Developers

If you want to set up the development environment or contribute to the project, see the **[Developer Guide](README-DEV.md)**.

### Quick Development Setup

```bash
# Clone and setup
git clone <repository-url>
cd invoice-pdf
npm install

# Start database
docker-compose up -d db

# Initialize with sample data
npm run db:init

# Start development server
npm run dev
```

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, PostgreSQL, Drizzle ORM
- **PDF Generation**: React PDF
- **Infrastructure**: Docker, Docker Compose

## 📖 Documentation

For detailed information, please refer to:

- **[Developer Guide](README-DEV.md)** - Complete technical documentation
- **[User Guide](README-USER.md)** - How to use the application
- **[Deployment Guide](COOLIFY_DEPLOYMENT.md)** - Production deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

See the [Developer Guide](README-DEV.md) for detailed contribution guidelines.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
