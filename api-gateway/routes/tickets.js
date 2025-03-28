const userDataController = require('../controllers/userDataController.js');

module.exports = (app) =>{
  app.route('/getTicket').get(userDataController.getData);
  app.route('/createTransation').post(userDataController.createTransation);
}