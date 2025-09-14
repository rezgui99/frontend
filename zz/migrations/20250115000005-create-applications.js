'use strict';

/*
  # Create applications table

  1. New Tables
    - `Applications`
      - `id` (integer, primary key)
      - `candidate_id` (integer, foreign key)
      - `job_offer_id` (integer, foreign key)
      - `cv_id` (integer, foreign key)
      - `cover_letter` (text)
      - `status` (enum)
      - `proposed_interview_slots` (json)
      - `confirmed_interview_date` (date)
      - `interview_link` (string)
      - `recruiter_notes` (text)
      - `applied_at` (date)
      - `createdAt` (date)
      - `updatedAt` (date)
  
  2. Security
    - Enable foreign key constraints
    - Add cascade delete for candidate
    - Add restrict delete for job offer
*/

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Applications', {
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
        onDelete: 'RESTRICT'
      },
      cv_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'CandidateCVs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      cover_letter: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('applied', 'under_review', 'interview_scheduled', 'interview_completed', 'accepted', 'rejected'),
        allowNull: false,
        defaultValue: 'applied'
      },
      confirmed_interview_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      interview_link: {
        type: Sequelize.STRING,
        allowNull: true
      },
      recruiter_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      applied_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
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

    // Index pour améliorer les performances
    await queryInterface.addIndex('Applications', ['candidate_id']);
    await queryInterface.addIndex('Applications', ['job_offer_id']);
    await queryInterface.addIndex('Applications', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Applications');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Applications_status";');
  }
};