# LEGO's Platform - A software platform serving as an intermediary between official ticket offices, authorized resale markets, and end users
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/sgalle16/LEGOsPlatform)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) 

## Overview
LEGO's Platform is a infrastructure/backend application built with a microservices architecture designed to manage and validate event tickets. Leveraging an event-driven approach with a publish/subscribe messaging system, it achieves decoupling, scalability, resilience, and maintainability among its components. The solution leverages modern technologies, showcasing essential functionalities of a distributed system through implemented use cases.


***The platform follows a hybrid approach:***

*   **Microservices:** Independent services handle specific domains (API Gateway, Ticket Management, Mock Validation, DB).
*   **Event-Driven:** Apache Kafka facilitates asynchronous communication, decoupling the API Gateway (Producer) from the Ticket Management service (Consumer).
*   **Current Deployment:** Utilizes **Docker Compose** for local setup, with a long-term vision to deploy on Kubernetes (AWS EKS) using cloud services like AWS MSK and RDS.


### Technology Stack 

*   **Frontend:** Angular TypeScript
*   **API Gateway:** Node.js, Express
*   **Ticket Processing:** Node.js, TypeScript, KafkaJS
*   **Mock API Tickets:** Python, Flask
*   **Messaging:** Apache Kafka, Zookeeper
*   **Database:** PostgreSQL
*   **Authentication Provider:** Firebase Authentication (Google Sign-In)
*   **Containerization & Orchestration:** Docker, Docker Compose

### Prerequisites

Ensure the following are installed and configured:

*   [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/) 
*   [Git](https://git-scm.com/)
*   [Google Cloud SDK (`gcloud` CLI)](https://cloud.google.com/sdk/docs/install)

*(Node.js and Python are required by the services but will run inside Docker containers).*

## Setup & Configuration

1.  **Clone Repository:**
    ```bash
    git clone https://github.com/sgalle16/LEGOsPlatform.git
    cd LEGOsPlatform
    ```

2.  **Firebase/GCP Project Setup (Prerequisite):**
    *   This project assumes an existing Google Cloud Platform (GCP) project with Firebase enabled.
    *   Enable Firebase Authentication and configure Google Sign-In for the frontend.
    *   Obtain your Firebase configuration and update your Angular environment file accordingly.

3.  **Configure Application Default Credentials (ADC):**
    ```bash
        gcloud config set project <PROJECT_ID>
        gcloud auth application-default login 
    ```
    *   This configures ADC locally (`~/.config/gcloud/...`). The `docker-compose.yml` file mounts these credentials into the `tickets-manage-ms` container for local development.

4.  **Environment Variables:**
    *  Create `.env` files in service directories. **Do not commit these files to Git.**

5.  **CI (GitHub Actions):**
    *   The project includes GitHub Actions workflows (`.github/workflows/`) that automatically build and push Docker images to Docker Hub upon pushes to the master branch.

## Running the Application (Docker Compose)

1.  **Build and Start Containers:** From the project root (`LEGOsPlatform`):
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Rebuilds images if necessary.
    *   `-d`: Runs containers in detached mode.

2.  **Check Status:** Wait for containers to start and healthchecks to pass:
    ```bash
    docker-compose ps
    ```
    Ensure all services are up (look for `Up` and `(healthy)` statuses).

3.  **Access Services:**
    *   **Frontend Application:** `http://localhost:4200`
    *   API Gateway (Internal): Listens on port 3000
    *   Mock Ticket API (Internal): Listens on port 5002


4.  **View Logs:**
    ```bash
    docker-compose logs -f <service_name>
    # Examples:
    # docker-compose logs -f api-gateway
    ```

5.  **Stop Services:**
    ```bash
    docker-compose down # Stops and removes containers/networks
    # or
    # docker-compose stop # Only stops containers
    ```

## Service Descriptions

*   **`frontend`**: Angular UI. Interacts with the API Gateway.
*   **`api-gateway`**: Node.js/Express entry point. Receives frontend requests, produces Kafka events.
*   **`tickets-manage-ms`**: Node.js/TypeScript Kafka consumer. Performs Firebase Auth validation, consults the mock ticket API, and persists data in PostgreSQL.
*   **`api-tickets`**: Python/Flask mock API simulating ticket verification.
*   **`kafka`**: Apache Kafka broker enabling asynchronous messaging.
*   **`zookeeper`**: Kafka's coordination service.
*   **`postgres-db`**: PostgreSQL database for storing application data.



## Implemented Use Cases: User Authentication and Event-Driven Ticket Validation (MVP)

This MVP demonstrates a core workflow that integrates user authentication with an event-driven ticket validation process, as follows:

1.  **User Authentication (Firebase):**
    *   A user logs into the **Frontend** application using Google Sign-In,  managed by **Firebase Authentication**.

2.  **Ticket Validation Request (Event Trigger):**
    *   The user performs an action requiring ticket validation (e.g., selecting an *event* after login).
    *   The Frontend sends a request (e.g., `POST /createTransation`) to the **API Gateway**. including user ID, ticket details, and the **Firebase ID Token**.

3.  **Event Production (API Gateway -> Kafka):**
    *   The API Gateway produces a `ticket-generated` event (topic) to Kafka.

4.  **Event Consumption and Processing:**
    *   The Ticket Management microservice (Kafka consumer), receives the message from the `ticket-generated` topic.
    *   **Firebase Token Validation:** The service verifies the token's authenticity and validity against Firebase Authentication, confirming the user’s identity (retrieving their Firebase UID).
    *   **Mock Ticket Validation:** If the Firebase token is valid, the service extracts the user `id` and `ticketNumber`, then sends a `GET` request to the **(`api-tickets`)** to verify ticket ownership and validity.
    *   **Persistence:** The final outcome including the Firebase UID, ticket validation status, and associated details is saved into the tables in the **PostgreSQL** database.

