const { Pool } = require('pg');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const ClientError = require('../../exceptions/ClientError');
const { mapDBToModel } = require('../../utils/albums');
const { nanoid } = require('nanoid');

class AlbumsService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async addAlbum({ name, year }) {
    const id = `album-${nanoid(16)}`;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;
    const coverUrl = null;

    const query = {
      text: 'INSERT INTO albums VALUES($1, $2, $3, $4, $5, $6) RETURNING id',
      values: [id, name, year, createdAt, updatedAt, coverUrl],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Data album gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getAlbums() {
    const result = await this._pool.query('SELECT * FROM albums');
    return result.rows.map(mapDBToModel);
  }

  async getAlbumById(id) {
    const query = {
      text: 'SELECT * FROM albums WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Data album tidak ditemukan');
    }

    return result.rows.map(mapDBToModel)[0];
  }

  async editAlbumById(id, { name, year }) {
    const updatedAt = new Date().toISOString();

    const query = {
      text: 'UPDATE albums SET name = $1, year = $2, updated_at = $3 WHERE id = $4 RETURNING id',
      values: [name, year, updatedAt, id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError(
        'Gagal memperbarui data album. Id tidak ditemukan',
      );
    }
  }

  async deleteAlbumById(id) {
    const query = {
      text: 'DELETE FROM albums WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Data album gagal dihapus. Id tidak ditemukan');
    }
  }

  async checkAlbum(id) {
    const query = {
      text: 'SELECT * FROM albums WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Album tidak ditemukan!');
    }
  }

  async editAlbumToAddCoverById(id, fileLocation) {
    const query = {
      text: 'UPDATE albums SET cover_url = $1 WHERE id = $2',
      values: [fileLocation, id],
    };

    await this._pool.query(query);
  }

  async addLikeAndDislikeAlbum(albumId, userId) {
    const like = 'like';

    const queryCheckForLike = {
      text: 'SELECT id FROM user_album_likes WHERE user_id = $1 AND album_id = $2',
      values: [userId, albumId],
    };

    const resultCheckForLike = await this._pool.query(queryCheckForLike);

    if (resultCheckForLike.rows.length) {
      throw new ClientError('Tidak dapat menambahkan like.');
    } else {
      const id = `album-like-${nanoid(16)}`;

      const queryAddLike = {
        text: 'INSERT INTO user_album_likes VALUES($1, $2, $3) RETURNING id',
        values: [id, userId, albumId],
      };

      await this._pool.query(queryAddLike);
      await this._cacheService.delete(`user_album_likes:${albumId}`);
    }
    await this._cacheService.delete(`user_album_likes:${albumId}`);
    return like;
  }

  async getLikesAlbumById(id) {
    try {
      const source = 'cache';
      const likes = await this._cacheService.get(`user_album_likes:${id}`);
      return { likes: +likes, source };
    } catch (error) {
      await this.checkAlbum(id);

      const query = {
        text: 'SELECT * FROM user_album_likes WHERE album_id = $1',
        values: [id],
      };

      const result = await this._pool.query(query);
      const likes = result.rows.length;
      await this._cacheService.set(`user_album_likes:${id}`, likes);
      const source = 'server';
      return { likes, source };
    }
  }

  async unlikeAlbumById(albumId, userId) {
    const query = {
      text: 'SELECT id FROM user_album_likes WHERE user_id = $1 AND album_id = $2',
      values: [userId, albumId],
    };

    const result = await this._pool.query(query);

    const queryDeleteLike = {
      text: 'DELETE FROM user_album_likes WHERE id = $1 RETURNING id',
      values: [result.rows[0].id],
    };

    await this._pool.query(queryDeleteLike);
    await this._cacheService.delete(`user_album_likes:${albumId}`);
  }
}

module.exports = AlbumsService;
