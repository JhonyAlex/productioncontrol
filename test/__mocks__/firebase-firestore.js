const mock = {
  doc: jest.fn(() => ({})),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'timestamp'),
  collection: jest.fn()
};
module.exports = mock;
