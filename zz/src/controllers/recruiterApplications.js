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

// Get applications for a job offer (Recruiter view)
const getApplicationsForJobOffer = async (req, res) => {
  try {
    const { job_offer_id } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const whereConditions = { job_offer_id };
    if (status) {
      whereConditions.status = status;
    }

    const offset = (page - 1) * limit;

    const { count, rows: applications } = await Application.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Candidate,
          as: 'candidate',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'location', 'bio']
        },
        {
          model: CandidateCV,
          as: 'cv',
          attributes: ['id', 'title', 'file_path', 'file_name']
        },
        {
          model: JobOffer,
          as: 'jobOffer',
          attributes: ['id', 'title', 'company'],
          include: [{
            model: JobDescription,
            as: 'jobDescription',
            attributes: ['id', 'emploi', 'filiere_activite']
          }]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['applied_at', 'DESC']]
    });

    res.json({
      applications,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error getting applications for job offer:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all applications (Recruiter dashboard)
const getAllApplications = async (req, res) => {
  try {
    console.log('📋 Getting all applications for recruiter...');
    console.log('👤 Request user:', req.user ? `${req.user.username} (${req.user.role})` : 'None');
    
    const { 
      status, 
      job_offer_id, 
      search,
      page = 1, 
      limit = 20 
    } = req.query;

    const whereConditions = {};
    if (status) whereConditions.status = status;
    if (job_offer_id) whereConditions.job_offer_id = job_offer_id;

    const offset = (page - 1) * limit;

    let candidateWhere = {};
    if (search) {
      candidateWhere[sequelize.Sequelize.Op.or] = [
        { firstName: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { lastName: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { email: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: applications } = await Application.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Candidate,
          as: 'candidate',
          where: Object.keys(candidateWhere).length > 0 ? candidateWhere : undefined,
          required: false,
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'location', 'bio']
        },
        {
          model: CandidateCV,
          as: 'cv',
          required: false,
          attributes: ['id', 'title', 'file_path', 'file_name']
        },
        {
          model: JobOffer,
          as: 'jobOffer',
          required: false,
          attributes: ['id', 'title', 'company', 'location'],
          include: [{
            model: JobDescription,
            as: 'jobDescription',
            required: false,
            attributes: ['id', 'emploi', 'filiere_activite']
          }]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['applied_at', 'DESC']]
    });

    console.log('✅ Applications found:', applications.length);
    console.log('📊 Total count:', count);
    
    res.json({
      applications,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error getting all applications:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update application status
const updateApplicationStatus = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { status, recruiter_notes } = req.body;
    
    const application = await Application.findByPk(req.params.id, {
      include: [
        {
          model: Candidate,
          as: 'candidate'
        },
        {
          model: JobOffer,
          as: 'jobOffer'
        }
      ],
      transaction: t
    });

    if (!application) {
      await t.rollback();
      return res.status(404).json({ error: 'Candidature non trouvée' });
    }

    const oldStatus = application.status;
    
    await application.update({
      status,
      recruiter_notes
    }, { transaction: t });

    // Envoyer email de notification au candidat selon le nouveau statut
    try {
      let emailSubject, emailContent;
      
      switch (status) {
        case 'under_review':
          emailSubject = `Candidature en cours d'examen - ${application.jobOffer.title}`;
          emailContent = `
            <h1>Candidature en cours d'examen</h1>
            <p>Bonjour ${application.candidate.firstName},</p>
            <p>Votre candidature pour le poste de <strong>${application.jobOffer.title}</strong> est actuellement en cours d'examen par notre équipe de recrutement.</p>
            <p>Nous vous contacterons prochainement pour la suite du processus.</p>
          `;
          break;
          
        case 'interview_scheduled':
          emailSubject = `Entretien programmé - ${application.jobOffer.title}`;
          emailContent = `
            <h1>Entretien programmé !</h1>
            <p>Bonjour ${application.candidate.firstName},</p>
            <p>Félicitations ! Nous souhaitons vous rencontrer pour le poste de <strong>${application.jobOffer.title}</strong>.</p>
            ${application.confirmed_interview_date ? `
              <p><strong>Date d'entretien :</strong> ${new Date(application.confirmed_interview_date).toLocaleString('fr-FR')}</p>
            ` : ''}
            ${application.interview_link ? `
              <p><strong>Lien de l'entretien :</strong> <a href="${application.interview_link}">${application.interview_link}</a></p>
            ` : ''}
            <p>Préparez-vous bien et bonne chance !</p>
          `;
          break;
          
        case 'accepted':
          emailSubject = `Félicitations ! Candidature acceptée - ${application.jobOffer.title}`;
          emailContent = `
            <h1>Félicitations !</h1>
            <p>Bonjour ${application.candidate.firstName},</p>
            <p>Nous avons le plaisir de vous informer que votre candidature pour le poste de <strong>${application.jobOffer.title}</strong> a été retenue !</p>
            <p>Nous vous contacterons prochainement pour finaliser les détails.</p>
            <p>Bienvenue dans l'équipe !</p>
          `;
          break;
          
        case 'rejected':
          emailSubject = `Candidature - ${application.jobOffer.title}`;
          emailContent = `
            <h1>Candidature</h1>
            <p>Bonjour ${application.candidate.firstName},</p>
            <p>Nous vous remercions pour l'intérêt que vous portez à notre entreprise et pour le temps consacré à votre candidature pour le poste de <strong>${application.jobOffer.title}</strong>.</p>
            <p>Après examen attentif de votre profil, nous avons décidé de ne pas donner suite à votre candidature pour ce poste spécifique.</p>
            <p>Nous vous encourageons à consulter nos autres offres d'emploi qui pourraient mieux correspondre à votre profil.</p>
            <p>Nous vous souhaitons bonne chance dans vos recherches.</p>
          `;
          break;
      }

      if (emailSubject && emailContent) {
        await transporter.sendMail({
          from: process.env.FROM_EMAIL,
          to: application.candidate.email,
          subject: emailSubject,
          html: emailContent
        });
      }
    } catch (emailError) {
      console.error('Erreur envoi email candidat:', emailError);
    }

    await t.commit();
    res.json({
      message: 'Statut de candidature mis à jour',
      application
    });

  } catch (error) {
    await t.rollback();
    console.error('Error updating application status:', error);
    res.status(500).json({ error: error.message });
  }
};

// Schedule interview
const scheduleInterview = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { 
      confirmed_interview_date, 
      interview_link, 
      recruiter_notes 
    } = req.body;

    const application = await Application.findByPk(req.params.id, {
      include: [
        {
          model: Candidate,
          as: 'candidate'
        },
        {
          model: JobOffer,
          as: 'jobOffer'
        }
      ],
      transaction: t
    });

    if (!application) {
      await t.rollback();
      return res.status(404).json({ error: 'Candidature non trouvée' });
    }

    // Valider la date d'entretien
    const interviewDate = new Date(confirmed_interview_date);
    if (interviewDate <= new Date()) {
      await t.rollback();
      return res.status(400).json({ error: 'La date d\'entretien doit être dans le futur' });
    }

    // Générer un lien Google Meet si pas fourni
    let meetLink = interview_link;
    if (!meetLink) {
      meetLink = generateGoogleMeetLink();
    }

    await application.update({
      status: 'interview_scheduled',
      confirmed_interview_date: interviewDate,
      interview_link: meetLink,
      recruiter_notes
    }, { transaction: t });

    // Envoyer email de confirmation au candidat
    try {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: application.candidate.email,
        subject: `Entretien confirmé - ${application.jobOffer.title}`,
        html: `
          <h1>Entretien confirmé !</h1>
          <p>Bonjour ${application.candidate.firstName} ${application.candidate.lastName},</p>
          
          <p>Votre entretien pour le poste de <strong>${application.jobOffer.title}</strong> chez <strong>${application.jobOffer.company}</strong> a été confirmé.</p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Détails de l'entretien :</h3>
            <p><strong>📅 Date et heure :</strong> ${interviewDate.toLocaleString('fr-FR')}</p>
            <p><strong>🔗 Lien de l'entretien :</strong> <a href="${meetLink}" style="color: #2196F3;">${meetLink}</a></p>
            <p><strong>📍 Poste :</strong> ${application.jobOffer.title}</p>
            <p><strong>🏢 Entreprise :</strong> ${application.jobOffer.company}</p>
          </div>
          
          <p><strong>Conseils pour l'entretien :</strong></p>
          <ul>
            <li>Testez votre connexion et votre matériel avant l'entretien</li>
            <li>Préparez vos questions sur l'entreprise et le poste</li>
            <li>Ayez votre CV sous les yeux</li>
            <li>Trouvez un endroit calme pour l'entretien</li>
          </ul>
          
          ${recruiter_notes ? `<p><strong>Notes du recruteur :</strong> ${recruiter_notes}</p>` : ''}
          
          <p>Nous avons hâte de vous rencontrer !</p>
          <p>Bonne chance !</p>
        `
      });
    } catch (emailError) {
      console.error('Erreur envoi email entretien:', emailError);
    }

    await t.commit();
    res.json({
      message: 'Entretien programmé avec succès',
      application
    });

  } catch (error) {
    await t.rollback();
    console.error('Error scheduling interview:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get application statistics for recruiter dashboard
const getApplicationStatistics = async (req, res) => {
  try {
    const { job_offer_id } = req.query;

    let whereConditions = {};
    if (job_offer_id) {
      whereConditions.job_offer_id = job_offer_id;
    }

    const [
      totalApplications,
      statusBreakdown,
      recentApplications,
      interviewsScheduled
    ] = await Promise.all([
      // Total des candidatures
      Application.count({ where: whereConditions }),
      
      // Répartition par statut
      Application.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: whereConditions,
        group: ['status'],
        raw: true
      }),
      
      // Candidatures récentes (7 derniers jours)
      Application.count({
        where: {
          ...whereConditions,
          applied_at: {
            [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Entretiens programmés
      Application.count({
        where: {
          ...whereConditions,
          status: 'interview_scheduled',
          confirmed_interview_date: {
            [sequelize.Sequelize.Op.gte]: new Date()
          }
        }
      })
    ]);

    res.json({
      totalApplications,
      statusBreakdown: statusBreakdown.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      recentApplications,
      interviewsScheduled
    });

  } catch (error) {
    console.error('Error getting application statistics:', error);
    res.status(500).json({ error: error.message });
  }
};

// Bulk update application status
const bulkUpdateApplications = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { application_ids, status, recruiter_notes } = req.body;

    if (!Array.isArray(application_ids) || application_ids.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Liste des candidatures requise' });
    }

    if (!status) {
      await t.rollback();
      return res.status(400).json({ error: 'Statut requis' });
    }

    const applications = await Application.findAll({
      where: { id: application_ids },
      include: [
        {
          model: Candidate,
          as: 'candidate'
        },
        {
          model: JobOffer,
          as: 'jobOffer'
        }
      ],
      transaction: t
    });

    if (applications.length !== application_ids.length) {
      await t.rollback();
      return res.status(404).json({ error: 'Certaines candidatures non trouvées' });
    }

    // Mettre à jour toutes les candidatures
    await Application.update({
      status,
      recruiter_notes
    }, {
      where: { id: application_ids },
      transaction: t
    });

    // Envoyer des emails aux candidats concernés
    for (const application of applications) {
      try {
        let emailSubject, emailContent;
        
        switch (status) {
          case 'rejected':
            emailSubject = `Candidature - ${application.jobOffer.title}`;
            emailContent = `
              <p>Bonjour ${application.candidate.firstName},</p>
              <p>Nous vous remercions pour votre candidature au poste de ${application.jobOffer.title}.</p>
              <p>Après examen, nous avons décidé de ne pas donner suite à votre candidature pour ce poste.</p>
              <p>Nous vous encourageons à consulter nos autres offres.</p>
            `;
            break;
            
          case 'under_review':
            emailSubject = `Candidature en cours d'examen - ${application.jobOffer.title}`;
            emailContent = `
              <p>Bonjour ${application.candidate.firstName},</p>
              <p>Votre candidature pour le poste de ${application.jobOffer.title} est en cours d'examen.</p>
              <p>Nous vous contacterons prochainement.</p>
            `;
            break;
        }

        if (emailSubject && emailContent) {
          await transporter.sendMail({
            from: process.env.FROM_EMAIL,
            to: application.candidate.email,
            subject: emailSubject,
            html: emailContent
          });
        }
      } catch (emailError) {
        console.error('Erreur envoi email bulk:', emailError);
      }
    }

    await t.commit();
    res.json({
      message: `${applications.length} candidature(s) mise(s) à jour`,
      updated_count: applications.length
    });

  } catch (error) {
    await t.rollback();
    console.error('Error bulk updating applications:', error);
    res.status(500).json({ error: error.message });
  }
};

// Generate Google Meet link (simplified)
function generateGoogleMeetLink() {
  const meetingId = Math.random().toString(36).substring(2, 15);
  return `https://meet.google.com/${meetingId}`;
}

module.exports = {
  getApplicationsForJobOffer,
  getAllApplications,
  updateApplicationStatus,
  scheduleInterview,
  getApplicationStatistics,
  bulkUpdateApplications
};