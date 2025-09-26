const db = require("../../models/index");
const { JobOffer, JobDescription, JobRequiredSkill, Skill, SkillLevel, sequelize } = db;

// Get public job offers with advanced filtering
const getPublicJobOffers = async (req, res) => {
  try {
    const {
      search,
      location,
      contract_type,
      work_mode,
      salary_min,
      salary_max,
      department,
      experience_level,
      skills,
      page = 1,
      limit = 12,
      sort_by = 'createdAt',
      sort_order = 'DESC'
    } = req.query;

    const whereConditions = {
      status: 'published',
      application_deadline: {
        [sequelize.Sequelize.Op.gt]: new Date()
      }
    };

    // Filtres de recherche
    if (search) {
      whereConditions[sequelize.Sequelize.Op.or] = [
        { title: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { description: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { company: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } }
      ];
    }

    if (location) {
      whereConditions.location = { [sequelize.Sequelize.Op.iLike]: `%${location}%` };
    }

    if (contract_type) {
      whereConditions.contract_type = contract_type;
    }

    if (work_mode) {
      whereConditions.work_mode = work_mode;
    }

    if (salary_min) {
      whereConditions.salary_min = { [sequelize.Sequelize.Op.gte]: parseInt(salary_min) };
    }

    if (salary_max) {
      whereConditions.salary_max = { [sequelize.Sequelize.Op.lte]: parseInt(salary_max) };
    }

    // Inclusions avec filtres sur les relations
    const includeConditions = [
      {
        model: JobDescription,
        as: 'jobDescription',
        include: [{
          model: JobRequiredSkill,
          as: 'requiredSkills',
          include: [
            {
              model: Skill,
              attributes: ['id', 'name']
            },
            {
              model: SkillLevel,
              attributes: ['id', 'level_name', 'value']
            }
          ]
        }]
      }
    ];

    // Filtre par département (filière d'activité)
    if (department) {
      includeConditions[0].where = {
        filiere_activite: { [sequelize.Sequelize.Op.iLike]: `%${department}%` }
      };
    }

    // Filtre par niveau d'expérience
    if (experience_level) {
      includeConditions[0].where = {
        ...includeConditions[0].where,
        niveau_exp: { [sequelize.Sequelize.Op.iLike]: `%${experience_level}%` }
      };
    }

    const offset = (page - 1) * limit;

    const { count, rows: jobOffers } = await JobOffer.findAndCountAll({
      where: whereConditions,
      include: includeConditions,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort_by, sort_order.toUpperCase()]],
      distinct: true
    });

    // Filtrer par compétences si spécifié
    let filteredOffers = jobOffers;
    if (skills) {
      const skillNames = skills.split(',').map(s => s.trim().toLowerCase());
      filteredOffers = jobOffers.filter(offer => {
        const offerSkills = offer.jobDescription?.requiredSkills?.map(rs => 
          rs.Skill?.name?.toLowerCase()
        ) || [];
        
        return skillNames.some(skillName => 
          offerSkills.some(offerSkill => offerSkill?.includes(skillName))
        );
      });
    }

    res.json({
      jobOffers: filteredOffers,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      },
      filters: {
        search,
        location,
        contract_type,
        work_mode,
        salary_min,
        salary_max,
        department,
        experience_level,
        skills
      }
    });

  } catch (error) {
    console.error('Error getting public job offers:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get single public job offer with view increment
const getPublicJobOfferById = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const jobOffer = await JobOffer.findOne({
      where: {
        id: req.params.id,
        status: 'published',
        application_deadline: {
          [sequelize.Sequelize.Op.gt]: new Date()
        }
      },
      include: [
        {
          model: JobDescription,
          as: 'jobDescription',
          include: [{
            model: JobRequiredSkill,
            as: 'requiredSkills',
            include: [
              {
                model: Skill,
                attributes: ['id', 'name']
              },
              {
                model: SkillLevel,
                attributes: ['id', 'level_name', 'value']
              }
            ]
          }]
        }
      ],
      transaction: t
    });

    if (!jobOffer) {
      await t.rollback();
      return res.status(404).json({ error: 'Offre d\'emploi non trouvée ou expirée' });
    }

    // Incrémenter le compteur de vues
    await jobOffer.increment('views_count', { transaction: t });

    await t.commit();
    res.json(jobOffer);

  } catch (error) {
    await t.rollback();
    console.error('Error getting public job offer:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get filter options for advanced search
const getFilterOptions = async (req, res) => {
  try {
    const [
      contractTypes,
      workModes,
      departments,
      experienceLevels,
      locations,
      skills,
      salaryRanges
    ] = await Promise.all([
      // Types de contrat
      JobOffer.findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('contract_type')), 'contract_type']],
        where: { status: 'published' },
        raw: true
      }),
      
      // Modes de travail
      JobOffer.findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('work_mode')), 'work_mode']],
        where: { status: 'published' },
        raw: true
      }),
      
      // Départements (filières d'activité)
      sequelize.query(`
        SELECT DISTINCT jd.filiere_activite as department
        FROM "JobDescriptions" jd
        INNER JOIN "JobOffers" jo ON jd.id = jo.job_description_id
        WHERE jo.status = 'published' AND jd.filiere_activite IS NOT NULL
        ORDER BY jd.filiere_activite
      `, { type: sequelize.QueryTypes.SELECT }),
      
      // Niveaux d'expérience
      sequelize.query(`
        SELECT DISTINCT jd.niveau_exp as experience_level
        FROM "JobDescriptions" jd
        INNER JOIN "JobOffers" jo ON jd.id = jo.job_description_id
        WHERE jo.status = 'published' AND jd.niveau_exp IS NOT NULL
        ORDER BY jd.niveau_exp
      `, { type: sequelize.QueryTypes.SELECT }),
      
      // Localisations
      JobOffer.findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('location')), 'location']],
        where: { status: 'published' },
        raw: true
      }),
      
      // Compétences les plus demandées
      sequelize.query(`
        SELECT s.name, COUNT(*) as demand_count
        FROM "Skills" s
        INNER JOIN "JobRequiredSkills" jrs ON s.id = jrs.skill_id
        INNER JOIN "JobDescriptions" jd ON jrs.job_description_id = jd.id
        INNER JOIN "JobOffers" jo ON jd.id = jo.job_description_id
        WHERE jo.status = 'published'
        GROUP BY s.id, s.name
        ORDER BY COUNT(*) DESC
        LIMIT 20
      `, { type: sequelize.QueryTypes.SELECT }),
      
      // Fourchettes salariales
      JobOffer.findAll({
        attributes: [
          [sequelize.fn('MIN', sequelize.col('salary_min')), 'min_salary'],
          [sequelize.fn('MAX', sequelize.col('salary_max')), 'max_salary']
        ],
        where: { 
          status: 'published',
          salary_min: { [sequelize.Sequelize.Op.ne]: null },
          salary_max: { [sequelize.Sequelize.Op.ne]: null }
        },
        raw: true
      })
    ]);

    res.json({
      contractTypes: contractTypes.map(ct => ct.contract_type).filter(Boolean),
      workModes: workModes.map(wm => wm.work_mode).filter(Boolean),
      departments: departments.map(d => d.department).filter(Boolean),
      experienceLevels: experienceLevels.map(el => el.experience_level).filter(Boolean),
      locations: locations.map(l => l.location).filter(Boolean),
      topSkills: skills,
      salaryRange: {
        min: salaryRanges[0]?.min_salary || 20000,
        max: salaryRanges[0]?.max_salary || 100000
      }
    });

  } catch (error) {
    console.error('Error getting filter options:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get job offer statistics for public display
const getJobOfferStats = async (req, res) => {
  try {
    const stats = await JobOffer.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_offers'],
        [sequelize.fn('SUM', sequelize.col('views_count')), 'total_views'],
        [sequelize.fn('SUM', sequelize.col('applications_count')), 'total_applications'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'published\' THEN 1 END')), 'active_offers']
      ],
      where: { status: 'published' },
      raw: true
    });

    const recentOffers = await JobOffer.count({
      where: {
        status: 'published',
        createdAt: {
          [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    res.json({
      totalOffers: parseInt(stats[0]?.total_offers || 0),
      totalViews: parseInt(stats[0]?.total_views || 0),
      totalApplications: parseInt(stats[0]?.total_applications || 0),
      activeOffers: parseInt(stats[0]?.active_offers || 0),
      recentOffers
    });

  } catch (error) {
    console.error('Error getting job offer stats:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getPublicJobOffers,
  getPublicJobOfferById,
  getFilterOptions,
  getJobOfferStats
};