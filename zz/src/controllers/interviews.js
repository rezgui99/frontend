const db = require("../../models/index");
const nodemailer = require('nodemailer');
const { Interview, Application, Candidate, JobOffer, User, CandidateCV, sequelize } = db;

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

// Get all interviews with filters
const getAllInterviews = async (req, res) => {
  try {
    const { 
      status, 
      interview_type, 
      date_from, 
      date_to,
      page = 1, 
      limit = 20 
    } = req.query;

    const whereConditions = {};
    if (status) whereConditions.status = status;
    if (interview_type) whereConditions.interview_type = interview_type;
    
    if (date_from || date_to) {
      whereConditions.scheduled_date = {};
      if (date_from) whereConditions.scheduled_date[sequelize.Sequelize.Op.gte] = new Date(date_from);
      if (date_to) whereConditions.scheduled_date[sequelize.Sequelize.Op.lte] = new Date(date_to);
    }

    const offset = (page - 1) * limit;

    const { count, rows: interviews } = await Interview.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Application,
          as: 'application',
          include: [
            {
              model: Candidate,
              as: 'candidate',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
            },
            {
              model: JobOffer,
              as: 'jobOffer',
              attributes: ['id', 'title', 'company']
            },
            {
              model: CandidateCV,
              as: 'cv',
              attributes: ['id', 'title', 'file_name', 'file_size', 'file_path']
            }
          ]
        },
        {
          model: User,
          as: 'interviewer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['scheduled_date', 'ASC']]
    });

    res.json({
      interviews,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error getting interviews:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get interview statistics
const getInterviewStatistics = async (req, res) => {
  try {
    const [
      totalInterviews,
      statusBreakdown,
      typeBreakdown,
      upcomingInterviews,
      averageScore
    ] = await Promise.all([
      Interview.count(),
      
      Interview.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      }),
      
      Interview.findAll({
        attributes: [
          'interview_type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['interview_type'],
        raw: true
      }),
      
      Interview.count({
        where: {
          scheduled_date: {
            [sequelize.Sequelize.Op.gte]: new Date(),
            [sequelize.Sequelize.Op.lte]: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          },
          status: { [sequelize.Sequelize.Op.in]: ['scheduled', 'confirmed'] }
        }
      }),
      
      Interview.findOne({
        attributes: [[sequelize.fn('AVG', sequelize.col('score')), 'avg_score']],
        where: { score: { [sequelize.Sequelize.Op.ne]: null } },
        raw: true
      })
    ]);

    res.json({
      total_interviews: totalInterviews,
      upcoming_interviews: upcomingInterviews,
      status_breakdown: statusBreakdown.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      type_breakdown: typeBreakdown.reduce((acc, item) => {
        acc[item.interview_type] = parseInt(item.count);
        return acc;
      }, {}),
      interviewer_breakdown: [],
      average_score: averageScore?.avg_score ? parseFloat(averageScore.avg_score) : null
    });

  } catch (error) {
    console.error('Error getting interview statistics:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get upcoming interviews
const getUpcomingInterviews = async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    
    let dateCondition;
    const now = new Date();
    
    switch (period) {
      case 'today':
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        dateCondition = {
          [sequelize.Sequelize.Op.between]: [startOfDay, endOfDay]
        };
        break;
      case 'week':
        const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        dateCondition = {
          [sequelize.Sequelize.Op.between]: [now, endOfWeek]
        };
        break;
      default:
        dateCondition = {
          [sequelize.Sequelize.Op.gte]: now
        };
    }

    const interviews = await Interview.findAll({
      where: {
        scheduled_date: dateCondition,
        status: { [sequelize.Sequelize.Op.in]: ['scheduled', 'confirmed'] }
      },
      include: [
        {
          model: Application,
          as: 'application',
          include: [
            {
              model: Candidate,
              as: 'candidate',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
            },
            {
              model: JobOffer,
              as: 'jobOffer',
              attributes: ['id', 'title', 'company']
            }
          ]
        },
        {
          model: User,
          as: 'interviewer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['scheduled_date', 'ASC']]
    });

    res.json(interviews);

  } catch (error) {
    console.error('Error getting upcoming interviews:', error);
    res.status(500).json({ error: error.message });
  }
};

// Schedule new interview
const scheduleInterview = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      application_id,
      scheduled_date,
      duration_minutes = 60,
      interview_type = 'video',
      location,
      meeting_link,
      notes
    } = req.body;

    // Vérifier que l'application existe
    const application = await Application.findByPk(application_id, {
      include: [
        {
          model: Candidate,
          as: 'candidate'
        },
        {
          model: JobOffer,
          as: 'jobOffer'
        },
        {
          model: CandidateCV,
          as: 'cv'
        }
      ],
      transaction: t
    });

    if (!application) {
      await t.rollback();
      return res.status(404).json({ error: 'Candidature non trouvée' });
    }

    // Valider la date
    const interviewDate = new Date(scheduled_date);
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

    // Vérifier s'il existe déjà un entretien pour cette candidature
    let interview = await Interview.findOne({
      where: { application_id },
      transaction: t
    });

    if (interview) {
      // Mettre à jour l'entretien existant
      await interview.update({
        scheduled_date: interviewDate,
        duration_minutes,
        interview_type,
        location: finalLocation,
        meeting_link: finalMeetingLink,
        status: 'confirmed',
        notes: notes ? `${interview.notes || ''}\n\n[REPROGRAMMÉ] ${notes}` : interview.notes,
        interviewer_id: req.user.id
      }, { transaction: t });
    } else {
      // Créer un nouvel entretien
      interview = await Interview.create({
        application_id,
        interviewer_id: req.user.id,
        scheduled_date: interviewDate,
        duration_minutes,
        interview_type,
        location: finalLocation,
        meeting_link: finalMeetingLink,
        status: 'confirmed',
        notes,
        decision: 'pending',
        reminder_sent: false
      }, { transaction: t });
    }

    // Mettre à jour l'application
    await application.update({
      status: 'interview_scheduled',
      confirmed_interview_date: interviewDate,
      interview_link: finalMeetingLink
    }, { transaction: t });

    // Envoyer email détaillé au candidat
    await sendDetailedInterviewNotification(application, interview, req.user);

    await t.commit();
    res.status(201).json({
      message: 'Entretien programmé avec succès',
      interview
    });

  } catch (error) {
    await t.rollback();
    console.error('Error scheduling interview:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update interview
const updateInterview = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const interview = await Interview.findByPk(req.params.id, {
      include: [
        {
          model: Application,
          as: 'application',
          include: [
            { model: Candidate, as: 'candidate' },
            { model: JobOffer, as: 'jobOffer' }
          ]
        }
      ],
      transaction: t
    });

    if (!interview) {
      await t.rollback();
      return res.status(404).json({ error: 'Entretien non trouvé' });
    }

    const oldStatus = interview.status;
    const {
      scheduled_date,
      duration_minutes,
      interview_type,
      location,
      meeting_link,
      status,
      notes,
      score,
      feedback,
      decision
    } = req.body;

    const updateData = {};
    if (scheduled_date) updateData.scheduled_date = new Date(scheduled_date);
    if (duration_minutes) updateData.duration_minutes = duration_minutes;
    if (interview_type) updateData.interview_type = interview_type;
    if (location !== undefined) updateData.location = location;
    if (meeting_link !== undefined) updateData.meeting_link = meeting_link;
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (score !== undefined) updateData.score = score;
    if (feedback !== undefined) updateData.feedback = feedback;
    if (decision) updateData.decision = decision;

    await interview.update(updateData, { transaction: t });

    // Mettre à jour l'application si nécessaire
    if (status && status !== oldStatus) {
      await updateApplicationFromInterviewStatus(interview.application, status, interview, t);
      
      // Envoyer email si changement de statut significatif
      if (['confirmed', 'cancelled', 'completed'].includes(status)) {
        await sendInterviewNotificationEmail(interview.application, interview, status);
      }
    }

    await t.commit();
    res.json({
      message: 'Entretien mis à jour avec succès',
      interview
    });

  } catch (error) {
    await t.rollback();
    console.error('Error updating interview:', error);
    res.status(500).json({ error: error.message });
  }
};

// Confirm interview
const confirmInterview = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const interview = await Interview.findByPk(req.params.id, {
      include: [
        {
          model: Application,
          as: 'application',
          include: [
            { model: Candidate, as: 'candidate' },
            { model: JobOffer, as: 'jobOffer' }
          ]
        }
      ],
      transaction: t
    });

    if (!interview) {
      await t.rollback();
      return res.status(404).json({ error: 'Entretien non trouvé' });
    }

    // Générer un nouveau lien Meet si pas présent
    const meetingLink = interview.meeting_link || generateGoogleMeetLink();

    await interview.update({
      status: 'confirmed',
      meeting_link: meetingLink
    }, { transaction: t });

    // Mettre à jour l'application
    await interview.application.update({
      status: 'interview_scheduled',
      confirmed_interview_date: interview.scheduled_date,
      interview_link: meetingLink
    }, { transaction: t });

    // Envoyer email de confirmation au candidat
    await sendInterviewConfirmationEmail(interview);

    await t.commit();
    res.json({
      message: 'Entretien confirmé avec succès',
      interview
    });

  } catch (error) {
    await t.rollback();
    console.error('Error confirming interview:', error);
    res.status(500).json({ error: error.message });
  }
};

// Cancel interview
const cancelInterview = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { reason } = req.body;
    
    const interview = await Interview.findByPk(req.params.id, {
      include: [
        {
          model: Application,
          as: 'application',
          include: [
            { model: Candidate, as: 'candidate' },
            { model: JobOffer, as: 'jobOffer' }
          ]
        }
      ],
      transaction: t
    });

    if (!interview) {
      await t.rollback();
      return res.status(404).json({ error: 'Entretien non trouvé' });
    }

    // Mettre à jour l'entretien
    await interview.update({
      status: 'cancelled',
      notes: `${interview.notes || ''}\n\nAnnulé le ${new Date().toLocaleString('fr-FR')}. Raison: ${reason || 'Non spécifiée'}`
    }, { transaction: t });

    // Mettre à jour l'application - retour à "under_review"
    await interview.application.update({
      status: 'under_review',
      confirmed_interview_date: null,
      interview_link: null,
      recruiter_notes: `${interview.application.recruiter_notes || ''}\n\nEntretien annulé le ${new Date().toLocaleString('fr-FR')}. Raison: ${reason || 'Non spécifiée'}`
    }, { transaction: t });

    // Envoyer email d'annulation au candidat
    await sendInterviewCancellationEmail(interview, reason);

    await t.commit();
    res.json({
      message: 'Entretien annulé avec succès',
      interview
    });

  } catch (error) {
    await t.rollback();
    console.error('Error cancelling interview:', error);
    res.status(500).json({ error: error.message });
  }
};

// Complete interview
const completeInterview = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { score, feedback, decision } = req.body;
    
    const interview = await Interview.findByPk(req.params.id, {
      include: [
        {
          model: Application,
          as: 'application',
          include: [
            { model: Candidate, as: 'candidate' },
            { model: JobOffer, as: 'jobOffer' }
          ]
        }
      ],
      transaction: t
    });

    if (!interview) {
      await t.rollback();
      return res.status(404).json({ error: 'Entretien non trouvé' });
    }

    await interview.update({
      status: 'completed',
      score: score ? parseInt(score) : null,
      feedback,
      decision: decision || 'pending'
    }, { transaction: t });

    // Mettre à jour l'application
    let newApplicationStatus = 'interview_completed';
    if (decision === 'pass') {
      newApplicationStatus = 'accepted';
    } else if (decision === 'fail') {
      newApplicationStatus = 'rejected';
    }

    await interview.application.update({
      status: newApplicationStatus,
      recruiter_notes: `${interview.application.recruiter_notes || ''}\n\nEntretien terminé le ${new Date().toLocaleString('fr-FR')}. Score: ${score || 'N/A'}, Décision: ${decision || 'En attente'}`
    }, { transaction: t });

    // Envoyer email au candidat selon la décision
    await sendInterviewCompletionEmail(interview, decision);

    await t.commit();
    res.json({
      message: 'Entretien marqué comme terminé',
      interview
    });

  } catch (error) {
    await t.rollback();
    console.error('Error completing interview:', error);
    res.status(500).json({ error: error.message });
  }
};

// Reschedule interview
const rescheduleInterview = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { new_scheduled_date, reason } = req.body;
    
    const interview = await Interview.findByPk(req.params.id, {
      include: [
        {
          model: Application,
          as: 'application',
          include: [
            { model: Candidate, as: 'candidate' },
            { model: JobOffer, as: 'jobOffer' }
          ]
        }
      ],
      transaction: t
    });

    if (!interview) {
      await t.rollback();
      return res.status(404).json({ error: 'Entretien non trouvé' });
    }

    const newDate = new Date(new_scheduled_date);
    if (newDate <= new Date()) {
      await t.rollback();
      return res.status(400).json({ error: 'La nouvelle date doit être dans le futur' });
    }

    const oldDate = interview.scheduled_date;

    await interview.update({
      scheduled_date: newDate,
      status: 'rescheduled',
      notes: `${interview.notes || ''}\n\nReprogrammé le ${new Date().toLocaleString('fr-FR')}. Ancienne date: ${new Date(oldDate).toLocaleString('fr-FR')}. Raison: ${reason || 'Non spécifiée'}`
    }, { transaction: t });

    // Mettre à jour l'application
    await interview.application.update({
      confirmed_interview_date: newDate
    }, { transaction: t });

    // Envoyer email de reprogrammation au candidat
    await sendInterviewRescheduleEmail(interview, oldDate, reason);

    await t.commit();
    res.json({
      message: 'Entretien reprogrammé avec succès',
      interview
    });

  } catch (error) {
    await t.rollback();
    console.error('Error rescheduling interview:', error);
    res.status(500).json({ error: error.message });
  }
};

// Send interview confirmation email
const sendInterviewConfirmation = async (req, res) => {
  try {
    const interview = await Interview.findByPk(req.params.id, {
      include: [
        {
          model: Application,
          as: 'application',
          include: [
            { model: Candidate, as: 'candidate' },
            { model: JobOffer, as: 'jobOffer' }
          ]
        }
      ]
    });

    if (!interview) {
      return res.status(404).json({ error: 'Entretien non trouvé' });
    }

    await sendInterviewConfirmationEmail(interview);
    
    res.json({ message: 'Email de confirmation envoyé' });

  } catch (error) {
    console.error('Error sending interview confirmation:', error);
    res.status(500).json({ error: error.message });
  }
};

// === FONCTIONS UTILITAIRES ===

// Mettre à jour l'application selon le statut de l'entretien
const updateApplicationFromInterviewStatus = async (application, interviewStatus, interview, transaction) => {
  let newStatus = application.status;
  const updateData = {};

  switch (interviewStatus) {
    case 'confirmed':
      newStatus = 'interview_scheduled';
      updateData.confirmed_interview_date = interview.scheduled_date;
      updateData.interview_link = interview.meeting_link;
      break;
    case 'cancelled':
      newStatus = 'under_review';
      updateData.confirmed_interview_date = null;
      updateData.interview_link = null;
      break;
    case 'completed':
      newStatus = 'interview_completed';
      break;
    case 'rescheduled':
      newStatus = 'interview_scheduled';
      updateData.confirmed_interview_date = interview.scheduled_date;
      break;
  }

  if (newStatus !== application.status) {
    updateData.status = newStatus;
  }

  if (Object.keys(updateData).length > 0) {
    await application.update(updateData, { transaction });
  }
};

// Générer un lien Google Meet
const generateGoogleMeetLink = () => {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  const part1 = Array.from({length: 3}, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
  const part2 = Array.from({length: 4}, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
  const part3 = Array.from({length: 3}, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
  return `https://meet.google.com/${part1}-${part2}-${part3}`;
};

// Envoyer email détaillé de notification d'entretien
const sendDetailedInterviewNotification = async (application, interview, recruiter) => {
  try {
    const candidate = application.candidate;
    const jobOffer = application.jobOffer;
    const interviewDate = new Date(interview.scheduled_date);
    
    if (!candidate || !jobOffer) return;

    // Déterminer le mode d'entretien et les instructions spécifiques
    const interviewModeInfo = getInterviewModeInfo(interview.interview_type, interview.meeting_link, interview.location);

    const subject = `🎉 Entretien programmé - ${jobOffer.title}`;
    const content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2196F3; text-align: center;">Entretien Programmé !</h1>
        
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2>Félicitations ${candidate.firstName} ${candidate.lastName} !</h2>
          <p>Votre candidature pour le poste de <strong>${jobOffer.title}</strong> chez <strong>${jobOffer.company}</strong> a retenu notre attention.</p>
          <p>Nous avons programmé un entretien pour vous.</p>
        </div>

        <div style="background-color: #fff; border: 2px solid #2196F3; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2196F3; margin-top: 0;">📅 Détails de l'entretien</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="margin: 10px 0;"><strong>📅 Date et heure :</strong> ${interviewDate.toLocaleString('fr-FR')}</li>
            <li style="margin: 10px 0;"><strong>⏱️ Durée :</strong> ${interview.duration_minutes} minutes</li>
            <li style="margin: 10px 0;"><strong>🎯 Type :</strong> ${getInterviewTypeLabel(interview.interview_type)}</li>
            <li style="margin: 10px 0;"><strong>👤 Recruteur :</strong> ${recruiter.firstName} ${recruiter.lastName}</li>
            ${interviewModeInfo.details}
          </ul>
        </div>

        ${interviewModeInfo.instructions}

        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #374151; margin-top: 0;">💡 Conseils pour votre entretien :</h4>
          <ul style="color: #6b7280; font-size: 14px;">
            ${interviewModeInfo.tips}
            <li>Préparez vos questions sur l'entreprise et le poste</li>
            <li>Ayez votre CV et votre lettre de motivation sous les yeux</li>
            <li>Préparez des exemples concrets de vos réalisations</li>
          </ul>
        </div>

        ${interview.notes ? `
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #92400e; margin-top: 0;">📝 Notes du recruteur :</h4>
            <p style="color: #78350f;">${interview.notes}</p>
          </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #10b981; font-weight: bold;">🍀 Nous avons hâte de vous rencontrer !</p>
          <p style="color: #6b7280; font-size: 12px;">
            Si vous avez des questions ou besoin de reporter, contactez notre équipe RH à ${recruiter.email}.
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: candidate.email,
      subject,
      html: content
    });

    console.log('✅ Detailed interview notification email sent to candidate');

  } catch (emailError) {
    console.error('❌ Error sending detailed interview notification:', emailError);
  }
};

// Envoyer email de notification d'entretien
const sendInterviewNotificationEmail = async (application, interview, status) => {
  try {
    const candidate = application.candidate;
    const jobOffer = application.jobOffer;
    
    if (!candidate || !jobOffer) return;

    let subject, content;
    const interviewDate = new Date(interview.scheduled_date);

    switch (status) {
      case 'scheduled':
      case 'confirmed':
        subject = `🎉 Entretien ${status === 'confirmed' ? 'confirmé' : 'programmé'} - ${jobOffer.title}`;
        content = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2196F3; text-align: center;">Entretien ${status === 'confirmed' ? 'Confirmé' : 'Programmé'} !</h1>
            
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2>Félicitations ${candidate.firstName} ${candidate.lastName} !</h2>
              <p>Votre candidature pour le poste de <strong>${jobOffer.title}</strong> chez <strong>${jobOffer.company}</strong> a retenu notre attention.</p>
              <p>Nous avons ${status === 'confirmed' ? 'confirmé' : 'programmé'} un entretien pour vous.</p>
            </div>

            <div style="background-color: #fff; border: 2px solid #2196F3; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2196F3; margin-top: 0;">📅 Détails de l'entretien</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="margin: 10px 0;"><strong>📅 Date et heure :</strong> ${interviewDate.toLocaleString('fr-FR')}</li>
                <li style="margin: 10px 0;"><strong>⏱️ Durée :</strong> ${interview.duration_minutes} minutes</li>
                <li style="margin: 10px 0;"><strong>🎯 Type :</strong> ${getInterviewTypeLabel(interview.interview_type)}</li>
                ${interview.meeting_link ? `<li style="margin: 10px 0;"><strong>🔗 Lien de l'entretien :</strong> <a href="${interview.meeting_link}" style="color: #2196F3; font-weight: bold;">${interview.meeting_link}</a></li>` : ''}
                ${interview.location ? `<li style="margin: 10px 0;"><strong>📍 Lieu :</strong> ${interview.location}</li>` : ''}
              </ul>
            </div>

            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #374151; margin-top: 0;">💡 Conseils pour votre entretien :</h4>
              <ul style="color: #6b7280; font-size: 14px;">
                ${interview.interview_type === 'video' ? '<li>Testez votre connexion et votre matériel 15 minutes avant</li>' : ''}
                ${interview.interview_type === 'phone' ? '<li>Assurez-vous d\'être dans un endroit calme avec une bonne réception</li>' : ''}
                ${interview.interview_type === 'in_person' ? '<li>Prévoyez d\'arriver 10 minutes en avance</li>' : ''}
                <li>Préparez vos questions sur l'entreprise et le poste</li>
                <li>Ayez votre CV et votre lettre de motivation sous les yeux</li>
                ${interview.interview_type === 'video' ? '<li>Trouvez un endroit calme et bien éclairé</li>' : ''}
                <li>Préparez des exemples concrets de vos réalisations</li>
              </ul>
            </div>

            ${interview.notes ? `
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #92400e; margin-top: 0;">📝 Notes du recruteur :</h4>
                <p style="color: #78350f;">${interview.notes}</p>
              </div>
            ` : ''}

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #10b981; font-weight: bold;">🍀 Nous avons hâte de vous rencontrer !</p>
              <p style="color: #6b7280; font-size: 12px;">
                Si vous avez des questions ou besoin de reporter, contactez notre équipe RH.
              </p>
            </div>
          </div>
        `;
        break;
    }

    if (subject && content) {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: candidate.email,
        subject,
        html: content
      });
    }

  } catch (emailError) {
    console.error('Error sending interview notification email:', emailError);
  }
};

// Envoyer email de confirmation d'entretien
const sendInterviewConfirmationEmail = async (interview) => {
  try {
    const candidate = interview.application.candidate;
    const jobOffer = interview.application.jobOffer;
    const interviewDate = new Date(interview.scheduled_date);

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: candidate.email,
      subject: `✅ Entretien confirmé - ${jobOffer.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981; text-align: center;">Entretien Confirmé !</h1>
          
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h2>Bonjour ${candidate.firstName} ${candidate.lastName},</h2>
            <p>Votre entretien pour le poste de <strong>${jobOffer.title}</strong> chez <strong>${jobOffer.company}</strong> est maintenant <strong style="color: #10b981;">CONFIRMÉ</strong>.</p>
          </div>

          <div style="background-color: #fff; border: 2px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #10b981; margin-top: 0;">📅 Détails Confirmés</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="margin: 10px 0;"><strong>📅 Date et heure :</strong> ${interviewDate.toLocaleString('fr-FR')}</li>
              <li style="margin: 10px 0;"><strong>⏱️ Durée :</strong> ${interview.duration_minutes} minutes</li>
              <li style="margin: 10px 0;"><strong>🎯 Type :</strong> ${getInterviewTypeLabel(interview.interview_type)}</li>
              <li style="margin: 10px 0;"><strong>🔗 Lien de l'entretien :</strong> <a href="${interview.meeting_link}" style="color: #10b981; font-weight: bold; text-decoration: none;">${interview.meeting_link}</a></li>
              ${interview.location ? `<li style="margin: 10px 0;"><strong>📍 Lieu :</strong> ${interview.location}</li>` : ''}
            </ul>
          </div>

          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h4 style="color: #92400e; margin-top: 0;">⚠️ Important :</h4>
            <ul style="color: #78350f; font-size: 14px;">
              <li>Rejoignez la réunion 5 minutes avant l'heure prévue</li>
              <li>Assurez-vous d'avoir une connexion internet stable</li>
              <li>Préparez un environnement calme et professionnel</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0; background-color: #f0fdf4; padding: 20px; border-radius: 8px;">
            <p style="color: #10b981; font-weight: bold; font-size: 18px;">🎯 Votre entretien est confirmé !</p>
            <p style="color: #059669;">Nous avons hâte de faire votre connaissance.</p>
          </div>
        </div>
      `
    });

    console.log('✅ Interview confirmation email sent to candidate');

  } catch (emailError) {
    console.error('❌ Error sending interview confirmation email:', emailError);
  }
};

// Envoyer email d'annulation d'entretien
const sendInterviewCancellationEmail = async (interview, reason) => {
  try {
    const candidate = interview.application.candidate;
    const jobOffer = interview.application.jobOffer;
    const interviewDate = new Date(interview.scheduled_date);

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: candidate.email,
      subject: `❌ Entretien annulé - ${jobOffer.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ef4444; text-align: center;">Entretien Annulé</h1>
          
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <h2>Bonjour ${candidate.firstName} ${candidate.lastName},</h2>
            <p>Nous devons malheureusement annuler votre entretien pour le poste de <strong>${jobOffer.title}</strong> chez <strong>${jobOffer.company}</strong>.</p>
          </div>

          <div style="background-color: #fff; border: 2px solid #ef4444; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #ef4444; margin-top: 0;">📅 Entretien Annulé</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="margin: 10px 0;"><strong>📅 Date prévue :</strong> ${interviewDate.toLocaleString('fr-FR')}</li>
              <li style="margin: 10px 0;"><strong>🎯 Type :</strong> ${getInterviewTypeLabel(interview.interview_type)}</li>
              <li style="margin: 10px 0;"><strong>📍 Poste :</strong> ${jobOffer.title}</li>
              ${reason ? `<li style="margin: 10px 0;"><strong>📝 Raison :</strong> ${reason}</li>` : ''}
            </ul>
          </div>

          <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
            <h4 style="color: #1e40af; margin-top: 0;">ℹ️ Prochaines étapes :</h4>
            <p style="color: #1e3a8a;">Votre candidature reste active et sera réexaminée par notre équipe. Nous vous contacterons si nous souhaitons reprogrammer un entretien ou pour toute autre suite à donner.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #6b7280;">Nous nous excusons pour ce contretemps et vous remercions de votre compréhension.</p>
            <p style="color: #6b7280; font-size: 12px;">
              L'équipe de recrutement
            </p>
          </div>
        </div>
      `
    });

    console.log('✅ Interview cancellation email sent to candidate');

  } catch (emailError) {
    console.error('❌ Error sending interview cancellation email:', emailError);
  }
};

// Envoyer email de reprogrammation d'entretien
const sendInterviewRescheduleEmail = async (interview, oldDate, reason) => {
  try {
    const candidate = interview.application.candidate;
    const jobOffer = interview.application.jobOffer;
    const newDate = new Date(interview.scheduled_date);

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: candidate.email,
      subject: `📅 Entretien reprogrammé - ${jobOffer.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f59e0b; text-align: center;">Entretien Reprogrammé</h1>
          
          <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h2>Bonjour ${candidate.firstName} ${candidate.lastName},</h2>
            <p>Votre entretien pour le poste de <strong>${jobOffer.title}</strong> chez <strong>${jobOffer.company}</strong> a été reprogrammé.</p>
          </div>

          <div style="background-color: #fff; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #f59e0b; margin-top: 0;">📅 Nouvelles Informations</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="margin: 10px 0;"><strong>📅 Ancienne date :</strong> <span style="text-decoration: line-through; color: #6b7280;">${new Date(oldDate).toLocaleString('fr-FR')}</span></li>
              <li style="margin: 10px 0;"><strong>📅 Nouvelle date :</strong> <span style="color: #10b981; font-weight: bold;">${newDate.toLocaleString('fr-FR')}</span></li>
              <li style="margin: 10px 0;"><strong>⏱️ Durée :</strong> ${interview.duration_minutes} minutes</li>
              <li style="margin: 10px 0;"><strong>🎯 Type :</strong> ${getInterviewTypeLabel(interview.interview_type)}</li>
              <li style="margin: 10px 0;"><strong>🔗 Lien de l'entretien :</strong> <a href="${interview.meeting_link}" style="color: #f59e0b; font-weight: bold;">${interview.meeting_link}</a></li>
              ${reason ? `<li style="margin: 10px 0;"><strong>📝 Raison :</strong> ${reason}</li>` : ''}
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #10b981; font-weight: bold;">✅ Nouvel horaire confirmé !</p>
            <p style="color: #6b7280;">Nous nous excusons pour ce changement et vous remercions de votre flexibilité.</p>
          </div>
        </div>
      `
    });

    console.log('✅ Interview reschedule email sent to candidate');

  } catch (emailError) {
    console.error('❌ Error sending interview reschedule email:', emailError);
  }
};

// Envoyer email de fin d'entretien
const sendInterviewCompletionEmail = async (interview, decision) => {
  try {
    const candidate = interview.application.candidate;
    const jobOffer = interview.application.jobOffer;

    let subject, content;

    switch (decision) {
      case 'pass':
        subject = `🎉 Félicitations ! Entretien réussi - ${jobOffer.title}`;
        content = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10b981; text-align: center;">Félicitations !</h1>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h2>Bonjour ${candidate.firstName} ${candidate.lastName},</h2>
              <p>Nous avons le plaisir de vous informer que votre entretien pour le poste de <strong>${jobOffer.title}</strong> s'est très bien déroulé !</p>
              <p>Votre candidature a été <strong style="color: #10b981;">ACCEPTÉE</strong>.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #10b981; font-weight: bold; font-size: 18px;">🎯 Bienvenue dans l'équipe !</p>
              <p style="color: #059669;">Nous vous contacterons prochainement pour finaliser les détails.</p>
            </div>
          </div>
        `;
        break;

      case 'fail':
        subject = `Entretien - ${jobOffer.title}`;
        content = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #374151; text-align: center;">Entretien</h1>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2>Bonjour ${candidate.firstName} ${candidate.lastName},</h2>
              <p>Nous vous remercions pour le temps consacré à l'entretien pour le poste de <strong>${jobOffer.title}</strong>.</p>
              <p>Après réflexion, nous avons décidé de ne pas donner suite à votre candidature pour ce poste spécifique.</p>
              <p>Nous vous encourageons à consulter nos autres offres d'emploi qui pourraient mieux correspondre à votre profil.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #6b7280;">Nous vous souhaitons bonne chance dans vos recherches.</p>
            </div>
          </div>
        `;
        break;

      default:
        subject = `Entretien terminé - ${jobOffer.title}`;
        content = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2196F3; text-align: center;">Entretien Terminé</h1>
            
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2>Bonjour ${candidate.firstName} ${candidate.lastName},</h2>
              <p>Votre entretien pour le poste de <strong>${jobOffer.title}</strong> s'est bien déroulé.</p>
              <p>Nous sommes en train d'examiner votre candidature et vous contacterons prochainement pour vous informer de notre décision.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #2196F3;">Merci pour votre temps et votre intérêt pour notre entreprise.</p>
            </div>
          </div>
        `;
    }

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: candidate.email,
      subject,
      html: content
    });

    console.log('✅ Interview completion email sent to candidate');

  } catch (emailError) {
    console.error('❌ Error sending interview completion email:', emailError);
  }
};

// Obtenir le label du type d'entretien
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

// Obtenir les informations détaillées du mode d'entretien
const getInterviewModeInfo = (type, meetingLink, location) => {
  switch (type) {
    case 'video':
      return {
        label: '💻 Entretien vidéo (Google Meet)',
        details: `<li style="margin: 10px 0;"><strong>🔗 Lien Google Meet :</strong> <a href="${meetingLink}" style="color: #2196F3; font-weight: bold; text-decoration: none;">${meetingLink}</a></li>`,
        instructions: `
          <div style="background-color: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0288d1;">
            <h4 style="color: #01579b; margin-top: 0;">💻 Instructions pour l'entretien vidéo :</h4>
            <ul style="color: #0277bd; font-size: 14px;">
              <li>Cliquez sur le lien Google Meet 5 minutes avant l'heure prévue</li>
              <li>Assurez-vous d'avoir une connexion internet stable</li>
              <li>Testez votre caméra et microphone à l'avance</li>
              <li>Choisissez un endroit calme et bien éclairé</li>
            </ul>
          </div>
        `,
        tips: '<li>Testez votre connexion et votre matériel 15 minutes avant</li><li>Trouvez un endroit calme et bien éclairé</li><li>Regardez la caméra, pas l\'écran, pour maintenir le contact visuel</li>'
      };

    case 'phone':
      return {
        label: '📞 Entretien téléphonique',
        details: `<li style="margin: 10px 0;"><strong>📞 Mode :</strong> Nous vous appellerons au numéro que vous avez fourni</li>`,
        instructions: `
          <div style="background-color: #f3e5f5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #9c27b0;">
            <h4 style="color: #6a1b9a; margin-top: 0;">📞 Instructions pour l'entretien téléphonique :</h4>
            <ul style="color: #7b1fa2; font-size: 14px;">
              <li>Assurez-vous d'être disponible à l'heure prévue</li>
              <li>Trouvez un endroit calme avec une bonne réception</li>
              <li>Ayez votre CV et vos notes à portée de main</li>
              <li>Préparez un stylo et du papier pour prendre des notes</li>
            </ul>
          </div>
        `,
        tips: '<li>Assurez-vous d\'être dans un endroit calme avec une bonne réception</li><li>Ayez vos documents à portée de main</li><li>Parlez clairement et articulez bien</li>'
      };

    case 'in_person':
      return {
        label: '🏢 Entretien en présentiel',
        details: `<li style="margin: 10px 0;"><strong>📍 Lieu :</strong> ${location || 'Adresse à confirmer'}</li>`,
        instructions: `
          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
            <h4 style="color: #2e7d32; margin-top: 0;">🏢 Instructions pour l'entretien en présentiel :</h4>
            <ul style="color: #388e3c; font-size: 14px;">
              <li>Arrivez 10-15 minutes en avance</li>
              <li>Apportez une copie papier de votre CV</li>
              <li>Prévoyez les transports et le stationnement</li>
              <li>Habillez-vous de manière professionnelle</li>
            </ul>
          </div>
        `,
        tips: '<li>Prévoyez d\'arriver 10 minutes en avance</li><li>Apportez une copie papier de votre CV</li><li>Habillez-vous de manière professionnelle</li>'
      };

    default:
      return {
        label: getInterviewTypeLabel(type),
        details: '',
        instructions: '',
        tips: '<li>Préparez-vous selon le type d\'entretien</li>'
      };
  }
};

// Télécharger le CV d'un candidat depuis un entretien
const downloadCVFromInterview = async (req, res) => {
  try {
    const { interview_id, cv_id } = req.params;
    
    // Vérifier que l'entretien existe et appartient au recruteur ou est accessible
    const interview = await Interview.findByPk(interview_id, {
      include: [{
        model: Application,
        as: 'application',
        include: [{
          model: CandidateCV,
          as: 'cv'
        }]
      }]
    });

    if (!interview) {
      return res.status(404).json({ error: 'Entretien non trouvé' });
    }

    const cv = interview.application.cv;
    if (!cv || cv.id !== parseInt(cv_id)) {
      return res.status(404).json({ error: 'CV non trouvé pour cet entretien' });
    }

    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', cv.file_path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier CV non trouvé sur le serveur' });
    }

    res.download(filePath, cv.file_name);

  } catch (error) {
    console.error('Error downloading CV from interview:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllInterviews,
  getInterviewStatistics,
  getUpcomingInterviews,
  scheduleInterview,
  updateInterview,
  confirmInterview,
  cancelInterview,
  completeInterview,
  rescheduleInterview,
  sendInterviewConfirmation,
  sendInterviewNotificationEmail,
  sendInterviewConfirmationEmail,
  sendInterviewCancellationEmail,
  sendInterviewCompletionEmail,
  generateGoogleMeetLink: generateGoogleMeetLinkExport,
  getInterviewTypeLabel,
  sendDetailedInterviewNotification,
  getInterviewModeInfo,
  downloadCVFromInterview
};

// Export de la fonction generateGoogleMeetLink pour utilisation externe
function generateGoogleMeetLinkExport() {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  const part1 = Array.from({length: 3}, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
  const part2 = Array.from({length: 4}, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
  const part3 = Array.from({length: 3}, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
  return `https://meet.google.com/${part1}-${part2}-${part3}`;
}
