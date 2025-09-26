const db = require("../../models/index");
const fs = require('fs');
const path = require('path');
const { CandidateCV, Candidate, sequelize } = db;

const uploadDir = path.join(__dirname, '../uploads/candidate-cvs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Get all CVs for a candidate
const getCandidateCVs = async (req, res) => {
  try {
    const cvs = await CandidateCV.findAll({
      where: { candidate_id: req.candidate.id },
      order: [['is_primary', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json(cvs);
  } catch (error) {
    console.error('Error getting candidate CVs:', error);
    res.status(500).json({ error: error.message });
  }
};

// Upload new CV
const uploadCV = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { title, is_primary = false } = req.body;
    
    if (!req.file) {
      await t.rollback();
      return res.status(400).json({ error: 'Fichier CV requis' });
    }

    if (!title) {
      await t.rollback();
      return res.status(400).json({ error: 'Titre du CV requis' });
    }

    const cvData = {
      candidate_id: req.candidate.id,
      title,
      file_path: `/uploads/candidate-cvs/${req.file.filename}`,
      file_name: req.file.originalname,
      file_size: req.file.size,
      is_primary: is_primary === 'true'
    };

    const cv = await CandidateCV.create(cvData, { transaction: t });

    await t.commit();
    res.status(201).json(cv);
  } catch (error) {
    await t.rollback();
    console.error('Error uploading CV:', error);
    
    // Supprimer le fichier en cas d'erreur
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: error.message });
  }
};

// Update CV
const updateCV = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { title, is_primary } = req.body;
    
    const cv = await CandidateCV.findOne({
      where: { 
        id: req.params.id,
        candidate_id: req.candidate.id 
      },
      transaction: t
    });

    if (!cv) {
      await t.rollback();
      return res.status(404).json({ error: 'CV non trouvé' });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (is_primary !== undefined) updateData.is_primary = is_primary;

    // Si nouveau fichier uploadé
    if (req.file) {
      // Supprimer l'ancien fichier
      const oldFilePath = path.join(__dirname, '..', cv.file_path);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }

      updateData.file_path = `/uploads/candidate-cvs/${req.file.filename}`;
      updateData.file_name = req.file.originalname;
      updateData.file_size = req.file.size;
    }

    await cv.update(updateData, { transaction: t });

    await t.commit();
    res.json(cv);
  } catch (error) {
    await t.rollback();
    console.error('Error updating CV:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: error.message });
  }
};

// Delete CV
const deleteCV = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const cv = await CandidateCV.findOne({
      where: { 
        id: req.params.id,
        candidate_id: req.candidate.id 
      },
      transaction: t
    });

    if (!cv) {
      await t.rollback();
      return res.status(404).json({ error: 'CV non trouvé' });
    }

    // Supprimer le fichier physique
    const filePath = path.join(__dirname, '..', cv.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await cv.destroy({ transaction: t });

    // Si c'était le CV principal, marquer un autre comme principal
    if (cv.is_primary) {
      const nextCV = await CandidateCV.findOne({
        where: { candidate_id: req.candidate.id },
        order: [['createdAt', 'DESC']],
        transaction: t
      });

      if (nextCV) {
        await nextCV.update({ is_primary: true }, { transaction: t });
      }
    }

    await t.commit();
    res.json({ message: 'CV supprimé avec succès' });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting CV:', error);
    res.status(500).json({ error: error.message });
  }
};

// Set primary CV
const setPrimaryCV = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const cv = await CandidateCV.findOne({
      where: { 
        id: req.params.id,
        candidate_id: req.candidate.id 
      },
      transaction: t
    });

    if (!cv) {
      await t.rollback();
      return res.status(404).json({ error: 'CV non trouvé' });
    }

    // Désactiver tous les autres CVs comme principal
    await CandidateCV.update(
      { is_primary: false },
      {
        where: { candidate_id: req.candidate.id },
        transaction: t
      }
    );

    // Marquer ce CV comme principal
    await cv.update({ is_primary: true }, { transaction: t });

    await t.commit();
    res.json({ message: 'CV défini comme principal', cv });
  } catch (error) {
    await t.rollback();
    console.error('Error setting primary CV:', error);
    res.status(500).json({ error: error.message });
  }
};

// Download CV
const downloadCV = async (req, res) => {
  try {
    const cv = await CandidateCV.findOne({
      where: { 
        id: req.params.id,
        candidate_id: req.candidate.id 
      }
    });

    if (!cv) {
      return res.status(404).json({ error: 'CV non trouvé' });
    }

    const filePath = path.join(__dirname, '..', cv.file_path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier CV non trouvé sur le serveur' });
    }

    res.download(filePath, cv.file_name);
  } catch (error) {
    console.error('Error downloading CV:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getCandidateCVs,
  uploadCV,
  updateCV,
  deleteCV,
  setPrimaryCV,
  downloadCV
};