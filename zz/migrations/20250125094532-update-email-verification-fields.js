'use strict';

/*
  # Update email verification fields for OTP system

  1. Modified Columns
    - Replace `emailVerificationToken` with `emailVerificationCode` (6 digits)
    - Add `emailVerificationExpires` for code expiration
  
  2. Purpose
    - Support OTP-based email verification with 6-digit codes
    - Add expiration mechanism for security
    - Replace token-based system with time-limited codes
*/

module.exports = {
  async up(queryInterface, Sequelize) {
    // Vérifier si les colonnes existent déjà
    const tableDescription = await queryInterface.describeTable('Users');
    
    // Supprimer l'ancienne colonne token si elle existe
    if (tableDescription.emailVerificationToken) {
      await queryInterface.removeColumn('Users', 'emailVerificationToken');
    }

    // Ajouter les nouvelles colonnes si elles n'existent pas
    if (!tableDescription.emailVerificationCode) {
      await queryInterface.addColumn('Users', 'emailVerificationCode', {
        type: Sequelize.STRING(6),
        allowNull: true,
        comment: 'Code de vérification à 6 chiffres pour confirmer l\'email'
      });
    }

    if (!tableDescription.emailVerificationExpires) {
      await queryInterface.addColumn('Users', 'emailVerificationExpires', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date d\'expiration du code de vérification'
      });
    }

    // Faire de même pour les candidats
    const candidateTableDescription = await queryInterface.describeTable('Candidates');
    
    if (candidateTableDescription.emailVerificationToken) {
      await queryInterface.removeColumn('Candidates', 'emailVerificationToken');
    }

    if (!candidateTableDescription.emailVerificationCode) {
      await queryInterface.addColumn('Candidates', 'emailVerificationCode', {
        type: Sequelize.STRING(6),
        allowNull: true,
        comment: 'Code de vérification à 6 chiffres pour confirmer l\'email'
      });
    }

    if (!candidateTableDescription.emailVerificationExpires) {
      await queryInterface.addColumn('Candidates', 'emailVerificationExpires', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date d\'expiration du code de vérification'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Restaurer l'ancien système
    await queryInterface.removeColumn('Users', 'emailVerificationCode');
    await queryInterface.removeColumn('Users', 'emailVerificationExpires');
    
    await queryInterface.addColumn('Users', 'emailVerificationToken', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Faire de même pour les candidats
    await queryInterface.removeColumn('Candidates', 'emailVerificationCode');
    await queryInterface.removeColumn('Candidates', 'emailVerificationExpires');
    
    await queryInterface.addColumn('Candidates', 'emailVerificationToken', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
};