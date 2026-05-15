// User to Organization mapping for Land Registration System
const userOrgMap = {
  // Org1 - Registration Department
  'admin-registration': 'org1',
  'user_portal': 'org1',
  'clerk1': 'org1', 
  'super1': 'org1',
  'po1': 'org1',
  'superintendent1': 'org1',
  'project_officer1': 'org1',

  // Org2 - Revenue/Survey Department
  'admin-revenue': 'org2',
  'mro1': 'org2', 
  'survey1': 'org2',
  'ri1': 'org2',
  'vro1': 'org2',
  'rdo1': 'org2',
  'revenue_officer1': 'org2',
  'revenue_dept1': 'org2',

  // Org3 - Collectorate Department
  'admin-collector': 'org3',
  'jc1': 'org3',
  'dc1': 'org3',
  'mw1': 'org3',
  'joint_collector1': 'org3',
  'collector1': 'org3'
};

// Function to get organization for a user
function getOrgForUser(username) {
  return userOrgMap[username] || null;
}

// Function to get all users for an organization
function getUsersForOrg(org) {
  return Object.keys(userOrgMap).filter(user => userOrgMap[user] === org);
}

// Function to validate user exists
function isValidUser(username) {
  return username in userOrgMap;
}

module.exports = {
  userOrgMap,
  getOrgForUser,
  getUsersForOrg,
  isValidUser
};