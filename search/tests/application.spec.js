const application = require('../lib/application');

describe('application', () => {
  it('should load the entire application.', () => {
    expect(application).toBeDefined();
  });

  it('should initialize the application.', () => {
    expect(application.handler({}, {})).toBeDefined();
  });
});
