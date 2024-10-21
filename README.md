# Amplizard

Amplizard is a customer service chatbot service designed to solve complex queries using internal hook calling. This powerful service is built to enhance customer support by providing efficient and accurate responses.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Testing Hooks](#hooks)
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

## Installation

### Installation (development)

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
3. Copy env:
   ```bash
   cp .env.sample .env
   ```
4. Setup your env in .env file.

- To start the development server, use the following command:

```bash
npm run dev
```

### With docker setup.

2. Setup your env in .env file or directly from docker-compose.yml file.

3. Start docker compose:

- For the first time:

  ```bash
    docker compose build
  ```

- Finally:

  ```bash
      docker compose -f docker-compose.dev.yml up
  ```

### Installation (production)

1. Copy env:
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

## Hooks

- You can use our ecom test api to test the hook functionality.

- Obtain the api from [here](https://github.com/bandaysajid/amplizard-test-ecom-api) and be sure to read the documentation.

## Contributing

If you're interested in contributing to the Amplizard project:

- Start by reading the [Contributing guide](https://github.com/bandaysajid/amplizard/blob/HEAD/CONTRIBUTING.md).
- Learn how to set up your local environment.

## LICENSE

Amplizard is distributed under [GPLv3](https://github.com/bandaysajid/amplizard/blob/main/LICENSE).
