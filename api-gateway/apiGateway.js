// --- Existing Imports ---
const express = require("express");
const cors = require("cors");
const tickets_route_initializer = require('./routes/tickets');
const userDataController = require('./controllers/userDataController');
const { connectProducer, disconnectProducer, produceTicketGeneratedEvent } = require('./kafkaProducer');
const logger = require('./utils/logger');

// --- App Setup ---
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`);
    next();
});

// --- !!! CORRECTED MODIFICATION !!! ---
// Keep a reference to the original controller function
const originalCreateTransaction = userDataController.createTransation;

// Create the corrected async wrapper function
const createTransactionAndProduceEvent = async (req, res) => {
    // 1. Execute the ORIGINAL controller logic ONCE.
    //    This sends the required immediate JSON response via res.json() inside it.
    //    We don't need or use its return value here.
    originalCreateTransaction(req, res); // << CALL IT ONLY ONCE HERE

    // 2. AFTER the original function has sent the response,
    //    access the data for Kafka directly from the CURRENT request's body.
    const dataForKafka = req.body;

    // 3. Check the data from req.body and produce the event
    if (dataForKafka && typeof dataForKafka === 'object' && dataForKafka.id) {
        try {
            await produceTicketGeneratedEvent(dataForKafka); // Use data from req.body
            logger.info(`Kafka event produced AFTER response for /createTransation data: ${JSON.stringify(dataForKafka)}`);
        } catch (kafkaError) {
            logger.error(`Failed to produce Kafka event AFTER response sent for /createTransation:`, kafkaError);
            // Handle Kafka error internally (logging, metrics, retry queue, etc.)
        }
    } else {
         // This warning now correctly indicates if the INCOMING request body was invalid/missing ID *after* the response was sent.
         logger.warn(`Request body for createTransation was invalid or missing 'id' after response sent. Cannot produce Kafka event. Body: ${JSON.stringify(req.body)}`);
    }

    // No return needed, response already sent by original function.
};

// 4. OVERWRITE the function on the imported controller object IN MEMORY.
userDataController.createTransation = createTransactionAndProduceEvent;

// --- Setup Routes ---
// Now, when tickets_route_initializer runs, it will use the
// *modified* userDataController.createTransation function for the POST route.
tickets_route_initializer(app);

// --- Error Handling ---
app.use((err, req, res, next) => {
    // Check if headers are already sent before trying to send an error response
    if (res.headersSent) {
      logger.error('Unhandled error after headers sent:', err);
      // Can't send a response, maybe just end the request or let it timeout
      // Depending on the error, the connection might already be closed.
      return next(err); // Pass to default Express error handler, which might just close connection
    }
    // If headers not sent, send a generic error response
    logger.error('Unhandled error before headers sent:', err);
    res.status(500).send('Something broke!');
});


// --- Start Server Function ---
async function startServer() {
    try {
        await connectProducer();
        app.listen(port, () => {
            logger.info(`API Gateway running at http://localhost:${port}`);
        });
    } catch (error) {
        logger.error('Failed to start API Gateway:', error);
        process.exit(1);
    }
}

// --- Run Server ---
startServer();

// --- Graceful Shutdown ---
// (Keep your SIGINT/SIGTERM handlers as they were)
process.on('SIGINT', async () => {
    logger.info('SIGINT signal received. Shutting down gracefully.');
    try {
        await disconnectProducer();
        logger.info('Cleanup finished. Exiting process.');
        process.exit(0);
    } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received. Shutting down gracefully.');
     try {
        await disconnectProducer();
        logger.info('Cleanup finished. Exiting process.');
        process.exit(0);
    } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
});






































// const express = require("express");

// const app1 = express();
// const app2 = express();

// // Servidor en puerto 3001

// let userDataInterface = [{
//   id: Number,
//   name: String,
//   ticketNumber: String,
//   ticketName: String,
//   usuario: String, 
//   token: String
// }];



// app1.get("/tickets", (req, res) => {
//     res.json(userDataInterface);
// });



// app1.listen(3001, () => {
//     console.log("✅ Servicio de tickets en http://localhost:3001");
// });

// // Servidor en puerto 3002
// app2.post("/createTransation", (req, res) => {
//   userDataInterface = req.body;
//   return res.json(userDataInterface);
// });

// app2.listen(3002, () => {
//     console.log("✅ Servicio de Productos en http://localhost:3002");
// });
