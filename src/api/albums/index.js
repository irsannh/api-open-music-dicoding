const AlbumsHandler = require('./handler');
const routes = require('./routes');

module.exports = {
  name: 'albums',
  version: '1.0.0',
  register: async (server, { service, SongsService, validator }) => {
    const albumHandler = new AlbumsHandler(service, SongsService, validator);
    server.route(routes(albumHandler));
  },
};
