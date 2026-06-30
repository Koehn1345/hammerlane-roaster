const express = require('express');
const router = express.Router();
const pool = require('../db/db');

router.get('/', async (req, res) => {
  try {
    const blends = await pool.query('SELECT * FROM blends ORDER BY name');
    const components = await pool.query(`
      SELECT bc.*, gb.origin
      FROM blend_components bc
      JOIN green_beans gb ON bc.green_bean_id = gb.id
    `);
    const blendsWithComponents = blends.rows.map(blend => ({
      ...blend,
      components: components.rows.filter(c => c.blend_id === blend.id)
    }));
    res.json(blendsWithComponents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, description, components } = req.body; // components: [{green_bean_id, percentage}]
  try {
    const blendResult = await pool.query(
      `INSERT INTO blends (name, description) VALUES ($1, $2) RETURNING *`,
      [name, description]
    );
    const blend = blendResult.rows[0];

    for (const c of components) {
      await pool.query(
        `INSERT INTO blend_components (blend_id, green_bean_id, percentage) VALUES ($1, $2, $3)`,
        [blend.id, c.green_bean_id, c.percentage]
      );
    }

    res.json(blend);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  const { name, description, components } = req.body; // components: [{green_bean_id, percentage}]
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const blendResult = await client.query(
      `UPDATE blends SET name = $1, description = $2 WHERE id = $3 RETURNING *`,
      [name, description, req.params.id]
    );

    await client.query('DELETE FROM blend_components WHERE blend_id = $1', [req.params.id]);
    for (const c of components) {
      await client.query(
        `INSERT INTO blend_components (blend_id, green_bean_id, percentage) VALUES ($1, $2, $3)`,
        [req.params.id, c.green_bean_id, c.percentage]
      );
    }

    await client.query('COMMIT');
    res.json(blendResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;