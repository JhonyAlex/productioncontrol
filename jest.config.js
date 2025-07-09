module.exports = {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^https://.*firebase-firestore.js$': '<rootDir>/test/__mocks__/firebase-firestore.js'
  },
  transform: {
    '^.+\\.js$': 'babel-jest'
  }
};
