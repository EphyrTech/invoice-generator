# Invoice Generator

A modern invoice management system built with Next.js, PostgreSQL, and React. This application allows you to create, manage, and download invoices as PDFs.

## Features

- Create and manage business profiles
- Create and manage clients
- Create invoice templates for reuse
- Generate invoices from templates
- Download invoices as PDFs
- Track invoice status
- Support for multiple currencies
- Support for taxes and discounts

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) (for containerized deployment)

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/invoice-generator.git
   cd invoice-generator
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker Deployment

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/invoice-generator.git
   cd invoice-generator
   ```

2. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Build and start the Docker containers:
   ```bash
   docker-compose up -d
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

5. Access PgAdmin at [http://localhost:8080](http://localhost:8080) using the credentials in your `.env` file.

## Database Schema

The application uses PostgreSQL with the following main tables:

- `business_profiles`: Your company information
- `clients`: Client information
- `invoice_templates`: Reusable invoice templates
- `invoices`: Generated invoices
- `invoice_items`: Line items for invoices

## Environment Variables

See `.env.example` for a list of required environment variables.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
