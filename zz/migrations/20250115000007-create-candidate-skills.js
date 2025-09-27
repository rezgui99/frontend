'use strict';

/*
  # Create candidate skills table

  1. New Tables
    - `CandidateSkills`
      - `id` (integer, primary key)
      - `candidate_id` (integer, foreign key)
      - `skill_id` (integer, foreign key)
      - `skill_level_id` (integer, foreign key)
      - `years_experience` (integer)
      - `certification` (string)
      - `createdAt` (date)
      - `updatedAt` (date)
  
  2. Security
    - Enable foreign key constraints
    - Add unique constraint on candidate_id + skill_id
    - Add cascade delete
*/

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CandidateSkills', {
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
      skill_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Skills',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      skill_level_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'SkillLevels',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      years_experience: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
          max: 50
        }
      },
      certification: {
        type: Sequelize.STRING,
        allowNull: true
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
    await queryInterface.addConstraint('CandidateSkills', {
      fields: ['candidate_id', 'skill_id'],
      type: 'unique',
      name: 'unique_candidate_skill'
    });

    // Index pour améliorer les performances
    await queryInterface.addIndex('CandidateSkills', ['candidate_id']);
    await queryInterface.addIndex('CandidateSkills', ['skill_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('CandidateSkills');
  }
};