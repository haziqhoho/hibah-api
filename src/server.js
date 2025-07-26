require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`PTPTN API server running on port ${PORT}`);
}); // proceed with implementing the real SQL logic for this endpoint