const express = require('express');
const router  = express.Router();
const pool    = require('../db/db');

async function withComponents(blends) {
  if (!blends.length) return blends;
  const ids = blends.map((b) => b.id);
  const components = await pool.query(
    `SELECT bc.*, gb.origin FROM blend_components bc
     JOIN green_beans gb ON bc.green_bean_id = gb.id
     WHERE bc.blend_id = ANY($1)`, [ids]
  );
  return blends.map((blend) => ({
    ...blend,
    components: components.rows.filter((c) => c.blend_id === blend.id),
  }));
}

router.get('/', async (req, res) => {
  try {
    const blends = await pool.query('SELECT * FROM blends ORDER BY name');
    res.json(await withComponents(blends.rows));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM blends WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    const [blend] = await withComponents(result.rows);
    res.json(blend);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, description, components } = req.body;
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
  const { name, description, components, paylink, label_pdf_url } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Build dynamic SET clause so partial updates (just paylink, etc.) work
    const sets   = [];
    const values = [];
    let i = 1;
    if (name           !== undefined) { sets.push(`name = $${i++}`);           values.push(name); }
    if (description    !== undefined) { sets.push(`description = $${i++}`);    values.push(description); }
    if (paylink        !== undefined) { sets.push(`paylink = $${i++}`);        values.push(paylink || null); }
    if (label_pdf_url  !== undefined) { sets.push(`label_pdf_url = $${i++}`);  values.push(label_pdf_url || null); }

    let blend = null;
    if (sets.length) {
      values.push(req.params.id);
      const r = await client.query(
        `UPDATE blends SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
        values
      );
      blend = r.rows[0];
    } else {
      const r = await client.query('SELECT * FROM blends WHERE id = $1', [req.params.id]);
      blend = r.rows[0];
    }

    if (components !== undefined) {
      await client.query('DELETE FROM blend_components WHERE blend_id = $1', [req.params.id]);
      for (const c of components) {
        await client.query(
          `INSERT INTO blend_components (blend_id, green_bean_id, percentage) VALUES ($1, $2, $3)`,
          [req.params.id, c.green_bean_id, c.percentage]
        );
      }
    }

    await client.query('COMMIT');
    const [withComps] = await withComponents([blend]);
    res.json(withComps);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
