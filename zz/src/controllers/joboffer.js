const db = require("../../models/index");
const { JobOffer, JobDescription, User, Skill, SkillLevel, JobRequiredSkill, sequelize } = db;

// Inclusions pour les relations
const includeRelations = () => [
  {
    model: JobDescription,
    as: "jobDescription",
    attributes: ["id", "emploi", "filiere_activite", "famille", "finalite", "niveau_exp"],
    include: [
      {
        model: JobRequiredSkill,
        as: "requiredSkills",
        include: [
          {
            model: Skill,
            attributes: ["id", "name"]
          },
          {
            model: SkillLevel,
            attributes: ["id", "level_name", "value"]
          }
        ]
      }
    ]
  },
  {
    model: User,
    as: "creator",
    attributes: ["id", "username", "firstName", "lastName"]
  }
];

// GET all job offers
const findAllJobOffers = async (req, res) => {
  try {
    console.log('📋 Getting job offers with filters:', req.query);
    console.log('👤 Request user:', req.user ? `${req.user.username} (${req.user.role})` : 'None');
    
    const { 
      status, 
      contract_type, 
      location, 
      salary_min, 
      salary_max, 
      search,
      page = 1,
      limit = 10 
    } = req.query;

    const whereConditions = {};
    const offset = (page - 1) * limit;

    // Filtres
    if (status) whereConditions.status = status;
    if (contract_type) whereConditions.contract_type = contract_type;
    if (location) {
      whereConditions.location = {
        [sequelize.Sequelize.Op.iLike]: `%${location}%`
      };
    }
    if (salary_min) {
      whereConditions.salary_min = {
        [sequelize.Sequelize.Op.gte]: parseInt(salary_min)
      };
    }
    if (salary_max) {
      whereConditions.salary_max = {
        [sequelize.Sequelize.Op.lte]: parseInt(salary_max)
      };
    }
    if (search) {
      whereConditions[sequelize.Sequelize.Op.or] = [
        { title: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { description: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { company: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: jobOffers } = await JobOffer.findAndCountAll({
      where: whereConditions,
      include: includeRelations(),
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    console.log('✅ Job offers found:', jobOffers.length);
    res.json({
      jobOffers,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error("Error in findAllJobOffers:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET job offer by ID
const findJobOfferById = async (req, res) => {
  try {
    const jobOffer = await JobOffer.findByPk(req.params.id, {
      include: includeRelations()
    });

    if (!jobOffer) {
      return res.status(404).json({ message: "Offre d'emploi non trouvée" });
    }

    // Incrémenter le compteur de vues
    await jobOffer.increment('views_count');

    res.json(jobOffer);
  } catch (err) {
    console.error("Error in findJobOfferById:", err);
    res.status(500).json({ error: err.message });
  }
};

// POST create new job offer
const createJobOffer = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const {
      title,
      company,
      location,
      salary_min,
      salary_max,
      contract_type,
      work_mode,
      application_deadline,
      description,
      requirements = [],
      benefits = [],
      job_description_id,
      status = 'draft'
    } = req.body;

    // Validation
    if (!title || !company || !location || !description || !job_description_id) {
      await t.rollback();
      return res.status(400).json({ 
        message: "Champs obligatoires manquants",
        required: ["title", "company", "location", "description", "job_description_id"]
      });
    }

    // Vérifier que la fiche de poste existe
    const jobDescription = await JobDescription.findByPk(job_description_id, {
      include: [
        {
          model: JobRequiredSkill,
          as: "requiredSkills",
          include: [
            {
              model: Skill,
              attributes: ["id", "name"]
            },
            {
              model: SkillLevel,
              attributes: ["id", "level_name", "value"]
            }
          ]
        }
      ],
      transaction: t
    });
    
    if (!jobDescription) {
      await t.rollback();
      return res.status(404).json({ message: "Fiche de poste non trouvée" });
    }

    // Validation des salaires
    if (salary_min && salary_max && salary_min > salary_max) {
      await t.rollback();
      return res.status(400).json({ message: "Le salaire minimum ne peut pas être supérieur au salaire maximum" });
    }

    // Validation de la date limite
    const deadline = new Date(application_deadline);
    if (deadline <= new Date()) {
      await t.rollback();
      return res.status(400).json({ message: "La date limite doit être dans le futur" });
    }

    const jobOfferData = {
      title,
      company,
      location,
      salary_min: salary_min ? parseInt(salary_min) : null,
      salary_max: salary_max ? parseInt(salary_max) : null,
      contract_type,
      work_mode,
      application_deadline: deadline,
      description,
      requirements: Array.isArray(requirements) ? requirements : [],
      benefits: Array.isArray(benefits) ? benefits : [],
      job_description_id: parseInt(job_description_id),
      status,
      created_by: req.user?.id || 1,
      published_at: status === 'published' ? new Date() : null
    };

    const jobOffer = await JobOffer.create(jobOfferData, { transaction: t });

    const createdJobOffer = await JobOffer.findByPk(jobOffer.id, {
      include: includeRelations(),
      transaction: t
    });

    await t.commit();
    
    // Log de succès pour debug
    console.log('✅ Offre d\'emploi créée avec succès:', {
      id: createdJobOffer.id,
      title: createdJobOffer.title,
      status: createdJobOffer.status,
      job_description_id: createdJobOffer.job_description_id
    });
    
    res.status(201).json(createdJobOffer);
  } catch (err) {
    await t.rollback();
    console.error("Error in createJobOffer:", err);
    
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: "Erreur de validation",
        details: err.errors.map(error => error.message)
      });
    }
    
    res.status(500).json({ error: err.message });
  }
};

// PUT update job offer
const updateJobOffer = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const jobOffer = await JobOffer.findByPk(req.params.id, { transaction: t });
    
    if (!jobOffer) {
      await t.rollback();
      return res.status(404).json({ message: "Offre d'emploi non trouvée" });
    }

    // Vérifier les permissions (l'utilisateur peut-il modifier cette offre ?)
    if (jobOffer.created_by !== req.user?.id && req.user?.role !== 'admin') {
      await t.rollback();
      return res.status(403).json({ message: "Permissions insuffisantes" });
    }

    const {
      title,
      company,
      location,
      salary_min,
      salary_max,
      contract_type,
      work_mode,
      application_deadline,
      description,
      requirements,
      benefits,
      status
    } = req.body;

    // Validation des salaires
    if (salary_min && salary_max && salary_min > salary_max) {
      await t.rollback();
      return res.status(400).json({ message: "Le salaire minimum ne peut pas être supérieur au salaire maximum" });
    }

    // Validation de la date limite
    if (application_deadline) {
      const deadline = new Date(application_deadline);
      if (deadline <= new Date()) {
        await t.rollback();
        return res.status(400).json({ message: "La date limite doit être dans le futur" });
      }
    }

    const updateData = {
      title,
      company,
      location,
      salary_min: salary_min ? parseInt(salary_min) : null,
      salary_max: salary_max ? parseInt(salary_max) : null,
      contract_type,
      work_mode,
      application_deadline: application_deadline ? new Date(application_deadline) : jobOffer.application_deadline,
      description,
      requirements: Array.isArray(requirements) ? requirements : jobOffer.requirements,
      benefits: Array.isArray(benefits) ? benefits : jobOffer.benefits,
      status
    };

    // Si le statut passe à 'published' et que published_at n'est pas défini
    if (status === 'published' && !jobOffer.published_at) {
      updateData.published_at = new Date();
    }

    await jobOffer.update(updateData, { transaction: t });

    const updatedJobOffer = await JobOffer.findByPk(jobOffer.id, {
      include: includeRelations(),
      transaction: t
    });

    await t.commit();
    
    // Log de succès pour debug
    console.log('✅ Offre d\'emploi mise à jour avec succès:', {
      id: updatedJobOffer.id,
      title: updatedJobOffer.title,
      status: updatedJobOffer.status,
      published_at: updatedJobOffer.published_at
    });
    
    res.json(updatedJobOffer);
  } catch (err) {
    await t.rollback();
    console.error("Error in updateJobOffer:", err);
    
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: "Erreur de validation",
        details: err.errors.map(error => error.message)
      });
    }
    
    res.status(500).json({ error: err.message });
  }
};

// DELETE job offer
const deleteJobOffer = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const jobOffer = await JobOffer.findByPk(req.params.id, { transaction: t });
    
    if (!jobOffer) {
      await t.rollback();
      return res.status(404).json({ message: "Offre d'emploi non trouvée" });
    }

    // Vérifier les permissions
    if (jobOffer.created_by !== req.user?.id && req.user?.role !== 'admin') {
      await t.rollback();
      return res.status(403).json({ message: "Permissions insuffisantes" });
    }

    await jobOffer.destroy({ transaction: t });
    await t.commit();
    
    res.json({ message: "Offre d'emploi supprimée avec succès" });
  } catch (err) {
    await t.rollback();
    console.error("Error in deleteJobOffer:", err);
    res.status(500).json({ error: err.message });
  }
};

// PATCH publish job offer
const publishJobOffer = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const jobOffer = await JobOffer.findByPk(req.params.id, { transaction: t });
    
    if (!jobOffer) {
      await t.rollback();
      return res.status(404).json({ message: "Offre d'emploi non trouvée" });
    }

    // Vérifier les permissions
    if (jobOffer.created_by !== req.user?.id && req.user?.role !== 'admin') {
      await t.rollback();
      return res.status(403).json({ message: "Permissions insuffisantes" });
    }

    await jobOffer.update({
      status: 'published',
      published_at: new Date()
    }, { transaction: t });

    const updatedJobOffer = await JobOffer.findByPk(jobOffer.id, {
      include: includeRelations(),
      transaction: t
    });

    await t.commit();
    res.json(updatedJobOffer);
  } catch (err) {
    await t.rollback();
    console.error("Error in publishJobOffer:", err);
    res.status(500).json({ error: err.message });
  }
};

// PATCH close job offer
const closeJobOffer = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const jobOffer = await JobOffer.findByPk(req.params.id, { transaction: t });
    
    if (!jobOffer) {
      await t.rollback();
      return res.status(404).json({ message: "Offre d'emploi non trouvée" });
    }

    // Vérifier les permissions
    if (jobOffer.created_by !== req.user?.id && req.user?.role !== 'admin') {
      await t.rollback();
      return res.status(403).json({ message: "Permissions insuffisantes" });
    }

    await jobOffer.update({ status: 'closed' }, { transaction: t });

    const updatedJobOffer = await JobOffer.findByPk(jobOffer.id, {
      include: includeRelations(),
      transaction: t
    });

    await t.commit();
    res.json(updatedJobOffer);
  } catch (err) {
    await t.rollback();
    console.error("Error in closeJobOffer:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET job offer statistics
const getJobOfferStatistics = async (req, res) => {
  try {
    const stats = await JobOffer.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('views_count')), 'total_views'],
        [sequelize.fn('SUM', sequelize.col('applications_count')), 'total_applications']
      ],
      group: ['status'],
      raw: true
    });

    const totalOffers = await JobOffer.count();
    const publishedOffers = await JobOffer.count({ where: { status: 'published' } });
    const draftOffers = await JobOffer.count({ where: { status: 'draft' } });
    const closedOffers = await JobOffer.count({ where: { status: 'closed' } });

    res.json({
      total_offers: totalOffers,
      published_offers: publishedOffers,
      draft_offers: draftOffers,
      closed_offers: closedOffers,
      stats_by_status: stats
    });
  } catch (err) {
    console.error("Error in getJobOfferStatistics:", err);
    res.status(500).json({ error: err.message });
  }
};

// POST duplicate job offer
const duplicateJobOffer = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const originalOffer = await JobOffer.findByPk(req.params.id, { transaction: t });
    
    if (!originalOffer) {
      await t.rollback();
      return res.status(404).json({ message: "Offre d'emploi non trouvée" });
    }

    // Créer une copie avec un nouveau titre
    const duplicateData = {
      ...originalOffer.toJSON(),
      id: undefined,
      title: `${originalOffer.title} (Copie)`,
      status: 'draft',
      published_at: null,
      views_count: 0,
      applications_count: 0,
      created_by: req.user?.id || originalOffer.created_by,
      createdAt: undefined,
      updatedAt: undefined
    };

    const duplicatedOffer = await JobOffer.create(duplicateData, { transaction: t });

    const result = await JobOffer.findByPk(duplicatedOffer.id, {
      include: includeRelations(),
      transaction: t
    });

    await t.commit();
    res.status(201).json(result);
  } catch (err) {
    await t.rollback();
    console.error("Error in duplicateJobOffer:", err);
    res.status(500).json({ error: err.message });
  }
};

// POST publish job offer to public
const publishJobOfferToPublic = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const jobOfferData = {
      ...req.body,
      status: 'published',
      published_at: new Date()
    };

    const jobOffer = await JobOffer.create(jobOfferData, { transaction: t });

    const createdJobOffer = await JobOffer.findByPk(jobOffer.id, {
      include: includeRelations(),
      transaction: t
    });

    await t.commit();
    res.status(201).json(createdJobOffer);
  } catch (err) {
    await t.rollback();
    console.error("Error in publishJobOfferToPublic:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  findAllJobOffers,
  findJobOfferById,
  createJobOffer,
  updateJobOffer,
  deleteJobOffer,
  publishJobOffer,
  closeJobOffer,
  getJobOfferStatistics,
  duplicateJobOffer,
  publishJobOfferToPublic
};