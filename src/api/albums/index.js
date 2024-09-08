const AlbumsHandler = require('./handler');
const routes = require('./routes');

module.exports = {
  name: 'albums',
  version: '1.0.0',
  register: async (
    server,
    { service, SongsService, validator, StorageService, UploadsValidator },
  ) => {
    const albumHandler = new AlbumsHandler(
      service,
      SongsService,
      validator,
      StorageService,
      UploadsValidator,
    );
    server.route(routes(albumHandler));
  },
};
