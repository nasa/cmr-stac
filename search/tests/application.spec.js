const application = require('../lib/application');

describe('application', () => {
  it('should load the entire application.', () => {
    expect(application).toBeDefined();
  });

  it('should initialize the application.', () => {
    expect(application.handler({}, {})).toBeDefined();
  });
});


describe('url rewrite', () => {
  it('should redirect and rewrite urls if the original route was provided', () => {

  })
})
