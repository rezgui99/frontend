const emailService = require('./emailService');

class SecurityService {
  constructor() {
    this.maxLoginAttempts = 5;
    this.lockoutDuration = 30; // minutes
    this.suspiciousActivityThreshold = 3;
    this.securityNotificationCooldown = 24 * 60 * 60 * 1000; // 24 heures
  }

  // Analyser une tentative de connexion
  async analyzeLoginAttempt(user, ipAddress, userAgent, success = false) {
    const now = new Date();
    const activityDetails = {
      type: success ? 'Connexion réussie' : 'Tentative de connexion échouée',
      timestamp: now.toLocaleString('fr-FR'),
      ipAddress: ipAddress || 'Non disponible',
      userAgent: this.parseUserAgent(userAgent),
      attemptCount: user.login_attempts || 0,
      location: await this.getLocationFromIP(ipAddress)
    };

    if (!success) {
      // Incrémenter les tentatives échouées
      const attempts = (user.login_attempts || 0) + 1;
      const updateData = { 
        login_attempts: attempts,
        lastSuspiciousActivity: now
      };

      // Verrouiller le compte après le seuil
      if (attempts >= this.maxLoginAttempts) {
        updateData.locked_until = new Date(now.getTime() + this.lockoutDuration * 60 * 1000);
        
        // Envoyer notification de verrouillage
        await this.sendAccountLockedNotification(user, activityDetails);
      }

      // Détecter activité suspecte
      if (attempts >= this.suspiciousActivityThreshold) {
        await this.handleSuspiciousActivity(user, activityDetails);
      }

      await user.update(updateData);
      return { locked: attempts >= this.maxLoginAttempts, attempts };
    } else {
      // Connexion réussie
      const hadSuspiciousActivity = user.suspiciousActivityCount > 0;
      
      // Réinitialiser les compteurs
      await user.update({
        login_attempts: 0,
        locked_until: null,
        lastLogin: now,
        last_login_ip: ipAddress,
        suspiciousActivityCount: 0,
        securityNotificationSent: false
      });

      // Notifier si il y avait eu des activités suspectes
      if (hadSuspiciousActivity) {
        await this.sendSuccessfulLoginNotification(user, activityDetails);
      }

      return { success: true, hadSuspiciousActivity };
    }
  }

  // Gérer les activités suspectes
  async handleSuspiciousActivity(user, activityDetails) {
    try {
      const suspiciousCount = await user.trackSuspiciousActivity();
      
      // Envoyer notification seulement si pas déjà envoyée récemment
      const shouldSendNotification = !user.securityNotificationSent || 
        (user.lastSuspiciousActivity && 
         new Date() - new Date(user.lastSuspiciousActivity) > this.securityNotificationCooldown);

      if (shouldSendNotification) {
        await this.sendSuspiciousActivityNotification(user, activityDetails);
        await user.update({ securityNotificationSent: true });
      }

      console.log(`🚨 Activité suspecte détectée pour ${user.email} (${suspiciousCount} fois)`);
      return suspiciousCount;
    } catch (error) {
      console.error('Erreur gestion activité suspecte:', error);
    }
  }

  // Envoyer notification d'activité suspecte
  async sendSuspiciousActivityNotification(user, activityDetails) {
    try {
      const userType = user.constructor.name === 'Candidate' ? 'candidate' : 'user';
      
      await emailService.sendSuspiciousActivityAlert(
        user.email,
        user.firstName,
        user.lastName,
        {
          ...activityDetails,
          attemptCount: user.login_attempts || 0
        },
        userType
      );

      console.log(`📧 Notification d'activité suspecte envoyée à ${user.email}`);
    } catch (error) {
      console.error('Erreur envoi notification activité suspecte:', error);
    }
  }

  // Envoyer notification de compte verrouillé
  async sendAccountLockedNotification(user, activityDetails) {
    try {
      const userType = user.constructor.name === 'Candidate' ? 'candidate' : 'user';
      
      await emailService.sendAccountLockedNotification(
        user.email,
        user.firstName,
        user.lastName,
        this.lockoutDuration,
        userType
      );

      console.log(`📧 Notification de verrouillage envoyée à ${user.email}`);
    } catch (error) {
      console.error('Erreur envoi notification verrouillage:', error);
    }
  }

  // Envoyer notification de connexion réussie après activité suspecte
  async sendSuccessfulLoginNotification(user, activityDetails) {
    try {
      const userType = user.constructor.name === 'Candidate' ? 'candidate' : 'user';
      
      await emailService.sendSuccessfulLoginAfterSuspiciousActivity(
        user.email,
        user.firstName,
        user.lastName,
        activityDetails,
        userType
      );

      console.log(`📧 Notification de connexion réussie envoyée à ${user.email}`);
    } catch (error) {
      console.error('Erreur envoi notification connexion réussie:', error);
    }
  }

  // Parser le User-Agent pour une présentation lisible
  parseUserAgent(userAgent) {
    if (!userAgent) return 'Navigateur inconnu';
    
    // Détection simple des navigateurs principaux
    if (userAgent.includes('Chrome')) return 'Google Chrome';
    if (userAgent.includes('Firefox')) return 'Mozilla Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Microsoft Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    
    return 'Navigateur inconnu';
  }

  // Obtenir la localisation approximative depuis l'IP (simulation)
  async getLocationFromIP(ipAddress) {
    if (!ipAddress || ipAddress === '::1' || ipAddress.startsWith('127.')) {
      return 'Localhost (développement)';
    }
    
    // En production, vous pourriez utiliser un service comme ipapi.co ou geoip
    // Pour le moment, on simule
    const locations = [
      'Tunis, Tunisie',
      'Sfax, Tunisie',
      'Sousse, Tunisie',
      'Bizerte, Tunisie',
      'Paris, France',
      'Lyon, France'
    ];
    
    return locations[Math.floor(Math.random() * locations.length)];
  }

  // Vérifier si un compte est verrouillé
  isAccountLocked(user) {
    return user.locked_until && new Date() < new Date(user.locked_until);
  }

  // Calculer le temps restant de verrouillage
  getLockTimeRemaining(user) {
    if (!this.isAccountLocked(user)) return 0;
    
    const lockTime = new Date(user.locked_until);
    const now = new Date();
    const remainingMs = lockTime.getTime() - now.getTime();
    
    return Math.ceil(remainingMs / (60 * 1000)); // en minutes
  }

  // Générer un code de vérification sécurisé
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Valider le format du code de vérification
  isValidVerificationCode(code) {
    return /^\d{6}$/.test(code);
  }
}

module.exports = new SecurityService();