# Amplizard

Amplizard is a customer service chatbot service designed to solve complex queries using internal hook calling. This powerful service is built to enhance customer support by providing efficient and accurate responses.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Contributing](#contributing)
- [License](#license)

## Features

- Solves complex customer queries.
- Utilizes internal hook/api calling for enhanced functionality.
- Easy to integrate into existing systems.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (version 20 or higher)
- npm (version 9 or higher)
- Docker (for containerized deployment)
- Postgres and Redis for Non-docker setup.

## Installation (development)

Follow these steps to set up Amplizard:

1. Clone the repository:
   ```bash
   git clone https://github.com/BandaySajid/amplizard.git
   cd amplizard
   ```

### Non-Docker setup.

2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy env and config:
   ```bash
   cp .env.sample .env
   ```

- To start the development server, use the following command:

```bash
npm run dev
```

### With docker setup.

2. Setup your env in .env file or directly from docker-compose.yml file.

3. Start docker compose:

   ```bash
   docker compose -f docker-compose.dev.yml up
   ```

## Installation (production)

1. Copy env and config:
   ```bash
   cp .env.sample .env
   ```
2. Setup your env in .env file or directly from docker-compose.yml file.

3. Start docker compose:

- For the first time:
  ```bash
  docker compose up --build
  ```
- Else:
  ```bash
  docker compose up
  ```
