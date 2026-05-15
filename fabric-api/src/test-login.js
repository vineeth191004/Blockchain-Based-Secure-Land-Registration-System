const fabricClient = require('./fabricClient');
async function test() {
  try {
    await fabricClient.connect('user_portal');
    console.log("Success");
  } catch (err) {
    console.error("Error connecting:", err);
  }
}
test();
