'use strict';

/*
  # Add email verification and security fields

  1. New Columns
    - `emailVerificationCode` (string) - Code de vérification à 6 chiffres
    - `emailVerificationExpires` (date) - Expiration du code de vérification
    - `suspiciousActivityCount` (integer) - Compteur d'activités suspectes
    - `lastSuspiciousActivity` (date) - Dernière activité suspecte détectée
    - `securityNotificationSent` (boolean) - Notification de sécurité envoyée
  
  2. Purpose
    - Support email verification with 6-digit code
    - Track suspicious activities and failed login attempts
    - Enable security notifications
*/

module.exports = {
  async up(queryInterface, Sequelize) {
    // Ajouter les champs pour la vérification email
    await queryInterface.addColumn('Users', 'emailVerificationCode', {
      type: Sequelize.STRING(6),
      allowNull: true,
      comment: 'Code de vérification à 6 chiffres pour confirmer l\'email'
    });

    await queryInterface.addColumn('Users', 'emailVerificationExpires', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Date d\'expiration du code de vérification'
    });

    // Ajouter les champs pour la sécurité
    await queryInterface.addColumn('Users', 'suspiciousActivityCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Compteur d\'activités suspectes'
    });

    await queryInterface.addColumn('Users', 'lastSuspiciousActivity', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Dernière activité suspecte détectée'
    });

    await queryInterface.addColumn('Users', 'securityNotificationSent', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Notification de sécurité envoyée'
    });

    // Faire de même pour les candidats
    await queryInterface.addColumn('Candidates', 'emailVerificationCode', {
      type: Sequelize.STRING(6),
      allowNull: true,
      comment: 'Code de vérification à 6 chiffres pour confirmer l\'email'
    });

    await queryInterface.addColumn('Candidates', 'emailVerificationExpires', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Date d\'expiration du code de vérification'
    });

    await queryInterface.addColumn('Candidates', 'suspiciousActivityCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Compteur d\'activités suspectes'
    });

    await queryInterface.addColumn('Candidates', 'lastSuspiciousActivity', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Dernière activité suspecte détectée'
    });

    await queryInterface.addColumn('Candidates', 'securityNotificationSent', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Notification de sécurité envoyée'
    });
  },

  async down(queryInterface, Sequelize) {
    // Supprimer les colonnes des utilisateurs
    await queryInterface.removeColumn('Users', 'emailVerificationCode');
    await queryInterface.removeColumn('Users', 'emailVerificationExpires');
    await queryInterface.removeColumn('Users', 'suspiciousActivityCount');
    await queryInterface.removeColumn('Users', 'lastSuspiciousActivity');
    await queryInterface.removeColumn('Users', 'securityNotificationSent');

    // Supprimer les colonnes des candidats
    await queryInterface.removeColumn('Candidates', 'emailVerificationCode');
    await queryInterface.removeColumn('Candidates', 'emailVerificationExpires');
    await queryInterface.removeColumn('Candidates', 'suspiciousActivityCount');
    await queryInterface.removeColumn('Candidates', 'lastSuspiciousActivity');
    await queryInterface.removeColumn('Candidates', 'securityNotificationSent');
  }
};