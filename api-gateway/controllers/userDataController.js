
let userDataInterface = [{
  id: Number,
  name: String,
  ticketNumber: String,
  ticketName: String,
  user: String, 
  token: String
}];


const getData = (req, res) => {
  return res.json(userDataInterface);
}

const createTransation = (req, res) => {
  userDataInterface = (req.body);
  return res.json(userDataInterface);
}


module.exports = {getData, createTransation};
