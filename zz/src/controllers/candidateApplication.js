const db = require("../../models/index");
const nodemailer = require('nodemailer');
const { Application, JobOffer, Candidate, CandidateCV, JobDescription, Interview, User, sequelize } = db;

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

    console.log('✅ Application created:', {
      id: application.id,
      candidate_id: application.candidate_id,
      job_offer_id: application.job_offer_id,
      status: application.status
    });

    // === CRÉATION AUTOMATIQUE D'UN ENTRETIEN ===
    try {
      const interview = await createAutomaticInterview(application, t);
      console.log('✅ Interview automatically created:', {
        id: interview.id,
        application_id: interview.application_id,
        scheduled_date: interview.scheduled_date,
        interviewer_id: interview.interviewer_id
      });

      // Mettre à jour le statut de la candidature
      await application.update({
        status: 'interview_scheduled',
        confirmed_interview_date: interview.scheduled_date,
        interview_link: interview.meeting_link
      }, { transaction: t });

      console.log('✅ Application status updated to interview_scheduled');

    } catch (interviewError) {
      console.error('❌ Error creating automatic interview:', interviewError);
      // Ne pas faire échouer la candidature si l'entretien échoue
      // L'entretien pourra être créé manuellement plus tard
      console.log('⚠️ Application created but interview creation failed - manual scheduling required');
    }

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

// === FONCTION DE CRÉATION AUTOMATIQUE D'ENTRETIEN ===
const createAutomaticInterview = async (application, transaction) => {
  try {
    console.log('🤖 Creating automatic interview for application:', application.id);
    
    // Récupérer les créneaux proposés par le candidat
    const proposedSlots = application.proposed_interview_slots || [];
    let selectedDate;
    
    if (proposedSlots.length > 0) {
      // Utiliser le premier créneau proposé par le candidat
      selectedDate = new Date(proposedSlots[0]);
      console.log('📅 Using candidate proposed slot:', selectedDate.toLocaleString('fr-FR'));
    } else {
      // Calculer une date automatique si aucun créneau proposé
      const minDays = 3;
      const maxDays = 7;
      const randomDays = Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays;
      
      selectedDate = new Date();
      selectedDate.setDate(selectedDate.getDate() + randomDays);
      
      // Programmer entre 9h et 17h en semaine
      const dayOfWeek = selectedDate.getDay();
      if (dayOfWeek === 0) { // Dimanche -> Lundi
        selectedDate.setDate(selectedDate.getDate() + 1);
      } else if (dayOfWeek === 6) { // Samedi -> Lundi
        selectedDate.setDate(selectedDate.getDate() + 2);
      }
      
      // Heure aléatoire entre 9h et 17h
      const randomHour = Math.floor(Math.random() * 9) + 9; // 9-17h
      const randomMinute = Math.random() > 0.5 ? 0 : 30; // 0 ou 30 minutes
      selectedDate.setHours(randomHour, randomMinute, 0, 0);
    }


    console.log('📅 Interview scheduled for:', selectedDate.toLocaleString('fr-FR'));

    // Trouver un recruteur disponible
    const interviewer = await findAvailableInterviewer(selectedDate, transaction);
    if (!interviewer) {
      throw new Error('Aucun recruteur disponible trouvé');
    }

    console.log('👤 Interviewer assigned:', interviewer.firstName, interviewer.lastName);

    // Générer un lien de réunion Google Meet correct
    const meetingLink = generateMeetingLink();
    console.log('🔗 Meeting link generated:', meetingLink);

    // Déterminer le type d'entretien
    const interviewType = determineInterviewType();
    console.log('🎯 Interview type:', interviewType);

    // Créer l'entretien
    const interview = await Interview.create({
      application_id: application.id,
      interviewer_id: interviewer.id,
      scheduled_date: selectedDate,
      duration_minutes: 60,
      interview_type: interviewType,
      meeting_link: meetingLink,
      status: 'scheduled',
      decision: 'pending',
      reminder_sent: false,
      notes: proposedSlots.length > 0 ? 
        `Entretien programmé sur créneau proposé par le candidat. Autres créneaux disponibles: ${proposedSlots.slice(1).map(slot => new Date(slot).toLocaleString('fr-FR')).join(', ')}` :
        `Entretien automatiquement programmé suite à la candidature du ${new Date().toLocaleDateString('fr-FR')}`
    }, { transaction });

    // Envoyer email de notification à l'admin/recruteur
    await sendInterviewNotificationToRecruiter(application, interview, interviewer);
    
    // Envoyer email de confirmation au candidat
    await sendInterviewNotificationToCandidate(application, interview);

    console.log('✅ Interview created successfully with ID:', interview.id);
    return interview;

  } catch (error) {
    console.error('❌ Error in createAutomaticInterview:', error);
    throw error;
  }
};

// === FONCTION POUR TROUVER UN RECRUTEUR DISPONIBLE ===
const findAvailableInterviewer = async (interviewDate, transaction) => {
  try {
    // 1. Récupérer tous les recruteurs (HR et Admin)
    const recruiters = await User.findAll({
      include: [{
        model: db.Role,
        as: 'roles',
        where: {
          name: { [sequelize.Sequelize.Op.in]: ['hr', 'admin'] },
          is_active: true
        },
        required: true
      }],
      where: { isActive: true },
      transaction
    });

    if (recruiters.length === 0) {
      throw new Error('Aucun recruteur actif trouvé');
    }

    console.log('👥 Available recruiters found:', recruiters.length);

    // 2. Vérifier la disponibilité (pas d'entretien dans les 2h avant/après)
    const timeBuffer = 2 * 60 * 60 * 1000; // 2 heures en millisecondes
    const startTime = new Date(interviewDate.getTime() - timeBuffer);
    const endTime = new Date(interviewDate.getTime() + timeBuffer);

    for (const recruiter of recruiters) {
      const conflictingInterviews = await Interview.count({
        where: {
          interviewer_id: recruiter.id,
          scheduled_date: {
            [sequelize.Sequelize.Op.between]: [startTime, endTime]
          },
          status: { [sequelize.Sequelize.Op.in]: ['scheduled', 'confirmed', 'in_progress'] }
        },
        transaction
      });

      if (conflictingInterviews === 0) {
        console.log('✅ Available recruiter found:', recruiter.firstName, recruiter.lastName);
        return recruiter;
      }
    }

    // 3. Si aucun recruteur disponible, prendre celui avec le moins d'entretiens
    const recruiterWorkload = await Promise.all(
      recruiters.map(async (recruiter) => {
        const interviewCount = await Interview.count({
          where: {
            interviewer_id: recruiter.id,
            scheduled_date: {
              [sequelize.Sequelize.Op.gte]: new Date(),
              [sequelize.Sequelize.Op.lte]: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            },
            status: { [sequelize.Sequelize.Op.in]: ['scheduled', 'confirmed'] }
          },
          transaction
        });

        return { recruiter, interviewCount };
      })
    );

    // Trier par charge de travail croissante
    recruiterWorkload.sort((a, b) => a.interviewCount - b.interviewCount);
    
    const selectedRecruiter = recruiterWorkload[0].recruiter;
    console.log('✅ Recruiter with lowest workload selected:', 
      selectedRecruiter.firstName, selectedRecruiter.lastName, 
      '(', recruiterWorkload[0].interviewCount, 'interviews this week)');

    return selectedRecruiter;

  } catch (error) {
    console.error('❌ Error finding available interviewer:', error);
    throw error;
  }
};

// === FONCTION POUR GÉNÉRER UN LIEN DE RÉUNION ===
const generateMeetingLink = () => {
  // Générer un lien Google Meet valide
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  
  // Format Google Meet: https://meet.google.com/xxx-xxxx-xxx
  const part1 = Array.from({length: 3}, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
  const part2 = Array.from({length: 4}, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
  const part3 = Array.from({length: 3}, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
  
  return `https://meet.google.com/${part1}-${part2}-${part3}`;
};

// === FONCTION POUR DÉTERMINER LE TYPE D'ENTRETIEN ===
const determineInterviewType = () => {
  // Logique pour déterminer le type d'entretien
  // Peut être basée sur le poste, l'expérience, etc.
  const interviewTypes = [
    { type: 'video', weight: 60 },      // 60% de chance
    { type: 'phone', weight: 25 },      // 25% de chance
    { type: 'hr', weight: 10 },         // 10% de chance
    { type: 'technical', weight: 5 }    // 5% de chance
  ];

  const random = Math.random() * 100;
  let cumulative = 0;

  for (const { type, weight } of interviewTypes) {
    cumulative += weight;
    if (random <= cumulative) {
      return type;
    }
  }

  return 'video'; // Fallback
};

// === FONCTION POUR ENVOYER EMAIL D'ENTRETIEN ===
const sendInterviewNotificationToCandidate = async (application, interview) => {
  try {
    const candidate = await Candidate.findByPk(application.candidate_id);
    const jobOffer = await JobOffer.findByPk(application.job_offer_id);
    
    if (!candidate || !jobOffer) {
      console.error('❌ Candidate or JobOffer not found for email notification');
      return;
    }
    
    const interviewDate = new Date(interview.scheduled_date);
    
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: candidate.email,
      subject: `🎉 Entretien programmé - ${jobOffer.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2196F3; text-align: center;">Entretien Programmé !</h1>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2>Félicitations ${candidate.firstName} ${candidate.lastName} !</h2>
            <p>Votre candidature pour le poste de <strong>${jobOffer.title}</strong> chez <strong>${jobOffer.company}</strong> a retenu notre attention.</p>
            <p>Nous avons automatiquement programmé un entretien pour vous.</p>
          </div>

          <div style="background-color: #fff; border: 2px solid #2196F3; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2196F3; margin-top: 0;">📅 Détails de l'entretien</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="margin: 10px 0;"><strong>📅 Date et heure :</strong> ${interviewDate.toLocaleString('fr-FR')}</li>
              <li style="margin: 10px 0;"><strong>⏱️ Durée :</strong> ${interview.duration_minutes} minutes</li>
              <li style="margin: 10px 0;"><strong>🎯 Type :</strong> ${getInterviewTypeLabel(interview.interview_type)}</li>
              <li style="margin: 10px 0;"><strong>🔗 Lien de l'entretien :</strong> <a href="${interview.meeting_link}" style="color: #2196F3; font-weight: bold; text-decoration: none;">${interview.meeting_link}</a></li>
              <li style="margin: 10px 0;"><strong>📍 Poste :</strong> ${jobOffer.title}</li>
              <li style="margin: 10px 0;"><strong>🏢 Entreprise :</strong> ${jobOffer.company}</li>
            </ul>
          </div>

          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #374151; margin-top: 0;">💡 Conseils pour votre entretien :</h4>
            <ul style="color: #6b7280; font-size: 14px;">
              <li>Testez votre connexion et votre matériel 15 minutes avant</li>
              <li>Préparez vos questions sur l'entreprise et le poste</li>
              <li>Ayez votre CV et votre lettre de motivation sous les yeux</li>
              <li>Trouvez un endroit calme et bien éclairé</li>
              <li>Préparez des exemples concrets de vos réalisations</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #10b981; font-weight: bold;">🍀 Bonne chance pour votre entretien !</p>
            <p style="color: #6b7280; font-size: 12px;">
              Si vous avez des questions ou besoin de reporter, contactez notre équipe RH.
            </p>
          </div>
        </div>
      `
    });

    console.log('✅ Interview notification email sent to candidate');

  } catch (emailError) {
    console.error('❌ Error sending interview notification email:', emailError);
  }
};

// === FONCTION POUR OBTENIR LE LABEL DU TYPE D'ENTRETIEN ===
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

    // Enrichir les candidatures avec les informations d'entretien
    const applicationsWithInterviews = await Promise.all(
      applications.map(async (application) => {
        const interview = await Interview.findOne({
          where: { application_id: application.id },
          include: [{
            model: User,
            as: 'interviewer',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }]
        });

        return {
          ...application.toJSON(),
          interview: interview ? interview.toJSON() : null
        };
      })
    );

    res.json(applicationsWithInterviews);
  } catch (error) {
    console.error('Error getting candidate applications:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get single application
const getApplicationById = async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    
    if (isNaN(applicationId)) {
      return res.status(400).json({ error: 'ID de candidature invalide' });
    }
    
    const application = await Application.findOne({
      where: { 
        id: applicationId,
        candidate_id: req.candidate.id 
      },
      include: [
        {
          model: JobOffer,
          as: 'jobOffer',
          required: false,
          include: [{
            model: JobDescription,
            as: 'jobDescription',
            required: false
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

    // Récupérer l'entretien associé s'il existe
    const interview = await Interview.findOne({
      where: { application_id: application.id },
      include: [{
        model: User,
        as: 'interviewer',
        required: false,
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    res.json({
      ...application.toJSON(),
      interview: interview ? interview.toJSON() : null
    });
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
      include: [
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

    // Vérifier que la candidature peut être retirée
    if (['accepted', 'rejected', 'interview_completed'].includes(application.status)) {
      await t.rollback();
      return res.status(400).json({ 
        error: 'Cette candidature ne peut plus être retirée' 
      });
    }

    // Gérer l'entretien associé s'il existe
    const associatedInterview = await Interview.findOne({
      where: { application_id: application.id },
      include: [
        {
          model: User,
          as: 'interviewer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      transaction: t
    });

    if (associatedInterview) {
      // Envoyer emails d'annulation AVANT de supprimer
      try {
        const candidate = await Candidate.findByPk(application.candidate_id);
        
        if (candidate) {
          // Email au candidat
          await transporter.sendMail({
            from: process.env.FROM_EMAIL,
            to: candidate.email,
            subject: `Entretien annulé suite au retrait de candidature - ${application.jobOffer.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #ef4444;">Entretien Annulé</h1>
                <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p>Bonjour ${candidate.firstName} ${candidate.lastName},</p>
                  <p>Suite au retrait de votre candidature pour le poste de <strong>${application.jobOffer.title}</strong>, l'entretien prévu le <strong>${new Date(associatedInterview.scheduled_date).toLocaleString('fr-FR')}</strong> a été automatiquement annulé.</p>
                  <p>Nous espérons avoir l'occasion de collaborer avec vous à l'avenir sur d'autres opportunités.</p>
                  <p>Cordialement,<br>L'équipe de recrutement</p>
                </div>
              </div>
            `
          });

          // Email au recruteur
          if (associatedInterview.interviewer) {
            await transporter.sendMail({
              from: process.env.FROM_EMAIL,
              to: associatedInterview.interviewer.email,
              subject: `Entretien annulé - Candidature retirée - ${application.jobOffer.title}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #ef4444;">Entretien Annulé</h1>
                  <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p>Bonjour ${associatedInterview.interviewer.firstName},</p>
                    <p>L'entretien prévu le <strong>${new Date(associatedInterview.scheduled_date).toLocaleString('fr-FR')}</strong> avec <strong>${candidate.firstName} ${candidate.lastName}</strong> pour le poste de <strong>${application.jobOffer.title}</strong> a été annulé.</p>
                    <p><strong>Raison :</strong> Le candidat a retiré sa candidature.</p>
                    <p>Votre créneau est maintenant libre.</p>
                  </div>
                </div>
              `
            });
          }
        }
      } catch (emailError) {
        console.error('Erreur envoi email annulation entretien:', emailError);
      }

      // SUPPRIMER l'entretien au lieu de le mettre à jour
      await associatedInterview.destroy({ transaction: t });
      console.log('✅ Associated interview deleted due to application withdrawal:', associatedInterview.id);
    }

    // Maintenant supprimer la candidature (plus de contrainte de clé étrangère)
    await application.destroy({ transaction: t });

    // Décrémenter le compteur de candidatures
    if (application.jobOffer && application.jobOffer.applications_count > 0) {
      await application.jobOffer.decrement('applications_count', { transaction: t });
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
// Fonction pour envoyer email de notification au recruteur
const sendInterviewNotificationToRecruiter = async (application, interview, interviewer) => {
  try {
    const candidate = await Candidate.findByPk(application.candidate_id);
    const jobOffer = await JobOffer.findByPk(application.job_offer_id);
    
    if (!candidate || !jobOffer || !interviewer) return;
    
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: interviewer.email,
      subject: `Nouvel entretien programmé - ${jobOffer.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2196F3;">Nouvel entretien programmé</h1>
          <p>Bonjour ${interviewer.firstName} ${interviewer.lastName},</p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Détails de l'entretien :</h3>
            <ul>
              <li><strong>Candidat :</strong> ${candidate.firstName} ${candidate.lastName}</li>
              <li><strong>Email :</strong> ${candidate.email}</li>
              <li><strong>Poste :</strong> ${jobOffer.title}</li>
              <li><strong>Date :</strong> ${new Date(interview.scheduled_date).toLocaleString('fr-FR')}</li>
              <li><strong>Lien Meet :</strong> <a href="${interview.meeting_link}">${interview.meeting_link}</a></li>
            </ul>
          </div>
          
          <p>L'entretien a été automatiquement créé suite à la candidature.</p>
        </div>
      `
    });
    
    console.log('✅ Interview notification email sent to recruiter');
  } catch (emailError) {
    console.error('❌ Error sending recruiter notification:', emailError);
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
  downloadCV,
  // Exporter les nouvelles fonctions pour utilisation dans d'autres modules
  createAutomaticInterview,
  findAvailableInterviewer,
  generateMeetingLink,
  sendInterviewNotificationToRecruiter
};