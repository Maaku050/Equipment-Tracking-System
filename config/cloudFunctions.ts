// config/cloudFunctions.ts

export const CLOUD_FUNCTIONS = {
  // Replace these with your actual Cloud Function URLs after deployment
  createUser: 'https://REGION-PROJECT_ID.cloudfunctions.net/userManagement/createUser',
  createBulkUsers: 'https://REGION-PROJECT_ID.cloudfunctions.net/userManagement/createBulkUsers',
  getUser: 'https://REGION-PROJECT_ID.cloudfunctions.net/userManagement/getUser',
  updateUser: 'https://REGION-PROJECT_ID.cloudfunctions.net/userManagement/updateUser',
  deleteUser: 'https://REGION-PROJECT_ID.cloudfunctions.net/userManagement/deleteUser',
  
  // For local emulator testing
  LOCAL: {
    createUser: 'http://127.0.0.1:5001/YOUR-PROJECT-ID/us-central1/userManagement/createUser',
  }
};

// Helper to determine which URL to use
export const getCloudFunctionUrl = (endpoint: keyof typeof CLOUD_FUNCTIONS, useLocal = false) => {
  if (useLocal && endpoint === 'createUser') {
    return CLOUD_FUNCTIONS.LOCAL.createUser;
  }
  return CLOUD_FUNCTIONS[endpoint];
};