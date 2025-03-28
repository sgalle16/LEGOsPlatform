const tickets = require('./routes/tickets');
const express = require("express");
const app = express();
const port =  3000;
const cors = require("cors"); // Importar CORS

app.use(cors()); // Habilitar CORS para todas las solicitudes

app.use(express.urlencoded({extended:false}));
app.use(express.json());

tickets(app);
app.listen(port);
console.log(`Bienvenido API Gateway en http://localhost:${port}`);







































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
