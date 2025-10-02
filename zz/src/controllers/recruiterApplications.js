const db = require("../../models/index");
const nodemailer = require('nodemailer');
const { Application, JobOffer, Candidate, CandidateCV, JobDescription, Interview, sequelize } = db;

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
    console.log('🔍 Query parameters:', req.query);
    
    const { 
      status, 
      job_offer_id, 
      search,
      page = 1, 
      limit = 20 
    } = req.query;

    // Initialiser whereConditions
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

    console.log('🔍 Where conditions:', whereConditions);
    console.log('🔍 Candidate where:', candidateWhere);

    // Vérifier que les modèles existent
    if (!Application || !Candidate || !JobOffer) {
      console.error('❌ Required models not found:', {
        Application: !!Application,
        Candidate: !!Candidate,
        JobOffer: !!JobOffer
      });
      return res.status(500).json({ 
        error: 'Database models not properly configured',
        details: 'Application, Candidate, or JobOffer model missing'
      });
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
          attributes: ['id', 'title', 'file_path', 'file_name', 'file_size']
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
      order: [['applied_at', 'DESC']],
      distinct: true
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
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error SQL:', error.sql);
    
    // Retourner une erreur plus détaillée
    res.status(500).json({ 
      error: error.message,
      details: error.name,
      sql: error.sql ? 'SQL Error - Check logs' : undefined
    });
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
      interview_type = 'video',
      location,
      meeting_link,
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

    // Générer un lien selon le type d'entretien
    let finalMeetingLink = meeting_link;
    let finalLocation = location;
    
    if (interview_type === 'video' && !meeting_link) {
      finalMeetingLink = generateGoogleMeetLink();
    }
    
    if (interview_type === 'in_person' && !location) {
      finalLocation = 'Adresse à confirmer';
    }

    // Vérifier si le modèle Interview existe
    if (!db.Interview) {
      console.error('❌ Interview model not found in database');
      await t.rollback();
      return res.status(500).json({ error: 'Modèle Interview non configuré' });
    }

    // Chercher un entretien existant pour cette candidature
    let interview = await db.Interview.findOne({
      where: { application_id: application.id },
      transaction: t
    });

    if (interview) {
      // Mettre à jour l'entretien existant
      await interview.update({
        scheduled_date: interviewDate,
        interview_type,
        location: finalLocation,
        meeting_link: finalMeetingLink,
        status: 'confirmed',
        notes: recruiter_notes ? `${interview.notes || ''}\n\n[MISE À JOUR] ${recruiter_notes}` : interview.notes,
        interviewer_id: req.user.id
      }, { transaction: t });
    } else {
      // Créer un nouvel entretien
      interview = await db.Interview.create({
        application_id: application.id,
        interviewer_id: req.user.id,
        scheduled_date: interviewDate,
        duration_minutes: 60,
        interview_type,
        location: finalLocation,
        meeting_link: finalMeetingLink,
        status: 'confirmed',
        notes: recruiter_notes,
        decision: 'pending',
        reminder_sent: false
      }, { transaction: t });
    }

    // Mettre à jour l'application
    await application.update({
      status: 'interview_scheduled',
      confirmed_interview_date: interviewDate,
      interview_link: finalMeetingLink,
      recruiter_notes: recruiter_notes ? `${application.recruiter_notes || ''}\n\n[ENTRETIEN] Programmé le ${new Date().toLocaleString('fr-FR')} - ${recruiter_notes}` : application.recruiter_notes
    }, { transaction: t });

    // Envoyer email de confirmation avec détails complets
    try {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: application.candidate.email,
        subject: `✅ Entretien confirmé - ${application.jobOffer.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10b981; text-align: center;">🎉 Entretien Confirmé !</h1>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h2>Félicitations ${application.candidate.firstName} ${application.candidate.lastName} !</h2>
              <p>Votre candidature pour le poste de <strong>${application.jobOffer.title}</strong> chez <strong>${application.jobOffer.company}</strong> a retenu notre attention.</p>
              <p>Nous avons confirmé votre entretien.</p>
            </div>

            <div style="background-color: #fff; border: 2px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #10b981; margin-top: 0;">📅 Détails de l'entretien</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="margin: 10px 0;"><strong>📅 Date et heure :</strong> ${interviewDate.toLocaleString('fr-FR')}</li>
                <li style="margin: 10px 0;"><strong>⏱️ Durée :</strong> ${interview.duration_minutes} minutes</li>
                <li style="margin: 10px 0;"><strong>🎯 Type :</strong> ${getInterviewTypeLabel(interview_type)}</li>
                ${finalMeetingLink ? `<li style="margin: 10px 0;"><strong>🔗 Lien de l'entretien :</strong> <a href="${finalMeetingLink}" style="color: #10b981; font-weight: bold; text-decoration: none;">${finalMeetingLink}</a></li>` : ''}
                ${finalLocation ? `<li style="margin: 10px 0;"><strong>📍 Lieu :</strong> ${finalLocation}</li>` : ''}
                <li style="margin: 10px 0;"><strong>📍 Poste :</strong> ${application.jobOffer.title}</li>
                <li style="margin: 10px 0;"><strong>🏢 Entreprise :</strong> ${application.jobOffer.company}</li>
                <li style="margin: 10px 0;"><strong>👤 Recruteur :</strong> ${req.user.firstName} ${req.user.lastName}</li>
              </ul>
            </div>

            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #374151; margin-top: 0;">💡 Conseils pour votre entretien :</h4>
              <ul style="color: #6b7280; font-size: 14px;">
                ${interview_type === 'video' ? '<li>Testez votre connexion et votre matériel 15 minutes avant</li>' : ''}
                ${interview_type === 'phone' ? '<li>Assurez-vous d\'être dans un endroit calme avec une bonne réception</li>' : ''}
                ${interview_type === 'in_person' ? '<li>Prévoyez d\'arriver 10 minutes en avance</li>' : ''}
                <li>Préparez vos questions sur l'entreprise et le poste</li>
                <li>Ayez votre CV et votre lettre de motivation sous les yeux</li>
                ${interview_type === 'video' ? '<li>Trouvez un endroit calme et bien éclairé</li>' : ''}
                <li>Préparez des exemples concrets de vos réalisations</li>
              </ul>
            </div>

            ${recruiter_notes ? `
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #92400e; margin-top: 0;">📝 Notes du recruteur :</h4>
                <p style="color: #78350f;">${recruiter_notes}</p>
              </div>
            ` : ''}

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #10b981; font-weight: bold;">🍀 Nous avons hâte de vous rencontrer !</p>
              <p style="color: #6b7280; font-size: 12px;">
                Si vous avez des questions ou besoin de reporter, contactez notre équipe RH.
              </p>
            </div>
          </div>
        `
      });

      console.log('✅ Interview confirmation email sent to candidate');
    } catch (emailError) {
      console.error('Erreur envoi email entretien:', emailError);
    }

    res.json({
      message: 'Entretien programmé avec succès',
      application,
      interview
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
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #374151;">Candidature</h1>
                <p>Bonjour ${application.candidate.firstName},</p>
                <p>Nous vous remercions pour votre candidature au poste de <strong>${application.jobOffer.title}</strong>.</p>
                <p>Après examen, nous avons décidé de ne pas donner suite à votre candidature pour ce poste.</p>
                <p>Nous vous encourageons à consulter nos autres offres qui pourraient mieux correspondre à votre profil.</p>
                <p>Nous vous souhaitons bonne chance dans vos recherches.</p>
              </div>
            `;
            break;
            
          case 'under_review':
            emailSubject = `Candidature en cours d'examen - ${application.jobOffer.title}`;
            emailContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2196F3;">Candidature en cours d'examen</h1>
                <p>Bonjour ${application.candidate.firstName},</p>
                <p>Votre candidature pour le poste de <strong>${application.jobOffer.title}</strong> est actuellement en cours d'examen par notre équipe.</p>
                <p>Nous vous contacterons prochainement pour la suite du processus.</p>
                <p>Merci pour votre patience.</p>
              </div>
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
      } catch (error) {
        console.error(
          `Erreur lors de l'envoi d'email à ${application.candidate.email}:`,
          error
        );
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

// Get application details with CV and cover letter
const getApplicationDetails = async (req, res) => {
  try {
    const application = await Application.findByPk(req.params.id, {
      include: [
        {
          model: Candidate,
          as: 'candidate',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'location', 'bio']
        },
        {
          model: CandidateCV,
          as: 'cv',
          attributes: ['id', 'title', 'file_path', 'file_name', 'file_size', 'created_at']
        },
        {
          model: JobOffer,
          as: 'jobOffer',
          attributes: ['id', 'title', 'company', 'location'],
          include: [{
            model: JobDescription,
            as: 'jobDescription',
            attributes: ['id', 'emploi', 'filiere_activite']
          }]
        }
      ]
    });

    if (!application) {
      return res.status(404).json({ error: 'Candidature non trouvée' });
    }

    res.json(application);

  } catch (error) {
    console.error('Error getting application details:', error);
    res.status(500).json({ error: error.message });
  }
};

// Download CV for recruiter
const downloadCandidateCV = async (req, res) => {
  try {
    const { cv_id } = req.params;
    
    const cv = await CandidateCV.findByPk(cv_id);
    
    if (!cv) {
      return res.status(404).json({ error: 'CV non trouvé' });
    }

    const fs = require('fs');
    const path = require('path');
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

// Get available applications for interview scheduling
const getAvailableApplicationsForInterview = async (req, res) => {
  try {
    console.log('📋 Getting available applications for interview...');
    console.log('👤 Request user:', req.user ? `${req.user.username} (${req.user.role})` : 'None');
    
    const applications = await Application.findAll({
      where: {
        status: { [sequelize.Sequelize.Op.in]: ['applied', 'under_review'] }
      },
      include: [
        {
          model: Candidate,
          as: 'candidate',
          required: false,
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: JobOffer,
          as: 'jobOffer',
          required: false,
          attributes: ['id', 'title', 'company']
        }
      ],
      order: [['applied_at', 'DESC']],
      limit: 50
    });

    console.log('✅ Available applications found:', applications.length);
    
    res.json({
      applications
    });

  } catch (error) {
    console.error('Error getting available applications:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
};

// Fonction utilitaire pour obtenir le label du type d'entretien
const getInterviewTypeLabel = (type) => {
  const labels = {
    'phone': 'Entretien téléphonique',
    'video': 'Entretien vidéo',
    'in_person': 'Entretien en personne',
    'technical': 'Entretien technique',
    'hr': 'Entretien RH',
    'final': 'Entretien final'
  };
  return labels[type] || 'Entretien';
};

// Generate Google Meet link (simplified)
function generateGoogleMeetLink() {
  // Générer un lien Google Meet valide
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  
  // Format Google Meet: https://meet.google.com/xxx-xxxx-xxx
  const part1 = Array.from({length: 3}, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
  const part2 = Array.from({length: 4}, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
  const part3 = Array.from({length: 3}, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
  
  return `https://meet.google.com/${part1}-${part2}-${part3}`;
}

module.exports = {
  getApplicationsForJobOffer,
  getAllApplications,
  updateApplicationStatus,
  scheduleInterview,
  getApplicationStatistics,
  bulkUpdateApplications,
  getApplicationDetails,
  downloadCandidateCV,
  getAvailableApplicationsForInterview
};