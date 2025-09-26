'use strict';

/*
  # Create interviews table

  1. New Tables
    - `Interviews`
      - `id` (integer, primary key)
      - `application_id` (integer, foreign key)
      - `interviewer_id` (integer, foreign key)
      - `scheduled_date` (date)
      - `duration_minutes` (integer)
      - `interview_type` (enum)
      - `location` (string)
      - `meeting_link` (string)
      - `status` (enum)
      - `notes` (text)
      - `score` (integer)
      - `feedback` (text)
      - `decision` (enum)
      - `reminder_sent` (boolean)
      - `createdAt` (date)
      - `updatedAt` (date)
  
  2. Security
    - Enable foreign key constraints
    - Add cascade delete for application
    - Add restrict delete for interviewer
*/

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Interviews', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      application_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Applications',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      interviewer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      scheduled_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 60,
        validate: {
          min: 15,
          max: 240
        }
      },
      interview_type: {
        type: Sequelize.ENUM('phone', 'video', 'in_person', 'technical', 'hr', 'final'),
        allowNull: false,
        defaultValue: 'video'
      },
      location: {
        type: Sequelize.STRING,
        allowNull: true
      },
      meeting_link: {
        type: Sequelize.STRING,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled'),
        allowNull: false,
        defaultValue: 'scheduled'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      score: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
          max: 100
        }
      },
      feedback: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      decision: {
        type: Sequelize.ENUM('pending', 'pass', 'fail', 'on_hold'),
        allowNull: false,
        defaultValue: 'pending'
      },
      reminder_sent: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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
    await queryInterface.addIndex('Interviews', ['application_id']);
    await queryInterface.addIndex('Interviews', ['interviewer_id']);
    await queryInterface.addIndex('Interviews', ['scheduled_date']);
    await queryInterface.addIndex('Interviews', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Interviews');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Interviews_interview_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Interviews_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Interviews_decision";');
  }
};