const db = require("../../models/index");
const nodemailer = require('nodemailer');
const { Application, JobOffer, Candidate, CandidateCV, JobDescription, sequelize } = db;

// Configuration email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Apply to job offer
const applyToJobOffer = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { 
      job_offer_id, 
      cv_id, 
      cover_letter, 
      proposed_interview_slots = [] 
    } = req.body;

    // Vérifications
    if (!job_offer_id) {
      await t.rollback();
      return res.status(400).json({ error: 'ID de l\'offre requis' });
    }

    // Vérifier que l'offre existe et est publiée
    const jobOffer = await JobOffer.findOne({
      where: { 
        id: job_offer_id,
        status: 'published'
      },
      include: [{
        model: JobDescription,
        as: 'jobDescription'
      }],
      transaction: t
    });

    if (!jobOffer) {
      await t.rollback();
      return res.status(404).json({ error: 'Offre d\'emploi non trouvée ou non publiée' });
    }

    // Vérifier que la date limite n'est pas dépassée
    if (new Date() > new Date(jobOffer.application_deadline)) {
      await t.rollback();
      return res.status(400).json({ error: 'La date limite de candidature est dépassée' });
    }

    // Vérifier que le candidat n'a pas déjà postulé
    const existingApplication = await Application.findOne({
      where: {
        candidate_id: req.candidate.id,
        job_offer_id
      },
      transaction: t
    });

    if (existingApplication) {
      await t.rollback();
      return res.status(409).json({ error: 'Vous avez déjà postulé à cette offre' });
    }

    // Vérifier que le CV appartient au candidat si fourni
    if (cv_id) {
      const cv = await CandidateCV.findOne({
        where: {
          id: cv_id,
          candidate_id: req.candidate.id
        },
        transaction: t
      });

      if (!cv) {
        await t.rollback();
        return res.status(404).json({ error: 'CV non trouvé' });
      }
    }

    // Valider les créneaux d'entretien proposés
    const validSlots = proposed_interview_slots.filter(slot => {
      const slotDate = new Date(slot);
      return slotDate > new Date(); // Dans le futur
    });

    // Créer la candidature
    const application = await Application.create({
      candidate_id: req.candidate.id,
      job_offer_id,
      cv_id,
      cover_letter,
      proposed_interview_slots: validSlots,
      status: 'applied',
      applied_at: new Date()
    }, { transaction: t });

    // Envoyer email de confirmation au candidat
    const candidate = await Candidate.findByPk(req.candidate.id, { transaction: t });
    
    try {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: candidate.email,
        subject: `Candidature confirmée - ${jobOffer.title}`,
        html: `
          <h1>Candidature envoyée avec succès !</h1>
          <p>Bonjour ${candidate.firstName} ${candidate.lastName},</p>
          <p>Votre candidature pour le poste de <strong>${jobOffer.title}</strong> chez <strong>${jobOffer.company}</strong> a été envoyée avec succès.</p>
          
          <h3>Détails de votre candidature :</h3>
          <ul>
            <li><strong>Poste :</strong> ${jobOffer.title}</li>
            <li><strong>Entreprise :</strong> ${jobOffer.company}</li>
            <li><strong>Localisation :</strong> ${jobOffer.location}</li>
            <li><strong>Date de candidature :</strong> ${new Date().toLocaleDateString('fr-FR')}</li>
          </ul>

          ${validSlots.length > 0 ? `
            <h3>Créneaux d'entretien proposés :</h3>
            <ul>
              ${validSlots.map(slot => `<li>${new Date(slot).toLocaleString('fr-FR')}</li>`).join('')}
            </ul>
          ` : ''}

          <p>Nous vous contacterons prochainement concernant votre candidature.</p>
          <p>Vous pouvez suivre l'état de votre candidature dans votre espace personnel.</p>
          
          <p>Bonne chance !</p>
        `
      });
    } catch (emailError) {
      console.error('Erreur envoi email candidature:', emailError);
    }

    // Récupérer la candidature complète
    const fullApplication = await Application.findByPk(application.id, {
      include: [
        {
          model: JobOffer,
          as: 'jobOffer',
          include: [{
            model: JobDescription,
            as: 'jobDescription'
          }]
        },
        {
          model: CandidateCV,
          as: 'cv'
        }
      ],
      transaction: t
    });

    await t.commit();
    res.status(201).json({
      message: 'Candidature envoyée avec succès',
      application: fullApplication
    });

  } catch (error) {
    await t.rollback();
    console.error('Error applying to job offer:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get candidate's applications
const getCandidateApplications = async (req, res) => {
  try {
    const { status } = req.query;
    
    const whereConditions = { candidate_id: req.candidate.id };
    if (status) {
      whereConditions.status = status;
    }

    const applications = await Application.findAll({
      where: whereConditions,
      include: [
        {
          model: JobOffer,
          as: 'jobOffer',
          include: [{
            model: JobDescription,
            as: 'jobDescription'
          }]
        },
        {
          model: CandidateCV,
          as: 'cv'
        }
      ],
      order: [['applied_at', 'DESC']]
    });

    res.json(applications);
  } catch (error) {
    console.error('Error getting candidate applications:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get single application
const getApplicationById = async (req, res) => {
  try {
    const application = await Application.findOne({
      where: {
        id: req.params.id,
        candidate_id: req.candidate.id
      },
      include: [
        {
          model: JobOffer,
          as: 'jobOffer',
          include: [{
            model: JobDescription,
            as: 'jobDescription'
          }]
        },
        {
          model: CandidateCV,
          as: 'cv'
        }
      ]
    });

    if (!application) {
      return res.status(404).json({ error: 'Candidature non trouvée' });
    }

    res.json(application);
  } catch (error) {
    console.error('Error getting application:', error);
    res.status(500).json({ error: error.message });
  }
};

// Withdraw application
const withdrawApplication = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const application = await Application.findOne({
      where: {
        id: req.params.id,
        candidate_id: req.candidate.id
      },
      transaction: t
    });

    if (!application) {
      await t.rollback();
      return res.status(404).json({ error: 'Candidature non trouvée' });
    }

    // Vérifier que la candidature peut être retirée
    if (['accepted', 'rejected', 'interview_completed'].includes(application.status)) {
      await t.rollback();
      return res.status(400).json({ 
        error: 'Cette candidature ne peut plus être retirée' 
      });
    }

    await application.destroy({ transaction: t });

    // Décrémenter le compteur de candidatures
    const jobOffer = await JobOffer.findByPk(application.job_offer_id, { transaction: t });
    if (jobOffer && jobOffer.applications_count > 0) {
      await jobOffer.decrement('applications_count', { transaction: t });
    }

    await t.commit();
    res.json({ message: 'Candidature retirée avec succès' });

  } catch (error) {
    await t.rollback();
    console.error('Error withdrawing application:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get candidate's CVs
const getCandidateCVs = async (req, res) => {
  try {
    const cvs = await CandidateCV.findAll({
      where: { candidate_id: req.candidate.id },
      order: [['is_primary', 'DESC'], ['created_at', 'DESC']]
    });
    res.json(cvs);
  } catch (error) {
    console.error('Error getting candidate CVs:', error);
    res.status(500).json({ error: error.message });
  }
};

// Upload CV
const uploadCV = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (!req.file) {
      await t.rollback();
      return res.status(400).json({ error: 'Fichier CV requis' });
    }

    const { title, is_primary = false } = req.body;

    // Si c'est le CV principal, désactiver les autres CVs principaux
    if (is_primary) {
      await CandidateCV.update(
        { is_primary: false },
        { 
          where: { candidate_id: req.candidate.id, is_primary: true },
          transaction: t 
        }
      );
    }

    const cv = await CandidateCV.create({
      candidate_id: req.candidate.id,
      title: title || `CV ${new Date().toLocaleDateString('fr-FR')}`,
      file_path: req.file.path,
      file_name: req.file.originalname,
      file_size: req.file.size,
      is_primary,
      uploaded_at: new Date()
    }, { transaction: t });

    await t.commit();
    res.status(201).json(cv);
  } catch (error) {
    await t.rollback();
    console.error('Error uploading CV:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update CV
const updateCV = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { title, is_primary } = req.body;

    const cv = await CandidateCV.findOne({
      where: { id, candidate_id: req.candidate.id },
      transaction: t
    });

    if (!cv) {
      await t.rollback();
      return res.status(404).json({ error: 'CV non trouvé' });
    }

    // Si on veut rendre ce CV principal
    if (is_primary === true) {
      await CandidateCV.update(
        { is_primary: false },
        { 
          where: { candidate_id: req.candidate.id, is_primary: true },
          transaction: t 
        }
      );
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (is_primary !== undefined) updateData.is_primary = is_primary;

    await cv.update(updateData, { transaction: t });

    await t.commit();
    res.json(cv);
  } catch (error) {
    await t.rollback();
    console.error('Error updating CV:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete CV
const deleteCV = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const cv = await CandidateCV.findOne({
      where: { id, candidate_id: req.candidate.id },
      transaction: t
    });

    if (!cv) {
      await t.rollback();
      return res.status(404).json({ error: 'CV non trouvé' });
    }

    // Vérifier si le CV est utilisé dans des candidatures
    const applicationsUsingCV = await Application.count({
      where: { cv_id: id },
      transaction: t
    });

    if (applicationsUsingCV > 0) {
      await t.rollback();
      return res.status(400).json({ 
        error: 'Impossible de supprimer ce CV car il est utilisé dans des candidatures' 
      });
    }

    await cv.destroy({ transaction: t });

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
    const { id } = req.params;

    const cv = await CandidateCV.findOne({
      where: { id, candidate_id: req.candidate.id },
      transaction: t
    });

    if (!cv) {
      await t.rollback();
      return res.status(404).json({ error: 'CV non trouvé' });
    }

    // Désactiver tous les autres CVs principaux
    await CandidateCV.update(
      { is_primary: false },
      { 
        where: { candidate_id: req.candidate.id, is_primary: true },
        transaction: t 
      }
    );

    // Définir ce CV comme principal
    await cv.update({ is_primary: true }, { transaction: t });

    await t.commit();
    res.json({ message: 'CV défini comme principal avec succès', cv });
  } catch (error) {
    await t.rollback();
    console.error('Error setting primary CV:', error);
    res.status(500).json({ error: error.message });
  }
};

// Download CV
const downloadCV = async (req, res) => {
  try {
    const { id } = req.params;

    const cv = await CandidateCV.findOne({
      where: { id, candidate_id: req.candidate.id }
    });

    if (!cv) {
      return res.status(404).json({ error: 'CV non trouvé' });
    }

    // Vérifier que le fichier existe
    const fs = require('fs');
    if (!fs.existsSync(cv.file_path)) {
      return res.status(404).json({ error: 'Fichier CV introuvable' });
    }

    res.download(cv.file_path, cv.file_name);
  } catch (error) {
    console.error('Error downloading CV:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  applyToJobOffer,
  getCandidateApplications,
  getApplicationById,
  withdrawApplication,
  getCandidateCVs,
  uploadCV,
  updateCV,
  deleteCV,
  setPrimaryCV,
  downloadCV
};