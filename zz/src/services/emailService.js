const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Vérifier la configuration
    this.transporter.verify((err, success) => {
      if (err) {
        console.error('❌ Configuration email invalide:', err);
      } else {
        console.log('✅ Service email configuré et prêt');
      }
    });
  }

  // Envoyer le code de vérification email
  async sendVerificationCode(email, firstName, lastName, code, userType = 'user') {
    const subject = 'Confirmez votre inscription - SmartHire';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2196F3; margin-bottom: 10px;">Bienvenue sur SmartHire !</h1>
          <p style="color: #666; font-size: 16px;">Confirmez votre inscription pour accéder à votre espace ${userType === 'candidate' ? 'candidat' : 'recruteur'}</p>
        </div>

        <div style="background-color: #f8fafc; padding: 25px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #2196F3;">
          <h2 style="color: #1f2937; margin-top: 0;">Bonjour ${firstName} ${lastName},</h2>
          <p style="color: #374151; line-height: 1.6;">
            Merci de vous être inscrit(e) sur SmartHire ! Pour finaliser votre inscription et sécuriser votre compte, 
            veuillez confirmer votre adresse email en utilisant le code de vérification ci-dessous.
          </p>
        </div>

        <div style="background-color: #2196F3; color: white; padding: 30px; border-radius: 10px; text-align: center; margin: 30px 0;">
          <h3 style="margin: 0 0 15px 0; font-size: 18px;">Votre code de vérification</h3>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">
            ${code}
          </div>
          <p style="margin: 15px 0 0 0; font-size: 14px; opacity: 0.9;">
            Ce code expire dans 10 minutes
          </p>
        </div>

        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h4 style="color: #92400e; margin-top: 0;">🔒 Sécurité de votre compte</h4>
          <ul style="color: #78350f; margin: 0; padding-left: 20px;">
            <li>Ne partagez jamais ce code avec personne</li>
            <li>Notre équipe ne vous demandera jamais ce code par téléphone</li>
            <li>Si vous n'avez pas demandé cette vérification, ignorez cet email</li>
            <li>Le code expire automatiquement après 10 minutes</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            Une fois votre email confirmé, vous pourrez accéder à toutes les fonctionnalités de SmartHire.
          </p>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Cet email a été envoyé automatiquement. Merci de ne pas y répondre.<br>
            © 2025 SmartHire. Tous droits réservés.
          </p>
        </div>
      </div>
    `;

    return await this.transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject,
      html
    });
  }

  // Envoyer notification d'activité suspecte
  async sendSuspiciousActivityAlert(email, firstName, lastName, activityDetails, userType = 'user') {
    const subject = '🚨 Activité suspecte détectée sur votre compte SmartHire';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fef2f2; padding: 25px; border-radius: 10px; border-left: 4px solid #ef4444; margin-bottom: 20px;">
          <h1 style="color: #dc2626; margin-top: 0; display: flex; align-items: center;">
            🚨 Alerte de Sécurité
          </h1>
          <p style="color: #7f1d1d; font-size: 16px; margin: 0;">
            Activité suspecte détectée sur votre compte SmartHire
          </p>
        </div>

        <div style="background-color: #fff; padding: 25px; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #1f2937; margin-top: 0;">Bonjour ${firstName} ${lastName},</h2>
          <p style="color: #374151; line-height: 1.6;">
            Nous avons détecté une activité inhabituelle sur votre compte SmartHire. 
            Par mesure de sécurité, nous vous informons de cette activité.
          </p>
        </div>

        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">📊 Détails de l'activité</h3>
          <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
            <li><strong>Type d'activité :</strong> ${activityDetails.type}</li>
            <li><strong>Date et heure :</strong> ${activityDetails.timestamp}</li>
            <li><strong>Adresse IP :</strong> ${activityDetails.ipAddress}</li>
            <li><strong>Navigateur :</strong> ${activityDetails.userAgent}</li>
            <li><strong>Nombre de tentatives :</strong> ${activityDetails.attemptCount}</li>
            <li><strong>Localisation estimée :</strong> ${activityDetails.location || 'Non disponible'}</li>
          </ul>
        </div>

        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h4 style="color: #92400e; margin-top: 0;">🛡️ Mesures de sécurité prises</h4>
          <ul style="color: #78350f; margin: 0; padding-left: 20px;">
            <li>Votre compte a été temporairement sécurisé</li>
            <li>Les tentatives de connexion sont surveillées</li>
            <li>Un délai d'attente a été appliqué entre les tentatives</li>
            <li>Cette activité a été enregistrée dans nos logs de sécurité</li>
          </ul>
        </div>

        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <h4 style="color: #1e40af; margin-top: 0;">🔧 Actions recommandées</h4>
          <ul style="color: #1e3a8a; margin: 0; padding-left: 20px;">
            <li><strong>Si c'était vous :</strong> Aucune action requise, votre compte est sécurisé</li>
            <li><strong>Si ce n'était pas vous :</strong> Changez immédiatement votre mot de passe</li>
            <li>Vérifiez vos autres comptes avec le même mot de passe</li>
            <li>Activez l'authentification à deux facteurs si disponible</li>
            <li>Contactez notre support si vous avez des préoccupations</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/${userType === 'candidate' ? 'candidate' : 'auth'}/login" 
             style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            🔐 Accéder à mon compte
          </a>
        </div>

        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 14px; margin: 0; text-align: center;">
            <strong>Besoin d'aide ?</strong><br>
            Contactez notre équipe support : support@smarthire.com<br>
            Ou appelez le : +216 XX XXX XXX
          </p>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Cet email a été envoyé automatiquement pour votre sécurité.<br>
            © 2025 SmartHire. Tous droits réservés.
          </p>
        </div>
      </div>
    `;

    return await this.transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject,
      html
    });
  }

  // Envoyer confirmation d'email vérifié
  async sendEmailVerifiedConfirmation(email, firstName, lastName, userType = 'user') {
    const subject = '✅ Email confirmé - Bienvenue sur SmartHire !';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10b981; margin-bottom: 10px;">🎉 Email confirmé avec succès !</h1>
          <p style="color: #666; font-size: 16px;">Votre compte SmartHire est maintenant actif</p>
        </div>

        <div style="background-color: #f0fdf4; padding: 25px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h2 style="color: #065f46; margin-top: 0;">Félicitations ${firstName} ${lastName} !</h2>
          <p style="color: #047857; line-height: 1.6;">
            Votre adresse email a été confirmée avec succès. Vous pouvez maintenant accéder à toutes les fonctionnalités de votre espace ${userType === 'candidate' ? 'candidat' : 'recruteur'}.
          </p>
        </div>

        <div style="background-color: #fff; border: 2px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #10b981; margin-top: 0;">🚀 Prochaines étapes</h3>
          ${userType === 'candidate' ? `
            <ul style="color: #374151; line-height: 1.8;">
              <li>📄 Uploadez votre CV dans votre espace personnel</li>
              <li>🔍 Parcourez nos offres d'emploi disponibles</li>
              <li>💼 Postulez aux offres qui vous intéressent</li>
              <li>📊 Suivez l'état de vos candidatures en temps réel</li>
              <li>⭐ Sauvegardez vos offres favorites</li>
            </ul>
          ` : `
            <ul style="color: #374151; line-height: 1.8;">
              <li>👥 Gérez vos employés et leurs compétences</li>
              <li>📋 Créez des fiches de poste détaillées</li>
              <li>🎯 Utilisez notre système de matching intelligent</li>
              <li>📊 Consultez les analytics RH avancées</li>
              <li>📝 Publiez des offres d'emploi attractives</li>
            </ul>
          `}
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/${userType === 'candidate' ? 'candidate/dashboard' : 'home'}" 
             style="background-color: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
            🎯 Accéder à mon espace
          </a>
        </div>

        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 14px; margin: 0; text-align: center;">
            <strong>Besoin d'aide pour commencer ?</strong><br>
            Consultez notre guide d'utilisation ou contactez notre support : support@smarthire.com
          </p>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © 2025 SmartHire. Tous droits réservés.
          </p>
        </div>
      </div>
    `;

    return await this.transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject,
      html
    });
  }

  // Envoyer notification de compte verrouillé
  async sendAccountLockedNotification(email, firstName, lastName, lockDuration, userType = 'user') {
    const subject = '🔒 Compte temporairement verrouillé - SmartHire';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fef2f2; padding: 25px; border-radius: 10px; border-left: 4px solid #ef4444; margin-bottom: 20px;">
          <h1 style="color: #dc2626; margin-top: 0;">🔒 Compte Temporairement Verrouillé</h1>
          <p style="color: #7f1d1d; font-size: 16px; margin: 0;">
            Votre compte SmartHire a été temporairement sécurisé
          </p>
        </div>

        <div style="background-color: #fff; padding: 25px; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #1f2937; margin-top: 0;">Bonjour ${firstName} ${lastName},</h2>
          <p style="color: #374151; line-height: 1.6;">
            Votre compte a été temporairement verrouillé suite à plusieurs tentatives de connexion échouées. 
            Cette mesure de sécurité protège votre compte contre les accès non autorisés.
          </p>
        </div>

        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="color: #92400e; margin-top: 0;">⏰ Durée du verrouillage</h3>
          <p style="color: #78350f; font-size: 18px; font-weight: bold; margin: 10px 0;">
            ${lockDuration} minutes
          </p>
          <p style="color: #78350f; font-size: 14px; margin: 0;">
            Vous pourrez vous reconnecter après cette période.
          </p>
        </div>

        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <h4 style="color: #1e40af; margin-top: 0;">🛡️ Que faire maintenant ?</h4>
          <ul style="color: #1e3a8a; margin: 0; padding-left: 20px;">
            <li><strong>Si c'était vous :</strong> Attendez la fin du verrouillage et réessayez avec le bon mot de passe</li>
            <li><strong>Si ce n'était pas vous :</strong> Changez votre mot de passe dès que possible</li>
            <li>Vérifiez que personne d'autre n'a accès à vos identifiants</li>
            <li>Contactez notre support si vous avez des préoccupations</li>
          </ul>
        </div>

        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #065f46; margin-top: 0;">💡 Conseils de sécurité</h4>
          <ul style="color: #047857; margin: 0; padding-left: 20px; font-size: 14px;">
            <li>Utilisez un mot de passe unique et complexe</li>
            <li>Ne partagez jamais vos identifiants</li>
            <li>Déconnectez-vous toujours après utilisation</li>
            <li>Vérifiez régulièrement l'activité de votre compte</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            <strong>Besoin d'aide ?</strong><br>
            Notre équipe support est disponible : support@smarthire.com<br>
            Téléphone : +216 XX XXX XXX
          </p>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Cet email a été envoyé automatiquement pour votre sécurité.<br>
            © 2025 SmartHire. Tous droits réservés.
          </p>
        </div>
      </div>
    `;

    return await this.transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject,
      html
    });
  }

  // Envoyer notification de connexion réussie après activité suspecte
  async sendSuccessfulLoginAfterSuspiciousActivity(email, firstName, lastName, loginDetails, userType = 'user') {
    const subject = '✅ Connexion réussie - SmartHire';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f0fdf4; padding: 25px; border-radius: 10px; border-left: 4px solid #10b981; margin-bottom: 20px;">
          <h1 style="color: #059669; margin-top: 0;">✅ Connexion Réussie</h1>
          <p style="color: #047857; font-size: 16px; margin: 0;">
            Vous vous êtes connecté(e) avec succès à SmartHire
          </p>
        </div>

        <div style="background-color: #fff; padding: 25px; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #1f2937; margin-top: 0;">Bonjour ${firstName} ${lastName},</h2>
          <p style="color: #374151; line-height: 1.6;">
            Nous vous informons qu'une connexion réussie a eu lieu sur votre compte SmartHire 
            après la détection d'activités suspectes précédentes.
          </p>
        </div>

        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">📊 Détails de la connexion</h3>
          <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
            <li><strong>Date et heure :</strong> ${loginDetails.timestamp}</li>
            <li><strong>Adresse IP :</strong> ${loginDetails.ipAddress}</li>
            <li><strong>Navigateur :</strong> ${loginDetails.userAgent}</li>
            <li><strong>Localisation estimée :</strong> ${loginDetails.location || 'Non disponible'}</li>
          </ul>
        </div>

        <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h4 style="color: #92400e; margin-top: 0;">⚠️ Si ce n'était pas vous</h4>
          <p style="color: #78350f; margin: 0;">
            Si vous n'êtes pas à l'origine de cette connexion, <strong>changez immédiatement votre mot de passe</strong> 
            et contactez notre équipe support.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/${userType === 'candidate' ? 'candidate' : 'auth'}/login" 
             style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
            🏠 Mon espace
          </a>
          <a href="${process.env.FRONTEND_URL}/${userType === 'candidate' ? 'candidate' : 'auth'}/reset-password" 
             style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            🔐 Changer mot de passe
          </a>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © 2025 SmartHire. Tous droits réservés.
          </p>
        </div>
      </div>
    `;

    return await this.transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject,
      html
    });
  }
}

module.exports = new EmailService();