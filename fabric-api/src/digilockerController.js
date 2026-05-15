// MOCK DigiLocker Controller (For Academic Use)

exports.digilockerAuth = (req, res) => {
  console.log("Mock DigiLocker Auth Triggered");

  // Simulate successful DigiLocker verification
  res.redirect("http://localhost:3000/user-dashboard?digilockerVerified=true");
};

exports.digilockerCallback = async (req, res) => {
  res.send("Mock DigiLocker Callback");
};
