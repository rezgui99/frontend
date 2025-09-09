'use strict';

/*
  # Create candidate favorites table

  1. New Tables
    - `CandidateFavorites`
      - `id` (integer, primary key)
      - `candidate_id` (integer, foreign key)
      - `job_offer_id` (integer, foreign key)
      - `createdAt` (date)
      - `updatedAt` (date)
  
  2. Security
    - Enable foreign key constraints
    - Add unique constraint on candidate_id + job_offer_id
    - Add cascade delete
*/

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CandidateFavorites', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      candidate_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Candidates',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      job_offer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'JobOffers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Contrainte unique pour éviter les doublons
    await queryInterface.addConstraint('CandidateFavorites', {
      fields: ['candidate_id', 'job_offer_id'],
      type: 'unique',
      name: 'unique_candidate_favorite'
    });

    // Index pour améliorer les performances
    await queryInterface.addIndex('CandidateFavorites', ['candidate_id']);
    await queryInterface.addIndex('CandidateFavorites', ['job_offer_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('CandidateFavorites');
  }
};