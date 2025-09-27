const db = require("../../models/index");
const { CandidateFavorite, JobOffer, JobDescription, sequelize } = db;

// Get candidate's favorite job offers
const getFavorites = async (req, res) => {
  try {
    const favorites = await CandidateFavorite.findAll({
      where: { candidate_id: req.candidate.id },
      include: [{
        model: JobOffer,
        as: 'jobOffer',
        include: [{
          model: JobDescription,
          as: 'jobDescription'
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(favorites);
  } catch (error) {
    console.error('Error getting favorites:', error);
    res.status(500).json({ error: error.message });
  }
};

// Add job offer to favorites
const addToFavorites = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { job_offer_id } = req.body;

    if (!job_offer_id) {
      await t.rollback();
      return res.status(400).json({ error: 'ID de l\'offre requis' });
    }

    // Vérifier que l'offre existe
    const jobOffer = await JobOffer.findByPk(job_offer_id, { transaction: t });
    if (!jobOffer) {
      await t.rollback();
      return res.status(404).json({ error: 'Offre d\'emploi non trouvée' });
    }

    // Vérifier que ce n'est pas déjà en favoris
    const existingFavorite = await CandidateFavorite.findOne({
      where: {
        candidate_id: req.candidate.id,
        job_offer_id
      },
      transaction: t
    });

    if (existingFavorite) {
      await t.rollback();
      return res.status(409).json({ error: 'Cette offre est déjà dans vos favoris' });
    }

    const favorite = await CandidateFavorite.create({
      candidate_id: req.candidate.id,
      job_offer_id
    }, { transaction: t });

    const fullFavorite = await CandidateFavorite.findByPk(favorite.id, {
      include: [{
        model: JobOffer,
        as: 'jobOffer',
        include: [{
          model: JobDescription,
          as: 'jobDescription'
        }]
      }],
      transaction: t
    });

    await t.commit();
    res.status(201).json({
      message: 'Offre ajoutée aux favoris',
      favorite: fullFavorite
    });

  } catch (error) {
    await t.rollback();
    console.error('Error adding to favorites:', error);
    res.status(500).json({ error: error.message });
  }
};

// Remove from favorites
const removeFromFavorites = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { job_offer_id } = req.params;

    const favorite = await CandidateFavorite.findOne({
      where: {
        candidate_id: req.candidate.id,
        job_offer_id
      },
      transaction: t
    });

    if (!favorite) {
      await t.rollback();
      return res.status(404).json({ error: 'Favori non trouvé' });
    }

    await favorite.destroy({ transaction: t });

    await t.commit();
    res.json({ message: 'Offre retirée des favoris' });

  } catch (error) {
    await t.rollback();
    console.error('Error removing from favorites:', error);
    res.status(500).json({ error: error.message });
  }
};

// Check if job offer is in favorites
const isFavorite = async (req, res) => {
  try {
    const { job_offer_id } = req.params;

    const favorite = await CandidateFavorite.findOne({
      where: {
        candidate_id: req.candidate.id,
        job_offer_id
      }
    });

    res.json({ isFavorite: !!favorite });

  } catch (error) {
    console.error('Error checking favorite status:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getFavorites,
  addToFavorites,
  removeFromFavorites,
  isFavorite
};